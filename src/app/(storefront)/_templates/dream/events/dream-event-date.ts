/**
 * Month + day of an event's start, in the SHOP's zone, for the flier's
 * no-media date tile.
 *
 * Same rule as `~/lib/events/format`: an explicit `timeZone` and a pinned
 * "en-US" locale, never the ambient zone — otherwise the server render and
 * the hydrated client disagree for a viewer in another zone.
 */
export function dreamEventDateParts(
  startAt: Date | string,
  timeZone: string,
): { month: string; day: string } {
  const date = new Date(startAt);
  const month = new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
  }).format(date);
  const day = new Intl.DateTimeFormat("en-US", {
    timeZone,
    day: "numeric",
  }).format(date);
  return { month, day };
}
