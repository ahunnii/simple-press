/**
 * Server-local (not UTC) day-bucketing for the 30-day revenue chart.
 *
 * The dashboard page fetches raw `{ createdAt, total }` rows instead of
 * relying on `groupBy(["createdAt"])`, which groups by the full timestamp
 * (one row per order) rather than by calendar day. This module sums orders
 * into one revenue total per local calendar day and fills any day with no
 * orders as 0, so the chart axis stays continuous.
 */

export type RevenueOrder = {
  createdAt: Date;
  total: number;
};

export type DailyRevenue = {
  date: Date;
  revenue: number;
};

/**
 * A local (server timezone) YYYY-MM-DD key. Deliberately avoids
 * `toISOString()`/UTC slicing, which would shift orders near local midnight
 * into the wrong day bucket.
 */
function localDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function localDayStart(date: Date): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

/**
 * Buckets orders into one revenue total per local calendar day, spanning
 * every day from `start` through `end` inclusive (both truncated to local
 * midnight) — including days with zero orders, filled with 0 revenue.
 *
 * `total` values keep whatever unit the caller passes in (cents, matching
 * the rest of the dashboard's money conventions); this function only sums.
 */
export function bucketRevenueByDay(
  orders: RevenueOrder[],
  start: Date,
  end: Date,
): DailyRevenue[] {
  const totals = new Map<string, number>();
  for (const order of orders) {
    const key = localDayKey(order.createdAt);
    totals.set(key, (totals.get(key) ?? 0) + order.total);
  }

  const days: DailyRevenue[] = [];
  const cursor = localDayStart(start);
  const last = localDayStart(end);
  while (cursor.getTime() <= last.getTime()) {
    days.push({ date: new Date(cursor), revenue: totals.get(localDayKey(cursor)) ?? 0 });
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}
