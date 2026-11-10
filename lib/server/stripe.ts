import "server-only";
import Stripe from "stripe";

let s: Stripe | null = null;
export function stripe() {
  if (!s) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set.");
    s = new Stripe(key, { httpClient: Stripe.createFetchHttpClient() });
  }
  return s;
}

/** Webhook signature check that works on Cloudflare Workers (Web Crypto). */
export const cryptoProvider = Stripe.createSubtleCryptoProvider();
