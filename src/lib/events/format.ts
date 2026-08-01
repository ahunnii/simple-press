// ─────────────────────────────────────────────────────────────────────────────
// Events — the single display formatter
// ─────────────────────────────────────────────────────────────────────────────
//
// Every function here takes an explicit `timeZone` and passes it to
// `Intl.DateTimeFormat`. Nothing in this file may ever call `toLocaleString`,
// `toLocaleDateString`, `toLocaleTimeString`, `getHours()` or friends without
// one: those read the *ambient* zone, which is the server's zone during the RSC
// render and the viewer's zone once React hydrates. A shopper in Denver looking
// at a Detroit shop would get server-rendered HTML saying "7:00 PM" replaced by
// client-rendered "5:00 PM", i.e. a hydration mismatch that only reproduces for
// people in the wrong zone. Passing the shop's zone explicitly makes both
// renders identical by construction.
//
// The locale is pinned to "en-US" for the same reason — the storefront copy is
// English and a viewer's locale must not be allowed to change the markup.
//
// Strings are assembled from `formatToParts()` by hand rather than via
// `Intl.DateTimeFormat.prototype.formatRange`. formatRange picks its own
// separator (ICU has used "–", "—" and " - " across versions) and elides
// repeated fields by its own rules, so a test suite written against it passes
// on one Node build and fails on the next.

export type EventDateInput = {
  startAt: Date | string;
  endAt?: Date | string | null;
  allDay: boolean;
};

export type FormatOpts = {
  /** Append the short zone name ("EDT") once, at the very end. */
  showZone?: boolean;
  /** "This year" for the purpose of year suppression. Defaults to now. */
  referenceDate?: Date;
};

const LOCALE = "en-US";
/** U+00B7, spaced — separates the date half from the time half. */
const DOT = " · ";
/** U+2013, spaced — every range in the app uses this dash. */
const DASH = " – ";

// ─── Intl plumbing ───────────────────────────────────────────────────────────

const DISPLAY_FORMATTERS = new Map<string, Intl.DateTimeFormat>();
const ISO_FORMATTERS = new Map<string, Intl.DateTimeFormat>();
const ZONE_NAME_FORMATTERS = new Map<string, Intl.DateTimeFormat>();

function displayFormatter(timeZone: string): Intl.DateTimeFormat {
  const cached = DISPLAY_FORMATTERS.get(timeZone);
  if (cached) return cached;
  const formatter = new Intl.DateTimeFormat(LOCALE, {
    timeZone,
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  DISPLAY_FORMATTERS.set(timeZone, formatter);
  return formatter;
}

function isoFormatter(timeZone: string): Intl.DateTimeFormat {
  const cached = ISO_FORMATTERS.get(timeZone);
  if (cached) return cached;
  const formatter = new Intl.DateTimeFormat(LOCALE, {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  ISO_FORMATTERS.set(timeZone, formatter);
  return formatter;
}

function zoneNameFormatter(timeZone: string): Intl.DateTimeFormat {
  const cached = ZONE_NAME_FORMATTERS.get(timeZone);
  if (cached) return cached;
  // `hour` is requested only because a formatter with no date/time fields at all
  // falls back to a full date, which would drag the zone name along with it.
  const formatter = new Intl.DateTimeFormat(LOCALE, {
    timeZone,
    hour: "numeric",
    timeZoneName: "short",
  });
  ZONE_NAME_FORMATTERS.set(timeZone, formatter);
  return formatter;
}

function part(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
): string {
  return parts.find((p) => p.type === type)?.value ?? "";
}

type ZonedFields = {
  weekday: string; // "Sat"
  month: string; // "Aug"
  day: string; // "15"
  year: string; // "2026"
  hour: string; // "7"
  minute: string; // "00"
  meridiem: string; // "AM" | "PM"
};

function fieldsIn(date: Date, timeZone: string): ZonedFields {
  const parts = displayFormatter(timeZone).formatToParts(date);
  return {
    weekday: part(parts, "weekday"),
    month: part(parts, "month"),
    day: part(parts, "day"),
    year: part(parts, "year"),
    hour: part(parts, "hour"),
    minute: part(parts, "minute"),
    meridiem: part(parts, "dayPeriod"),
  };
}

/** "2026-08-15" — the calendar date `date` falls on inside `timeZone`. */
function isoDateIn(date: Date, timeZone: string): string {
  const parts = isoFormatter(timeZone).formatToParts(date);
  return `${part(parts, "year")}-${part(parts, "month")}-${part(parts, "day")}`;
}

function toDate(value: Date | string): Date {
  // tRPC + superjson usually preserve Date, but props that crossed a cache
  // boundary or a JSON round-trip arrive as ISO strings.
  return value instanceof Date ? value : new Date(value);
}

// ─── Primitives ──────────────────────────────────────────────────────────────

/**
 * The instant an event is "over": its end if it has one, otherwise its start.
 * Mirrors the two arms of `upcomingEventWhere` — keep the two in step.
 */
export function eventCutoff(e: EventDateInput): Date {
  return e.endAt ? toDate(e.endAt) : toDate(e.startAt);
}

/** Do two instants land on the same calendar date in `timeZone`? */
export function isSameDayInZone(a: Date, b: Date, timeZone: string): boolean {
  return isoDateIn(a, timeZone) === isoDateIn(b, timeZone);
}

// ─── String builders ─────────────────────────────────────────────────────────

function time(f: ZonedFields): string {
  return `${f.hour}:${f.minute} ${f.meridiem}`;
}

/** "7:00" — for the leading half of a range that ends in the same meridiem. */
function timeNoMeridiem(f: ZonedFields): string {
  return `${f.hour}:${f.minute}`;
}

function date(f: ZonedFields, withWeekday: boolean, withYear: boolean): string {
  const head = withWeekday ? `${f.weekday}, ` : "";
  const tail = withYear ? `, ${f.year}` : "";
  return `${head}${f.month} ${f.day}${tail}`;
}

/**
 * "Aug 15 – 17" / "Aug 30 – Sep 2" / "Dec 30, 2026 – Jan 2, 2027".
 *
 * The month is repeated on the right only when it changed. The year sits on the
 * right half alone ("Aug 15 – 17, 2027") unless the range straddles New Year,
 * where both halves need one — "Dec 30, 2026 – Jan 2" would otherwise read as
 * if the whole thing happened in 2026. Weekdays are never included: a range
 * carrying two of them is too long for the cards this feeds.
 */
function dateRange(s: ZonedFields, t: ZonedFields, showYear: boolean): string {
  const crossesYear = s.year !== t.year;
  const left = date(s, false, crossesYear);
  const rightHead =
    !crossesYear && s.month === t.month ? t.day : `${t.month} ${t.day}`;
  return `${left}${DASH}${showYear ? `${rightHead}, ${t.year}` : rightHead}`;
}

function zoneSuffix(
  start: Date,
  timeZone: string,
  opts: FormatOpts | undefined,
): string {
  if (!opts?.showZone) return "";
  const parts = zoneNameFormatter(timeZone).formatToParts(start);
  const name = part(parts, "timeZoneName");
  // Qualified by the *start* instant: an event that runs across a DST change
  // would otherwise need two abbreviations, which is more confusing than the
  // half-hour of imprecision it would buy.
  return name ? ` ${name}` : "";
}

/**
 * Whether to spell out the year. Shown only when the event is not in the
 * reference year — computed in `timeZone`, because "what year is it" is a
 * question about the shop's calendar, not the server's. A New Year's Eve event
 * in Detroit is still 2026 for three hours after UTC has rolled over.
 */
function resolveYearVisibility(
  start: ZonedFields,
  end: ZonedFields | null,
  timeZone: string,
  opts: FormatOpts | undefined,
): boolean {
  const reference = opts?.referenceDate ?? new Date();
  const referenceYear = fieldsIn(reference, timeZone).year;
  if (start.year !== referenceYear) return true;
  if (end && end.year !== referenceYear) return true;
  // A range that straddles New Year is unreadable without years on both halves
  // even when one of them is the current year.
  return end !== null && start.year !== end.year;
}

// ─── Public formatters ───────────────────────────────────────────────────────

/**
 * The one-line form used in cards, lists and headers.
 *
 *   all-day, one day      Sat, Aug 15
 *   all-day, same month   Aug 15 – 17
 *   all-day, cross month  Aug 30 – Sep 2
 *   timed, no end         Sat, Aug 15 · 7:00 PM
 *   timed, same day       Sat, Aug 15 · 7:00 – 9:30 PM
 *   timed, cross meridiem Sat, Aug 15 · 11:00 AM – 2:00 PM
 *   timed, multi-day      Aug 15, 7:00 PM – Aug 17, 2:00 PM
 *
 * The weekday is dropped from multi-day forms: two weekdays plus two dates plus
 * two times is more string than a card can carry, and the dates alone answer
 * "when" well enough once a range is involved.
 */
export function formatEventDate(
  e: EventDateInput,
  timeZone: string,
  opts?: FormatOpts,
): string {
  const start = toDate(e.startAt);
  const end = e.endAt ? toDate(e.endAt) : null;
  const s = fieldsIn(start, timeZone);
  const t = end ? fieldsIn(end, timeZone) : null;
  const sameDay = end === null || isSameDayInZone(start, end, timeZone);
  const showYear = resolveYearVisibility(s, sameDay ? null : t, timeZone, opts);

  if (e.allDay) {
    // An all-day event always has an endAt (pinned to 23:59:59.999 local by
    // normalizeEventDates), so "single day" means start and end share a local
    // date — never that endAt is null.
    if (sameDay || !t) return date(s, true, showYear);
    return dateRange(s, t, showYear);
  }

  // No zone suffix on all-day output — there is no time for it to qualify.
  const zone = zoneSuffix(start, timeZone, opts);

  if (!t) return `${date(s, true, showYear)}${DOT}${time(s)}${zone}`;

  if (sameDay) {
    // "7:00 – 9:30 PM" when both ends share a meridiem, "11:00 AM – 2:00 PM"
    // when they don't.
    const range =
      s.meridiem === t.meridiem
        ? `${timeNoMeridiem(s)}${DASH}${time(t)}`
        : `${time(s)}${DASH}${time(t)}`;
    return `${date(s, true, showYear)}${DOT}${range}${zone}`;
  }

  return `${date(s, false, showYear)}, ${time(s)}${DASH}${date(t, false, showYear)}, ${time(t)}${zone}`;
}

/**
 * The same information split for stacked layouts (a date line above a time
 * line, a calendar chip beside a caption).
 *
 * `time` is null for all-day events. For a multi-day *timed* event the two
 * halves are ranged independently — "Aug 15 – 17" over "7:00 PM – 2:00 PM" —
 * which loses the pairing that `formatEventDate` preserves. That is the
 * accepted cost of splitting; use `formatEventDate` where the pairing matters.
 */
export function formatEventDateParts(
  e: EventDateInput,
  timeZone: string,
  opts?: FormatOpts,
): { date: string; time: string | null } {
  const start = toDate(e.startAt);
  const end = e.endAt ? toDate(e.endAt) : null;
  const s = fieldsIn(start, timeZone);
  const t = end ? fieldsIn(end, timeZone) : null;
  const sameDay = end === null || isSameDayInZone(start, end, timeZone);
  const showYear = resolveYearVisibility(s, sameDay ? null : t, timeZone, opts);

  const dateText =
    sameDay || !t ? date(s, true, showYear) : dateRange(s, t, showYear);

  if (e.allDay) return { date: dateText, time: null };

  const zone = zoneSuffix(start, timeZone, opts);
  if (!t) return { date: dateText, time: `${time(s)}${zone}` };

  const timeText =
    sameDay && s.meridiem === t.meridiem
      ? `${timeNoMeridiem(s)}${DASH}${time(t)}`
      : `${time(s)}${DASH}${time(t)}`;
  return { date: dateText, time: `${timeText}${zone}` };
}

/**
 * Machine-readable value for `<time dateTime={…}>`.
 *
 * All-day events emit a bare local date, which is what the HTML spec calls a
 * "valid date string" and what crawlers expect for a day-granularity event —
 * emitting the 04:00Z instant instead would advertise a Detroit market as
 * starting at midnight UTC. Timed events emit the full instant, which already
 * carries its own offset.
 */
export function eventDateTimeAttr(e: EventDateInput, timeZone: string): string {
  const start = toDate(e.startAt);
  return e.allDay ? isoDateIn(start, timeZone) : start.toISOString();
}
