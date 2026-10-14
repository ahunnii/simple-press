/**
 * Store-time-zone bucketing (day or month) with zero-fill.
 *
 * Client-safe.
 *
 * Buckets are calendar days / months *where the store is* (`Business.timeZone`),
 * not where the server is: production runs in UTC, and server-local days moved
 * a Detroit store's 9pm orders into tomorrow's bar.
 *
 * Keys: day = "YYYY-MM-DD", month = "YYYY-MM". Both sort correctly as strings.
 *
 * Span: every bucket from `start`'s through `end`'s INCLUSIVE. Passing a
 * dashboard range's `endExclusive` (= now) is therefore right — today's bucket
 * is the last one. A caller whose end sits exactly on a bucket boundary and
 * must exclude it should pass `end - 1ms`.
 */

import { parseZonedDateTime } from "~/lib/events/normalize";

export type BucketGranularity = "day" | "month";

export type ZonedBucket<V> = {
  /** "YYYY-MM-DD" (day) or "YYYY-MM" (month). */
  key: string;
  /** The instant the bucket starts (local midnight / the 1st) in the store's zone. */
  start: Date;
  value: V;
};

const DAY_KEY_FORMATTERS = new Map<string, Intl.DateTimeFormat>();

/**
 * The YYYY-MM-DD calendar date `date` falls on in `timeZone`. Deliberately
 * avoids `toISOString()`/UTC slicing, which would shift rows near the store's
 * midnight into the wrong bucket.
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

/** The "YYYY-MM" calendar month `date` falls in, in `timeZone`. */
export function zonedMonthKey(date: Date, timeZone: string): string {
  return zonedDayKey(date, timeZone).slice(0, 7);
}

export function zonedBucketKey(
  date: Date,
  granularity: BucketGranularity,
  timeZone: string,
): string {
  return granularity === "day"
    ? zonedDayKey(date, timeZone)
    : zonedMonthKey(date, timeZone);
}

/** The bucket after `key`. Pure calendar math, no zone. */
export function nextBucketKey(
  key: string,
  granularity: BucketGranularity,
): string {
  if (granularity === "day") {
    const [y, m, d] = key.split("-").map(Number) as [number, number, number];
    return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
  }
  const [y, m] = key.split("-").map(Number) as [number, number];
  return new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 7);
}

/** The instant bucket `key` starts in `timeZone`. */
export function bucketStart(
  key: string,
  granularity: BucketGranularity,
  timeZone: string,
): Date {
  return parseZonedDateTime(
    granularity === "day" ? key : `${key}-01`,
    timeZone,
  );
}

/** The instant the calendar day containing `date` starts in `timeZone`. */
export function startOfZonedDay(date: Date, timeZone: string): Date {
  return parseZonedDateTime(zonedDayKey(date, timeZone), timeZone);
}

/** Every bucket key from `start`'s through `end`'s, inclusive. */
export function bucketKeysBetween(
  start: Date,
  end: Date,
  granularity: BucketGranularity,
  timeZone: string,
): string[] {
  const keys: string[] = [];
  const lastKey = zonedBucketKey(end, granularity, timeZone);
  for (
    let key = zonedBucketKey(start, granularity, timeZone);
    key <= lastKey;
    key = nextBucketKey(key, granularity)
  ) {
    keys.push(key);
  }
  return keys;
}

const LABEL_FORMATTERS: Record<BucketGranularity, Intl.DateTimeFormat> = {
  // The key is already a store-local calendar value; format it on the UTC
  // scratch calendar so no zone can shift it.
  day: new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
  }),
  month: new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "short",
    year: "numeric",
  }),
};

/** Axis label for a bucket key: "Oct 12" (day) or "Oct 2026" (month). */
export function bucketLabel(
  key: string,
  granularity: BucketGranularity,
): string {
  const iso = granularity === "day" ? key : `${key}-01`;
  return LABEL_FORMATTERS[granularity].format(new Date(`${iso}T00:00:00Z`));
}

/**
 * Lay pre-aggregated totals (e.g. rows from a SQL `date_trunc` in the store
 * zone, keyed the same way) onto the continuous bucket axis, filling gaps
 * with `empty()`.
 */
export function fillBuckets<V>(
  totals: ReadonlyMap<string, V>,
  opts: {
    start: Date;
    end: Date;
    granularity: BucketGranularity;
    timeZone: string;
    empty: () => V;
  },
): ZonedBucket<V>[] {
  return bucketKeysBetween(
    opts.start,
    opts.end,
    opts.granularity,
    opts.timeZone,
  ).map((key) => ({
    key,
    start: bucketStart(key, opts.granularity, opts.timeZone),
    value: totals.get(key) ?? opts.empty(),
  }));
}

/**
 * Fold rows into zoned buckets and zero-fill. Rows outside the span are still
 * folded but never surface (only span keys are emitted).
 */
export function bucketByZone<R, V>(
  rows: readonly R[],
  opts: {
    start: Date;
    end: Date;
    granularity: BucketGranularity;
    timeZone: string;
    at: (row: R) => Date;
    empty: () => V;
    add: (acc: V, row: R) => V;
  },
): ZonedBucket<V>[] {
  const totals = new Map<string, V>();
  for (const row of rows) {
    const key = zonedBucketKey(opts.at(row), opts.granularity, opts.timeZone);
    totals.set(key, opts.add(totals.get(key) ?? opts.empty(), row));
  }
  return fillBuckets(totals, opts);
}
