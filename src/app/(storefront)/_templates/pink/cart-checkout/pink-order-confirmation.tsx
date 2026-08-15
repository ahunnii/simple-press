"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import type { CartItem } from "~/providers/cart-context";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { formatPrice } from "~/lib/prices";
import { TrackPurchase } from "~/components/analytics/track-purchase";
import { useCart } from "~/providers/cart-context";

import { PinkCtaPanel } from "../shared/pink-cta-panel";
import { PinkFactRows } from "../shared/pink-fact-rows";

type OrderDetails = {
  customer_email: string | null;
  amount_total: number | null;
  currency: string;
  payment_status: string;
};

type Props = {
  heading: string;
  headingAccent: string;
  body: string;
  itemsHeading: string;
  summaryHeading: string;
  nextStepsLabel: string;
  nextSteps: string;
  continueCta: string;
  loadingText: string;
  noOrderHeading: string;
  noOrderBody: string;
  noOrderCta: string;
  ctaHeading: string;
  ctaBody: string;
  ctaButton: string;
  ctaLink: string;
  ctaSecondaryLabel: string;
  ctaSecondaryLink: string;
};

function formatOrderTotal(amountCents: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amountCents / 100);
  } catch {
    return formatPrice(amountCents);
  }
}

function titleCasePaymentStatus(status: string): string {
  return status.length === 0
    ? "Paid"
    : status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ");
}

/**
 * Client half of the order-success page. Reads `session_id` from the URL
 * (never a cookie), fetches `/api/stripe/session` for the confirmed total,
 * and clears the cart — but takes a snapshot of the shopper's own cart items
 * FIRST (still in `useCart()` state at this point, since the browser just
 * returned from Stripe) so "What you ordered" can show real line items even
 * though the session endpoint itself returns only email/total/status.
 */
export function PinkOrderConfirmation({
  heading,
  headingAccent,
  body,
  itemsHeading,
  summaryHeading,
  nextStepsLabel,
  nextSteps,
  continueCta,
  loadingText,
  noOrderHeading,
  noOrderBody,
  noOrderCta,
  ctaHeading,
  ctaBody,
  ctaButton,
  ctaLink,
  ctaSecondaryLabel,
  ctaSecondaryLink,
}: Props) {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const { items, clearCart, isHydrated } = useCart();

  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [loadingOrder, setLoadingOrder] = useState(true);
  const [orderedItems, setOrderedItems] = useState<CartItem[] | null>(null);
  const snapshotTaken = useRef(false);

  // Snapshot the cart before clearing it — the only place real line items
  // are available for this page (see file doc comment above).
  useEffect(() => {
    if (!sessionId || !isHydrated || snapshotTaken.current) return;
    snapshotTaken.current = true;
    setOrderedItems(items);
    clearCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, isHydrated]);

  useEffect(() => {
    if (!sessionId) {
      setLoadingOrder(false);
      return;
    }

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
        setLoadingOrder(false);
      }
    };

    void fetchOrderDetails();
  }, [sessionId]);

  // ── Loading ────────────────────────────────────────────────────────────
  if (loadingOrder) {
    return (
      <div
        className="flex min-h-[60vh] items-center justify-center px-5 py-24 md:px-10"
        style={{ background: "var(--pink-paper)" }}
      >
        <p
          role="status"
          aria-live="polite"
          className="text-[16px]"
          style={{ color: "var(--pink-subtle)" }}
        >
          {loadingText}
        </p>
      </div>
    );
  }

  // ── No session ─────────────────────────────────────────────────────────
  if (!sessionId) {
    return (
      <div
        className="flex min-h-[60vh] flex-col items-center justify-center gap-5 px-5 py-24 text-center md:px-10"
        style={{ background: "var(--pink-paper)" }}
      >
        <h1
          className="pink-display max-w-[20ch] text-[clamp(1.75rem,3.4vw,2.625rem)] leading-[1.1] tracking-[-0.02em]"
          {...fieldAttr("pink.order.no-order-heading")}
        >
          {noOrderHeading}
        </h1>
        <p
          className="max-w-[46ch] text-[16px] leading-[1.7]"
          style={{ color: "var(--pink-muted)" }}
          {...fieldAttr("pink.order.no-order-body")}
        >
          {noOrderBody}
        </p>
        <Link
          href="/shop"
          className="pink-btn pink-btn-solid mt-2"
          {...fieldAttr("pink.order.no-order-cta")}
        >
          {noOrderCta}
        </Link>
      </div>
    );
  }

  // ── Success ────────────────────────────────────────────────────────────
  const nextStepsLines = nextSteps
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const email = orderDetails?.customer_email ?? null;
  const total =
    orderDetails?.amount_total != null
      ? formatOrderTotal(
          orderDetails.amount_total,
          orderDetails.currency || "usd",
        )
      : null;
  const paymentStatus = orderDetails
    ? titleCasePaymentStatus(orderDetails.payment_status)
    : null;

  const factRows = [
    ...(total ? [{ label: "Order total", value: total }] : []),
    ...(email ? [{ label: "Confirmation sent to", value: email }] : []),
    ...(paymentStatus
      ? [{ label: "Payment status", value: paymentStatus }]
      : []),
  ];

  return (
    <div
      style={{ background: "var(--pink-paper)" }}
      {...sectionGroupAttr("checkout", "success")}
    >
      {orderDetails?.amount_total != null && (
        <TrackPurchase
          sessionId={sessionId}
          amountCents={orderDetails.amount_total}
        />
      )}

      {/* Confirmation header — ink, mirrors PinkPageHeader's proportions but
          supports the two-tone "Thank / you." heading design.md calls for. */}
      <header
        className="px-5 py-16 md:px-10 md:py-20"
        style={{ background: "var(--pink-ink)", color: "var(--pink-paper)" }}
      >
        <div className="mx-auto flex max-w-[1400px] flex-col gap-4">
          <h1 className="pink-display max-w-[16ch] text-[clamp(2.125rem,4.6vw,3.875rem)] leading-[1.02] tracking-[-0.03em]">
            <span {...fieldAttr("pink.order.heading")}>{heading}</span>{" "}
            <span
              style={{ color: "var(--pink-blush)" }}
              {...fieldAttr("pink.order.heading-accent")}
            >
              {headingAccent}
            </span>
          </h1>
          {body && (
            <p
              className="max-w-[46ch] text-[17px] leading-[1.7]"
              style={{ color: "var(--pink-ink-body)" }}
              {...fieldAttr("pink.order.body")}
            >
              {body}
            </p>
          )}
        </div>
      </header>

      {/* Item list + ink summary panel */}
      <div className="mx-auto max-w-[1400px] px-5 py-16 md:px-10 md:py-20">
        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[1.15fr_.85fr]">
          {/* Items — order-2 on mobile so the summary panel shows first */}
          <div className="order-2 flex flex-col gap-1 lg:order-1">
            <h2
              className="pink-display mb-4"
              style={{ fontSize: 20, fontWeight: 600 }}
              {...fieldAttr("pink.order.items-heading")}
            >
              {itemsHeading}
            </h2>
            {orderedItems && orderedItems.length > 0 ? (
              orderedItems.map((item, index) => (
                <div
                  key={`${item.productId}-${item.variantId ?? "no-variant"}`}
                  className="flex items-center justify-between gap-4 py-4"
                  style={{
                    borderTop:
                      index === 0
                        ? "1px solid var(--pink-ink)"
                        : "1px solid var(--pink-line)",
                  }}
                >
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-medium">
                      {item.productName}
                    </p>
                    <p
                      className="text-[13px]"
                      style={{ color: "var(--pink-subtle)" }}
                    >
                      {item.variantName ? `${item.variantName} · ` : ""}Qty{" "}
                      {item.quantity}
                    </p>
                  </div>
                  <span
                    className="pink-display shrink-0"
                    style={{ fontSize: 15, fontWeight: 600 }}
                  >
                    {formatPrice(item.price * item.quantity)}
                  </span>
                </div>
              ))
            ) : (
              <p
                className="py-4 text-[14px]"
                style={{
                  borderTop: "1px solid var(--pink-ink)",
                  color: "var(--pink-subtle)",
                }}
              >
                Your receipt is on its way by email.
              </p>
            )}
          </div>

          {/* Ink summary panel */}
          <aside
            aria-label="Order summary"
            className="order-1 lg:sticky lg:order-2"
            style={{ top: "var(--pink-sticky-top)" }}
          >
            <div
              className="pink-dark flex flex-col gap-6"
              style={{ background: "var(--pink-ink)" }}
            >
              <div className="flex flex-col gap-4 p-7 md:p-8">
                <span
                  className="pink-display"
                  style={{
                    fontSize: 18,
                    fontWeight: 600,
                    color: "var(--pink-paper)",
                  }}
                  {...fieldAttr("pink.order.summary-heading")}
                >
                  {summaryHeading}
                </span>
              </div>
              {factRows.length > 0 && <PinkFactRows rows={factRows} />}
              {nextStepsLines.length > 0 && (
                <div className="flex flex-col gap-3 p-7 pt-0 md:p-8 md:pt-0">
                  <p
                    className="pink-label-dark"
                    {...fieldAttr("pink.checkout.next-steps-label")}
                  >
                    {nextStepsLabel}
                  </p>
                  <ul className="flex flex-col gap-2.5">
                    {nextStepsLines.map((line, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2.5 text-[14px] leading-[1.6]"
                        style={{ color: "var(--pink-ink-body)" }}
                      >
                        <span
                          aria-hidden="true"
                          style={{ color: "var(--pink-blush)" }}
                        >
                          —
                        </span>
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="p-7 pt-0 md:p-8 md:pt-0">
                <Link
                  href="/shop"
                  className="pink-btn pink-btn-solid w-full justify-center"
                  {...fieldAttr("pink.order.continue-cta")}
                >
                  {continueCta}
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Closing CTA */}
      <div className="mx-auto max-w-[1400px] px-5 pb-20 md:px-10 md:pb-28">
        <PinkCtaPanel
          heading={ctaHeading}
          headingFieldKey="pink.order.cta-heading"
          body={ctaBody}
          bodyFieldKey="pink.order.cta-body"
          primaryCta={
            ctaButton ? { label: ctaButton, href: ctaLink } : undefined
          }
          secondaryCta={
            ctaSecondaryLabel
              ? { label: ctaSecondaryLabel, href: ctaSecondaryLink }
              : undefined
          }
        />
      </div>
    </div>
  );
}
