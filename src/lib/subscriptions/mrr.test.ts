import { describe, expect, it } from "vitest";

import type { RecurringSubscriptionLike } from "./mrr";

import {
  computeMonthlyRecurringCents,
  monthlyRecurringCentsFor,
  perDeliveryCentsFor,
} from "./mrr";

function sub(
  overrides: Partial<RecurringSubscriptionLike> = {},
): RecurringSubscriptionLike {
  return {
    status: "active",
    intervalKey: "month:1",
    unitAmountCents: 1000,
    quantity: 1,
    shippingCents: 0,
    deliveryMethod: "ship",
    ...overrides,
  };
}

describe("perDeliveryCentsFor", () => {
  it("sums unit price times quantity plus shipping", () => {
    expect(
      perDeliveryCentsFor(
        sub({ unitAmountCents: 500, quantity: 2, shippingCents: 300 }),
      ),
    ).toBe(1300);
  });

  it("drops shipping for pickup deliveries", () => {
    expect(
      perDeliveryCentsFor(
        sub({
          unitAmountCents: 500,
          quantity: 2,
          shippingCents: 300,
          deliveryMethod: "pickup",
        }),
      ),
    ).toBe(1000);
  });
});

describe("monthlyRecurringCentsFor", () => {
  it("month:1 passes through unchanged", () => {
    expect(
      monthlyRecurringCentsFor(
        sub({ intervalKey: "month:1", unitAmountCents: 1000 }),
      ),
    ).toBe(1000);
  });

  it("week:1 multiplies by 4.33", () => {
    expect(
      monthlyRecurringCentsFor(
        sub({ intervalKey: "week:1", unitAmountCents: 1000 }),
      ),
    ).toBeCloseTo(4330, 5);
  });

  it("week:2 multiplies by 2.17", () => {
    expect(
      monthlyRecurringCentsFor(
        sub({ intervalKey: "week:2", unitAmountCents: 1000 }),
      ),
    ).toBeCloseTo(2170, 5);
  });

  it("month:2 halves", () => {
    expect(
      monthlyRecurringCentsFor(
        sub({ intervalKey: "month:2", unitAmountCents: 1000 }),
      ),
    ).toBe(500);
  });

  it("month:3 divides by three", () => {
    expect(
      monthlyRecurringCentsFor(
        sub({ intervalKey: "month:3", unitAmountCents: 900 }),
      ),
    ).toBeCloseTo(300, 5);
  });

  it("returns 0 for an unrecognized interval key rather than throwing", () => {
    expect(
      monthlyRecurringCentsFor(
        sub({ intervalKey: "year:1", unitAmountCents: 1000 }),
      ),
    ).toBe(0);
  });

  it("includes shipping in the normalized total", () => {
    expect(
      monthlyRecurringCentsFor(
        sub({
          intervalKey: "month:1",
          unitAmountCents: 1000,
          shippingCents: 500,
        }),
      ),
    ).toBe(1500);
  });
});

describe("computeMonthlyRecurringCents", () => {
  it("sums only active rows", () => {
    const rows = [
      sub({ status: "active", intervalKey: "month:1", unitAmountCents: 1000 }),
      sub({ status: "paused", intervalKey: "month:1", unitAmountCents: 5000 }),
      sub({
        status: "past_due",
        intervalKey: "month:1",
        unitAmountCents: 5000,
      }),
      sub({
        status: "cancelled",
        intervalKey: "month:1",
        unitAmountCents: 5000,
      }),
      sub({
        status: "incomplete",
        intervalKey: "month:1",
        unitAmountCents: 5000,
      }),
    ];
    expect(computeMonthlyRecurringCents(rows)).toBe(1000);
  });

  it("rounds the total to whole cents", () => {
    const rows = [
      // 333 * 4.33 = 1441.89
      sub({ status: "active", intervalKey: "week:1", unitAmountCents: 333 }),
    ];
    expect(computeMonthlyRecurringCents(rows)).toBe(1442);
  });

  it("sums across multiple active cadences", () => {
    const rows = [
      sub({ status: "active", intervalKey: "month:1", unitAmountCents: 1000 }),
      sub({ status: "active", intervalKey: "month:2", unitAmountCents: 2000 }),
    ];
    // 1000 + (2000 * 0.5) = 2000
    expect(computeMonthlyRecurringCents(rows)).toBe(2000);
  });

  it("returns 0 for an empty list", () => {
    expect(computeMonthlyRecurringCents([])).toBe(0);
  });
});
