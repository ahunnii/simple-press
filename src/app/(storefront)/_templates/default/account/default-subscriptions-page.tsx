import Link from "next/link";
import { Repeat } from "lucide-react";

import type { SubscriptionsPageTemplateProps } from "../../types";
import { formatDate } from "~/lib/format-date";
import { formatPrice } from "~/lib/prices";
import { SUBSCRIPTION_STATUS_LABELS } from "~/lib/validators/subscription";

import { DefaultAccountLayout } from "./default-account-layout";

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "border-[#15803d] text-[#15803d]",
    paused: "border-[#b45309] text-[#b45309]",
    past_due: "border-[#dc2626] text-[#dc2626]",
    cancelled: "border-[#6b6b6b] text-[#6b6b6b]",
    incomplete: "border-[#6b6b6b] text-[#6b6b6b]",
  };
  const style = styles[status] ?? "border-[#0a0a0a] text-[#0a0a0a]";
  const label =
    SUBSCRIPTION_STATUS_LABELS[
      status as keyof typeof SUBSCRIPTION_STATUS_LABELS
    ] ?? status;
  return (
    <span
      className={`inline-flex items-center rounded-[2px] border px-2 py-0.5 text-[10px] font-medium tracking-[0.1em] uppercase ${style}`}
    >
      {label}
    </span>
  );
}

/** Next date line for a subscription card — mirrors the manage page's own logic, kept small since it only needs a one-line summary here. */
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

export function DefaultSubscriptionsPage({
  subscriptions,
}: SubscriptionsPageTemplateProps) {
  return (
    <DefaultAccountLayout heading="Subscriptions">
      {subscriptions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Repeat
            className="mb-4 h-10 w-10 text-[#6b6b6b]"
            aria-hidden="true"
          />
          <h2 className="font-serif text-xl font-medium">
            You don&apos;t have any subscriptions yet
          </h2>
          <p className="mt-2 text-sm text-[#6b6b6b]">
            Subscribe to a product for recurring delivery and it will appear
            here.
          </p>
          <Link
            href="/shop"
            className="mt-8 inline-flex h-10 items-center justify-center rounded-[var(--radius)] bg-[#0a0a0a] px-6 text-sm font-medium text-white transition-colors hover:bg-[#2a2a2a]"
          >
            Browse products
          </Link>
          {/* Subscribing does not require an account, so "none here" is not
              the same as "none at all" — the email lookup is the way back to
              a subscription started as a guest. */}
          <Link
            href="/subscriptions/manage"
            className="mt-6 inline-flex items-center gap-2 border-b border-current pb-0.5 text-[13px] text-[#6b6b6b] transition-[gap] hover:gap-3"
          >
            Subscribed without an account? Look up your subscription by email{" "}
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-[#e8e8e8]">
          {subscriptions.map((subscription) => {
            const nextDate = nextDateLabel(subscription);
            return (
              <div key={subscription.id} className="py-6 first:pt-0">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-3">
                      <p className="text-sm font-medium">
                        {subscription.productName}
                        {subscription.variantName
                          ? ` — ${subscription.variantName}`
                          : ""}
                      </p>
                      <StatusBadge status={subscription.status} />
                    </div>
                    <p className="text-[13px] text-[#6b6b6b]">
                      Qty {subscription.quantity} &middot;{" "}
                      {subscription.intervalLabel}
                      {nextDate ? ` · ${nextDate}` : ""}
                    </p>
                  </div>
                  <p className="text-base font-semibold">
                    {formatPrice(subscription.perDeliveryCents)}
                    <span className="text-[13px] font-normal text-[#6b6b6b]">
                      {" "}
                      / delivery
                    </span>
                  </p>
                </div>

                <a
                  href={subscription.manageUrl}
                  className="mt-4 inline-flex items-center gap-2 border-b border-current pb-0.5 text-sm font-medium transition-[gap] hover:gap-3"
                >
                  Manage <span aria-hidden="true">→</span>
                </a>
              </div>
            );
          })}
        </div>
      )}
    </DefaultAccountLayout>
  );
}
