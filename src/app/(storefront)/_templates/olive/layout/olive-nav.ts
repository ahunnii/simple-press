/**
 * Olive's nav model, shared by the header, the mobile overlay and the footer.
 * Pure module (no React, no hooks) so the server layout/footer and the client
 * header/overlay can all import it.
 *
 * The layout resolves ONE list — `filterNavByFlags(resolveNav(navigationItems,
 * OLIVE_DEFAULT_NAV), isEnabled)` — and hands the same array to the header
 * (which passes it to the overlay) and to the footer's About column, so the
 * three can never disagree about which links exist.
 */

import type { NavItem } from "~/app/(storefront)/_components/nav";
import {
  activeEntryIndex,
  navGroupEntries,
} from "~/app/(storefront)/_components/nav";

/**
 * Shipped nav when the owner hasn't saved one (Admin → Content → Navigation):
 * olive's original hard-coded links, in their original order. No per-flag
 * filtering here — `filterNavByFlags` drops `/shop` (products) and `/blog`
 * (blog) entries downstream, whichever list they came from.
 */
export const OLIVE_DEFAULT_NAV: NavItem[] = [
  { label: "New arrivals", href: "/shop" },
  { label: "Shop", href: "/shop" },
  { label: "About", href: "/about" },
  { label: "Journal", href: "/blog" },
  { label: "Contact", href: "/contact" },
];

/**
 * Quick-access account subset (B4.3) for the desktop avatar menu and the
 * overlay's account block — filtered from `getAccountNavLinks` by key, so flag
 * gating (e.g. Orders needs `orders`) still applies. The full list lives in
 * the account area's own sidebar. The desktop menu also drops "settings"
 * because `UserButton` renders its own built-in Settings item.
 */
export const OLIVE_QUICK_ACCOUNT_KEYS = new Set([
  "orders",
  "settings",
  "admin",
]);

const SHOP_HREF = "/shop";

/**
 * Index of the top-level item that carries olive's Shop → collections panel
 * (desktop) / collections block (overlay): the LAST internal item whose href is
 * exactly `/shop`. "Last" so the shipped defaults (New arrivals, then Shop —
 * both `/shop`) attach the panel to "Shop", and an owner nav with a single
 * Shop link gets it wherever it sits. -1 when the nav has no `/shop` item (the
 * owner removed it, or `products` is off) — then there is no panel.
 */
export function oliveShopPanelIndex(items: NavItem[]): number {
  let index = -1;
  items.forEach((item, i) => {
    if (item.external) return;
    if (item.href.trim().replace(/\/+$/, "") === SHOP_HREF) index = i;
  });
  return index;
}

/**
 * Index of the ONE top-level item that reads as current (B3.4): every item's
 * group entries (`navGroupEntries` — its own href, then its children) go
 * through `activeEntryIndex`, so the longest matching href wins. The Shop
 * panel item's entries go first so it wins ties (on `/shop/<slug>` the "Shop"
 * trigger, not "New arrivals", is current), and it also owns `/collections`
 * while its panel lists collections. -1 when nothing matches.
 */
export function oliveActiveItemIndex(
  pathname: string,
  items: NavItem[],
  shopIndex: number,
  collectionsEnabled: boolean,
): number {
  const owners: number[] = [];
  const entries: { label: string; href: string }[] = [];

  const add = (itemIndex: number) => {
    const item = items[itemIndex];
    if (!item) return;
    for (const entry of navGroupEntries(item)) {
      if (entry.external) continue;
      owners.push(itemIndex);
      entries.push(entry);
    }
  };

  if (shopIndex !== -1) {
    add(shopIndex);
    if (collectionsEnabled) {
      owners.push(shopIndex);
      entries.push({ label: "", href: "/collections" });
    }
  }
  items.forEach((_, i) => {
    if (i !== shopIndex) add(i);
  });

  const best = activeEntryIndex(pathname, entries);
  return best === -1 ? -1 : owners[best]!;
}
