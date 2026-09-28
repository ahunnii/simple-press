/**
 * happy-bamboo's shipped nav default, bound to the shared `resolveNav` +
 * route→flag filter (`~/app/(storefront)/_components/nav`, P-NAV-FLAGS) so
 * the client-rendered header + mobile panel and the server-rendered footer
 * resolve the same list, with the same flag-disabled routes dropped. Pure
 * module — safe on either side of the server/client boundary.
 */

import type { NavItem } from "~/app/(storefront)/_components/nav";
import {
  filterNavByFlags,
  resolveNav,
} from "~/app/(storefront)/_components/nav";

/** Shipped default nav, used only when the owner has never saved a Navigation list. */
export const HB_DEFAULT_NAV: NavItem[] = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/about", label: "About Us" },
  { href: "/contact", label: "Contact" },
];

/**
 * `resolveNav` with happy-bamboo's default, then the shared route→flag filter
 * (P-NAV-FLAGS) drops any entry — owner-saved or shipped default — that links
 * to a feature the business has switched off (e.g. `/shop` while `products`
 * is off), so the header, mobile panel and footer never link to a route that
 * 404s. Sanitizing and the empty-list rule (a saved `[]` means "no links",
 * never the default) live in `resolveNav`.
 */
export function resolveHappyBambooNav(
  navigationItems: unknown,
  isEnabled: (flag: string) => boolean,
): NavItem[] {
  return filterNavByFlags(
    resolveNav(navigationItems, HB_DEFAULT_NAV),
    isEnabled,
  );
}
