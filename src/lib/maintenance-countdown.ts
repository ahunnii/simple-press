/**
 * Pure time-math helpers for the storefront "coming soon" launch countdown.
 * No React, no Date.now() calls here — callers supply `nowMs` explicitly so
 * this module stays trivially testable and safe to call during SSR.
 */

export type RemainingParts = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
};

const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60 * MS_PER_SECOND;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const MS_PER_DAY = 24 * MS_PER_HOUR;

/**
 * Returns the whole days/hours/minutes/seconds remaining between `nowMs` and
 * `targetMs`. Each unit is floored (no rounding up). `days` is unbounded —
 * hours/minutes/seconds are NOT cumulative with it (i.e. this is a breakdown,
 * not a duplicate total in different units).
 *
 * Returns `null` when the target has already been reached or passed
 * (`targetMs <= nowMs`), or when either input is not a finite number.
 */
export function remainingParts(
  nowMs: number,
  targetMs: number,
): RemainingParts | null {
  if (!Number.isFinite(nowMs) || !Number.isFinite(targetMs)) {
    return null;
  }

  const totalMs = targetMs - nowMs;
  if (totalMs <= 0) {
    return null;
  }

  const days = Math.floor(totalMs / MS_PER_DAY);
  const hours = Math.floor((totalMs % MS_PER_DAY) / MS_PER_HOUR);
  const minutes = Math.floor((totalMs % MS_PER_HOUR) / MS_PER_MINUTE);
  const seconds = Math.floor((totalMs % MS_PER_MINUTE) / MS_PER_SECOND);

  return { days, hours, minutes, seconds, totalMs };
}

/** Zero-pads a non-negative integer to at least two digits (7 → "07", 123 → "123"). */
export function padTwo(n: number): string {
  return String(n).padStart(2, "0");
}
