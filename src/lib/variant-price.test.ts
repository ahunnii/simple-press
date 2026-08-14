import { describe, expect, it } from "vitest";

import {
  resolveVariantCompareAtPrice,
  resolveVariantPrice,
} from "./variant-price";

describe("resolveVariantPrice", () => {
  it("uses the variant price when it is set and non-zero", () => {
    expect(resolveVariantPrice(500, 1_000)).toBe(500);
  });

  it("inherits the product price when the variant price is 0", () => {
    expect(resolveVariantPrice(0, 1_000)).toBe(1_000);
  });

  it("inherits the product price when the variant price is null", () => {
    expect(resolveVariantPrice(null, 1_000)).toBe(1_000);
  });

  it("inherits the product price when the variant price is undefined", () => {
    expect(resolveVariantPrice(undefined, 1_000)).toBe(1_000);
  });
});

describe("resolveVariantCompareAtPrice", () => {
  it("uses the variant compare-at when the variant price is set and non-zero", () => {
    expect(resolveVariantCompareAtPrice(500, 800, 1_200)).toBe(800);
  });

  it("returns null (not the product compare-at) when the variant is priced but has no compare-at", () => {
    expect(resolveVariantCompareAtPrice(500, null, 1_200)).toBeNull();
  });

  it("inherits the product compare-at when the variant price is 0", () => {
    expect(resolveVariantCompareAtPrice(0, 800, 1_200)).toBe(1_200);
  });

  it("inherits the product compare-at when the variant price is null", () => {
    expect(resolveVariantCompareAtPrice(null, 800, 1_200)).toBe(1_200);
  });

  it("returns null when neither variant nor product has a compare-at", () => {
    expect(resolveVariantCompareAtPrice(0, null, null)).toBeNull();
    expect(
      resolveVariantCompareAtPrice(undefined, undefined, undefined),
    ).toBeNull();
  });
});
