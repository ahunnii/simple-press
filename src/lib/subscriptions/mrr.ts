import type { SubscriptionIntervalKey } from "./intervals";

/**
 * Estimated monthly recurring revenue for the admin `/admin/subscriptions`
 * summary strip: normalizes every ACTIVE subscription's per-delivery charge
 * onto a common "if this billed once a month" basis using an average-month
 * multiplier, so a weekly subscriber and a quarterly subscriber can be summed
 * into one meaningful number.
 *
 * Deliberately self-contained rather than importing `subscriptionPerDeliveryCents`
 * from `~/lib/subscriptions/emails` — that module transitively imports
 * `~/lib/email/templates` (every React Email component plus
 * `~/lib/email/overrides.server`, which is marked `"server-only"`), so
 * importing it from the admin subscriptions TABLE (a `"use client"`
 * component) would break the client bundle. This file stays pure and
 * dependency-free so it's safe to import from both the server list page and
 * the client table/detail views, at the cost of duplicating the tiny
 * per-delivery formula that also lives in `emails.ts`.
 */

/**
 * How many times a cadence bills in an average month (365.25 / 12 days ÷ the
 * cadence's own day count). Keyed on every `SubscriptionIntervalKey` so a new
 * cadence added to the catalog is a compile error here until priced in.
 */
export const MONTHLY_RECURRING_MULTIPLIER: Record<
  SubscriptionIntervalKey,
  number
> = {
  "week:1": 4.33,
  "week:2": 2.17,
  "month:1": 1,
  "month:2": 0.5,
  "month:3": 1 / 3,
};

/**
 * Minimal shape every helper here needs — deliberately not `Subscription`
 * itself, so a caller (a Prisma row, a tRPC row, a hand-built test fixture)
 * never has to satisfy the full model.
 */
export interface RecurringChargeLike {
  intervalKey: string;
  unitAmountCents: number;
  quantity: number;
  shippingCents: number;
  deliveryMethod: string;
}

/**
 * What the customer is actually charged per delivery: locked unit price ×
 * quantity, plus the locked shipping line for a shipped subscription (0 for
 * pickup, matching `subscriptionPerDeliveryCents` in `emails.ts`).
 */
export function perDeliveryCentsFor(subscription: RecurringChargeLike): number {
  const items = subscription.unitAmountCents * subscription.quantity;
  const shipping =
    subscription.deliveryMethod === "pickup" ? 0 : subscription.shippingCents;
  return items + shipping;
}

/**
 * `perDeliveryCentsFor`, normalized onto a monthly basis. Returns 0 for an
 * unrecognized `intervalKey` — a row written by a future cadence this build
 * doesn't know about contributes nothing to the total rather than throwing.
 */
export function monthlyRecurringCentsFor(
  subscription: RecurringChargeLike,
): number {
  const multiplier =
    MONTHLY_RECURRING_MULTIPLIER[
      subscription.intervalKey as SubscriptionIntervalKey
    ] ?? 0;
  return perDeliveryCentsFor(subscription) * multiplier;
}

export interface RecurringSubscriptionLike extends RecurringChargeLike {
  status: string;
}

/**
 * Sum of `monthlyRecurringCentsFor` across every row with `status ===
 * "active"`, rounded to whole cents. Paused/past-due/cancelled/incomplete
 * rows are excluded — they aren't currently billing, so counting them would
 * overstate what the store can actually expect next month.
 */
export function computeMonthlyRecurringCents(
  subscriptions: readonly RecurringSubscriptionLike[],
): number {
  const totalCents = subscriptions
    .filter((subscription) => subscription.status === "active")
    .reduce(
      (sum, subscription) => sum + monthlyRecurringCentsFor(subscription),
      0,
    );
  return Math.round(totalCents);
}
