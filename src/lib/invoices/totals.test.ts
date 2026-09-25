import { describe, expect, it } from "vitest";

import {
  balanceDueCents,
  computeInvoiceTotals,
  computeLineAmountCents,
} from "./totals";

describe("computeLineAmountCents", () => {
  it("multiplies whole quantities exactly", () => {
    expect(computeLineAmountCents(3, 1999)).toBe(5997);
  });

  it("rounds half-up on the exact decimal product, not the float one", () => {
    // 1.005 × 100 is 100.49999… in floating point; the true product is 100.5.
    expect(computeLineAmountCents(1.005, 100)).toBe(101);
    expect(computeLineAmountCents(0.5, 1)).toBe(1);
    expect(computeLineAmountCents(0.333, 100)).toBe(33);
    expect(computeLineAmountCents(2.5, 333)).toBe(833); // 832.5 → 833
  });

  it("is 0 for a free line", () => {
    expect(computeLineAmountCents(10, 0)).toBe(0);
  });
});

describe("computeInvoiceTotals", () => {
  const lines = [
    { id: "a", quantity: 2, unitPriceCents: 1000 },
    { id: "b", quantity: 1.5, unitPriceCents: 333 }, // 499.5 → 500
  ];

  it("sums rounded lines and passes line fields through", () => {
    const totals = computeInvoiceTotals({ lineItems: lines });
    expect(totals.lines.map((l) => [l.id, l.amountCents])).toEqual([
      ["a", 2000],
      ["b", 500],
    ]);
    expect(totals).toMatchObject({
      subtotalCents: 2500,
      discountCents: 0,
      taxableCents: 2500,
      taxCents: 0,
      totalCents: 2500,
    });
  });

  it("applies a flat discount in cents", () => {
    const totals = computeInvoiceTotals({
      lineItems: lines,
      discountType: "flat",
      discountValue: 700,
    });
    expect(totals.discountCents).toBe(700);
    expect(totals.totalCents).toBe(1800);
  });

  it("caps a flat discount at the subtotal", () => {
    const totals = computeInvoiceTotals({
      lineItems: lines,
      discountType: "flat",
      discountValue: 999_999,
      taxRateBps: 1000,
    });
    expect(totals.discountCents).toBe(2500);
    expect(totals.taxableCents).toBe(0);
    expect(totals.taxCents).toBe(0);
    expect(totals.totalCents).toBe(0);
  });

  it("applies a percent discount in basis points, rounded", () => {
    // 2500 × 12.5% = 312.5 → 313
    const totals = computeInvoiceTotals({
      lineItems: lines,
      discountType: "percent",
      discountValue: 1250,
    });
    expect(totals.discountCents).toBe(313);
    expect(totals.totalCents).toBe(2187);
  });

  it("caps a percent discount above 100% at the subtotal", () => {
    const totals = computeInvoiceTotals({
      lineItems: lines,
      discountType: "percent",
      discountValue: 20_000,
    });
    expect(totals.discountCents).toBe(2500);
    expect(totals.totalCents).toBe(0);
  });

  it("ignores discountValue when there is no discount type", () => {
    const totals = computeInvoiceTotals({
      lineItems: lines,
      discountType: null,
      discountValue: 500,
    });
    expect(totals.discountCents).toBe(0);
  });

  it("taxes the discounted amount, not the subtotal", () => {
    // subtotal 10000, discount 10% → 9000 taxable; 6.25% of 9000 = 562.5 → 563
    const totals = computeInvoiceTotals({
      lineItems: [{ quantity: 1, unitPriceCents: 10_000 }],
      discountType: "percent",
      discountValue: 1000,
      taxRateBps: 625,
    });
    expect(totals).toMatchObject({
      subtotalCents: 10_000,
      discountCents: 1000,
      taxableCents: 9000,
      taxCents: 563,
      totalCents: 9563,
    });
  });

  it("keeps total = subtotal − discount + tax exactly", () => {
    const totals = computeInvoiceTotals({
      lineItems: [
        { quantity: 3.333, unitPriceCents: 1234 },
        { quantity: 0.001, unitPriceCents: 99_999 },
      ],
      discountType: "flat",
      discountValue: 17,
      taxRateBps: 875,
    });
    expect(totals.totalCents).toBe(
      totals.subtotalCents - totals.discountCents + totals.taxCents,
    );
    expect(Number.isInteger(totals.taxCents)).toBe(true);
  });

  it("clamps negative (corrupted) discount and tax inputs to 0", () => {
    const totals = computeInvoiceTotals({
      lineItems: lines,
      discountType: "flat",
      discountValue: -500,
      taxRateBps: -100,
    });
    expect(totals.discountCents).toBe(0);
    expect(totals.taxCents).toBe(0);
    expect(totals.totalCents).toBe(2500);
  });

  it("handles an empty invoice", () => {
    expect(computeInvoiceTotals({ lineItems: [] }).totalCents).toBe(0);
  });
});

describe("balanceDueCents", () => {
  it("is total minus paid", () => {
    expect(balanceDueCents({ totalCents: 1000, amountPaidCents: 400 })).toBe(
      600,
    );
  });

  it("never goes negative", () => {
    expect(balanceDueCents({ totalCents: 1000, amountPaidCents: 1500 })).toBe(
      0,
    );
  });
});
