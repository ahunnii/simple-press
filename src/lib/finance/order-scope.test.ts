import { describe, expect, it } from "vitest";

import { financeOrderScope, REVENUE_PAYMENT_STATUSES } from "./order-scope";

describe("financeOrderScope", () => {
  it("matches the Finances page scope", () => {
    const start = new Date("2026-01-01T00:00:00Z");
    const endExclusive = new Date("2026-02-01T00:00:00Z");
    expect(financeOrderScope("biz", { start, endExclusive })).toEqual({
      businessId: "biz",
      createdAt: { gte: start, lt: endExclusive },
      paymentStatus: { in: ["paid", "refunded", "disputed"] },
      status: { not: "cancelled" },
    });
  });

  it("omits the lower bound for all time and the window when absent", () => {
    const endExclusive = new Date("2026-02-01T00:00:00Z");
    expect(
      financeOrderScope("biz", { start: null, endExclusive }).createdAt,
    ).toEqual({
      lt: endExclusive,
    });
    expect(financeOrderScope("biz").createdAt).toBeUndefined();
    expect(REVENUE_PAYMENT_STATUSES).toEqual(["paid", "refunded", "disputed"]);
  });
});
