"use client";

import Link from "next/link";
import { Repeat } from "lucide-react";

import type { SubscriptionsPageTemplateProps } from "../../types";
import { formatDate } from "~/lib/format-date";
import { formatPrice } from "~/lib/prices";
import { SUBSCRIPTION_STATUS_LABELS } from "~/lib/validators/subscription";
import { cn } from "~/lib/utils";
import { PageTransition } from "~/components/page-animations";

import { SledgeAccountLayout } from "./sledge-account-layout";

/** Subscription statuses reuse the order page's badge palette — active reads
 * as the "good" green, past-due as the "needs action" red, cancelled/
 * incomplete as the quiet neutral, paused falls through to the plain
 * default outline. */
function statusClass(status: string): string {
  switch (status) {
    case "active":
      return "sl-status-completed";
    case "past_due":
      return "sl-status-cancelled";
    case "cancelled":
    case "incomplete":
      return "sl-status-refunded";
    default:
      return "sl-status-default";
  }
}

function StatusBadge({ status, label }: { status: string; label: string }) {
  return (
    <span
      className={cn(
        "inline-block rounded-sm border px-2 py-1 font-sans text-[10px] tracking-[0.12em] uppercase",
        statusClass(status),
      )}
    >
      {label}
    </span>
  );
}

/** Next-delivery line for a subscription card — mirrors bamboo/dream's own logic. */
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

export function SledgeSubscriptionsPage({
  subscriptions,
}: SubscriptionsPageTemplateProps) {
  return (
    <PageTransition className="bg-white">
      <SledgeAccountLayout heading="Subscriptions">
        {subscriptions.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-6 py-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-sm bg-[var(--sl-cream)] text-[var(--sl-coral)]">
              <Repeat className="size-6" aria-hidden="true" />
            </div>
            <div>
              <h2 className="sl-page-title-md font-heading text-[var(--sl-coral-aa)] uppercase">
                No subscriptions yet
              </h2>
              <p className="sl-eyebrow mt-2 font-sans text-sm">
                Subscribe to a product for recurring delivery and it will
                appear here.
              </p>
            </div>
            <Link href="/shop" className="sl-btn text-xs">
              Browse Shop →
            </Link>
            {/* Subscribing does not require an account, so "none here" is not
                the same as "none at all" — the email lookup is the way back
                to a subscription started as a guest. */}
            <Link
              href="/subscriptions/manage"
              className="font-sans text-xs tracking-[0.12em] text-[var(--sl-ink-soft)] uppercase underline underline-offset-4 transition-opacity hover:opacity-60"
            >
              Subscribed without an account? Look up your subscription by
              email →
            </Link>
          </div>
        ) : (
          <div className="flex flex-col">
            {subscriptions.map((subscription) => {
              const nextDate = nextDateLabel(subscription);
              const label =
                SUBSCRIPTION_STATUS_LABELS[
                  subscription.status as keyof typeof SUBSCRIPTION_STATUS_LABELS
                ] ?? subscription.status;
              return (
                <div
                  key={subscription.id}
                  className="border-b border-[var(--sl-border)] py-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="font-sans text-sm tracking-[0.03em] text-[var(--sl-ink)] uppercase">
                          {subscription.productName}
                          {subscription.variantName
                            ? ` — ${subscription.variantName}`
                            : ""}
                        </h2>
                        <StatusBadge status={subscription.status} label={label} />
                      </div>
                      <p className="sl-eyebrow font-sans text-xs tracking-[0.1em]">
                        Qty {subscription.quantity} &middot;{" "}
                        {subscription.intervalLabel}
                        {nextDate ? ` · ${nextDate}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <span className="font-sans text-lg tracking-[0.02em] text-[var(--sl-ink)] tabular-nums">
                        {formatPrice(subscription.perDeliveryCents)}
                        <span className="sl-eyebrow text-xs normal-case">
                          {" "}
                          / delivery
                        </span>
                      </span>
                      <a
                        href={subscription.manageUrl}
                        className="font-sans text-xs tracking-[0.14em] text-[var(--sl-coral-aa)] uppercase transition-opacity hover:opacity-60"
                      >
                        Manage →
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SledgeAccountLayout>
    </PageTransition>
  );
}
