/**
 * Store-time-zone day-bucketing for the 30-day revenue chart.
 *
 * The dashboard page fetches raw `{ createdAt, total }` rows instead of
 * relying on `groupBy(["createdAt"])`, which groups by the full timestamp
 * (one row per order) rather than by calendar day. This module sums orders
 * into one revenue total per calendar day *where the store is*
 * (`Business.timeZone`) and fills any day with no orders as 0, so the chart
 * axis stays continuous.
 *
 * The store's zone, not the server's: production runs in UTC, so bucketing by
 * server-local days moved a Detroit store's 9pm orders into tomorrow's bar
 * and reset "today" at 8pm.
 */

import { parseZonedDateTime } from "~/lib/events/normalize";

export type RevenueOrder = {
  createdAt: Date;
  total: number;
};

export type DailyRevenue = {
  /** The instant the calendar day starts (midnight) in the store's zone. */
  date: Date;
  revenue: number;
};

const DAY_KEY_FORMATTERS = new Map<string, Intl.DateTimeFormat>();

/**
 * The YYYY-MM-DD calendar date `date` falls on in `timeZone`. Deliberately
 * avoids `toISOString()`/UTC slicing, which would shift orders near the
 * store's midnight into the wrong day bucket.
 */
export function zonedDayKey(date: Date, timeZone: string): string {
  let formatter = DAY_KEY_FORMATTERS.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    DAY_KEY_FORMATTERS.set(timeZone, formatter);
  }
  const parts = formatter.formatToParts(date);
  const field = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return `${field("year")}-${field("month")}-${field("day")}`;
}

/** The instant the calendar day containing `date` starts in `timeZone`. */
export function startOfZonedDay(date: Date, timeZone: string): Date {
  return parseZonedDateTime(zonedDayKey(date, timeZone), timeZone);
}

/** The calendar date after `key` ("YYYY-MM-DD"). Pure date math, no zone. */
function nextDayKey(key: string): string {
  const [y, m, d] = key.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}

/**
 * Buckets orders into one revenue total per calendar day in `timeZone`,
 * spanning every day from `start`'s through `end`'s inclusive — including
 * days with zero orders, filled with 0 revenue.
 *
 * `total` values keep whatever unit the caller passes in (cents, matching
 * the rest of the dashboard's money conventions); this function only sums.
 */
export function bucketRevenueByDay(
  orders: RevenueOrder[],
  start: Date,
  end: Date,
  timeZone: string,
): DailyRevenue[] {
  const totals = new Map<string, number>();
  for (const order of orders) {
    const key = zonedDayKey(order.createdAt, timeZone);
    totals.set(key, (totals.get(key) ?? 0) + order.total);
  }

  const days: DailyRevenue[] = [];
  const lastKey = zonedDayKey(end, timeZone);
  // YYYY-MM-DD strings compare correctly as plain strings.
  for (
    let key = zonedDayKey(start, timeZone);
    key <= lastKey;
    key = nextDayKey(key)
  ) {
    days.push({
      date: parseZonedDateTime(key, timeZone),
      revenue: totals.get(key) ?? 0,
    });
  }

  return days;
}
