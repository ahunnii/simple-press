import Link from "next/link";
import { Repeat } from "lucide-react";

import type { SubscriptionsPageTemplateProps } from "../../types";
import { formatDate } from "~/lib/format-date";
import { formatPrice } from "~/lib/prices";
import { SUBSCRIPTION_STATUS_LABELS } from "~/lib/validators/subscription";
import {
  FadeIn,
  StaggerContainer,
  StaggerItem,
} from "~/components/page-animations";

import { PollenAccountLayout } from "./pollen-account-layout";

function statusClass(status: string) {
  switch (status) {
    case "active":
      return "bg-[#A8D081]/40 text-[#2a351f]";
    case "paused":
      return "bg-yellow-100 text-yellow-800";
    case "past_due":
      return "bg-red-100 text-red-800";
    case "cancelled":
      return "bg-gray-100 text-gray-600";
    default:
      return "bg-gray-100 text-gray-600";
  }
}

/**
 * Next-delivery line for a subscription card — mirrors
 * `happy-bamboo-subscriptions-page.tsx` / `olive-subscriptions-page.tsx`'s
 * own logic exactly. A skip leaves the row ACTIVE with a future
 * `pauseResumesAt`, and `nextBillingAt` has already moved a cadence past the
 * skipped boundary, so naming that date without the word "skipped" would
 * read as the skip having failed.
 */
function nextDateLabel(
  subscription: SubscriptionsPageTemplateProps["subscriptions"][number],
): string | null {
  if (subscription.status === "cancelled") return null;
  if (subscription.status === "paused") {
    return subscription.pauseResumesAt
      ? `Resumes ${formatDate(subscription.pauseResumesAt)}`
      : "Paused";
  }
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

export function PollenSubscriptionsPage({
  subscriptions,
}: SubscriptionsPageTemplateProps) {
  return (
    <PollenAccountLayout heading="Subscriptions">
      {subscriptions.length === 0 ? (
        <FadeIn direction="up">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-[#E5E8E0]">
              <Repeat className="size-8 text-[#5E7747]" aria-hidden="true" />
            </div>
            <h2 className="mb-2 text-xl font-bold text-[#2a351f]">
              You don&apos;t have any subscriptions yet
            </h2>
            <p className="mb-6 text-sm text-[#374151]">
              Subscribe to a product for recurring delivery and it will appear
              here.
            </p>
            <Link
              href="/shop"
              className="rounded-full bg-[#2a351f] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#3d4d2f]"
            >
              Browse Products
            </Link>
            {/* Subscribing does not require an account, so "none here" is
                not the same as "none at all" — the email lookup is the way
                back to a subscription started as a guest. */}
            <Link
              href="/subscriptions/manage"
              className="mt-6 text-sm text-[#374151] underline underline-offset-4 transition-colors hover:text-[#2a351f]"
            >
              Subscribed without an account? Look up your subscription by email
              →
            </Link>
          </div>
        </FadeIn>
      ) : (
        <StaggerContainer className="space-y-4" staggerDelay={0.08}>
          {subscriptions.map((subscription) => {
            const nextDate = nextDateLabel(subscription);
            return (
              <StaggerItem key={subscription.id}>
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-[#2a351f]">
                        {subscription.productName}
                        {subscription.variantName
                          ? ` — ${subscription.variantName}`
                          : ""}
                      </p>
                      <p className="mt-1 text-sm text-[#374151]">
                        Qty {subscription.quantity} &middot;{" "}
                        {subscription.intervalLabel}
                      </p>
                      {nextDate && (
                        <p className="mt-1 text-sm text-[#374151]">
                          {nextDate}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${statusClass(subscription.status)}`}
                      >
                        {SUBSCRIPTION_STATUS_LABELS[
                          subscription.status as keyof typeof SUBSCRIPTION_STATUS_LABELS
                        ] ?? subscription.status}
                      </span>
                      <p className="text-lg font-bold text-[#2a351f]">
                        {formatPrice(subscription.perDeliveryCents)}
                        <span className="text-xs font-normal text-[#374151]">
                          {" "}
                          / delivery
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 border-t pt-4">
                    <a
                      href={subscription.manageUrl}
                      className="text-sm font-semibold text-[#5E7747] hover:underline"
                    >
                      Manage →
                    </a>
                  </div>
                </div>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      )}
    </PollenAccountLayout>
  );
}
