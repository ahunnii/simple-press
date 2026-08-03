import type { MetadataRoute } from "next";
import { headers } from "next/headers";

import { getCanonicalBaseUrl } from "~/lib/canonical";
import { businessHostFilter } from "~/lib/domain-utils";
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
    },
  });

  if (!business) return [];

  const baseUrl = getCanonicalBaseUrl(business);

  const [
    products,
    collections,
    pages,
    services,
    faqCount,
    eventCount,
    videoCount,
  ] = await Promise.all([
      db.product.findMany({
        where: { businessId: business.id, published: true },
        select: { slug: true, updatedAt: true },
      }),
      db.collection.findMany({
        where: { businessId: business.id, published: true },
        select: { slug: true, updatedAt: true },
      }),
      db.page.findMany({
        where: { businessId: business.id, published: true },
        select: { slug: true, updatedAt: true, type: true },
      }),
      db.service.findMany({
        where: { businessId: business.id, published: true },
        select: { slug: true, updatedAt: true },
      }),
      db.faqItem.count({
        where: { businessId: business.id, published: true },
      }),
      db.event.count({
        where: { businessId: business.id, published: true, isArchived: false },
      }),
      db.video.count({
        where: { businessId: business.id, published: true },
      }),
    ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, changeFrequency: "daily", priority: 1 },
    {
      url: `${baseUrl}/shop`,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/collections`,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/blog`,
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/about`,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/contact`,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${baseUrl}/testimonials`,
      changeFrequency: "weekly",
      priority: 0.5,
    },
  ];

  // Services static index page — only when there are published services
  if (services.length > 0) {
    staticRoutes.push({
      url: `${baseUrl}/services`,
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  // FAQ page — only when there are published FAQ items
  if (faqCount > 0) {
    staticRoutes.push({
      url: `${baseUrl}/faq`,
      changeFrequency: "weekly",
      priority: 0.5,
    });
  }

  // Events static index page — only when there are published events
  if (eventCount > 0) {
    staticRoutes.push({
      url: `${baseUrl}/events`,
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  // Videos static index page — only when there are published videos. Mirrors
  // the events entry above, including NOT gating on the "videos" feature
  // flag — like every other section in this file, only the published-row
  // count is checked.
  if (videoCount > 0) {
    staticRoutes.push({
      url: `${baseUrl}/videos`,
      changeFrequency: "weekly",
      priority: 0.6,
    });
  }

  const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${baseUrl}/shop/${p.slug}`,
    lastModified: p.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const collectionRoutes: MetadataRoute.Sitemap = collections.map((c) => ({
    url: `${baseUrl}/collections/${c.slug}`,
    lastModified: c.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  const blogRoutes: MetadataRoute.Sitemap = pages
    .filter((p) => p.type === "blog")
    .map((p) => ({
      url: `${baseUrl}/blog/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));

  // Custom CMS pages (not blog) — rendered at /[slug]
  const pageRoutes: MetadataRoute.Sitemap = pages
    .filter((p) => p.type !== "blog")
    .map((p) => ({
      url: `${baseUrl}/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    }));

  const serviceRoutes: MetadataRoute.Sitemap = services.map((s) => ({
    url: `${baseUrl}/services/${s.slug}`,
    lastModified: s.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [
    ...staticRoutes,
    ...productRoutes,
    ...collectionRoutes,
    ...blogRoutes,
    ...pageRoutes,
    ...serviceRoutes,
  ];
}
