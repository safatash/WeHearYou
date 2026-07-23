import Stripe from "stripe";

/**
 * Lazy Stripe client. The SDK constructor throws when the secret key is missing,
 * and Next evaluates module imports during `next build` — so we must NOT
 * construct at module load. Call getStripe() only after stripeConfigured().
 * apiVersion is omitted so the SDK uses the version pinned to the account.
 */
let client: Stripe | null = null;

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  if (!client) {
    client = new Stripe(key, { typescript: true, appInfo: { name: "WeHearYou" } });
  }
  return client;
}

/** True when the Stripe secret key is configured. */
export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}
