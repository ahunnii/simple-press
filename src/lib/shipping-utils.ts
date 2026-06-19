/** Storefront + Stripe shipping configuration (mirrors Business model fields). */
export type ShippingConfig = {
  shippingType: string;
  shippingFlatRate: number | null;
  freeShippingThreshold: number | null;
  offersInStorePickup: boolean;
};

/** Fallback when cart UI is used without business context (legacy / unused routes). */
export const DEFAULT_SHIPPING_CONFIG: ShippingConfig = {
  shippingType: "free",
  shippingFlatRate: null,
  freeShippingThreshold: null,
  offersInStorePickup: false,
};

export const SHIPPING_TYPES = {
  FREE: "free",
  FLAT_RATE: "flat_rate",
  FLAT_RATE_WITH_THRESHOLD: "flat_rate_with_threshold",
  ZONE_WEIGHT: "zone_weight",
} as const;

/**
 * Returns shipping cost in cents for the cart subtotal (before tax).
 */
export function calculateShipping(
  subtotalCents: number,
  config: ShippingConfig,
): number {
  const type = config.shippingType;

  if (type === SHIPPING_TYPES.FREE) {
    return 0;
  }

  const flat = config.shippingFlatRate ?? 0;

  if (type === SHIPPING_TYPES.FLAT_RATE) {
    return flat;
  }

  if (type === SHIPPING_TYPES.FLAT_RATE_WITH_THRESHOLD) {
    const threshold = config.freeShippingThreshold;
    if (threshold != null && subtotalCents >= threshold) {
      return 0;
    }
    return flat;
  }

  return 0;
}

/**
 * Remaining subtotal (in cents) until free shipping applies, or null if not applicable.
 */
export function getAmountUntilFreeShipping(
  subtotalCents: number,
  config: ShippingConfig,
): number | null {
  if (config.shippingType !== SHIPPING_TYPES.FLAT_RATE_WITH_THRESHOLD) {
    return null;
  }
  const threshold = config.freeShippingThreshold;
  if (threshold == null) {
    return null;
  }
  const remaining = threshold - subtotalCents;
  return remaining > 0 ? remaining : null;
}

/**
 * Progress toward free shipping (0–1). Returns null if not threshold mode.
 */
export function getFreeShippingProgress(
  subtotalCents: number,
  config: ShippingConfig,
): number | null {
  if (config.shippingType !== SHIPPING_TYPES.FLAT_RATE_WITH_THRESHOLD) {
    return null;
  }
  const threshold = config.freeShippingThreshold;
  if (threshold == null || threshold <= 0) {
    return null;
  }
  return Math.min(1, subtotalCents / threshold);
}

export function shippingConfigFromBusiness(business: {
  shippingType: string;
  shippingFlatRate: number | null;
  freeShippingThreshold: number | null;
  offersInStorePickup: boolean;
}): ShippingConfig {
  return {
    shippingType: business.shippingType,
    shippingFlatRate: business.shippingFlatRate,
    freeShippingThreshold: business.freeShippingThreshold,
    offersInStorePickup: business.offersInStorePickup,
  };
}

// ============================================
// ZONE + WEIGHT SHIPPING
// ============================================

/**
 * A single weight tier defining a column in the rate matrix.
 * The last tier in any list has maxLb: null (unbounded top tier).
 */
export type WeightTier = {
  label: string;
  minLb: number;
  maxLb: number | null;
};

/**
 * Full config for zone+weight shipping, loaded from Business + ShippingZone + ShippingRate rows.
 * `rates` is keyed by tier index (matching the position in `weightTiers`).
 */
export type ZoneWeightConfig = {
  zones: Array<{
    name: string;
    states: string[];
    rates: Record<number, number>; // tierIndex → priceCents
  }>;
  weightTiers: WeightTier[];
  fallbackRateCents: number;
  freeShippingThreshold: number | null;
};

/**
 * Normalise a product weight to pounds.
 * Supports "kg" (× 2.20462) and "lb" / anything else (pass-through).
 */
export function normalizeWeightToLb(
  weight: number,
  unit: string | null,
): number {
  if (unit?.toLowerCase() === "kg") {
    return weight * 2.20462;
  }
  return weight;
}

/**
 * Calculate shipping cost in cents for a zone+weight rate matrix.
 *
 * Resolution order:
 *  1. Free-shipping threshold check (subtotal ≥ threshold → $0).
 *  2. Destination must be in the US and match a zone — otherwise fallback rate.
 *  3. Find the weight tier that brackets totalWeightLb.
 *  4. Return rates[tierIndex] for the matched zone, or fallback if the cell is missing.
 */
export function calculateZoneWeightShipping(input: {
  destinationState: string;
  destinationCountry: string;
  totalWeightLb: number;
  subtotalCents: number;
  config: ZoneWeightConfig;
}): number {
  const { destinationState, destinationCountry, totalWeightLb, subtotalCents, config } =
    input;

  // 1. Free-shipping threshold
  if (
    config.freeShippingThreshold != null &&
    subtotalCents >= config.freeShippingThreshold
  ) {
    return 0;
  }

  // 2. Zone lookup — US only.
  // Normalise the destination state so free-text input ("ca", " Ca ") still
  // matches the stored 2-letter zone codes; otherwise the shopper would silently
  // fall through to the fallback rate.
  if (destinationCountry !== "US") {
    return config.fallbackRateCents;
  }

  const normalizedState = destinationState.trim().toUpperCase();
  const matchedZone = config.zones.find((z) =>
    z.states.some((s) => s.trim().toUpperCase() === normalizedState),
  );

  if (!matchedZone) {
    return config.fallbackRateCents;
  }

  // 3. Weight tier lookup
  let tierIndex = -1;
  for (let i = 0; i < config.weightTiers.length; i++) {
    const tier = config.weightTiers[i];
    if (tier === undefined) continue;
    const aboveMin = totalWeightLb >= tier.minLb;
    const belowMax = tier.maxLb === null || totalWeightLb < tier.maxLb;
    if (aboveMin && belowMax) {
      tierIndex = i;
      break;
    }
  }

  if (tierIndex === -1) {
    // Weight didn't fit any tier (shouldn't happen with a well-formed config)
    return config.fallbackRateCents;
  }

  // 4. Cell lookup
  const cellPrice = matchedZone.rates[tierIndex];
  return cellPrice ?? config.fallbackRateCents;
}
