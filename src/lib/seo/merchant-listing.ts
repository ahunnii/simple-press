/**
 * merchant-listing.ts — pure builders for the Google "merchant listing"
 * parts of Product JSON-LD: `offers.shippingDetails` (OfferShippingDetails)
 * and `hasMerchantReturnPolicy` (MerchantReturnPolicy).
 *
 * No Sentry, no env, no DB: everything is derived from the Business row the
 * storefront already loads (`business.simplifiedGet`), using the same shipping
 * math the cart and checkout use (`calculateShipping`,
 * `calculateZoneWeightShipping`, `buildZoneWeightConfig`) so the rates Google
 * shows match what a shopper is actually charged.
 *
 * Deliberately skipped: in-store pickup, `itemCondition`, `seller`.
 */

import { getAllowedCountries, US_STATES } from "~/lib/geo/regions";
import {
  calculateShipping,
  calculateZoneWeightShipping,
  normalizeWeightToLb,
  SHIPPING_TYPES,
} from "~/lib/shipping-utils";
import { buildZoneWeightConfig } from "~/lib/shipping-zone-config";

/**
 * SimplePress processes all payments in USD (hardcoded in the Stripe checkout
 * session), so every price / MonetaryAmount in JSON-LD uses this currency.
 */
export const SCHEMA_CURRENCY = "USD";

type JsonLdObject = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Input shapes (structural — any Business select with these fields fits)
// ---------------------------------------------------------------------------

export interface DeliveryTimeForSchema {
  handlingDaysMin?: number | null;
  handlingDaysMax?: number | null;
  transitDaysMin?: number | null;
  transitDaysMax?: number | null;
}

export interface ShippingForSchema extends DeliveryTimeForSchema {
  shippingType: string;
  shippingFlatRate: number | null;
  freeShippingThreshold: number | null;
  /** Extra countries beyond US (subset of ["CA","MX"]). Missing → US only. */
  salesCountries?: string[] | null;
  // zone_weight only
  shippingWeightTiers?: unknown;
  shippingFallbackRate?: number | null;
  shippingDefaultItemWeightLb?: number | null;
  zones?: Array<{
    name: string;
    states: string[];
    rates: Array<{ tierIndex: number; priceCents: number }>;
  }> | null;
}

export interface ReturnsForSchema {
  /** null → not set (emit nothing); 0 → no returns; N → N-day window. */
  returnWindowDays?: number | null;
  /** "free" | "customer_pays" | "flat_fee" */
  returnFees?: string | null;
  returnShippingFeeCents?: number | null;
  /** "by_mail" | "in_store" | "either" */
  returnMethod?: string | null;
  /** Extra countries beyond US (subset of ["CA","MX"]). Missing → US only. */
  salesCountries?: string[] | null;
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function monetaryAmount(cents: number): JsonLdObject {
  return {
    "@type": "MonetaryAmount",
    value: (cents / 100).toFixed(2),
    currency: SCHEMA_CURRENCY,
  };
}

/** Single value when there is one, array otherwise (schema.org allows both). */
function oneOrMany<T>(items: T[]): T | T[] {
  return items.length === 1 ? (items[0] as T) : items;
}

const US_STATE_CODES = new Set(US_STATES.map((s) => s.code));

/**
 * A product's shipping weight in pounds, mirroring checkout: a set weight is
 * normalised (kg → lb), otherwise the store's default item weight (else 0).
 */
export function productWeightLb(
  product: { weight?: number | null; weightUnit?: string | null },
  defaultLb: number | null | undefined,
): number {
  if (product.weight != null) {
    return normalizeWeightToLb(product.weight, product.weightUnit ?? null);
  }
  return defaultLb ?? 0;
}

function quantitativeDays(
  min: number | null | undefined,
  max: number | null | undefined,
): JsonLdObject | undefined {
  // Both-or-neither; a reversed/negative pair is malformed — emit nothing
  // rather than something Google would reject.
  if (min == null || max == null) return undefined;
  if (min < 0 || max < min) return undefined;
  return {
    "@type": "QuantitativeValue",
    minValue: min,
    maxValue: max,
    unitCode: "DAY",
  };
}

/**
 * ShippingDeliveryTime from the store's handling/transit day ranges. Each
 * pair is emitted only when both its min and max are set; returns undefined
 * when neither pair is.
 */
export function buildDeliveryTime(
  b: DeliveryTimeForSchema,
): JsonLdObject | undefined {
  const handlingTime = quantitativeDays(b.handlingDaysMin, b.handlingDaysMax);
  const transitTime = quantitativeDays(b.transitDaysMin, b.transitDaysMax);
  if (!handlingTime && !transitTime) return undefined;
  return {
    "@type": "ShippingDeliveryTime",
    ...(handlingTime ? { handlingTime } : {}),
    ...(transitTime ? { transitTime } : {}),
  };
}

function countryRegion(country: string): JsonLdObject {
  return { "@type": "DefinedRegion", addressCountry: country };
}

function usStatesRegion(states: string[]): JsonLdObject {
  return {
    "@type": "DefinedRegion",
    addressCountry: "US",
    addressRegion: oneOrMany(states),
  };
}

function shippingEntry(
  rateCents: number,
  destinations: JsonLdObject[],
  deliveryTime: JsonLdObject | undefined,
): JsonLdObject {
  return {
    "@type": "OfferShippingDetails",
    shippingRate: monetaryAmount(rateCents),
    shippingDestination: oneOrMany(destinations),
    ...(deliveryTime ? { deliveryTime } : {}),
  };
}

// ---------------------------------------------------------------------------
// Shipping
// ---------------------------------------------------------------------------

/**
 * OfferShippingDetails entries for a product at `priceCents` weighing
 * `weightLb`. Returns [] when the store's shipping type is unknown or nothing
 * can be priced honestly.
 *
 * - free → 0; flat_rate → flat; flat_rate_with_threshold → 0 at/over the
 *   threshold, else flat (all via the cart's `calculateShipping`).
 * - zone_weight: at/over the threshold → one 0-rate entry everywhere.
 *   Otherwise one entry per zone (US states as `addressRegion`), priced by
 *   `calculateZoneWeightShipping`; a zone that falls back with no stored
 *   fallback rate is skipped. US states in no zone, and CA/MX, get the stored
 *   fallback rate only when one is set. The checkout's $99.99 "don't ship"
 *   placeholder is never emitted.
 */
export function buildShippingDetails(
  b: ShippingForSchema,
  { priceCents, weightLb }: { priceCents: number; weightLb: number },
): JsonLdObject[] {
  const countries = getAllowedCountries(b.salesCountries ?? []);
  const deliveryTime = buildDeliveryTime(b);
  const allCountries = countries.map(countryRegion);

  if (
    b.shippingType === SHIPPING_TYPES.FREE ||
    b.shippingType === SHIPPING_TYPES.FLAT_RATE ||
    b.shippingType === SHIPPING_TYPES.FLAT_RATE_WITH_THRESHOLD
  ) {
    const rate = calculateShipping(priceCents, {
      shippingType: b.shippingType,
      shippingFlatRate: b.shippingFlatRate,
      freeShippingThreshold: b.freeShippingThreshold,
      offersInStorePickup: false,
      pickupLocation: null,
      pickupInstructions: null,
    });
    return [shippingEntry(rate, allCountries, deliveryTime)];
  }

  if (b.shippingType !== SHIPPING_TYPES.ZONE_WEIGHT) return [];

  if (
    b.freeShippingThreshold != null &&
    priceCents >= b.freeShippingThreshold
  ) {
    return [shippingEntry(0, allCountries, deliveryTime)];
  }

  const storedFallback = b.shippingFallbackRate ?? null;
  const baseConfig = {
    ...buildZoneWeightConfig({
      shippingWeightTiers: b.shippingWeightTiers,
      shippingFallbackRate: storedFallback,
      freeShippingThreshold: b.freeShippingThreshold,
      shippingDefaultItemWeightLb: b.shippingDefaultItemWeightLb ?? null,
      zones: b.zones ?? [],
    }),
    // Never the $99.99 placeholder: a fallback is only ever priced at the
    // owner's stored rate, and skipped (below) when there is none.
    fallbackRateCents: storedFallback ?? 0,
  };

  const entries: JsonLdObject[] = [];
  // Checkout matches a state to the FIRST zone listing it, so a state listed
  // twice only belongs to the earlier zone.
  const claimed = new Set<string>();

  for (const zone of baseConfig.zones) {
    const states = [
      ...new Set(zone.states.map((s) => s.trim().toUpperCase())),
    ].filter((s) => US_STATE_CODES.has(s) && !claimed.has(s));
    for (const s of states) claimed.add(s);
    const firstState = states[0];
    if (firstState === undefined) continue;

    let fellBack = false;
    const rate = calculateZoneWeightShipping({
      destinationState: firstState,
      destinationCountry: "US",
      totalWeightLb: weightLb,
      subtotalCents: priceCents,
      // Only this zone, so the lookup can't resolve to an earlier zone.
      config: { ...baseConfig, zones: [zone] },
      onFallback: () => {
        fellBack = true;
      },
    });
    if (fellBack && storedFallback === null) continue;
    entries.push(shippingEntry(rate, [usStatesRegion(states)], deliveryTime));
  }

  if (storedFallback !== null) {
    const unzoned = US_STATES.map((s) => s.code).filter(
      (code) => !claimed.has(code),
    );
    if (unzoned.length > 0) {
      entries.push(
        shippingEntry(storedFallback, [usStatesRegion(unzoned)], deliveryTime),
      );
    }
    const foreign = countries.filter((c) => c !== "US").map(countryRegion);
    if (foreign.length > 0) {
      entries.push(shippingEntry(storedFallback, foreign, deliveryTime));
    }
  }

  return entries;
}

// ---------------------------------------------------------------------------
// Returns
// ---------------------------------------------------------------------------

const RETURN_METHOD: Record<string, string | string[]> = {
  by_mail: "https://schema.org/ReturnByMail",
  in_store: "https://schema.org/ReturnInStore",
  either: [
    "https://schema.org/ReturnByMail",
    "https://schema.org/ReturnInStore",
  ],
};

function returnFeesFields(b: ReturnsForSchema): JsonLdObject {
  switch (b.returnFees) {
    case "free":
      return { returnFees: "https://schema.org/FreeReturn" };
    case "customer_pays":
      return {
        returnFees: "https://schema.org/ReturnFeesCustomerResponsibility",
      };
    case "flat_fee":
      // ReturnShippingFees without an amount is invalid — emit neither.
      if (b.returnShippingFeeCents == null || b.returnShippingFeeCents <= 0) {
        return {};
      }
      return {
        returnFees: "https://schema.org/ReturnShippingFees",
        returnShippingFeesAmount: monetaryAmount(b.returnShippingFeeCents),
      };
    default:
      return {};
  }
}

/**
 * MerchantReturnPolicy from the store's returns settings, or undefined when
 * the owner hasn't set a return window.
 */
export function buildMerchantReturnPolicy(
  b: ReturnsForSchema,
  { returnPolicyUrl }: { returnPolicyUrl?: string } = {},
): JsonLdObject | undefined {
  const days = b.returnWindowDays;
  if (days == null || days < 0) return undefined;

  const countries = getAllowedCountries(b.salesCountries ?? []);
  const policy: JsonLdObject = {
    "@type": "MerchantReturnPolicy",
    applicableCountry: oneOrMany(countries),
    returnPolicyCountry: "US",
  };

  if (days === 0) {
    policy.returnPolicyCategory =
      "https://schema.org/MerchantReturnNotPermitted";
  } else {
    policy.returnPolicyCategory =
      "https://schema.org/MerchantReturnFiniteReturnWindow";
    policy.merchantReturnDays = days;
    const method = b.returnMethod ? RETURN_METHOD[b.returnMethod] : undefined;
    if (method) policy.returnMethod = method;
    Object.assign(policy, returnFeesFields(b));
  }

  if (returnPolicyUrl) policy.merchantReturnLink = returnPolicyUrl;

  return policy;
}
