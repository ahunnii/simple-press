import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { StatQuery } from "./types";
import type { TxClient } from "~/server/db";
import { resolveDashboardRange } from "~/lib/dashboard/ranges";

import { windowSeriesPoints } from "./series";
import { makeCtx, NOW } from "./test-fixtures";
import { trafficStat } from "./traffic";

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

const umami = vi.hoisted(() => ({
  getConnectionStatus: vi.fn(),
  getStats: vi.fn(),
  getPageviewsSeries: vi.fn(),
}));
vi.mock("~/lib/umami/client", () => umami);

function makeQuery(
  rangeKey: "7d" | "30d" | "year" | "all",
  over: { series?: boolean; timeZone?: string } = {},
) {
  const timeZone = over.timeZone ?? "UTC";
  const range = resolveDashboardRange(rangeKey, NOW, timeZone);
  const q: StatQuery = {
    db: {
      order: { count: vi.fn().mockResolvedValue(4) },
    } as unknown as TxClient,
    ctx: makeCtx({ timeZone }),
    win: range,
    series: over.series ?? true,
    granularity: range.granularity,
  };
  return { q, range };
}

beforeEach(() => {
  vi.clearAllMocks();
  umami.getConnectionStatus.mockResolvedValue("ok");
  umami.getStats.mockResolvedValue({ visitors: 120 });
  umami.getPageviewsSeries.mockResolvedValue({
    pageviews: [],
    sessions: [{ x: "2026-10-14 00:00:00", y: 50 }],
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("visitors series", () => {
  it("is zero-filled onto exactly the keys and labels windowSeriesPoints makes", async () => {
    const { q, range } = makeQuery("7d");
    const { current } = await trafficStat(q, "visitors", null);

    const expected = windowSeriesPoints(
      new Map([["2026-10-14", 50]]),
      range,
      "day",
      "UTC",
    );
    expect(current.series).toEqual(expected);
    expect(current.series).toHaveLength(7);
    expect(current.series!.map((p) => p.value)).toEqual([0, 0, 0, 0, 50, 0, 0]);
    expect(current.series![0]).toMatchObject({
      key: "2026-10-10",
      label: "Oct 10",
    });
    // The headline is the window's unique visitors, not the sum of buckets.
    expect(current.value).toBe(120);
  });

  it("asks Umami for sessions in the store's zone with unit = granularity", async () => {
    const { q, range } = makeQuery("7d", { timeZone: "America/Detroit" });
    await trafficStat(q, "visitors", null);
    expect(umami.getPageviewsSeries).toHaveBeenCalledWith({
      websiteId: "site_1",
      startAt: range.start!.getTime(),
      endAt: range.endExclusive.getTime(),
      unit: "day",
      timezone: "America/Detroit",
    });
  });

  it("buckets by month for a year, and keys on the month prefix", async () => {
    umami.getPageviewsSeries.mockResolvedValue({
      pageviews: [],
      sessions: [
        { x: "2026-09-01 00:00:00", y: 300 },
        { x: "2026-10-01T00:00:00.000Z", y: 210 },
      ],
    });
    const { q, range } = makeQuery("year");
    const { current } = await trafficStat(q, "visitors", null);
    expect(umami.getPageviewsSeries.mock.calls[0]![0]).toMatchObject({
      unit: "month",
    });
    expect(current.series).toEqual(
      windowSeriesPoints(
        new Map([
          ["2026-09", 300],
          ["2026-10", 210],
        ]),
        range,
        "month",
        "UTC",
      ),
    );
    expect(current.series!.at(-1)).toMatchObject({
      key: "2026-10",
      label: "Oct 2026",
      value: 210,
    });
  });

  it("starts All time at the first bucket with data", async () => {
    umami.getPageviewsSeries.mockResolvedValue({
      pageviews: [],
      sessions: [{ x: "2026-08-01 00:00:00", y: 9 }],
    });
    const { q } = makeQuery("all");
    const { current } = await trafficStat(q, "visitors", null);
    expect(current.series!.map((p) => p.key)).toEqual([
      "2026-08",
      "2026-09",
      "2026-10",
    ]);
    // The headline still starts at the business's creation date.
    expect(
      (umami.getStats.mock.calls[0]![0] as { startAt: number }).startAt,
    ).toBe(new Date("2025-01-01T00:00:00.000Z").getTime());
  });

  it("builds a flat zero series when there truly were no visitors", async () => {
    umami.getStats.mockResolvedValue({ visitors: 0 });
    umami.getPageviewsSeries.mockResolvedValue({ pageviews: [], sessions: [] });
    const { q } = makeQuery("7d");
    const { current } = await trafficStat(q, "visitors", null);
    expect(current.value).toBe(0);
    expect(current.series!.every((p) => p.value === 0)).toBe(true);
  });

  it("does not request a series unless asked (1x1 stat cards)", async () => {
    const { q } = makeQuery("7d", { series: false });
    const { current } = await trafficStat(q, "visitors", null);
    expect(current.series).toBeUndefined();
    expect(umami.getPageviewsSeries).not.toHaveBeenCalled();
  });

  it("returns the headline without a series when the series call fails", async () => {
    const { q } = makeQuery("7d");
    // getPageviewsSeries turns a failed request into empty arrays...
    umami.getPageviewsSeries.mockResolvedValue({ pageviews: [], sessions: [] });
    let result = await trafficStat(q, "visitors", null);
    expect(result.current.value).toBe(120);
    expect(result.current.series).toBeUndefined();

    // ...and anything that does throw is swallowed the same way.
    umami.getPageviewsSeries.mockRejectedValue(new Error("boom"));
    result = await trafficStat(q, "visitors", null);
    expect(result.current.value).toBe(120);
    expect(result.current.series).toBeUndefined();
  });

  it("gives up on a hung series after the timeout without failing the card", async () => {
    vi.useFakeTimers();
    umami.getPageviewsSeries.mockReturnValue(new Promise(() => undefined));
    const { q } = makeQuery("7d");
    const pending = trafficStat(q, "visitors", null);
    await vi.advanceTimersByTimeAsync(4001);
    const { current } = await pending;
    expect(current.value).toBe(120);
    expect(current.series).toBeUndefined();
  });

  it("builds the previous window's series only when asked", async () => {
    const { q, range } = makeQuery("7d");
    const prior = range.previous!;

    const plain = await trafficStat(q, "visitors", prior);
    expect(plain.previous!.series).toBeUndefined();
    expect(umami.getPageviewsSeries).toHaveBeenCalledTimes(1);

    umami.getPageviewsSeries.mockClear();
    const ghost = await trafficStat(q, "visitors", prior, {
      previousSeries: true,
    });
    expect(umami.getPageviewsSeries).toHaveBeenCalledTimes(2);
    expect(ghost.previous!.series!.map((p) => p.key)).toEqual(
      windowSeriesPoints(new Map(), prior, "day", "UTC").map((p) => p.key),
    );
  });

  it("gives conversion rate no series", async () => {
    const { q } = makeQuery("7d");
    const { current } = await trafficStat(q, "conversion-rate", null);
    expect(current.series).toBeUndefined();
    expect(current.value).toBeCloseTo((4 / 120) * 100);
    expect(umami.getPageviewsSeries).not.toHaveBeenCalled();
  });
});
