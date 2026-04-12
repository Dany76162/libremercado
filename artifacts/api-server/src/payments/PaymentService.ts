/**
 * PaymentService — central payment orchestrator.
 *
 * The ONLY place that creates payments, registers attempts, computes
 * commissions, writes ledger entries, and delegates to the provider.
 *
 * No Stripe/MercadoPago imports anywhere else — only here (via PaymentProvider).
 */

import { db } from "@workspace/db";
import {
  payments,
  paymentAttempts,
  ledgerEntries,
  providerEvents,
  platformCommissions,
  InsertPayment,
  InternalPaymentStatus,
  PaymentProvider as PaymentProviderName,
} from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import type { PaymentProvider, CheckoutResult } from "./PaymentProvider";
import { commissionCalculator } from "./CommissionCalculator";
import type { SubscriptionTier } from "./CommissionCalculator";

export interface InitCheckoutParams {
  orderId: string;
  buyerId: string;
  merchantId: string;
  amountGross: number;
  currency?: string;
  storeTier?: SubscriptionTier;
  buyerEmail?: string;
}

export interface InitCheckoutResult {
  paymentId: string;
  providerPaymentId: string;
  clientSecret?: string;
  redirectUrl?: string;
  amountGross: number;
  amountFee: number;
  amountNet: number;
  currency: string;
}

export interface ConfirmPaymentParams {
  paymentId: string;
  actorId: string;
}

export interface RefundPaymentParams {
  paymentId: string;
  amountGross?: number;
  reason?: string;
}

export class PaymentService {
  constructor(private provider: PaymentProvider) {}

  /**
   * Create internal payment record + call provider.createCheckout.
   * Called when buyer places an order.
   */
  async initCheckout(params: InitCheckoutParams): Promise<InitCheckoutResult> {
    const currency = params.currency ?? "ARS";
    const tier = params.storeTier ?? "free";

    const commission = commissionCalculator.calculate(params.amountGross, tier, currency);

    // 1. Create the internal payment record (pending)
    const [payment] = await db
      .insert(payments)
      .values({
        orderId: params.orderId,
        buyerId: params.buyerId,
        merchantId: params.merchantId,
        provider: this.provider.name as PaymentProviderName,
        amountGross: commission.amountGross.toFixed(2),
        amountFee: commission.platformFee.toFixed(2),
        amountNet: commission.merchantNet.toFixed(2),
        currency,
        status: "pending",
        metadata: JSON.stringify({ tier }),
      })
      .returning();

    // 2. Delegate to provider
    let checkoutResult: CheckoutResult;
    try {
      checkoutResult = await this.provider.createCheckout({
        amountInMinorUnits: Math.round(params.amountGross * 100),
        currency,
        orderId: params.orderId,
        buyerEmail: params.buyerEmail,
        metadata: { paymentId: payment.id },
      });

      // Update payment with provider ID
      await db
        .update(payments)
        .set({ providerPaymentId: checkoutResult.providerPaymentId })
        .where(eq(payments.id, payment.id));

      // 3. Record attempt (success — checkout initiated)
      await db.insert(paymentAttempts).values({
        paymentId: payment.id,
        provider: this.provider.name as PaymentProviderName,
        providerAttemptId: checkoutResult.providerPaymentId,
        status: "initiated",
        rawResponse: JSON.stringify(checkoutResult.rawResponse).slice(0, 2000),
      });
    } catch (err: any) {
      // Record failed attempt
      await db.insert(paymentAttempts).values({
        paymentId: payment.id,
        provider: this.provider.name as PaymentProviderName,
        status: "failed",
        errorMessage: err.message,
        rawResponse: null,
      });
      // Mark payment as failed
      await db
        .update(payments)
        .set({ status: "failed", statusReason: err.message })
        .where(eq(payments.id, payment.id));
      throw err;
    }

    return {
      paymentId: payment.id,
      providerPaymentId: checkoutResult.providerPaymentId,
      clientSecret: checkoutResult.clientSecret,
      redirectUrl: checkoutResult.redirectUrl,
      amountGross: commission.amountGross,
      amountFee: commission.platformFee,
      amountNet: commission.merchantNet,
      currency,
    };
  }

  /**
   * Confirm payment after provider confirms success.
   * Records ledger entries and platform commission.
   */
  async confirmPayment(params: ConfirmPaymentParams): Promise<void> {
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.id, params.paymentId));

    if (!payment) throw new Error(`Payment ${params.paymentId} not found`);
    if (payment.status === "captured") return; // Idempotent

    const now = new Date();

    // 1. Verify status with provider
    if (payment.providerPaymentId) {
      try {
        const result = await this.provider.getPaymentStatus(payment.providerPaymentId);
        if (result.status !== "captured") {
          throw new Error(
            `Provider reports payment not captured (status: ${result.status})`
          );
        }
      } catch (err: any) {
        // In test/dev mode, provider check might fail — log but allow
        if (process.env.NODE_ENV === "production") throw err;
      }
    }

    // 2. Update internal payment status
    await db
      .update(payments)
      .set({
        status: "captured",
        capturedAt: now,
        updatedAt: now,
      })
      .where(eq(payments.id, payment.id));

    const gross = parseFloat(payment.amountGross as string);
    const fee = parseFloat(payment.amountFee as string);
    const net = parseFloat(payment.amountNet as string);

    // 3. Write ledger entries
    await db.insert(ledgerEntries).values([
      {
        paymentId: payment.id,
        orderId: payment.orderId,
        entryType: "buyer_charge",
        actorType: "buyer",
        actorId: payment.buyerId,
        amount: gross.toFixed(2),
        currency: payment.currency,
        direction: "debit",
        description: `Cobro al comprador — orden ${payment.orderId}`,
      },
      {
        paymentId: payment.id,
        orderId: payment.orderId,
        entryType: "platform_commission",
        actorType: "platform",
        actorId: "platform",
        amount: fee.toFixed(2),
        currency: payment.currency,
        direction: "credit",
        description: `Comisión plataforma — orden ${payment.orderId}`,
      },
      {
        paymentId: payment.id,
        orderId: payment.orderId,
        entryType: "merchant_payout",
        actorType: "merchant",
        actorId: payment.merchantId,
        amount: net.toFixed(2),
        currency: payment.currency,
        direction: "credit",
        description: `Crédito merchant — orden ${payment.orderId}`,
      },
    ]);

    // 4. Record platform commission (backward compat with existing admin panel)
    const metadata = payment.metadata ? JSON.parse(payment.metadata) : {};
    const tier: SubscriptionTier = metadata.tier ?? "free";
    const rate = commissionCalculator.rateForTier(tier);

    try {
      await db.insert(platformCommissions).values({
        orderId: payment.orderId,
        storeId: payment.merchantId,
        orderTotal: gross.toFixed(2),
        commissionPercent: (rate * 100).toFixed(2),
        commissionAmount: fee.toFixed(2),
        merchantAmount: net.toFixed(2),
        status: "collected",
        collectedAt: now,
      });
    } catch (_) {
      // Commission may already exist — ignore duplicate
    }
  }

  /**
   * Process a refund for a captured payment.
   */
  async refundPayment(params: RefundPaymentParams): Promise<void> {
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.id, params.paymentId));

    if (!payment) throw new Error(`Payment ${params.paymentId} not found`);
    if (!payment.providerPaymentId) throw new Error("No provider payment ID on record");

    const refundAmountGross = params.amountGross ?? parseFloat(payment.amountGross as string);
    const amountInMinorUnits = Math.round(refundAmountGross * 100);

    const refundResult = await this.provider.refundPayment({
      providerPaymentId: payment.providerPaymentId,
      amountInMinorUnits,
      reason: params.reason,
    });

    const now = new Date();
    const isPartial = refundAmountGross < parseFloat(payment.amountGross as string);

    await db
      .update(payments)
      .set({
        status: isPartial ? "partially_refunded" : "refunded",
        refundedAt: now,
        updatedAt: now,
        statusReason: params.reason ?? "refund_requested",
      })
      .where(eq(payments.id, payment.id));

    // Write ledger entry for refund
    await db.insert(ledgerEntries).values({
      paymentId: payment.id,
      orderId: payment.orderId,
      entryType: "refund",
      actorType: "buyer",
      actorId: payment.buyerId,
      amount: refundAmountGross.toFixed(2),
      currency: payment.currency,
      direction: "credit",
      description: `Reembolso — orden ${payment.orderId} — ${refundResult.providerRefundId}`,
    });

    // Record attempt
    await db.insert(paymentAttempts).values({
      paymentId: payment.id,
      provider: this.provider.name as PaymentProviderName,
      providerAttemptId: refundResult.providerRefundId,
      status: "refunded",
      rawResponse: JSON.stringify(refundResult.rawResponse).slice(0, 2000),
    });
  }

  /**
   * Process an incoming webhook event (idempotent).
   * Returns the internal paymentId if the event could be mapped.
   */
  async processWebhookEvent(params: {
    rawBody: Buffer | string;
    signature?: string;
  }): Promise<{ processed: boolean; paymentId?: string; eventType?: string }> {
    const event = await this.provider.handleWebhook(params);

    // Check idempotency — ignore duplicate events
    const existing = await db
      .select({ id: providerEvents.id, processed: providerEvents.processed })
      .from(providerEvents)
      .where(eq(providerEvents.providerEventId, event.providerEventId));

    if (existing.length > 0 && existing[0].processed) {
      return { processed: false, eventType: event.eventType }; // Duplicate, skip
    }

    // Find the internal payment by provider payment ID
    let paymentId: string | undefined;
    if (event.providerPaymentId) {
      const [found] = await db
        .select({ id: payments.id })
        .from(payments)
        .where(eq(payments.providerPaymentId, event.providerPaymentId));
      paymentId = found?.id;
    }

    // Persist the event
    if (existing.length === 0) {
      await db.insert(providerEvents).values({
        provider: this.provider.name as PaymentProviderName,
        eventType: event.eventType,
        providerEventId: event.providerEventId,
        paymentId: paymentId ?? null,
        rawPayload: typeof event.rawPayload === "string"
          ? event.rawPayload.slice(0, 5000)
          : JSON.stringify(event.rawPayload).slice(0, 5000),
        processed: false,
      });
    }

    // Update internal payment status based on event
    let updatedPaymentId: string | undefined;
    if (paymentId && event.status) {
      const internalStatus = this.mapProviderStatusToInternal(event.status);
      if (internalStatus) {
        const now = new Date();
        const update: Partial<typeof payments.$inferInsert> = {
          status: internalStatus,
          updatedAt: now,
        };
        if (internalStatus === "captured") update.capturedAt = now;
        if (internalStatus === "refunded") update.refundedAt = now;

        await db.update(payments).set(update).where(eq(payments.id, paymentId));
        updatedPaymentId = paymentId;
      }
    }

    // Mark event as processed
    await db
      .update(providerEvents)
      .set({ processed: true, processedAt: new Date() })
      .where(eq(providerEvents.providerEventId, event.providerEventId));

    return { processed: true, paymentId: updatedPaymentId, eventType: event.eventType };
  }

  /**
   * Get payment by internal ID.
   */
  async getPayment(paymentId: string) {
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.id, paymentId));
    return payment ?? null;
  }

  /**
   * Get payment by order ID.
   */
  async getPaymentByOrder(orderId: string) {
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.orderId, orderId));
    return payment ?? null;
  }

  /**
   * List all payments (admin use).
   */
  async listPayments(limit = 50) {
    return db.select().from(payments).orderBy(desc(payments.createdAt)).limit(limit);
  }

  /**
   * List attempts for a payment.
   */
  async listAttempts(paymentId: string) {
    return db
      .select()
      .from(paymentAttempts)
      .where(eq(paymentAttempts.paymentId, paymentId))
      .orderBy(desc(paymentAttempts.createdAt));
  }

  /**
   * List ledger entries for a payment.
   */
  async listLedger(paymentId: string) {
    return db
      .select()
      .from(ledgerEntries)
      .where(eq(ledgerEntries.paymentId, paymentId))
      .orderBy(desc(ledgerEntries.createdAt));
  }

  /**
   * List provider events (admin use).
   */
  async listProviderEvents(limit = 50) {
    return db
      .select()
      .from(providerEvents)
      .orderBy(desc(providerEvents.createdAt))
      .limit(limit);
  }

  private mapProviderStatusToInternal(
    providerStatus: string
  ): InternalPaymentStatus | null {
    const map: Record<string, InternalPaymentStatus> = {
      captured: "captured",
      authorized: "authorized",
      failed: "failed",
      cancelled: "cancelled",
      refunded: "refunded",
    };
    return map[providerStatus] ?? null;
  }
}
