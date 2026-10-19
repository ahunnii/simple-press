import "server-only";

import type Stripe from "stripe";
import { unstable_cache } from "next/cache";
import * as Sentry from "@sentry/nextjs";

import { env } from "~/env";
import { stripeClient } from "~/lib/stripe/client";
import { db } from "~/server/db";

/**
 * Logos a storefront can show for "we accept…". Each id has a matching
 * `public/payment-marks/<id>.svg` and a label in
 * `~/app/(storefront)/_components/payment-marks`.
 */
export const PAYMENT_MARK_IDS = [
  "visa",
  "mastercard",
  "amex",
  "discover",
  "apple_pay",
  "google_pay",
  "link",
  "paypal",
  "klarna",
  "affirm",
  "afterpay_clearpay",
  "cashapp",
  "amazon_pay",
  "us_bank_account",
] as const;

export type PaymentMarkId = (typeof PAYMENT_MARK_IDS)[number];

/** Card brands shown when cards are on. Stripe has no per-brand toggle here. */
const CARD_BRAND_MARKS: PaymentMarkId[] = [
  "visa",
  "mastercard",
  "amex",
  "discover",
];

/**
 * Config keys after `card`, in display order. Each key is both the Stripe
 * PaymentMethodConfiguration property and our mark id.
 */
const WALLET_AND_OTHER_KEYS = [
  "apple_pay",
  "google_pay",
  "link",
  "paypal",
  "klarna",
  "affirm",
  "afterpay_clearpay",
  "cashapp",
  "amazon_pay",
  "us_bank_account",
] as const satisfies readonly (PaymentMarkId &
  keyof Stripe.PaymentMethodConfiguration)[];

type MethodSetting = {
  available?: boolean;
  display_preference?: { value?: string | null } | null;
};

function isOn(setting: unknown): boolean {
  if (setting == null || typeof setting !== "object") return false;
  const s = setting as MethodSetting;
  // `available` is Stripe's own "may be offered at checkout" verdict: the
  // effective display preference is on AND the account's capability is
  // active. The explicit `value === "on"` check is belt-and-braces.
  return s.available === true && s.display_preference?.value === "on";
}

/**
 * Pure mapping from one PaymentMethodConfiguration to the ordered logos to
 * show. Cards fan out to the four big US brands; every other method maps 1:1.
 * Keys missing from the config and methods we have no logo for are skipped.
 */
export function marksFromConfiguration(
  config: Partial<Record<string, unknown>> | null | undefined,
): PaymentMarkId[] {
  if (!config) return [];
  const marks: PaymentMarkId[] = [];
  if (isOn(config.card)) marks.push(...CARD_BRAND_MARKS);
  for (const key of WALLET_AND_OTHER_KEYS) {
    if (isOn(config[key])) marks.push(key);
  }
  return marks;
}

/**
 * Picks the configuration Checkout uses for our sessions.
 *
 * Our sessions are direct charges on the connected (Standard, OAuth) account
 * and pass neither `payment_method_types` nor `payment_method_configuration`
 * (see `src/app/api/stripe/create-session/route.ts`). Stripe's docs for
 * `PaymentMethodConfiguration.is_default`: "The default configuration is used
 * whenever a payment method configuration is not specified." Listing with the
 * `Stripe-Account` header returns the connected account's own configurations,
 * so the active `is_default` one is what its Checkout pages offer.
 *
 * A connected account can also hold platform-managed "child" configurations
 * (`application` = a Connect platform's client id, `parent` set). If more than
 * one active default comes back, prefer the child belonging to OUR platform
 * (that's what Stripe resolves for charges our platform creates), then the
 * account's own (`application: null`), then whichever Stripe listed first.
 */
export function pickDefaultConfiguration(
  configs: readonly Stripe.PaymentMethodConfiguration[],
  platformClientId?: string | null,
): Stripe.PaymentMethodConfiguration | null {
  const defaults = configs.filter((c) => c.is_default && c.active);
  if (defaults.length === 0) return null;
  return (
    (platformClientId
      ? defaults.find((c) => c.application === platformClientId)
      : undefined) ??
    defaults.find((c) => c.application == null) ??
    defaults[0] ??
    null
  );
}

const SIX_HOURS = 21_600;

async function fetchMarks(stripeAccountId: string): Promise<PaymentMarkId[]> {
  const list = await stripeClient.paymentMethodConfigurations.list(
    { limit: 100 },
    // Bounded: this runs inside the storefront layout render.
    { stripeAccount: stripeAccountId, timeout: 4_000 },
  );
  const config = pickDefaultConfiguration(
    list.data,
    env.NEXT_PUBLIC_STRIPE_CONNECT_CLIENT_ID,
  );
  return marksFromConfiguration(
    config as unknown as Partial<Record<string, unknown>> | null,
  );
}

/**
 * The payment logos to show for a connected account, read from its default
 * Stripe payment method configuration (Stripe → Settings → Payment methods).
 *
 * Cached 6h per account (tag `stripe-payment-marks:<accountId>`). Never
 * throws: no account, or any Stripe error, gives `[]` so the footer simply
 * shows no logos. Errors are thrown INSIDE the cached function and caught
 * outside it, so a failure is not memoized for six hours.
 */
export async function getAcceptedPaymentMarks(
  stripeAccountId: string | null | undefined,
): Promise<PaymentMarkId[]> {
  const accountId = stripeAccountId?.trim();
  if (!accountId) return [];
  try {
    const cached = unstable_cache(
      () => fetchMarks(accountId),
      ["stripe-payment-marks", accountId],
      {
        revalidate: SIX_HOURS,
        tags: [`stripe-payment-marks:${accountId}`],
      },
    );
    return await cached();
  } catch (error) {
    console.error("[stripe] payment marks lookup failed", error);
    Sentry.captureException(error, {
      level: "warning",
      tags: {
        service: "stripe",
        "stripe.step": "payment-marks",
        stripeAccountId: accountId,
      },
    });
    return [];
  }
}

/**
 * Storefront entry point: looks up the business's connected account (the
 * public business payload strips `stripeAccountId`) and returns its logos.
 *
 * Deliberately NOT gated on `Business.stripeChargesEnabled`: that flag is
 * `@default(false)` and only flips from the webhook / Connect callback, so it
 * sits stale at `false` on healthy stores (see `payments-health.ts`), and
 * checkout itself never reads it. Stripe is the authority instead — each
 * method's `available` is only true while the account's capability for it is
 * active, so a restricted account comes back with no logos on its own.
 */
export async function getAcceptedPaymentMarksForBusiness(
  businessId: string,
): Promise<PaymentMarkId[]> {
  try {
    const row = await db.business.findUnique({
      where: { id: businessId },
      select: { stripeAccountId: true },
    });
    return await getAcceptedPaymentMarks(row?.stripeAccountId);
  } catch (error) {
    console.error("[stripe] payment marks business lookup failed", error);
    return [];
  }
}
