/**
 * Shared Stripe error classification for the Subscribe lane.
 *
 * A business's connected Stripe account can change (disconnect + reconnect a
 * DIFFERENT account). Any id this module cached from the old account —
 * `Customer.stripeCustomerId`, `Business.stripePortalConfigurationId` — then
 * names an object that does not exist on the account we are actually talking
 * to, and the call 404s. `isMissingStripeResource` is the one place that
 * distinguishes "that object isn't on this account" (recoverable: create a
 * fresh one and retry) from every other failure (rate limit, outage, bad
 * params — must surface, not be papered over with a silent duplicate).
 */

/**
 * True when Stripe says the object we addressed does not exist on the account
 * we addressed it on (`resource_missing` / a 404 invalid-request). Duck-typed
 * rather than `instanceof Stripe.errors.*` so it also holds for an error
 * crossing an SDK instance boundary — or a test double.
 */
export function isMissingStripeResource(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const e = error as { code?: unknown; statusCode?: unknown; type?: unknown };
  return (
    e.code === "resource_missing" ||
    (e.statusCode === 404 && e.type === "StripeInvalidRequestError")
  );
}
