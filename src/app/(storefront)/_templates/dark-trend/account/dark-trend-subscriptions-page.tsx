import Link from "next/link";
import { Repeat } from "lucide-react";

import type { SubscriptionsPageTemplateProps } from "../../types";
import { formatDate } from "~/lib/format-date";
import { formatPrice } from "~/lib/prices";
import { SUBSCRIPTION_STATUS_LABELS } from "~/lib/validators/subscription";
import { Button } from "~/components/ui/button";

import { DarkTrendAccountLayout } from "./dark-trend-account-layout";

/** Mirrors the orders/order-detail status palette in this template — active
 * reads as the "good" green, past-due as the "needs action" red,
 * cancelled/incomplete as the quiet zinc neutral, paused falls through to
 * the same amber used for a pending order. */
function statusClass(status: string) {
  switch (status) {
    case "active":
      return "bg-green-900/40 text-green-300";
    case "past_due":
      return "bg-red-900/40 text-red-300";
    case "cancelled":
    case "incomplete":
      return "bg-zinc-700 text-zinc-300";
    default:
      return "bg-yellow-900/40 text-yellow-300";
  }
}

/** Next-delivery line for a subscription card — mirrors bamboo/sledge's own logic. */
function nextDateLabel(
  subscription: SubscriptionsPageTemplateProps["subscriptions"][number],
): string | null {
  if (subscription.status === "cancelled") return null;
  if (subscription.status === "paused") {
    return subscription.pauseResumesAt
      ? `Resumes ${formatDate(subscription.pauseResumesAt)}`
      : "Paused";
  }
  // A skip leaves the row ACTIVE with a future `pauseResumesAt` (see
  // `deriveSubscriptionStatus`), and `nextBillingAt` has already moved a
  // cadence past the skipped boundary — so naming that date without the word
  // "skipped" would read as the skip having failed.
  if (
    subscription.status === "active" &&
    subscription.pauseResumesAt !== null &&
    subscription.pauseResumesAt.getTime() > Date.now()
  ) {
    return subscription.nextBillingAt
      ? `Next delivery skipped — next charge ${formatDate(subscription.nextBillingAt)}`
      : "Next delivery skipped";
  }
  if (subscription.nextBillingAt) {
    return `Next delivery ${formatDate(subscription.nextBillingAt)}`;
  }
  return null;
}

export function DarkTrendSubscriptionsPage({
  subscriptions,
}: SubscriptionsPageTemplateProps) {
  return (
    <DarkTrendAccountLayout heading="Subscriptions">
      {subscriptions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex size-16 items-center justify-center rounded-sm bg-purple-500/20">
            <Repeat aria-hidden="true" className="size-8 text-purple-400" />
          </div>
          <h2 className="mb-2 text-xl font-semibold text-white">
            No subscriptions yet
          </h2>
          <p className="mb-6 text-sm text-white/70">
            Subscribe to a product for recurring delivery and it will appear
            here.
          </p>
          <Button
            asChild
            className="bg-violet-600 px-8 py-6 text-sm font-semibold tracking-wider text-white uppercase hover:bg-violet-700"
          >
            <Link href="/shop">Browse Shop</Link>
          </Button>
          {/* Subscribing does not require an account, so "none here" is not
              the same as "none at all" — the email lookup is the way back
              to a subscription started as a guest. */}
          <Link
            href="/subscriptions/manage"
            className="mt-6 text-sm text-white/60 underline underline-offset-4 hover:text-white/80"
          >
            Subscribed without an account? Look up your subscription by email →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {subscriptions.map((subscription) => {
            const nextDate = nextDateLabel(subscription);
            const label =
              SUBSCRIPTION_STATUS_LABELS[
                subscription.status as keyof typeof SUBSCRIPTION_STATUS_LABELS
              ] ?? subscription.status;
            return (
              <div
                key={subscription.id}
                className="rounded-sm border border-white/10 bg-zinc-900 p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="font-semibold text-white">
                      {subscription.productName}
                      {subscription.variantName
                        ? ` — ${subscription.variantName}`
                        : ""}
                    </h2>
                    <p className="mt-1 text-sm text-white/50">
                      Qty {subscription.quantity} &middot;{" "}
                      {subscription.intervalLabel}
                    </p>
                    {nextDate && (
                      <p className="mt-1 text-sm text-white/50">{nextDate}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span
                      className={`rounded-sm px-3 py-1 text-xs font-medium capitalize ${statusClass(subscription.status)}`}
                    >
                      {label}
                    </span>
                    <p className="text-lg font-semibold text-white">
                      {formatPrice(subscription.perDeliveryCents)}
                      <span className="text-xs font-normal text-white/50">
                        {" "}
                        / delivery
                      </span>
                    </p>
                  </div>
                </div>
                <div className="mt-4 border-t border-white/10 pt-4">
                  <a
                    href={subscription.manageUrl}
                    className="text-sm font-medium text-purple-400 hover:underline"
                  >
                    Manage →
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DarkTrendAccountLayout>
  );
}
