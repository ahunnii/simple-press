"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { formatCurrency } from "~/lib/utils";
import { TrackPurchase } from "~/components/analytics/track-purchase";
import { useCart } from "~/providers/cart-context";

type DeliveryMethod = "ship" | "pickup" | null;

type Business = {
  id: string;
  name: string;
  pickupLocation?: string | null;
  pickupInstructions?: string | null;
};

type Props = {
  business: Business;
  eyebrow: string;
  heading: string;
  body: string;
  buttonLabel: string;
  /** `elegant.checkout.success-note` — blank hides it. */
  note?: string;
};

// Order-details fetch is best-effort only — it must never block the
// confirmation heading. If it hangs or fails, the customer still paid and
// still needs to see confirmation, so it's capped with a timeout and any
// failure is treated as "no extra details available" rather than an error
// state — mirrors `bamboo-order-confirmation.tsx`.
const DETAILS_FETCH_TIMEOUT_MS = 10_000;

function nextStepsBullets(deliveryMethod: DeliveryMethod): string[] {
  if (deliveryMethod === "pickup") {
    return [
      "You'll receive an email confirmation shortly",
      "We'll let you know when your order is ready for pickup",
    ];
  }
  if (deliveryMethod === "ship") {
    return [
      "You'll receive an email confirmation shortly",
      "We'll notify you when your order ships",
      "Track your order status via email",
    ];
  }
  return [
    "You'll receive an email confirmation shortly",
    "We'll email you with updates about your order",
  ];
}

export function ElegantOrderConfirmation({
  business,
  eyebrow,
  heading,
  body,
  buttonLabel,
  note = "",
}: Props) {
  const searchParams = useSearchParams();
  const { clearCart } = useCart();
  const [orderDetails, setOrderDetails] = useState<{
    customer_email: string;
    amount_total: number;
    currency: string;
    payment_status: string;
    delivery_method: DeliveryMethod;
  } | null>(null);
  // Gates only the order-details card (email/amount), never the
  // confirmation heading itself.
  const [detailsLoading, setDetailsLoading] = useState(true);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    if (!sessionId) {
      setDetailsLoading(false);
      return;
    }

    // Clear cart on successful order
    clearCart();

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      DETAILS_FETCH_TIMEOUT_MS,
    );

    const fetchOrderDetails = async () => {
      try {
        const response = await fetch(
          `/api/stripe/session?session_id=${sessionId}`,
          { signal: controller.signal },
        );
        if (response.ok) {
          const data = (await response.json()) as {
            customer_email: string;
            amount_total: number;
            currency: string;
            payment_status: string;
            delivery_method: DeliveryMethod;
          };
          setOrderDetails(data);
        }
      } catch (error) {
        console.error("Failed to fetch order details:", error);
      } finally {
        clearTimeout(timeoutId);
        setDetailsLoading(false);
      }
    };

    void fetchOrderDetails();

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [sessionId, clearCart]);

  useEffect(() => {
    if (sessionId) {
      headingRef.current?.focus();
    }
  }, [sessionId]);

  if (!sessionId) {
    return (
      <div style={{ maxWidth: 640, margin: "0 auto", textAlign: "center" }}>
        <h1
          style={{
            fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)",
            fontWeight: 400,
            fontSize: "clamp(32px, 4vw, 48px)",
            color: "var(--el-ink, #1c1a17)",
            marginBottom: 16,
          }}
        >
          We couldn&apos;t find that order
        </h1>
        <p
          style={{
            fontSize: 16,
            color: "var(--el-ink-soft, #6b6659)",
            lineHeight: 1.65,
            marginBottom: 32,
            fontFamily: "var(--font-sans, sans-serif)",
          }}
        >
          This page needs an order to show. If you just checked out, check your
          email for a receipt.
        </p>
        <Link
          href="/shop"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            padding: "14px 26px",
            borderRadius: 999,
            fontSize: 13,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            fontWeight: 500,
            background: "var(--el-ink, #1c1a17)",
            color: "var(--el-paper, #fbf8f2)",
            textDecoration: "none",
            fontFamily: "var(--font-sans, sans-serif)",
          }}
        >
          Continue shopping
          <ArrowRight aria-hidden={true} style={{ width: 14, height: 14 }} />
        </Link>
      </div>
    );
  }

  const bullets = nextStepsBullets(orderDetails?.delivery_method ?? null);
  const showPickupLocation =
    orderDetails?.delivery_method === "pickup" &&
    !!business.pickupLocation?.trim();

  return (
    <div {...sectionGroupAttr("checkout", "success")}>
      {/* Fire purchase analytics event once — idempotent via sessionStorage */}
      {orderDetails && (
        <TrackPurchase
          sessionId={sessionId}
          amountCents={orderDetails.amount_total}
        />
      )}

      {/* Hero */}
      <section style={{ padding: "64px 40px 48px", textAlign: "center" }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 999,
              background: "var(--el-sage, #4a5240)",
              color: "var(--el-paper, #fbf8f2)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 28,
            }}
            aria-hidden={true}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m5 12 5 5L20 7" />
            </svg>
          </div>

          <span
            {...fieldAttr("elegant.checkout.success-eyebrow")}
            style={{
              fontFamily: "var(--font-mono, ui-monospace)",
              fontSize: 11,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "var(--el-ink-soft, #6b6659)",
              display: "block",
              marginBottom: 16,
            }}
          >
            {eyebrow}
          </span>

          <h1
            ref={headingRef}
            tabIndex={-1}
            {...fieldAttr("elegant.checkout.success-heading")}
            style={{
              fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)",
              fontWeight: 400,
              fontSize: "clamp(40px, 5.5vw, 72px)",
              lineHeight: 1.0,
              letterSpacing: "-0.01em",
              color: "var(--el-ink, #1c1a17)",
              marginBottom: 16,
              outline: "none",
            }}
          >
            {heading}
          </h1>

          {body ? (
            <p
              {...fieldAttr("elegant.checkout.success-body")}
              style={{
                fontSize: 17,
                color: "var(--el-ink-soft, #6b6659)",
                lineHeight: 1.65,
                fontFamily: "var(--font-sans, sans-serif)",
                whiteSpace: "pre-line",
              }}
            >
              {body}
            </p>
          ) : null}
        </div>
      </section>

      {/* Order details */}
      <section style={{ padding: "0 40px 80px" }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <div
            style={{
              background: "var(--el-paper, #fbf8f2)",
              border: "1px solid var(--el-line, rgba(28,26,23,0.12))",
              borderRadius: 8,
              padding: "28px 28px",
              marginBottom: 32,
            }}
          >
            <h2
              style={{
                fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)",
                fontWeight: 500,
                fontSize: 20,
                color: "var(--el-ink, #1c1a17)",
                marginBottom: 14,
              }}
            >
              What happens next?
            </h2>
            <ul
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                marginBottom: showPickupLocation || note.trim() ? 20 : 0,
              }}
            >
              {bullets.map((bullet) => (
                <li
                  key={bullet}
                  style={{
                    display: "flex",
                    gap: 8,
                    fontSize: 14,
                    color: "var(--el-ink-soft, #6b6659)",
                    fontFamily: "var(--font-sans, sans-serif)",
                    lineHeight: 1.5,
                  }}
                >
                  <span
                    aria-hidden={true}
                    style={{ color: "var(--el-sage, #4a5240)" }}
                  >
                    •
                  </span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>

            {showPickupLocation && (
              <div
                style={{
                  marginBottom: note.trim() ? 20 : 0,
                  fontSize: 13,
                  fontFamily: "var(--font-sans, sans-serif)",
                }}
              >
                <p
                  style={{
                    fontFamily: "var(--font-mono, ui-monospace)",
                    fontSize: 11,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "var(--el-ink, #1c1a17)",
                    marginBottom: 4,
                  }}
                >
                  Pickup location
                </p>
                <p
                  style={{
                    color: "var(--el-ink-soft, #6b6659)",
                    whiteSpace: "pre-line",
                    margin: 0,
                  }}
                >
                  {business.pickupLocation}
                </p>
                {business.pickupInstructions?.trim() && (
                  <p
                    style={{
                      color: "var(--el-ink-soft, #6b6659)",
                      whiteSpace: "pre-line",
                      marginTop: 4,
                    }}
                  >
                    {business.pickupInstructions}
                  </p>
                )}
              </div>
            )}

            {note.trim() && (
              <p
                {...fieldAttr("elegant.checkout.success-note")}
                style={{
                  fontSize: 13,
                  color: "var(--el-ink-soft, #6b6659)",
                  fontFamily: "var(--font-sans, sans-serif)",
                  whiteSpace: "pre-line",
                  margin: 0,
                }}
              >
                {note}
              </p>
            )}

            {detailsLoading ? (
              <p
                role="status"
                style={{
                  marginTop: 20,
                  paddingTop: 20,
                  borderTop: "1px solid var(--el-line, rgba(28,26,23,0.12))",
                  textAlign: "center",
                  fontFamily: "var(--font-mono, ui-monospace)",
                  fontSize: 11,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "var(--el-ink-soft, #6b6659)",
                }}
              >
                Loading order details…
              </p>
            ) : (
              orderDetails &&
              (orderDetails.customer_email ||
                typeof orderDetails.amount_total === "number") && (
                <div
                  style={{
                    marginTop: 20,
                    paddingTop: 20,
                    borderTop: "1px solid var(--el-line, rgba(28,26,23,0.12))",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    fontSize: 13,
                    fontFamily: "var(--font-sans, sans-serif)",
                    color: "var(--el-ink-soft, #6b6659)",
                  }}
                >
                  {typeof orderDetails.amount_total === "number" && (
                    <p style={{ margin: 0 }}>
                      Order total:{" "}
                      <span
                        style={{
                          color: "var(--el-ink, #1c1a17)",
                          fontWeight: 500,
                        }}
                      >
                        {formatCurrency(
                          orderDetails.amount_total,
                          (orderDetails.currency || "usd").toUpperCase(),
                        )}
                      </span>
                    </p>
                  )}
                  {orderDetails.customer_email && (
                    <p style={{ margin: 0 }}>
                      Confirmation sent to:{" "}
                      <span
                        style={{
                          color: "var(--el-ink, #1c1a17)",
                          fontWeight: 500,
                        }}
                      >
                        {orderDetails.customer_email}
                      </span>
                    </p>
                  )}
                </div>
              )
            )}
          </div>

          <div style={{ textAlign: "center" }}>
            <Link
              href="/shop"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                padding: "14px 26px",
                borderRadius: 999,
                fontSize: 13,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                fontWeight: 500,
                background: "var(--el-ink, #1c1a17)",
                color: "var(--el-paper, #fbf8f2)",
                textDecoration: "none",
                fontFamily: "var(--font-sans, sans-serif)",
              }}
            >
              <span {...fieldAttr("elegant.checkout.success-button")}>
                {buttonLabel}
              </span>
              <ArrowRight
                aria-hidden={true}
                style={{ width: 14, height: 14 }}
              />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
