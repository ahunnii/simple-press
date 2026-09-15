"use client";

import type { CSSProperties } from "react";

import type { SubscriptionsPageTemplateProps } from "../../types";
import type { OliveStatus } from "../shared";
import { formatDate } from "~/lib/format-date";
import { formatPrice } from "~/lib/prices";
import { SUBSCRIPTION_STATUS_LABELS } from "~/lib/validators/subscription";

import {
  OliveButton,
  OliveEmptyState,
  OliveRevealGroup,
  OliveStatusBadge,
} from "../shared";
import { OliveAccountLayout } from "./olive-account-layout";

/** `Subscription.status` also carries "incomplete", which has no olive status — falls back to "pending". */
const SUBSCRIPTION_STATUSES = new Set<string>([
  "active",
  "paused",
  "past_due",
  "cancelled",
]);

function toSubscriptionStatus(status: string): OliveStatus {
  return (
    SUBSCRIPTION_STATUSES.has(status) ? status : "pending"
  ) as OliveStatus;
}

/** Next-delivery line for a subscription card — mirrors `wealth-subscriptions-page.tsx`'s own logic. */
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

/**
 * OliveSubscriptionsPage — mirrors `wealth/account/wealth-subscriptions-page.tsx`
 * exactly for props/data (per assignment). Cards with cadence, next delivery,
 * an `OliveStatusBadge`, and a manage link.
 */
export function OliveSubscriptionsPage({
  subscriptions,
}: SubscriptionsPageTemplateProps) {
  return (
    <OliveAccountLayout
      heading="Subscriptions"
      breadcrumb={[
        { label: "Home", href: "/" },
        { label: "Account", href: "/account/settings" },
        { label: "Subscriptions" },
      ]}
    >
      {subscriptions.length === 0 ? (
        <OliveEmptyState
          heading="No subscriptions yet"
          body="Set up a standing order on a favourite and it will settle in right here."
          cta={{ label: "Shop new", href: "/shop" }}
        />
      ) : (
        <OliveRevealGroup className="flex flex-col gap-4" fan>
          {subscriptions.map((subscription, i) => {
            const nextDate = nextDateLabel(subscription);
            const statusLabel =
              SUBSCRIPTION_STATUS_LABELS[
                subscription.status as keyof typeof SUBSCRIPTION_STATUS_LABELS
              ] ?? subscription.status;
            return (
              <article
                key={subscription.id}
                className="olive-card olive-reveal-item"
                style={
                  { "--i": Math.min(i, 8), padding: "1.5rem" } as CSSProperties
                }
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="olive-h3" style={{ margin: 0 }}>
                        {subscription.productName}
                        {subscription.variantName
                          ? ` — ${subscription.variantName}`
                          : ""}
                      </p>
                      <OliveStatusBadge
                        status={toSubscriptionStatus(subscription.status)}
                        label={statusLabel}
                      />
                    </div>
                    <p
                      className="olive-caption"
                      style={{ margin: "0.25rem 0 0" }}
                    >
                      Qty {subscription.quantity} · {subscription.intervalLabel}
                      {nextDate ? ` · ${nextDate}` : ""}
                    </p>
                  </div>
                  <p className="olive-price" style={{ textAlign: "right" }}>
                    {formatPrice(subscription.perDeliveryCents)}
                    <span className="olive-caption"> / delivery</span>
                  </p>
                </div>

                <div
                  className="mt-4 pt-4"
                  style={{ borderTop: "1px solid var(--olive-hairline)" }}
                >
                  <OliveButton variant="ghost" href={subscription.manageUrl}>
                    Manage
                  </OliveButton>
                </div>
              </article>
            );
          })}
        </OliveRevealGroup>
      )}
    </OliveAccountLayout>
  );
}
