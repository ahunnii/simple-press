/**
 * Which uploaded image a store's icons are generated from, plus a cache-busting
 * version for the `<link rel="icon">` tags.
 *
 * Kept free of sharp / node-only imports so layout.tsx and other server
 * components can use it without pulling in the image pipeline.
 */

import { isStorageUrl } from "~/lib/s3/url";

type IconSiteContent =
  | { faviconUrl?: string | null; logoUrl?: string | null }
  | null
  | undefined;

/**
 * Candidate source URLs in priority order: favicon, then logo. Blank strings
 * get persisted for cleared fields, so values are trimmed. Anything outside our
 * own storage bucket is dropped — the route fetches these server-side, so this
 * is the SSRF guard (the form validator accepts any URL).
 */
export function resolveIconSources(siteContent: IconSiteContent): string[] {
  const candidates = [siteContent?.faviconUrl, siteContent?.logoUrl];
  const sources: string[] = [];
  for (const raw of candidates) {
    const url = raw?.trim();
    if (url && isStorageUrl(url) && !sources.includes(url)) sources.push(url);
  }
  return sources;
}

/** The preferred icon source, or null when the store falls back to SimplePress. */
export function resolveIconSource(siteContent: IconSiteContent): string | null {
  return resolveIconSources(siteContent)[0] ?? null;
}

/**
 * 32-bit FNV-1a as 8 hex chars. Pure JS so it runs anywhere; only used for
 * cache keys and ETags, never for anything security-sensitive.
 */
export function fnv1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/** Short `?v=` value: changes whenever the resolved source URL changes. */
export function iconVersion(source: string | null): string {
  return source ? fnv1a(source) : "sp";
}
