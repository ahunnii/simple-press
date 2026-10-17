/**
 * "Popular" chips for the empty search dialog and the empty / no-results
 * /search page. They are real destinations (they navigate), not canned
 * queries: a nav label like "Shop" makes a poor search term but a useful
 * shortcut.
 *
 * Source: the business's own top-level nav (owner-saved `navigationItems`),
 * flag-filtered with the shared P-NAV-FLAGS filter. When that yields nothing
 * usable, a flag-based starter set (Shop / Services / Events / Blog / FAQ /
 * Contact, each only when its feature is on).
 *
 * Pure module — no React — safe on either side of the server/client boundary.
 */
import type { NavItem } from "../nav/resolve-nav";

import { filterNavByFlags } from "../nav/nav-flags";
import { resolveNav } from "../nav/resolve-nav";

export type SearchPopularLink = { label: string; href: string };

const MAX_POPULAR = 6;

const STARTER_LINKS: NavItem[] = [
  { label: "Shop", href: "/shop" },
  { label: "Services", href: "/services" },
  { label: "Events", href: "/events" },
  { label: "Blog", href: "/blog" },
  { label: "FAQ", href: "/faq" },
  { label: "Contact", href: "/contact" },
];

function usable(href: string): boolean {
  const h = href.trim();
  // Internal paths only; skip Home (the shopper is already on the site) and
  // the search page itself.
  if (!h.startsWith("/") || h.startsWith("//")) return false;
  const path = h.split(/[?#]/)[0]!.replace(/\/+$/, "");
  return path !== "" && path !== "/search";
}

function collect(items: NavItem[]): SearchPopularLink[] {
  const out: SearchPopularLink[] = [];
  const seen = new Set<string>();
  const push = (label: string, href: string, external?: boolean) => {
    if (external || !label.trim() || !usable(href)) return;
    if (seen.has(href)) return;
    seen.add(href);
    out.push({ label: label.trim(), href: href.trim() });
  };
  // Top-level links first, then children (e.g. a label-only "More" group).
  for (const item of items) push(item.label, item.href, item.external);
  for (const item of items) {
    for (const child of item.children ?? []) {
      push(child.label, child.href, child.external);
    }
  }
  return out.slice(0, MAX_POPULAR);
}

export function resolveSearchPopular(
  navigationItems: unknown,
  isEnabled: (key: string) => boolean,
): SearchPopularLink[] {
  const fromNav = collect(
    filterNavByFlags(resolveNav(navigationItems, []), isEnabled),
  );
  if (fromNav.length > 0) return fromNav;
  return collect(filterNavByFlags(STARTER_LINKS, isEnabled));
}
