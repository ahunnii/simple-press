import { describe, expect, it } from "vitest";

import {
  bpsToPercentInputValue,
  centsToMoneyInputValue,
  moneyInputValueToCents,
  percentInputValueToBps,
} from "./money";

describe("centsToMoneyInputValue", () => {
  it("divides cents into dollars", () => {
    expect(centsToMoneyInputValue(1999)).toBe(19.99);
    expect(centsToMoneyInputValue(0)).toBe(0);
  });

  it("returns null for null/undefined/NaN", () => {
    expect(centsToMoneyInputValue(null)).toBeNull();
    expect(centsToMoneyInputValue(undefined)).toBeNull();
    expect(centsToMoneyInputValue(Number.NaN)).toBeNull();
  });
});

describe("moneyInputValueToCents", () => {
  it("rounds dollars to whole cents", () => {
    expect(moneyInputValueToCents(19.99)).toBe(1999);
    expect(moneyInputValueToCents(0)).toBe(0);
  });

  it("rounds a half-cent up", () => {
    expect(moneyInputValueToCents(19.005)).toBe(1901);
  });

  it("treats null/NaN as zero", () => {
    expect(moneyInputValueToCents(null)).toBe(0);
    expect(moneyInputValueToCents(Number.NaN)).toBe(0);
  });
});

describe("bpsToPercentInputValue", () => {
  it("divides basis points into a percent", () => {
    expect(bpsToPercentInputValue(625)).toBe(6.25);
    expect(bpsToPercentInputValue(10_000)).toBe(100);
    expect(bpsToPercentInputValue(0)).toBe(0);
  });

  it("returns null for null/undefined/NaN", () => {
    expect(bpsToPercentInputValue(null)).toBeNull();
    expect(bpsToPercentInputValue(undefined)).toBeNull();
    expect(bpsToPercentInputValue(Number.NaN)).toBeNull();
  });
});

describe("percentInputValueToBps", () => {
  it("rounds a percent to whole basis points", () => {
    expect(percentInputValueToBps(6.25)).toBe(625);
    expect(percentInputValueToBps(100)).toBe(10_000);
  });

  it("treats null/NaN as zero", () => {
    expect(percentInputValueToBps(null)).toBe(0);
    expect(percentInputValueToBps(Number.NaN)).toBe(0);
  });
});
