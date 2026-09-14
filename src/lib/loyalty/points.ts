/**
 * Loyalty Rewards — pure points arithmetic. No DB, no React. Every function
 * here is deterministic and side-effect free so it can be unit tested
 * directly and reused by both the eventual server write-path
 * (`src/lib/loyalty/ledger.ts`'s `awardPoints`) and the admin/storefront
 * preview UI.
 */

/**
 * The portion of an order's value that earns loyalty points: `subtotal -
 * discount`, floored at 0 cents. Consumed by the order webhook's earn step
 * (via {@link pointsForOrder}) to compute `order_earn` ledger rows.
 *
 * Non-finite inputs (NaN/Infinity — malformed order data) are treated as 0
 * rather than propagating a NaN/Infinity result.
 */
export function eligibleCentsForOrder(o: {
  subtotal: number;
  discount: number;
}): number {
  if (!Number.isFinite(o.subtotal) || !Number.isFinite(o.discount)) return 0;
  return Math.max(0, o.subtotal - o.discount);
}

/**
 * Points earned on `eligibleCents` at `pointsPerDollar`
 * (`LoyaltyProgram.pointsPerDollar`). Computed as a single integer division
 * (`eligibleCents * pointsPerDollar / 100`, floored) rather than
 * `(eligibleCents / 100) * pointsPerDollar` to avoid floating-point drift
 * from dividing first. Consumed by the order webhook's earn step and by
 * `previewEstimate`-style admin UI that shows "this order would earn N pts".
 *
 * A non-positive or non-integer `pointsPerDollar`, or a non-integer
 * `eligibleCents` (cents should always be a whole number), yields 0. Never
 * returns a negative number.
 */
export function pointsForOrder(
  eligibleCents: number,
  pointsPerDollar: number,
): number {
  if (!Number.isInteger(eligibleCents) || !Number.isInteger(pointsPerDollar)) {
    return 0;
  }
  if (pointsPerDollar <= 0 || eligibleCents <= 0) return 0;
  return Math.max(0, Math.floor((eligibleCents * pointsPerDollar) / 100));
}

/**
 * How many points to deduct (as a positive number — the caller writes the
 * negative ledger row) when an order is refunded or cancelled. Consumed by
 * `order.refund`, `order.updateStatus` (cancellation), and
 * `order.markAsRefunded` to write `order_clawback` ledger rows.
 *
 * The *intended* total clawback for the order is `earned` on a full refund,
 * or the refunded proportion of `earned` (`earned * refundCents /
 * orderTotalCents`, floored) on a partial one. `orderTotalCents <= 0` is
 * treated as a full refund (there is no meaningful proportion to compute).
 * `alreadyClawed` (the sum of prior `order_clawback` rows for this order) is
 * subtracted so a second, larger refund on the same order only claws back the
 * *remaining* difference — a partial refund followed later by a full refund
 * therefore claws back exactly `earned` in total, never more, regardless of
 * how many partial refunds preceded it. The result is additionally capped at
 * the customer's current `balance` (points already redeemed can't go
 * negative) and is never negative.
 */
export function clawbackPoints(p: {
  earned: number;
  alreadyClawed: number;
  refundCents: number;
  orderTotalCents: number;
  isFullRefund: boolean;
  balance: number;
}): number {
  const intended =
    p.isFullRefund || p.orderTotalCents <= 0
      ? p.earned
      : Math.floor((p.earned * p.refundCents) / p.orderTotalCents);
  const remaining = Math.max(0, intended - p.alreadyClawed);
  return Math.min(remaining, Math.max(0, p.balance));
}

/**
 * Whether a customer with `balance` points may redeem a tier costing
 * `pointsCost`. Consumed by the `redeem` tRPC procedure and the storefront
 * redeem UI (to disable unaffordable tiers).
 */
export function canRedeem(balance: number, pointsCost: number): boolean {
  return pointsCost > 0 && balance >= pointsCost;
}

/**
 * The expiry `Date` for a freshly-issued reward code, `days` (clamped to
 * [1, 365] — `LoyaltyProgram.rewardCodeExpiryDays`'s validated range) after
 * `now`. Consumed by the redeem procedure when it stamps a new reward code's
 * expiry. A non-finite `days` falls back to the schema default of 90 before
 * clamping, so a malformed setting can't produce an `Invalid Date`.
 */
export function rewardCodeExpiry(now: Date, days: number): Date {
  const safeDays = Number.isFinite(days) ? days : 90;
  const clampedDays = Math.min(365, Math.max(1, safeDays));
  return new Date(now.getTime() + clampedDays * 86_400_000);
}
