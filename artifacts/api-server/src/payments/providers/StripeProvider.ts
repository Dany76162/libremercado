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
import { getUncachableStripeClient } from "../../stripeClient";
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
    const stripe = getUncachableStripeClient();

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
    const stripe = getUncachableStripeClient();
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
    const stripe = getUncachableStripeClient();

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
    const rawBodyStr =
      params.rawBody instanceof Buffer
        ? params.rawBody.toString("utf-8")
        : String(params.rawBody);

    let event: Stripe.Event;

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (webhookSecret && params.signature) {
      // Only fetch the Stripe client when we actually need it for signature verification
      const stripe = getUncachableStripeClient();
      event = stripe.webhooks.constructEvent(
        rawBodyStr,
        params.signature,
        webhookSecret
      );
    } else {
      // No webhook secret configured — signature is NOT verified.
      // NEVER deploy to production without STRIPE_WEBHOOK_SECRET set.
      if (process.env.NODE_ENV === "production") {
        throw new Error(
          "SECURITY: STRIPE_WEBHOOK_SECRET must be set in production. Refusing to process unsigned webhook."
        );
      }
      console.warn(
        "[StripeProvider] WARNING: STRIPE_WEBHOOK_SECRET not set — " +
          "webhook signature verification is DISABLED. " +
          "This is only acceptable in local dev/test environments."
      );
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
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!webhookSecret) {
        if (process.env.NODE_ENV === "production") {
          return false;
        }
        return true;
      }
      const stripe = getUncachableStripeClient();
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
