/**
 * umsc's nav model, shared by the header (desktop bar + avatar menu) and the
 * mobile nav dialog. Pure module: no React, no hooks, safe on either side of
 * the server/client boundary.
 *
 * The header resolves ONE list — `resolveUmscNav(navigationItems, isEnabled)`
 * = `filterNavByFlags(resolveNav(navigationItems, UMSC_DEFAULT_NAV),
 * isEnabled)` (P-NAV-FLAGS) — and hands the same array to the dialog, so the
 * two can never disagree about which links exist.
 */

import type { NavChild, NavItem } from "~/app/(storefront)/_components/nav";
import {
  activeEntryIndex,
  filterNavByFlags,
  navGroupEntries,
  navHrefFlag,
  resolveNav,
} from "~/app/(storefront)/_components/nav";

/**
 * Shipped nav when the owner hasn't saved one (Admin → Content → Navigation):
 * umsc's original hard-coded links, in their original order. No per-flag
 * filtering here — `filterNavByFlags` drops `/shop` downstream when
 * `products` is off, whichever list it came from.
 */
export const UMSC_DEFAULT_NAV: NavItem[] = [
  { label: "Shop", href: "/shop" },
  { label: "About", href: "/about" },
  { label: "FAQ", href: "/faq" },
  { label: "Contact", href: "/contact" },
];

/**
 * The owner's saved nav (or `UMSC_DEFAULT_NAV` when none is saved), with
 * every entry that links to a flag-disabled feature removed. A saved `[]`
 * stays `[]` — no links — per `resolveNav`'s `??` semantics.
 */
export function resolveUmscNav(
  navigationItems: unknown,
  isEnabled: (flag: string) => boolean,
): NavItem[] {
  return filterNavByFlags(
    resolveNav(navigationItems, UMSC_DEFAULT_NAV),
    isEnabled,
  );
}

/**
 * Quick-access account subset (B4.3) for the desktop avatar menu AND the
 * dialog's account block (decision 2026-09-28): filtered from
 * `getAccountNavLinks` by key, so flag gating still applies (Orders needs
 * `orders`; Admin only exists when `includeAdmin` is passed). The full list
 * lives in the account area's own sidebar.
 */
export const UMSC_QUICK_ACCOUNT_KEYS: ReadonlySet<string> = new Set([
  "orders",
  "settings",
  "admin",
]);

/**
 * Index of the ONE top-level item that reads as current (B3.4): every item's
 * group entries (`navGroupEntries` — its own href, then its children) go
 * through a single `activeEntryIndex` pass, so the longest matching href wins
 * across the whole bar and two items can never both light up. External
 * entries never match. -1 when nothing matches.
 */
export function umscActiveItemIndex(
  pathname: string,
  items: NavItem[],
): number {
  const owners: number[] = [];
  const entries: NavChild[] = [];

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

/**
 * Whether a field-driven CTA href may render (B2.5): false when
 * `navHrefFlag(href)` names a flag that is off. Hide the CTA, never swap in
 * another destination.
 */
export function umscHrefAllowed(
  href: string,
  isEnabled: (flag: string) => boolean,
): boolean {
  const flag = navHrefFlag(href);
  return flag === null || isEnabled(flag);
}
