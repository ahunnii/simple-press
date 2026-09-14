import "server-only";

import type { Metadata } from "next";
import { cache } from "react";
import { headers } from "next/headers";
import * as Sentry from "@sentry/nextjs";

import type {
  PageMetaEntry,
  StaticSeoRouteKey,
} from "~/lib/validators/site-seo";
import { getCanonicalUrl } from "~/lib/canonical";
import { firstNonBlank, preferNonBlank } from "~/lib/seo/blank";
import { renderSeoTitle, resolveSeoBrand } from "~/lib/seo/title";
import { getPageMetaEntry } from "~/lib/validators/site-seo";
import { api } from "~/trpc/server";

/**
 * Structural, not a Prisma type. Every caller hands this a `simplifiedGet()`
 * result, which carries far more than these fields; keeping the shape
 * structural means widening the router's `select` never has to be mirrored
 * here, and every property below except `name` is optional so a narrower
 * `select` still satisfies it. `name` is required because it is the brand
 * fallback for the `<title>` suffix, and every caller already selects it.
 *
 * `pageMeta` is deliberately `unknown` — it is a raw JSON column, and
 * `getPageMetaEntry` is the only thing allowed to interpret it.
 */
interface SeoBusiness {
  name: string;
  subdomain: string;
  customDomain?: string | null;
  domainStatus?: string | null;
  siteContent?: {
    seoBrandName?: string | null;
    ogImage?: string | null;
    logoUrl?: string | null;
    pageMeta?: unknown;
  } | null;
}

export interface BuildPageMetadataArgs {
  business: SeoBusiness | null | undefined;
  /** Public path, e.g. "/shop" — used for the canonical URL. */
  path: string;
  /**
   * Storage key inside `SiteContent.pageMeta`. When supplied, the owner's saved
   * title / description / ogImage for that route take precedence over the
   * fallbacks below. Omit it for routes that are not owner-editable.
   */
  pageMetaKey?: StaticSeoRouteKey;
  /** Fallback title, used when neither the owner nor the record supplies one. */
  title: string;
  /** Fallback description, same precedence as `title`. */
  description?: string | null;
  /** Comma-separated string. */
  keywords?: string | null;
  /** Fallback OG image, tried after the owner's and the record's. */
  ogImage?: string | null;
  /**
   * Per-record owner values, for detail routes backed by a row that carries
   * its own SEO fields (`Product.metaTitle`, `Page.metaDescription`, ...).
   * Sits between the site-wide `pageMeta` override and the caller's fallback.
   */
  entity?: {
    title?: string | null;
    description?: string | null;
    ogImage?: string | null;
  };
  /**
   * Present on blog posts and other dated records: switches `og:type` to
   * `article` and emits `article:published_time` / `article:modified_time`.
   */
  article?: {
    publishedAt?: Date | null;
    updatedAt?: Date | null;
  };
  /** `og:image:alt`; defaults to the resolved title. */
  ogImageAlt?: string;
  noindex?: boolean;
}

/**
 * Build page-level `Metadata` for a storefront route.
 *
 * Resolution for title / description / ogImage is: the owner's per-route value
 * from `SiteContent.pageMeta` → the record's own SEO field (`entity`) → the
 * caller's fallback → (for the image only) the site-wide OG image, then the
 * logo. Anything still unresolved is simply omitted, so Next merges the root
 * layout's value rather than emitting a blank tag.
 *
 * The `<title>` always ships absolute and always carries the brand suffix —
 * `renderSeoTitle` in `~/lib/seo/title` is the one implementation of that rule
 * (it skips the suffix when the title already contains the brand, so nothing
 * doubles up). `openGraph.title` / `twitter.title` stay un-suffixed: the brand
 * is already carried there by `og:site_name`.
 */
// Re-exported so existing importers of the blank-aware helpers keep working;
// the implementations live in the client-safe `~/lib/seo/blank`.
export { firstNonBlank, preferNonBlank };

export function buildPageMetadata({
  business,
  path,
  pageMetaKey,
  title,
  description,
  keywords,
  ogImage,
  entity,
  article,
  ogImageAlt,
  noindex,
}: BuildPageMetadataArgs): Metadata {
  const owner: PageMetaEntry =
    pageMetaKey === undefined
      ? {}
      : getPageMetaEntry(business?.siteContent?.pageMeta, pageMetaKey);

  const resolvedTitle = preferNonBlank(
    firstNonBlank(owner.title, entity?.title),
    title,
  );

  const desc = firstNonBlank(
    owner.description,
    entity?.description,
    description,
  );
  const resolvedOgImage = firstNonBlank(
    owner.ogImage,
    entity?.ogImage,
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

  const canonical =
    business != null ? getCanonicalUrl(business, path) : undefined;

  // No business resolved ⇒ no brand to append; `renderSeoTitle` then returns
  // the bare title.
  const brand = business != null ? resolveSeoBrand(business) : undefined;

  const openGraphBase = {
    title: resolvedTitle,
    ...(desc !== undefined ? { description: desc } : {}),
    ...(canonical !== undefined ? { url: canonical } : {}),
    ...(business != null ? { siteName: business.name } : {}),
    // Dimensioned form, matching the hand-rolled `generateMetadata`s on
    // /[slug] and /blog/[slug]. Twitter takes bare strings.
    ...(resolvedOgImage !== undefined
      ? {
          images: [
            {
              url: resolvedOgImage,
              width: 1200,
              height: 630,
              alt: ogImageAlt ?? resolvedTitle,
            },
          ],
        }
      : {}),
  };

  const openGraph: Metadata["openGraph"] =
    article !== undefined
      ? {
          ...openGraphBase,
          type: "article",
          ...(article.publishedAt != null
            ? { publishedTime: article.publishedAt.toISOString() }
            : {}),
          ...(article.updatedAt != null
            ? { modifiedTime: article.updatedAt.toISOString() }
            : {}),
        }
      : { ...openGraphBase, type: "website" };

  return {
    title: { absolute: renderSeoTitle(resolvedTitle, brand) },
    ...(desc !== undefined ? { description: desc } : {}),
    ...(parsedKeywords !== undefined ? { keywords: parsedKeywords } : {}),
    ...(canonical !== undefined ? { alternates: { canonical } } : {}),
    ...(noindex ? { robots: { index: false, follow: false } } : {}),
    openGraph,
    twitter: {
      card: "summary_large_image" as const,
      title: resolvedTitle,
      ...(desc !== undefined ? { description: desc } : {}),
      ...(resolvedOgImage !== undefined ? { images: [resolvedOgImage] } : {}),
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SEO business-fetch failures → Sentry
// ─────────────────────────────────────────────────────────────────────────────
//
// Same throttle shape as `reportZoneWeightFallback` in `~/lib/shipping-config`
// and `reportCheckoutBlocked` in `~/app/api/stripe/create-session/route.ts` —
// deliberately copied rather than extracted into a shared utility (a third
// local copy is an accepted tradeoff here; see the F11 plan notes). One event
// per host+path per 15 minutes keeps the issue open and its `lastSeen` honest
// for as long as the fetch keeps failing, while capping the bill.
const SEO_REPORT_WINDOW_MS = 15 * 60 * 1000;

// Bounded by (hosts served by this process × storefront routes), so small in
// practice — but this module lives for the life of the process, so it gets a
// hard cap anyway. Cleared wholesale rather than evicting the oldest entry:
// the only consequence of losing the map is at most one extra event per key.
const MAX_TRACKED_SEO_REPORTS = 500;
const lastSeoReport = new Map<string, number>();

function shouldReportSeoFailure(key: string): boolean {
  const now = Date.now();
  if (now - (lastSeoReport.get(key) ?? 0) < SEO_REPORT_WINDOW_MS) return false;
  if (lastSeoReport.size >= MAX_TRACKED_SEO_REPORTS) lastSeoReport.clear();
  lastSeoReport.set(key, now);
  return true;
}

/**
 * Fetch the tenant business for a storefront `generateMetadata`, reporting to
 * Sentry when the fetch itself throws (as opposed to legitimately resolving
 * to no tenant).
 *
 * `simplifiedGet()` returns `null` both when it throws (caught below) and,
 * completely normally, when no active business matches the request host —
 * that second case is not an error and must keep degrading silently exactly
 * as before (generic title, no canonical). The two are indistinguishable once
 * they leave this function, which is why the try/catch — and the Sentry call
 * — have to live here rather than inside `buildPageMetadata`.
 *
 * This is also the only place a persistent failure here CAN be observed:
 * `generateMetadata` runs through the RSC `createCaller` (`~/trpc/server`),
 * and throws from that path never reach the tRPC route handler's `onError` —
 * without this catch, a DB outage would serve generic titles and no
 * canonicals indefinitely with zero Sentry signal.
 */
/**
 * The tenant business for the current request, fetched at most once.
 *
 * Same rationale as `getCachedProduct` in `~/app/(storefront)/shop/[slug]`:
 * `generateMetadata` and the page component both need it, and `api.*` calls
 * from `~/trpc/server` are plain promises rather than query-client-backed, so
 * they do not dedupe on their own. React's request-scoped `cache()` collapses
 * the repeat DB round trips — which matters more here than anywhere, since
 * detail routes now also read the business for the brand suffix.
 */
export const getCachedBusiness = cache(() => api.business.simplifiedGet());

export async function loadSeoBusiness(path: string) {
  try {
    return await getCachedBusiness();
  } catch (error) {
    // No businessId is resolvable on failure — throttle per host+path instead.
    const host = (await headers()).get("host") ?? "unknown";
    if (shouldReportSeoFailure(`${host}:${path}`)) {
      Sentry.captureException(error, {
        level: "warning",
        tags: {
          service: "seo",
          "seo.degrade": "business-fetch-failed",
          route: path,
        },
        extra: { host },
      });
    }
    return null; // degrade exactly as before: generic title, no canonical
  }
}
