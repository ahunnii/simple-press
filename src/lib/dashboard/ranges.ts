/**
 * Dashboard time ranges, resolved in the STORE's time zone.
 *
 * Client-safe (no React, no Prisma, no `server-only`): the edit-mode UI uses
 * the keys and labels, the server metrics use the resolved bounds.
 *
 * The finance router's `resolveRange` uses the same store-zone midnights, so
 * "Last N days" here and on Finances open on the same instant; Finances ends
 * at the store's next midnight instead of `now`, which selects the same rows.
 *
 * ── Bound semantics (read before writing a query) ──────────────────────────
 *
 * Every range except "all" is a period *to date*:
 *
 *   - `start`        zoned midnight of the first calendar day of the period.
 *   - `endExclusive` = `now`. Nothing in the data can sit in the future, so
 *                    "up to now" and "up to the end of today" select the same
 *                    rows; using `now` is what makes the previous window a
 *                    fair like-for-like comparison (see below).
 *   - `startYmd` / `endYmdExclusive`
 *                    whole calendar days for date-only columns (invoice
 *                    `dueDate` / `paidOn`). `endYmdExclusive` is the day AFTER
 *                    today, so today is always included: compare with
 *                    `ymd >= startYmd && ymd < endYmdExclusive`.
 *
 * Instants are compared `createdAt >= start && createdAt < endExclusive`.
 *
 * "Last N days" is N store-calendar days INCLUDING today (the window Finances
 * uses): starts at midnight N-1 days ago.
 *
 * ── Previous window ────────────────────────────────────────────────────────
 *
 * The same period-to-date, shifted back one period, ending at the same
 * wall-clock time of day as `now`:
 *
 *   today  → yesterday, midnight until now's time of day
 *   week   → last week, Monday until the same weekday + time
 *   month  → last month, the 1st until the same day-of-month + time, the day
 *            clamped to that month's length (Mar 31 → Feb 28/29)
 *   year   → last year, Jan 1 until the same date + time (Feb 29 → Feb 28)
 *   Nd     → the N days before, ending N days ago at now's time of day
 *   all    → no previous window
 *
 * The previous window never overlaps the current one: its end is clamped to
 * the current `start`. Its ymd bounds cover the corresponding days in full
 * (`endYmdExclusive` = the day after the corresponding "today").
 *
 * Weeks start on Monday.
 */

import { addCalendarDays, zonedCalendarDate } from "~/lib/calendar-date";
import { parseZonedDateTime } from "~/lib/events/normalize";
import { zonedDayStart } from "~/lib/zoned-day";

export const DASHBOARD_RANGE_KEYS = [
  "today",
  "week",
  "month",
  "year",
  "7d",
  "30d",
  "90d",
  "all",
] as const;

export type DashboardRangeKey = (typeof DASHBOARD_RANGE_KEYS)[number];

/** Every range, in picker order, with the label shown on cards and menus. */
export const DASHBOARD_RANGES: ReadonlyArray<{
  key: DashboardRangeKey;
  label: string;
}> = [
  { key: "today", label: "Today" },
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
  { key: "year", label: "This year" },
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "90d", label: "Last 90 days" },
  { key: "all", label: "All time" },
];

const RANGE_LABELS = Object.fromEntries(
  DASHBOARD_RANGES.map((r) => [r.key, r.label]),
) as Record<DashboardRangeKey, string>;

const COMPARISON_LABELS: Record<Exclude<DashboardRangeKey, "all">, string> = {
  today: "vs yesterday",
  week: "vs last week",
  month: "vs last month",
  year: "vs last year",
  "7d": "vs prior 7 days",
  "30d": "vs prior 30 days",
  "90d": "vs prior 90 days",
};

const LAST_N_DAYS: Partial<Record<DashboardRangeKey, number>> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

export function isDashboardRangeKey(
  value: unknown,
): value is DashboardRangeKey {
  return (
    typeof value === "string" &&
    (DASHBOARD_RANGE_KEYS as readonly string[]).includes(value)
  );
}

export function dashboardRangeLabel(key: DashboardRangeKey): string {
  return RANGE_LABELS[key];
}

export type DashboardRangeGranularity = "day" | "month";

export type ResolvedPreviousRange = {
  start: Date;
  endExclusive: Date;
  startYmd: string;
  endYmdExclusive: string;
  /** Comparison chip copy, e.g. "vs last week". */
  label: string;
};

export type ResolvedDashboardRange = {
  key: DashboardRangeKey;
  label: string;
  /** The zone the bounds were computed in (after validation / UTC fallback). */
  timeZone: string;
  /** null only for "all". */
  start: Date | null;
  /** Always `now`. */
  endExclusive: Date;
  /** null only for "all". */
  startYmd: string | null;
  /** The calendar day after today in the store's zone. */
  endYmdExclusive: string;
  previous: ResolvedPreviousRange | null;
  /** Series bucket size: day for ≤ 90-day spans, month for year / all. */
  granularity: DashboardRangeGranularity;
};

/**
 * `timeZone` if Intl accepts it, else "UTC". A typo'd `Business.timeZone`
 * must degrade to UTC rather than throw inside a dashboard query.
 */
export function normalizeTimeZone(timeZone: string | null | undefined): string {
  if (!timeZone) return "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return timeZone;
  } catch {
    return "UTC";
  }
}

const TIME_FORMATTERS = new Map<string, Intl.DateTimeFormat>();

/** `HH:mm:ss.SSS` wall-clock time of `now` in `timeZone`. */
function zonedTimeOfDay(now: Date, timeZone: string): string {
  let formatter = TIME_FORMATTERS.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      // h23, not hour12:false — the latter renders midnight as "24" on some ICU builds.
      hourCycle: "h23",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    TIME_FORMATTERS.set(timeZone, formatter);
  }
  const parts = formatter.formatToParts(now);
  const field = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "00";
  const ms = String(now.getUTCMilliseconds()).padStart(3, "0");
  return `${field("hour")}:${field("minute")}:${field("second")}.${ms}`;
}

function ymdParts(ymd: string): [number, number, number] {
  const [y, m, d] = ymd.split("-").map(Number) as [number, number, number];
  return [y, m, d];
}

function toYmd(year: number, month: number, day: number): string {
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** 0 = Monday … 6 = Sunday. */
function mondayIndex(ymd: string): number {
  const [y, m, d] = ymdParts(ymd);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

/**
 * For a to-date range: the first day of the current period, the first day of
 * the previous period, and the previous period's counterpart of today.
 */
function periodDays(
  key: Exclude<DashboardRangeKey, "all">,
  today: string,
): { startYmd: string; prevStartYmd: string; prevTodayYmd: string } {
  const [y, m, d] = ymdParts(today);
  switch (key) {
    case "today":
      return {
        startYmd: today,
        prevStartYmd: addCalendarDays(today, -1),
        prevTodayYmd: addCalendarDays(today, -1),
      };
    case "week": {
      const startYmd = addCalendarDays(today, -mondayIndex(today));
      return {
        startYmd,
        prevStartYmd: addCalendarDays(startYmd, -7),
        prevTodayYmd: addCalendarDays(today, -7),
      };
    }
    case "month": {
      const prevYear = m === 1 ? y - 1 : y;
      const prevMonth = m === 1 ? 12 : m - 1;
      return {
        startYmd: toYmd(y, m, 1),
        prevStartYmd: toYmd(prevYear, prevMonth, 1),
        prevTodayYmd: toYmd(
          prevYear,
          prevMonth,
          Math.min(d, daysInMonth(prevYear, prevMonth)),
        ),
      };
    }
    case "year":
      return {
        startYmd: toYmd(y, 1, 1),
        prevStartYmd: toYmd(y - 1, 1, 1),
        prevTodayYmd: toYmd(y - 1, m, Math.min(d, daysInMonth(y - 1, m))),
      };
    case "7d":
    case "30d":
    case "90d": {
      const n = LAST_N_DAYS[key] ?? 1;
      return {
        startYmd: addCalendarDays(today, -(n - 1)),
        prevStartYmd: addCalendarDays(today, -(2 * n - 1)),
        prevTodayYmd: addCalendarDays(today, -n),
      };
    }
  }
}

/** Resolve a range key to concrete bounds in the store's zone. See the module doc. */
export function resolveDashboardRange(
  key: DashboardRangeKey,
  now: Date,
  timeZone: string,
): ResolvedDashboardRange {
  const tz = normalizeTimeZone(timeZone);
  const today = zonedCalendarDate(now, tz);
  const endYmdExclusive = addCalendarDays(today, 1);
  const label = RANGE_LABELS[key];

  if (key === "all") {
    return {
      key,
      label,
      timeZone: tz,
      start: null,
      endExclusive: now,
      startYmd: null,
      endYmdExclusive,
      previous: null,
      granularity: "month",
    };
  }

  const { startYmd, prevStartYmd, prevTodayYmd } = periodDays(key, today);
  const start = zonedDayStart(startYmd, tz);

  // Same wall-clock time of day as `now`, on the previous period's "today".
  // A time skipped by spring-forward resolves to the moment after the gap.
  let prevEnd = parseZonedDateTime(
    `${prevTodayYmd}T${zonedTimeOfDay(now, tz)}`,
    tz,
  );
  if (prevEnd.getTime() > start.getTime()) prevEnd = start;

  return {
    key,
    label,
    timeZone: tz,
    start,
    endExclusive: now,
    startYmd,
    endYmdExclusive,
    previous: {
      start: zonedDayStart(prevStartYmd, tz),
      endExclusive: prevEnd,
      startYmd: prevStartYmd,
      endYmdExclusive: addCalendarDays(prevTodayYmd, 1),
      label: COMPARISON_LABELS[key],
    },
    granularity: key === "year" ? "month" : "day",
  };
}
