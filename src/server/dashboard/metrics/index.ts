import * as Sentry from "@sentry/nextjs";

import type {
  CardDataRequest,
  DashboardMetricsContext,
  StatPart,
  StatQuery,
} from "./types";
import type { CardData, StatCardData } from "~/lib/dashboard/card-data";
import type { WidgetDef } from "~/lib/dashboard/widgets";
import type { TxClient } from "~/server/db";
import { unavailableCardData } from "~/lib/dashboard/card-data";
import { resolveDashboardRange } from "~/lib/dashboard/ranges";
import {
  effectiveCompare,
  getWidget,
  resolveCardRange,
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

  /** Run one stat family for the current window (and the previous when comparing). */
  async function stat(
    run: (q: StatQuery) => Promise<StatPart>,
  ): Promise<StatCardData> {
    const [current, prior] = await Promise.all([
      run(query),
      comparePrevious
        ? run({ ...query, win: comparePrevious, series: false })
        : Promise.resolve(null),
    ]);
    return assembleStat(def, current, prior, comparePrevious?.label ?? null);
  }

  switch (widget) {
    case "gross-revenue":
    case "net-revenue":
    case "refunds":
    case "order-count":
    case "avg-order-value":
      return stat((q) => orderMoneyStat(q, widget));

    case "orders-to-fulfill":
    case "orders-awaiting-payment":
    case "orders-fulfilled":
    case "orders-cancelled":
      return stat((q) => orderStatusStat(q, widget));

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

    case "low-stock-count": {
      const data = await lowStock(db, ctx.businessId, {
        includeProducts: ctx.isEnabled("products"),
        includePools: ctx.isEnabled("inventory"),
        take: 1,
      });
      return assembleStat(
        def,
        { value: data.totalCount, detail: [] },
        null,
        null,
      );
    }

    case "low-stock-list":
      return lowStock(db, ctx.businessId, {
        includeProducts: ctx.isEnabled("products"),
        includePools: ctx.isEnabled("inventory"),
        take: maxListItems(def),
      });

    case "donations-total":
    case "donations-count":
    case "donors-count":
    case "donation-average":
      return stat((q) => donationStat(q, widget));

    case "invoices-outstanding":
    case "invoices-overdue":
    case "invoices-collected":
      return stat((q) => invoiceStat(q, widget));

    case "active-subscribers":
    case "mrr":
      return stat((q) => subscriptionStat(q, widget));

    case "new-customers":
    case "total-customers":
    case "quote-requests":
    case "form-submissions":
      return stat((q) => customerStat(q, widget));

    case "visitors":
    case "conversion-rate": {
      const { current, previous: prior } = await trafficStat(
        query,
        widget,
        comparePrevious,
      );
      return assembleStat(def, current, prior, comparePrevious?.label ?? null);
    }

    default: {
      const unhandled: never = widget;
      throw new Error(`Unhandled dashboard widget: ${String(unhandled)}`);
    }
  }
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
