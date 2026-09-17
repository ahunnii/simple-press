"use client";

import type { CSSProperties } from "react";

import type { SubscriptionsPageTemplateProps } from "../../types";
import { formatDate } from "~/lib/format-date";
import { formatPrice } from "~/lib/prices";
import { SUBSCRIPTION_STATUS_LABELS } from "~/lib/validators/subscription";

import { DreamLink } from "../shared/dream-link";
import { DreamRevealGroup } from "../shared/dream-reveal";
import { DreamAccountEmptyState } from "./dream-account-empty-state";
import { DreamAccountLayout } from "./dream-account-layout";
import { DreamOrderStatusBadge } from "./dream-order-status-badge";

/** Next-delivery line for a subscription card — mirrors default/wealth's own logic. */
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

export function DreamSubscriptionsPage({
  subscriptions,
}: SubscriptionsPageTemplateProps) {
  return (
    <DreamAccountLayout
      heading="Subscriptions"
      breadcrumb={[
        { label: "Home", href: "/" },
        { label: "Account", href: "/account/settings" },
        { label: "Subscriptions" },
      ]}
    >
      {subscriptions.length === 0 ? (
        <DreamAccountEmptyState
          heading="No subscriptions yet"
          body="Set up a recurring order with Selest and it will appear here."
          ctaLabel="Request an estimate"
          ctaHref="/contact"
        />
      ) : (
        <DreamRevealGroup className="flex flex-col gap-4">
          {subscriptions.map((subscription, i) => {
            const nextDate = nextDateLabel(subscription);
            const label =
              SUBSCRIPTION_STATUS_LABELS[
                subscription.status as keyof typeof SUBSCRIPTION_STATUS_LABELS
              ] ?? subscription.status;
            return (
              <article
                key={subscription.id}
                className="dream-reveal-item dream-card"
                style={{ "--i": Math.min(i, 7) } as CSSProperties}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="m-0 text-[15px] font-medium text-[var(--dream-ink)]">
                        {subscription.productName}
                        {subscription.variantName
                          ? ` — ${subscription.variantName}`
                          : ""}
                      </p>
                      <DreamOrderStatusBadge
                        status={subscription.status}
                        label={label}
                      />
                    </div>
                    <p className="m-0 text-[13px] text-[var(--dream-soft)]">
                      Qty {subscription.quantity} · {subscription.intervalLabel}
                      {nextDate ? ` · ${nextDate}` : ""}
                    </p>
                  </div>
                  <p className="m-0 [font-family:var(--font-dream-display)] text-[20px] text-[var(--dream-ink)] tabular-nums">
                    {formatPrice(subscription.perDeliveryCents)}
                    <span className="[font-family:var(--font-dream-body)] text-[13px] text-[var(--dream-soft)]">
                      {" "}
                      / delivery
                    </span>
                  </p>
                </div>

                <div className="mt-4 border-t border-[var(--dream-line)] pt-4">
                  <DreamLink href={subscription.manageUrl}>Manage →</DreamLink>
                </div>
              </article>
            );
          })}
        </DreamRevealGroup>
      )}
    </DreamAccountLayout>
  );
}
