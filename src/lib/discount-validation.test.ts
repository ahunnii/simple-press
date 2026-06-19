import { describe, expect, it } from "vitest";

import { validateAndComputeDiscount } from "./discount-validation";

type DiscountArg = Parameters<typeof validateAndComputeDiscount>[0];

/** Build a valid, active percentage discount; override per-case. */
function makeDiscount(overrides: Partial<DiscountArg> = {}): DiscountArg {
  return {
    active: true,
    startsAt: null,
    expiresAt: null,
    usageLimit: null,
    usageCount: 0,
    minPurchase: null,
    maxDiscount: null,
    type: "percentage",
    value: 10,
    ...overrides,
  };
}

describe("validateAndComputeDiscount", () => {
  it("rejects an inactive code", () => {
    const result = validateAndComputeDiscount(
      makeDiscount({ active: false }),
      10_000,
    );
    expect(result).toEqual({
      ok: false,
      error: "This discount code is no longer active",
    });
  });

  it("rejects an expired code", () => {
    const result = validateAndComputeDiscount(
      makeDiscount({ expiresAt: new Date("2000-01-01") }),
      10_000,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/expired/i);
  });

  it("rejects a code that has not started yet", () => {
    const result = validateAndComputeDiscount(
      makeDiscount({ startsAt: new Date(Date.now() + 86_400_000) }),
      10_000,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/not yet valid/i);
  });

  it("rejects when the usage limit is reached", () => {
    const result = validateAndComputeDiscount(
      makeDiscount({ usageLimit: 5, usageCount: 5 }),
      10_000,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/usage limit/i);
  });

  it("rejects when the cart is below the minimum purchase", () => {
    const result = validateAndComputeDiscount(
      makeDiscount({ minPurchase: 20_000 }),
      10_000,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/minimum purchase of \$200/i);
  });

  it("computes a percentage discount", () => {
    const result = validateAndComputeDiscount(
      makeDiscount({ type: "percentage", value: 10 }),
      10_000,
    );
    expect(result).toEqual({ ok: true, discountAmountCents: 1_000 });
  });

  it("caps a percentage discount at maxDiscount", () => {
    const result = validateAndComputeDiscount(
      makeDiscount({ type: "percentage", value: 50, maxDiscount: 2_000 }),
      10_000,
    );
    expect(result).toEqual({ ok: true, discountAmountCents: 2_000 });
  });

  it("clamps a fixed discount that exceeds the cart total", () => {
    const result = validateAndComputeDiscount(
      makeDiscount({ type: "fixed", value: 15_000 }),
      10_000,
    );
    expect(result).toEqual({ ok: true, discountAmountCents: 10_000 });
  });
});
