/**
 * URL-level image-format helpers.
 *
 * The logo is stored at a fixed key (`{businessId}/logo.{ext}`) and saved with a
 * `?v=` cache-buster, so format checks must ignore the query string and hash.
 * Pure (no node/browser APIs) — safe from server, client and email code.
 */

/** True when the URL's path ends in `.svg`, ignoring any `?query` / `#hash`. */
export function isSvgUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const path = url.split(/[?#]/, 1)[0] ?? "";
  return path.toLowerCase().endsWith(".svg");
}

/**
 * The URL when it points at a raster image, else `undefined`.
 *
 * For consumers that cannot render SVG — email clients (Gmail/Outlook), Open
 * Graph scrapers, Stripe product images — so the caller falls back to its
 * text/no-image path instead of showing a broken image.
 */
export function rasterImageUrl(
  url: string | null | undefined,
): string | undefined {
  if (!url || isSvgUrl(url)) return undefined;
  return url;
}
