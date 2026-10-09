/**
 * Storefront route → feature-flag mapping. Shared by the storefront nav filter,
 * the announcement-banner resolver and the site editor's page dropdown: a
 * route whose feature is switched off 404s (or is meaningless), so no surface
 * should offer it.
 *
 * Pure module — no React, no hooks — safe on either side of the server/client
 * boundary.
 */

/**
 * Path prefix (whole segments) → the feature flag that gates it. Matched on
 * segments, so `shop` covers `/shop` and `/shop/x` but never `/shopping`, and
 * `account` never matches `/accounting`. When several prefixes match, the
 * longest is the route's own flag; the shorter ones gate it too (see
 * `routeFlags`).
 */
const ROUTE_FLAGS: ReadonlyArray<readonly [prefix: string, flag: string]> = [
  ["shop", "products"],
  ["collections", "collections"],
  ["blog", "blog"],
  ["services", "services"],
  ["events", "events"],
  ["videos", "videos"],
  ["donate", "donations"],
  ["testimonials", "testimonials"],
  ["wishlist", "wishlist"],
  ["cart", "cart"],
  ["checkout", "checkout"],
  ["subscribe", "subscriptions"],
  ["account", "customerAccounts"],
  ["account/orders", "orders"],
  ["account/subscriptions", "subscriptions"],
  ["account/invoices", "invoices"],
  ["account/rewards", "loyalty"],
];

const PREFIX_SEGMENTS = ROUTE_FLAGS.map(
  ([prefix, flag]) => [prefix.split("/"), flag] as const,
);

/** Lower-cased path segments of a same-site href, or null for anything else. */
function pathSegments(href: string): string[] | null {
  const trimmed = href.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null;
  const path = trimmed.split(/[?#]/, 1)[0]!.toLowerCase();
  return path.split("/").filter(Boolean);
}

/**
 * Every flag gating `href`, shortest prefix first (`/account/rewards` →
 * `["customerAccounts", "loyalty"]`). Empty when nothing gates it. Only
 * same-site paths are considered — anything not starting with a single `/`
 * (external URLs, `mailto:`, `//cdn…`) is ungated; query strings and hashes
 * are ignored.
 */
export function routeFlags(href: string): string[] {
  const segments = pathSegments(href);
  if (!segments) return [];
  return PREFIX_SEGMENTS.filter(([prefix]) =>
    prefix.every((s, i) => segments[i] === s),
  )
    .sort((a, b) => a[0].length - b[0].length)
    .map(([, flag]) => flag);
}

/**
 * The flag gating `href` most specifically (the longest matching prefix), or
 * null when no flag gates it. Callers that need every gate — e.g.
 * `/account/orders` also needs `customerAccounts` — use `routeEnabled`.
 */
export function routeFlag(href: string): string | null {
  return routeFlags(href).at(-1) ?? null;
}

/**
 * The first flag gating `href` that is OFF, or null when every gate is on (or
 * nothing gates it). Drop-in for `routeFlag` in the common
 * `flag === null || isEnabled(flag)` check, but aware of the whole prefix
 * chain — `/account/orders` with `customerAccounts` off yields
 * `"customerAccounts"` even though `orders` is on.
 */
export function routeOffFlag(
  href: string,
  isEnabled: (key: string) => boolean,
): string | null {
  return routeFlags(href).find((flag) => !isEnabled(flag)) ?? null;
}

/** True when every flag gating `href` is on (ungated hrefs are always on). */
export function routeEnabled(
  href: string,
  isEnabled: (key: string) => boolean,
): boolean {
  return routeFlags(href).every((flag) => isEnabled(flag));
}
