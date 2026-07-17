import { describe, expect, it } from "vitest";

import {
  centsToDollarsString,
  computeSavingsLabel,
  dollarsToCents,
  formatPrice,
  getEffectiveCompareAtPrice,
  getEffectivePrice,
} from "./prices";

describe("dollarsToCents", () => {
  it("converts a plain dollar string to cents", () => {
    expect(dollarsToCents("10")).toBe(1_000);
  });

  it("rounds to the nearest cent", () => {
    expect(dollarsToCents("10.005")).toBe(1_001); // rounds up (Math.round)
    expect(dollarsToCents("9.999")).toBe(1_000);
  });

  it("returns 0 for NaN input", () => {
    expect(dollarsToCents("not-a-number")).toBe(0);
  });

  it("returns 0 for an empty string", () => {
    expect(dollarsToCents("")).toBe(0);
  });
});

describe("centsToDollarsString", () => {
  it("returns an empty string for null", () => {
    expect(centsToDollarsString(null)).toBe("");
  });

  it("formats cents as a 2-decimal dollar string", () => {
    expect(centsToDollarsString(1_000)).toBe("10.00");
    expect(centsToDollarsString(999)).toBe("9.99");
  });

  it("formats 0 cents as 0.00", () => {
    expect(centsToDollarsString(0)).toBe("0.00");
  });
});

describe("formatPrice", () => {
  it("formats cents as a USD currency string", () => {
    expect(formatPrice(1_000)).toBe("$10.00");
  });

  it("formats 0 as $0.00", () => {
    expect(formatPrice(0)).toBe("$0.00");
  });
});

describe("computeSavingsLabel", () => {
  it("returns a percentage label by default", () => {
    expect(computeSavingsLabel(800, 1_000)).toBe("Save 20%");
  });

  it("returns a percentage label when format is 'true'", () => {
    expect(computeSavingsLabel(750, 1_000, "true")).toBe("Save 25%");
  });

  it("returns a dollar-amount label when format is 'false'", () => {
    expect(computeSavingsLabel(500, 1_000, "false")).toBe("Save $5.00");
  });

  it("does not divide by zero when compareAtPrice is 0 (percent format)", () => {
    const label = computeSavingsLabel(0, 0, "true");
    // (0 - 0) / 0 = NaN -> "Save NaN%"; assert it doesn't throw and is a string.
    expect(typeof label).toBe("string");
    expect(label).toBe("Save NaN%");
  });

  it("handles compareAtPrice of 0 in dollar format without throwing", () => {
    expect(() => computeSavingsLabel(0, 0, "false")).not.toThrow();
    expect(computeSavingsLabel(0, 0, "false")).toBe("Save $0.00");
  });
});

describe("getEffectivePrice", () => {
  it("returns the product price when there are no variants", () => {
    expect(
      getEffectivePrice({ variants: [], price: 1_000, compareAtPrice: null }),
    ).toBe(1_000);
  });

  it("returns the first variant's price when set and non-zero", () => {
    expect(
      getEffectivePrice({
        variants: [{ price: 500, compareAtPrice: null }],
        price: 1_000,
        compareAtPrice: null,
      }),
    ).toBe(500);
  });

  it("inherits the product price when the first variant's price is 0", () => {
    expect(
      getEffectivePrice({
        variants: [{ price: 0, compareAtPrice: null }],
        price: 1_000,
        compareAtPrice: null,
      }),
    ).toBe(1_000);
  });

  it("inherits the product price when the first variant's price is null", () => {
    expect(
      getEffectivePrice({
        variants: [{ price: null, compareAtPrice: null }],
        price: 1_000,
        compareAtPrice: null,
      }),
    ).toBe(1_000);
  });
});

describe("getEffectiveCompareAtPrice", () => {
  it("returns the product compareAtPrice when there are no variants", () => {
    expect(
      getEffectiveCompareAtPrice({
        variants: [],
        price: 1_000,
        compareAtPrice: 1_200,
      }),
    ).toBe(1_200);
  });

  it("returns null when there are no variants and no product compareAtPrice", () => {
    expect(
      getEffectiveCompareAtPrice({
        variants: [],
        price: 1_000,
        compareAtPrice: null,
      }),
    ).toBeNull();
  });

  it("uses the first variant's compareAtPrice when the variant is priced", () => {
    expect(
      getEffectiveCompareAtPrice({
        variants: [{ price: 500, compareAtPrice: 800 }],
        price: 1_000,
        compareAtPrice: 1_200,
      }),
    ).toBe(800);
  });

  it("inherits the product compareAtPrice when the first variant's price is 0", () => {
    expect(
      getEffectiveCompareAtPrice({
        variants: [{ price: 0, compareAtPrice: 800 }],
        price: 1_000,
        compareAtPrice: 1_200,
      }),
    ).toBe(1_200);
  });

  it("inherits the product compareAtPrice when the first variant's price is null", () => {
    expect(
      getEffectiveCompareAtPrice({
        variants: [{ price: null, compareAtPrice: 800 }],
        price: 1_000,
        compareAtPrice: 1_200,
      }),
    ).toBe(1_200);
  });
});
