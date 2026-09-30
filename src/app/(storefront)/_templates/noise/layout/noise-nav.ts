/**
 * noise's nav model, shared by the server layout (which resolves the list
 * once) and the client header (desktop split bar + mobile menu). Pure module:
 * no React, no hooks, safe on either side of the server/client boundary.
 *
 * The layout resolves ONE list, `filterNavByFlags(resolveNav(navigationItems,
 * NOISE_DEFAULT_NAV), isEnabled)`, and hands it to the header with the number
 * of items that sit left of the wordmark (`noiseNavLeftCount`). The mobile
 * menu renders the same list top to bottom.
 */

import type { NavItem } from "~/app/(storefront)/_components/nav";
import {
  activeEntryIndex,
  navGroupEntries,
} from "~/app/(storefront)/_components/nav";

/**
 * Shipped nav when the owner hasn't saved one (Admin → Content → Navigation):
 * noise's original hard-coded links in their original order, the shop pair
 * that sat left of the wordmark first, then the editorial links from the
 * right. No per-flag filtering here: `filterNavByFlags` drops `/shop`,
 * `/collections`, `/blog` and `/testimonials` downstream when their feature is
 * off, whichever list they came from.
 */
export const NOISE_DEFAULT_NAV: NavItem[] = [
  { label: "Shop", href: "/shop" },
  { label: "Collections", href: "/collections" },
  { label: "About", href: "/about" },
  { label: "Blog", href: "/blog" },
  { label: "Testimonials", href: "/testimonials" },
  { label: "Contact", href: "/contact" },
];

/** The shipped links that sat left of the wordmark before owner navs split. */
const NOISE_DEFAULT_LEFT_HREFS = new Set(["/shop", "/collections"]);

/**
 * How many of the resolved items sit LEFT of the wordmark on desktop; the
 * rest sit right, before the account/wishlist/bag icons.
 *
 * - No saved nav (`isDefaultNav`): today's split. The leading shop links
 *   (Shop, Collections, whichever of them survived the flag filter) go left
 *   and the editorial links go right, so a store that never touched its nav
 *   looks exactly as it always has.
 * - Owner-saved nav: an even split, first `ceil(n / 2)` left. The odd item
 *   goes left because the right side already carries the icon cluster, so
 *   1 item → the left, 3 → 2 + 1 (+ icons), which keeps both halves of the
 *   bar visually weighted.
 */
export function noiseNavLeftCount(
  items: NavItem[],
  isDefaultNav: boolean,
): number {
  if (!isDefaultNav) return Math.ceil(items.length / 2);
  let count = 0;
  while (
    count < items.length &&
    !items[count]!.external &&
    NOISE_DEFAULT_LEFT_HREFS.has(items[count]!.href)
  ) {
    count++;
  }
  return count;
}

/**
 * Quick-access account subset (B4.3) for the desktop avatar menu, filtered
 * from `getAccountNavLinks` by key so flag gating still applies (Orders needs
 * `orders`). The header also drops "settings" because `UserButton` renders
 * its own built-in Settings item. The mobile menu lists the FULL
 * `getAccountNavLinks` output instead (decision 2026-09-28).
 */
export const NOISE_QUICK_ACCOUNT_KEYS = new Set([
  "orders",
  "settings",
  "admin",
]);

/**
 * Index of the ONE top-level item that reads as current (B3.4): every item's
 * group entries (`navGroupEntries`: its own href, then its children) go
 * through a single `activeEntryIndex` pass, so the longest matching href
 * wins across the whole bar and two items can never both light up. External
 * entries never match. -1 when nothing matches.
 */
export function noiseActiveItemIndex(
  pathname: string,
  items: NavItem[],
): number {
  const owners: number[] = [];
  const entries: { label: string; href: string }[] = [];

  items.forEach((item, itemIndex) => {
    const group = item.children?.length ? navGroupEntries(item) : [item];
    for (const entry of group) {
      if (entry.external) continue;
      owners.push(itemIndex);
      entries.push({ label: entry.label, href: entry.href });
    }
  });

  const best = activeEntryIndex(pathname, entries);
  return best === -1 ? -1 : owners[best]!;
}
