// Pin a non-UTC timezone so the local-vs-UTC bucketing tests below actually
// discriminate: under TZ=UTC (common CI default) a UTC-slicing regression
// would pass identically. Node re-reads TZ for subsequent Date calls.
process.env.TZ = "America/Detroit";

import { describe, expect, it } from "vitest";

import { bucketRevenueByDay } from "./revenue-by-day";

describe("bucketRevenueByDay", () => {
  it("sums multiple orders on the same local day into one bucket", () => {
    const start = new Date(2026, 5, 1, 9, 0, 0); // Jun 1, 2026
    const end = new Date(2026, 5, 1, 9, 0, 0);
    const orders = [
      { createdAt: new Date(2026, 5, 1, 8, 0, 0), total: 500 },
      { createdAt: new Date(2026, 5, 1, 20, 30, 0), total: 250 },
    ];

    const result = bucketRevenueByDay(orders, start, end);

    expect(result).toHaveLength(1);
    expect(result[0]?.revenue).toBe(750);
  });

  it("fills days with no orders as 0 and preserves chronological order", () => {
    const start = new Date(2026, 5, 1);
    const end = new Date(2026, 5, 5);
    const orders = [
      { createdAt: new Date(2026, 5, 1, 12, 0, 0), total: 100 },
      { createdAt: new Date(2026, 5, 5, 12, 0, 0), total: 200 },
    ];

    const result = bucketRevenueByDay(orders, start, end);

    expect(result).toHaveLength(5);
    expect(result.map((r) => r.revenue)).toEqual([100, 0, 0, 0, 200]);
  });

  it("buckets orders near local midnight into the correct day, not shifted by UTC", () => {
    // 11:30 PM local time on Jun 1 must land in the Jun 1 bucket, not spill
    // into Jun 2 the way a UTC-based slice could in timezones west of UTC.
    const start = new Date(2026, 5, 1);
    const end = new Date(2026, 5, 2);
    const orders = [
      { createdAt: new Date(2026, 5, 1, 23, 30, 0), total: 300 },
      { createdAt: new Date(2026, 5, 2, 0, 5, 0), total: 400 },
    ];

    const result = bucketRevenueByDay(orders, start, end);

    expect(result).toHaveLength(2);
    expect(result[0]?.revenue).toBe(300);
    expect(result[1]?.revenue).toBe(400);
  });

  it("returns local-midnight Date objects for each bucket", () => {
    const start = new Date(2026, 5, 1, 14, 0, 0);
    const end = new Date(2026, 5, 1, 14, 0, 0);

    const result = bucketRevenueByDay([], start, end);

    expect(result).toHaveLength(1);
    expect(result[0]?.date.getHours()).toBe(0);
    expect(result[0]?.date.getMinutes()).toBe(0);
    expect(result[0]?.date.getDate()).toBe(1);
  });
});
