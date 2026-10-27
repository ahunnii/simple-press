/**
 * D2 — what a STAFF (fulfillment-only) caller may not see on an order row.
 *
 * `staffProcedure`'s own docblock (`~/server/api/trpc`) draws the line at
 * "anything touching money, prices, refunds, products, or settings must stay on
 * ownerAdminProcedure". Money TOTALS are the deliberate exception (user
 * decision): subtotal/tax/shipping/discount/total stay visible to STAFF because
 * a fulfillment worker needs them for packing slips and order context. These
 * fields do not survive:
 *
 * - `internalNote` — owner-to-owner notes, may contain anything.
 * - `stripePaymentIntentId` / `stripeSessionId` / `stripeInvoiceId` — raw
 *   Stripe identifiers, not fulfillment-relevant.
 *
 * OWNER/MANAGER keep full rows, and so does PLATFORM_ADMIN — they have no
 * membership row, so `ctx.membershipRole` reads null and `isStaff` is false.
 *
 * Applied at every staff-reachable site that returns Order rows:
 * `order.getAll`, `order.getById`, `order.markAsFulfilled`,
 * `order.markReadyForPickup`, `order.updateFulfillment`, and the order history
 * on `customer.getById`. `addShipment`/`updateShipment` return `OrderShipment`
 * rows (no order columns) and need no redaction; every other order mutation is
 * `ownerAdminProcedure` and therefore unreachable by STAFF. `updateNote` — the
 * write half of `internalNote` — is `ownerAdminProcedure` for the same reason.
 *
 * Every redacted column is nullable, so callers' output types are unchanged.
 */
export function redactOrderForStaff<
  T extends {
    internalNote: string | null;
    stripePaymentIntentId: string | null;
    stripeSessionId: string | null;
    stripeInvoiceId: string | null;
  },
>(order: T, isStaff: boolean): T {
  if (!isStaff) return order;
  return {
    ...order,
    internalNote: null,
    stripePaymentIntentId: null,
    stripeSessionId: null,
    stripeInvoiceId: null,
  };
}
