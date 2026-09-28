import Link from "next/link";
import { Repeat } from "lucide-react";

import type { SubscriptionsPageTemplateProps } from "../../types";
import { formatDate } from "~/lib/format-date";
import { formatPrice } from "~/lib/prices";
import { SUBSCRIPTION_STATUS_LABELS } from "~/lib/validators/subscription";

import { ViiReveal, ViiRevealGroup } from "../shared/vii-reveal";
import { ViiAccountLayout } from "./vii-account-layout";

/** Returns inline-style objects for the subscription status badge — vii palette, mirrors `vii-orders-page.tsx`'s `statusStyles`. */
function statusStyles(status: string): { background: string; color: string } {
  switch (status) {
    case "active":
      // subtle copper-light tint on paper — copper text (mirrors "completed" order tone)
      return {
        background:
          "color-mix(in srgb, var(--vii-copper-deep) 12%, transparent)",
        color: "var(--vii-copper-deep)",
      };
    case "past_due":
      // muted clay tint — ink-soft text (mirrors "cancelled" order tone)
      return {
        background: "color-mix(in srgb, var(--vii-clay) 15%, transparent)",
        color: "var(--vii-ink-soft)",
      };
    case "cancelled":
      // light tan wash — ink-soft text (mirrors "refunded" order tone)
      return {
        background: "color-mix(in srgb, var(--vii-tan) 25%, transparent)",
        color: "var(--vii-ink-soft)",
      };
    default:
      // paused / anything else — tan tint / navy (mirrors "pending" order tone)
      return {
        background: "color-mix(in srgb, var(--vii-tan) 35%, transparent)",
        color: "var(--vii-navy)",
      };
  }
}

/**
 * Next-delivery line for a subscription card — mirrors
 * `pollen-subscriptions-page.tsx` / `bamboo-subscriptions-page.tsx`'s own
 * logic exactly. A skip leaves the row ACTIVE with a future
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

export function ViiSubscriptionsPage({
  subscriptions,
}: SubscriptionsPageTemplateProps) {
  return (
    <ViiAccountLayout
      heading="Subscriptions"
      breadcrumb={[
        { label: "Home", href: "/" },
        { label: "Account", href: "/account/settings" },
        { label: "Subscriptions" },
      ]}
    >
      {subscriptions.length === 0 ? (
        <ViiReveal>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              paddingTop: 80,
              paddingBottom: 80,
              textAlign: "center",
            }}
          >
            <div
              aria-hidden
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "var(--vii-paper)",
                border: "1px solid var(--vii-hairline-strong)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 24,
              }}
            >
              <Repeat
                style={{
                  width: 28,
                  height: 28,
                  color: "var(--vii-copper-light)",
                }}
              />
            </div>
            <h2
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 22,
                fontWeight: 500,
                color: "var(--vii-navy)",
                margin: "0 0 12px",
              }}
            >
              You don&apos;t have any subscriptions yet
            </h2>
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 15,
                color: "var(--vii-ink-soft)",
                lineHeight: 1.6,
                margin: "0 0 28px",
                maxWidth: "36ch",
              }}
            >
              Subscribe to a product for recurring delivery and it will
              appear here.
            </p>
            <Link
              href="/shop"
              style={{
                display: "inline-block",
                background: "var(--vii-copper-deep)",
                color: "var(--vii-paper)",
                fontFamily: "var(--font-sans)",
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                padding: "14px 32px",
                borderRadius: "var(--radius)",
                textDecoration: "none",
              }}
            >
              Browse Products
            </Link>
            {/* Subscribing does not require an account, so "none here" is
                not the same as "none at all" — the email lookup is the way
                back to a subscription started as a guest. */}
            <Link
              href="/subscriptions/manage"
              className="vii-nav-link"
              style={{
                display: "inline-block",
                marginTop: 24,
                fontFamily: "var(--font-sans)",
                fontSize: 13,
                fontWeight: 500,
                color: "var(--vii-ink-soft)",
                textDecoration: "none",
                position: "relative",
              }}
            >
              Subscribed without an account? Look up your subscription by
              email →
            </Link>
          </div>
        </ViiReveal>
      ) : (
        <ViiRevealGroup className="space-y-4">
          {subscriptions.map((subscription, i) => {
            const nextDate = nextDateLabel(subscription);
            return (
              <article
                key={subscription.id}
                className="vii-reveal-item vii-lift"
                style={
                  {
                    "--i": Math.min(i, 7),
                    background: "var(--vii-paper)",
                    border: "1px solid var(--vii-hairline-strong)",
                    borderRadius: "var(--radius)",
                    padding: 24,
                  } as React.CSSProperties
                }
              >
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 16,
                  }}
                >
                  <div>
                    <p
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: 15,
                        fontWeight: 500,
                        color: "var(--vii-navy)",
                        margin: "0 0 4px",
                      }}
                    >
                      {subscription.productName}
                      {subscription.variantName
                        ? ` — ${subscription.variantName}`
                        : ""}
                    </p>
                    <p
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: 13,
                        color: "var(--vii-ink-soft)",
                        margin: "0 0 2px",
                      }}
                    >
                      Qty {subscription.quantity} &middot;{" "}
                      {subscription.intervalLabel}
                    </p>
                    {nextDate && (
                      <p
                        style={{
                          fontFamily: "var(--font-sans)",
                          fontSize: 13,
                          color: "var(--vii-ink-soft)",
                          margin: 0,
                        }}
                      >
                        {nextDate}
                      </p>
                    )}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-end",
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        ...statusStyles(subscription.status),
                        fontFamily: "var(--font-sans)",
                        fontSize: 11,
                        fontWeight: 500,
                        letterSpacing: "0.1em",
                        textTransform: "capitalize",
                        padding: "4px 12px",
                        borderRadius: "var(--radius)",
                      }}
                    >
                      {SUBSCRIPTION_STATUS_LABELS[
                        subscription.status as keyof typeof SUBSCRIPTION_STATUS_LABELS
                      ] ?? subscription.status}
                    </span>
                    <p
                      style={{
                        fontFamily: "var(--font-serif)",
                        fontSize: 20,
                        fontWeight: 500,
                        color: "var(--vii-navy)",
                        margin: 0,
                      }}
                    >
                      {formatPrice(subscription.perDeliveryCents)}
                      <span
                        style={{
                          fontFamily: "var(--font-sans)",
                          fontSize: 12,
                          fontWeight: 400,
                          color: "var(--vii-ink-soft)",
                        }}
                      >
                        {" "}
                        / delivery
                      </span>
                    </p>
                  </div>
                </div>
                <div
                  style={{
                    marginTop: 16,
                    paddingTop: 16,
                    borderTop: "1px solid var(--vii-hairline)",
                  }}
                >
                  <a
                    href={subscription.manageUrl}
                    className="vii-nav-link"
                    style={{
                      display: "inline-block",
                      fontFamily: "var(--font-sans)",
                      fontSize: 13,
                      fontWeight: 500,
                      color: "var(--vii-copper-deep)",
                      textDecoration: "none",
                      letterSpacing: "0.02em",
                      position: "relative",
                    }}
                  >
                    Manage →
                  </a>
                </div>
              </article>
            );
          })}
        </ViiRevealGroup>
      )}
    </ViiAccountLayout>
  );
}
