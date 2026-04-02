import type { DiscountCode } from "generated/prisma";

export type DiscountValidationFailure = {
  ok: false;
  error: string;
};

export type DiscountValidationSuccess = {
  ok: true;
  discountAmountCents: number;
};

/**
 * Server-side discount rules: active, dates, usage, min purchase, then amount + max cap + cart cap.
 */
export function validateAndComputeDiscount(
  discount: Pick<
    DiscountCode,
    | "active"
    | "startsAt"
    | "expiresAt"
    | "usageLimit"
    | "usageCount"
    | "minPurchase"
    | "maxDiscount"
    | "type"
    | "value"
  >,
  cartTotalCents: number,
): DiscountValidationFailure | DiscountValidationSuccess {
  if (!discount.active) {
    return { ok: false, error: "This discount code is no longer active" };
  }

  if (discount.startsAt && new Date(discount.startsAt) > new Date()) {
    return { ok: false, error: "This discount code is not yet valid" };
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
    discount.minPurchase != null &&
    cartTotalCents < discount.minPurchase
  ) {
    const minAmount = (discount.minPurchase / 100).toFixed(2);
    return {
      ok: false,
      error: `Minimum purchase of $${minAmount} required`,
    };
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
