/**
 * Serving helpers shared by the per-store image routes (`/site-icon/<file>` and
 * `/og-fallback.png`): one cache policy, content-hash ETags, conditional GETs,
 * and a render-once-then-LRU loader. No sharp / next imports so route tests
 * and server components can use it freely.
 */

import type { CachedIcon } from "./cache";

import { getCachedIcon, markIconFailed, setCachedIcon } from "./cache";
import { fnv1a } from "./source";

export const IMAGE_CACHE_CONTROL =
  "public, max-age=86400, stale-while-revalidate=604800";

/** ETag for a cache key. Source URLs are immutable content, so this is enough. */
export function etagFor(cacheKey: string) {
  return `"${fnv1a(cacheKey)}"`;
}

export function matchesIfNoneMatch(header: string | null, etag: string) {
  if (!header) return false;
  return header
    .split(",")
    .some((tag) => tag.trim().replace(/^W\//, "") === etag);
}

export function notModified(etag: string) {
  return new Response(null, {
    status: 304,
    headers: { "Cache-Control": IMAGE_CACHE_CONTROL, ETag: etag },
  });
}

export function imageResponse(icon: CachedIcon, ifNoneMatch: string | null) {
  const headers = { "Cache-Control": IMAGE_CACHE_CONTROL, ETag: icon.etag };
  if (matchesIfNoneMatch(ifNoneMatch, icon.etag)) {
    return new Response(null, { status: 304, headers });
  }
  return new Response(new Uint8Array(icon.body), {
    headers: { ...headers, "Content-Type": icon.contentType },
  });
}

/**
 * Render through the shared LRU. A render or fetch failure is remembered for a
 * few minutes (see `markIconFailed`) and reported as `null`.
 */
export async function loadCachedImage(
  key: string,
  contentType: string,
  render: () => Promise<Buffer>,
  logLabel: string,
): Promise<CachedIcon | null> {
  const cached = getCachedIcon(key);
  if (cached === "failed") return null;
  if (cached) return cached;

  try {
    const icon: CachedIcon = {
      body: await render(),
      contentType,
      etag: etagFor(key),
    };
    setCachedIcon(key, icon);
    return icon;
  } catch (error) {
    console.warn(`${logLabel} could not render ${key}`, error);
    markIconFailed(key);
    return null;
  }
}
