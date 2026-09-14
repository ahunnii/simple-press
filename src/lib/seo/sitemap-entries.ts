import type { MetadataRoute } from "next";

import type { StaticSeoRouteKey } from "~/lib/validators/site-seo";
import { STATIC_SEO_ROUTES } from "~/lib/validators/site-seo";

/**
 * Pure sitemap-entry builder for `src/app/sitemap.ts`.
 *
 * Extracted so the flag/row conditionals that decide which URLs make it into
 * the sitemap can be unit tested without a database or request headers. The
 * route page components are the ground truth for what 404s when a feature
 * flag is off (e.g. `src/app/(storefront)/blog/page.tsx`) — every gate below
 * mirrors one of those checks so the sitemap never advertises a URL that
 * `notFound()`s.
 */

// ─── Row shapes ─────────────────────────────────────────────────────────────

interface SlugRow {
  slug: string;
  updatedAt: Date;
}

interface PageRow extends SlugRow {
  type: string;
}

interface EventRow extends SlugRow {
  isArchived: boolean;
}

export interface SitemapRows {
  products: SlugRow[];
  collections: SlugRow[];
  /** All published `Page` rows (both `type: "blog"` and CMS pages). */
  pages: PageRow[];
  services: SlugRow[];
  faqCount: number;
  events: EventRow[];
  videoCount: number;
}

export interface BuildSitemapEntriesParams {
  baseUrl: string;
  isEnabled: (key: string) => boolean;
  rows: SitemapRows;
}

// ─── Feature-key lookup ─────────────────────────────────────────────────────

/**
 * `STATIC_SEO_ROUTES` is the single source of truth for which feature flag
 * (if any) gates a given static storefront route — reused here rather than
 * hardcoding a second `{ blog: "blog", collections: "collections", ... }`
 * map that could drift from it.
 */
const ROUTE_FEATURE_KEYS: Record<StaticSeoRouteKey, string | null> =
  Object.fromEntries(
    STATIC_SEO_ROUTES.map((route) => [route.key, route.featureKey]),
  ) as Record<StaticSeoRouteKey, string | null>;

function isRouteEnabled(
  isEnabled: (key: string) => boolean,
  routeKey: StaticSeoRouteKey,
): boolean {
  const featureKey = ROUTE_FEATURE_KEYS[routeKey];
  return featureKey === null || isEnabled(featureKey);
}

// ─── Builder ────────────────────────────────────────────────────────────────

export function buildSitemapEntries({
  baseUrl,
  isEnabled,
  rows,
}: BuildSitemapEntriesParams): MetadataRoute.Sitemap {
  const {
    products,
    collections,
    pages,
    services,
    faqCount,
    events,
    videoCount,
  } = rows;

  const shopEnabled = isRouteEnabled(isEnabled, "shop");
  const collectionsEnabled = isRouteEnabled(isEnabled, "collections");
  const blogEnabled = isRouteEnabled(isEnabled, "blog");
  const testimonialsEnabled = isRouteEnabled(isEnabled, "testimonials");
  const servicesEnabled = isRouteEnabled(isEnabled, "services");
  const eventsEnabled = isRouteEnabled(isEnabled, "events");
  const videosEnabled = isRouteEnabled(isEnabled, "videos");
  const donateEnabled = isRouteEnabled(isEnabled, "donate");

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, changeFrequency: "daily", priority: 1 },
  ];

  if (shopEnabled) {
    staticRoutes.push({
      url: `${baseUrl}/shop`,
      changeFrequency: "daily",
      priority: 0.9,
    });
  }

  if (collectionsEnabled) {
    staticRoutes.push({
      url: `${baseUrl}/collections`,
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  if (blogEnabled) {
    staticRoutes.push({
      url: `${baseUrl}/blog`,
      changeFrequency: "weekly",
      priority: 0.6,
    });
  }

  // /about and /contact have no featureKey (STATIC_SEO_ROUTES) — always on.
  staticRoutes.push({
    url: `${baseUrl}/about`,
    changeFrequency: "monthly",
    priority: 0.5,
  });
  staticRoutes.push({
    url: `${baseUrl}/contact`,
    changeFrequency: "monthly",
    priority: 0.4,
  });

  if (testimonialsEnabled) {
    staticRoutes.push({
      url: `${baseUrl}/testimonials`,
      changeFrequency: "weekly",
      priority: 0.5,
    });
  }

  // Services static index page — only when the flag is on AND there are
  // published services.
  if (servicesEnabled && services.length > 0) {
    staticRoutes.push({
      url: `${baseUrl}/services`,
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  // FAQ page — no feature flag governs it; only the published-row count
  // gates it, same as before.
  if (faqCount > 0) {
    staticRoutes.push({
      url: `${baseUrl}/faq`,
      changeFrequency: "weekly",
      priority: 0.5,
    });
  }

  // Events static index page — only when the flag is on AND there are
  // published, non-archived events (past events still get their own
  // per-event route below, but don't keep the index itself listed once
  // nothing upcoming remains).
  if (eventsEnabled && events.some((e) => !e.isArchived)) {
    staticRoutes.push({
      url: `${baseUrl}/events`,
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  // Videos static index page — only when the flag is on AND there are
  // published videos.
  if (videosEnabled && videoCount > 0) {
    staticRoutes.push({
      url: `${baseUrl}/videos`,
      changeFrequency: "weekly",
      priority: 0.6,
    });
  }

  // Donations static index page — only when the donations feature is enabled
  if (donateEnabled) {
    staticRoutes.push({
      url: `${baseUrl}/donate`,
      changeFrequency: "monthly",
      priority: 0.5,
    });
  }

  const productRoutes: MetadataRoute.Sitemap = shopEnabled
    ? products.map((p) => ({
        url: `${baseUrl}/shop/${p.slug}`,
        lastModified: p.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      }))
    : [];

  const collectionRoutes: MetadataRoute.Sitemap = collectionsEnabled
    ? collections.map((c) => ({
        url: `${baseUrl}/collections/${c.slug}`,
        lastModified: c.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      }))
    : [];

  const blogRoutes: MetadataRoute.Sitemap = blogEnabled
    ? pages
        .filter((p) => p.type === "blog")
        .map((p) => ({
          url: `${baseUrl}/blog/${p.slug}`,
          lastModified: p.updatedAt,
          changeFrequency: "monthly" as const,
          priority: 0.6,
        }))
    : [];

  // Custom CMS pages (not blog) — rendered at /[slug]. No feature flag gates
  // these, so they're unconditional (same as before).
  const pageRoutes: MetadataRoute.Sitemap = pages
    .filter((p) => p.type !== "blog")
    .map((p) => ({
      url: `${baseUrl}/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    }));

  const serviceRoutes: MetadataRoute.Sitemap = servicesEnabled
    ? services.map((s) => ({
        url: `${baseUrl}/services/${s.slug}`,
        lastModified: s.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      }))
    : [];

  // Per-event detail routes — includes past events too, since their pages
  // stay live after the event date. Gated on the flag only (not archived
  // status): an archived event's detail page still exists as long as
  // /events is reachable at all.
  const eventRoutes: MetadataRoute.Sitemap = eventsEnabled
    ? events.map((e) => ({
        url: `${baseUrl}/events/${e.slug}`,
        lastModified: e.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      }))
    : [];

  return [
    ...staticRoutes,
    ...productRoutes,
    ...collectionRoutes,
    ...blogRoutes,
    ...pageRoutes,
    ...serviceRoutes,
    ...eventRoutes,
  ];
}
