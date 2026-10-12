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
  const TZ = "America/Detroit";

  it("is the trailing 12 months, today inclusive, aligned to store midnights", () => {
    // 2026-10-10 15:30 in Detroit (EDT, UTC-4).
    const { start, endExclusive } = resolveInformWindow(
      new Date("2026-10-10T19:30:00Z"),
      TZ,
    );
    expect(endExclusive).toEqual(new Date("2026-10-11T04:00:00Z"));
    expect(start).toEqual(new Date("2025-10-11T04:00:00Z"));
  });

  it("uses the store's calendar day, not the server's or UTC's", () => {
    // 2026-10-11 02:00 UTC is still Oct 10 (10pm) in Detroit.
    const { endExclusive } = resolveInformWindow(
      new Date("2026-10-11T02:00:00Z"),
      TZ,
    );
    expect(endExclusive).toEqual(new Date("2026-10-11T04:00:00Z"));
  });

  it("rolls over the year boundary", () => {
    // 2026-12-31 23:59 in Detroit (EST, UTC-5).
    const { start, endExclusive } = resolveInformWindow(
      new Date("2027-01-01T04:59:00Z"),
      TZ,
    );
    expect(endExclusive).toEqual(new Date("2027-01-01T05:00:00Z"));
    expect(start).toEqual(new Date("2026-01-01T05:00:00Z"));
  });

  it("stays at store midnight across a DST change", () => {
    // March 2026 (US DST starts Mar 8, EDT) back to March 2025 (EDT from Mar 9).
    const { start, endExclusive } = resolveInformWindow(
      new Date("2026-03-20T13:00:00Z"),
      TZ,
    );
    expect(endExclusive).toEqual(new Date("2026-03-21T04:00:00Z"));
    expect(start).toEqual(new Date("2025-03-21T04:00:00Z"));
  });

  it("falls back to UTC midnights without a valid zone", () => {
    const { start, endExclusive } = resolveInformWindow(
      new Date("2026-10-10T19:30:00Z"),
      "Not/AZone",
    );
    expect(endExclusive).toEqual(new Date("2026-10-11T00:00:00Z"));
    expect(start).toEqual(new Date("2025-10-11T00:00:00Z"));
  });
});
