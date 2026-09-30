"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check } from "lucide-react";

import type { Session } from "~/server/better-auth/config";
import { useOrderAccountCta } from "~/app/(storefront)/_components/checkout/use-order-account-cta";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { TrackPurchase } from "~/components/analytics/track-purchase";
import { useCart } from "~/providers/cart-context";

import { umscTelHref } from "../shared/umsc-contact-details";
import { UmscButton } from "../shared/umsc-button";

/** `session.metadata.deliveryMethod`, echoed back by `/api/stripe/session`. */
type DeliveryMethod = "ship" | "pickup" | null;

type OrderDetails = {
  customer_email: string;
  amount_total: number;
  currency: string;
  payment_status: string;
  delivery_method?: DeliveryMethod;
};

type Props = {
  businessName: string;
  thankYouHeading: string;
  nextStepsHeading: string;
  nextSteps: string;
  /** PF18: shown instead of `nextSteps` when the order is for pickup. */
  nextStepsPickup: string;
  /** PF18: Settings → Business phone (via `resolveUmscContactDetails`); never a field. */
  phone?: string;
  continueCta: string;
  homeLinkLabel: string;
  loadingText: string;
  noOrderHeading: string;
  noOrderBody: string;
  /**
   * Session resolved server-side (`getSession()`), seeding the shared
   * `useOrderAccountCta` hook so the account button (PF17) is right on the
   * first paint. `undefined` falls back to the hook's unseeded mode, which
   * suppresses the button until the client session resolves — never a
   * flash of the wrong branch.
   */
  initialSession?: Session | null;
};

/**
 * PF18: picks the pickup-specific next-steps copy when the order was placed
 * for in-store pickup and the owner has written it; ship orders, and any
 * order whose delivery method the Stripe session fetch couldn't resolve,
 * fall back to the general list — exactly as they render today. An
 * owner-saved value on either field renders unchanged either way; the
 * pickup/ship split only decides WHICH field's text is shown.
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
    return `$${(amountCents / 100).toFixed(2)}`;
  }
}

export function UmscOrderConfirmation({
  businessName,
  thankYouHeading,
  nextStepsHeading,
  nextSteps,
  nextStepsPickup,
  phone,
  continueCta,
  homeLinkLabel,
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
  // PF18 (B9.3): the general list is used for ship orders AND for any order
  // whose delivery method the Stripe session fetch hasn't resolved yet (or
  // couldn't) — never a pickup order left on ship-specific wording.
  const deliveryMethod = orderDetails?.delivery_method ?? null;
  const nextStepsLines = resolveNextSteps(deliveryMethod, nextSteps, nextStepsPickup)
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
        {...sectionGroupAttr("checkout", "success")}
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
              {nextStepsHeading ? (
                <p
                  {...fieldAttr("umsc.order.next-steps-heading")}
                  className="umsc-sans mb-3.5 text-[11px] font-semibold tracking-[0.16em] text-[var(--umsc-gold-soft)] uppercase"
                >
                  {nextStepsHeading}
                </p>
              ) : null}
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

              {/* PF18: the customer-service phone always comes from
                  Settings (`resolveUmscContactDetails`), never baked into
                  the next-steps copy — it stays current when an owner
                  updates their number, and it's never duplicated when an
                  owner has written their own phone mention into either
                  field above. */}
              {phone ? (
                <p className="umsc-sans mt-3.5 text-[14px] leading-[1.6] text-[var(--umsc-cream-on-black)]">
                  Questions? Call or text{" "}
                  <a
                    href={umscTelHref(phone)}
                    className="font-semibold text-[var(--umsc-gold-soft)] underline underline-offset-[3px] hover:text-[var(--umsc-gold)]"
                  >
                    {phone}
                  </a>
                  .
                </p>
              ) : null}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-4">
            <UmscButton
              as="link"
              href="/shop"
              variant="gold"
              showArrow={false}
              fieldKey="umsc.order.continue-cta"
            >
              {continueCta || "Continue Shopping"}
            </UmscButton>
            {/* PF17 / B9.4 (P-ORDER-CTA): signed in + orders on -> "View my
                orders"; signed out + customerAccounts on -> "Create an
                account"; neither -> no button. */}
            {accountCta ? (
              <UmscButton
                as="link"
                href={accountCta.href}
                variant="ghost"
                showArrow={false}
                className="umsc-btn-ghost-onblack"
              >
                {accountCta.label}
              </UmscButton>
            ) : null}
            {homeLinkLabel ? (
              <UmscButton
                as="link"
                href="/"
                variant="link"
                fieldKey="umsc.order.home-link-label"
                className="!text-[var(--umsc-gold-soft)]"
              >
                {homeLinkLabel}
              </UmscButton>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
