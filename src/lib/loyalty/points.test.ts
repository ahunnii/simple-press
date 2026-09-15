import { describe, expect, it } from "vitest";

import {
  canRedeem,
  clawbackPoints,
  eligibleCentsForOrder,
  pointsForOrder,
  rewardCodeExpiry,
} from "./points";

describe("eligibleCentsForOrder", () => {
  it("subtracts discount from subtotal", () => {
    expect(eligibleCentsForOrder({ subtotal: 10_000, discount: 1_000 })).toBe(
      9_000,
    );
  });

  it("floors at 0 when discount exceeds subtotal", () => {
    expect(eligibleCentsForOrder({ subtotal: 1_000, discount: 5_000 })).toBe(
      0,
    );
  });

  it("treats non-finite inputs as 0", () => {
    expect(
      eligibleCentsForOrder({ subtotal: Number.NaN, discount: 100 }),
    ).toBe(0);
    expect(
      eligibleCentsForOrder({ subtotal: 100, discount: Number.POSITIVE_INFINITY }),
    ).toBe(0);
  });
});

describe("pointsForOrder", () => {
  it("1999 cents @ 1 pt/dollar → 19", () => {
    expect(pointsForOrder(1_999, 1)).toBe(19);
  });

  it("1999 cents @ 2 pt/dollar → 39", () => {
    expect(pointsForOrder(1_999, 2)).toBe(39);
  });

  it("rate 0 → 0", () => {
    expect(pointsForOrder(10_000, 0)).toBe(0);
  });

  it("eligible 0 → 0", () => {
    expect(pointsForOrder(0, 1)).toBe(0);
  });

  it("10000 cents @ 1 pt/dollar → 100", () => {
    expect(pointsForOrder(10_000, 1)).toBe(100);
  });

  it("never returns negative", () => {
    expect(pointsForOrder(-500, 1)).toBe(0);
    expect(pointsForOrder(500, -1)).toBe(0);
  });

  it("non-integer inputs → 0", () => {
    expect(pointsForOrder(1_999.5, 1)).toBe(0);
    expect(pointsForOrder(1_999, 1.5)).toBe(0);
  });
});

describe("clawbackPoints", () => {
  it("full refund returns earned, capped by balance", () => {
    expect(
      clawbackPoints({
        earned: 100,
        alreadyClawed: 0,
        refundCents: 10_000,
        orderTotalCents: 10_000,
        isFullRefund: true,
        balance: 500,
      }),
    ).toBe(100);
  });

  it("partial 50% of 100 earned → 50", () => {
    expect(
      clawbackPoints({
        earned: 100,
        alreadyClawed: 0,
        refundCents: 5_000,
        orderTotalCents: 10_000,
        isFullRefund: false,
        balance: 500,
      }),
    ).toBe(50);
  });

  it("second partial after 50 already clawed, now a full refund → 50 more", () => {
    expect(
      clawbackPoints({
        earned: 100,
        alreadyClawed: 50,
        refundCents: 10_000,
        orderTotalCents: 10_000,
        isFullRefund: true,
        balance: 500,
      }),
    ).toBe(50);
  });

  it("partial-then-full never exceeds earned in total", () => {
    const first = clawbackPoints({
      earned: 100,
      alreadyClawed: 0,
      refundCents: 5_000,
      orderTotalCents: 10_000,
      isFullRefund: false,
      balance: 500,
    });
    const second = clawbackPoints({
      earned: 100,
      alreadyClawed: first,
      refundCents: 10_000,
      orderTotalCents: 10_000,
      isFullRefund: true,
      balance: 500,
    });
    expect(first + second).toBe(100);
  });

  it("caps at balance when balance is lower than intended clawback", () => {
    expect(
      clawbackPoints({
        earned: 100,
        alreadyClawed: 0,
        refundCents: 10_000,
        orderTotalCents: 10_000,
        isFullRefund: true,
        balance: 10,
      }),
    ).toBe(10);
  });

  it("orderTotalCents 0 is treated as a full refund", () => {
    expect(
      clawbackPoints({
        earned: 40,
        alreadyClawed: 0,
        refundCents: 0,
        orderTotalCents: 0,
        isFullRefund: false,
        balance: 500,
      }),
    ).toBe(40);
  });

  it("never returns negative", () => {
    expect(
      clawbackPoints({
        earned: 10,
        alreadyClawed: 100,
        refundCents: 10_000,
        orderTotalCents: 10_000,
        isFullRefund: true,
        balance: 500,
      }),
    ).toBe(0);
    expect(
      clawbackPoints({
        earned: 10,
        alreadyClawed: 0,
        refundCents: 10_000,
        orderTotalCents: 10_000,
        isFullRefund: true,
        balance: -5,
      }),
    ).toBe(0);
  });
});

describe("canRedeem", () => {
  it("false when pointsCost is 0 or negative", () => {
    expect(canRedeem(1_000, 0)).toBe(false);
    expect(canRedeem(1_000, -1)).toBe(false);
  });

  it("false when balance is below pointsCost", () => {
    expect(canRedeem(100, 500)).toBe(false);
  });

  it("true when balance equals or exceeds pointsCost", () => {
    expect(canRedeem(500, 500)).toBe(true);
    expect(canRedeem(600, 500)).toBe(true);
  });
});

describe("rewardCodeExpiry", () => {
  it("adds the given number of days", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const result = rewardCodeExpiry(now, 30);
    expect(result.toISOString()).toBe("2026-01-31T00:00:00.000Z");
  });

  it("clamps above 365 down to 365", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const result = rewardCodeExpiry(now, 1000);
    const expected = new Date(now.getTime() + 365 * 86_400_000);
    expect(result.getTime()).toBe(expected.getTime());
  });

  it("clamps below 1 up to 1", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const result = rewardCodeExpiry(now, 0);
    const expected = new Date(now.getTime() + 1 * 86_400_000);
    expect(result.getTime()).toBe(expected.getTime());
    expect(rewardCodeExpiry(now, -10).getTime()).toBe(expected.getTime());
  });
});
