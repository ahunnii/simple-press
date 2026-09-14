/**
 * Loyalty Rewards — the order lifecycle seams.
 *
 * Two entry points, deliberately asymmetric about feature gating:
 *
 * - {@link awardPointsForPaidOrder} is gated. No program row or a disabled
 *   `loyalty` flag means no earning, silently.
 * - {@link clawbackPointsForOrder} is NOT gated. Points that were awarded
 *   while the feature was on must still be corrected after a refund even if
 *   the owner has since turned it off — the alternative is a customer keeping
 *   points for money they got back. Money records never disappear when a flag
 *   toggles (same rule as the subscriptions `cancel` mutation).
 *
 * Both are additive to existing order code: they write only `LoyaltyLedger`
 * rows and `Customer.loyaltyPoints`, never order or inventory state. Callers
 * (the Stripe webhook, `order.refund`, `order.updateStatus`,
 * `order.markAsRefunded`) should invoke them AFTER the order write has
 * committed and isolate their failures — an award that throws must never roll
 * back a paid order.
 */

import type { DbClient } from "~/server/db";
import { resolveFlags } from "~/lib/features/resolve-flags";
import {
  awardPoints,
  getBalance,
  getEarnedForOrder,
  sumClawedForOrder,
} from "~/lib/loyalty/ledger";
import {
  clawbackPoints,
  eligibleCentsForOrder,
  pointsForOrder,
} from "~/lib/loyalty/points";

export type OrderEarnResult = {
  earned: number;
  firstOrderBonus: number;
  balance: number;
};

/**
 * Awards the `order_earn` row (and, on a customer's first order, the
 * `first_order_bonus` row) for an order that has been paid for.
 *
 * Returns `null` when nothing was awarded — no program, feature off, or both
 * awards resolved to zero/duplicate — so a caller can skip the "you earned N
 * points" line in the confirmation email without special-casing a zero.
 *
 * Safe to call repeatedly: both awards are idempotent on their `sourceKey`
 * (`order:<orderId>` and `first-order:<customerId>`), so a replayed Stripe
 * webhook re-runs this and awards nothing the second time.
 *
 * `customer.orderCount` is expected to be the value AFTER the caller
 * incremented it for this order — the webhook increments before calling —
 * hence `<= 1` rather than `=== 0` for "this is their first". A customer
 * whose count somehow never incremented (0) still qualifies; the
 * `first-order:<customerId>` key is what actually guarantees once-per-customer.
 */
export async function awardPointsForPaidOrder(
  db: DbClient,
  args: {
    businessId: string;
    order: { id: string; subtotal: number; discount: number };
    customer: { id: string; orderCount: number };
  },
): Promise<OrderEarnResult | null> {
  const program = await db.loyaltyProgram.findUnique({
    where: { businessId: args.businessId },
    include: { business: { select: { featureFlags: true } } },
  });
  if (!program) return null;
  if (!resolveFlags(program.business.featureFlags).isEnabled("loyalty")) {
    return null;
  }

  let earned = 0;
  let firstOrderBonus = 0;

  if (program.earnOnOrders && program.pointsPerDollar > 0) {
    const eligibleCents = eligibleCentsForOrder(args.order);
    const points = pointsForOrder(eligibleCents, program.pointsPerDollar);

    const result = await awardPoints(db, {
      businessId: args.businessId,
      customerId: args.customer.id,
      type: "order_earn",
      points,
      sourceKey: `order:${args.order.id}`,
      orderId: args.order.id,
      reason: "Order",
      metadata: { rate: program.pointsPerDollar, eligibleCents },
    });
    if (result.awarded) earned = result.points;
  }

  if (
    program.firstOrderEnabled &&
    program.firstOrderBonus > 0 &&
    args.customer.orderCount <= 1
  ) {
    const result = await awardPoints(db, {
      businessId: args.businessId,
      customerId: args.customer.id,
      type: "first_order_bonus",
      points: program.firstOrderBonus,
      sourceKey: `first-order:${args.customer.id}`,
      orderId: args.order.id,
      reason: "First order bonus",
    });
    if (result.awarded) firstOrderBonus = result.points;
  }

  if (earned === 0 && firstOrderBonus === 0) return null;

  return {
    earned,
    firstOrderBonus,
    balance: await getBalance(db, args.customer.id),
  };
}

/**
 * Deducts the portion of an order's earned points that a refund or
 * cancellation takes back, and returns how many points were removed (always
 * >= 0).
 *
 * The arithmetic lives in `clawbackPoints`: the intended total is the
 * refunded proportion of what the order earned (or all of it on a full
 * refund), minus what previous refunds on this order already clawed back, and
 * capped at the customer's current balance. So a partial refund followed
 * later by a full refund removes exactly what was earned in total, never
 * more, and points the customer has already spent are never chased into a
 * negative balance.
 *
 * `sourceSuffix` distinguishes successive corrections on the same order
 * (`<refundId>` / `"manual"` / `"cancel"`) — it is what makes each one
 * idempotent while still allowing a second, larger refund to claw back the
 * difference. Reusing a suffix is a no-op that returns 0.
 */
export async function clawbackPointsForOrder(
  db: DbClient,
  args: {
    businessId: string;
    orderId: string;
    orderTotalCents: number;
    refundCents: number;
    isFullRefund: boolean;
    sourceSuffix: string;
    reason: string;
  },
): Promise<number> {
  const earned = await getEarnedForOrder(db, args.businessId, args.orderId);
  if (earned <= 0) return 0;

  const order = await db.order.findUnique({
    where: { id: args.orderId },
    select: { customerId: true, businessId: true },
  });
  // A cross-tenant id is a caller bug that must not touch another store's
  // data; a guest order with no Customer row earned nothing to claw back.
  if (!order) return 0;
  if (order.businessId !== args.businessId) return 0;
  if (!order.customerId) return 0;

  const alreadyClawed = await sumClawedForOrder(
    db,
    args.businessId,
    args.orderId,
  );
  const balance = await getBalance(db, order.customerId);

  const points = clawbackPoints({
    earned,
    alreadyClawed,
    refundCents: args.refundCents,
    orderTotalCents: args.orderTotalCents,
    isFullRefund: args.isFullRefund,
    balance,
  });
  if (points === 0) return 0;

  const result = await awardPoints(db, {
    businessId: args.businessId,
    customerId: order.customerId,
    type: "order_clawback",
    points: -points,
    sourceKey: `order-clawback:${args.orderId}:${args.sourceSuffix}`,
    orderId: args.orderId,
    reason: args.reason,
    metadata: {
      refundCents: args.refundCents,
      isFullRefund: args.isFullRefund,
    },
  });

  return result.awarded ? Math.abs(result.points) : 0;
}
