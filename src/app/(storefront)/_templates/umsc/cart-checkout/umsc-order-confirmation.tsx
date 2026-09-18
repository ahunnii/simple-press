"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check } from "lucide-react";

import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { TrackPurchase } from "~/components/analytics/track-purchase";
import { useCart } from "~/providers/cart-context";

import { UmscButton } from "../shared/umsc-button";

type OrderDetails = {
  customer_email: string;
  amount_total: number;
  currency: string;
  payment_status: string;
};

type Props = {
  businessName: string;
  thankYouHeading: string;
  nextSteps: string;
  continueCta: string;
  loadingText: string;
  noOrderHeading: string;
  noOrderBody: string;
};

function formatOrderTotal(amountCents: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amountCents / 100);
  } catch {
    return `$${(amountCents / 100).toFixed(2)}`;
  }
}

export function UmscOrderConfirmation({
  businessName,
  thankYouHeading,
  nextSteps,
  continueCta,
  loadingText,
  noOrderHeading,
  noOrderBody,
}: Props) {
  const searchParams = useSearchParams();
  const { clearCart } = useCart();

  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);

  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }

    clearCart();

    const fetchOrderDetails = async () => {
      try {
        const response = await fetch(
          `/api/stripe/session?session_id=${sessionId}`,
        );
        if (response.ok) {
          const data = (await response.json()) as OrderDetails;
          setOrderDetails(data);
        }
      } catch (error) {
        console.error("Failed to fetch order details:", error);
      } finally {
        setLoading(false);
      }
    };

    void fetchOrderDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[var(--umsc-paper)] px-6 py-24 sm:px-8">
        <p
          role="status"
          aria-live="polite"
          {...fieldAttr("umsc.order.loading-text")}
          className="umsc-serif text-[clamp(18px,2vw,24px)] font-normal text-[var(--umsc-muted)]"
        >
          {loadingText || "Confirming your order…"}
        </p>
      </div>
    );
  }

  // ── No session ───────────────────────────────────────────────────────────────
  if (!sessionId) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center bg-[var(--umsc-paper)] px-6 py-24 text-center sm:px-8">
        <h1
          {...fieldAttr("umsc.order.no-order-heading")}
          className="umsc-serif text-[clamp(24px,3vw,36px)] font-normal text-[var(--umsc-ink)]"
        >
          {noOrderHeading || "No order found"}
        </h1>
        <p
          {...fieldAttr("umsc.order.no-order-body")}
          className="umsc-sans mt-4 max-w-[46ch] text-[15px] leading-[1.6] text-[var(--umsc-muted)]"
        >
          {noOrderBody}
        </p>
        <UmscButton
          as="link"
          href="/shop"
          variant="gold"
          showArrow={false}
          fieldKey="umsc.order.continue-cta"
          className="mt-8"
        >
          {continueCta || "Continue Shopping"}
        </UmscButton>
      </div>
    );
  }

  // ── Success — black band ────────────────────────────────────────────────────
  const nextStepsLines = nextSteps
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const formattedTotal = orderDetails
    ? formatOrderTotal(orderDetails.amount_total, orderDetails.currency)
    : null;

  return (
    <div className="bg-[var(--umsc-black)]">
      {orderDetails && (
        <TrackPurchase
          sessionId={sessionId}
          amountCents={orderDetails.amount_total}
        />
      )}

      <section
        aria-labelledby="umsc-order-heading"
        {...sectionGroupAttr("order", "main")}
        className="px-6 py-24 sm:px-8 sm:py-28"
      >
        <div className="mx-auto max-w-[640px] text-center">
          <span
            aria-hidden="true"
            className="mx-auto mb-8 flex size-14 items-center justify-center rounded-full border border-[var(--umsc-gold)] text-[var(--umsc-gold-soft)]"
          >
            <Check className="size-6" aria-hidden="true" />
          </span>

          <h1
            id="umsc-order-heading"
            {...fieldAttr("umsc.order.thank-you-heading")}
            className="umsc-serif text-[clamp(32px,5vw,56px)] font-normal text-[var(--umsc-cream-on-black)]"
          >
            {thankYouHeading}
          </h1>

          <p className="umsc-sans mt-2 text-[13px] font-medium tracking-[0.1em] text-[var(--umsc-gold-soft)] uppercase">
            {businessName}
          </p>

          <div
            aria-hidden="true"
            className="mx-auto my-8 h-px w-12 bg-[var(--umsc-line-gold)]"
          />

          {(orderDetails?.customer_email ?? formattedTotal) && (
            <div className="mb-8 flex flex-col items-center gap-2">
              {orderDetails?.customer_email && (
                <p className="umsc-sans text-[14px] leading-[1.6] text-[var(--umsc-cream-on-black)]">
                  Confirmation sent to{" "}
                  <strong className="font-semibold">
                    {orderDetails.customer_email}
                  </strong>
                </p>
              )}
              {formattedTotal && (
                <p className="umsc-tabular umsc-sans text-[14px] leading-[1.6] text-[var(--umsc-cream-on-black)]">
                  Order total:{" "}
                  <strong className="font-semibold">{formattedTotal}</strong>
                </p>
              )}
            </div>
          )}

          {nextStepsLines.length > 0 && (
            <div className="mb-10 inline-block text-left">
              <p className="umsc-sans mb-3.5 text-[11px] font-semibold tracking-[0.16em] text-[var(--umsc-gold-soft)] uppercase">
                What happens next
              </p>
              <ul role="list" className="m-0 flex flex-col gap-2.5 p-0">
                {nextStepsLines.map((line, i) => (
                  <li
                    key={i}
                    className="umsc-sans flex items-start gap-2.5 text-[14px] leading-[1.6] text-[var(--umsc-cream-on-black)]"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-0.5 shrink-0 text-[12px] text-[var(--umsc-gold-soft)]"
                    >
                      —
                    </span>
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-col items-center gap-4">
            <UmscButton
              as="link"
              href="/shop"
              variant="gold"
              showArrow={false}
              fieldKey="umsc.order.continue-cta"
            >
              {continueCta || "Continue Shopping"}
            </UmscButton>
            <UmscButton
              as="link"
              href="/"
              variant="link"
              className="!text-[var(--umsc-gold-soft)]"
            >
              Back to home
            </UmscButton>
          </div>
        </div>
      </section>
    </div>
  );
}
