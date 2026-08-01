// ─────────────────────────────────────────────────────────────────────────────
// Events (admin) — UTC `Date` -> wall-clock input string, in the business's zone
// ─────────────────────────────────────────────────────────────────────────────
//
// `src/lib/events/normalize.ts` only goes one direction: an admin form's
// wall-clock string ("2026-08-15T19:00") -> the UTC `Date` persisted on
// `Event`. Populating the *edit* form needs the inverse — given the UTC `Date`
// already stored on an event, produce the "YYYY-MM-DD" /
// "YYYY-MM-DDTHH:mm" string that `<input type="date">` /
// `<input type="datetime-local">` expects, read as the business's own zone
// would read it.
//
// Skipping this and formatting with the ambient zone (the server's during SSR,
// the browser's after hydration) would make editing lossy: a Detroit event
// opened by an owner in Denver would populate the form two hours "early", and
// saving it back — through normalizeEventDates, which interprets the string in
// the business's zone again — would silently shift the stored instant by the
// offset on every edit.
//
// No such helper exists yet in src/lib/events/: format.ts only builds
// human-readable display strings (via its own private formatters), and
// normalize.ts only goes wall-clock -> UTC. This stays local to the admin
// event form rather than living in src/lib/events/ because it is purely an
// `<input>` value shape, not a formatting or persistence concern — and this
// task is scoped to files under src/app/admin/events/ only.

const WALL_CLOCK_FORMATTERS = new Map<string, Intl.DateTimeFormat>();

function wallClockFormatter(timeZone: string): Intl.DateTimeFormat {
  const cached = WALL_CLOCK_FORMATTERS.get(timeZone);
  if (cached) return cached;
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    // hourCycle "h23" rather than hour12:false — the latter yields "24" for
    // midnight on some ICU builds, which would silently shift a day. Same
    // reasoning as the offset formatter in src/lib/events/normalize.ts.
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  WALL_CLOCK_FORMATTERS.set(timeZone, formatter);
  return formatter;
}

function partValue(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
): string {
  return parts.find((p) => p.type === type)?.value ?? "";
}

/**
 * `instant` -> "YYYY-MM-DD" (when `allDay`) or "YYYY-MM-DDTHH:mm" (otherwise),
 * as read in `timeZone`.
 *
 * Accepts `Date | string` because tRPC/superjson usually preserve `Date`
 * across the wire, but a value that has been through a plain JSON round-trip
 * (or a cache) can arrive as an ISO string.
 */
export function toWallClockInput(
  instant: Date | string,
  allDay: boolean,
  timeZone: string,
): string {
  const date = instant instanceof Date ? instant : new Date(instant);
  const parts = wallClockFormatter(timeZone).formatToParts(date);
  const year = partValue(parts, "year");
  const month = partValue(parts, "month");
  const day = partValue(parts, "day");

  if (allDay) return `${year}-${month}-${day}`;

  const hour = partValue(parts, "hour");
  const minute = partValue(parts, "minute");
  return `${year}-${month}-${day}T${hour}:${minute}`;
}
