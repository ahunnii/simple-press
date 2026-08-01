// ─────────────────────────────────────────────────────────────────────────────
// Time zones — validation + the curated list behind the admin zone picker
// ─────────────────────────────────────────────────────────────────────────────

/**
 * True when `tz` is a time zone the runtime's ICU data actually knows about.
 *
 * There is no `Intl` API that returns "is this a zone?" directly, so we probe:
 * constructing a formatter with an unknown `timeZone` throws a RangeError, and
 * constructing one with a known zone is cheap. Used by the zod `.refine()` that
 * guards `Business.timeZone` on write.
 *
 * NOTE: this accepts ANY real IANA zone name, not just the ones in
 * COMMON_TIME_ZONES. That list is a convenience for the admin <Select>, not an
 * allowlist — a shop in Kathmandu can still be stored as "Asia/Kathmandu" and
 * every downstream formatter will handle it, because nothing in this feature
 * ever compares a zone string against the curated list.
 */
export function isValidTimeZone(tz: string): boolean {
  try {
    // `undefined` locale keeps this independent of the runtime's default locale;
    // only the timeZone option is under test.
    new Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Curated zones for the admin picker, in the order they should appear.
 *
 * America/Detroit is first and default because that is where the platform's
 * shops are concentrated; the rest of the US follows, then a short global tail.
 * Labels are written for shop owners, who do not know what "America/Phoenix"
 * means but do know they are in Arizona and do not change their clocks.
 */
export const COMMON_TIME_ZONES: { value: string; label: string }[] = [
  { value: "America/Detroit", label: "Eastern Time — Detroit" },
  { value: "America/New_York", label: "Eastern Time — New York" },
  { value: "America/Chicago", label: "Central Time — Chicago" },
  { value: "America/Denver", label: "Mountain Time — Denver" },
  { value: "America/Phoenix", label: "Mountain Time (no DST) — Phoenix" },
  { value: "America/Los_Angeles", label: "Pacific Time — Los Angeles" },
  { value: "America/Anchorage", label: "Alaska Time — Anchorage" },
  { value: "Pacific/Honolulu", label: "Hawaii Time — Honolulu" },
  { value: "America/Toronto", label: "Eastern Time — Toronto" },
  { value: "America/Vancouver", label: "Pacific Time — Vancouver" },
  { value: "America/Mexico_City", label: "Central Time — Mexico City" },
  { value: "Europe/London", label: "Greenwich Mean Time — London" },
  { value: "Europe/Paris", label: "Central European Time — Paris" },
  { value: "Europe/Berlin", label: "Central European Time — Berlin" },
  { value: "Asia/Tokyo", label: "Japan Standard Time — Tokyo" },
  { value: "Australia/Sydney", label: "Australian Eastern Time — Sydney" },
];
