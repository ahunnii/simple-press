import type { Metadata } from "next";

import { getCanonicalUrl } from "~/lib/canonical";
import {
  getPageMetaEntry,
  type PageMetaEntry,
  type StaticSeoRouteKey,
} from "~/lib/validators/site-seo";

/**
 * Structural, not a Prisma type. Every caller hands this a `simplifiedGet()`
 * result, which carries far more than these fields; keeping the shape
 * structural means widening the router's `select` never has to be mirrored
 * here, and every property below is optional so a narrower `select` still
 * satisfies it.
 *
 * `pageMeta` is deliberately `unknown` — it is a raw JSON column, and
 * `getPageMetaEntry` is the only thing allowed to interpret it.
 */
interface SeoBusiness {
  subdomain: string;
  customDomain?: string | null;
  domainStatus?: string | null;
  siteContent?: {
    ogImage?: string | null;
    logoUrl?: string | null;
    pageMeta?: unknown;
  } | null;
}

interface BuildPageMetadataArgs {
  business: SeoBusiness | null | undefined;
  /** Public path, e.g. "/shop" — used for the canonical URL. */
  path: string;
  /**
   * Storage key inside `SiteContent.pageMeta`. When supplied, the owner's saved
   * title / description / ogImage for that route take precedence over the
   * fallbacks below. Omit it for routes that are not owner-editable.
   */
  pageMetaKey?: StaticSeoRouteKey;
  /** Fallback title, used when the owner has not written one. */
  title: string;
  /** Fallback description, used when the owner has not written one. */
  description?: string | null;
  /** Comma-separated string. */
  keywords?: string | null;
  /** Fallback OG image, tried after the owner's per-route one. */
  ogImage?: string | null;
  noindex?: boolean;
}

/**
 * Build page-level `Metadata` for a storefront route.
 *
 * Resolution for title / description / ogImage is: the owner's per-route value
 * from `SiteContent.pageMeta` → the caller's fallback → (for the image only)
 * the site-wide OG image, then the logo. Anything still unresolved is simply
 * omitted, so Next merges the root layout's value rather than emitting a blank
 * tag.
 *
 * The one place owner and fallback are NOT interchangeable is the `title`
 * field, which goes out absolute when the owner wrote it — see the comment on
 * the return value.
 */
export function buildPageMetadata({
  business,
  path,
  pageMetaKey,
  title,
  description,
  keywords,
  ogImage,
  noindex,
}: BuildPageMetadataArgs): Metadata {
  const owner: PageMetaEntry =
    pageMetaKey === undefined
      ? {}
      : getPageMetaEntry(business?.siteContent?.pageMeta, pageMetaKey);

  // Kept as two values rather than one: the `title` field has to know whether
  // the string came from the owner or from the caller's built-in label, while
  // `openGraph` / `twitter` want the plain resolved string either way.
  const ownerTitle = firstNonBlank(owner.title);
  const resolvedTitle = preferNonBlank(ownerTitle, title);

  const desc = firstNonBlank(owner.description, description);
  const resolvedOgImage = firstNonBlank(
    owner.ogImage,
    ogImage,
    business?.siteContent?.ogImage,
    business?.siteContent?.logoUrl,
  );

  const parsedKeywords = keywords
    ? keywords
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean)
    : undefined;

  return {
    // An owner-written title ships verbatim: the SEO editor counts it against a
    // 60-character budget, and the root layout's `%s | ${business.name}`
    // template would spend characters the counter never showed them. The
    // built-in labels still take the suffix — bare words like "Shop" and
    // "About" need the brand for context.
    title: ownerTitle === undefined ? resolvedTitle : { absolute: ownerTitle },
    ...(desc !== undefined ? { description: desc } : {}),
    ...(parsedKeywords !== undefined ? { keywords: parsedKeywords } : {}),
    ...(business != null
      ? { alternates: { canonical: getCanonicalUrl(business, path) } }
      : {}),
    ...(noindex ? { robots: { index: false, follow: false } } : {}),
    openGraph: {
      title: resolvedTitle,
      description: desc ?? "",
      // Dimensioned form, matching the hand-rolled `generateMetadata`s on
      // /[slug] and /blog/[slug]. Twitter takes bare strings.
      ...(resolvedOgImage !== undefined
        ? { images: [{ url: resolvedOgImage, width: 1200, height: 630 }] }
        : {}),
    },
    twitter: {
      card: "summary_large_image" as const,
      title: resolvedTitle,
      description: desc ?? "",
      ...(resolvedOgImage !== undefined ? { images: [resolvedOgImage] } : {}),
    },
  };
}

/**
 * First meaningful (non-blank) candidate, or `undefined` when there is none.
 *
 * `??` is the wrong operator for this job: a field the owner has cleared comes
 * back as `""`, not `null`, and a blank must fall through to the next candidate
 * rather than win. (`parsePageMeta` already drops blanks, but the site-wide
 * columns and caller-supplied fallbacks are not filtered.) The expression that
 * says this correctly is a coalescing ternary, which this repo's
 * `prefer-nullish-coalescing` rule flags as an error — hence a named helper.
 * Same shape and same reasoning as `resolveLogoAlt` in `~/lib/logo-alt`.
 */
function firstNonBlank(
  ...candidates: (string | null | undefined)[]
): string | undefined {
  for (const candidate of candidates) {
    const trimmed = candidate?.trim();
    if (trimmed !== undefined && trimmed.length > 0) return trimmed;
  }
  return undefined;
}

/** As `firstNonBlank`, but with a guaranteed fallback, so it returns a string. */
function preferNonBlank(
  value: string | null | undefined,
  fallback: string,
): string {
  const trimmed = value?.trim();
  if (trimmed === undefined || trimmed.length === 0) return fallback;
  return trimmed;
}
