import { describe, expect, it } from "vitest";

import {
  effectiveVariantPricesCents,
  estCardFeeCents,
  formatMarginRange,
  grossMarginPct,
  MARGIN_TARGETS,
  marginRange,
  priceForMarginCents,
  splitFor,
} from "./pricing-helper";

describe("estCardFeeCents", () => {
  it("is 2.9% + 30 cents, rounded to the cent", () => {
    expect(estCardFeeCents(2500)).toBe(103);
  });

  it("is 0 for non-positive prices", () => {
    expect(estCardFeeCents(0)).toBe(0);
    expect(estCardFeeCents(-500)).toBe(0);
  });
});

describe("grossMarginPct", () => {
  it("returns a rounded integer percent", () => {
    expect(grossMarginPct(2500, 1000)).toBe(60);
    expect(grossMarginPct(300, 100)).toBe(67);
  });

  it("is negative when cost exceeds price", () => {
    expect(grossMarginPct(1000, 1500)).toBe(-50);
  });

  it("is null without a usable price or cost", () => {
    expect(grossMarginPct(0, 1000)).toBeNull();
    expect(grossMarginPct(2500, null)).toBeNull();
    expect(grossMarginPct(2500, undefined)).toBeNull();
    expect(grossMarginPct(2500, 0)).toBeNull();
  });
});

describe("priceForMarginCents", () => {
  it("hits the target margin exactly when it divides evenly", () => {
    expect(priceForMarginCents(1000, 0.5)).toBe(2000);
  });

  it("rounds up so the target margin is always met", () => {
    expect(priceForMarginCents(999, 0.6)).toBe(2498);
    const price = priceForMarginCents(999, 0.6);
    expect((price - 999) / price).toBeGreaterThanOrEqual(0.6);
  });

  it("produces a 50% target at 2x cost", () => {
    expect(MARGIN_TARGETS.find((t) => t.pct === 50)?.note).toBe("2× cost");
  });
});

describe("splitFor", () => {
  it("splits a profitable sale", () => {
    expect(splitFor(2500, 1000)).toEqual({
      costCents: 1000,
      feeCents: 103,
      profitCents: 1397,
      isLoss: false,
    });
  });

  it("flags a loss when cost + fee exceed the price", () => {
    const split = splitFor(1000, 980);
    expect(split.feeCents).toBe(59);
    expect(split.profitCents).toBe(-39);
    expect(split.isLoss).toBe(true);
  });

  it("treats exactly zero profit as a loss", () => {
    expect(splitFor(1000, 1000 - 59).isLoss).toBe(true);
  });
});

describe("marginRange", () => {
  it("returns min and max across prices", () => {
    expect(marginRange(1000, [2000, 2500, 4000])).toEqual({ min: 50, max: 75 });
  });

  it("ignores non-positive prices", () => {
    expect(marginRange(1000, [0, -5, 2000])).toEqual({ min: 50, max: 50 });
  });

  it("is null without cost or valid prices", () => {
    expect(marginRange(null, [2000])).toBeNull();
    expect(marginRange(0, [2000])).toBeNull();
    expect(marginRange(1000, [])).toBeNull();
    expect(marginRange(1000, [0])).toBeNull();
  });
});

describe("formatMarginRange", () => {
  it("collapses equal bounds", () => {
    expect(formatMarginRange({ min: 50, max: 50 })).toBe("50%");
    expect(formatMarginRange({ min: 50, max: 75 })).toBe("50%–75%");
    expect(formatMarginRange(null)).toBeNull();
  });
});

describe("effectiveVariantPricesCents", () => {
  it("uses variant prices (already cents) when set", () => {
    expect(
      effectiveVariantPricesCents([{ price: 1500 }, { price: 2500 }], 10),
    ).toEqual([1500, 2500]);
  });

  it("falls back to the base price (dollars to cents) when unset", () => {
    expect(
      effectiveVariantPricesCents(
        [{ price: undefined }, { price: 2500 }],
        19.99,
      ),
    ).toEqual([1999, 2500]);
  });

  it("drops variants with no usable price", () => {
    expect(
      effectiveVariantPricesCents([{}, { price: 0 }, { price: 1200 }], null),
    ).toEqual([1200]);
    expect(effectiveVariantPricesCents([{}], 0)).toEqual([]);
  });
});
