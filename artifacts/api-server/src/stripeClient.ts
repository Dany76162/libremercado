import Stripe from "stripe";

let stripeSingleton: Stripe | null = null;

function requireStripeSecret(): string {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY no está configurada. Definila en Railway (Secrets)."
    );
  }
  return key;
}

/** Cliente Stripe para operaciones de servidor (REST, webhooks). */
export function getUncachableStripeClient(): Stripe {
  if (!stripeSingleton) {
    stripeSingleton = new Stripe(requireStripeSecret());
  }
  return stripeSingleton;
}

export function getStripePublishableKey(): string {
  const k = process.env.STRIPE_PUBLISHABLE_KEY?.trim();
  if (!k) {
    throw new Error(
      "STRIPE_PUBLISHABLE_KEY no está configurada. Definila en Railway."
    );
  }
  return k;
}
