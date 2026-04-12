/**
 * Payment Core — barrel export.
 * Import from here, not from individual submodules.
 */

export { PaymentService } from "./PaymentService";
export { CommissionCalculator, commissionCalculator } from "./CommissionCalculator";
export { StripeProvider, stripeProvider } from "./providers/StripeProvider";
export type {
  PaymentProvider,
  CheckoutResult,
  PaymentStatusResult,
  RefundResult,
  WebhookEventResult,
} from "./PaymentProvider";
export { PaymentProviderNotImplementedError } from "./PaymentProvider";
export type { InitCheckoutParams, InitCheckoutResult } from "./PaymentService";

import { PaymentService } from "./PaymentService";
import { stripeProvider } from "./providers/StripeProvider";

/**
 * Default singleton: Stripe-backed PaymentService.
 * Swap stripeProvider for any other PaymentProvider implementation
 * without touching any other file.
 */
export const paymentService = new PaymentService(stripeProvider);
