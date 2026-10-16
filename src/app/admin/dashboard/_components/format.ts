import type { WidgetFormat } from "~/lib/dashboard/widgets";
import { formatCurrency } from "~/lib/utils";

/** Integer cents → "$1,234.50" (the shared helper the server detail lines use too). */
export { formatCurrency };

const countFormatter = new Intl.NumberFormat("en-US");

/** Whole dollars, no cents — for axis ticks and tight spaces. */
export function formatCurrencyCompact(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(cents / 100);
}

export function formatCount(value: number): string {
  return countFormatter.format(value);
}

/** `value` is already a percentage (2.5 → "2.5%"). Under 1% keeps two decimals. */
export function formatPercent(value: number): string {
  const display =
    value >= 1 || value === 0 ? value.toFixed(1) : value.toFixed(2);
  return `${display}%`;
}

/** Format a stat value by its widget format. */
export function formatStatValue(value: number, format: WidgetFormat): string {
  switch (format) {
    case "currency":
      return formatCurrency(value);
    case "percent":
      return formatPercent(value);
    case "count":
      return formatCount(value);
  }
}

/** Whole-number axis tick for a chart, by the plotted number's format. */
export function formatAxisValue(value: number, format: WidgetFormat): string {
  switch (format) {
    case "currency":
      return formatCurrencyCompact(value);
    case "percent":
      return formatPercent(value);
    case "count":
      return new Intl.NumberFormat("en-US", {
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(value);
  }
}

/** "5 mins ago" / "Yesterday" / a locale date. Accepts a Date or ISO string. */
export function formatRelative(date: Date | string): string {
  const then = new Date(date);
  const diffMs = Date.now() - then.getTime();
  const diffMins = Math.max(0, Math.floor(diffMs / 60000));
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) {
    return `${diffMins} min${diffMins !== 1 ? "s" : ""} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
  } else if (diffDays === 1) {
    return "Yesterday";
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  }
  return then.toLocaleDateString();
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "open":
      return "bg-blue-100 text-blue-800";
    case "completed":
      return "bg-green-100 text-green-800";
    case "cancelled":
      return "bg-gray-100 text-gray-800";
    case "refunded":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}
