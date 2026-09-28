/**
 * Pink's nav model, shared by the header, its desktop dropdowns and the mobile
 * menu. Pure module (no React, no hooks) so either side of the server/client
 * boundary can import it.
 */

import type { NavChild, NavItem } from "~/app/(storefront)/_components/nav";
import {
  activeEntryIndex,
  filterNavByFlags,
  navGroupEntries,
  resolveNav,
} from "~/app/(storefront)/_components/nav";

/** Kept for existing imports; the platform nav shapes are the source of truth. */
export type PinkNavChild = NavChild;
export type PinkNavLink = NavItem;

/**
 * Shipped nav when the owner hasn't saved one (Admin → Content → Navigation).
 * No per-flag filtering here: `filterNavByFlags` drops `/shop`, `/collections`,
 * `/services`, `/blog`, `/events` and `/videos` downstream when their feature
 * is off, whichever list the items came from. About and Contact are ungated.
 */
export const PINK_NAV_DEFAULTS: NavItem[] = [
  { href: "/shop", label: "Shop" },
  { href: "/collections", label: "Collections" },
  { href: "/services", label: "Services" },
  { href: "/blog", label: "Journal" },
  { href: "/events", label: "Events" },
  { href: "/videos", label: "Videos" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

/**
 * The owner's nav (or pink's shipped defaults), sanitized by `resolveNav`
 * (`??` semantics: a saved `[]` means "no links", never the defaults) and then
 * flag-filtered (P-NAV-FLAGS) so a link to a switched-off feature never
 * renders — owner-saved items included.
 */
export function resolvePinkNav(
  navigationItems: unknown,
  isEnabled: (key: string) => boolean,
): NavItem[] {
  return filterNavByFlags(
    resolveNav(navigationItems, PINK_NAV_DEFAULTS),
    isEnabled,
  );
}

/**
 * The entries a nav item renders: a group's disclosure entries (its own href
 * first, via `navGroupEntries`, then its children), or the plain link itself.
 */
export function pinkNavEntries(item: NavItem): NavChild[] {
  return item.children?.length ? navGroupEntries(item) : [item];
}

/**
 * The single current entry across the whole nav: `item` is the top-level
 * index, `entry` the index within `pinkNavEntries(item)`. Longest match wins
 * (`activeEntryIndex`), so on `/blog/<slug>` a top-level `/blog` and a group
 * child `/blog` can't both light up, and exactly one element is ever marked
 * `aria-current`. `{ item: -1, entry: -1 }` when nothing matches.
 */
export function pinkActiveNav(
  pathname: string,
  items: NavItem[],
): { item: number; entry: number } {
  const flat: NavChild[] = [];
  const owners: { item: number; entry: number }[] = [];
  items.forEach((navItem, i) => {
    pinkNavEntries(navItem).forEach((entry, j) => {
      flat.push(entry);
      owners.push({ item: i, entry: j });
    });
  });
  const index = activeEntryIndex(pathname, flat);
  return owners[index] ?? { item: -1, entry: -1 };
}

/**
 * Quick-access account subset (B4.3) for the desktop avatar menu and the
 * mobile menu's account block. Filtered from `getAccountNavLinks` by key, so
 * flag gating (Orders needs `orders`) still applies. The full list lives in
 * the account area's own sidebar. The desktop menu also drops "settings"
 * because `UserButton` renders its own built-in Settings item.
 */
export const PINK_QUICK_ACCOUNT_KEYS: ReadonlySet<string> = new Set([
  "orders",
  "settings",
  "admin",
]);
