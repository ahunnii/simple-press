"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { TrackPurchase } from "~/components/analytics/track-purchase";
import { useCart } from "~/providers/cart-context";

import {
  OliveButton,
  OliveLeafMark,
  OliveReveal,
  OliveSection,
  OliveStatusBadge,
} from "../shared";

/** What `/api/stripe/session` answers with. */
type OrderDetails = {
  customer_email: string;
  amount_total: number;
  currency: string;
  payment_status: string;
};

type Props = {
  heading: string;
  body: string;
  nextHeading: string;
  nextSteps: string;
  continueLabel: string;
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
    // An unrecognised currency code from Stripe must never blank the page.
    return `$${(amountCents / 100).toFixed(2)}`;
  }
}

/**
 * Order confirmation — design.md → "checkout.success".
 *
 * Reads the Stripe session id from the query string (never a cookie), clears
 * the bag once, and fetches the order back so the shopper sees the address
 * the receipt went to and what they paid. Three states: confirming, no order
 * attached, and the confirmation card itself.
 */
export function OliveOrderConfirmation({
  heading,
  body,
  nextHeading,
  nextSteps,
  continueLabel,
  loadingText,
  noOrderHeading,
  noOrderBody,
}: Props) {
  const searchParams = useSearchParams();
  const { clearCart } = useCart();

  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const clearedRef = useRef(false);

  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }

    // Once, and only once: a re-render must not wipe a bag the shopper has
    // started refilling in another tab.
    if (!clearedRef.current) {
      clearedRef.current = true;
      clearCart();
    }

    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch(
          `/api/stripe/session?session_id=${encodeURIComponent(sessionId)}`,
        );
        if (response.ok && !cancelled) {
          setOrderDetails((await response.json()) as OrderDetails);
        }
      } catch {
        // The order exists either way — the receipt email is the record.
        // Fall through to the confirmation without the details block.
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
    // `clearCart` is intentionally excluded — the ref above makes it one-shot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // ── Confirming ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <OliveSection
        bleed
        tone="paper"
        {...sectionGroupAttr("checkout", "success")}
      >
        <div className="mx-auto flex w-full max-w-[36rem] flex-col items-center gap-4 text-center">
          <span
            className="flex animate-pulse items-center motion-reduce:animate-none"
            style={{ color: "var(--olive-leaf)" }}
          >
            <OliveLeafMark size={24} />
          </span>
          <p role="status" aria-live="polite" className="olive-h3">
            {loadingText}
          </p>
        </div>
      </OliveSection>
    );
  }

  // ── Opened without an order ───────────────────────────────────────────────
  if (!sessionId) {
    return (
      <OliveSection
        bleed
        tone="paper"
        aria-labelledby="olive-order-heading"
        {...sectionGroupAttr("checkout", "success")}
      >
        <OliveReveal className="mx-auto w-full max-w-[36rem]">
          <div className="olive-ghost-card">
            <span
              className="flex items-center"
              style={{ color: "var(--olive-leaf)" }}
            >
              <OliveLeafMark size={22} />
            </span>
            <h1
              id="olive-order-heading"
              className="olive-h1"
              {...fieldAttr("olive.checkout.success-no-order-heading")}
            >
              {noOrderHeading}
            </h1>
            {noOrderBody ? (
              <p
                className="max-w-[46ch] text-[0.9375rem] leading-relaxed"
                style={{ color: "var(--olive-ink-soft)" }}
                {...fieldAttr("olive.checkout.success-no-order-body")}
              >
                {noOrderBody}
              </p>
            ) : null}
            <OliveButton
              variant="secondary"
              href="/shop"
              className="mt-1"
              data-sp-field="olive.checkout.success-continue-label"
            >
              {continueLabel}
            </OliveButton>
          </div>
        </OliveReveal>
      </OliveSection>
    );
  }

  // ── Confirmed ─────────────────────────────────────────────────────────────
  const steps = nextSteps
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const total = orderDetails
    ? formatOrderTotal(orderDetails.amount_total, orderDetails.currency)
    : null;

  return (
    <OliveSection
      bleed
      tone="paper"
      aria-labelledby="olive-order-heading"
      {...sectionGroupAttr("checkout", "success")}
    >
      {orderDetails ? (
        <TrackPurchase
          sessionId={sessionId}
          amountCents={orderDetails.amount_total}
        />
      ) : null}

      <OliveReveal className="mx-auto w-full max-w-[40rem]">
        <div className="olive-card flex flex-col gap-7 p-6 sm:p-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span
              className="flex items-center"
              style={{ color: "var(--olive-leaf)" }}
            >
              <OliveLeafMark size={24} />
            </span>
            {orderDetails?.payment_status === "paid" ? (
              // `active` is the sage-bright chip in the badge's colour map —
              // design.md asks for a sage chip here, and `label` carries the
              // word the shopper actually needs to read.
              <OliveStatusBadge status="active" label="Paid" />
            ) : null}
          </div>

          <div className="flex flex-col gap-3">
            <h1
              id="olive-order-heading"
              className="olive-display"
              {...fieldAttr("olive.checkout.success-heading")}
            >
              {heading}
            </h1>
            {body ? (
              <p
                className="max-w-[52ch] text-[1rem] leading-relaxed"
                style={{ color: "var(--olive-ink-soft)" }}
                {...fieldAttr("olive.checkout.success-body")}
              >
                {body}
              </p>
            ) : null}
          </div>

          {orderDetails ? (
            <dl className="flex flex-col">
              {orderDetails.customer_email ? (
                <div
                  className="flex flex-wrap items-baseline justify-between gap-3 py-3"
                  style={{ borderTop: "1px solid var(--olive-hairline)" }}
                >
                  <dt className="olive-label">Receipt sent to</dt>
                  <dd className="olive-price break-all">
                    {orderDetails.customer_email}
                  </dd>
                </div>
              ) : null}
              {total ? (
                <div
                  className="flex flex-wrap items-baseline justify-between gap-3 py-3"
                  style={{ borderTop: "1px solid var(--olive-hairline)" }}
                >
                  <dt className="olive-label">Order total</dt>
                  <dd className="olive-price">{total}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}

          {steps.length > 0 ? (
            <section
              aria-labelledby="olive-order-next-heading"
              className="flex flex-col gap-3"
            >
              <h2
                id="olive-order-next-heading"
                className="olive-label"
                {...fieldAttr("olive.checkout.success-next-heading")}
              >
                {nextHeading}
              </h2>
              <ol className="flex flex-col">
                {steps.map((step, i) => (
                  <li
                    key={step}
                    className="py-3 text-[0.9375rem] leading-relaxed"
                    style={
                      i === 0
                        ? undefined
                        : { borderTop: "1px solid var(--olive-hairline)" }
                    }
                  >
                    {step}
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          <div className="flex flex-wrap items-center gap-4">
            <OliveButton
              variant="primary"
              href="/shop"
              data-sp-field="olive.checkout.success-continue-label"
            >
              {continueLabel}
            </OliveButton>
            <OliveButton variant="ghost" href="/">
              Back to home
            </OliveButton>
          </div>
        </div>
      </OliveReveal>
    </OliveSection>
  );
}
