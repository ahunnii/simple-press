import type { StatPart, StatQuery } from "./types";
import { computeMonthlyRecurringCents } from "~/lib/subscriptions/mrr";

export type SubscriptionWidget = "active-subscribers" | "mrr";

/**
 * Point-in-time. Active means `status = "active"` only (the same rule as the
 * /admin/subscriptions summary strip); `computeMonthlyRecurringCents` is the
 * strip's own helper, so the two numbers always agree.
 */
export async function subscriptionStat(
  q: StatQuery,
  widget: SubscriptionWidget,
): Promise<StatPart> {
  const { db, ctx } = q;

  if (widget === "active-subscribers") {
    const value = await db.subscription.count({
      where: { businessId: ctx.businessId, status: "active" },
    });
    return { value, detail: [] };
  }

  const rows = await db.subscription.findMany({
    where: { businessId: ctx.businessId, status: "active" },
    select: {
      status: true,
      intervalKey: true,
      unitAmountCents: true,
      quantity: true,
      shippingCents: true,
      deliveryMethod: true,
    },
  });
  return {
    value: computeMonthlyRecurringCents(rows),
    detail: [
      `${rows.length} active ${rows.length === 1 ? "subscription" : "subscriptions"}`,
    ],
    note: "Estimated from each plan's billing interval",
  };
}
