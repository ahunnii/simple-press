import type { DiscountCode } from "generated/prisma";

export type DiscountValidationFailure = {
  ok: false;
  error: string;
};

export type DiscountValidationSuccess = {
  ok: true;
  discountAmountCents: number;
};

export type DiscountValidationContext = {
  /**
   * Computed shipping cost in cents. Only used for `free_shipping` codes:
   * the discount amount equals this value so totals reconcile. When shipping
   * is not yet known (e.g. the storefront validate endpoint), omit it — the
   * code still validates and the amount is 0.
   */
  shippingCents?: number;
  /**
   * How many prior (non-cancelled) orders this customer has already placed
   * with this code. Only enforceable where the customer email is known —
   * callers do the DB count and pass it in so this function stays pure.
   */
  customerUsageCount?: number;
};

/**
 * Server-side discount rules: active, dates, usage (total + per-customer),
 * min purchase, then amount + max cap + cart cap.
 *
 * `free_shipping` codes skip the percentage/fixed math entirely: the discount
 * amount is the computed shipping cost (`context.shippingCents`), and
 * `maxDiscount` / cart clamping do not apply.
 */
export function validateAndComputeDiscount(
  discount: Pick<
    DiscountCode,
    | "active"
    | "startsAt"
    | "expiresAt"
    | "usageLimit"
    | "usageCount"
    | "perCustomerLimit"
    | "minPurchase"
    | "maxDiscount"
    | "type"
    | "value"
  >,
  cartTotalCents: number,
  context: DiscountValidationContext = {},
): DiscountValidationFailure | DiscountValidationSuccess {
  if (!discount.active) {
    return { ok: false, error: "This discount code is no longer active" };
  }

  if (discount.startsAt && new Date(discount.startsAt) > new Date()) {
    return { ok: false, error: "This code isn't active yet" };
  }

  if (discount.expiresAt && new Date(discount.expiresAt) < new Date()) {
    return { ok: false, error: "This discount code has expired" };
  }

  if (
    discount.usageLimit != null &&
    discount.usageCount >= discount.usageLimit
  ) {
    return {
      ok: false,
      error: "This discount code has reached its usage limit",
    };
  }

  if (
    discount.perCustomerLimit != null &&
    context.customerUsageCount != null &&
    context.customerUsageCount >= discount.perCustomerLimit
  ) {
    return {
      ok: false,
      error: "You've already used this code the maximum number of times",
    };
  }

  if (discount.minPurchase != null && cartTotalCents < discount.minPurchase) {
    const minAmount = (discount.minPurchase / 100).toFixed(2);
    return {
      ok: false,
      error: `Minimum purchase of $${minAmount} required`,
    };
  }

  // Free shipping: the discount is the shipping cost itself. maxDiscount and
  // cart-total clamping intentionally do NOT apply — the amount offsets the
  // shipping line, not the item subtotal.
  if (discount.type === "free_shipping") {
    return { ok: true, discountAmountCents: context.shippingCents ?? 0 };
  }

  let discountAmountCents = 0;
  if (discount.type === "percentage") {
    discountAmountCents = Math.round((cartTotalCents * discount.value) / 100);
  } else if (discount.type === "fixed") {
    discountAmountCents = discount.value;
  }

  if (
    discount.maxDiscount != null &&
    discountAmountCents > discount.maxDiscount
  ) {
    discountAmountCents = discount.maxDiscount;
  }

  if (discountAmountCents > cartTotalCents) {
    discountAmountCents = cartTotalCents;
  }

  return { ok: true, discountAmountCents };
}
