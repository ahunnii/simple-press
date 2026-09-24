/**
 * A stored calendar date (UTC midnight) as "September 30, 2026". Formatted in
 * UTC on purpose — formatting in any other zone would shift it a day west of
 * Greenwich. `null` (no due date yet) → `fallback`.
 */
export function formatInvoiceDateLabel(
  date: Date | null,
  fallback = "Upon receipt",
): string {
  if (!date) return fallback;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}
