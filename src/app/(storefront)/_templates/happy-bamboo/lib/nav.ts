/**
 * happy-bamboo's shipped nav default, bound to the shared `resolveNav`
 * (`~/app/(storefront)/_components/nav`) so the client-rendered header +
 * mobile panel and the server-rendered footer resolve the same list. Pure
 * module — safe on either side of the server/client boundary.
 */

import type { NavItem } from "~/app/(storefront)/_components/nav";
import { resolveNav } from "~/app/(storefront)/_components/nav";

/** Shipped default nav, used only when the owner has never saved a Navigation list. */
export const HB_DEFAULT_NAV: NavItem[] = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/about", label: "About Us" },
  { href: "/contact", label: "Contact" },
];

/**
 * `resolveNav` with happy-bamboo's default. Sanitizing and the empty-list rule
 * (a saved `[]` means "no links", never the default) live in `resolveNav`.
 */
export function resolveHappyBambooNav(navigationItems: unknown): NavItem[] {
  return resolveNav(navigationItems, HB_DEFAULT_NAV);
}
