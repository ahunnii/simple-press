import type Stripe from "stripe";

import { stripeClient } from "~/lib/stripe/client";

const PAGE_SIZE = 100;
// Checkout allows 200 lines (validators/checkout.ts); this is a runaway guard.
const MAX_LINE_ITEMS = 1000;

/**
 * Every line item of a Checkout Session, with each price's product expanded,
 * listed on the connected account that owns the session.
 *
 * `sessions.retrieve({ expand: ["line_items"] })` returns only the first page
 * (10 items) plus `has_more`, so a bigger cart would silently lose lines —
 * the order's items, the inventory deduction and the emails all read this
 * list. Pages through `listLineItems` until Stripe reports no more.
 *
 * Throws whatever Stripe throws, and throws when the list outgrows the cap
 * rather than returning a partial one: callers that write an order must fail
 * (so Stripe retries) instead of recording an incomplete cart.
 */
export async function listAllSessionLineItems(params: {
  sessionId: string;
  stripeAccount: string;
}): Promise<Stripe.LineItem[]> {
  const items: Stripe.LineItem[] = [];
  let startingAfter: string | undefined;
  for (;;) {
    const page = await stripeClient.checkout.sessions.listLineItems(
      params.sessionId,
      {
        limit: PAGE_SIZE,
        expand: ["data.price.product"],
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      },
      { stripeAccount: params.stripeAccount },
    );
    items.push(...page.data);
    if (!page.has_more) return items;
    const last = page.data[page.data.length - 1];
    if (!last || items.length >= MAX_LINE_ITEMS) {
      throw new Error(
        `Checkout session ${params.sessionId} has more than ${MAX_LINE_ITEMS} line items (or an empty page reported has_more)`,
      );
    }
    startingAfter = last.id;
  }
}
