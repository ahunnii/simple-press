import { addCalendarDays } from "~/lib/calendar-date";

/**
 * When the weekly invoice digest is due for a business — pure, client-safe.
 *
 * The digest goes out "every Monday at 8am in the business's time zone". The
 * cron runs on a fixed UTC cadence, so each run asks every business
 * `digestWindow(now, business.timeZone)` and sends when `due` and
 * `InvoiceSettings.lastDigestWeekKey !== weekKey`, then stamps the key.
 *
 * **Catch-up.** `due` stays true from Monday 08:00 through the end of Sunday,
 * not just during Monday morning. If the Monday run is missed (deploy, outage,
 * email provider down so nothing was stamped), the next run that week still
 * sends it — late beats never for a "what's outstanding" summary. The
 * `weekKey` dedupe is what keeps that to one digest per week.
 *
 * All local fields come from `Intl.DateTimeFormat#formatToParts` in the
 * business's zone, so DST needs no special handling: 08:00 local is 08:00 on
 * the wall clock whether that's UTC−4 or UTC−5 that week.
 */

/** Local hour (0–23) the digest becomes due on Monday. */
export const DIGEST_LOCAL_HOUR = 8;

const WEEKDAY_INDEX: Record<string, number> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
  Sun: 7,
};

type LocalParts = { ymd: string; weekday: number; hour: number };

function localParts(now: Date, timeZone: string): LocalParts {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
      hour: "2-digit",
      hourCycle: "h23",
    }).formatToParts(now);
  } catch {
    // Invalid IANA zone → UTC, matching `zonedCalendarDate`: a typo in
    // `Business.timeZone` must not break the cron for every other business.
    return localParts(now, "UTC");
  }

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return {
    ymd: `${get("year")}-${get("month")}-${get("day")}`,
    weekday: WEEKDAY_INDEX[get("weekday")] ?? 1,
    // Some engines render midnight as "24" even with h23; fold it back.
    hour: Number(get("hour")) % 24,
  };
}

export type DigestWindow = {
  /** True from Monday `DIGEST_LOCAL_HOUR`:00 local through Sunday 23:59 local. */
  due: boolean;
  /** `YYYY-MM-DD` of this week's local Monday — the dedupe key stored in `lastDigestWeekKey`. */
  weekKey: string;
};

export function digestWindow(now: Date, timeZone: string): DigestWindow {
  const { ymd, weekday, hour } = localParts(now, timeZone);
  return {
    due: weekday > 1 || hour >= DIGEST_LOCAL_HOUR,
    weekKey: addCalendarDays(ymd, -(weekday - 1)),
  };
}
