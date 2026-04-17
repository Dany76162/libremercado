/**
 * PaymentProvider — abstract interface for any payment gateway.
 *
 * Today: StripeProvider
 * Tomorrow: MercadoPagoProvider, InternalProvider, etc.
 *
 * The rest of the system only knows this interface — never the concrete provider.
 */

export interface CheckoutResult {
  providerPaymentId: string;
  clientSecret?: string;
  redirectUrl?: string;
  rawResponse: Record<string, unknown>;
}

export interface PaymentStatusResult {
  providerPaymentId: string;
  status: "pending" | "authorized" | "captured" | "failed" | "cancelled" | "refunded";
  rawResponse: Record<string, unknown>;
}

export interface RefundResult {
  providerRefundId: string;
  amountRefunded: number;
  rawResponse: Record<string, unknown>;
}

export interface WebhookEventResult {
  eventType: string;
  providerEventId: string;
  providerPaymentId?: string;
  status?: string;
  rawPayload: string;
}

export interface PaymentProvider {
  readonly name: string;

  /**
   * Initiate a payment / checkout session with the provider.
   * Returns enough info for the client to complete the payment.
   */
  createCheckout(params: {
    amountInMinorUnits: number;
    currency: string;
    orderId: string;
    buyerEmail?: string;
    metadata?: Record<string, string>;
  }): Promise<CheckoutResult>;

  /**
   * Query the provider for the current status of a payment.
   */
  getPaymentStatus(providerPaymentId: string): Promise<PaymentStatusResult>;

  /**
   * Issue a (full or partial) refund for a captured payment.
   */
  refundPayment(params: {
    providerPaymentId: string;
    amountInMinorUnits?: number;
    reason?: string;
  }): Promise<RefundResult>;

  /**
   * Parse and validate an incoming webhook request.
   * Returns structured event data or throws if the signature is invalid.
   */
  handleWebhook(params: {
    rawBody: Buffer | string;
    signature?: string;
  }): Promise<WebhookEventResult>;

  /**
   * Verify the webhook signature (called before processing).
   * Returns true if valid.
   */
  verifyWebhookSignature(rawBody: Buffer | string, signature: string): Promise<boolean>;

  /**
   * Create a payout to a merchant or rider.
   * Not all providers support this — implementations may throw NotImplemented.
   */
  createPayout?(params: {
    recipientId: string;
    amountInMinorUnits: number;
    currency: string;
    description?: string;
  }): Promise<{ providerPayoutId: string; rawResponse: Record<string, unknown> }>;
}

export class PaymentProviderNotImplementedError extends Error {
  constructor(method: string, provider: string) {
    super(`${method} is not implemented by provider "${provider}"`);
    this.name = "PaymentProviderNotImplementedError";
  }
}
