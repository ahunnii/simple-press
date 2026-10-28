import { headers } from "next/headers";

import { getCanonicalBaseUrl } from "~/lib/canonical";
import { businessHostFilter } from "~/lib/domain-utils";
import { upcomingEventWhere } from "~/lib/events/query";
import { resolveFlags } from "~/lib/features/resolve-flags";
import { getEffectivePrice } from "~/lib/prices";
import { isReservedPageSlug } from "~/lib/reserved-page-slugs";
import {
  buildLlmsTxt,
  LLMS_EVENT_CAP,
  LLMS_FAQ_CAP,
  LLMS_PAGE_CAP,
  LLMS_PRODUCT_CAP,
  LLMS_SERVICE_CAP,
} from "~/lib/seo/llms-txt";
import { db } from "~/server/db";

// Per-store llms.txt (https://llmstxt.org). Resolved from the request host like
// robots.txt / sitemap.xml, so every tenant gets its own summary. The pure
// formatting lives in `~/lib/seo/llms-txt`; this route only loads rows.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function notFound() {
  return new Response("Not found", {
    status: 404,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

export async function GET() {
  const headersList = await headers();
  const host = headersList.get("host") ?? "";

  const business = await db.business.findFirst({
    where: {
      ...businessHostFilter(host),
      status: "active",
    },
    select: {
      id: true,
      name: true,
      subdomain: true,
      customDomain: true,
      domainStatus: true,
      featureFlags: true,
      timeZone: true,
      maintenanceMode: true,
      allowAiCrawlers: true,
      addressCity: true,
      addressState: true,
      areaServed: true,
      supportEmail: true,
      siteContent: {
        select: {
          metaDescription: true,
          pageMeta: true,
          socialLinks: true,
        },
      },
    },
  });

  // Same posture as robots.txt: a store that opted out of AI crawlers, or is
  // not publicly browsable (maintenance / coming soon), publishes no summary.
  if (!business || business.maintenanceMode || !business.allowAiCrawlers) {
    return notFound();
  }

  const { isEnabled } = resolveFlags(business.featureFlags);
  const businessId = business.id;
  const now = new Date();

  const [
    products,
    events,
    faqs,
    collections,
    blogPosts,
    testimonials,
    services,
    videos,
    cmsPages,
  ] = await Promise.all([
    isEnabled("products")
      ? db.product.findMany({
          where: { businessId, published: true },
          // Same default order as the shop (newest first, id tiebreak).
          orderBy: [{ createdAt: "desc" }, { id: "asc" }],
          take: LLMS_PRODUCT_CAP,
          select: {
            name: true,
            slug: true,
            price: true,
            compareAtPrice: true,
            excerpt: true,
            description: true,
            variants: {
              orderBy: { createdAt: "asc" },
              take: 1,
              select: { price: true, compareAtPrice: true },
            },
          },
        })
      : Promise.resolve([]),
    isEnabled("events")
      ? db.event.findMany({
          where: upcomingEventWhere(businessId, now),
          orderBy: [{ startAt: "asc" }, { id: "asc" }],
          take: LLMS_EVENT_CAP,
          select: {
            name: true,
            slug: true,
            blurb: true,
            location: true,
            startAt: true,
            endAt: true,
            allDay: true,
          },
        })
      : Promise.resolve([]),
    db.faqItem.findMany({
      where: { businessId, published: true },
      orderBy: { sortOrder: "asc" },
      take: LLMS_FAQ_CAP,
      select: { question: true, answer: true },
    }),
    isEnabled("collections")
      ? db.collection.count({ where: { businessId, published: true } })
      : Promise.resolve(0),
    isEnabled("blog")
      ? db.page.count({ where: { businessId, published: true, type: "blog" } })
      : Promise.resolve(0),
    isEnabled("testimonials")
      ? db.testimonial.count({
          where: { businessId, isApproved: true, isHidden: false },
        })
      : Promise.resolve(0),
    isEnabled("services")
      ? db.service.findMany({
          where: { businessId, published: true },
          orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
          take: LLMS_SERVICE_CAP,
          select: {
            name: true,
            slug: true,
            metaDescription: true,
            description: true,
          },
        })
      : Promise.resolve([]),
    isEnabled("videos")
      ? db.video.count({ where: { businessId, published: true } })
      : Promise.resolve(0),
    // Custom CMS pages only — blog posts are summarised by count and policies
    // are boilerplate. No feature flag governs these (same as the sitemap).
    // Over-fetch a little: slugs shadowed by a built-in route are dropped
    // below, same as `loadSitemapRows`.
    db.page.findMany({
      where: {
        businessId,
        published: true,
        type: { notIn: ["blog", "policy"] },
      },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      take: LLMS_PAGE_CAP * 2,
      select: {
        title: true,
        slug: true,
        type: true,
        metaDescription: true,
        excerpt: true,
      },
    }),
  ]);

  const body = buildLlmsTxt({
    baseUrl: getCanonicalBaseUrl(business),
    name: business.name,
    description: business.siteContent?.metaDescription,
    addressCity: business.addressCity,
    addressState: business.addressState,
    areaServed: business.areaServed,
    supportEmail: business.supportEmail,
    socialLinks: business.siteContent?.socialLinks,
    pageMeta: business.siteContent?.pageMeta,
    timeZone: business.timeZone,
    isEnabled,
    products: products.map((p) => ({
      name: p.name,
      slug: p.slug,
      price: getEffectivePrice(p),
      excerpt: p.excerpt,
      description: p.description,
    })),
    events,
    faqs,
    services,
    pages: cmsPages
      .filter((p) => !isReservedPageSlug(p.slug, p.type))
      .slice(0, LLMS_PAGE_CAP),
    counts: { collections, blogPosts, testimonials, videos },
  });

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
