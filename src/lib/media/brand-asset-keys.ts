/**
 * Media Library brand-asset protection.
 *
 * Logo and favicon uploads write to a FIXED key (`{businessId}/logo.{ext}`,
 * `{businessId}/favicon.{ext}`), so switching format (logo.png → logo.svg)
 * leaves the old object behind under a different extension. Protecting every
 * `logo.*` / `favicon.*` key (`isAlwaysInUseKey`) would pin that stale file
 * forever, so the Media Library narrows the rule to "the brand asset that is
 * actually in use":
 *
 *   - a `logo.*` key is protected when `SiteContent.logoUrl` is empty (the
 *     transient lag right after an upload — the column may not be written yet)
 *     or when it IS the saved logo's key;
 *   - a `favicon.*` key follows the same rule against `faviconUrl`.
 *
 * A stale `logo.png` is therefore unprotected and goes through the normal
 * usage check like any other file (still blocked if a template field etc.
 * references it).
 *
 * Automatic cleanup (gallery / product routers) deliberately keeps using the
 * strict `isAlwaysInUseKey`: it must never remove a brand file, saved or not.
 */

import { isAlwaysInUseKey, normalizeUrl } from "~/lib/media/usage";
import { publicUrlToKey } from "~/lib/s3/url";

export interface BrandAssetUrls {
  logoUrl?: string | null;
  faviconUrl?: string | null;
}

/** Storage key of a saved brand URL, or null for empty / non-storage URLs. */
function savedBrandKey(url: string | null | undefined): string | null {
  const trimmed = url?.trim();
  if (!trimmed) return null;
  return publicUrlToKey(normalizeUrl(trimmed));
}

function isBlank(url: string | null | undefined): boolean {
  return !url?.trim();
}

/**
 * True when `key` is a logo/favicon fixed-key object that is currently the
 * business's brand asset (or might be — column still empty). Pure; callers
 * pass the business's saved `{ logoUrl, faviconUrl }`.
 */
export function isProtectedBrandAssetKey(
  key: string,
  brand: BrandAssetUrls,
): boolean {
  if (!isAlwaysInUseKey(key)) return false;

  const suffix = key.slice(key.indexOf("/") + 1);
  const saved = suffix.startsWith("logo.") ? brand.logoUrl : brand.faviconUrl;

  // Column empty → upload lag; keep the strict old behavior.
  if (isBlank(saved)) return true;

  return savedBrandKey(saved) === key;
}
