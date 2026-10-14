import type Stripe from "stripe";

/**
 * Fake for `stripeClient.checkout.sessions.listLineItems`, shared by every
 * suite that drives the Stripe webhook route (which pages a session's line
 * items in separately — the expanded `line_items` is only the first 10).
 *
 * Kept apart from `stripe-webhook.ts` because that file imports the route,
 * which imports the (mocked) Stripe client — a `vi.mock` factory can't pull
 * it in without a cycle. Wire it in lazily from the factory:
 *
 * ```ts
 * listLineItems: (...args: unknown[]) => fakeListLineItems(...args),
 * ```
 *
 * `makeCheckoutSession` registers each fixture's full session, so the fake
 * serves the same items the harness builds, with Stripe's real paging:
 * `limit` (default 10, capped at the page size) per page, `has_more`, `starting_after`.
 */
const sessions = new Map<string, Stripe.Checkout.Session>();
const STRIPE_MAX_PAGE_SIZE = 100;
let pageSizeCap = STRIPE_MAX_PAGE_SIZE;

/**
 * Serve pages smaller than the requested `limit` (a test lever, so a
 * dozen-line cart spans two pages). Call with no argument to restore
 * Stripe's real maximum of 100.
 */
export function setFakeLineItemsPageSize(
  size: number = STRIPE_MAX_PAGE_SIZE,
): void {
  pageSizeCap = size;
}

/** Make `listLineItems(session.id, …)` serve this session's `line_items`. */
export function registerSessionLineItems(
  session: Stripe.Checkout.Session,
): void {
  sessions.set(session.id, session);
}

export function fakeListLineItems(
  ...[sessionId, params]: unknown[]
): Stripe.ApiList<Stripe.LineItem> {
  const session = sessions.get(sessionId as string);
  // Unregistered session: an empty list, like a session with no lines.
  if (!session) return { object: "list", data: [], has_more: false, url: "" };
  const { limit = 10, starting_after: startingAfter } = (params ?? {}) as {
    limit?: number;
    starting_after?: string;
  };
  const pageSize = Math.min(limit, pageSizeCap);
  const all = session.line_items?.data ?? [];
  const start = startingAfter
    ? all.findIndex((item) => item.id === startingAfter) + 1
    : 0;
  const data = all.slice(start, start + pageSize);
  return {
    object: "list",
    data,
    has_more: start + pageSize < all.length,
    url: `/v1/checkout/sessions/${session.id}/line_items`,
  };
}
