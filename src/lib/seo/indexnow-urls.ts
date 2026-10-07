import type { BuildSitemapEntriesParams } from "~/lib/seo/sitemap-entries";
import type { StaticSeoRouteKey } from "~/lib/validators/site-seo";
import {
  buildSitemapEntries,
  isSeoRouteEnabled,
  SEO_PATHS,
} from "~/lib/seo/sitemap-entries";
import { STATIC_SEO_ROUTES } from "~/lib/validators/site-seo";

/**
 * Pure URL selection for the IndexNow cron sweep (`~/lib/seo/indexnow.ts`).
 *
 * Every rule here reuses the sitemap's (`SEO_PATHS`, `isSeoRouteEnabled`), so
 * IndexNow never announces a URL the sitemap wouldn't list — in particular a
 * route that `notFound()`s because its feature flag is off.
 *
 * PUBLISHED ROWS ONLY. IndexNow fans submissions out to every participating
 * engine (Bing, Yandex, Seznam, …), so passing a draft's slug here would leak
 * an unpublished product/post name. The caller's queries filter on
 * `published: true` (or the equivalent public visibility rule); nothing here
 * can re-check that.
 */

/** IndexNow accepts at most 10,000 URLs per POST. */
export const INDEXNOW_MAX_URLS = 10_000;

interface SlugOnly {
  slug: string;
}

export interface IndexNowChangedRows {
  products: SlugOnly[];
  collections: SlugOnly[];
  /** Published `Page` rows of every type — blog posts and CMS pages. */
  pages: (SlugOnly & { type: string })[];
  services: SlugOnly[];
  events: SlugOnly[];
  /** A published FAQ item changed → `/faq`. */
  faqChanged: boolean;
  /** A visible (approved, not hidden) testimonial changed → `/testimonials`. */
  testimonialsChanged: boolean;
  /** A published video was added → `/videos`. */
  videosAdded: boolean;
  /** Site content or business details changed → the homepage. */
  homeChanged: boolean;
}

export interface CollectChangedUrlsParams {
  baseUrl: string;
  isEnabled: (key: string) => boolean;
  rows: IndexNowChangedRows;
}

const STATIC_ROUTE_PATHS: Record<StaticSeoRouteKey, string> =
  Object.fromEntries(
    STATIC_SEO_ROUTES.map((route) => [route.key, route.path]),
  ) as Record<StaticSeoRouteKey, string>;

function dedupeAndCap(urls: string[]): string[] {
  return [...new Set(urls)].slice(0, INDEXNOW_MAX_URLS);
}

/**
 * The URLs to submit for rows changed since a store's last IndexNow
 * watermark. Listing pages come before detail pages (and the homepage before
 * both), so the 10k cap — if it ever bites — drops detail URLs first.
 *
 * A listing page (`/shop`, `/blog`, …) is included whenever any of its items
 * changed and its route is enabled; its content (the item grid) changed too.
 */
export function collectChangedUrls({
  baseUrl,
  isEnabled,
  rows,
}: CollectChangedUrlsParams): string[] {
  const listings: string[] = [];
  const details: string[] = [];

  const addSection = (
    routeKey: StaticSeoRouteKey,
    items: SlugOnly[],
    toPath: (slug: string) => string,
  ) => {
    if (items.length === 0 || !isSeoRouteEnabled(isEnabled, routeKey)) return;
    listings.push(`${baseUrl}${STATIC_ROUTE_PATHS[routeKey]}`);
    for (const item of items) details.push(`${baseUrl}${toPath(item.slug)}`);
  };

  const addListingOnly = (routeKey: StaticSeoRouteKey, changed: boolean) => {
    if (!changed || !isSeoRouteEnabled(isEnabled, routeKey)) return;
    listings.push(`${baseUrl}${STATIC_ROUTE_PATHS[routeKey]}`);
  };

  addSection("shop", rows.products, SEO_PATHS.product);
  addSection("collections", rows.collections, SEO_PATHS.collection);
  addSection(
    "blog",
    rows.pages.filter((p) => p.type === "blog"),
    SEO_PATHS.blogPost,
  );
  addSection("services", rows.services, SEO_PATHS.service);
  addSection("events", rows.events, SEO_PATHS.event);
  addListingOnly("faq", rows.faqChanged);
  addListingOnly("testimonials", rows.testimonialsChanged);
  addListingOnly("videos", rows.videosAdded);

  // Custom CMS pages render at /[slug] with no flag and no listing page —
  // same as the sitemap.
  for (const page of rows.pages) {
    if (page.type !== "blog") {
      details.push(`${baseUrl}${SEO_PATHS.cmsPage(page.slug)}`);
    }
  }

  // The homepage URL matches the sitemap's (`baseUrl`, no trailing slash).
  const home = rows.homeChanged ? [baseUrl] : [];

  return dedupeAndCap([...home, ...listings, ...details]);
}

/**
 * A store's full first submission: exactly its sitemap's URLs (static routes
 * first, as the sitemap orders them), deduped and capped.
 */
export function seedUrls(params: BuildSitemapEntriesParams): string[] {
  return dedupeAndCap(buildSitemapEntries(params).map((entry) => entry.url));
}
