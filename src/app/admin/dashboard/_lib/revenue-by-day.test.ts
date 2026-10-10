import { describe, expect, it } from "vitest";

import {
  bucketRevenueByDay,
  startOfZonedDay,
  zonedDayKey,
} from "./revenue-by-day";

// Pin the PROCESS to UTC (production's zone) while the store is in Detroit, so
// every test below discriminates store-zone bucketing from server-zone
// bucketing. Node re-reads TZ for subsequent Date calls.
process.env.TZ = "UTC";

const STORE_TZ = "America/Detroit";

describe("bucketRevenueByDay", () => {
  it("sums multiple orders on the same store-local day into one bucket", () => {
    // Jun 1 2026, 09:00 EDT (13:00 UTC)
    const start = new Date("2026-06-01T13:00:00Z");
    const end = new Date("2026-06-01T13:00:00Z");
    const orders = [
      { createdAt: new Date("2026-06-01T12:00:00Z"), total: 500 }, // 08:00 EDT
      { createdAt: new Date("2026-06-02T00:30:00Z"), total: 250 }, // 20:30 EDT Jun 1
    ];

    const result = bucketRevenueByDay(orders, start, end, STORE_TZ);

    expect(result).toHaveLength(1);
    expect(result[0]?.revenue).toBe(750);
  });

  it("fills days with no orders as 0 and preserves chronological order", () => {
    const start = new Date("2026-06-01T16:00:00Z");
    const end = new Date("2026-06-05T16:00:00Z");
    const orders = [
      { createdAt: new Date("2026-06-01T16:00:00Z"), total: 100 },
      { createdAt: new Date("2026-06-05T16:00:00Z"), total: 200 },
    ];

    const result = bucketRevenueByDay(orders, start, end, STORE_TZ);

    expect(result).toHaveLength(5);
    expect(result.map((r) => r.revenue)).toEqual([100, 0, 0, 0, 200]);
  });

  it("buckets orders near the store's midnight by the store's day, not the server's", () => {
    // 11:30 PM EDT on Jun 1 is already Jun 2 in UTC; it must land in the Jun 1
    // bucket. 12:05 AM EDT Jun 2 lands in Jun 2.
    const start = new Date("2026-06-01T16:00:00Z");
    const end = new Date("2026-06-02T16:00:00Z");
    const orders = [
      { createdAt: new Date("2026-06-02T03:30:00Z"), total: 300 },
      { createdAt: new Date("2026-06-02T04:05:00Z"), total: 400 },
    ];

    const result = bucketRevenueByDay(orders, start, end, STORE_TZ);

    expect(result).toHaveLength(2);
    expect(result[0]?.revenue).toBe(300);
    expect(result[1]?.revenue).toBe(400);
  });

  it("returns the store's midnight for each bucket", () => {
    const start = new Date("2026-06-01T18:00:00Z");
    const end = new Date("2026-06-01T18:00:00Z");

    const result = bucketRevenueByDay([], start, end, STORE_TZ);

    expect(result).toHaveLength(1);
    // 00:00 EDT == 04:00 UTC
    expect(result[0]?.date.toISOString()).toBe("2026-06-01T04:00:00.000Z");
  });

  it("keeps one bucket per day across a DST change", () => {
    // Nov 1 2026 is the fall-back day in Detroit (a 25-hour day).
    const start = new Date("2026-10-31T16:00:00Z");
    const end = new Date("2026-11-02T16:00:00Z");

    const result = bucketRevenueByDay([], start, end, STORE_TZ);

    expect(result.map((r) => zonedDayKey(r.date, STORE_TZ))).toEqual([
      "2026-10-31",
      "2026-11-01",
      "2026-11-02",
    ]);
  });
});

describe("startOfZonedDay", () => {
  it("returns the store's midnight, not the server's", () => {
    // 9pm EDT Oct 9 is 01:00 UTC Oct 10 — "today" for the store is still Oct 9.
    const now = new Date("2026-10-10T01:00:00Z");
    expect(startOfZonedDay(now, STORE_TZ).toISOString()).toBe(
      "2026-10-09T04:00:00.000Z",
    );
  });
});
