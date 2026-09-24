/**
 * Client-safe display helpers for the check-outs UI. Nothing here may import
 * a `server-only` file, since these are used from "use client" components.
 */

/**
 * `dueBackOn` is a calendar date stored as UTC midnight (the `Invoice.dueDate`
 * convention — see `ymdToUtcMidnight`/`utcMidnightToYmd` in
 * `~/lib/invoices/status`). Rendering that instant in any zone west of UTC
 * yields the PREVIOUS day, so it's always formatted in UTC — matching how
 * `~/app/admin/invoices/_components/invoices-client.tsx` renders `dueDate`.
 */
const CALENDAR_DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function formatCalendarDate(date: Date | null | undefined): string {
  if (!date) return "—";
  return CALENDAR_DATE_FORMAT.format(date);
}

/**
 * An instant (`checkedOutAt`, `closedAt`, history `createdAt`) in the
 * business's zone. Always pass an explicit `timeZone` so the server render
 * and the hydrated client render agree — never the viewer's local zone.
 */
export function formatInstant(date: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  } catch {
    return date.toISOString();
  }
}

/**
 * `checkedOutAt` — a genuine instant (`DateTime @default(now())`, not the
 * calendar-date-at-UTC-midnight convention `dueBackOn` uses). Rendered as a
 * date only (no time) in the business's zone for the list table; the detail
 * page's header shows the full instant via {@link formatInstant}.
 */
export function formatZonedDate(date: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone,
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

/** Trims a form field and turns a blank result into `undefined`. */
export function blankToUndefined(
  value: string | undefined,
): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return trimmed;
}
