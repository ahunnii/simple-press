"use client";

import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  BellRing,
  CheckCircle2,
  Mail,
  PackageSearch,
  Store,
  Truck,
} from "lucide-react";

import type { Session } from "~/server/better-auth/config";
import { useHydratedSession } from "~/lib/auth/use-hydrated-session";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { formatCurrency } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { TrackPurchase } from "~/components/analytics/track-purchase";
import { FadeIn } from "~/components/page-animations";
import { useCart } from "~/providers/cart-context";
import { useStorefrontFlags } from "~/providers/feature-flags-context";

/** `session.metadata.deliveryMethod` as returned by `/api/stripe/session`. */
type DeliveryMethod = "ship" | "pickup" | null;

type OrderDetails = {
  customer_email: string | null;
  amount_total: number | null;
  currency: string | null;
  payment_status: string;
  delivery_method: DeliveryMethod;
};

/**
 * The details fetch is best-effort: it must never hold back the confirmation
 * itself (the shopper has already paid), so it is capped and any failure is
 * treated as "no extra details" rather than an error state.
 */
const DETAILS_FETCH_TIMEOUT_MS = 10_000;

const primaryButtonClass = "w-full bg-[#215935] text-white hover:bg-[#1a4729]";
const outlineButtonClass =
  "w-full border-[#2a351f]/20 text-[#2a351f] hover:border-[#215935] hover:text-[#215935]";

type AccountCta = { href: string; label: string; fieldKey: string };

/**
 * B9.4, inline (P-ORDER-CTA stays unbuilt — pollen is the only consumer):
 * signed in + `orders` → my orders; signed out + `customerAccounts` → sign-up;
 * otherwise nothing. Seeded with the server session so the right button is in
 * the first paint instead of popping in after the client session fetch.
 */
function useOrderAccountCta({
  initialSession,
  ordersLabel,
  signUpLabel,
}: {
  initialSession: Session | null;
  ordersLabel: string;
  /** Pass "" to never offer sign-up (the order-not-found state). */
  signUpLabel: string;
}): AccountCta | null {
  const { data: session } = useHydratedSession(initialSession);
  const { isEnabled } = useStorefrontFlags();

  if (session?.user) {
    return isEnabled("orders") && ordersLabel
      ? {
          href: "/account/orders",
          label: ordersLabel,
          fieldKey: "pollen.checkout.confirmation-orders-button",
        }
      : null;
  }
  return isEnabled("customerAccounts") && signUpLabel
    ? {
        href: "/auth/sign-up",
        label: signUpLabel,
        fieldKey: "pollen.checkout.confirmation-sign-up-button",
      }
    : null;
}

/** B2.1 / PF8: `/order/success` is reachable with the shop off — never link a 404. */
function useContinueHref(): string {
  const { isEnabled } = useStorefrontFlags();
  return isEnabled("products") ? "/shop" : "/";
}

export type PollenOrderConfirmationCopy = {
  heading: string;
  intro: string;
  nextHeading: string;
  receiptStep: string;
  shipStep: string;
  pickupStep: string;
  generalStep: string;
  detailsHeading: string;
  continueLabel: string;
  ordersLabel: string;
  signUpLabel: string;
  signUpText: string;
};

type ConfirmationProps = {
  copy: PollenOrderConfirmationCopy;
  /** Settings → Shipping pickup location, falling back to the store address. */
  pickupLocation: string | null;
  pickupInstructions: string | null;
  initialSession: Session | null;
};

type Step = {
  Icon: LucideIcon;
  text: string;
  fieldKey: string;
  pickup?: boolean;
};

/**
 * `/order/success` with a `session_id` — pollen's own confirmation body (the
 * page band above it is `PollenGeneralLayout`, rendered by the server page).
 *
 * Keeps Default's contract (B9.2): `clearCart()` as soon as a session id is
 * present, the `/api/stripe/session` fetch, and `TrackPurchase` once the
 * details land. The fetch also yields the delivery method, which picks the
 * pickup or shipping next step (B9.3).
 */
export function PollenOrderConfirmation({
  copy,
  pickupLocation,
  pickupInstructions,
  initialSession,
}: ConfirmationProps) {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const { clearCart } = useCart();
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(true);
  const continueHref = useContinueHref();
  const accountCta = useOrderAccountCta({
    initialSession,
    ordersLabel: copy.ordersLabel,
    signUpLabel: copy.signUpLabel,
  });

  useEffect(() => {
    if (!sessionId) {
      setDetailsLoading(false);
      return;
    }

    // Clear the cart on a completed checkout.
    clearCart();

    const controller = new AbortController();
    // Set by the cleanup (unmount / StrictMode re-run) — a superseded request
    // must not end the loading state of the one that replaced it. A timeout
    // abort leaves it false, so a hung fetch still settles to "no details".
    let cancelled = false;
    const timeoutId = setTimeout(
      () => controller.abort(),
      DETAILS_FETCH_TIMEOUT_MS,
    );

    const fetchOrderDetails = async () => {
      try {
        const response = await fetch(
          `/api/stripe/session?session_id=${encodeURIComponent(sessionId)}`,
          { signal: controller.signal },
        );
        if (response.ok) {
          const data = (await response.json()) as OrderDetails;
          if (!cancelled) setOrderDetails(data);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("Failed to fetch order details:", error);
        }
      } finally {
        clearTimeout(timeoutId);
        if (!cancelled) setDetailsLoading(false);
      }
    };

    void fetchOrderDetails();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [sessionId, clearCart]);

  const deliveryMethod = orderDetails?.delivery_method ?? null;
  const fulfilmentStep: Step =
    deliveryMethod === "pickup"
      ? {
          Icon: Store,
          text: copy.pickupStep,
          fieldKey: "pollen.checkout.confirmation-pickup-step",
          pickup: true,
        }
      : deliveryMethod === "ship"
        ? {
            Icon: Truck,
            text: copy.shipStep,
            fieldKey: "pollen.checkout.confirmation-ship-step",
          }
        : {
            Icon: BellRing,
            text: copy.generalStep,
            fieldKey: "pollen.checkout.confirmation-general-step",
          };
  const receiptStep: Step = {
    Icon: Mail,
    text: copy.receiptStep,
    fieldKey: "pollen.checkout.confirmation-receipt-step",
  };
  const steps = [receiptStep, fulfilmentStep].filter((step) => step.text);

  const total =
    typeof orderDetails?.amount_total === "number"
      ? formatCurrency(
          orderDetails.amount_total,
          (orderDetails.currency ?? "usd").toUpperCase(),
        )
      : null;
  const email = orderDetails?.customer_email ?? null;
  const deliveryLabel =
    deliveryMethod === "pickup"
      ? "In-store pickup"
      : deliveryMethod === "ship"
        ? "Shipping"
        : null;
  const hasDetails = [total, email, deliveryLabel].some(Boolean);

  return (
    <section
      {...sectionGroupAttr("checkout", "confirmation")}
      className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-20 lg:px-8"
    >
      {/* Fire the purchase analytics event once — idempotent via sessionStorage. */}
      {sessionId && typeof orderDetails?.amount_total === "number" ? (
        <TrackPurchase
          sessionId={sessionId}
          amountCents={orderDetails.amount_total}
        />
      ) : null}

      <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-16">
        {/* Thanks + next steps */}
        <FadeIn direction="up" className="min-w-0 flex-1">
          <div className="flex items-start gap-4 sm:gap-5">
            <div
              className="flex size-14 shrink-0 items-center justify-center rounded-full bg-[#d4e8d4] sm:size-16"
              aria-hidden="true"
            >
              <CheckCircle2 className="size-7 text-[#215935] sm:size-8" />
            </div>
            <div className="min-w-0 pt-1">
              <h2
                {...fieldAttr("pollen.checkout.confirmation-heading")}
                className="text-2xl font-bold text-[#2a351f] md:text-3xl"
              >
                {copy.heading}
              </h2>
              {copy.intro ? (
                <p
                  {...fieldAttr("pollen.checkout.confirmation-intro")}
                  className="mt-2 max-w-xl leading-relaxed whitespace-pre-line text-[#4c566a]"
                >
                  {copy.intro}
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-10">
            {copy.nextHeading ? (
              <h3
                {...fieldAttr("pollen.checkout.confirmation-next-heading")}
                className="mb-4 text-sm font-medium tracking-wider text-[#2a351f] uppercase"
              >
                {copy.nextHeading}
              </h3>
            ) : null}
            <ul className="divide-y divide-[#e5ded4] rounded-md bg-[#f5f2ee]">
              {steps.map((step) =>
                // The fulfilment row waits for the delivery method so a
                // pickup order is never told "we'll ship" first.
                detailsLoading && step !== receiptStep ? (
                  <li key="loading" className="flex gap-3 px-4 py-4">
                    <span
                      className="mt-0.5 size-4 shrink-0 rounded-full bg-[#2a351f]/10"
                      aria-hidden="true"
                    />
                    <span className="flex-1" role="status">
                      <span className="sr-only">
                        Loading your order details…
                      </span>
                      <span
                        className="block h-4 w-3/4 rounded bg-[#2a351f]/10 motion-safe:animate-pulse"
                        aria-hidden="true"
                      />
                    </span>
                  </li>
                ) : (
                  <li key={step.fieldKey} className="flex gap-3 px-4 py-4">
                    <step.Icon
                      className="mt-0.5 size-4 shrink-0 text-[#215935]"
                      aria-hidden="true"
                    />
                    <div className="min-w-0 text-sm leading-relaxed">
                      <p
                        {...fieldAttr(step.fieldKey)}
                        className="text-[#2a351f]"
                      >
                        {step.text}
                      </p>
                      {step.pickup &&
                      (pickupLocation ?? pickupInstructions) !== null ? (
                        <div className="mt-2 text-[#4c566a]">
                          {pickupLocation ? (
                            <p className="whitespace-pre-line">
                              <span className="font-semibold text-[#2a351f]">
                                Pickup location:
                              </span>{" "}
                              {pickupLocation}
                            </p>
                          ) : null}
                          {pickupInstructions ? (
                            <p className="mt-1 whitespace-pre-line">
                              {pickupInstructions}
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </li>
                ),
              )}
            </ul>
          </div>
        </FadeIn>

        {/* Order details + next actions — mirrors the cart's summary panel */}
        <FadeIn
          direction="left"
          delay={0.15}
          className="w-full shrink-0 lg:sticky lg:top-32 lg:w-96"
        >
          <div className="rounded-md border border-[#2a351f]/10 bg-white p-6">
            {detailsLoading ? (
              <div className="mb-6 space-y-3" aria-hidden="true">
                <span className="block h-5 w-1/2 rounded bg-[#2a351f]/10 motion-safe:animate-pulse" />
                <span className="block h-4 w-full rounded bg-[#2a351f]/10 motion-safe:animate-pulse" />
                <span className="block h-4 w-5/6 rounded bg-[#2a351f]/10 motion-safe:animate-pulse" />
              </div>
            ) : hasDetails ? (
              <div className="mb-6">
                {copy.detailsHeading ? (
                  <h3
                    {...fieldAttr(
                      "pollen.checkout.confirmation-details-heading",
                    )}
                    className="text-lg font-semibold text-[#2a351f]"
                  >
                    {copy.detailsHeading}
                  </h3>
                ) : null}
                <dl className="mt-4 space-y-3 text-sm">
                  {total ? (
                    <div className="flex justify-between gap-4">
                      <dt className="text-[#4c566a]">Order total</dt>
                      <dd className="text-lg font-bold text-[#215935]">
                        {total}
                      </dd>
                    </div>
                  ) : null}
                  {deliveryLabel ? (
                    <div className="flex justify-between gap-4">
                      <dt className="text-[#4c566a]">Delivery</dt>
                      <dd className="font-medium text-[#2a351f]">
                        {deliveryLabel}
                      </dd>
                    </div>
                  ) : null}
                  {email ? (
                    <div className="border-t border-[#2a351f]/10 pt-3">
                      <dt className="text-[#4c566a]">Receipt sent to</dt>
                      <dd className="mt-0.5 font-medium break-all text-[#2a351f]">
                        {email}
                      </dd>
                    </div>
                  ) : null}
                </dl>
              </div>
            ) : null}

            <div className="flex flex-col gap-3">
              {copy.continueLabel ? (
                <Button className={primaryButtonClass} size="lg" asChild>
                  <Link href={continueHref}>
                    <span
                      {...fieldAttr(
                        "pollen.checkout.confirmation-continue-button",
                      )}
                    >
                      {copy.continueLabel}
                    </span>
                  </Link>
                </Button>
              ) : null}
              {accountCta ? (
                <>
                  {accountCta.href === "/auth/sign-up" && copy.signUpText ? (
                    <p
                      {...fieldAttr(
                        "pollen.checkout.confirmation-sign-up-text",
                      )}
                      className="mt-3 border-t border-[#2a351f]/10 pt-4 text-sm leading-relaxed text-[#4c566a]"
                    >
                      {copy.signUpText}
                    </p>
                  ) : null}
                  <Button
                    variant="outline"
                    className={outlineButtonClass}
                    size="lg"
                    asChild
                  >
                    <Link href={accountCta.href}>
                      <span {...fieldAttr(accountCta.fieldKey)}>
                        {accountCta.label}
                      </span>
                    </Link>
                  </Button>
                </>
              ) : null}
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

export type PollenOrderNotFoundCopy = {
  body: string;
  continueLabel: string;
  ordersLabel: string;
};

/**
 * `/order/success` without a `session_id` (bookmark, shared link, stale tab).
 * Its own band title comes from the server page; this body mirrors the cart's
 * empty state. Signed-in shoppers get a way to their order history (where a
 * real order lives); sign-up isn't offered — there's no order to attach.
 */
export function PollenOrderNotFound({
  copy,
  initialSession,
}: {
  copy: PollenOrderNotFoundCopy;
  initialSession: Session | null;
}) {
  const continueHref = useContinueHref();
  const accountCta = useOrderAccountCta({
    initialSession,
    ordersLabel: copy.ordersLabel,
    signUpLabel: "",
  });

  return (
    <section
      {...sectionGroupAttr("checkout", "no-order")}
      className="mx-auto flex max-w-7xl flex-col items-center px-4 py-20 text-center sm:px-6 md:py-24 lg:px-8"
    >
      <FadeIn direction="up" className="max-w-md">
        <div
          className="mx-auto flex size-20 items-center justify-center rounded-full bg-[#f5f2ee]"
          aria-hidden="true"
        >
          <PackageSearch className="size-8 text-[#4c566a]" />
        </div>
        {copy.body ? (
          <p
            {...fieldAttr("pollen.checkout.no-order-body")}
            className="mt-6 leading-relaxed whitespace-pre-line text-[#4c566a]"
          >
            {copy.body}
          </p>
        ) : null}
        {copy.continueLabel || accountCta ? (
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            {copy.continueLabel ? (
              <Button
                className="bg-[#215935] text-white hover:bg-[#1a4729]"
                size="lg"
                asChild
              >
                <Link href={continueHref}>
                  <span
                    {...fieldAttr(
                      "pollen.checkout.confirmation-continue-button",
                    )}
                  >
                    {copy.continueLabel}
                  </span>
                </Link>
              </Button>
            ) : null}
            {accountCta ? (
              <Button
                variant="outline"
                className="border-[#2a351f]/20 text-[#2a351f] hover:border-[#215935] hover:text-[#215935]"
                size="lg"
                asChild
              >
                <Link href={accountCta.href}>
                  <span {...fieldAttr(accountCta.fieldKey)}>
                    {accountCta.label}
                  </span>
                </Link>
              </Button>
            ) : null}
          </div>
        ) : null}
      </FadeIn>
    </section>
  );
}
