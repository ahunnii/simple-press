"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import type {
  DreamOrderStepList,
  DreamOrderStepSets,
} from "./dream-order-steps";
import type { Session } from "~/server/better-auth/config";
import {
  fieldAttr,
  listItemAttr,
  sectionGroupAttr,
} from "~/lib/preview/section-attrs";
import { formatCurrency } from "~/lib/utils";
import { TrackPurchase } from "~/components/analytics/track-purchase";
import { useCart } from "~/providers/cart-context";
import { useStorefrontFlags } from "~/providers/feature-flags-context";
import { useOrderAccountCta } from "~/app/(storefront)/_components/checkout/use-order-account-cta";
import { navHrefFlag } from "~/app/(storefront)/_components/nav/nav-flags";

import { DreamButton } from "../shared/dream-button";
import { nonBlank } from "../shared/dream-non-blank";
import { DreamPageHero } from "../shared/dream-page-hero";
import { DreamSection } from "../shared/dream-section";

type DeliveryMethod = "ship" | "pickup" | null;

type OrderDetails = {
  customer_email: string;
  amount_total: number;
  currency: string;
  payment_status: string;
  delivery_method?: DeliveryMethod;
};

/** Resolved `checkout.confirmation` / `checkout.no-order` copy. */
export type DreamOrderCopy = {
  heading: string;
  accent: string;
  lede: string;
  nextHeading: string;
  receiptHeading: string;
  ordersLabel: string;
  signupLabel: string;
  continueLabel: string;
  homeLabel: string;
  noOrderHeading: string;
  noOrderAccent: string;
  noOrderLede: string;
};

type Props = {
  business: {
    name: string;
    pickupLocation?: string | null;
    pickupInstructions?: string | null;
    businessAddress?: string | null;
  };
  logoUrl: string;
  logoAlt: string;
  copy: DreamOrderCopy;
  steps: DreamOrderStepSets;
  /**
   * Session resolved server-side (`getSession()`), seeding the shared
   * `useOrderAccountCta` hook so the account button is right on first
   * paint. `undefined` falls back to the hook's unseeded mode, which
   * suppresses the button until the client session resolves — never a
   * flash of the wrong branch.
   */
  initialSession?: Session | null;
};

// The details fetch is best-effort: it must never block the thank-you
// heading, so it's capped and any failure just means "no extra details".
const DETAILS_FETCH_TIMEOUT_MS = 10_000;

function stepsFor(
  steps: DreamOrderStepSets,
  method: DeliveryMethod | undefined,
): DreamOrderStepList {
  if (method === "pickup") return steps.pickup;
  if (method === "ship") return steps.ship;
  return steps.unknown;
}

/**
 * `/order/success` for dream (B9). Three states on dream's page system:
 *
 * - **No `session_id`** — the sky hero with "We couldn't find that order"
 *   and the way back (shop / home). No fetch, no cart clear.
 * - **Confirmed** — the sky hero thanks the shopper at once (never waits on
 *   the fetch); `clearCart()` runs as soon as a session id is present and
 *   `TrackPurchase` fires once the Stripe session resolves (B9.2).
 * - The **next steps** follow the order's fulfilment method from the
 *   session (`delivery_method`): pickup orders are never told "it ships"
 *   (B9.3), and pickup adds the store's pickup location.
 *
 * Buttons: the account next step from the shared `useOrderAccountCta`
 * hook (B9.4 / P-ORDER-CTA — labels are owner copy, the branch logic is
 * the hook's), continue shopping (hidden while `products` is off — never
 * re-pointed), and back home (B9.5).
 */
export function DreamOrderConfirmation({
  business,
  logoUrl,
  logoAlt,
  copy,
  steps,
  initialSession,
}: Props) {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const { clearCart } = useCart();
  const { isEnabled } = useStorefrontFlags();
  const accountCta = useOrderAccountCta(initialSession);
  const [details, setDetails] = useState<OrderDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(Boolean(sessionId));

  const shopFlag = navHrefFlag("/shop");
  const shopEnabled = shopFlag === null || isEnabled(shopFlag);
  const continueLabel = shopEnabled ? copy.continueLabel : "";

  useEffect(() => {
    if (!sessionId) {
      setDetailsLoading(false);
      return;
    }

    clearCart();

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      DETAILS_FETCH_TIMEOUT_MS,
    );

    const load = async () => {
      try {
        const response = await fetch(
          `/api/stripe/session?session_id=${encodeURIComponent(sessionId)}`,
          { signal: controller.signal },
        );
        if (response.ok) {
          setDetails((await response.json()) as OrderDetails);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("Failed to fetch order details:", error);
        }
      } finally {
        clearTimeout(timeoutId);
        setDetailsLoading(false);
      }
    };

    void load();

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [sessionId, clearCart]);

  const homeLink = copy.homeLabel ? (
    <DreamButton href="/" variant="link" className="text-[15px]">
      <span {...fieldAttr("dream.checkout.confirmation-home-label")}>
        {copy.homeLabel}
      </span>
    </DreamButton>
  ) : null;

  if (!sessionId) {
    return (
      <DreamPageHero
        logoUrl={logoUrl}
        logoAlt={logoAlt}
        title={copy.noOrderHeading}
        accent={copy.noOrderAccent}
        lede={copy.noOrderLede}
        titleFieldKey="dream.checkout.no-order-heading"
        accentFieldKey="dream.checkout.no-order-accent"
        ledeFieldKey="dream.checkout.no-order-lede"
        sectionAttrs={sectionGroupAttr("checkout", "no-order")}
        className="flex min-h-[60vh] flex-col justify-center"
      >
        {continueLabel || homeLink ? (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
            {continueLabel ? (
              <DreamButton href="/shop">
                <span
                  {...fieldAttr("dream.checkout.confirmation-continue-label")}
                >
                  {continueLabel}
                </span>
              </DreamButton>
            ) : null}
            {homeLink}
          </div>
        ) : null}
      </DreamPageHero>
    );
  }

  const method = details?.delivery_method ?? null;
  const list = stepsFor(steps, method);
  const pickupLocation =
    nonBlank(business.pickupLocation) ??
    nonBlank(business.businessAddress) ??
    "";
  const showPickup = method === "pickup" && pickupLocation !== "";
  const accountLabel = accountCta
    ? accountCta.href === "/account/orders"
      ? copy.ordersLabel || accountCta.label
      : copy.signupLabel || accountCta.label
    : "";

  return (
    <div {...sectionGroupAttr("checkout", "confirmation")}>
      {details ? (
        <TrackPurchase
          sessionId={sessionId}
          amountCents={details.amount_total}
        />
      ) : null}

      <DreamPageHero
        logoUrl={logoUrl}
        logoAlt={logoAlt}
        title={copy.heading}
        accent={copy.accent}
        lede={copy.lede}
        titleFieldKey="dream.checkout.confirmation-heading"
        accentFieldKey="dream.checkout.confirmation-accent"
        ledeFieldKey="dream.checkout.confirmation-lede"
      />

      <DreamSection aria-label={copy.nextHeading} reveal={false}>
        <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-16">
          <div className="min-w-0">
            <h2
              className="[font-family:var(--font-dream-display)] text-[clamp(30px,3.4vw,40px)] leading-[1.08] text-[var(--dream-ink)]"
              {...fieldAttr("dream.checkout.confirmation-next-heading")}
            >
              {copy.nextHeading}
            </h2>

            {detailsLoading ? (
              <div aria-busy="true" className="mt-8 min-h-[200px]">
                <span className="sr-only" role="status">
                  Loading order details…
                </span>
              </div>
            ) : (
              <ol
                className="dream-steps-list"
                // `.dream .dream-steps-list` resets margin, which beats `mt-*`
                style={{ marginTop: "2rem" }}
                data-delivery={method ?? "unknown"}
              >
                {list.steps.map((step, i) => (
                  <li
                    key={`${list.fieldKey}-${step.index}`}
                    className="dream-steps-item"
                    {...listItemAttr(list.fieldKey, step.index)}
                  >
                    <span className="dream-steps-num" aria-hidden="true">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div>
                      {step.heading ? (
                        <h3 className="dream-steps-heading">{step.heading}</h3>
                      ) : null}
                      {step.body ? (
                        <p className="dream-steps-body">{step.body}</p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            )}

            <div className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-3">
              {accountCta ? (
                <DreamButton href={accountCta.href}>
                  <span
                    {...fieldAttr(
                      accountCta.href === "/account/orders"
                        ? "dream.checkout.confirmation-orders-label"
                        : "dream.checkout.confirmation-signup-label",
                    )}
                  >
                    {accountLabel}
                  </span>
                </DreamButton>
              ) : null}
              {continueLabel ? (
                <DreamButton
                  href="/shop"
                  variant={accountCta ? "secondary" : "primary"}
                >
                  <span
                    {...fieldAttr("dream.checkout.confirmation-continue-label")}
                  >
                    {continueLabel}
                  </span>
                </DreamButton>
              ) : null}
              {homeLink}
            </div>
          </div>

          {detailsLoading || details ? (
            <aside
              aria-labelledby="dream-order-details-heading"
              className="dream-card flex flex-col gap-5"
            >
              <h2
                id="dream-order-details-heading"
                className="[font-family:var(--font-dream-display)] text-[28px] leading-[1.1] text-[var(--dream-ink)]"
                {...fieldAttr("dream.checkout.confirmation-receipt-heading")}
              >
                {copy.receiptHeading}
              </h2>
              {detailsLoading ? (
                <p
                  className="text-[15px] text-[var(--dream-soft)]"
                  role="status"
                >
                  Loading order details…
                </p>
              ) : details ? (
                <dl className="m-0 flex flex-col gap-4 text-[15px]">
                  {typeof details.amount_total === "number" ? (
                    <div className="flex items-baseline justify-between gap-4 border-b border-[var(--dream-line)] pb-4">
                      <dt className="text-[var(--dream-soft)]">Order total</dt>
                      <dd className="m-0 text-[24px] font-semibold text-[var(--dream-ink)] tabular-nums">
                        {formatCurrency(
                          details.amount_total,
                          (details.currency || "usd").toUpperCase(),
                        )}
                      </dd>
                    </div>
                  ) : null}
                  {details.customer_email ? (
                    <div className="flex flex-col gap-1">
                      <dt className="text-[var(--dream-soft)]">
                        Receipt sent to
                      </dt>
                      <dd className="m-0 font-semibold break-words text-[var(--dream-ink)]">
                        {details.customer_email}
                      </dd>
                    </div>
                  ) : null}
                  {showPickup ? (
                    <div className="flex flex-col gap-1 rounded-[var(--dream-radius-input)] border border-[var(--dream-line)] bg-[linear-gradient(180deg,var(--dream-sky)_0%,var(--dream-paper)_100%)] p-4">
                      <dt className="font-semibold text-[var(--dream-ink)]">
                        Pickup location
                      </dt>
                      <dd className="m-0 whitespace-pre-line text-[var(--dream-soft)]">
                        {pickupLocation}
                        {business.pickupInstructions?.trim() ? (
                          <span className="mt-2 block">
                            {business.pickupInstructions}
                          </span>
                        ) : null}
                      </dd>
                    </div>
                  ) : null}
                </dl>
              ) : null}
            </aside>
          ) : null}
        </div>
      </DreamSection>
    </div>
  );
}
