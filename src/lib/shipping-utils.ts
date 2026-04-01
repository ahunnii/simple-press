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
