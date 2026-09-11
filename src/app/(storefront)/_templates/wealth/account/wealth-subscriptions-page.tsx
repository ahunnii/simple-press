"use client";

import { Repeat } from "lucide-react";

import type { SubscriptionsPageTemplateProps } from "../../types";
import { formatDate } from "~/lib/format-date";
import { formatPrice } from "~/lib/prices";
import { SUBSCRIPTION_STATUS_LABELS } from "~/lib/validators/subscription";

import { WealthLedgeButton } from "../shared/wealth-ledge-button";
import { WealthReveal, WealthRevealGroup } from "../shared/wealth-reveal";
import { WealthAccountLayout } from "./wealth-account-layout";
import { statusStyles } from "./wealth-order-status-badge";

/** Next date line for a subscription card — mirrors default/vii's own logic. */
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

export function WealthSubscriptionsPage({ subscriptions }: SubscriptionsPageTemplateProps) {
  return (
    <WealthAccountLayout
      heading="Subscriptions"
      breadcrumb={[
        { label: "Home", href: "/" },
        { label: "Account", href: "/account/settings" },
        { label: "Subscriptions" },
      ]}
    >
      {subscriptions.length === 0 ? (
        <WealthReveal>
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div
              aria-hidden
              className="mb-6 flex h-16 w-16 items-center justify-center rounded-full"
              style={{ background: "var(--wealth-surface)" }}
            >
              <Repeat style={{ width: 28, height: 28, color: "var(--wealth-muted)" }} />
            </div>
            <h2
              style={{
                fontFamily: "var(--font-wealth-sub)",
                fontStyle: "italic",
                fontSize: 24,
                color: "var(--wealth-ink)",
                margin: "0 0 12px",
              }}
            >
              You don&apos;t have any subscriptions yet
            </h2>
            {/* Recurring giving is the closest analogue to a "subscription"
                for a lending/service org with no shop — see wealth-orders-page.tsx. */}
            <p
              style={{
                fontFamily: "var(--font-wealth-body)",
                fontSize: 15,
                color: "var(--wealth-muted)",
                lineHeight: "25.5px",
                margin: "0 0 28px",
                maxWidth: "38ch",
              }}
            >
              Set up a recurring donation or subscription and it will appear here.
            </p>
            <WealthLedgeButton href="/donate" variant="donate">
              Support DCWF
            </WealthLedgeButton>
          </div>
        </WealthReveal>
      ) : (
        <WealthRevealGroup className="flex flex-col gap-4">
          {subscriptions.map((subscription, i) => {
            const nextDate = nextDateLabel(subscription);
            return (
              <article
                key={subscription.id}
                className="wealth-reveal-item"
                style={
                  {
                    "--i": Math.min(i, 7),
                    background: "var(--wealth-paper)",
                    border: "1px solid var(--wealth-surface-2)",
                    padding: 24,
                  } as React.CSSProperties
                }
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-3">
                      <p style={{ fontSize: 15, fontWeight: 500, color: "var(--wealth-ink)", margin: 0 }}>
                        {subscription.productName}
                        {subscription.variantName ? ` — ${subscription.variantName}` : ""}
                      </p>
                      <span
                        style={{
                          ...statusStyles(subscription.status),
                          fontFamily: "var(--font-wealth-mono)",
                          fontSize: 11,
                          letterSpacing: "1px",
                          textTransform: "uppercase",
                          padding: "3px 10px",
                        }}
                      >
                        {SUBSCRIPTION_STATUS_LABELS[
                          subscription.status as keyof typeof SUBSCRIPTION_STATUS_LABELS
                        ] ?? subscription.status}
                      </span>
                    </div>
                    <p style={{ fontSize: 13, color: "var(--wealth-muted)", margin: 0 }}>
                      Qty {subscription.quantity} &middot; {subscription.intervalLabel}
                      {nextDate ? ` · ${nextDate}` : ""}
                    </p>
                  </div>
                  <p
                    style={{
                      fontFamily: "var(--font-wealth-sub)",
                      fontStyle: "italic",
                      fontSize: 20,
                      color: "var(--wealth-ink)",
                      margin: 0,
                    }}
                  >
                    {formatPrice(subscription.perDeliveryCents)}
                    <span style={{ fontSize: 13, fontStyle: "normal", color: "var(--wealth-muted)" }}> / delivery</span>
                  </p>
                </div>

                <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--wealth-surface-2)" }}>
                  <a
                    href={subscription.manageUrl}
                    style={{ fontSize: 14, fontWeight: 500, color: "var(--wealth-primary)" }}
                  >
                    Manage →
                  </a>
                </div>
              </article>
            );
          })}
        </WealthRevealGroup>
      )}
    </WealthAccountLayout>
  );
}
