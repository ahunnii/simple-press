/**
 * Server-safe helper to build a ZoneWeightConfig from a Business row.
 * Used by both the Stripe checkout session route and the shipping.quote
 * tRPC procedure so the zone+weight math has a single source of truth.
 */

import type { WeightTier, ZoneWeightConfig } from "~/lib/shipping-utils";

/**
 * Minimal shape of a Business row needed to build a ZoneWeightConfig.
 * Both create-session/route.ts (via getBusinessByDomain) and the tRPC
 * shipping.quote procedure pass a compatible object.
 */
interface BusinessWithZones {
  shippingWeightTiers: unknown; // Json field
  shippingFallbackRate: number | null;
  freeShippingThreshold: number | null;
  shippingDefaultItemWeightLb: number | null;
  zones: Array<{
    name: string;
    states: string[];
    rates: Array<{
      tierIndex: number;
      priceCents: number;
    }>;
  }>;
}

/**
 * Parse the `shippingWeightTiers` Json field into a typed WeightTier[].
 * Returns an empty array if the value is missing or malformed — callers
 * should handle this gracefully (e.g. fall back to the fallback rate).
 */
function parseWeightTiers(raw: unknown): WeightTier[] {
  if (!Array.isArray(raw)) return [];
  const result: WeightTier[] = [];
  for (const item of raw) {
    if (
      item !== null &&
      typeof item === "object" &&
      "label" in item &&
      "minLb" in item &&
      "maxLb" in item &&
      typeof (item as Record<string, unknown>).label === "string" &&
      typeof (item as Record<string, unknown>).minLb === "number" &&
      ((item as Record<string, unknown>).maxLb === null ||
        typeof (item as Record<string, unknown>).maxLb === "number")
    ) {
      result.push({
        label: (item as { label: string }).label,
        minLb: (item as { minLb: number }).minLb,
        maxLb: (item as { maxLb: number | null }).maxLb,
      });
    }
  }
  return result;
}

/**
 * A very large fallback rate (in cents) used when none is configured.
 * $99.99 — acts as a "don't ship to this destination" signal without
 * crashing the checkout flow.
 */
const LARGE_FALLBACK_CENTS = 9999;

/**
 * Build a ZoneWeightConfig from a Business row (with eager-loaded zones).
 */
export function buildZoneWeightConfig(
  business: BusinessWithZones,
): ZoneWeightConfig {
  const weightTiers = parseWeightTiers(business.shippingWeightTiers);

  const zones = business.zones.map((zone) => {
    // Convert ShippingRate rows to a Record<tierIndex, priceCents> map.
    const rates: Record<number, number> = {};
    for (const rate of zone.rates) {
      rates[rate.tierIndex] = rate.priceCents;
    }
    return {
      name: zone.name,
      states: zone.states,
      rates,
    };
  });

  return {
    zones,
    weightTiers,
    fallbackRateCents: business.shippingFallbackRate ?? LARGE_FALLBACK_CENTS,
    freeShippingThreshold: business.freeShippingThreshold,
  };
}
