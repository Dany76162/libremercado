/**
 * StripeProvider — concrete PaymentProvider implementation using Stripe.
 *
 * All Stripe-specific logic lives here. The rest of the system
 * never imports from Stripe directly.
 */

import type {
  PaymentProvider,
  CheckoutResult,
  PaymentStatusResult,
  RefundResult,
  WebhookEventResult,
} from "../PaymentProvider";
import { PaymentProviderNotImplementedError } from "../PaymentProvider";
import { getUncachableStripeClient, getStripeSecretKey } from "../../stripeClient";
import Stripe from "stripe";

const STRIPE_STATUS_MAP: Record<string, PaymentStatusResult["status"]> = {
  requires_payment_method: "pending",
  requires_confirmation: "pending",
  requires_action: "pending",
  processing: "pending",
  requires_capture: "authorized",
  succeeded: "captured",
  canceled: "cancelled",
};

export class StripeProvider implements PaymentProvider {
  readonly name = "stripe";

  async createCheckout(params: {
    amountInMinorUnits: number;
    currency: string;
    orderId: string;
    buyerEmail?: string;
    metadata?: Record<string, string>;
  }): Promise<CheckoutResult> {
    const stripe = await getUncachableStripeClient();

    const intent = await stripe.paymentIntents.create({
      amount: params.amountInMinorUnits,
      currency: params.currency.toLowerCase(),
      metadata: { orderId: params.orderId, ...params.metadata },
      automatic_payment_methods: { enabled: true },
    });

    return {
      providerPaymentId: intent.id,
      clientSecret: intent.client_secret ?? undefined,
      rawResponse: intent as unknown as Record<string, unknown>,
    };
  }

  async getPaymentStatus(providerPaymentId: string): Promise<PaymentStatusResult> {
    const stripe = await getUncachableStripeClient();
    const intent = await stripe.paymentIntents.retrieve(providerPaymentId);

    return {
      providerPaymentId: intent.id,
      status: STRIPE_STATUS_MAP[intent.status] ?? "pending",
      rawResponse: intent as unknown as Record<string, unknown>,
    };
  }

  async refundPayment(params: {
    providerPaymentId: string;
    amountInMinorUnits?: number;
    reason?: string;
  }): Promise<RefundResult> {
    const stripe = await getUncachableStripeClient();

    const refundParams: Stripe.RefundCreateParams = {
      payment_intent: params.providerPaymentId,
    };
    if (params.amountInMinorUnits) {
      refundParams.amount = params.amountInMinorUnits;
    }

    const refund = await stripe.refunds.create(refundParams);

    return {
      providerRefundId: refund.id,
      amountRefunded: refund.amount / 100,
      rawResponse: refund as unknown as Record<string, unknown>,
    };
  }

  async handleWebhook(params: {
    rawBody: Buffer | string;
    signature?: string;
  }): Promise<WebhookEventResult> {
    const stripe = await getUncachableStripeClient();

    const rawBodyStr: string =
      params.rawBody instanceof Buffer
        ? params.rawBody.toString("utf-8")
        : params.rawBody;

    let event: Stripe.Event;

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (webhookSecret && params.signature) {
      event = stripe.webhooks.constructEvent(
        rawBodyStr,
        params.signature,
        webhookSecret
      );
    } else {
      // In test/dev mode without webhook secret — parse raw body directly
      event = JSON.parse(rawBodyStr) as Stripe.Event;
    }

    let providerPaymentId: string | undefined;
    if (
      event.data.object &&
      typeof event.data.object === "object" &&
      "id" in event.data.object
    ) {
      providerPaymentId = (event.data.object as { id: string }).id;
    }

    return {
      eventType: event.type,
      providerEventId: event.id,
      providerPaymentId,
      status: this.mapEventToStatus(event.type),
      rawPayload: rawBodyStr,
    };
  }

  async verifyWebhookSignature(
    rawBody: Buffer | string,
    signature: string
  ): Promise<boolean> {
    try {
      const stripe = await getUncachableStripeClient();
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!webhookSecret) return true; // No secret configured — allow in dev
      const bodyStr = rawBody instanceof Buffer ? rawBody.toString("utf-8") : rawBody;
      stripe.webhooks.constructEvent(bodyStr, signature, webhookSecret);
      return true;
    } catch {
      return false;
    }
  }

  createPayout(): Promise<never> {
    throw new PaymentProviderNotImplementedError("createPayout", this.name);
  }

  private mapEventToStatus(eventType: string): PaymentStatusResult["status"] | undefined {
    const map: Record<string, PaymentStatusResult["status"]> = {
      "payment_intent.succeeded": "captured",
      "payment_intent.payment_failed": "failed",
      "payment_intent.canceled": "cancelled",
      "payment_intent.requires_action": "pending",
      "charge.refunded": "refunded",
    };
    return map[eventType];
  }
}

export const stripeProvider = new StripeProvider();
