import type { InvoiceStatus } from "~/lib/validators/invoice";
import { ymdToUtcMidnight } from "~/lib/invoices/status";
import { INVOICE_STATUS_LABELS } from "~/lib/validators/invoice";

/**
 * Client-safe display helpers for the invoice detail page. Deliberately
 * separate from `~/lib/invoices/notify` (server-only) even though a couple of
 * these mirror its formatting — nothing here may import a `server-only` file,
 * since these are used from "use client" dialogs.
 */

/** A stored calendar date (`YYYY-MM-DD`) as "September 30, 2026", formatted in
 * UTC — matching `formatInvoiceDateLabel`'s convention so the two never
 * disagree on which day a date lands on. */
export function formatYmdLabel(
  ymd: string | null | undefined,
): string | undefined {
  if (!ymd) return undefined;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(ymdToUtcMidnight(ymd));
}

/** An instant in the business's zone, e.g. "Sep 24, 2026, 3:05 PM". Always
 * passed an explicit `timeZone` so server and client render the same string —
 * never the viewer's local zone, which would mismatch during hydration. */
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

/** Coarse "3 days ago" / "in 2 hours" — computed only after mount by callers
 * (see `EventTime`), never during SSR, since it depends on `Date.now()`. */
export function formatRelativeTime(date: Date, now: Date): string {
  const diffMs = date.getTime() - now.getTime();
  const future = diffMs > 0;
  const abs = Math.abs(diffMs);

  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  let value: number;
  let unit: string;
  if (abs < minute) {
    return "just now";
  } else if (abs < hour) {
    value = Math.round(abs / minute);
    unit = "minute";
  } else if (abs < day) {
    value = Math.round(abs / hour);
    unit = "hour";
  } else if (abs < 30 * day) {
    value = Math.round(abs / day);
    unit = "day";
  } else {
    // Beyond a month, the absolute date (shown alongside) carries the weight.
    value = Math.round(abs / (30 * day));
    unit = "month";
  }
  const plural = value === 1 ? unit : `${unit}s`;
  return future ? `in ${value} ${plural}` : `${value} ${plural} ago`;
}

/** Trims a form field and turns a blank result into `undefined` — the shape
 *  every optional-text mutation input expects. Written as a ternary rather
 *  than `value?.trim() || undefined` so `@typescript-eslint/prefer-nullish-
 *  coalescing` doesn't flag it at every call site. */
export function blankToUndefined(
  value: string | undefined,
): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return trimmed;
}

export type InvoiceStatusTone = "neutral" | "success" | "warning" | "danger";

const STATUS_TONE: Record<InvoiceStatus, InvoiceStatusTone> = {
  DRAFT: "neutral",
  SENT: "neutral",
  PARTIALLY_PAID: "warning",
  PAID: "success",
  CANCELLED: "neutral",
};

/** The label + tone for the status badge and the `InvoiceDocument` preview —
 * one source so the header badge and the document preview never disagree.
 * `isOverdue` wins over the underlying status, matching the list page and the
 * cron's shared `isInvoiceOverdue` rule. */
export function invoiceStatusDisplay(
  status: InvoiceStatus,
  isOverdue: boolean,
): { label: string; tone: InvoiceStatusTone } {
  if (isOverdue) return { label: "Overdue", tone: "danger" };
  return { label: INVOICE_STATUS_LABELS[status], tone: STATUS_TONE[status] };
}
