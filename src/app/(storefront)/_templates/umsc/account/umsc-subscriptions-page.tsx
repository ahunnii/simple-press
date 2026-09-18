import Link from "next/link";

import type { SubscriptionsPageTemplateProps } from "../../types";
import { formatDate } from "~/lib/format-date";
import { formatPrice } from "~/lib/prices";
import { SUBSCRIPTION_STATUS_LABELS } from "~/lib/validators/subscription";

import { UmscButton } from "../shared/umsc-button";
import { UmscImageFallback } from "../shared/umsc-image-fallback";
import { UmscAccountLayout } from "./umsc-account-layout";
import { UmscOrderStatusBadge } from "./umsc-order-status-badge";

/** Next-delivery line for a subscription card — mirrors default/dream's own logic. */
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
  if (subscription.nextBillingAt)
    return `Next delivery ${formatDate(subscription.nextBillingAt)}`;
  return null;
}

export function UmscSubscriptionsPage({
  subscriptions,
}: SubscriptionsPageTemplateProps) {
  return (
    <UmscAccountLayout
      heading="Subscriptions"
      breadcrumb={[
        { label: "Home", href: "/" },
        { label: "Account", href: "/account/settings" },
        { label: "Subscriptions" },
      ]}
    >
      {subscriptions.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <div className="mb-6 size-16">
            <UmscImageFallback aspect="1 / 1" />
          </div>
          <h2 className="umsc-serif text-[22px] font-normal text-[var(--umsc-ink)]">
            You don&apos;t have any subscriptions yet
          </h2>
          <p className="umsc-sans mt-3 max-w-[36ch] text-[15px] leading-[1.6] text-[var(--umsc-muted)]">
            Subscribe to a product for recurring delivery and it will appear
            here.
          </p>
          <UmscButton
            as="link"
            href="/shop"
            variant="gold"
            showArrow={false}
            className="mt-7"
          >
            Browse products
          </UmscButton>
          <Link
            href="/subscriptions/manage"
            className="umsc-sans mt-5 text-[13px] text-[var(--umsc-muted)] underline underline-offset-[3px] hover:text-[var(--umsc-ink)]"
          >
            Subscribed without an account? Look up your subscription by email →
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {subscriptions.map((subscription) => {
            const nextDate = nextDateLabel(subscription);
            const label =
              SUBSCRIPTION_STATUS_LABELS[
                subscription.status as keyof typeof SUBSCRIPTION_STATUS_LABELS
              ] ?? subscription.status;
            return (
              <article
                key={subscription.id}
                className="border border-[var(--umsc-line)] bg-[var(--umsc-white)] p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="umsc-sans text-[15px] font-medium text-[var(--umsc-ink)]">
                        {subscription.productName}
                        {subscription.variantName
                          ? ` — ${subscription.variantName}`
                          : ""}
                      </p>
                      <UmscOrderStatusBadge
                        status={subscription.status}
                        label={label}
                      />
                    </div>
                    <p className="umsc-sans text-[13px] text-[var(--umsc-muted)]">
                      Qty {subscription.quantity} · {subscription.intervalLabel}
                      {nextDate ? ` · ${nextDate}` : ""}
                    </p>
                  </div>
                  <p className="umsc-tabular umsc-serif text-[20px] font-normal text-[var(--umsc-ink)]">
                    {formatPrice(subscription.perDeliveryCents)}
                    <span className="umsc-sans text-[13px] font-normal text-[var(--umsc-muted)]">
                      {" "}
                      / delivery
                    </span>
                  </p>
                </div>

                <div className="mt-4 border-t border-[var(--umsc-line)] pt-4">
                  <a
                    href={subscription.manageUrl}
                    className="umsc-sans text-[13px] font-semibold text-[var(--umsc-gold-ink)] hover:text-[var(--umsc-ink)]"
                  >
                    Manage →
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </UmscAccountLayout>
  );
}
