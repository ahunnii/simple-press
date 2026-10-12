import type Stripe from "stripe";

import { normalizeEmail } from "~/lib/utils";

/**
 * The shopper's email on a Checkout Session, normalized, or null when Stripe
 * captured none. One precedence for every cart-lane step of the webhook (the
 * order path and the delayed-payment emails) so a session never resolves to
 * two different shoppers: the `customer_email` we prefilled at checkout wins
 * over the address typed into `customer_details`.
 */
export function sessionShopperEmail(
  session: Pick<Stripe.Checkout.Session, "customer_email" | "customer_details">,
): string | null {
  const raw = session.customer_email ?? session.customer_details?.email;
  return raw ? normalizeEmail(raw) : null;
}
