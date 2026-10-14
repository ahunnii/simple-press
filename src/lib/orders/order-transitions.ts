/**
 * Order status transition rules — pure, no I/O, no Prisma imports, so the
 * admin UI can import the same predicates the order router enforces.
 *
 * Every rule here exists because a status column alone does not say what has
 * already HAPPENED to an order (stock taken, customer metrics counted, money
 * refunded). The helpers answer those questions from the columns we do have,
 * and the router (`~/server/api/routers/order.ts`) applies the side effects.
 *
 * Where orders come from, and what each path has already applied at creation:
 *
 *  - Stripe checkout (`src/lib/checkout/create-order.ts` + the
 *    `checkout.session.completed` webhook): stock deducted, customer metrics
 *    incremented and loyalty awarded UNCONDITIONALLY at creation. Its
 *    `paymentStatus` is `session.payment_status` — "paid", or
 *    "no_payment_required" for a $0 session. "unpaid" (async/delayed methods)
 *    is rejected outright, so no order exists for money still settling; there
 *    is no `async_payment_succeeded` handler. Always has `stripeSessionId`.
 *  - Subscription invoices (`src/lib/subscriptions/order-from-invoice.ts`):
 *    created "paid" with everything applied. Always has `stripeInvoiceId`.
 *  - Manual orders (`order.createManual`): everything applied ONLY when created
 *    "paid". A "pending"/"failed" manual order took no stock and was not
 *    counted. No Stripe ids at all.
 *
 * Later, the webhook can set "disputed" (and back to "paid") and "refunded" on
 * Stripe orders; neither moves stock on its own.
 */

/**
 * Payment statuses meaning "the sale has not happened yet": no stock was
 * taken, the customer's spend/order count were not incremented and no points
 * were earned. "unpaid" is never written by today's code paths (checkout
 * rejects it) but `order.updateStatus` has always treated it as unpaid.
 */
const NOT_YET_PAID_STATUSES: ReadonlySet<string> = new Set([
  "pending",
  "failed",
  "unpaid",
]);

export function isNotYetPaid(paymentStatus: string): boolean {
  return NOT_YET_PAID_STATUSES.has(paymentStatus);
}

/**
 * Did this order take stock off the shelf (so cancelling it may put it back)?
 *
 * Only a live order ("open"/"completed") whose sale actually happened. A
 * pending manual order is saved as "open" too but never deducted anything, so
 * restocking it on cancel would conjure inventory out of nothing.
 *
 * Deliberately "not yet paid" rather than `=== "paid"`: a $0 Stripe checkout
 * is stored as "no_payment_required" and a charged-back one as "disputed",
 * and both DID deduct at creation — `=== "paid"` would silently stop
 * restocking them on cancel. A "refunded"/"cancelled" order is excluded by
 * `status`.
 */
export function orderHadInventoryDeducted(order: {
  status: string;
  paymentStatus: string;
}): boolean {
  return (
    (order.status === "open" || order.status === "completed") &&
    !isNotYetPaid(order.paymentStatus)
  );
}

/**
 * The order `status` after a Stripe refund (`order.refund`).
 *
 * A full refund always ends at "refunded". A PARTIAL refund leaves the order
 * where it was in its lifecycle — which for a cancelled order means it stays
 * "cancelled". Deriving it from fulfillment alone used to quietly reopen a
 * cancelled order as "open" (and so re-enable Cancel, and a second restock).
 */
export function statusAfterRefund(order: {
  isFullRefund: boolean;
  status: string;
  fulfillmentStatus: string;
}): string {
  if (order.isFullRefund) return "refunded";
  if (order.status === "cancelled") return "cancelled";
  return order.fulfillmentStatus === "fulfilled" ? "completed" : "open";
}

/**
 * Whether a refund (`order.refund` / `order.markAsRefunded`) should put the
 * items back in stock.
 *
 * Never for a cancelled order, whatever the request says: cancelling already
 * offered the restock (`order.updateStatus`), and we cannot tell from the row
 * whether the owner took it — restocking again could double the stock. The
 * admin UI hides the checkbox for cancelled orders; this is the server half.
 */
export function shouldRestockOnRefund(order: {
  status: string;
  restockRequested: boolean;
}): boolean {
  return order.restockRequested && order.status !== "cancelled";
}

/** The payment statuses an owner may pick in the "Override Status" menu. */
const OVERRIDABLE_PAYMENT_STATUSES: ReadonlySet<string> = new Set([
  "pending",
  "paid",
  "failed",
]);

export type PaymentOverrideOrder = {
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  refundAmountCents: number | null;
  stripeSessionId: string | null;
  stripePaymentIntentId: string | null;
  stripeInvoiceId: string | null;
};

export type PaymentOverridePlan =
  | { ok: false; message: string }
  | {
      ok: true;
      /** The order `status` to write alongside the new payment status. */
      status: string;
      /**
       * Apply the "sale happened" side effects now (stock, customer metrics,
       * loyalty) — see `planPaymentStatusOverride`.
       */
      catchUp: boolean;
    };

/**
 * A manual order — the only kind whose sale side effects can still be
 * outstanding. Every Stripe-created order (checkout or subscription invoice)
 * applied them at creation whatever its payment label says, so running them
 * again on an override would double-count stock, spend and points.
 */
export function isManualOrder(order: {
  stripeSessionId: string | null;
  stripePaymentIntentId: string | null;
  stripeInvoiceId: string | null;
}): boolean {
  return (
    !order.stripeSessionId &&
    !order.stripePaymentIntentId &&
    !order.stripeInvoiceId
  );
}

/**
 * Decide whether the owner's payment-status override (`order.updatePaymentStatus`)
 * is allowed, the order status that goes with it, and whether it is the
 * moment a manual order's sale side effects must be caught up.
 *
 * Rules (owner decision: "Catch up, Paid one-way"):
 *
 *  - Cancelled orders are final — overriding one back to paid would re-enable
 *    Cancel and with it a second restock. The UI hides the menu; this guards it.
 *  - "refunded" is never set here. The refund flows (`order.refund`,
 *    `order.markAsRefunded`) also record `refundAmountCents`, claw back
 *    loyalty points and offer a restock; flipping the label alone would leave
 *    the Finances page counting the money as collected. Likewise an order that
 *    is already (even partly) refunded cannot be overridden back to "paid".
 *  - An order with an open Stripe dispute ("disputed") can't be overridden at
 *    all. The webhook owns that status: it moves back to "paid" when the
 *    dispute is won (or closed with a warning) and to "refunded" when lost.
 *    Letting the owner mark it paid would hide the dispute from the list.
 *  - Paid is one-way. Once the sale happened, going back to pending/failed
 *    would leave the deducted stock, counted spend and earned points behind
 *    with nothing to undo them; cancelling is the way to back out of a sale.
 *  - Moving a MANUAL order from not-yet-paid to "paid" is the moment the sale
 *    happens, so it catches up exactly what `order.createManual` does for an
 *    order created paid (`catchUp: true`).
 */
export function planPaymentStatusOverride(
  order: PaymentOverrideOrder,
  nextPaymentStatus: string,
): PaymentOverridePlan {
  if (nextPaymentStatus === "refunded") {
    return {
      ok: false,
      message:
        "Use Refund or Mark as refunded to record a refund — they also update refund totals and loyalty points.",
    };
  }

  if (!OVERRIDABLE_PAYMENT_STATUSES.has(nextPaymentStatus)) {
    return {
      ok: false,
      message: `"${nextPaymentStatus}" is not a payment status you can set.`,
    };
  }

  if (order.status === "cancelled") {
    return {
      ok: false,
      message: "This order is cancelled, so its payment status can't change.",
    };
  }

  if (
    order.status === "refunded" ||
    order.paymentStatus === "refunded" ||
    (nextPaymentStatus === "paid" && (order.refundAmountCents ?? 0) > 0)
  ) {
    return {
      ok: false,
      message:
        "This order has been refunded, so its payment status can't change.",
    };
  }

  if (order.paymentStatus === "disputed") {
    return {
      ok: false,
      message:
        "This order has an open Stripe dispute. Its payment status updates automatically when the dispute closes — respond in your Stripe Dashboard.",
    };
  }

  const wasNotYetPaid = isNotYetPaid(order.paymentStatus);

  if (
    !wasNotYetPaid &&
    nextPaymentStatus !== "paid" &&
    nextPaymentStatus !== order.paymentStatus
  ) {
    return {
      ok: false,
      message:
        "This order is already paid, and that can't be undone. To back out of the sale, cancel the order instead.",
    };
  }

  const status =
    nextPaymentStatus === "failed"
      ? order.status
      : nextPaymentStatus === "paid" && order.fulfillmentStatus === "fulfilled"
        ? "completed"
        : "open";

  return {
    ok: true,
    status,
    catchUp:
      nextPaymentStatus === "paid" && wasNotYetPaid && isManualOrder(order),
  };
}
