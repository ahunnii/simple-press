import { describe, expect, it } from "vitest";

import {
  bucketByZone,
  bucketKeysBetween,
  bucketLabel,
  bucketStart,
  fillBuckets,
  nextBucketKey,
  zonedMonthKey,
} from "./buckets";

process.env.TZ = "UTC";

const DETROIT = "America/Detroit";

describe("month keys", () => {
  it("puts an evening order on the last day of the month in the store's month", () => {
    // 21:00 EDT Sep 30 is 01:00 UTC Oct 1.
    expect(zonedMonthKey(new Date("2026-10-01T01:00:00Z"), DETROIT)).toBe(
      "2026-09",
    );
  });

  it("steps across a year boundary", () => {
    expect(nextBucketKey("2026-12", "month")).toBe("2027-01");
    expect(nextBucketKey("2026-12-31", "day")).toBe("2027-01-01");
    expect(nextBucketKey("2028-02-28", "day")).toBe("2028-02-29");
  });

  it("starts a month bucket at local midnight on the 1st", () => {
    expect(bucketStart("2026-11", "month", DETROIT).toISOString()).toBe(
      "2026-11-01T04:00:00.000Z",
    );
    expect(bucketStart("2026-12", "month", DETROIT).toISOString()).toBe(
      "2026-12-01T05:00:00.000Z",
    );
  });
});

describe("bucketKeysBetween", () => {
  it("is inclusive of both ends", () => {
    expect(
      bucketKeysBetween(
        new Date("2026-08-15T12:00:00Z"),
        new Date("2026-10-12T16:00:00Z"),
        "month",
        DETROIT,
      ),
    ).toEqual(["2026-08", "2026-09", "2026-10"]);
  });
});

describe("bucketByZone", () => {
  it("sums by month in the store zone and zero-fills empty months", () => {
    const rows = [
      { at: new Date("2026-07-02T12:00:00Z"), cents: 100 },
      { at: new Date("2026-07-31T23:00:00Z"), cents: 50 }, // 19:00 EDT Jul 31
      { at: new Date("2026-09-01T03:00:00Z"), cents: 25 }, // 23:00 EDT Aug 31
    ];
    const result = bucketByZone(rows, {
      start: new Date("2026-07-01T12:00:00Z"),
      end: new Date("2026-10-12T16:00:00Z"),
      granularity: "month",
      timeZone: DETROIT,
      at: (r) => r.at,
      empty: () => 0,
      add: (sum, r) => sum + r.cents,
    });
    expect(result.map((b) => [b.key, b.value])).toEqual([
      ["2026-07", 150],
      ["2026-08", 25],
      ["2026-09", 0],
      ["2026-10", 0],
    ]);
  });

  it("supports structured accumulators", () => {
    const rows = [
      { at: new Date("2026-06-01T16:00:00Z"), gross: 500, refunded: 100 },
      { at: new Date("2026-06-01T17:00:00Z"), gross: 200, refunded: 0 },
    ];
    const [only] = bucketByZone(rows, {
      start: rows[0]!.at,
      end: rows[0]!.at,
      granularity: "day",
      timeZone: DETROIT,
      at: (r) => r.at,
      empty: () => ({ gross: 0, refunded: 0 }),
      add: (acc, r) => ({
        gross: acc.gross + r.gross,
        refunded: acc.refunded + r.refunded,
      }),
    });
    expect(only?.value).toEqual({ gross: 700, refunded: 100 });
  });
});

describe("fillBuckets", () => {
  it("lays pre-aggregated totals onto a continuous day axis", () => {
    const result = fillBuckets(new Map([["2026-11-02", 7]]), {
      start: new Date("2026-10-31T16:00:00Z"),
      end: new Date("2026-11-02T16:00:00Z"),
      granularity: "day",
      timeZone: DETROIT,
      empty: () => 0,
    });
    expect(result.map((b) => [b.key, b.value, b.start.toISOString()])).toEqual([
      ["2026-10-31", 0, "2026-10-31T04:00:00.000Z"],
      ["2026-11-01", 0, "2026-11-01T04:00:00.000Z"],
      ["2026-11-02", 7, "2026-11-02T05:00:00.000Z"],
    ]);
  });
});

describe("bucketLabel", () => {
  it("formats keys without any zone shift", () => {
    expect(bucketLabel("2026-10-01", "day")).toBe("Oct 1");
    expect(bucketLabel("2026-01", "month")).toBe("Jan 2026");
  });
});
