import { routeEnabled } from "~/lib/features/route-flags";

/**
 * B2.5: a field-driven link is hidden (never swapped for another destination)
 * when it is blank or its route's feature flag is off.
 */
export function gloveLinkAllowed(
  href: string,
  isEnabled?: (key: string) => boolean,
): boolean {
  const trimmed = href.trim();
  if (trimmed.length === 0) return false;
  if (!isEnabled) return true;
  return routeEnabled(trimmed, isEnabled);
}

/** True for absolute http(s) links, which open in a new tab. */
export function gloveIsExternal(href: string): boolean {
  return /^https?:\/\//i.test(href.trim());
}
