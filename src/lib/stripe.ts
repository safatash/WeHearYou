import Stripe from "stripe";

/**
 * Stripe client singleton. Reads STRIPE_SECRET_KEY from the environment.
 * apiVersion is omitted so the SDK uses the API version pinned to the Stripe
 * account, which avoids coupling the code to a specific dated version string.
 */
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  typescript: true,
  appInfo: { name: "WeHearYou" },
});

/** True when Stripe secret + webhook secret are configured. */
export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}
