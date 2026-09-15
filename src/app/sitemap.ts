import type { MetadataRoute } from "next";
import { headers } from "next/headers";

import type { SitemapRows } from "~/lib/seo/sitemap-entries";
import { getCanonicalBaseUrl } from "~/lib/canonical";
import { businessHostFilter } from "~/lib/domain-utils";
import { resolveFlags } from "~/lib/features/resolve-flags";
import { buildSitemapEntries } from "~/lib/seo/sitemap-entries";
import { db } from "~/server/db";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const headersList = await headers();
  const host = headersList.get("host") ?? "";

  const business = await db.business.findFirst({
    where: {
      ...businessHostFilter(host),
      status: "active",
    },
    select: {
      id: true,
      subdomain: true,
      customDomain: true,
      domainStatus: true,
      featureFlags: true,
    },
  });

  if (!business) return [];

  const baseUrl = getCanonicalBaseUrl(business);
  const { isEnabled } = resolveFlags(business.featureFlags);

  // Fetch only the sections whose feature flag is on — a section whose route
  // 404s when its flag is off (see `buildSitemapEntries`) has no business
  // being queried for the sitemap either.
  const [products, collections, pages, services, faqCount, events, videoCount] =
    await Promise.all([
      isEnabled("products")
        ? db.product.findMany({
            where: { businessId: business.id, published: true },
            select: { slug: true, updatedAt: true },
          })
        : Promise.resolve<SitemapRows["products"]>([]),
      isEnabled("collections")
        ? db.collection.findMany({
            where: { businessId: business.id, published: true },
            select: { slug: true, updatedAt: true },
          })
        : Promise.resolve<SitemapRows["collections"]>([]),
      // Always fetched — includes CMS pages (type !== "blog"), which are
      // unconditional and have no feature flag of their own. The blog flag
      // is applied to the blog-typed subset inside `buildSitemapEntries`.
      db.page.findMany({
        where: { businessId: business.id, published: true },
        select: { slug: true, updatedAt: true, type: true },
      }),
      isEnabled("services")
        ? db.service.findMany({
            where: { businessId: business.id, published: true },
            select: { slug: true, updatedAt: true },
          })
        : Promise.resolve<SitemapRows["services"]>([]),
      // FAQ has no governing feature flag — always fetched.
      db.faqItem.count({
        where: { businessId: business.id, published: true },
      }),
      isEnabled("events")
        ? db.event.findMany({
            where: { businessId: business.id, published: true },
            select: { slug: true, updatedAt: true, isArchived: true },
          })
        : Promise.resolve<SitemapRows["events"]>([]),
      isEnabled("videos")
        ? db.video.count({
            where: { businessId: business.id, published: true },
          })
        : Promise.resolve(0),
    ]);

  const rows: SitemapRows = {
    products,
    collections,
    pages,
    services,
    faqCount,
    events,
    videoCount,
  };

  return buildSitemapEntries({ baseUrl, isEnabled, rows });
}
