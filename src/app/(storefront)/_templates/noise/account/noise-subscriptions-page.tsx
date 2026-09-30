import Link from "next/link";
import { Repeat } from "lucide-react";

import type { SubscriptionsPageTemplateProps } from "../../types";
import { formatDate } from "~/lib/format-date";
import { fieldAttr } from "~/lib/preview/section-attrs";
import { formatPrice } from "~/lib/prices";
import { PageTransition } from "~/components/page-animations";
import { SUBSCRIPTION_STATUS_LABELS } from "~/lib/validators/subscription";

import { resolveNoiseCartCopy } from "../cart-checkout/noise-cart-copy";
import { NoiseAccountLayout } from "./noise-account-layout";

function statusStyle(status: string): React.CSSProperties {
  switch (status) {
    case "active":
      return { borderColor: "#16a34a", color: "#16a34a" };
    case "paused":
      return { borderColor: "#b45309", color: "#b45309" };
    case "past_due":
      return { borderColor: "#dc2626", color: "#dc2626" };
    case "cancelled":
    case "incomplete":
      return { color: "var(--vn-steel-mist)", borderColor: "var(--vn-rule)" };
    default:
      return {};
  }
}

/** Next-delivery line for a subscription card — mirrors umsc/olive/default's own logic. */
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

export function NoiseSubscriptionsPage({
  business,
  subscriptions,
}: SubscriptionsPageTemplateProps) {
  // The empty-state shop button shares the cart's empty-state button fields.
  const copy = resolveNoiseCartCopy(business.siteContent?.customFields);

  return (
    <PageTransition>
      <NoiseAccountLayout heading="Subscriptions">
        {subscriptions.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-6 py-20 text-center">
            <div
              className="border-foreground/20 flex items-center justify-center border-2"
              style={{ width: "64px", height: "64px" }}
            >
              <Repeat
                className="size-6"
                style={{ color: "var(--vn-steel-mist)" }}
              />
            </div>
            <div>
              <p
                className="font-serif leading-none italic"
                style={{ fontSize: "28px", letterSpacing: "-0.01em" }}
              >
                You don&apos;t have any subscriptions yet.
              </p>
              <p
                className="mt-2 font-sans text-sm"
                style={{ color: "var(--vn-steel-mist)" }}
              >
                Subscribe to a product for recurring delivery and it will
                appear here.
              </p>
            </div>
            {copy.emptyButtonText ? (
              <Link
                href={copy.emptyButtonLink}
                className="vn-stamp vn-stamp-solid text-[10px]"
              >
                <span {...fieldAttr("noise.global.cart-empty-button-text")}>
                  {copy.emptyButtonText}
                </span>{" "}
                →
              </Link>
            ) : null}
            <Link
              href="/subscriptions/manage"
              className="font-mono text-[9.5px] tracking-[0.14em] uppercase transition-opacity hover:opacity-60"
              style={{ color: "var(--vn-steel)" }}
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
                  className="border-foreground/15 border-b py-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex flex-wrap items-center gap-3">
                        <p
                          className="font-serif leading-none italic"
                          style={{ fontSize: "18px", letterSpacing: "-0.005em" }}
                        >
                          {subscription.productName}
                          {subscription.variantName
                            ? ` — ${subscription.variantName}`
                            : ""}
                        </p>
                        <span
                          className="vn-stamp text-[9px] whitespace-nowrap"
                          style={statusStyle(subscription.status)}
                        >
                          {label}
                        </span>
                      </div>
                      <p
                        className="font-mono text-[10px] tracking-[0.1em]"
                        style={{ color: "var(--vn-steel-mist)" }}
                      >
                        Qty {subscription.quantity} ·{" "}
                        {subscription.intervalLabel}
                        {nextDate ? ` · ${nextDate}` : ""}
                      </p>
                    </div>
                    <p
                      className="text-right font-serif leading-none italic"
                      style={{ fontSize: "20px", letterSpacing: "-0.01em" }}
                    >
                      {formatPrice(subscription.perDeliveryCents)}
                      <span
                        className="font-mono text-[10px] tracking-[0.06em] not-italic"
                        style={{ color: "var(--vn-steel-mist)" }}
                      >
                        {" "}
                        / delivery
                      </span>
                    </p>
                  </div>

                  <a
                    href={subscription.manageUrl}
                    className="mt-3 inline-flex font-mono text-[9.5px] tracking-[0.18em] uppercase transition-opacity hover:opacity-60"
                    style={{ color: "var(--vn-steel)" }}
                  >
                    Manage →
                  </a>
                </div>
              );
            })}
          </div>
        )}
      </NoiseAccountLayout>
    </PageTransition>
  );
}
