import { firstNonBlank } from "./blank";

/**
 * The ONE rule for storefront `<title>` text.
 *
 * Every page title ships as `<title> | <brand>`. Owners never have to think
 * about the brand, and because it sits at the END, a title that runs past
 * Google's display width loses the brand first and keeps the descriptive part.
 * (Google also renders the site name on its own line, so a truncated suffix
 * costs nothing.) The suffix is skipped when the title already contains the
 * brand, so "Lavender Soap | Bloom Apothecary" is never doubled.
 *
 * `brand` is `SiteContent.seoBrandName` when set — the escape hatch for a
 * long-named store ("Detroit Pollinator Company" → "Detroit Pollinator Co.")
 * — otherwise `Business.name`. Resolve it with `resolveSeoBrand`.
 *
 * Client-safe (no server imports): the admin meta-title counters and search
 * previews call this so what the owner sees is what Google sees.
 */

/** Target rendered length for `<title>`; Google truncates around here. */
export const SEO_TITLE_MAX = 60;

export const SEO_TITLE_SEPARATOR = " | ";

interface BrandSource {
  name: string;
  siteContent?: { seoBrandName?: string | null } | null;
}

/** The brand used as the title suffix: `seoBrandName`, else the business name. */
export function resolveSeoBrand(business: BrandSource): string {
  return firstNonBlank(business.siteContent?.seoBrandName) ?? business.name;
}

/**
 * Append ` | brand` to `title` unless the title is blank, the brand is blank,
 * or the title already contains the brand (case-insensitive).
 */
export function renderSeoTitle(
  title: string | null | undefined,
  brand: string | null | undefined,
): string {
  const t = title?.trim() ?? "";
  const b = brand?.trim() ?? "";
  if (t.length === 0) return b;
  if (b.length === 0) return t;
  if (t.toLowerCase().includes(b.toLowerCase())) return t;
  return `${t}${SEO_TITLE_SEPARATOR}${b}`;
}
