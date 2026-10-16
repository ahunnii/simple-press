import * as Sentry from "@sentry/nextjs";

import type {
  CardDataRequest,
  DashboardMetricsContext,
  MetricWindow,
  StatPart,
  StatQuery,
} from "./types";
import type { CardData, StatCardData } from "~/lib/dashboard/card-data";
import type { ResolvedPreviousRange } from "~/lib/dashboard/ranges";
import type { WidgetDef, WidgetId } from "~/lib/dashboard/widgets";
import type { TxClient } from "~/server/db";
import { unavailableCardData } from "~/lib/dashboard/card-data";
import { resolveDashboardRange } from "~/lib/dashboard/ranges";
import {
  effectiveCompare,
  getWidget,
  isPlottableMetric,
  resolveCardRange,
  trendStyle,
} from "~/lib/dashboard/widgets";

import { customerStat } from "./customers";
import { donationStat } from "./donations";
import { lowStock } from "./inventory";
import { invoiceStat } from "./invoices";
import {
  orderMoneyStat,
  orderStatusStat,
  recentOrders,
  revenueChart,
  topProducts,
} from "./orders";
import { subscriptionStat } from "./subscriptions";
import { trafficStat, TrafficUnavailableError } from "./traffic";

export type { CardDataRequest, DashboardMetricsContext } from "./types";

const DEFAULT_LIST_ITEMS = 5;

/** The most rows any size of this list card shows (the client trims to its size). */
function maxListItems(def: WidgetDef): number {
  const counts = Object.values(def.itemsBySize ?? {});
  return counts.length > 0 ? Math.max(...counts) : DEFAULT_LIST_ITEMS;
}

/**
 * Data for one dashboard card. Never throws: a failing card is reported to
 * Sentry and returned as an `unavailable` value so one bad query can't take
 * down the dashboard. (The router handles auth and feature availability.)
 */
export async function computeCardData(
  db: TxClient,
  ctx: DashboardMetricsContext,
  input: CardDataRequest,
): Promise<CardData> {
  try {
    return await compute(db, ctx, input);
  } catch (err) {
    if (err instanceof TrafficUnavailableError) return err.card;
    Sentry.captureException(err, {
      tags: { area: "dashboard-card", widget: input.widget },
      extra: { businessId: ctx.businessId, range: input.range ?? null },
    });
    return unavailableCardData("error", "Couldn't load this card");
  }
}

async function compute(
  db: TxClient,
  ctx: DashboardMetricsContext,
  input: CardDataRequest,
): Promise<CardData> {
  const widget = input.widget;
  const def = getWidget(widget);

  // Range-less widgets resolve "all" as a dummy window they ignore.
  const rangeKey = resolveCardRange(def, input.range);
  const range = resolveDashboardRange(rangeKey ?? "all", ctx.now, ctx.timeZone);
  const previous = range.previous;
  const compare =
    previous !== null &&
    effectiveCompare({ range: rangeKey, compare: input.compare }, def);
  const comparePrevious = compare ? previous : null;

  const query: StatQuery = {
    db,
    ctx,
    win: range,
    series: input.series && def.sparkline,
    granularity: range.granularity,
  };

  // Every stat widget goes through its family's runner (the Trend chart reuses
  // the same ones), so a number is computed in exactly one place.
  const runner = statRunnerFor(widget);
  if (runner) {
    const { current, previous: prior } = await runner(query, comparePrevious, {
      previousSeries: false,
    });
    return assembleStat(def, current, prior, comparePrevious?.label ?? null);
  }

  switch (widget) {
    case "recent-orders":
      return recentOrders(db, ctx.businessId, maxListItems(def));

    case "revenue-chart":
      return revenueChart(
        db,
        ctx,
        range,
        comparePrevious,
        range.granularity,
        comparePrevious?.label ?? null,
      );

    case "top-products":
      return topProducts(db, ctx.businessId, range, maxListItems(def));

    case "low-stock-list":
      return lowStock(db, ctx.businessId, {
        includeProducts: ctx.isEnabled("products"),
        includePools: ctx.isEnabled("inventory"),
        take: maxListItems(def),
      });

    case "trend-chart":
      return trendChart(
        { ...query, series: true },
        input.metric ?? null,
        comparePrevious,
      );

    default:
      throw new Error(`Unhandled dashboard widget: ${widget}`);
  }
}

/**
 * Runs one stat widget's family for a window and, when comparing, for the
 * previous window. `previousSeries` asks for the previous window's per-bucket
 * series too (the Trend chart's ghost line); stat cards never need it.
 */
export type StatRunner = (
  q: StatQuery,
  previous: MetricWindow | null,
  opts: { previousSeries: boolean },
) => Promise<{ current: StatPart; previous: StatPart | null }>;

/** A family that measures one window at a time. */
function perWindow(run: (q: StatQuery) => Promise<StatPart>): StatRunner {
  return async (q, previous, { previousSeries }) => {
    const [current, prior] = await Promise.all([
      run(q),
      previous
        ? run({ ...q, win: previous, series: previousSeries })
        : Promise.resolve(null),
    ]);
    return { current, previous: prior };
  };
}

/**
 * The single source of truth for how each stat widget's number is computed.
 * Null for widgets that aren't stats (lists and charts).
 */
export function statRunnerFor(widget: WidgetId): StatRunner | null {
  switch (widget) {
    case "gross-revenue":
    case "net-revenue":
    case "refunds":
    case "order-count":
    case "avg-order-value":
      return perWindow((q) => orderMoneyStat(q, widget));

    case "orders-to-fulfill":
    case "orders-awaiting-payment":
    case "orders-fulfilled":
    case "orders-cancelled":
      return perWindow((q) => orderStatusStat(q, widget));

    case "low-stock-count":
      return perWindow(async (q) => {
        const data = await lowStock(q.db, q.ctx.businessId, {
          includeProducts: q.ctx.isEnabled("products"),
          includePools: q.ctx.isEnabled("inventory"),
          take: 1,
        });
        return { value: data.totalCount, detail: [] };
      });

    case "donations-total":
    case "donations-count":
    case "donors-count":
    case "donation-average":
      return perWindow((q) => donationStat(q, widget));

    case "invoices-outstanding":
    case "invoices-overdue":
    case "invoices-collected":
      return perWindow((q) => invoiceStat(q, widget));

    case "active-subscribers":
    case "mrr":
      return perWindow((q) => subscriptionStat(q, widget));

    case "new-customers":
    case "total-customers":
    case "quote-requests":
    case "form-submissions":
    case "upcoming-events":
    case "testimonials-pending":
    case "email-subscribers":
      return perWindow((q) => customerStat(q, widget));

    case "visitors":
    case "conversion-rate":
      // Traffic checks Umami once and measures both windows together.
      return (q, previous, opts) => trafficStat(q, widget, previous, opts);

    case "recent-orders":
    case "revenue-chart":
    case "top-products":
    case "low-stock-list":
    case "trend-chart":
      return null;

    default: {
      const unhandled: never = widget;
      throw new Error(`Unhandled dashboard widget: ${String(unhandled)}`);
    }
  }
}

/** Shown on a Trend chart of Visitors: bucket visitors are distinct per bucket. */
export function visitorsTrendNote(granularity: "day" | "month"): string {
  return `${granularity === "day" ? "Daily" : "Monthly"} visitors can add up to more than the total`;
}

/**
 * One stat over time. Runs the metric's own family, so `total` is exactly what
 * its stat card shows for the same range; the only extra work is the series
 * (and, when comparing, the previous window's series for the ghost line).
 * `q` is the trend card's own query (the card's range, `series: true`).
 */
async function trendChart(
  q: StatQuery,
  metric: WidgetId | null,
  comparePrevious: ResolvedPreviousRange | null,
): Promise<CardData> {
  if (!isPlottableMetric(metric)) {
    throw new Error("Trend chart without a plottable metric");
  }
  const metricDef = getWidget(metric);
  const run = statRunnerFor(metric);
  if (!run) throw new Error(`Trend chart can't plot ${metric}`);

  const { current, previous: prior } = await run(q, comparePrevious, {
    previousSeries: true,
  });

  if (!current.series) {
    // Only Visitors can come back without one (its series is best effort).
    if (metricDef.family === "traffic") {
      return unavailableCardData(
        "umami-unavailable",
        "Analytics is temporarily unavailable",
      );
    }
    throw new Error(`No series for trend metric ${metric}`);
  }

  const stat = assembleStat(
    metricDef,
    current,
    prior,
    comparePrevious?.label ?? null,
  );
  const note =
    metric === "visitors" ? visitorsTrendNote(q.granularity) : stat.note;

  return {
    kind: "trendChart",
    metric,
    metricLabel: metricDef.label,
    format: metricDef.format,
    style: trendStyle(metric),
    granularity: q.granularity,
    points: current.series,
    previousPoints: comparePrevious ? (prior?.series ?? null) : null,
    total: stat.value,
    previousTotal: stat.previous,
    comparisonLabel: stat.comparisonLabel,
    ...(note ? { note } : {}),
  };
}

function assembleStat(
  def: WidgetDef,
  current: StatPart,
  prior: StatPart | null,
  comparisonLabel: string | null,
): StatCardData {
  const previousValue = prior?.value ?? null;
  return {
    kind: "stat",
    value: current.value,
    format: def.format,
    previous: previousValue,
    comparisonLabel: previousValue === null ? null : comparisonLabel,
    detail: current.detail,
    ...(current.series ? { series: current.series } : {}),
    ...(current.note ? { note: current.note } : {}),
  };
}
