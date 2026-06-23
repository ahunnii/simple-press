/**
 * Default zone + weight rate matrix generator.
 *
 * Produces a ready-to-edit starter config for a US-based shipper given their
 * origin state. All 50 states + DC are mapped to one of six regions; zones are
 * then assigned by how far each region is from the shipper's origin region.
 *
 * Cell prices (cents) are approximate and intentionally editable — they are
 * seeded at sensible round numbers that scale with both zone distance and
 * weight tier, not carrier-accurate quotes.
 */

import type { WeightTier } from "~/lib/shipping-utils";

// ──────────────────────────────────────────────────────────────────────────────
// Region map  (all 50 states + DC)
// ──────────────────────────────────────────────────────────────────────────────

export type UsRegion =
  | "Northeast"
  | "South"
  | "Midwest"
  | "Plains"
  | "Mountain"
  | "West";

/** Maps every US state code (+ DC) to its region. */
export const STATE_REGION_MAP: Record<string, UsRegion> = {
  // Northeast
  CT: "Northeast",
  ME: "Northeast",
  MA: "Northeast",
  NH: "Northeast",
  NJ: "Northeast",
  NY: "Northeast",
  PA: "Northeast",
  RI: "Northeast",
  VT: "Northeast",
  DE: "Northeast",
  MD: "Northeast",
  DC: "Northeast",

  // South
  AL: "South",
  AR: "South",
  FL: "South",
  GA: "South",
  KY: "South",
  LA: "South",
  MS: "South",
  NC: "South",
  SC: "South",
  TN: "South",
  VA: "South",
  WV: "South",
  TX: "South",
  OK: "South",

  // Midwest
  IL: "Midwest",
  IN: "Midwest",
  IA: "Midwest",
  MI: "Midwest",
  MN: "Midwest",
  MO: "Midwest",
  OH: "Midwest",
  WI: "Midwest",

  // Plains
  KS: "Plains",
  NE: "Plains",
  ND: "Plains",
  SD: "Plains",

  // Mountain
  AZ: "Mountain",
  CO: "Mountain",
  ID: "Mountain",
  MT: "Mountain",
  NM: "Mountain",
  NV: "Mountain",
  UT: "Mountain",
  WY: "Mountain",

  // West
  AK: "West",
  CA: "West",
  HI: "West",
  OR: "West",
  WA: "West",
};

// ──────────────────────────────────────────────────────────────────────────────
// Region adjacency / distance ordering
//
// For each origin region we list all six regions ordered from "closest" (index 0)
// to "farthest" (index 5).  Index 0 is always the origin region itself.
// ──────────────────────────────────────────────────────────────────────────────

const REGION_ORDER_FROM: Record<UsRegion, UsRegion[]> = {
  Midwest: ["Midwest", "Plains", "South", "Northeast", "Mountain", "West"],
  Northeast: ["Northeast", "South", "Midwest", "Plains", "Mountain", "West"],
  South: ["South", "Midwest", "Northeast", "Plains", "Mountain", "West"],
  Plains: ["Plains", "Midwest", "South", "Mountain", "Northeast", "West"],
  Mountain: ["Mountain", "Plains", "West", "Midwest", "South", "Northeast"],
  West: ["West", "Mountain", "Plains", "Midwest", "South", "Northeast"],
};

// ──────────────────────────────────────────────────────────────────────────────
// Default weight tiers (4 tiers)
// ──────────────────────────────────────────────────────────────────────────────

export const DEFAULT_WEIGHT_TIERS: WeightTier[] = [
  { label: "0 – 5 lb", minLb: 0, maxLb: 5 },
  { label: "5 – 15 lb", minLb: 5, maxLb: 15 },
  { label: "15 – 40 lb", minLb: 15, maxLb: 40 },
  { label: "40 lb+", minLb: 40, maxLb: null },
];

// ──────────────────────────────────────────────────────────────────────────────
// Seed prices (cents) — [zone 1..5][tier 0..3]
//
// Zone 1 = origin region (cheapest), Zone 5 = farthest (most expensive).
// Tiers go 0 (lightest) → 3 (heaviest).
// Numbers are round-dollar estimates meant as editable starting points.
// ──────────────────────────────────────────────────────────────────────────────

/** seedPrices[zoneIndex 0..4][tierIndex 0..3] — all values in cents */
const SEED_PRICES: readonly (readonly number[])[] = [
  //  0–5 lb   5–15 lb  15–40 lb  40 lb+
  [599, 999, 1799, 3499], // Zone 1 (origin region)
  [799, 1299, 2399, 4499], // Zone 2
  [1099, 1799, 3199, 5999], // Zone 3
  [1399, 2299, 4199, 7499], // Zone 4
  [1799, 2999, 5499, 9999], // Zone 5 (farthest)
];

// ──────────────────────────────────────────────────────────────────────────────
// Generator
// ──────────────────────────────────────────────────────────────────────────────

export type DefaultZoneWeightConfig = {
  originState: string;
  weightTiers: WeightTier[];
  zones: Array<{
    name: string;
    states: string[];
    /** tierIndex → priceCents */
    rates: Record<number, number>;
  }>;
  fallbackRateCents: number;
  freeShippingThreshold: number | null;
};

/**
 * Generate a starter zone+weight rate config for a given origin state.
 *
 * - Produces exactly 5 zones, each collecting all states whose region falls at
 *   the same distance from the origin region.
 * - Every US state in STATE_REGION_MAP ends up in exactly one zone.
 * - Prices scale with both zone distance and weight tier (see SEED_PRICES).
 * - `fallbackRateCents` is set to the Zone 5 / heaviest-tier price (international
 *   or unmatched domestic destinations cost the most).
 */
export function generateDefaultZoneWeightConfig(
  originState: string,
): DefaultZoneWeightConfig {
  const upperOrigin = originState.toUpperCase();
  const originRegion: UsRegion = STATE_REGION_MAP[upperOrigin] ?? "Midwest";
  const regionOrder = REGION_ORDER_FROM[originRegion];

  // Build a map: region → zone index (0-based, 0 = origin)
  const regionToZoneIndex = new Map<UsRegion, number>();
  regionOrder.forEach((region, idx) => {
    regionToZoneIndex.set(region, idx);
  });

  // Bucket every state into the 5 zones (indices 0..4, displayed as Zone 1..5)
  const zoneBuckets: string[][] = [[], [], [], [], []];
  for (const [stateCode, region] of Object.entries(STATE_REGION_MAP)) {
    const zoneIdx = regionToZoneIndex.get(region) ?? 4;
    // Clamp to 0..4 (there are 6 regions but only 5 zones — merge the two
    // farthest regions into zone 4 if needed; with 6 regions mapped 0..5 we
    // cap at 4 so no state is ever dropped).
    const clampedIdx = Math.min(zoneIdx, 4);
    const bucket = zoneBuckets[clampedIdx];
    if (bucket !== undefined) {
      bucket.push(stateCode);
    }
  }

  // Build the zone objects
  const zones = zoneBuckets.map((states, zoneIdx) => {
    const tierRows = SEED_PRICES[zoneIdx];
    const rates: Record<number, number> = {};
    DEFAULT_WEIGHT_TIERS.forEach((_, tierIndex) => {
      const price = tierRows?.[tierIndex];
      if (price !== undefined) {
        rates[tierIndex] = price;
      }
    });

    return {
      name: `Zone ${zoneIdx + 1}`,
      states: states.slice().sort(), // deterministic sort
      rates,
    };
  });

  // Fallback = Zone 5 heaviest cell price
  const zone5Prices = SEED_PRICES[4];
  const fallbackRateCents =
    zone5Prices?.[DEFAULT_WEIGHT_TIERS.length - 1] ?? 9999;

  return {
    originState: upperOrigin,
    weightTiers: DEFAULT_WEIGHT_TIERS,
    zones,
    fallbackRateCents,
    freeShippingThreshold: null,
  };
}
