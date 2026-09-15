/**
 * Loyalty Rewards — pure calendar helpers for the birthday bonus.
 *
 * MUST stay free of server imports. `birthdaySchema` in
 * `src/lib/validators/loyalty.ts` depends on `isValidBirthday`, and Zod
 * validators are shared with client components (the admin customer loyalty
 * card, the loyalty settings form), so anything imported here lands in the
 * browser bundle. The cron sweep that spends these helpers lives in
 * `./birthday.ts`, which pulls in Sentry, Prisma and the `server-only` email
 * stack — importing THAT file from a validator is exactly what broke the
 * 2026-09-14 production build. Keep the two halves apart.
 *
 * `zonedCalendarDate` (from `~/lib/calendar-date`) is the one place this
 * crosses into `Intl`, and it already falls back to UTC on a bad time zone
 * string, so nothing here can throw on malformed `Business.timeZone`.
 */

import { zonedCalendarDate } from "~/lib/calendar-date";

/** True for a Gregorian leap year (divisible by 4, not by 100 unless also by 400). */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * The birthday(s) that qualify for today's bonus in `timeZone`, plus the
 * current year for building the `birthday:<customerId>:<YYYY>` ledger
 * idempotency key. Consumed by `awardBirthdayPoints` below.
 *
 * `targets` is normally just `[today]`. On February 28th of a non-leap year
 * it additionally includes `{ month: 2, day: 29 }`, so a customer whose
 * stored birthday is February 29th still gets their bonus once a year
 * instead of being skipped for three years out of four.
 */
export function birthdayTargets(
  now: Date,
  timeZone: string,
): {
  year: number;
  today: { month: number; day: number };
  targets: Array<{ month: number; day: number }>;
} {
  const ymd = zonedCalendarDate(now, timeZone);
  const [yearStr, monthStr, dayStr] = ymd.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  const today = { month, day };

  const targets: Array<{ month: number; day: number }> = [today];
  if (month === 2 && day === 28 && !isLeapYear(year)) {
    targets.push({ month: 2, day: 29 });
  }

  return { year, today, targets };
}

const MONTH_MAX_DAYS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/**
 * Whether `month`/`day` is a real, year-agnostic calendar birthday (February
 * always allows the 29th, since a birthday is stored without a year).
 * Consumed by `birthdaySchema` in `src/lib/validators/loyalty.ts` and the
 * "save your birthday" account-preferences form.
 */
export function isValidBirthday(month: number, day: number): boolean {
  if (!Number.isInteger(month) || !Number.isInteger(day)) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1) return false;
  const max = MONTH_MAX_DAYS[month - 1] ?? 31;
  return day <= max;
}
