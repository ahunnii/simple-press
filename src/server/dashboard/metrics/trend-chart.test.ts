import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CardDataRequest } from "./types";
import type {
  StatCardData,
  TrendChartCardData,
} from "~/lib/dashboard/card-data";
import type { TxClient } from "~/server/db";
import { resolveDashboardRange } from "~/lib/dashboard/ranges";
import {
  getWidget,
  PLOTTABLE_METRIC_IDS,
  trendStyle,
  WIDGET_IDS,
} from "~/lib/dashboard/widgets";

import { computeCardData, statRunnerFor, visitorsTrendNote } from "./index";
import { windowSeriesPoints } from "./series";
import {
  CURRENT_BUCKET,
  makeCtx,
  makeFakeDb,
  NOW,
  PREVIOUS_BUCKET,
} from "./test-fixtures";

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

const umami = vi.hoisted(() => ({
  getConnectionStatus: vi.fn(),
  getStats: vi.fn(),
  getPageviewsSeries: vi.fn(),
}));
vi.mock("~/lib/umami/client", () => umami);

vi.mock("~/lib/invoices/summary", () => ({
  computeInvoiceSummary: vi.fn().mockResolvedValue({
    paidLast30Cents: 700,
    outstandingCents: 0,
    outstandingCount: 0,
    overdueCents: 0,
    overdueCount: 0,
  }),
}));

const input = (over: Partial<CardDataRequest>): CardDataRequest => ({
  widget: "net-revenue",
  range: "30d",
  compare: false,
  series: false,
  metric: null,
  ...over,
});

const asDb = (db: ReturnType<typeof makeFakeDb>) => db as unknown as TxClient;

function trendInput(metric: CardDataRequest["metric"], compare = false) {
  return input({ widget: "trend-chart", metric, compare });
}

beforeEach(() => {
  vi.clearAllMocks();
  umami.getConnectionStatus.mockResolvedValue("ok");
  umami.getStats.mockResolvedValue({ visitors: 120 });
  umami.getPageviewsSeries.mockResolvedValue({
    pageviews: [],
    sessions: [
      { x: "2026-10-15 00:00:00", y: 40 },
      { x: "2026-10-16 00:00:00", y: 35 },
    ],
  });
});

describe("statRunnerFor", () => {
  it("has a runner for every stat widget and none for lists or charts", () => {
    for (const id of WIDGET_IDS) {
      const runner = statRunnerFor(id);
      if (getWidget(id).kind === "stat") {
        expect(runner, id).not.toBeNull();
      } else {
        expect(runner, id).toBeNull();
      }
    }
  });
});

describe("every plottable stat builds a series", () => {
  it.each(PLOTTABLE_METRIC_IDS)(
    "%s sets part.series when asked",
    async (id) => {
      const db = makeFakeDb();
      const card = await computeCardData(
        asDb(db),
        makeCtx(),
        input({ widget: id, series: true }),
      );
      expect(card.kind, id).toBe("stat");
      const series = (card as StatCardData).series;
      expect(series, id).toBeDefined();
      const win = resolveDashboardRange("30d", NOW, "UTC");
      // One zero-filled point per day of the window, keys shared by all families.
      expect(series!.map((p) => p.key)).toEqual(
        windowSeriesPoints(new Map(), win, "day", "UTC").map((p) => p.key),
      );
    },
  );

  it("conversion rate never builds one", async () => {
    const card = await computeCardData(
      asDb(makeFakeDb()),
      makeCtx(),
      input({ widget: "conversion-rate", series: true }),
    );
    expect(card.kind).toBe("stat");
    expect((card as StatCardData).series).toBeUndefined();
  });
});

describe("trend-chart", () => {
  it.each(PLOTTABLE_METRIC_IDS)(
    "%s: total is exactly the stat card's value, and the shape is complete",
    async (id) => {
      const db = makeFakeDb();
      const def = getWidget(id);
      const trend = (await computeCardData(
        asDb(db),
        makeCtx(),
        trendInput(id, true),
      )) as TrendChartCardData;
      const stat = (await computeCardData(
        asDb(makeFakeDb()),
        makeCtx(),
        input({ widget: id, compare: true }),
      )) as StatCardData;

      expect(trend.kind, id).toBe("trendChart");
      expect(trend.metric).toBe(id);
      expect(trend.metricLabel).toBe(def.label);
      expect(trend.format).toBe(def.format);
      expect(trend.style).toBe(trendStyle(id));
      expect(trend.granularity).toBe("day");
      expect(trend.total).toBe(stat.value);
      expect(trend.previousTotal).toBe(stat.previous);
      expect(trend.comparisonLabel).toBe(stat.comparisonLabel);
      expect(trend.points).toHaveLength(30);
      expect(trend.previousPoints).toHaveLength(30);
      expect(trend.previousPoints![0]!.key).not.toBe(trend.points[0]!.key);
    },
  );

  it("draws bars for sums and a line for averages", async () => {
    const run = async (id: CardDataRequest["metric"]) =>
      (
        (await computeCardData(
          asDb(makeFakeDb()),
          makeCtx(),
          trendInput(id),
        )) as TrendChartCardData
      ).style;
    expect(await run("donations-total")).toBe("bar");
    expect(await run("avg-order-value")).toBe("line");
    expect(await run("donation-average")).toBe("line");
  });

  it("puts the metric's own numbers on the axis", async () => {
    const trend = (await computeCardData(
      asDb(makeFakeDb()),
      makeCtx(),
      trendInput("donations-count", true),
    )) as TrendChartCardData;
    const today = trend.points.at(-1)!;
    expect(today).toMatchObject({
      key: "2026-10-16",
      label: "Oct 16",
      value: 3,
    });
    expect(trend.points.slice(0, -1).every((p) => p.value === 0)).toBe(true);
    // The previous window's own bucket lands on its own axis.
    expect(
      trend.previousPoints!.find((p) => p.key === "2026-09-01"),
    ).toMatchObject({ value: 2 });
  });

  it.each([
    // [metric, the fake db's bucket of 3 rows → the average]
    ["avg-order-value" as const, 900],
    ["donation-average" as const, 100],
  ])(
    "%s leaves empty buckets null (no average) and averages real ones",
    async (id, average) => {
      const trend = (await computeCardData(
        asDb(makeFakeDb()),
        makeCtx(),
        trendInput(id, true),
      )) as TrendChartCardData;
      expect(trend.points.at(-1)).toMatchObject({
        key: CURRENT_BUCKET,
        value: average,
      });
      expect(trend.points.slice(0, -1).every((p) => p.value === null)).toBe(
        true,
      );
      // The previous window: 2 rows in its bucket, null elsewhere.
      const prior = trend.previousPoints!;
      expect(
        prior.find((p) => p.key === PREVIOUS_BUCKET)?.value,
      ).not.toBeNull();
      expect(
        prior
          .filter((p) => p.key !== PREVIOUS_BUCKET)
          .every((p) => p.value === null),
      ).toBe(true);

      // The stat card's sparkline shares the same series.
      const stat = (await computeCardData(
        asDb(makeFakeDb()),
        makeCtx(),
        input({ widget: id, series: true }),
      )) as StatCardData;
      expect(stat.series!.at(-1)!.value).toBe(average);
      expect(stat.series!.slice(0, -1).every((p) => p.value === null)).toBe(
        true,
      );
    },
  );

  it("keeps zero-filling sums and counts with 0, not null", async () => {
    for (const id of [
      "donations-total",
      "order-count",
      "net-revenue",
    ] as const) {
      const trend = (await computeCardData(
        asDb(makeFakeDb()),
        makeCtx(),
        trendInput(id),
      )) as TrendChartCardData;
      expect(
        trend.points.slice(0, -1).every((p) => p.value === 0),
        id,
      ).toBe(true);
    }
  });

  it("omits the ghost line when not comparing, or on All time", async () => {
    const off = (await computeCardData(
      asDb(makeFakeDb()),
      makeCtx(),
      trendInput("net-revenue", false),
    )) as TrendChartCardData;
    expect(off.previousPoints).toBeNull();
    expect(off.previousTotal).toBeNull();
    expect(off.comparisonLabel).toBeNull();

    const all = (await computeCardData(
      asDb(makeFakeDb()),
      makeCtx(),
      input({
        widget: "trend-chart",
        metric: "net-revenue",
        range: "all",
        compare: true,
      }),
    )) as TrendChartCardData;
    expect(all.previousPoints).toBeNull();
    expect(all.granularity).toBe("month");
  });

  it("uses month buckets for a year", async () => {
    const trend = (await computeCardData(
      asDb(makeFakeDb()),
      makeCtx(),
      input({
        widget: "trend-chart",
        metric: "form-submissions",
        range: "year",
      }),
    )) as TrendChartCardData;
    expect(trend.granularity).toBe("month");
    expect(trend.points.map((p) => p.key)).toEqual([
      "2026-01",
      "2026-02",
      "2026-03",
      "2026-04",
      "2026-05",
      "2026-06",
      "2026-07",
      "2026-08",
      "2026-09",
      "2026-10",
    ]);
    expect(trend.points.at(-1)).toMatchObject({ label: "Oct 2026", value: 3 });
  });

  it("only runs the extra previous-window series when comparing", async () => {
    const db = makeFakeDb();
    await computeCardData(asDb(db), makeCtx(), trendInput("donations-count"));
    const bucketed = (calls: typeof db.$queryRaw.mock.calls) =>
      calls.filter(([q]) => q.sql.includes("date_trunc")).length;
    expect(bucketed(db.$queryRaw.mock.calls)).toBe(1);

    const compared = makeFakeDb();
    await computeCardData(
      asDb(compared),
      makeCtx(),
      trendInput("donations-count", true),
    );
    expect(bucketed(compared.$queryRaw.mock.calls)).toBe(2);
  });

  it("keeps a metric's caveat, and gives Visitors its own", async () => {
    const donors = (await computeCardData(
      asDb(makeFakeDb()),
      makeCtx(),
      trendInput("donors-count"),
    )) as TrendChartCardData;
    expect(donors.note).toBe("Donations without an email aren't counted");

    const visitors = (await computeCardData(
      asDb(makeFakeDb()),
      makeCtx(),
      trendInput("visitors"),
    )) as TrendChartCardData;
    expect(visitors.note).toBe(
      "Daily visitors can add up to more than the total",
    );
    expect(visitorsTrendNote("month")).toBe(
      "Monthly visitors can add up to more than the total",
    );

    const plain = (await computeCardData(
      asDb(makeFakeDb()),
      makeCtx(),
      trendInput("net-revenue"),
    )) as TrendChartCardData;
    expect(plain.note).toBeUndefined();
  });

  it("returns an average over zero rows as a null total, not zero", async () => {
    const db = makeFakeDb();
    db.donation.aggregate.mockResolvedValue({
      _sum: { amountCents: null },
      _count: { _all: 0 },
    });
    const trend = (await computeCardData(
      asDb(db),
      makeCtx(),
      trendInput("donation-average", true),
    )) as TrendChartCardData;
    expect(trend.total).toBeNull();
    expect(trend.previousTotal).toBeNull();
    expect(trend.comparisonLabel).toBeNull();
  });
});

describe("trend-chart on Visitors", () => {
  it("reports Umami trouble as an unavailable card, like the Visitors card", async () => {
    umami.getConnectionStatus.mockResolvedValue("auth_failed");
    const card = await computeCardData(
      asDb(makeFakeDb()),
      makeCtx(),
      trendInput("visitors"),
    );
    expect(card).toEqual({
      kind: "unavailable",
      reason: "umami-unavailable",
      message: "Analytics can't connect right now",
    });
  });

  it("is unavailable (feature-off) when the store has no Umami site", async () => {
    const card = await computeCardData(
      asDb(makeFakeDb()),
      makeCtx({ umamiWebsiteId: null }),
      trendInput("visitors"),
    );
    expect(card).toMatchObject({ kind: "unavailable", reason: "feature-off" });
  });

  it("is unavailable when the series can't be had, never a fake flat line", async () => {
    umami.getPageviewsSeries.mockResolvedValue({ pageviews: [], sessions: [] });
    const card = await computeCardData(
      asDb(makeFakeDb()),
      makeCtx(),
      trendInput("visitors"),
    );
    expect(card).toMatchObject({
      kind: "unavailable",
      reason: "umami-unavailable",
    });
  });

  it("plots the sessions series with the headline total", async () => {
    const trend = (await computeCardData(
      asDb(makeFakeDb()),
      makeCtx(),
      trendInput("visitors", true),
    )) as TrendChartCardData;
    expect(trend.total).toBe(120);
    expect(trend.points.at(-1)).toMatchObject({ key: "2026-10-16", value: 35 });
    expect(trend.points.at(-2)).toMatchObject({ key: "2026-10-15", value: 40 });
    expect(trend.previousPoints).toHaveLength(30);
    expect(trend.format).toBe("count");
  });
});
