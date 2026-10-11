import { describe, expect, it } from "vitest";

import {
  evaluateInform,
  INFORM_REVENUE_THRESHOLD_CENTS,
  INFORM_TRANSACTION_THRESHOLD,
  informBarTone,
  resolveInformWindow,
} from "./inform";

describe("evaluateInform", () => {
  it("needs BOTH thresholds — transactions alone is not enough", () => {
    const status = evaluateInform({ transactions: 250, revenueCents: 100_000 });
    expect(status.thresholdReached).toBe(false);
    expect(status.transactionPct).toBe(100);
    expect(status.revenuePct).toBe(20);
  });

  it("needs BOTH thresholds — revenue alone is not enough", () => {
    const status = evaluateInform({ transactions: 10, revenueCents: 900_000 });
    expect(status.thresholdReached).toBe(false);
  });

  it("is reached exactly at 200 sales and $5,000", () => {
    const status = evaluateInform({
      transactions: INFORM_TRANSACTION_THRESHOLD,
      revenueCents: INFORM_REVENUE_THRESHOLD_CENTS,
    });
    expect(status.thresholdReached).toBe(true);
    expect(status.isApproaching).toBe(false);
  });

  it("caps percentages at 100", () => {
    const status = evaluateInform({
      transactions: 1000,
      revenueCents: 5_000_000,
    });
    expect(status.transactionPct).toBe(100);
    expect(status.revenuePct).toBe(100);
  });

  it("warns when EITHER metric hits 75% and the AND threshold is not met", () => {
    expect(
      evaluateInform({ transactions: 150, revenueCents: 0 }).isApproaching,
    ).toBe(true);
    expect(
      evaluateInform({ transactions: 0, revenueCents: 375_000 }).isApproaching,
    ).toBe(true);
    // One metric fully met, the other low — still only "approaching".
    expect(
      evaluateInform({ transactions: 300, revenueCents: 1_000 }).isApproaching,
    ).toBe(true);
  });

  it("does not warn just under 75% on both", () => {
    const status = evaluateInform({ transactions: 149, revenueCents: 374_999 });
    expect(status.isApproaching).toBe(false);
    expect(status.thresholdReached).toBe(false);
  });

  it("handles a store with no sales", () => {
    expect(evaluateInform({ transactions: 0, revenueCents: 0 })).toEqual({
      transactionPct: 0,
      revenuePct: 0,
      thresholdReached: false,
      isApproaching: false,
    });
  });
});

describe("informBarTone", () => {
  it("turns amber at the same 75% the alert uses", () => {
    expect(informBarTone(74.9)).toBe("green");
    expect(informBarTone(75)).toBe("amber");
    expect(informBarTone(99.9)).toBe("amber");
    expect(informBarTone(100)).toBe("red");
  });

  it("agrees with evaluateInform's warning point", () => {
    const status = evaluateInform({ transactions: 150, revenueCents: 0 });
    expect(status.isApproaching).toBe(true);
    expect(informBarTone(status.transactionPct)).toBe("amber");
  });
});

describe("resolveInformWindow", () => {
  it("is the trailing 12 months, today inclusive, midnight-aligned", () => {
    const { start, endExclusive } = resolveInformWindow(
      new Date(2026, 9, 10, 15, 30),
    );
    expect(endExclusive).toEqual(new Date(2026, 9, 11));
    expect(start).toEqual(new Date(2025, 9, 11));
  });

  it("rolls over the year boundary", () => {
    const { start, endExclusive } = resolveInformWindow(
      new Date(2026, 11, 31, 23, 59),
    );
    expect(endExclusive).toEqual(new Date(2027, 0, 1));
    expect(start).toEqual(new Date(2026, 0, 1));
  });

  it("stays at local midnight across a DST change", () => {
    // March 2026 (US DST starts Mar 8) back to March 2025 (Mar 9).
    const { start } = resolveInformWindow(new Date(2026, 2, 20, 9));
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(start).toEqual(new Date(2025, 2, 21));
  });
});
