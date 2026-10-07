import "server-only";

import type { SitemapRows } from "~/lib/seo/sitemap-entries";
import type { DbClient } from "~/server/db";

/**
 * Load the published rows that feed `buildSitemapEntries` for one business.
 *
 * Shared by `src/app/sitemap.ts` and the IndexNow seed (`runIndexNowSweep`),
 * so a store's first IndexNow submission is exactly its sitemap.
 *
 * Fetches only the sections whose feature flag is on — a section whose route
 * 404s when its flag is off (see `buildSitemapEntries`) has no business being
 * queried for the sitemap either.
 */
export async function loadSitemapRows(
  db: DbClient,
  businessId: string,
  isEnabled: (key: string) => boolean,
): Promise<SitemapRows> {
  const [products, collections, pages, services, faqCount, events, videoCount] =
    await Promise.all([
      isEnabled("products")
        ? db.product.findMany({
            where: { businessId, published: true },
            select: { slug: true, updatedAt: true },
          })
        : Promise.resolve<SitemapRows["products"]>([]),
      isEnabled("collections")
        ? db.collection.findMany({
            where: { businessId, published: true },
            select: { slug: true, updatedAt: true },
          })
        : Promise.resolve<SitemapRows["collections"]>([]),
      // Always fetched — includes CMS pages (type !== "blog"), which are
      // unconditional and have no feature flag of their own. The blog flag
      // is applied to the blog-typed subset inside `buildSitemapEntries`.
      db.page.findMany({
        where: { businessId, published: true },
        select: { slug: true, updatedAt: true, type: true },
      }),
      isEnabled("services")
        ? db.service.findMany({
            where: { businessId, published: true },
            select: { slug: true, updatedAt: true },
          })
        : Promise.resolve<SitemapRows["services"]>([]),
      // FAQ has no governing feature flag — always fetched.
      db.faqItem.count({
        where: { businessId, published: true },
      }),
      isEnabled("events")
        ? db.event.findMany({
            where: { businessId, published: true },
            select: { slug: true, updatedAt: true, isArchived: true },
          })
        : Promise.resolve<SitemapRows["events"]>([]),
      isEnabled("videos")
        ? db.video.count({
            where: { businessId, published: true },
          })
        : Promise.resolve(0),
    ]);

  return {
    products,
    collections,
    pages,
    services,
    faqCount,
    events,
    videoCount,
  };
}
