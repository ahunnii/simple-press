/**
 * Storefront route → feature-flag mapping. Shared by the storefront nav filter
 * and the site editor's page dropdown: a route whose feature is switched off
 * 404s, so neither surface should offer it.
 *
 * Pure module — no React, no hooks — safe on either side of the server/client
 * boundary.
 */

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
export function routeFlag(href: string): string | null {
  const trimmed = href.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null;
  const segment = trimmed.slice(1).split(/[/?#]/, 1)[0]!.toLowerCase();
  return ROUTE_FLAGS[segment] ?? null;
}
