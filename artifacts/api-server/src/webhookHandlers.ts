/**
 * WebhookHandlers — receives raw provider events and delegates to PaymentService.
 *
 * Idempotent: PaymentService checks provider_events before processing.
 * No Stripe logic lives here — only routing to the payment core.
 */

import { paymentService } from "./payments";

export class WebhookHandlers {
  /**
   * Process an incoming webhook from any supported provider.
   * The PaymentService handles idempotency, event logging, and state transitions.
   */
  static async processWebhook(
    payload: Buffer,
    signature: string,
    _provider: "stripe" | "mercadopago" = "stripe"
  ): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        "WEBHOOK ERROR: Payload must be a Buffer. " +
          "Ensure the webhook route is registered BEFORE app.use(express.json())."
      );
    }

    await paymentService.processWebhookEvent({
      rawBody: payload,
      signature,
    });
  }
}
