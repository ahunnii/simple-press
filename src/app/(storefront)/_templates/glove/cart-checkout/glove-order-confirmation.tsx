"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Check } from "lucide-react";

import type { CartItem } from "~/providers/cart-context";
import type { Session } from "~/server/better-auth/config";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { formatPrice } from "~/lib/prices";
import { TrackPurchase } from "~/components/analytics/track-purchase";
import { useCart } from "~/providers/cart-context";
import { useStorefrontFlags } from "~/providers/feature-flags-context";
import { useOrderAccountCta } from "~/app/(storefront)/_components/checkout/use-order-account-cta";

import { GloveButton } from "../shared/glove-button";
import { GloveHandIcon } from "../shared/glove-hand-icon";
import { GloveMedallion } from "../shared/glove-medallion";
import { GloveMistPanel } from "../shared/glove-mist-panel";
import { GloveRevealGroup } from "../shared/glove-reveal";
import { GloveSection } from "../shared/glove-section";

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

type GloveOrderConfirmationProps = {
  /** Just enough of the business for the pickup location block. */
  business: {
    pickupLocation?: string | null;
    pickupInstructions?: string | null;
  };
  heading: string;
  body: string;
  itemsHeading: string;
  nextHeading: string;
  nextSteps: string;
  nextStepsPickup: string;
  trackLabel: string;
  continueLabel: string;
  loadingText: string;
  noOrderHeading: string;
  noOrderBody: string;
  /** Session read server-side, so the account next step is right on first paint. */
  initialSession?: Session | null;
};

function formatOrderTotal(amountCents: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amountCents / 100);
  } catch {
    // An unrecognised currency code must never blank the page.
    return `$${(amountCents / 100).toFixed(2)}`;
  }
}

function splitLines(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

const META_LABEL =
  "glove-display text-[13px] font-medium text-[var(--glove-muted)]";
const META_VALUE =
  "glove-body m-0 mt-1 break-words text-[16px] font-bold text-[var(--glove-ink)]";

/**
 * Order confirmation. Reads the Stripe session id from the query string
 * (never a cookie), snapshots the cart's items and then clears it once, and
 * fetches the order back for the receipt email, total and payment status.
 * Three states: confirming, no order attached, and the confirmation itself.
 */
export function GloveOrderConfirmation({
  business,
  heading,
  body,
  itemsHeading,
  nextHeading,
  nextSteps,
  nextStepsPickup,
  trackLabel,
  continueLabel,
  loadingText,
  noOrderHeading,
  noOrderBody,
  initialSession,
}: GloveOrderConfirmationProps) {
  const searchParams = useSearchParams();
  const { items, isHydrated, clearCart } = useCart();
  const accountCta = useOrderAccountCta(initialSession);
  const { isEnabled } = useStorefrontFlags();
  // B2.5: "Continue shopping" is hidden (never swapped) when Products is off.
  const canShop = isEnabled("products");

  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  // The bag is only emptied after the page has kept a copy of what was in it.
  const [purchased, setPurchased] = useState<CartItem[]>([]);
  const clearedRef = useRef(false);

  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    if (!sessionId || !isHydrated || clearedRef.current) return;
    // Once only: a re-render must not wipe a cart refilled in another tab.
    clearedRef.current = true;
    setPurchased(items);
    clearCart();
  }, [sessionId, isHydrated, items, clearCart]);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
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
        // The order exists either way; the receipt email is the record.
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  // ── Confirming ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <p
        role="status"
        aria-live="polite"
        className="glove-display py-24 text-center text-[18px] font-medium text-[var(--glove-ink)]"
      >
        {loadingText}
      </p>
    );
  }

  // ── Opened without an order ──────────────────────────────────────────────
  if (!sessionId) {
    return (
      <GloveSection
        reveal={false}
        sectionAttrs={sectionGroupAttr("checkout", "confirmation")}
        aria-labelledby="glove-order-heading"
      >
        <GloveMistPanel className="mx-auto flex max-w-2xl flex-col items-center gap-4 px-6 py-14 text-center md:py-20">
          <GloveHandIcon className="size-20 text-[var(--glove-primary)]" />
          <h1
            id="glove-order-heading"
            className="glove-display text-[28px] leading-tight font-medium text-[var(--glove-ink)] md:text-[36px]"
            {...fieldAttr("glove.checkout.confirmation-no-order-heading")}
          >
            {noOrderHeading}
          </h1>
          {noOrderBody ? (
            <p
              className="max-w-md text-[16px] text-[var(--glove-text)]"
              {...fieldAttr("glove.checkout.confirmation-no-order-body")}
            >
              {noOrderBody}
            </p>
          ) : null}
          {canShop && continueLabel ? (
            <GloveButton href="/shop" variant="woo" className="mt-2">
              <span
                {...fieldAttr("glove.checkout.confirmation-continue-label")}
              >
                {continueLabel}
              </span>
            </GloveButton>
          ) : null}
        </GloveMistPanel>
      </GloveSection>
    );
  }

  // ── Confirmed ────────────────────────────────────────────────────────────
  const deliveryMethod = orderDetails?.delivery_method ?? null;
  const steps = splitLines(
    deliveryMethod === "pickup" && nextStepsPickup.trim()
      ? nextStepsPickup
      : nextSteps,
  );
  const showPickupLocation =
    deliveryMethod === "pickup" && !!business.pickupLocation?.trim();
  const total = orderDetails
    ? formatOrderTotal(orderDetails.amount_total, orderDetails.currency)
    : null;
  const paymentLabel =
    orderDetails?.payment_status === "paid"
      ? "Paid"
      : (orderDetails?.payment_status ?? "");
  const deliveryLabel =
    deliveryMethod === "pickup"
      ? "In-store pickup"
      : deliveryMethod === "ship"
        ? "Shipping"
        : "";

  const meta = [
    { label: "Receipt sent to", value: orderDetails?.customer_email ?? "" },
    { label: "Total", value: total ?? "" },
    { label: "Payment", value: paymentLabel },
    { label: "Delivery", value: deliveryLabel },
  ].filter((m) => m.value);

  return (
    <GloveSection
      reveal={false}
      sectionAttrs={sectionGroupAttr("checkout", "confirmation")}
      aria-labelledby="glove-order-heading"
    >
      {orderDetails ? (
        <TrackPurchase
          sessionId={sessionId}
          amountCents={orderDetails.amount_total}
        />
      ) : null}

      {/* Commerce content renders at once; the check medallion's pop is the
          page's one moment, so only it sits in a reveal group. */}
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-col items-center text-center">
          <GloveRevealGroup threshold={0}>
            <GloveMedallion size="lg" popIndex={0}>
              <Check className="size-8" strokeWidth={3} aria-hidden="true" />
            </GloveMedallion>
          </GloveRevealGroup>
          <h1
            id="glove-order-heading"
            className="glove-display mt-6 text-[28px] leading-tight font-medium text-[var(--glove-ink)] md:text-[40px]"
            {...fieldAttr("glove.checkout.confirmation-heading")}
          >
            {heading}
          </h1>
          {body ? (
            <p
              className="mt-3 max-w-xl text-[17px] text-[var(--glove-text)]"
              {...fieldAttr("glove.checkout.confirmation-body")}
            >
              {body}
            </p>
          ) : null}
        </div>

        {meta.length > 0 ? (
          <dl className="m-0 mt-10 grid grid-cols-2 gap-x-6 gap-y-5 border-y border-dashed border-[var(--glove-mist-line)] py-6 text-center md:grid-cols-4">
            {meta.map((m) => (
              <div key={m.label} className="min-w-0">
                <dt className={META_LABEL}>{m.label}</dt>
                <dd className={META_VALUE}>{m.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        {purchased.length > 0 ? (
          <GloveMistPanel className="mt-8 p-6 md:p-8">
            <h2
              className="glove-display text-[20px] leading-tight font-medium text-[var(--glove-ink)]"
              {...fieldAttr("glove.checkout.confirmation-items-heading")}
            >
              {itemsHeading}
            </h2>
            <ul className="m-0 mt-4 flex list-none flex-col p-0">
              {purchased.map((item) => (
                <li
                  key={`${item.productId}-${item.variantId ?? "base"}`}
                  className="flex items-center gap-4 border-b border-[var(--glove-mist-line)] py-3 last:border-b-0"
                >
                  <div className="relative size-14 shrink-0 overflow-hidden bg-[var(--glove-paper)]">
                    <Image
                      src={item.imageUrl ?? "/placeholder.svg"}
                      alt=""
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="glove-display text-[15px] leading-snug font-medium text-[var(--glove-ink)]">
                      {item.productName}
                    </p>
                    <p className="text-[13px] text-[var(--glove-muted)]">
                      {item.variantName ? `${item.variantName} · ` : ""}
                      Qty {item.quantity}
                    </p>
                  </div>
                  <span className="glove-body shrink-0 text-[15px] font-bold text-[var(--glove-ink)]">
                    {formatPrice(item.price * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>
          </GloveMistPanel>
        ) : null}

        {steps.length > 0 ? (
          <section aria-labelledby="glove-order-next-heading" className="mt-10">
            <h2
              id="glove-order-next-heading"
              className="glove-display text-[20px] leading-tight font-medium text-[var(--glove-ink)]"
              {...fieldAttr("glove.checkout.confirmation-next-heading")}
            >
              {nextHeading}
            </h2>
            <ol className="m-0 mt-4 flex list-none flex-col gap-3 p-0">
              {steps.map((step, i) => (
                <li key={step} className="flex items-start gap-3">
                  <GloveMedallion size="sm">{i + 1}</GloveMedallion>
                  <span className="pt-px text-[16px] text-[var(--glove-text)]">
                    {step}
                  </span>
                </li>
              ))}
            </ol>
            {showPickupLocation ? (
              <div className="mt-5 rounded-[var(--glove-radius-card)] border border-[var(--glove-mist-line)] bg-[var(--glove-mist)] p-4 text-[14px]">
                <p className="font-bold text-[var(--glove-ink)]">
                  Pickup location
                </p>
                <p className="mt-0.5 whitespace-pre-line text-[var(--glove-text)]">
                  {business.pickupLocation}
                </p>
                {business.pickupInstructions?.trim() ? (
                  <p className="mt-1 whitespace-pre-line text-[var(--glove-text)]">
                    {business.pickupInstructions}
                  </p>
                ) : null}
              </div>
            ) : null}
          </section>
        ) : null}

        <div className="mt-10 flex flex-col items-center gap-4">
          <div className="flex flex-wrap items-center justify-center gap-3">
            {trackLabel ? (
              <GloveButton href="/order-status" variant="woo">
                <span {...fieldAttr("glove.checkout.confirmation-track-label")}>
                  {trackLabel}
                </span>
              </GloveButton>
            ) : null}
            {canShop && continueLabel ? (
              <GloveButton href="/shop" variant="wooOutline">
                <span
                  {...fieldAttr("glove.checkout.confirmation-continue-label")}
                >
                  {continueLabel}
                </span>
              </GloveButton>
            ) : null}
          </div>
          {accountCta ? (
            <Link
              href={accountCta.href}
              className="glove-display text-[14px] font-medium text-[var(--glove-primary)] underline underline-offset-4 hover:text-[var(--glove-primary-hover)]"
            >
              {accountCta.label}
            </Link>
          ) : null}
        </div>
      </div>
    </GloveSection>
  );
}
