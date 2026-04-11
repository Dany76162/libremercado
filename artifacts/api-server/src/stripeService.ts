// Stripe service - handles direct Stripe API operations
import { getUncachableStripeClient } from './stripeClient';

export class StripeService {
  async createCustomer(email: string, userId: string) {
    const stripe = await getUncachableStripeClient();
    return await stripe.customers.create({
      email,
      metadata: { userId },
    });
  }

  async createCheckoutSession(
    customerId: string,
    items: Array<{ priceId: string; quantity: number }>,
    successUrl: string,
    cancelUrl: string,
    mode: 'payment' | 'subscription' = 'payment'
  ) {
    const stripe = await getUncachableStripeClient();
    return await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: items.map(item => ({ 
        price: item.priceId, 
        quantity: item.quantity 
      })),
      mode,
      success_url: successUrl,
      cancel_url: cancelUrl,
    });
  }

  async createPaymentIntent(amount: number, currency: string = 'ars', metadata: Record<string, string> = {}) {
    const stripe = await getUncachableStripeClient();
    return await stripe.paymentIntents.create({
      amount,
      currency,
      metadata,
    });
  }

  async createCustomerPortalSession(customerId: string, returnUrl: string) {
    const stripe = await getUncachableStripeClient();
    return await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
  }
}

export const stripeService = new StripeService();
