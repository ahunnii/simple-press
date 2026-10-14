import { Prisma } from "generated/prisma";

import type { MetricWindow } from "./types";
import type { SeriesPoint } from "~/lib/dashboard/card-data";
import type { DashboardRangeGranularity } from "~/lib/dashboard/ranges";
import type { TxClient } from "~/server/db";
import { bucketLabel, bucketStart, fillBuckets } from "~/lib/dashboard/buckets";
import { normalizeTimeZone } from "~/lib/dashboard/ranges";
import { ymdToUtcMidnight } from "~/lib/invoices/status";

/**
 * Sparkline / chart series: SQL `date_trunc` in the STORE's zone, zero-filled
 * onto a continuous axis with the shared `buckets.ts` helpers.
 *
 * Prisma stores `DateTime` as `timestamp(3)` WITHOUT a zone (UTC wall time),
 * so the zone conversion is two steps: `AT TIME ZONE 'UTC'` pins the stored
 * value as a UTC instant, then `AT TIME ZONE <store zone>` gives the local
 * wall time to truncate. A single `AT TIME ZONE <zone>` would reinterpret the
 * UTC value AS local time and shift every bucket edge by the zone's offset.
 */

/** Closed sets: these reach the query through `Prisma.raw`, never from input. */
export type SeriesTable =
  | "Order"
  | "Donation"
  | "Customer"
  | "QuoteSubmission"
  | "FormSubmission";
export type SeriesTimeColumn = "createdAt" | "submittedAt";

export type BucketTotals = { count: number; sum: number };

const FORMATS: Record<DashboardRangeGranularity, string> = {
  day: "YYYY-MM-DD",
  month: "YYYY-MM",
};

type BucketRow = { key: string; count: number; sum: number };

function toTotals(rows: BucketRow[]): Map<string, BucketTotals> {
  return new Map(
    rows.map((row) => [
      row.key,
      { count: Number(row.count), sum: Number(row.sum) },
    ]),
  );
}

/** Aliases reach the query through `Prisma.raw`: code-defined, letters only. */
const AGGREGATE_ALIAS = /^[A-Za-z]+$/;

/** The key `queryBucketAggregates` uses when `granularity` is null. */
export const WHOLE_WINDOW_KEY = "all";

/**
 * Named aggregates over `table`'s rows for the business inside the window,
 * per store-local bucket (`granularity`) or for the whole window
 * (`granularity: null` → one entry under `WHOLE_WINDOW_KEY`, present even
 * when no rows match). Each aggregate is cast to float8 and NULL becomes 0.
 */
export async function queryBucketAggregates<K extends string>(
  db: TxClient,
  opts: {
    table: SeriesTable;
    timeColumn: SeriesTimeColumn;
    businessId: string;
    window: MetricWindow;
    granularity: DashboardRangeGranularity | null;
    timeZone: string;
    aggregates: Record<K, Prisma.Sql>;
    /** Extra AND-ed predicate, e.g. `"status" = 'cancelled'`. */
    whereSql?: Prisma.Sql;
  },
): Promise<Map<string, Record<K, number>>> {
  const table = Prisma.raw(`"${opts.table}"`);
  const col = Prisma.raw(`"${opts.timeColumn}"`);
  const { start, endExclusive } = opts.window;
  const names = Object.keys(opts.aggregates) as K[];

  const selects = names.map((name) => {
    if (!AGGREGATE_ALIAS.test(name)) {
      throw new Error(`Invalid aggregate alias: ${name}`);
    }
    const expr: Prisma.Sql = opts.aggregates[name];
    return Prisma.sql`COALESCE(${expr}, 0)::float8 AS ${Prisma.raw(`"${name}"`)}`;
  });

  let keySql: Prisma.Sql;
  let groupSql: Prisma.Sql = Prisma.empty;
  if (opts.granularity) {
    const tz = normalizeTimeZone(opts.timeZone);
    const unit = Prisma.raw(`'${opts.granularity}'`);
    const fmt = Prisma.raw(`'${FORMATS[opts.granularity]}'`);
    keySql = Prisma.sql`to_char(
             date_trunc(${unit}, (${col} AT TIME ZONE 'UTC') AT TIME ZONE ${tz}::text),
             ${fmt}
           )`;
    groupSql = Prisma.sql`GROUP BY 1 ORDER BY 1`;
  } else {
    keySql = Prisma.sql`${WHOLE_WINDOW_KEY}::text`;
  }

  const rows = await db.$queryRaw<Array<Record<string, unknown>>>(
    // Built as ONE `Prisma.sql` here and passed as an object, never as a
    // tagged template on `db`: the shared client can come from a different
    // module instance (Next server layers), whose tag rebuilds the query and
    // fails `instanceof Sql` on our nested fragments, binding them as values.
    Prisma.sql`
    SELECT ${keySql} AS key, ${Prisma.join(selects, ", ")}
    FROM ${table}
    WHERE "businessId" = ${opts.businessId}
      AND ${col} < ${endExclusive}
      ${start ? Prisma.sql`AND ${col} >= ${start}` : Prisma.empty}
      ${opts.whereSql ? Prisma.sql`AND ${opts.whereSql}` : Prisma.empty}
    ${groupSql}
  `,
  );
  return new Map(
    rows.map((row) => {
      const values = {} as Record<K, number>;
      for (const name of names) values[name] = Number(row[name] ?? 0);
      return [String(row.key), values];
    }),
  );
}

/**
 * Row count and `sumSql` total per store-local bucket, for rows of `table`
 * belonging to the business inside the window.
 */
export async function queryBucketTotals(
  db: TxClient,
  opts: {
    table: SeriesTable;
    timeColumn: SeriesTimeColumn;
    businessId: string;
    window: MetricWindow;
    granularity: DashboardRangeGranularity;
    timeZone: string;
    /** An aggregate over the table's columns, e.g. `SUM("amountCents")`. */
    sumSql?: Prisma.Sql;
    /** Extra AND-ed predicate, e.g. `"status" = 'cancelled'`. */
    whereSql?: Prisma.Sql;
  },
): Promise<Map<string, BucketTotals>> {
  const { sumSql, ...rest } = opts;
  return queryBucketAggregates(db, {
    ...rest,
    aggregates: {
      count: Prisma.sql`COUNT(*)`,
      sum: sumSql ?? Prisma.sql`0`,
    },
  });
}

/**
 * Invoice payments collected per bucket. `paidOn` is a calendar date stored at
 * UTC midnight, so it is bucketed as-is (no zone shift) and bounded by the
 * window's calendar-day strings.
 */
export async function queryInvoicePaymentTotals(
  db: TxClient,
  opts: {
    businessId: string;
    window: MetricWindow;
    granularity: DashboardRangeGranularity;
  },
): Promise<Map<string, BucketTotals>> {
  const unit = Prisma.raw(`'${opts.granularity}'`);
  const fmt = Prisma.raw(`'${FORMATS[opts.granularity]}'`);
  const { startYmd, endYmdExclusive } = opts.window;
  const rows = await db.$queryRaw<BucketRow[]>(
    // A prebuilt `Prisma.sql` object; see `queryBucketAggregates` for why.
    Prisma.sql`
    SELECT to_char(date_trunc(${unit}, "paidOn"), ${fmt}) AS key,
           COUNT(*)::float8 AS count,
           COALESCE(SUM("amountCents"), 0)::float8 AS sum
    FROM "InvoicePayment"
    WHERE "businessId" = ${opts.businessId}
      AND "paidOn" < ${ymdToUtcMidnight(endYmdExclusive)}
      ${startYmd ? Prisma.sql`AND "paidOn" >= ${ymdToUtcMidnight(startYmd)}` : Prisma.empty}
    GROUP BY 1
    ORDER BY 1
  `,
  );
  return toTotals(rows);
}

/**
 * Lay per-bucket values onto a continuous axis.
 *
 * `start` null (All time) begins at the earliest bucket that has data, so a
 * store with one old order isn't drawn against a decade of empty months; with
 * no data at all the axis is the single bucket holding `end`.
 */
export function toSeriesPoints(
  totals: ReadonlyMap<string, number>,
  opts: {
    start: Date | null;
    end: Date;
    granularity: DashboardRangeGranularity;
    timeZone: string;
  },
): SeriesPoint[] {
  const tz = normalizeTimeZone(opts.timeZone);
  let start = opts.start;
  if (!start) {
    const firstKey = [...totals.keys()].sort()[0];
    start = firstKey ? bucketStart(firstKey, opts.granularity, tz) : opts.end;
  }
  return fillBuckets(totals, {
    start,
    end: opts.end,
    granularity: opts.granularity,
    timeZone: tz,
    empty: () => 0,
  }).map((bucket) => ({
    key: bucket.key,
    label: bucketLabel(bucket.key, opts.granularity),
    value: bucket.value,
  }));
}

/** `toSeriesPoints` for a window on instants, in the store's zone. */
export function windowSeriesPoints(
  totals: ReadonlyMap<string, number>,
  win: MetricWindow,
  granularity: DashboardRangeGranularity,
  timeZone: string,
): SeriesPoint[] {
  return toSeriesPoints(totals, {
    start: win.start,
    end: win.endExclusive,
    granularity,
    timeZone,
  });
}

/** `toSeriesPoints` for calendar-date columns (UTC-midnight dates, no zone shift). */
export function ymdSeriesPoints(
  totals: ReadonlyMap<string, number>,
  win: MetricWindow,
  granularity: DashboardRangeGranularity,
): SeriesPoint[] {
  return toSeriesPoints(totals, {
    start: win.startYmd ? ymdToUtcMidnight(win.startYmd) : null,
    // The last whole day of the window (the bound is exclusive).
    end: new Date(ymdToUtcMidnight(win.endYmdExclusive).getTime() - 1),
    granularity,
    timeZone: "UTC",
  });
}

/** Pull one number out of each bucket's totals. */
export function pickTotals<T = BucketTotals>(
  totals: ReadonlyMap<string, T>,
  pick: (bucket: T) => number,
): Map<string, number> {
  return new Map([...totals].map(([key, value]) => [key, pick(value)]));
}
