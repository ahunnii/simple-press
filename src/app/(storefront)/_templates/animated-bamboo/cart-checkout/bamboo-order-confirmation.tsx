"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { cn } from "~/lib/utils";
import { TrackPurchase } from "~/components/analytics/track-purchase";
import { useCart } from "~/providers/cart-context";

import { BambooEdge } from "../shared/bamboo-edge";
import { BambooGlyph } from "../shared/bamboo-glyph";
import { BambooReveal } from "../shared/bamboo-reveal";

type Props = {
  business: {
    id: string;
    name: string;
    siteContent: {
      primaryColor: string | null;
    } | null;
  };
};

// Order-details fetch is best-effort only — it must never block the
// "Order Confirmed!" heading. If it hangs or fails, the customer still
// paid and still needs to see confirmation, so we cap it with a timeout
// and treat any failure as "no extra details available" rather than an
// error state.
const DETAILS_FETCH_TIMEOUT_MS = 10_000;

/**
 * Perforated tear rule, same dash rhythm as `.bamboo-torn-card::before`.
 * Inline rather than a Tailwind arbitrary value because `color-mix()` must
 * never appear inside one (F1 build-report convention).
 */
const PERFORATION_RULE: React.CSSProperties = {
  backgroundImage:
    "repeating-linear-gradient(90deg, color-mix(in srgb, var(--bamboo-core-tan) 55%, transparent) 0 7px, transparent 7px 15px)",
};

/* The celebration scene: her 4-pack on a single gentle bob loop, with a sprig
   set beside it. Both use the shared `.bamboo-el` scene primitive (pop-in on
   load, contact shadow so nothing floats); `prefers-reduced-motion` kills the
   loop via the global rule in globals.css. */
const SCENE_PACK: React.CSSProperties = {
  "--l": "6%",
  "--t": "4%",
  "--w": "134px",
  "--d": "0.12s",
} as React.CSSProperties;

const SCENE_PACK_BOB: React.CSSProperties = {
  "--amp": "5px",
  "--dur": "5.6s",
} as React.CSSProperties;

const SCENE_SPRIG: React.CSSProperties = {
  "--l": "56%",
  "--t": "38%",
  "--w": "108px",
  "--d": "0.34s",
  "--rz": "-6deg",
} as React.CSSProperties;

const SCENE_SHADOW: React.CSSProperties = {
  "--sw": "80%",
  "--sh": "12%",
} as React.CSSProperties;

export function BambooOrderConfirmation({ business }: Props) {
  const searchParams = useSearchParams();
  const { clearCart } = useCart();
  const [orderDetails, setOrderDetails] = useState<{
    customer_email: string;
    amount_total: number;
    currency: string;
    payment_status: string;
  } | null>(null);
  // Gates only the order-details card (email/amount), never the
  // confirmation heading itself.
  const [detailsLoading, setDetailsLoading] = useState(true);
  const confirmedHeadingRef = useRef<HTMLHeadingElement>(null);

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

    // Fetch order details (best-effort; never blocks the confirmation UI)
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

  // M-4: Move focus to the "Order Confirmed!" heading as soon as it renders
  // (as soon as we know we have a valid session_id) — do not wait on the
  // order-details fetch, which is best-effort and may never resolve.
  useEffect(() => {
    if (sessionId) {
      confirmedHeadingRef.current?.focus();
    }
  }, [sessionId]);

  if (!sessionId) {
    return (
      <section className="mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center lg:px-8">
        <BambooReveal>
          <BambooGlyph
            id="s-sprig"
            className="mx-auto mb-6 w-[104px] opacity-90"
          />
          <p className="mb-7 text-[1.05rem] text-[var(--bamboo-ink-soft)]">
            No order found
          </p>
          <Link href="/shop" className={cn("bamboo-btn", "bamboo-btn-primary")}>
            Continue Shopping
          </Link>
        </BambooReveal>
      </section>
    );
  }

  return (
    <>
      {/* Fire purchase analytics event once — idempotent via sessionStorage */}
      {orderDetails && (
        <TrackPurchase
          sessionId={sessionId}
          amountCents={orderDetails.amount_total}
        />
      )}

      {/* ── Sage celebration band ── */}
      <section className="bg-[var(--bamboo-sage)] px-4 pt-14 pb-12 lg:px-8 lg:pt-20 lg:pb-16">
        <div className="mx-auto max-w-3xl text-center">
          <div className="relative mx-auto mb-8 h-[178px] w-[300px] max-w-full">
            <span className="bamboo-el" style={SCENE_PACK}>
              <span className="bamboo-bob" style={SCENE_PACK_BOB}>
                <BambooGlyph id="s-pack" />
              </span>
              <span className="bamboo-shd" style={SCENE_SHADOW} />
            </span>
            <span className="bamboo-el" style={SCENE_SPRIG}>
              <span className="bamboo-tilt">
                <BambooGlyph id="s-sprig" />
              </span>
            </span>
          </div>
          <h1
            ref={confirmedHeadingRef}
            tabIndex={-1}
            className="font-heading text-[clamp(2.3rem,5vw,3.6rem)] leading-[1.06] font-bold tracking-tight text-[var(--bamboo-pine)] outline-none"
          >
            Order Confirmed!
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[1.08rem] text-[var(--bamboo-ink-soft)]">
            Thank you for your purchase from {business.name}
          </p>
        </div>
      </section>

      <BambooEdge from="sage" to="paper" variant="a" />

      {/* ── Paper details ── */}
      <section className="mx-auto max-w-3xl px-4 pt-10 pb-20 lg:px-8 lg:pb-28">
        <BambooReveal>
          <div className="bamboo-torn-card">
            <div className="flex items-start gap-4">
              <BambooGlyph
                id="s-truck"
                className="mt-1 w-[46px] shrink-0 opacity-90"
              />
              <div className="flex-1">
                <h2 className="font-heading mb-3 text-xl font-semibold text-[var(--bamboo-pine)]">
                  What happens next?
                </h2>
                <ul className="flex flex-col gap-2 text-[var(--bamboo-ink-soft)]">
                  <li className="flex items-start gap-2">
                    <span
                      className="text-[var(--bamboo-terracotta-deep)]"
                      aria-hidden="true"
                    >
                      •
                    </span>
                    <span>
                      You&apos;ll receive an email confirmation shortly
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span
                      className="text-[var(--bamboo-terracotta-deep)]"
                      aria-hidden="true"
                    >
                      •
                    </span>
                    <span>We&apos;ll notify you when your order ships</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span
                      className="text-[var(--bamboo-terracotta-deep)]"
                      aria-hidden="true"
                    >
                      •
                    </span>
                    <span>Track your order status via email</span>
                  </li>
                </ul>
              </div>
            </div>

            {detailsLoading ? (
              <div className="mt-6 text-sm" role="status">
                <div
                  aria-hidden="true"
                  className="mb-6 h-[3px] rounded-sm"
                  style={PERFORATION_RULE}
                />
                <p className="animate-pulse text-[var(--bamboo-muted)]">
                  Loading confirmation details…
                </p>
              </div>
            ) : (
              orderDetails?.customer_email && (
                <div className="mt-6 text-sm">
                  <div
                    aria-hidden="true"
                    className="mb-6 h-[3px] rounded-sm"
                    style={PERFORATION_RULE}
                  />
                  <p className="text-[var(--bamboo-ink-soft)]">
                    Confirmation sent to:{" "}
                    <span className="font-semibold text-[var(--bamboo-pine)]">
                      {orderDetails.customer_email}
                    </span>
                  </p>
                </div>
              )
            )}
          </div>
        </BambooReveal>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/shop"
            className={cn(
              "bamboo-btn",
              "bamboo-btn-ghost",
              "flex-1 justify-center",
            )}
          >
            Continue Shopping
          </Link>
          <Link
            href="/"
            className={cn(
              "bamboo-btn",
              "bamboo-btn-primary",
              "flex-1 justify-center",
            )}
          >
            Back to Home
          </Link>
        </div>
      </section>
    </>
  );
}
