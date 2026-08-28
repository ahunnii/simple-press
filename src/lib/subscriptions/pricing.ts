import type { SubscriptionIntervalKey } from "./intervals";
import { resolveVariantPrice } from "~/lib/variant-price";

import { parseProductIntervals } from "./intervals";

/** Stripe's hard floor: it rejects any charge/line-item amount below $0.50. */
const STRIPE_MIN_CHARGE_CENTS = 50;

/** Matches `productSubscriptionFieldsSchema`'s `subscriptionDiscountPercent` bound. */
const MAX_DISCOUNT_PERCENT = 90;

/**
 * Thrown by `computeSubscriptionQuote` for bad inputs (`invalid_input`) or a
 * per-delivery item total under Stripe's $0.50 minimum (`below_minimum`).
 * Callers (the checkout route, admin product form) branch on `.code` rather
 * than message-matching.
 */
export class SubscriptionPricingError extends Error {
  readonly code: "invalid_input" | "below_minimum";

  constructor(code: "invalid_input" | "below_minimum", message: string) {
    super(message);
    this.name = "SubscriptionPricingError";
    this.code = code;
  }
}

export interface ComputeSubscriptionQuoteInput {
  /** Regular product/variant price in cents, before any subscribe-and-save discount. */
  listPriceCents: number;
  /** "Subscribe & save" percentage off `listPriceCents`, 0–90. Defaults to 0. */
  discountPercent?: number;
  quantity: number;
  /** Frozen per-delivery shipping cost in cents (0 for pickup or free shipping). */
  shippingCents: number;
}

export interface SubscriptionQuote {
  /** Discounted price per unit, in cents — this is the Stripe `price_data.unit_amount`. */
  unitAmountCents: number;
  /** `unitAmountCents * quantity` — the product line item's total. */
  itemsCents: number;
  shippingCents: number;
  /** `itemsCents + shippingCents` — what the customer is billed per delivery. */
  perDeliveryCents: number;
  /** `(listPriceCents - unitAmountCents) * quantity` — shown to the customer as "you save". */
  savingsCents: number;
}

function isNonNegativeInt(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}

/**
 * Apply a "subscribe & save" discount to a list price and derive the full set
 * of amounts a Subscribe checkout needs, enforcing Stripe's $0.50 minimum on
 * the *item* total (shipping can never rescue an item total that's too
 * small — see the plan's pricing invariant).
 */
export function computeSubscriptionQuote(
  input: ComputeSubscriptionQuoteInput,
): SubscriptionQuote {
  const { listPriceCents, quantity, shippingCents } = input;
  const discountPercent = input.discountPercent ?? 0;

  if (!isNonNegativeInt(listPriceCents)) {
    throw new SubscriptionPricingError(
      "invalid_input",
      "listPriceCents must be a non-negative integer",
    );
  }
  if (!isNonNegativeInt(shippingCents)) {
    throw new SubscriptionPricingError(
      "invalid_input",
      "shippingCents must be a non-negative integer",
    );
  }
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new SubscriptionPricingError(
      "invalid_input",
      "quantity must be a positive integer",
    );
  }
  if (
    !Number.isInteger(discountPercent) ||
    discountPercent < 0 ||
    discountPercent > MAX_DISCOUNT_PERCENT
  ) {
    throw new SubscriptionPricingError(
      "invalid_input",
      `discountPercent must be an integer between 0 and ${MAX_DISCOUNT_PERCENT}`,
    );
  }

  const unitAmountCents = Math.round(
    (listPriceCents * (100 - discountPercent)) / 100,
  );
  const itemsCents = unitAmountCents * quantity;

  if (itemsCents < STRIPE_MIN_CHARGE_CENTS) {
    throw new SubscriptionPricingError(
      "below_minimum",
      `Per-delivery item total (${itemsCents}c) is below Stripe's $0.50 minimum charge`,
    );
  }

  const savingsCents = (listPriceCents - unitAmountCents) * quantity;
  const perDeliveryCents = itemsCents + shippingCents;

  return {
    unitAmountCents,
    itemsCents,
    shippingCents,
    perDeliveryCents,
    savingsCents,
  };
}

/** Minimal shape `getSubscriptionOffer` needs from a Product (+ its variants). */
export interface SubscriptionOfferProductLike {
  price: number;
  subscriptionEnabled: boolean;
  /** Raw `Product.subscriptionIntervals` JSON column — parsed via `parseProductIntervals`. */
  subscriptionIntervals: unknown;
  subscriptionDiscountPercent: number;
  variants: ReadonlyArray<{ id: string; price: number | null }>;
}

export interface SubscriptionOffer {
  /** True only when the owner turned subscriptions on AND at least one valid cadence is configured. */
  enabled: boolean;
  intervals: SubscriptionIntervalKey[];
  discountPercent: number;
  /** The list price a `computeSubscriptionQuote` call should discount from. */
  listPriceCents: number;
}

/**
 * Derive the subscribe-panel offer for a product page: whether subscriptions
 * are available, which cadences, the configured discount, and the list price
 * for the selected variant (or the product's own price with no variant
 * selected / an unmatched variant id).
 */
export function getSubscriptionOffer(
  product: SubscriptionOfferProductLike,
  variantId: string | null,
): SubscriptionOffer {
  const intervals = parseProductIntervals(product.subscriptionIntervals);
  const enabled = product.subscriptionEnabled && intervals.length > 0;

  const variant = variantId
    ? product.variants.find((v) => v.id === variantId)
    : undefined;
  const listPriceCents = variant
    ? resolveVariantPrice(variant.price, product.price)
    : product.price;

  return {
    enabled,
    intervals,
    discountPercent: product.subscriptionDiscountPercent,
    listPriceCents,
  };
}
