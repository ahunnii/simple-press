import "server-only";

import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { SitemapRows } from "~/lib/seo/sitemap-entries";
import type { DbClient } from "~/server/db";
import { isReservedPageSlug } from "~/lib/reserved-page-slugs";
import { isContentEmpty } from "~/lib/template-fields";

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
  const [
    products,
    collections,
    contentPages,
    policyPages,
    services,
    faqCount,
    events,
    videoCount,
  ] = await Promise.all([
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
    // Policies also pull `content` (below) so blank ones can be dropped;
    // the other types skip the body to keep this read light.
    db.page.findMany({
      where: { businessId, published: true, type: { not: "policy" } },
      select: { slug: true, updatedAt: true, type: true },
    }),
    db.page.findMany({
      where: { businessId, published: true, type: "policy" },
      select: { slug: true, updatedAt: true, type: true, content: true },
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

  // Drop pages the storefront can't actually show, so the sitemap (and the
  // IndexNow seed) never advertises a dead or blank URL:
  //  - a policy whose body was cleared renders blank and isn't linked anywhere;
  //  - a custom page at a built-in route's slug (legacy rows, from before the
  //    editor rejected them) is shadowed by that route and never reachable.
  // Blog posts live under /blog/<slug>, so reserved route slugs don't apply.
  const pages: SitemapRows["pages"] = [
    ...contentPages.filter(
      (p) => p.type === "blog" || !isReservedPageSlug(p.slug, p.type),
    ),
    ...policyPages
      .filter((p) => !isContentEmpty(p.content as TiptapJSON))
      .map(({ slug, updatedAt, type }) => ({ slug, updatedAt, type })),
  ];

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
