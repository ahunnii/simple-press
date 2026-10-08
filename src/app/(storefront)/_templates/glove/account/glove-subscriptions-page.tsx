"use client";

import type { SubscriptionsPageTemplateProps } from "../../types";
import type { GloveStatusTone } from "./glove-account-ui";
import { formatDate } from "~/lib/format-date";
import { formatPrice } from "~/lib/prices";
import { SUBSCRIPTION_STATUS_LABELS } from "~/lib/validators/subscription";

import { GloveButton } from "../shared/glove-button";
import { GloveRevealGroup } from "../shared/glove-reveal";
import { gloveRevealItemStyle } from "../shared/glove-reveal-style";
import { GloveAccountLayout } from "./glove-account-layout";
import {
  GloveAccountCard,
  GloveAccountEmpty,
  GloveStatusBadge,
} from "./glove-account-ui";

const STATUS_TONE: Record<string, GloveStatusTone> = {
  active: "success",
  paused: "muted",
  past_due: "alert",
  cancelled: "muted",
};

type Subscription = SubscriptionsPageTemplateProps["subscriptions"][number];

/** Next-delivery line for a subscription card. */
function nextDateLabel(subscription: Subscription): string | null {
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
      ? `Next delivery skipped, next charge ${formatDate(subscription.nextBillingAt)}`
      : "Next delivery skipped";
  }
  if (subscription.nextBillingAt) {
    return `Next delivery ${formatDate(subscription.nextBillingAt)}`;
  }
  return null;
}

/** Subscriptions: cards with cadence, next delivery, a status pill and a manage link. */
export function GloveSubscriptionsPage({
  subscriptions,
}: SubscriptionsPageTemplateProps) {
  return (
    <GloveAccountLayout heading="Subscriptions">
      {subscriptions.length === 0 ? (
        <GloveAccountEmpty
          heading="No subscriptions yet"
          body="Set up a standing order on a favorite and it will settle in right here."
          cta={{ label: "Shop now", href: "/shop" }}
        />
      ) : (
        <GloveRevealGroup threshold={0} className="flex flex-col gap-4">
          {subscriptions.map((subscription, i) => {
            const nextDate = nextDateLabel(subscription);
            const statusLabel =
              SUBSCRIPTION_STATUS_LABELS[
                subscription.status as keyof typeof SUBSCRIPTION_STATUS_LABELS
              ] ?? subscription.status;
            return (
              <GloveAccountCard
                key={subscription.id}
                as="article"
                className="glove-reveal-item"
                style={gloveRevealItemStyle(i)}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="glove-display text-[18px] leading-tight font-medium text-[var(--glove-ink)]">
                        {subscription.productName}
                        {subscription.variantName
                          ? ` — ${subscription.variantName}`
                          : ""}
                      </p>
                      <GloveStatusBadge
                        label={statusLabel}
                        tone={STATUS_TONE[subscription.status] ?? "primary"}
                      />
                    </div>
                    <p className="mt-1 text-[14px] text-[var(--glove-muted)]">
                      Qty {subscription.quantity} · {subscription.intervalLabel}
                      {nextDate ? ` · ${nextDate}` : ""}
                    </p>
                  </div>
                  <p className="glove-body text-right text-[18px] font-bold text-[var(--glove-primary)]">
                    {formatPrice(subscription.perDeliveryCents)}
                    <span className="text-[13px] font-normal text-[var(--glove-muted)]">
                      {" "}
                      / delivery
                    </span>
                  </p>
                </div>

                <div className="mt-4 border-t border-[var(--glove-line)] pt-4">
                  <GloveButton
                    href={subscription.manageUrl}
                    variant="wooOutline"
                    size="sm"
                  >
                    Manage
                    <span className="sr-only">
                      {" "}
                      {subscription.productName} subscription
                    </span>
                  </GloveButton>
                </div>
              </GloveAccountCard>
            );
          })}
        </GloveRevealGroup>
      )}
    </GloveAccountLayout>
  );
}
