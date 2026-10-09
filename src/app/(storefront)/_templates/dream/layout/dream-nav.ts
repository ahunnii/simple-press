/**
 * Dream's nav model, shared by the header, the mobile overlay and the footer.
 * Pure module (no React, no hooks) so the server layout/footer and the client
 * header/overlay can all import it.
 *
 * The layout resolves ONE list with `resolveDreamNav` and hands the same array
 * to the header (which passes it to the overlay) and to the footer's quick-links
 * fallback, so the three can never disagree about which links exist.
 */

import type { NavItem } from "~/app/(storefront)/_components/nav";
import { isSectionVisible } from "~/lib/sp-meta";
import {
  filterNavByFlags,
  navHrefOffFlag,
  resolveNav,
} from "~/app/(storefront)/_components/nav";

const DREAM_GALLERY_HREF = "/#gallery";

/**
 * Shipped nav when the owner hasn't saved one (Admin → Content → Navigation):
 * dream's original links, in their original order. No per-flag filtering here
 * — `filterNavByFlags` drops `/services` (services) downstream, whichever list
 * it came from.
 */
export const DREAM_NAV_DEFAULTS: NavItem[] = [
  { label: "Services", href: "/services" },
  { label: "Gallery", href: DREAM_GALLERY_HREF },
  { label: "About", href: "/about" },
];

/**
 * The shipped defaults for this store. "Gallery" points at the homepage gallery
 * section, so it is dropped while that section is hidden (`customFields` →
 * `_sp`). An owner-saved list never goes through this — they chose its links.
 */
export function dreamNavDefaults(customFields: unknown): NavItem[] {
  return isSectionVisible(customFields, "dream", "homepage.gallery")
    ? DREAM_NAV_DEFAULTS
    : DREAM_NAV_DEFAULTS.filter((item) => item.href !== DREAM_GALLERY_HREF);
}

/**
 * The owner's nav (or dream's shipped defaults), sanitized by `resolveNav`
 * (`??` semantics: a saved `[]` means "no links") and then flag-filtered
 * (P-NAV-FLAGS) so a link to a switched-off feature never renders.
 */
export function resolveDreamNav(
  navigationItems: unknown,
  customFields: unknown,
  isEnabled: (key: string) => boolean,
): NavItem[] {
  return filterNavByFlags(
    resolveNav(navigationItems, dreamNavDefaults(customFields)),
    isEnabled,
  );
}

/**
 * Quick-access account subset (B4.3) for the desktop avatar menu and the
 * overlay's account block — filtered from `getAccountNavLinks` by key, so flag
 * gating (Orders needs `orders`) still applies. The full list lives in the
 * account area's own sidebar. The desktop menu also drops "settings" because
 * `UserButton` renders its own built-in Settings item.
 */
export const DREAM_QUICK_ACCOUNT_KEYS = new Set([
  "orders",
  "settings",
  "admin",
]);

/**
 * The field-driven header CTA pill's href, or "" to hide the pill (B2.5): a
 * link into a flag-disabled feature (e.g. `/services` with `services` off)
 * would 404, so the pill is hidden — never re-pointed somewhere else.
 */
export function dreamCtaHref(
  url: string,
  isEnabled: (key: string) => boolean,
): string {
  if (!url) return "";
  const flag = navHrefOffFlag(url, isEnabled);
  return flag && !isEnabled(flag) ? "" : url;
}
