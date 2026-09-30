"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import type { Session } from "~/server/better-auth/config";
import { useHydratedSession } from "~/lib/auth/use-hydrated-session";
import { cn } from "~/lib/utils";
import { TrackPurchase } from "~/components/analytics/track-purchase";
import { useCart } from "~/providers/cart-context";
import { useStorefrontFlags } from "~/providers/feature-flags-context";

import { useViiReveal } from "../hooks/use-vii-reveal";
import { ViiOverline } from "../shared/vii-overline";

// ─── Types ────────────────────────────────────────────────────────────────────

type DeliveryMethod = "ship" | "pickup" | null;

type Business = {
  id: string;
  name: string;
  siteContent: {
    primaryColor: string | null;
  } | null;
  /** Owner-set in Settings → Shipping; used for the PF22 pickup next-steps block. */
  pickupLocation?: string | null;
  pickupInstructions?: string | null;
};

type OrderDetails = {
  customer_email: string;
  amount_total: number;
  currency: string;
  payment_status: string;
  delivery_method?: DeliveryMethod;
};

type Props = {
  business: Business;
  overline: string;
  thankYouHeading: string;
  thankYouAccent: string;
  /** Fallback next-steps copy used when the order's delivery method is unknown. */
  nextSteps: string;
  /** PF22: next-steps copy for orders shipped to the customer. */
  nextStepsShip: string;
  /** PF22: next-steps copy for in-store-pickup orders. */
  nextStepsPickup: string;
  continueCta: string;
  loadingText: string;
  noOrderHeading: string;
  noOrderBody: string;
  /**
   * Session resolved server-side by `vii-order-success-page.tsx`
   * (`getSession()`), seeding `useHydratedSession` so the PF23 account CTA
   * is correct on first paint instead of popping in after the client
   * session fetch settles. `undefined` (e.g. tests rendering this
   * component directly) falls back to the hook's unseeded mode, which
   * suppresses the CTA via `isPending` until the client session resolves —
   * never a flash of the wrong state either way.
   */
  initialSession?: Session | null;
};

type AccountCta = { href: string; label: string };

/**
 * PF23 / B9.4: signed in + `orders` on -> "View my orders"
 * (`/account/orders`); signed out + `customerAccounts` on -> "Create an
 * account" (`/auth/sign-up`); neither -> no CTA. Inline per the parity plan
 * (P-ORDER-CTA stays optional). See the `initialSession` doc above for why
 * this never flashes the wrong state.
 */
function useOrderAccountCta(
  initialSession: Session | null | undefined,
): AccountCta | null {
  const { data: session, isPending } = useHydratedSession(initialSession);
  const { isEnabled } = useStorefrontFlags();

  if (isPending) {
    return null;
  }

  if (session?.user) {
    return isEnabled("orders")
      ? { href: "/account/orders", label: "View my orders" }
      : null;
  }

  return isEnabled("customerAccounts")
    ? { href: "/auth/sign-up", label: "Create an account" }
    : null;
}

/**
 * PF22: picks the owner-authored next-steps copy for the order's
 * fulfilment method (`session.metadata.deliveryMethod` via
 * `/api/stripe/session`, bamboo pattern). Falls back to the generic
 * `nextSteps` copy when the method is unknown (no fresh Stripe session, or
 * an order placed before this metadata existed).
 */
function resolveNextSteps(
  deliveryMethod: DeliveryMethod | undefined,
  nextSteps: string,
  nextStepsShip: string,
  nextStepsPickup: string,
): string {
  if (deliveryMethod === "pickup" && nextStepsPickup.trim()) {
    return nextStepsPickup;
  }
  if (deliveryMethod === "ship" && nextStepsShip.trim()) {
    return nextStepsShip;
  }
  return nextSteps;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── CTA button (copper-deep fill, paper text) ────────────────────────────────

function ViiCtaButton({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="vii-cta-btn"
      style={{
        position: "relative",
        overflow: "hidden",
        display: "inline-block",
        background: "var(--vii-copper-deep)",
        color: "var(--vii-paper)",
        fontFamily: "var(--font-sans)",
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        textDecoration: "none",
        padding: "14px 32px",
        borderRadius: "var(--radius)",
        transition: "background 0.3s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.background =
          "var(--vii-copper)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.background =
          "var(--vii-copper-deep)";
      }}
    >
      {children}
    </Link>
  );
}

// ─── Quiet text link (paper underline on navy) ────────────────────────────────

function ViiNavyTextLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "inline-block",
        color: "var(--vii-paper)",
        fontFamily: "var(--font-sans)",
        fontSize: 13,
        fontWeight: 400,
        letterSpacing: "0.04em",
        textDecoration: "underline",
        textDecorationColor:
          "color-mix(in srgb, var(--vii-paper) 40%, transparent)",
        textUnderlineOffset: 3,
        opacity: 0.85,
        transition: "opacity 0.2s, text-decoration-color 0.2s",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLAnchorElement;
        el.style.opacity = "1";
        el.style.textDecorationColor =
          "color-mix(in srgb, var(--vii-paper) 80%, transparent)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLAnchorElement;
        el.style.opacity = "0.85";
        el.style.textDecorationColor =
          "color-mix(in srgb, var(--vii-paper) 40%, transparent)";
      }}
    >
      {children}
    </Link>
  );
}

// ─── Copper-light circle confirmation mark ────────────────────────────────────

function ViiConfirmMark({ pulse = false }: { pulse?: boolean }) {
  return (
    <span
      aria-hidden="true"
      data-vii-pulse=""
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 52,
        height: 52,
        borderRadius: "50%",
        border: "1.5px solid var(--vii-copper-light)",
        color: "var(--vii-copper-light)",
        fontFamily: "var(--font-serif)",
        fontStyle: "italic",
        fontSize: 26,
        fontWeight: 400,
        lineHeight: 1,
        flexShrink: 0,
        animation: pulse ? "vii-pulse 0.42s var(--vii-ease)" : undefined,
      }}
    >
      ✓
    </span>
  );
}

// ─── Main client component ────────────────────────────────────────────────────

export function ViiOrderConfirmation({
  business,
  overline,
  thankYouHeading,
  thankYouAccent,
  nextSteps,
  nextStepsShip,
  nextStepsPickup,
  continueCta,
  loadingText,
  noOrderHeading,
  noOrderBody,
  initialSession,
}: Props) {
  const searchParams = useSearchParams();
  const { clearCart } = useCart();
  const { ref, visible } = useViiReveal(0.05);
  const accountCta = useOrderAccountCta(initialSession);

  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);

  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }

    // Clear cart on successful order
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

  // ── Loading state ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          background: "var(--vii-cream)",
          padding:
            "clamp(128px, 12vh, 168px) clamp(24px, 6vw, 96px) clamp(64px, 8vh, 96px)",
        }}
      >
        <p
          role="status"
          aria-live="polite"
          style={{
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            fontSize: "clamp(18px, 2vw, 24px)",
            fontWeight: 400,
            color: "var(--vii-ink-soft)",
            margin: 0,
            letterSpacing: "0.01em",
          }}
        >
          {loadingText || "Confirming your order…"}
        </p>
      </div>
    );
  }

  // ── No-session state ──────────────────────────────────────────────────────

  if (!sessionId) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          background: "var(--vii-cream)",
          padding:
            "clamp(128px, 12vh, 168px) clamp(24px, 6vw, 96px) clamp(64px, 8vh, 96px)",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            fontFamily: "var(--font-serif)",
            fontWeight: 500,
            fontSize: "clamp(24px, 3vw, 36px)",
            lineHeight: 1.15,
            color: "var(--vii-navy)",
            margin: "0 0 16px",
          }}
        >
          {noOrderHeading || "No order found"}
        </h1>
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 15,
            lineHeight: 1.6,
            color: "var(--vii-ink-soft)",
            maxWidth: 480,
            margin: "0 0 32px",
            letterSpacing: "0.02em",
          }}
        >
          {noOrderBody ||
            "It looks like this page was opened without an active order. Head back to the shop to explore our collection."}
        </p>
        <ViiCtaButton href="/shop">
          {continueCta || "Continue Shopping"}
        </ViiCtaButton>
      </div>
    );
  }

  // ── Success state — deep-navy "room" ──────────────────────────────────────

  const deliveryMethod = orderDetails?.delivery_method ?? null;

  // PF22 — split the delivery-method-specific next-steps copy into lines.
  const nextStepsLines = (
    resolveNextSteps(deliveryMethod, nextSteps, nextStepsShip, nextStepsPickup) ||
    "You'll receive an email confirmation shortly.\nWe'll notify you as soon as your order ships.\nTrack your order status via your confirmation email."
  )
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const showPickupLocation =
    deliveryMethod === "pickup" && !!business.pickupLocation?.trim();

  const formattedTotal = orderDetails
    ? formatOrderTotal(orderDetails.amount_total, orderDetails.currency)
    : null;

  return (
    // Plain wrapper — the layout already provides <main id="main-content">.
    <div style={{ background: "var(--vii-navy)", minHeight: "100vh" }}>
      {/* Fire purchase analytics event once — idempotent via sessionStorage */}
      {orderDetails && (
        <TrackPurchase
          sessionId={sessionId}
          amountCents={orderDetails.amount_total}
        />
      )}

      {/* Navy confirmation room */}
      <section
        aria-labelledby="vii-order-heading"
        style={{
          background: "var(--vii-navy)",
          color: "var(--vii-paper)",
          padding:
            "clamp(144px, 14vh, 188px) clamp(24px, 6vw, 96px) clamp(72px, 10vh, 120px)",
        }}
      >
        <div
          ref={ref}
          className={cn("vii-reveal-group", visible && "is-visible")}
          style={{
            maxWidth: 720,
            margin: "0 auto",
            textAlign: "center",
          }}
        >
          {/* Copper-light circle mark */}
          <div
            className="vii-reveal-item"
            style={
              {
                display: "flex",
                justifyContent: "center",
                marginBottom: 32,
                "--i": 0,
              } as React.CSSProperties
            }
          >
            <ViiConfirmMark pulse={visible} />
          </div>

          {/* Overline — tone="dark": tan label + copper-light rule */}
          {overline && (
            <div
              className="vii-reveal-item"
              style={{ "--i": 1 } as React.CSSProperties}
            >
              <ViiOverline
                tone="dark"
                align="center"
                style={{ marginBottom: 24 }}
              >
                {overline}
              </ViiOverline>
            </div>
          )}

          {/* h1 — the one per-page heading; display serif + copper-light italic accent */}
          <h1
            id="vii-order-heading"
            className="vii-reveal-item"
            style={
              {
                fontFamily: "var(--font-serif)",
                fontWeight: 500,
                fontSize: "clamp(2rem, 5vw, 3.5rem)",
                lineHeight: 1.1,
                color: "var(--vii-paper)",
                margin: "0 0 12px",
                textWrap: "balance",
                "--i": 2,
              } as React.CSSProperties
            }
          >
            {thankYouHeading || "Thank"}
            {(thankYouHeading || "Thank") && (thankYouAccent || "you.")
              ? " "
              : ""}
            {(thankYouAccent || "you.") && (
              <em
                style={{
                  fontStyle: "italic",
                  color: "var(--vii-copper-light)",
                }}
              >
                {thankYouAccent || "you."}
              </em>
            )}
          </h1>

          {/* Business name */}
          <p
            className="vii-reveal-item"
            style={
              {
                fontFamily: "var(--font-sans)",
                fontSize: 14,
                fontWeight: 400,
                color: "var(--vii-tan)",
                letterSpacing: "0.08em",
                margin: "0 0 40px",
                textTransform: "uppercase",
                "--i": 3,
              } as React.CSSProperties
            }
          >
            {business.name}
          </p>

          {/* Divider hairline on navy */}
          <div
            aria-hidden="true"
            className="vii-reveal-item"
            style={
              {
                width: 48,
                height: 1,
                background: "var(--vii-copper-light)",
                margin: "0 auto 40px",
                opacity: 0.5,
                "--i": 4,
              } as React.CSSProperties
            }
          />

          {/* Order details — email + total */}
          {(orderDetails?.customer_email ?? formattedTotal) && (
            <div
              className="vii-reveal-item"
              style={
                {
                  marginBottom: 40,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  alignItems: "center",
                  "--i": 5,
                } as React.CSSProperties
              }
            >
              {orderDetails?.customer_email && (
                <p
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 14,
                    lineHeight: 1.6,
                    color: "var(--vii-paper)",
                    opacity: 0.85,
                    margin: 0,
                    letterSpacing: "0.02em",
                  }}
                >
                  Confirmation sent to{" "}
                  <strong style={{ fontWeight: 500, opacity: 1 }}>
                    {orderDetails.customer_email}
                  </strong>
                </p>
              )}
              {formattedTotal && (
                <p
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 14,
                    lineHeight: 1.6,
                    color: "var(--vii-paper)",
                    opacity: 0.85,
                    margin: 0,
                    letterSpacing: "0.02em",
                  }}
                >
                  Order total:{" "}
                  <strong style={{ fontWeight: 500, opacity: 1 }}>
                    {formattedTotal}
                  </strong>
                </p>
              )}
            </div>
          )}

          {/* What happens next */}
          {nextStepsLines.length > 0 && (
            <div
              className="vii-reveal-item"
              style={
                {
                  marginBottom: 48,
                  textAlign: "left",
                  display: "inline-block",
                  "--i": 6,
                } as React.CSSProperties
              }
            >
              <p
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 11,
                  fontWeight: 500,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "var(--vii-tan)",
                  margin: "0 0 14px",
                }}
              >
                What happens next
              </p>
              <ul
                role="list"
                style={{
                  listStyle: "none",
                  margin: 0,
                  padding: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                {nextStepsLines.map((line, i) => (
                  <li
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      fontFamily: "var(--font-sans)",
                      fontSize: 14,
                      lineHeight: 1.6,
                      color: "var(--vii-paper)",
                      opacity: 0.8,
                      letterSpacing: "0.02em",
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        color: "var(--vii-copper-light)",
                        flexShrink: 0,
                        marginTop: 2,
                        fontSize: 12,
                      }}
                    >
                      —
                    </span>
                    {line}
                  </li>
                ))}
              </ul>

              {/* PF22 — pickup location/instructions, owner-set in Settings → Shipping */}
              {showPickupLocation && (
                <div style={{ marginTop: 20 }}>
                  <p
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 12,
                      fontWeight: 500,
                      letterSpacing: "0.06em",
                      color: "var(--vii-paper)",
                      margin: "0 0 4px",
                    }}
                  >
                    Pickup location
                  </p>
                  <p
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 14,
                      lineHeight: 1.6,
                      color: "var(--vii-paper)",
                      opacity: 0.8,
                      margin: 0,
                      letterSpacing: "0.02em",
                      whiteSpace: "pre-line",
                    }}
                  >
                    {business.pickupLocation}
                  </p>
                  {business.pickupInstructions?.trim() && (
                    <p
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: 14,
                        lineHeight: 1.6,
                        color: "var(--vii-paper)",
                        opacity: 0.8,
                        margin: "4px 0 0",
                        letterSpacing: "0.02em",
                        whiteSpace: "pre-line",
                      }}
                    >
                      {business.pickupInstructions}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* CTAs */}
          <div
            className="vii-reveal-item"
            style={
              {
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 16,
                "--i": 7,
              } as React.CSSProperties
            }
          >
            <ViiCtaButton href="/shop">
              {continueCta || "Continue Shopping"}
            </ViiCtaButton>
            <ViiNavyTextLink href="/">Back to home</ViiNavyTextLink>
            {/* PF23 — account next step (View my orders / Create an account) */}
            {accountCta && (
              <ViiNavyTextLink href={accountCta.href}>
                {accountCta.label}
              </ViiNavyTextLink>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
