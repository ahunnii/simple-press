/**
 * Shared nav resolution for the `dream` template, used from both the
 * server-rendered footer and the client-rendered header/mobile overlay.
 * Pure module — no React, no hooks — so it is safe to import from either
 * side of the server/client boundary.
 */

export type DreamNavChild = { label: string; href: string; external?: boolean };
export type DreamNavItem = DreamNavChild & { children?: DreamNavChild[] };

/** Shipped default nav, used only when the owner has never saved a Navigation list. */
export const DREAM_DEFAULT_NAV: DreamNavItem[] = [
  { label: "Services", href: "/services" },
  { label: "Gallery", href: "/#gallery" },
  { label: "About", href: "/about" },
];

/**
 * Resolve the nav from `business.siteContent.navigationItems` (Admin → Content → Navigation,
 * validated by `navigationItemsSchema` in src/lib/validators/content.ts).
 * `??`, never `||` or a `.length` check: an owner who saves an EMPTY list means "no nav links"
 * and must not be overwritten with the shipped default (same rule as pink-header.tsx).
 */
export function resolveDreamNav(navigationItems: unknown): DreamNavItem[] {
  if (navigationItems == null) return DREAM_DEFAULT_NAV;
  if (!Array.isArray(navigationItems)) return DREAM_DEFAULT_NAV;
  return navigationItems as DreamNavItem[];
}

/** Active-route test lifted from dream-nav-overlay.tsx; hash/anchor hrefs and "#" are never active. */
export function isDreamNavActive(pathname: string, href: string): boolean {
  if (!href || href === "#" || href.includes("#")) return false;
  return href === "/"
    ? pathname === "/"
    : pathname === href || pathname.startsWith(href + "/");
}
