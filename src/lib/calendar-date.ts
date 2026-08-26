/**
 * Calendar-date helpers — pure, dependency-free, client-safe.
 *
 * A "calendar date" here is always a `YYYY-MM-DD` string: a day on a wall
 * calendar, NOT an instant. That distinction is the whole reason this module
 * exists. `new Date("2026-03-08")` is an instant at UTC midnight; adding
 * 86_400_000 ms to it lands on a different wall-calendar day than "the next
 * day" whenever a DST transition sits in between, and formatting it back with
 * local getters can shift it by a day for anyone west of UTC. Every function
 * below therefore does its arithmetic on the UTC scratch calendar (`Date.UTC`,
 * read back with UTC getters), which has no DST, and only crosses into a real
 * time zone through `Intl` when explicitly asked to.
 *
 * Deliberately importless and free of `server-only`: this is shared by Zod
 * validators, the quote engine, the QuickBooks mapper, and browser form code.
 */

const YMD_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * True when `ymd` is both shaped `YYYY-MM-DD` and a date that actually exists
 * on the calendar. The shape check alone accepts `2026-13-45`; the round-trip
 * through `Date.UTC` is what rejects it, because JS silently rolls overflowing
 * components forward (month 13 → January of the next year), so the parsed
 * fields no longer match what was handed in. Leap days work out for free:
 * `2024-02-29` round-trips, `2026-02-29` rolls to March 1 and fails.
 */
export function isRealCalendarDate(ymd: string): boolean {
  const match = YMD_PATTERN.exec(ymd);
  if (!match) return false;
  const [, yearStr, monthStr, dayStr] = match;
  const y = Number(yearStr);
  const m = Number(monthStr);
  const d = Number(dayStr);
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  );
}

/**
 * The calendar date it currently is in `timeZone`, as `YYYY-MM-DD`.
 *
 * Near midnight the zoned date and the UTC date differ by a full day (e.g.
 * `2026-06-01T03:30Z` is still `2026-05-31` in `America/Detroit`), which is
 * exactly the window where a "must be today or later" rule would otherwise
 * reject a shopper's perfectly valid answer. `en-CA` is used purely as a
 * formatting trick — that locale's date format IS `YYYY-MM-DD`, so the
 * formatted string can be returned as-is with no `formatToParts` reassembly.
 *
 * An invalid IANA zone falls back to UTC rather than throwing: this runs
 * inside request-path validation for whatever string a tenant has in
 * `Business.timeZone`, and a typo there must not 500 a quote submission.
 */
export function zonedCalendarDate(now: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

/**
 * The calendar date it currently is wherever this code is running — the
 * browser's zone on the client, the container's zone on the server. Use this
 * only for UI affordances (a date input's `min`); server-side rules must use
 * {@link zonedCalendarDate} with the tenant's own zone.
 */
export function localCalendarDate(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * `ymd` shifted by `days` whole calendar days (negative shifts backward).
 *
 * The arithmetic happens on the UTC scratch calendar, so a span containing a
 * DST transition still moves the requested number of days — adding 1 to
 * `2026-03-07` in a spring-forward week yields `2026-03-08`, not 23 hours
 * later. Returns `ymd` unchanged when it isn't a real calendar date, so a
 * caller that has already rejected bad input doesn't need a second guard.
 */
export function addCalendarDays(ymd: string, days: number): string {
  const match = YMD_PATTERN.exec(ymd);
  if (!match) return ymd;
  const [, yearStr, monthStr, dayStr] = match;
  const shifted = new Date(
    Date.UTC(Number(yearStr), Number(monthStr) - 1, Number(dayStr) + days),
  );
  if (Number.isNaN(shifted.getTime())) return ymd;
  return shifted.toISOString().slice(0, 10);
}
