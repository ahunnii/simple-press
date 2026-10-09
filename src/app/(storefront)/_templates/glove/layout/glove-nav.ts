import type { NavItem } from "~/app/(storefront)/_components/nav";
import { isActiveNavLink } from "~/lib/nav-utils";
import {
  filterNavByFlags,
  resolveNav,
} from "~/app/(storefront)/_components/nav";

/** Shipped main nav when the owner hasn't saved one (Admin → Content → Navigation). */
export const GLOVE_DEFAULT_NAV: NavItem[] = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/easy-guide", label: "How to Customize Your LuvGluv" },
  { href: "/shop/gift-card", label: "Gift Cards" },
  { href: "/about", label: "Our Story" },
  { href: "/contact", label: "Contact" },
];

/** Footer "Quick links" shipped default (replaced once the owner saves their own). */
export const GLOVE_DEFAULT_FOOTER_LINKS: NavItem[] = [
  { href: "/about", label: "About us" },
  { href: "/contact", label: "Contact us" },
  { href: "/shop", label: "Products" },
  { href: "/auth/sign-in", label: "Login" },
  { href: "/auth/sign-up", label: "Sign Up" },
];

/** Owner nav (or the shipped default) with flag-disabled routes removed (P-NAV-FLAGS). */
export function resolveGloveNav(
  navigationItems: unknown,
  isEnabled: (key: string) => boolean,
): NavItem[] {
  return filterNavByFlags(
    resolveNav(navigationItems, GLOVE_DEFAULT_NAV),
    isEnabled,
  );
}

/**
 * Index of the single top-level item that is "current": the longest matching
 * href across each item's own href and its children's. One winner, so `/shop`
 * and `/shop/gift-card` never light up together.
 */
export function activeTopIndex(pathname: string, links: NavItem[]): number {
  let best = -1;
  let bestLength = -1;
  links.forEach((item, i) => {
    const hrefs = [item.href, ...(item.children?.map((c) => c.href) ?? [])];
    for (const href of hrefs) {
      if (isActiveNavLink(pathname, href) && href.length > bestLength) {
        best = i;
        bestLength = href.length;
      }
    }
  });
  return best;
}

/** Returns all keyboard-focusable elements inside `container`. */
export function getFocusables(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((el) => !el.closest("[inert]"));
}

export const GLOVE_FALLBACK_LOGO = "/templates/glove/images/logo.png";
