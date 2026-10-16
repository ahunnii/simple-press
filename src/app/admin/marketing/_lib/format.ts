/**
 * Client-safe date formatting for the Email Marketing admin. Always formats in
 * an explicit zone (the business's) so server and client render the same
 * string — never the viewer's local zone, which would mismatch on hydration.
 */

/** "Sep 24, 2026, 3:05 PM" in the business's zone. */
export function formatCampaignInstant(
  date: Date | string,
  timeZone: string,
): string {
  const value = typeof date === "string" ? new Date(date) : date;
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(value);
  } catch {
    return value.toISOString();
  }
}

/** "Sep 24, 2026" in the business's zone (history table). */
export function formatCampaignDay(
  date: Date | string,
  timeZone: string,
): string {
  const value = typeof date === "string" ? new Date(date) : date;
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(value);
  } catch {
    return value.toISOString().slice(0, 10);
  }
}

export function pluralize(count: number, singular: string, plural?: string) {
  return count === 1 ? singular : (plural ?? `${singular}s`);
}
