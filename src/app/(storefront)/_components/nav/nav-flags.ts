/**
 * Feature-flag filter for storefront nav (P-NAV-FLAGS in the template feature
 * baseline). Owner-saved nav (`SiteContent.navigationItems`) and a template's
 * shipped defaults can both point at routes whose feature is switched off —
 * those routes 404, so the link must not render. Apply after `resolveNav`, in
 * every header, mobile nav and footer.
 *
 * Pure module — no React, no hooks — safe on either side of the server/client
 * boundary. The caller supplies `isEnabled` (the resolved flag check, with
 * `dependsOn` cascades already applied).
 */

import type { NavChild, NavItem } from "./resolve-nav";

/** First path segment → the feature flag that gates it. */
const ROUTE_FLAGS: Record<string, string> = {
  shop: "products",
  collections: "collections",
  blog: "blog",
  services: "services",
  events: "events",
  videos: "videos",
  donate: "donations",
  testimonials: "testimonials",
  wishlist: "wishlist",
  cart: "cart",
};

/**
 * The flag gating `href`, or null when no flag gates it. Matches on the first
 * path segment (`/shop` and `/shop/x`, never `/shopping`); query strings and
 * hashes are ignored. Only same-site paths are considered — anything not
 * starting with a single `/` (external URLs, `mailto:`, `//cdn…`) is ungated.
 */
export function navHrefFlag(href: string): string | null {
  const trimmed = href.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null;
  const segment = trimmed.slice(1).split(/[/?#]/, 1)[0]!.toLowerCase();
  return ROUTE_FLAGS[segment] ?? null;
}

function isGated(
  entry: NavChild,
  isEnabled: (key: string) => boolean,
): boolean {
  if (entry.external) return false;
  const flag = navHrefFlag(entry.href);
  return flag !== null && !isEnabled(flag);
}

/**
 * Drop nav entries that link to a flag-disabled feature. External links pass
 * through. Children are filtered; a parent is dropped when its own href is
 * gated, or when its href is empty and none of its children survived (it
 * would render as an empty dropdown). Returns new objects — never mutates
 * `items`.
 */
export function filterNavByFlags(
  items: NavItem[],
  isEnabled: (key: string) => boolean,
): NavItem[] {
  const out: NavItem[] = [];
  for (const item of items) {
    if (isGated(item, isEnabled)) continue;
    const { children, ...rest } = item;
    if (!children) {
      out.push(rest);
      continue;
    }
    const kept = children.filter((c) => !isGated(c, isEnabled));
    if (kept.length) out.push({ ...rest, children: kept });
    else if (item.href.trim()) out.push(rest);
  }
  return out;
}
