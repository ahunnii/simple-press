/** Storefront + Stripe shipping configuration (mirrors Business model fields). */
export type ShippingConfig = {
  shippingType: string;
  shippingFlatRate: number | null;
  freeShippingThreshold: number | null;
  offersInStorePickup: boolean;
  pickupLocation: string | null;
  pickupInstructions: string | null;
};

/** Fallback when cart UI is used without business context (legacy / unused routes). */
export const DEFAULT_SHIPPING_CONFIG: ShippingConfig = {
  shippingType: "free",
  shippingFlatRate: null,
  freeShippingThreshold: null,
  offersInStorePickup: false,
  pickupLocation: null,
  pickupInstructions: null,
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
  pickupLocation?: string | null;
  pickupInstructions?: string | null;
}): ShippingConfig {
  return {
    shippingType: business.shippingType,
    shippingFlatRate: business.shippingFlatRate,
    freeShippingThreshold: business.freeShippingThreshold,
    offersInStorePickup: business.offersInStorePickup,
    pickupLocation: business.pickupLocation ?? null,
    pickupInstructions: business.pickupInstructions ?? null,
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
 * Why `calculateZoneWeightShipping` reached for `fallbackRateCents` instead of a
 * cell from the rate matrix. Every one of these is a store-configuration fault
 * that is otherwise invisible: the function is total, so it quietly quotes the
 * flat fallback and nobody — owner, shopper, or log — is told why.
 *
 * These slugs are stable. They are the `shipping.fallback` Sentry tag value, so
 * renaming one orphans the history of an existing issue.
 */
export type ZoneWeightFallbackReason =
  | "non-us-destination"
  | "no-zone-match"
  | "no-weight-tier"
  | "missing-rate-cell";

/**
 * Everything a reporter needs to diagnose a fallback without going back to the
 * database for it.
 *
 * Deliberately carries no shopper identity. A destination state/country code
 * describes where the parcel is going, not who is buying — the street address,
 * name and email must never leave the request (`sendDefaultPii` is false).
 */
export type ZoneWeightFallbackInfo = {
  reason: ZoneWeightFallbackReason;
  /**
   * As supplied by the caller, NOT the trimmed/upper-cased form used for the
   * zone lookup — a store that saved "California" where a zone expects "CA"
   * only shows up if the raw value survives into the report.
   */
  destinationCountry: string;
  destinationState: string;
  totalWeightLb: number;
  /** The number actually returned to the caller. `0` here is free shipping. */
  fallbackRateCents: number;
  zoneCount: number;
  weightTierCount: number;
  /** `missing-rate-cell` only — the zone whose rate matrix has the hole. */
  matchedZoneName?: string;
  /** `missing-rate-cell` only — the column index that had no rate row. */
  tierIndex?: number;
};

/**
 * Calculate shipping cost in cents for a zone+weight rate matrix.
 *
 * Resolution order:
 *  1. Free-shipping threshold check (subtotal ≥ threshold → $0).
 *  2. Destination must be in the US and match a zone — otherwise fallback rate.
 *  3. Find the weight tier that brackets totalWeightLb.
 *  4. Return rates[tierIndex] for the matched zone, or fallback if the cell is missing.
 *
 * Steps 2–4 have four separate ways of landing on `fallbackRateCents`, and the
 * shopper is charged it either way. `onFallback` exists so a caller that knows
 * which store it is serving can say so out loud; it never changes the number.
 */
export function calculateZoneWeightShipping(input: {
  destinationState: string;
  destinationCountry: string;
  totalWeightLb: number;
  subtotalCents: number;
  config: ZoneWeightConfig;
  /**
   * Optional observer, invoked immediately before a fallback rate is returned.
   *
   * A notification and nothing more: it cannot alter the returned number, and
   * with it omitted this function behaves exactly as it always has. That is the
   * point — the calculation stays pure and unit-testable with no Sentry import
   * and no tenant context, while the two request-scoped call sites (which are
   * the only places that know the `businessId`) supply a throttled reporter.
   */
  onFallback?: (info: ZoneWeightFallbackInfo) => void;
}): number {
  const {
    destinationState,
    destinationCountry,
    totalWeightLb,
    subtotalCents,
    config,
    onFallback,
  } = input;

  // Single exit for all four fallback branches so they cannot drift on which
  // context they report. Returns `config.fallbackRateCents` unchanged, so each
  // branch below stays a one-line `return applyFallback(...)` that yields exactly
  // the value it yielded before this was added.
  const applyFallback = (
    reason: ZoneWeightFallbackReason,
    cellDetail?: { matchedZoneName: string; tierIndex: number },
  ): number => {
    onFallback?.({
      reason,
      destinationCountry,
      destinationState,
      totalWeightLb,
      fallbackRateCents: config.fallbackRateCents,
      zoneCount: config.zones.length,
      weightTierCount: config.weightTiers.length,
      ...cellDetail,
    });
    return config.fallbackRateCents;
  };

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
    // The matrix is keyed by US state, so a store that sells to CA or MX
    // (`salesCountries` allows it, the checkout country picker offers it) prices
    // every one of those orders at the flat fallback. Not a shopper error and
    // not a bug in this function — a gap between what the store sells and what
    // its rate table can express, which nothing else surfaces.
    return applyFallback("non-us-destination");
  }

  const normalizedState = destinationState.trim().toUpperCase();
  const matchedZone = config.zones.find((z) =>
    z.states.some((s) => s.trim().toUpperCase() === normalizedState),
  );

  if (!matchedZone) {
    // No zone lists this state. Both call sites feed this a canonical 2-letter
    // code chosen from a <Select> (never free text), so a miss here is the owner
    // having built their zones from a partial state list — not a half-typed
    // address — and the report is worth acting on.
    return applyFallback("no-zone-match");
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
    // Weight didn't fit any tier (shouldn't happen with a well-formed config).
    // It does happen: `parseWeightTiers` in shipping-config.ts silently DROPS
    // any tier row missing `label`/`minLb`/`maxLb`, so a malformed
    // `shippingWeightTiers` JSON blob leaves gaps — or no tiers at all — and
    // every order in the gap is quoted the fallback.
    return applyFallback("no-weight-tier");
  }

  // 4. Cell lookup
  // Kept as `??` with the fallback expression swapped in rather than an
  // `if (cellPrice === undefined)` guard, so the returned value is provably the
  // same as before in every case: `applyFallback` returns `config.fallbackRateCents`
  // and only runs when the cell is genuinely absent. A hole here means the zone
  // and the tier both exist but no ShippingRate row joins them.
  const cellPrice = matchedZone.rates[tierIndex];
  return (
    cellPrice ??
    applyFallback("missing-rate-cell", {
      matchedZoneName: matchedZone.name,
      tierIndex,
    })
  );
}
