import type { MetadataRoute } from "next";
import { headers } from "next/headers";

import { db } from "~/server/db";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const headersList = await headers();
  const host = headersList.get("host") ?? "";
  const domain = host.split(":")[0] ?? "";

  const business = await db.business.findFirst({
    where: {
      OR: [{ customDomain: domain }, { subdomain: domain.split(".")[0] }],
      status: "active",
    },
    select: { id: true },
  });

  if (!business) return [];

  const baseUrl = `https://${host}`;

  const [products, collections, pages] = await Promise.all([
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
  ]);

  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: now, changeFrequency: "daily", priority: 1 },
    {
      url: `${baseUrl}/shop`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/collections`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${baseUrl}/testimonials`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.5,
    },
  ];

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

  return [
    ...staticRoutes,
    ...productRoutes,
    ...collectionRoutes,
    ...blogRoutes,
    ...pageRoutes,
  ];
}
