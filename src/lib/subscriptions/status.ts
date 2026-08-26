import type Stripe from "stripe";
import { z } from "zod";

import { isSubscriptionIntervalKey } from "./intervals";

/**
 * SimplePress's local lifecycle status (`Subscription.status`), collapsed
 * from Stripe's richer `Subscription.Status` union — see
 * `deriveSubscriptionStatus` below for the mapping.
 */
export type LocalSubscriptionStatus =
  | "incomplete"
  | "active"
  | "past_due"
  | "paused"
  | "cancelled";

/**
 * Collapse a Stripe subscription's `status` (+ whether it's currently
 * `pause_collection`d) into our five-value local status. Stripe's `active`
 * status does not distinguish "billing normally" from "paused via
 * `pause_collection`" — a pause/skip leaves `status: "active"` — so
 * `pause_collection` is the deciding factor whenever Stripe reports `active`
 * or `trialing`.
 */
export function deriveSubscriptionStatus(
  sub: Pick<Stripe.Subscription, "status" | "pause_collection">,
): LocalSubscriptionStatus {
  switch (sub.status) {
    case "canceled":
    case "incomplete_expired":
      return "cancelled";
    case "incomplete":
      return "incomplete";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "paused":
      return "paused";
    case "active":
    case "trialing":
      return sub.pause_collection ? "paused" : "active";
    default:
      // Exhaustive over Stripe.Subscription.Status; unreachable, but keeps
      // this function total if Stripe ever adds a new status value.
      return "active";
  }
}

export interface SubscriptionPeriod {
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  /**
   * When the next charge that actually collects money will occur — normally
   * `currentPeriodEnd`. When a bounded pause (`pause_collection.resumes_at`,
   * i.e. a "skip next delivery") reaches past `currentPeriodEnd`, the invoice
   * generated at that boundary is voided, so the next real charge is a whole
   * cadence later — see `periodFromStripe`.
   */
  nextBillingAt: Date | null;
  pauseResumesAt: Date | null;
}

/**
 * Advance a date by `count` billing intervals, clamping the day-of-month the
 * way Stripe anchors its own cycles (Jan 31 + 1 month → Feb 28/29, not Mar 3).
 * All arithmetic is UTC.
 *
 * Shared by `periodFromStripe` (deriving the next collecting charge across a
 * skipped cycle) and `skipNextDelivery` in `actions.ts`, so the date the
 * customer is emailed and the date stored on the row can never disagree.
 */
export function addBillingInterval(
  from: Date,
  interval: string,
  count: number,
): Date {
  const next = new Date(from.getTime());
  const step = Math.max(1, Math.trunc(count) || 1);

  if (interval === "day") {
    next.setUTCDate(next.getUTCDate() + step);
    return next;
  }
  if (interval === "week") {
    next.setUTCDate(next.getUTCDate() + step * 7);
    return next;
  }

  const months = interval === "year" ? step * 12 : step;
  const day = next.getUTCDate();
  next.setUTCDate(1);
  next.setUTCMonth(next.getUTCMonth() + months);
  const lastDayOfTargetMonth = new Date(
    Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0),
  ).getUTCDate();
  next.setUTCDate(Math.min(day, lastDayOfTargetMonth));
  return next;
}

/**
 * Read billing-period fields off a Stripe subscription. v20 moved
 * `current_period_start`/`current_period_end` from the subscription itself
 * onto `subscription.items.data[0]` — see the plan's "v20 shape traps".
 * Returns all-null when `items.data` is empty (shouldn't happen for a real
 * subscription, but must not throw).
 */
export function periodFromStripe(sub: Stripe.Subscription): SubscriptionPeriod {
  const item = sub.items.data[0];
  const pauseResumesAt =
    sub.pause_collection?.resumes_at != null
      ? new Date(sub.pause_collection.resumes_at * 1000)
      : null;

  if (!item) {
    return {
      currentPeriodStart: null,
      currentPeriodEnd: null,
      nextBillingAt: null,
      pauseResumesAt: null,
    };
  }

  const currentPeriodStart = new Date(item.current_period_start * 1000);
  const currentPeriodEnd = new Date(item.current_period_end * 1000);

  // A bounded pause that outlasts this period is a SKIPPED delivery: Stripe
  // still generates the invoice at `currentPeriodEnd` and voids it, so no
  // money moves then. `resumes_at` (an hour or so past the boundary) is when
  // *collection* resumes, not when the customer is next charged — reporting it
  // as `nextBillingAt` would tell the customer and the owner that the delivery
  // they just skipped is still coming. Walk whole cadences forward from the
  // period end instead, until we land past the resume point.
  let nextBillingAt = currentPeriodEnd;
  if (pauseResumesAt && pauseResumesAt.getTime() > currentPeriodEnd.getTime()) {
    const recurring = item.price?.recurring ?? null;
    if (recurring) {
      // Bounded: a `resumes_at` far in the future is a pause, not a skip, and
      // must not spin here.
      for (
        let hops = 0;
        hops < 120 && nextBillingAt.getTime() <= pauseResumesAt.getTime();
        hops++
      ) {
        nextBillingAt = addBillingInterval(
          nextBillingAt,
          recurring.interval,
          recurring.interval_count,
        );
      }
    } else {
      // No cadence on the item (only reachable with a partial Stripe object):
      // fall back to the resume point rather than inventing a date.
      nextBillingAt = pauseResumesAt;
    }
  }

  return {
    currentPeriodStart,
    currentPeriodEnd,
    nextBillingAt,
    pauseResumesAt,
  };
}

/**
 * Zod shape of the metadata SimplePress stamps onto every subscription
 * Checkout Session / Subscription / Invoice (`subscription_data.metadata` in
 * the checkout-session builder). Stripe metadata values are always strings,
 * so `quantity` is a numeric string here, not a number.
 */
export const subscriptionMetadataSchema = z.object({
  businessId: z.string().min(1),
  subscriptionId: z.string().min(1),
  productId: z.string().min(1),
  /** Empty string when the product has no variants. */
  variantId: z.string(),
  intervalKey: z.string().refine(isSubscriptionIntervalKey, {
    message: "Unknown subscription interval key",
  }),
  quantity: z
    .string()
    .regex(/^[1-9]\d*$/, "quantity must be a positive integer"),
  deliveryMethod: z.enum(["ship", "pickup"]),
});

export type SubscriptionMetadata = z.infer<typeof subscriptionMetadataSchema>;

/**
 * Parse a raw Stripe `metadata` object (untrusted — it round-trips through
 * Stripe's API) into `SubscriptionMetadata`, or `null` if it's missing or
 * malformed. Never throws — every webhook handler that resolves tenant
 * context from event metadata needs a non-throwing parse.
 */
export function parseSubscriptionMetadata(
  metadata: Stripe.Metadata | null | undefined,
): SubscriptionMetadata | null {
  if (!metadata) return null;
  const result = subscriptionMetadataSchema.safeParse(metadata);
  return result.success ? result.data : null;
}
