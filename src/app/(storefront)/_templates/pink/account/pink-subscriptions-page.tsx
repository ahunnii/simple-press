import Link from "next/link";

import type { SubscriptionsPageTemplateProps } from "../../types";
import { formatDate } from "~/lib/format-date";
import { formatPrice } from "~/lib/prices";
import { PageTransition } from "~/components/page-animations";
import { SUBSCRIPTION_STATUS_LABELS } from "~/lib/validators/subscription";

import { PinkEmptyState } from "../shared/pink-empty-state";
import { PinkAccountLayout } from "./pink-account-layout";

/**
 * Border/text colour per subscription status. `PinkBadge` only carries two
 * tones (rose/ink), too coarse for five subscription states, so this reads
 * off pink's own success/error tokens directly — same idea as
 * `PinkOrdersPage`'s local `statusTone`, just with more buckets.
 */
function statusPillStyle(status: string): React.CSSProperties {
  switch (status) {
    case "active":
      return { borderColor: "var(--pink-success)", color: "var(--pink-success)" };
    case "past_due":
      return { borderColor: "var(--pink-error)", color: "var(--pink-error)" };
    case "paused":
      return { borderColor: "var(--pink-line-strong)", color: "var(--pink-muted)" };
    case "cancelled":
    case "incomplete":
    default:
      return { borderColor: "var(--pink-line)", color: "var(--pink-subtle)" };
  }
}

function StatusPill({ status, label }: { status: string; label: string }) {
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap uppercase tracking-wide"
      style={{ border: "1px solid", ...statusPillStyle(status) }}
    >
      {label}
    </span>
  );
}

/** Next-delivery line for a subscription row — mirrors noise/bamboo's own logic. */
function nextDateLabel(
  subscription: SubscriptionsPageTemplateProps["subscriptions"][number],
): string | null {
  if (subscription.status === "cancelled") return null;
  if (subscription.status === "paused") {
    return subscription.pauseResumesAt
      ? `Resumes ${formatDate(subscription.pauseResumesAt)}`
      : "Paused";
  }
  // A skip leaves the row ACTIVE with a future `pauseResumesAt`, and
  // `nextBillingAt` has already moved a cadence past the skipped boundary —
  // so naming that date without the word "skipped" would read as the skip
  // having failed.
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

export function PinkSubscriptionsPage({
  subscriptions,
}: SubscriptionsPageTemplateProps) {
  return (
    <PageTransition>
      <PinkAccountLayout
        title="Subscriptions"
        description="Recurring deliveries you've set up with us."
      >
        {subscriptions.length === 0 ? (
          <>
            <PinkEmptyState
              heading="You don't have any subscriptions yet"
              body="Subscribe to a product for recurring delivery and it will appear here."
              ctaLabel="Shop now"
              ctaHref="/shop"
            />
            {/* Subscribing does not require an account, so "none here" is not
                the same as "none at all" — this is the way back to a
                subscription started as a guest. */}
            <p
              className="mt-6 text-center text-[13px]"
              style={{ color: "var(--pink-subtle)" }}
            >
              Subscribed without an account?{" "}
              <Link
                href="/subscriptions/manage"
                className="font-medium"
                style={{ color: "var(--pink-rose)" }}
              >
                Look up your subscription by email
                <span aria-hidden="true"> →</span>
              </Link>
            </p>
          </>
        ) : (
          <div style={{ borderTop: "1px solid var(--pink-ink)" }}>
            {/* Column headers */}
            <div
              className="hidden gap-6 py-4 sm:grid"
              style={{ gridTemplateColumns: "1fr auto auto" }}
            >
              <span className="pink-label">Subscription</span>
              <span className="pink-label">Status</span>
              <span className="pink-label text-right">Price</span>
            </div>

            {subscriptions.map((subscription) => {
              const nextDate = nextDateLabel(subscription);
              const label =
                SUBSCRIPTION_STATUS_LABELS[
                  subscription.status as keyof typeof SUBSCRIPTION_STATUS_LABELS
                ] ?? subscription.status;

              return (
                <div
                  key={subscription.id}
                  className="py-6"
                  style={{ borderTop: "1px solid var(--pink-ink)" }}
                >
                  <div className="flex flex-col gap-3 sm:hidden">
                    <div className="flex items-start justify-between gap-3">
                      <span
                        className="pink-display"
                        style={{ fontSize: 16, fontWeight: 600 }}
                      >
                        {subscription.productName}
                        {subscription.variantName
                          ? ` — ${subscription.variantName}`
                          : ""}
                      </span>
                      <StatusPill status={subscription.status} label={label} />
                    </div>
                    <span
                      className="text-[13px]"
                      style={{ color: "var(--pink-subtle)" }}
                    >
                      Qty {subscription.quantity} · {subscription.intervalLabel}
                      {nextDate ? ` · ${nextDate}` : ""}
                    </span>
                    <div className="flex items-center justify-between gap-3">
                      <span
                        className="pink-display"
                        style={{ fontSize: 18, fontWeight: 600 }}
                      >
                        {formatPrice(subscription.perDeliveryCents)}
                        <span
                          className="text-[13px] font-normal"
                          style={{ color: "var(--pink-subtle)" }}
                        >
                          {" "}
                          / delivery
                        </span>
                      </span>
                      <a
                        href={subscription.manageUrl}
                        className="text-[13px] font-medium"
                        style={{ color: "var(--pink-rose)" }}
                      >
                        Manage
                        <span aria-hidden="true"> →</span>
                      </a>
                    </div>
                  </div>

                  <div
                    className="hidden items-center gap-6 sm:grid"
                    style={{ gridTemplateColumns: "1fr auto auto" }}
                  >
                    <div className="flex flex-col gap-1">
                      <span
                        className="pink-display"
                        style={{ fontSize: 16, fontWeight: 600 }}
                      >
                        {subscription.productName}
                        {subscription.variantName
                          ? ` — ${subscription.variantName}`
                          : ""}
                      </span>
                      <span
                        className="text-[13px]"
                        style={{ color: "var(--pink-subtle)" }}
                      >
                        Qty {subscription.quantity} ·{" "}
                        {subscription.intervalLabel}
                        {nextDate ? ` · ${nextDate}` : ""}
                      </span>
                      <a
                        href={subscription.manageUrl}
                        className="text-[13px] font-medium"
                        style={{ color: "var(--pink-rose)" }}
                      >
                        Manage
                        <span aria-hidden="true"> →</span>
                      </a>
                    </div>

                    <StatusPill status={subscription.status} label={label} />

                    <span
                      className="pink-display text-right"
                      style={{ fontSize: 18, fontWeight: 600 }}
                    >
                      {formatPrice(subscription.perDeliveryCents)}
                      <span
                        className="text-[13px] font-normal"
                        style={{ color: "var(--pink-subtle)" }}
                      >
                        {" "}
                        / delivery
                      </span>
                    </span>
                  </div>
                </div>
              );
            })}

            <p
              className="mt-6 text-[13px]"
              style={{ color: "var(--pink-subtle)" }}
            >
              Subscribed without an account?{" "}
              <Link
                href="/subscriptions/manage"
                className="font-medium"
                style={{ color: "var(--pink-rose)" }}
              >
                Look up your subscription by email
                <span aria-hidden="true"> →</span>
              </Link>
            </p>
          </div>
        )}
      </PinkAccountLayout>
    </PageTransition>
  );
}
