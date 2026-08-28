import {
  getInterval,
  isSubscriptionIntervalKey,
} from "~/lib/subscriptions/intervals";

/**
 * Human cadence label ("Every month"). Deliberately NOT imported from
 * `subscriptionIntervalLabel` in `~/lib/subscriptions/emails` — that module
 * transitively imports `~/lib/email/templates`, which imports
 * `~/lib/email/overrides.server` (marked `"server-only"`), so pulling it into
 * the admin subscriptions TABLE (a `"use client"` component) would break the
 * client bundle. Same fallback logic as `subscriptionIntervalLabel`,
 * relocated here so both the list table (client) and the detail page
 * (server) share one copy instead of two.
 */
export function intervalLabel(row: {
  intervalKey: string;
  interval: string;
  intervalCount: number;
}): string {
  if (isSubscriptionIntervalKey(row.intervalKey)) {
    const entry = getInterval(row.intervalKey);
    if (entry) return entry.label;
  }
  return row.intervalCount === 1
    ? `Every ${row.interval}`
    : `Every ${row.intervalCount} ${row.interval}s`;
}
