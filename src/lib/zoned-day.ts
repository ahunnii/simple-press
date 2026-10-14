import { parseZonedDateTime } from "~/lib/events/normalize";

/**
 * Local midnight of `ymd` in `timeZone`, as an instant; UTC midnight if the
 * zone is bad. Pair with `addCalendarDays(ymd, 1)` for an exclusive day-range
 * upper bound that stays correct across DST.
 */
export function zonedDayStart(ymd: string, timeZone: string): Date {
  try {
    return parseZonedDateTime(ymd, timeZone);
  } catch {
    return new Date(`${ymd}T00:00:00Z`);
  }
}
