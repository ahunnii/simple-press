// ─────────────────────────────────────────────────────────────────────────────
// Events — wall-clock (admin form) → UTC instant (database), in the shop's zone
// ─────────────────────────────────────────────────────────────────────────────
//
// `<input type="datetime-local">` hands us a bare wall-clock string with no zone
// attached ("2026-08-15T19:00"). The owner means 7pm *where the shop is*, which
// is neither the browser's zone nor the server's. Everything here interprets
// that string in `Business.timeZone` and returns the UTC instant to persist.
//
// Implemented without a date library on purpose: `date-fns` v4 is a dependency
// but its core has no IANA zone support, and the companion packages
// (`date-fns-tz` / `@date-fns/tz`) are not installed. Adding one for four
// functions is not worth the bundle, since Intl already ships the tz database.

/**
 * Formatters are expensive to construct and we build one per zone at most.
 * Keyed by zone; the option set never varies.
 */
const OFFSET_FORMATTERS = new Map<string, Intl.DateTimeFormat>();

function offsetFormatter(timeZone: string): Intl.DateTimeFormat {
  const cached = OFFSET_FORMATTERS.get(timeZone);
  if (cached) return cached;
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    // hourCycle "h23" rather than hour12:false — the latter yields "24" for
    // midnight on some ICU builds, which would silently shift a day.
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  OFFSET_FORMATTERS.set(timeZone, formatter);
  return formatter;
}

/**
 * The zone's UTC offset, in milliseconds, *at a given instant* (offsets move
 * with DST, so there is no such thing as "the offset of a zone").
 *
 * Technique: ask Intl what wall clock `instantMs` maps to in the zone, then
 * re-read those fields as if they were UTC. The difference between that fake
 * UTC value and the real instant is the offset.
 */
function zoneOffsetMs(instantMs: number, timeZone: string): number {
  const parts = offsetFormatter(timeZone).formatToParts(new Date(instantMs));
  const field = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((p) => p.type === type)?.value ?? "0");

  const wallAsUtc = Date.UTC(
    field("year"),
    field("month") - 1,
    field("day"),
    field("hour"),
    field("minute"),
    field("second"),
  );

  // formatToParts has no millisecond field, so compare against the instant
  // truncated down to a whole second. (Modulo is written the long way because
  // `%` keeps the sign of the dividend for pre-1970 instants.)
  const msWithinSecond = ((instantMs % 1000) + 1000) % 1000;
  return wallAsUtc - (instantMs - msWithinSecond);
}

const DAY_MS = 86_400_000;

/**
 * Core conversion: the UTC instant at which the given wall clock occurs in
 * `timeZone`.
 *
 * The naive approach — guess the instant as if the wall clock were UTC, measure
 * the offset there, correct, and iterate — converges for ordinary times but is
 * unable to *detect* a DST overlap in half the world's zones. Concretely, for
 * 2026-10-25 01:30 in Europe/London the guess instant already lands after the
 * transition, both passes report the same offset, and the iteration happily
 * returns the second (GMT) occurrence with no signal that a first (BST) one
 * existed. So instead of iterating we enumerate.
 *
 * Probe the offset a day either side of the wall clock. Since real offsets span
 * only −12h…+14h, the true instant is guaranteed to sit between those probes.
 * That yields at most two candidate instants; a candidate is *valid* when
 * converting it back lands on the wall clock we were asked for.
 *
 *   2 valid  → the clock ran backwards and this time happened twice.
 *              We take the earlier (still-DST) occurrence.
 *   1 valid  → ordinary, unambiguous time.
 *   0 valid  → the clock jumped forward and this time never happened.
 *              We take the later candidate, which is equivalent to shifting the
 *              request forward by the size of the gap (02:30 → 03:30).
 *
 * Both tie-breaks match the "compatible" disambiguation of the TC39 Temporal
 * proposal, i.e. what `Temporal.ZonedDateTime` will do once it lands, and what
 * every other calendar app does.
 */
function zonedWallClockToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  millisecond: number,
  timeZone: string,
): Date {
  const wallAsUtc = Date.UTC(
    year,
    month - 1,
    day,
    hour,
    minute,
    second,
    millisecond,
  );

  const offsetBefore = zoneOffsetMs(wallAsUtc - DAY_MS, timeZone);
  const offsetAfter = zoneOffsetMs(wallAsUtc + DAY_MS, timeZone);

  // No transition anywhere near this wall clock — one candidate, always valid.
  if (offsetBefore === offsetAfter) return new Date(wallAsUtc - offsetBefore);

  const candidateBefore = wallAsUtc - offsetBefore;
  const candidateAfter = wallAsUtc - offsetAfter;
  const valid = [candidateBefore, candidateAfter].filter(
    (candidate) => zoneOffsetMs(candidate, timeZone) === wallAsUtc - candidate,
  );

  const [first, secondCandidate] = valid;
  if (first !== undefined && secondCandidate !== undefined) {
    return new Date(Math.min(first, secondCandidate)); // overlap → earlier
  }
  if (first !== undefined) return new Date(first);
  return new Date(Math.max(candidateBefore, candidateAfter)); // gap → forward
}

// "2026-08-15" or "2026-08-15T19:00" (seconds/ms accepted but never produced by
// the admin inputs; supported so the all-day 23:59:59.999 pin can share a path).
const LOCAL_DATE_TIME_RE =
  /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?)?$/;

/**
 * Parse an `<input type="datetime-local">` / `<input type="date">` value as a
 * wall clock in `timeZone` and return the UTC instant it denotes.
 *
 * Throws on a malformed string rather than returning an Invalid Date — a bad
 * value must not reach Prisma, where it would either blow up far from the cause
 * or (worse) round-trip as a nonsense timestamp.
 *
 * DST behaviour, both asserted in the tests:
 *   • Skipped times (2026-03-08 02:30 America/Detroit) resolve *forward* to the
 *     equivalent post-transition instant, i.e. 03:30 EDT.
 *   • Repeated times (2026-11-01 01:30 America/Detroit) resolve to the *first*,
 *     still-daylight occurrence, i.e. 01:30 EDT.
 */
export function parseZonedDateTime(local: string, timeZone: string): Date {
  const match = LOCAL_DATE_TIME_RE.exec(local.trim());
  if (!match) {
    throw new RangeError(
      `Invalid local date-time "${local}" — expected "YYYY-MM-DD" or "YYYY-MM-DDTHH:mm".`,
    );
  }

  const [, year, month, day, hour, minute, second, fraction] = match;
  return zonedWallClockToUtc(
    Number(year),
    Number(month),
    Number(day),
    Number(hour ?? "0"),
    Number(minute ?? "0"),
    Number(second ?? "0"),
    // ".5" means 500ms, not 5ms — pad on the right before parsing.
    Number((fraction ?? "0").padEnd(3, "0")),
    timeZone,
  );
}

/**
 * Turn the admin form's values into the two UTC instants stored on `Event`.
 *
 * The all-day pinning here is the correctness lynchpin of the whole feature.
 * An all-day event is stored as [00:00:00.000, 23:59:59.999] of its local date
 * *in the shop's zone*, which means it always has a non-null `endAt` and
 * therefore a meaningful cutoff for `upcomingEventWhere`. Without the pin, an
 * all-day event with no end time would fall out of the storefront listing at
 * midnight in whatever zone the server process happens to be running in —
 * typically UTC, so a Detroit shop's Saturday market would disappear from the
 * site at 8pm Friday. With it, the event survives until midnight where the shop
 * actually is, regardless of where the app is deployed.
 *
 * Timed events pass straight through; a blank `endAt` stays null and the
 * cutoff falls back to `startAt`.
 */
export function normalizeEventDates(
  input: { startAt: string; endAt?: string | null; allDay: boolean },
  timeZone: string,
): { startAt: Date; endAt: Date | null } {
  if (!input.allDay) {
    return {
      startAt: parseZonedDateTime(input.startAt, timeZone),
      endAt: input.endAt ? parseZonedDateTime(input.endAt, timeZone) : null,
    };
  }

  // Only the date half matters when the event is all-day, so a form that was
  // filled in as timed and then toggled to all-day still normalizes cleanly.
  const startDate = input.startAt.trim().slice(0, 10);
  const endDate = input.endAt ? input.endAt.trim().slice(0, 10) : startDate;

  return {
    startAt: parseZonedDateTime(`${startDate}T00:00:00.000`, timeZone),
    endAt: parseZonedDateTime(`${endDate}T23:59:59.999`, timeZone),
  };
}
