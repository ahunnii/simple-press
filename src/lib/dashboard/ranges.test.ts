import { describe, expect, it } from "vitest";

import {
  DASHBOARD_RANGE_KEYS,
  DASHBOARD_RANGES,
  isDashboardRangeKey,
  normalizeTimeZone,
  resolveDashboardRange,
} from "./ranges";

// Production runs in UTC; pin the process there so a store-zone bug can't hide
// behind the developer's laptop zone.
process.env.TZ = "UTC";

const DETROIT = "America/Detroit";
const iso = (d: Date | null | undefined) => d?.toISOString() ?? null;

describe("DASHBOARD_RANGES", () => {
  it("lists every key once, in picker order, with labels", () => {
    expect(DASHBOARD_RANGES.map((r) => r.key)).toEqual([
      ...DASHBOARD_RANGE_KEYS,
    ]);
    expect(DASHBOARD_RANGES.map((r) => r.label)).toEqual([
      "Today",
      "This week",
      "This month",
      "This year",
      "Last 7 days",
      "Last 30 days",
      "Last 90 days",
      "All time",
    ]);
  });

  it("guards range keys", () => {
    expect(isDashboardRangeKey("30d")).toBe(true);
    expect(isDashboardRangeKey("14d")).toBe(false);
    expect(isDashboardRangeKey(null)).toBe(false);
  });
});

describe("resolveDashboardRange — every key (Detroit, Mon 2026-10-12 12:00 EDT)", () => {
  const now = new Date("2026-10-12T16:00:00Z");

  it("today", () => {
    const r = resolveDashboardRange("today", now, DETROIT);
    expect(r.label).toBe("Today");
    expect(iso(r.start)).toBe("2026-10-12T04:00:00.000Z");
    expect(r.endExclusive).toBe(now);
    expect(r.startYmd).toBe("2026-10-12");
    expect(r.endYmdExclusive).toBe("2026-10-13");
    expect(r.granularity).toBe("day");
    expect(r.previous).toEqual({
      start: new Date("2026-10-11T04:00:00Z"),
      endExclusive: new Date("2026-10-11T16:00:00Z"),
      startYmd: "2026-10-11",
      endYmdExclusive: "2026-10-12",
      label: "vs yesterday",
    });
  });

  it("week (Monday is its own week start)", () => {
    const r = resolveDashboardRange("week", now, DETROIT);
    expect(r.startYmd).toBe("2026-10-12");
    expect(iso(r.start)).toBe("2026-10-12T04:00:00.000Z");
    expect(r.previous?.startYmd).toBe("2026-10-05");
    expect(iso(r.previous?.endExclusive)).toBe("2026-10-05T16:00:00.000Z");
    expect(r.previous?.label).toBe("vs last week");
    expect(r.granularity).toBe("day");
  });

  it("month", () => {
    const r = resolveDashboardRange("month", now, DETROIT);
    expect(r.startYmd).toBe("2026-10-01");
    expect(r.previous?.startYmd).toBe("2026-09-01");
    expect(iso(r.previous?.endExclusive)).toBe("2026-09-12T16:00:00.000Z");
    expect(r.previous?.endYmdExclusive).toBe("2026-09-13");
    expect(r.previous?.label).toBe("vs last month");
    expect(r.granularity).toBe("day");
  });

  it("year", () => {
    const r = resolveDashboardRange("year", now, DETROIT);
    expect(r.startYmd).toBe("2026-01-01");
    expect(iso(r.start)).toBe("2026-01-01T05:00:00.000Z"); // EST
    expect(r.previous?.startYmd).toBe("2025-01-01");
    expect(iso(r.previous?.endExclusive)).toBe("2025-10-12T16:00:00.000Z");
    expect(r.previous?.label).toBe("vs last year");
    expect(r.granularity).toBe("month");
  });

  it("last 7 days = 7 store days including today", () => {
    const r = resolveDashboardRange("7d", now, DETROIT);
    expect(r.startYmd).toBe("2026-10-06");
    expect(iso(r.start)).toBe("2026-10-06T04:00:00.000Z");
    expect(r.previous?.startYmd).toBe("2026-09-29");
    expect(iso(r.previous?.endExclusive)).toBe("2026-10-05T16:00:00.000Z");
    expect(r.previous?.endYmdExclusive).toBe("2026-10-06");
    expect(r.previous?.label).toBe("vs prior 7 days");
  });

  it("last 30 days", () => {
    const r = resolveDashboardRange("30d", now, DETROIT);
    expect(r.startYmd).toBe("2026-09-13");
    expect(r.previous?.startYmd).toBe("2026-08-14");
    expect(iso(r.previous?.endExclusive)).toBe("2026-09-12T16:00:00.000Z");
    expect(r.previous?.label).toBe("vs prior 30 days");
    expect(r.granularity).toBe("day");
  });

  it("last 90 days", () => {
    const r = resolveDashboardRange("90d", now, DETROIT);
    expect(r.startYmd).toBe("2026-07-15");
    expect(r.previous?.startYmd).toBe("2026-04-16");
    expect(r.previous?.endYmdExclusive).toBe("2026-07-15");
    expect(r.previous?.label).toBe("vs prior 90 days");
    expect(r.granularity).toBe("day");
  });

  it("all time has no start and no previous window", () => {
    const r = resolveDashboardRange("all", now, DETROIT);
    expect(r.label).toBe("All time");
    expect(r.start).toBeNull();
    expect(r.startYmd).toBeNull();
    expect(r.previous).toBeNull();
    expect(r.endExclusive).toBe(now);
    expect(r.endYmdExclusive).toBe("2026-10-13");
    expect(r.granularity).toBe("month");
  });
});

describe("resolveDashboardRange — weeks and DST", () => {
  it("a Sunday belongs to the week that started the Monday before (spring-forward week)", () => {
    // Sun 2026-03-08 15:00 EDT; DST began at 02:00 that morning.
    const now = new Date("2026-03-08T19:00:00Z");
    const r = resolveDashboardRange("week", now, DETROIT);
    expect(r.startYmd).toBe("2026-03-02");
    expect(iso(r.start)).toBe("2026-03-02T05:00:00.000Z"); // Monday was EST
    expect(r.previous?.startYmd).toBe("2026-02-23");
    expect(iso(r.previous?.start)).toBe("2026-02-23T05:00:00.000Z");
    // Same wall clock (15:00) on the previous Sunday, which was EST.
    expect(iso(r.previous?.endExclusive)).toBe("2026-03-01T20:00:00.000Z");
  });

  it("the Monday after spring-forward starts a new week at EDT midnight", () => {
    const now = new Date("2026-03-09T05:00:00Z"); // Mon 01:00 EDT
    const r = resolveDashboardRange("week", now, DETROIT);
    expect(r.startYmd).toBe("2026-03-09");
    expect(iso(r.start)).toBe("2026-03-09T04:00:00.000Z");
  });

  it("fall-back week keeps calendar-day bounds", () => {
    // Sun 2026-11-01 12:00 EST (clocks fell back at 02:00 EDT).
    const now = new Date("2026-11-01T17:00:00Z");
    const r = resolveDashboardRange("week", now, DETROIT);
    expect(r.startYmd).toBe("2026-10-26");
    expect(iso(r.start)).toBe("2026-10-26T04:00:00.000Z"); // EDT midnight
    expect(iso(r.previous?.start)).toBe("2026-10-19T04:00:00.000Z");
    expect(iso(r.previous?.endExclusive)).toBe("2026-10-25T16:00:00.000Z");
  });

  it("a previous end that falls in a spring-forward gap moves past the gap", () => {
    // Mon 2026-03-09 02:30 EDT → Sun 02:30 never happened → 03:30 EDT.
    const now = new Date("2026-03-09T06:30:00Z");
    const r = resolveDashboardRange("today", now, DETROIT);
    expect(iso(r.previous?.start)).toBe("2026-03-08T05:00:00.000Z");
    expect(iso(r.previous?.endExclusive)).toBe("2026-03-08T07:30:00.000Z");
  });
});

describe("resolveDashboardRange — month and year clamping", () => {
  it("Mar 31 compares to Feb 28 in a non-leap year", () => {
    const now = new Date("2026-03-31T16:00:00Z"); // 12:00 EDT
    const r = resolveDashboardRange("month", now, DETROIT);
    expect(r.startYmd).toBe("2026-03-01");
    expect(iso(r.start)).toBe("2026-03-01T05:00:00.000Z");
    expect(r.previous?.startYmd).toBe("2026-02-01");
    expect(iso(r.previous?.endExclusive)).toBe("2026-02-28T17:00:00.000Z"); // 12:00 EST
    expect(r.previous?.endYmdExclusive).toBe("2026-03-01");
  });

  it("Mar 31 compares to Feb 29 in a leap year", () => {
    const now = new Date("2028-03-31T16:00:00Z");
    const r = resolveDashboardRange("month", now, DETROIT);
    expect(r.previous?.startYmd).toBe("2028-02-01");
    expect(iso(r.previous?.endExclusive)).toBe("2028-02-29T17:00:00.000Z");
    expect(r.previous?.endYmdExclusive).toBe("2028-03-01");
  });

  it("Feb 29 this year compares to Feb 28 last year", () => {
    const now = new Date("2028-02-29T17:00:00Z");
    const r = resolveDashboardRange("year", now, DETROIT);
    expect(r.previous?.startYmd).toBe("2027-01-01");
    expect(iso(r.previous?.endExclusive)).toBe("2027-02-28T17:00:00.000Z");
  });

  it("Jan 1 rolls month, week and year back into the previous year", () => {
    const now = new Date("2026-01-01T17:00:00Z"); // Thu 12:00 EST
    const month = resolveDashboardRange("month", now, DETROIT);
    expect(month.startYmd).toBe("2026-01-01");
    expect(month.previous?.startYmd).toBe("2025-12-01");
    expect(iso(month.previous?.endExclusive)).toBe("2025-12-01T17:00:00.000Z");

    const year = resolveDashboardRange("year", now, DETROIT);
    expect(year.startYmd).toBe("2026-01-01");
    expect(year.previous?.startYmd).toBe("2025-01-01");
    expect(iso(year.previous?.endExclusive)).toBe("2025-01-01T17:00:00.000Z");

    const week = resolveDashboardRange("week", now, DETROIT);
    expect(week.startYmd).toBe("2025-12-29");
    expect(week.previous?.startYmd).toBe("2025-12-22");
  });
});

describe("resolveDashboardRange — store midnight vs UTC midnight", () => {
  it("just after store midnight while UTC is still on the previous day", () => {
    // 00:05 JST on Oct 12 is 15:05 UTC on Oct 11.
    const now = new Date("2026-10-11T15:05:00Z");
    const r = resolveDashboardRange("today", now, "Asia/Tokyo");
    expect(r.startYmd).toBe("2026-10-12");
    expect(iso(r.start)).toBe("2026-10-11T15:00:00.000Z");
    expect(r.endYmdExclusive).toBe("2026-10-13");
    expect(iso(r.previous?.endExclusive)).toBe("2026-10-10T15:05:00.000Z");
  });

  it("just before store midnight while UTC is already on the next day", () => {
    // 23:30 EDT on Oct 11 is 03:30 UTC on Oct 12.
    const now = new Date("2026-10-12T03:30:00Z");
    const r = resolveDashboardRange("today", now, DETROIT);
    expect(r.startYmd).toBe("2026-10-11");
    expect(iso(r.start)).toBe("2026-10-11T04:00:00.000Z");
    expect(r.endYmdExclusive).toBe("2026-10-12");
  });
});

describe("resolveDashboardRange — time zone validation", () => {
  it("falls back to UTC for an invalid or empty zone", () => {
    const now = new Date("2026-10-12T16:00:00Z");
    for (const tz of ["Not/AZone", ""]) {
      const r = resolveDashboardRange("today", now, tz);
      expect(r.timeZone).toBe("UTC");
      expect(iso(r.start)).toBe("2026-10-12T00:00:00.000Z");
    }
    expect(normalizeTimeZone(DETROIT)).toBe(DETROIT);
    expect(normalizeTimeZone(null)).toBe("UTC");
  });
});

describe("resolveDashboardRange — previous window never overlaps", () => {
  const nows = [
    "2026-01-01T00:00:00Z",
    "2026-01-01T05:00:00Z", // exactly Detroit midnight
    "2026-03-08T07:30:00Z",
    "2026-03-31T03:59:59Z",
    "2026-11-01T06:30:00Z",
    "2026-12-31T23:59:59Z",
    "2028-02-29T12:00:00Z",
    "2028-03-31T23:00:00Z",
  ].map((s) => new Date(s));
  const zones = [DETROIT, "Asia/Tokyo", "Pacific/Kiritimati", "UTC"];

  it.each(DASHBOARD_RANGE_KEYS.filter((k) => k !== "all"))("%s", (key) => {
    for (const now of nows) {
      for (const tz of zones) {
        const r = resolveDashboardRange(key, now, tz);
        const prev = r.previous;
        expect(prev).not.toBeNull();
        if (!prev || !r.start || !r.startYmd) throw new Error("unreachable");
        expect(prev.start.getTime()).toBeLessThan(r.start.getTime());
        expect(prev.endExclusive.getTime()).toBeLessThanOrEqual(
          r.start.getTime(),
        );
        expect(prev.endExclusive.getTime()).toBeGreaterThanOrEqual(
          prev.start.getTime(),
        );
        expect(prev.endYmdExclusive <= r.startYmd).toBe(true);
        expect(prev.startYmd < prev.endYmdExclusive).toBe(true);
        expect(r.start.getTime()).toBeLessThanOrEqual(now.getTime());
      }
    }
  });
});
