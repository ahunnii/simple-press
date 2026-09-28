"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import type { Session } from "~/server/better-auth/config";
import { useHydratedSession } from "~/lib/auth/use-hydrated-session";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { TrackPurchase } from "~/components/analytics/track-purchase";
import { useCart } from "~/providers/cart-context";
import { useStorefrontFlags } from "~/providers/feature-flags-context";

import {
  OliveButton,
  OliveLeafMark,
  OliveReveal,
  OliveSection,
  OliveStatusBadge,
} from "../shared";

/** `session.metadata.deliveryMethod`, echoed back by `/api/stripe/session`. */
type DeliveryMethod = "ship" | "pickup" | null;

/** What `/api/stripe/session` answers with. */
type OrderDetails = {
  customer_email: string;
  amount_total: number;
  currency: string;
  payment_status: string;
  delivery_method?: DeliveryMethod;
};

/** Just enough of `business` for the PF17 pickup-location block. */
type Business = {
  /** Owner-set in Settings → Shipping. */
  pickupLocation?: string | null;
  pickupInstructions?: string | null;
};

type Props = {
  business: Business;
  heading: string;
  body: string;
  nextHeading: string;
  nextSteps: string;
  /** PF17: next-steps copy shown instead of `nextSteps` for pickup orders. */
  nextStepsPickup: string;
  continueLabel: string;
  loadingText: string;
  noOrderHeading: string;
  noOrderBody: string;
  /**
   * Session resolved server-side by `olive-order-success-page.tsx`
   * (`getSession()`), seeding `useHydratedSession` so the PF18 account CTA
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
 * PF18 / B9.4: signed in + `orders` on -> "View my orders"
 * (`/account/orders`); signed out + `customerAccounts` on -> "Create an
 * account" (`/auth/sign-up`); neither -> no CTA. Copied locally per the
 * parity plan (P-ORDER-CTA stays optional; vii/pollen/bamboo/happy-bamboo
 * each carry their own copy too). See the `initialSession` doc above for
 * why this never flashes the wrong state.
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
 * PF17: picks the pickup-specific next-steps copy when the order was
 * placed for in-store pickup and the owner has written it; every other
 * case (shipped, or the delivery method is unknown — no fresh Stripe
 * session, or an order placed before this metadata existed) falls back to
 * the general list.
 */
function resolveNextSteps(
  deliveryMethod: DeliveryMethod | undefined,
  nextSteps: string,
  nextStepsPickup: string,
): string {
  if (deliveryMethod === "pickup" && nextStepsPickup.trim()) {
    return nextStepsPickup;
  }
  return nextSteps;
}

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
  business,
  heading,
  body,
  nextHeading,
  nextSteps,
  nextStepsPickup,
  continueLabel,
  loadingText,
  noOrderHeading,
  noOrderBody,
  initialSession,
}: Props) {
  const searchParams = useSearchParams();
  const { clearCart } = useCart();
  const accountCta = useOrderAccountCta(initialSession);

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
  const deliveryMethod = orderDetails?.delivery_method ?? null;

  const steps = resolveNextSteps(deliveryMethod, nextSteps, nextStepsPickup)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  // PF17 — owner-set in Settings → Shipping; only meaningful for pickup
  // orders, and only shown once the store has actually written one.
  const showPickupLocation =
    deliveryMethod === "pickup" && !!business.pickupLocation?.trim();

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

              {/* PF17 — pickup location/instructions, owner-set in
                  Settings → Shipping. Not a template field: it is store
                  data, the same way the receipt email and order total
                  above are not fields. */}
              {showPickupLocation ? (
                <div
                  className="pt-1 text-[0.9375rem] leading-relaxed"
                  style={{ borderTop: "1px solid var(--olive-hairline)" }}
                >
                  <p className="olive-label pt-2">Pickup location</p>
                  <p
                    className="mt-1 whitespace-pre-line"
                    style={{ color: "var(--olive-ink-soft)" }}
                  >
                    {business.pickupLocation}
                  </p>
                  {business.pickupInstructions?.trim() ? (
                    <p
                      className="mt-1 whitespace-pre-line"
                      style={{ color: "var(--olive-ink-soft)" }}
                    >
                      {business.pickupInstructions}
                    </p>
                  ) : null}
                </div>
              ) : null}
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
            {/* PF18 — account next step (View my orders / Create an account) */}
            {accountCta ? (
              <OliveButton variant="ghost" href={accountCta.href}>
                {accountCta.label}
              </OliveButton>
            ) : null}
          </div>
        </div>
      </OliveReveal>
    </OliveSection>
  );
}
