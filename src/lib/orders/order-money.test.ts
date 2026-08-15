import { describe, expect, it } from "vitest";

import type { OrderMoneyRow } from "./order-money";

import {
  EMPTY_ORDERS_BREAKDOWN,
  splitOrderMoney,
  summarizeOrderMoney,
} from "./order-money";

/** Build an OrderMoneyRow with sane defaults. */
function row(overrides: Partial<OrderMoneyRow> = {}): OrderMoneyRow {
  return {
    total: 0,
    tax: 0,
    shipping: 0,
    discount: 0,
    refundAmountCents: null,
    paymentMethod: "card",
    ...overrides,
  };
}

describe("splitOrderMoney", () => {
  it("splits an unrefunded order so the three components sum to total", () => {
    const split = splitOrderMoney(
      row({ total: 12000, tax: 800, shipping: 500, discount: 1000 }),
    );

    expect(split.productSalesCents).toBe(10700);
    expect(split.shippingCents).toBe(500);
    expect(split.taxCents).toBe(800);
    expect(split.totalChargedCents).toBe(12000);
    expect(split.refundedCents).toBe(0);
    expect(split.netCollectedCents).toBe(12000);
    expect(split.productSalesCents + split.shippingCents + split.taxCents).toBe(
      split.netCollectedCents,
    );
  });

  it("ignores subtotal/discount when deriving product sales", () => {
    // A manual order writes a caller-supplied subtotal and never writes
    // discount — only total/tax/shipping are trustworthy.
    const split = splitOrderMoney(
      row({ total: 5000, tax: 0, shipping: 0, discount: 0 }),
    );
    expect(split.productSalesCents).toBe(5000);
  });

  it("reduces each component proportionally on a partial refund", () => {
    // Exactly half refunded: every component should halve.
    const split = splitOrderMoney(
      row({ total: 10000, tax: 0, shipping: 1000, refundAmountCents: 5000 }),
    );

    expect(split.productSalesCents).toBe(4500);
    expect(split.shippingCents).toBe(500);
    expect(split.taxCents).toBe(0);
    expect(split.refundedCents).toBe(5000);
    expect(split.netCollectedCents).toBe(5000);
    expect(split.productSalesCents + split.shippingCents + split.taxCents).toBe(
      split.netCollectedCents,
    );
  });

  it("keeps the sum identity exact on an awkward proration (no off-by-one)", () => {
    // 33.33% refunded against non-round tax/shipping — the case where naive
    // per-component rounding drifts the sum by a cent or two.
    const split = splitOrderMoney(
      row({
        total: 10000,
        tax: 833,
        shipping: 599,
        refundAmountCents: 3333,
      }),
    );

    expect(split.netCollectedCents).toBe(6667);
    expect(split.taxCents).toBe(555);
    expect(split.shippingCents).toBe(399);
    expect(split.productSalesCents).toBe(5713);
    expect(split.productSalesCents + split.shippingCents + split.taxCents).toBe(
      split.netCollectedCents,
    );
  });

  it("holds the sum identity across a spread of awkward refunds", () => {
    const totals = [9999, 10000, 7777, 12345, 101];
    const taxes = [833, 7, 613, 0, 9];
    const shippings = [599, 1234, 0, 77, 13];
    const refunds = [3333, 1, 7776, 6172, 100];

    for (const total of totals) {
      for (const tax of taxes) {
        for (const shipping of shippings) {
          for (const refund of refunds) {
            if (tax + shipping > total) continue;
            const split = splitOrderMoney(
              row({ total, tax, shipping, refundAmountCents: refund }),
            );
            expect(
              split.productSalesCents + split.shippingCents + split.taxCents,
            ).toBe(split.netCollectedCents);
            expect(split.netCollectedCents).toBeGreaterThanOrEqual(0);
          }
        }
      }
    }
  });

  it("zeroes every component on a full refund", () => {
    const split = splitOrderMoney(
      row({ total: 8000, tax: 400, shipping: 600, refundAmountCents: 8000 }),
    );

    expect(split.productSalesCents).toBe(0);
    expect(split.shippingCents).toBe(0);
    expect(split.taxCents).toBe(0);
    expect(split.totalChargedCents).toBe(8000);
    expect(split.refundedCents).toBe(8000);
    expect(split.netCollectedCents).toBe(0);
  });

  it("clamps an over-refund instead of going negative", () => {
    const split = splitOrderMoney(
      row({ total: 8000, tax: 400, shipping: 600, refundAmountCents: 9999 }),
    );

    expect(split.refundedCents).toBe(8000);
    expect(split.netCollectedCents).toBe(0);
    expect(split.productSalesCents).toBe(0);
  });

  it("treats a null refundAmountCents as no refund", () => {
    const split = splitOrderMoney(
      row({ total: 4500, tax: 200, shipping: 300, refundAmountCents: null }),
    );

    expect(split.refundedCents).toBe(0);
    expect(split.netCollectedCents).toBe(4500);
    expect(split.productSalesCents).toBe(4000);
  });

  it("treats a zero or negative refundAmountCents as no refund", () => {
    expect(
      splitOrderMoney(row({ total: 4500, refundAmountCents: 0 }))
        .netCollectedCents,
    ).toBe(4500);
    expect(
      splitOrderMoney(row({ total: 4500, refundAmountCents: -100 }))
        .netCollectedCents,
    ).toBe(4500);
  });

  it("does not produce NaN when total is 0", () => {
    const split = splitOrderMoney(
      row({ total: 0, tax: 0, shipping: 0, refundAmountCents: 500 }),
    );

    for (const value of Object.values(split)) {
      expect(Number.isNaN(value)).toBe(false);
      expect(Number.isFinite(value)).toBe(true);
    }
    expect(split.netCollectedCents).toBe(0);
    expect(split.productSalesCents).toBe(0);
  });

  it("returns total as product sales for a manual order with no tax or shipping", () => {
    const split = splitOrderMoney(
      row({ total: 25000, tax: 0, shipping: 0, paymentMethod: "cash" }),
    );

    expect(split.productSalesCents).toBe(25000);
    expect(split.productSalesCents).toBe(split.totalChargedCents);
  });

  it("keeps every amount an integer", () => {
    const split = splitOrderMoney(
      row({ total: 9999, tax: 777, shipping: 333, refundAmountCents: 4321 }),
    );

    for (const value of Object.values(split)) {
      expect(Number.isInteger(value)).toBe(true);
    }
  });
});

describe("summarizeOrderMoney", () => {
  it("returns the empty breakdown for no rows", () => {
    expect(summarizeOrderMoney([])).toEqual(EMPTY_ORDERS_BREAKDOWN);
  });

  it("does not mutate EMPTY_ORDERS_BREAKDOWN between calls", () => {
    summarizeOrderMoney([row({ total: 5000 })]);
    expect(summarizeOrderMoney([])).toEqual(EMPTY_ORDERS_BREAKDOWN);
    expect(EMPTY_ORDERS_BREAKDOWN.totalChargedCents).toBe(0);
  });

  it("splits gross totals across stripe and manual payment methods", () => {
    const result = summarizeOrderMoney([
      row({ total: 10000, paymentMethod: "card" }),
      row({ total: 2500, paymentMethod: "cash" }),
      row({ total: 1500, paymentMethod: "check" }),
      row({ total: 1000, paymentMethod: "manual" }),
    ]);

    expect(result.viaStripeCents).toBe(10000);
    expect(result.viaManualCents).toBe(5000);
    expect(result.manualOrderCount).toBe(3);
    expect(result.orderCount).toBe(4);
    expect(result.totalChargedCents).toBe(15000);
  });

  it("counts gross total in the payment-method split even when refunded", () => {
    const result = summarizeOrderMoney([
      row({ total: 10000, paymentMethod: "card", refundAmountCents: 10000 }),
    ]);

    expect(result.viaStripeCents).toBe(10000);
    expect(result.netCollectedCents).toBe(0);
  });

  it("sums discounts informationally without prorating them", () => {
    const result = summarizeOrderMoney([
      row({ total: 9000, discount: 1000, refundAmountCents: 4500 }),
      row({ total: 5000, discount: 500 }),
    ]);

    expect(result.discountCents).toBe(1500);
  });

  it("equals the sum of the individual splits over N rows", () => {
    const rows = [
      row({ total: 10000, tax: 833, shipping: 599, refundAmountCents: 3333 }),
      row({ total: 4999, tax: 401, shipping: 0, refundAmountCents: null }),
      row({
        total: 25000,
        tax: 0,
        shipping: 0,
        paymentMethod: "cash",
        refundAmountCents: 12500,
      }),
      row({ total: 7777, tax: 613, shipping: 1234, refundAmountCents: 7777 }),
      row({ total: 0, tax: 0, shipping: 0 }),
    ];

    const result = summarizeOrderMoney(rows);
    const splits = rows.map(splitOrderMoney);
    const sum = (pick: (s: (typeof splits)[number]) => number) =>
      splits.reduce((acc, s) => acc + pick(s), 0);

    expect(result.productSalesCents).toBe(sum((s) => s.productSalesCents));
    expect(result.shippingCents).toBe(sum((s) => s.shippingCents));
    expect(result.taxCents).toBe(sum((s) => s.taxCents));
    expect(result.totalChargedCents).toBe(sum((s) => s.totalChargedCents));
    expect(result.refundedCents).toBe(sum((s) => s.refundedCents));
    expect(result.netCollectedCents).toBe(sum((s) => s.netCollectedCents));
    expect(result.orderCount).toBe(rows.length);

    // Aggregate sum identity must hold exactly.
    expect(
      result.productSalesCents + result.shippingCents + result.taxCents,
    ).toBe(result.netCollectedCents);
    expect(result.netCollectedCents).toBe(
      result.totalChargedCents - result.refundedCents,
    );
  });
});
