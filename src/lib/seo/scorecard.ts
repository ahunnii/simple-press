import "server-only";

import type { Prisma } from "generated/prisma";

import type { ChecklistItem, ChecklistSummary } from "~/lib/admin/checklist";
import { summarizeChecklist } from "~/lib/admin/checklist";
import { parseBusinessHours } from "~/lib/business-hours";
import {
  parsePageMeta,
  parseSiteVerification,
  STATIC_SEO_ROUTES,
} from "~/lib/validators/site-seo";
import { db } from "~/server/db";

// ─────────────────────────────────────────────────────────────────────────────
// SEO / AEO / GEO scorecard
// ─────────────────────────────────────────────────────────────────────────────
//
// SimplePress already emits the machinery — JSON-LD across 13 schema types, a
// sitemap, canonical URLs, an AI-crawler switch. What it never told the owner is
// which of it is actually *populated*. A store can have every technical feature
// working and still rank badly because 30 products have no meta description and
// 40 images have no alt text.
//
// This scores only what the owner can act on, and only what applies to their
// store: a check for a feature they've turned off, or for a catalog with nothing
// published in it, is left out of the calculation rather than counted against
// them.
//
// Reads `SiteContent` for the site-level meta columns. Both
// `business.updateSeo` and `content.updateSiteContent` write those same columns,
// so scoring the row (rather than either mutation's payload) keeps this
// writer-agnostic.
//
// Deliberately uncached. The whole point is that an owner saves a meta
// description and watches the number move; a cache with no invalidation hook
// would show a stale percentage at exactly the moment that costs the most trust.

/**
 * `{ not: null }` alone still matches `''`, which is precisely what an owner who
 * cleared a field leaves behind. Both halves are required.
 */
const NON_BLANK = {
  not: null,
  notIn: [""],
} satisfies Prisma.StringNullableFilter;

/** Google truncates well outside these; they match the counters in the editor. */
const META_TITLE_MIN = 30;
const META_TITLE_MAX = 60;
const META_DESCRIPTION_MIN = 70;
const META_DESCRIPTION_MAX = 160;

/** A store is "answerable" once it has at least this many published FAQs. */
const FAQ_TARGET = 3;

const BLOG_FRESH_DAYS = 90;

export type SeoScorecardGroup = {
  id: string;
  label: string;
  items: ChecklistItem[];
  /** Weighted completion for this group alone, 0–100. */
  percent: number;
  /**
   * Set when the group scores nothing — a feature the owner turned off, or a
   * catalog with nothing published. Rendered as a neutral row, never as a
   * failure.
   */
  note?: string;
};

export type SeoScorecard = ChecklistSummary & {
  groups: SeoScorecardGroup[];
};

export type BusinessForScorecard = {
  domainStatus: string;
  allowAiCrawlers: boolean;
  localBusinessEnabled: boolean;
  businessAddress: string | null;
  phoneNumber: string | null;
  businessHours: unknown;
};

export type SiteContentForScorecard = {
  metaTitle: string | null;
  metaDescription: string | null;
  ogImage: string | null;
  faviconUrl: string | null;
  /** Raw JSON columns — run through `parsePageMeta` / `parseSiteVerification`. */
  pageMeta: unknown;
  siteVerification: unknown;
};

export type SeoScorecardInput = {
  businessId: string;
  /** From `getBusinessFlags()` — note it is a sibling of `flags`, not `flags.isEnabled`. */
  isEnabled: (key: string) => boolean;
  business: BusinessForScorecard;
  siteContent: SiteContentForScorecard | null | undefined;
};

// ─── Scoring helpers ─────────────────────────────────────────────────────────

function isNonBlank(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function binary(condition: boolean): number {
  return condition ? 1 : 0;
}

/**
 * Length-band score for the two fields search engines actually render: full
 * credit inside the band, half credit for something written but mis-sized,
 * nothing for blank. Half credit matters — "written but 20 characters long" is a
 * different problem from "never written", and flattening them to 0 would hide
 * which one the owner has.
 */
function lengthBand(
  value: string | null | undefined,
  min: number,
  max: number,
): { score: number; detail: string } {
  const text = value?.trim() ?? "";
  if (text.length === 0) {
    return { score: 0, detail: "Not set" };
  }
  const inBand = text.length >= min && text.length <= max;
  return {
    score: inBand ? 1 : 0.5,
    detail: inBand
      ? `${text.length} characters`
      : `${text.length} characters — aim for ${min}–${max}`,
  };
}

/**
 * Partial credit for a "how many of these are filled in?" check. A store that
 * has described 18 of 24 products has done real work; a binary pass/fail would
 * report the same zero as a store that has described none.
 */
function coverage(
  covered: number,
  total: number,
  noun: string,
): { score: number; detail: string } {
  return {
    score: total === 0 ? 1 : covered / total,
    detail: `${covered} of ${total} ${noun}`,
  };
}

/** Count a query only when the owning feature is on; otherwise skip the round-trip. */
function countIf(
  enabled: boolean,
  run: () => Promise<number>,
): Promise<number> {
  return enabled ? run() : Promise.resolve(0);
}

function toGroup(
  id: string,
  label: string,
  items: ChecklistItem[],
  note?: string,
): SeoScorecardGroup {
  return {
    id,
    label,
    items,
    percent: summarizeChecklist(items).percent,
    note,
  };
}

// ─── Main entry point ────────────────────────────────────────────────────────

export async function computeSeoScorecard({
  businessId,
  isEnabled,
  business,
  siteContent,
}: SeoScorecardInput): Promise<SeoScorecard> {
  const productsEnabled = isEnabled("products");
  const collectionsEnabled = isEnabled("collections");
  const servicesEnabled = isEnabled("services");
  const pagesEnabled = isEnabled("pages");
  const blogEnabled = isEnabled("blog");
  const galleriesEnabled = isEnabled("galleries");
  // Hoisted only because STATIC_SEO_ROUTES (Page titles & descriptions, below)
  // references these three feature keys too — nothing above this point needed
  // them.
  const testimonialsEnabled = isEnabled("testimonials");
  const eventsEnabled = isEnabled("events");
  const videosEnabled = isEnabled("videos");

  const pageMeta = parsePageMeta(siteContent?.pageMeta);
  const siteVerification = parseSiteVerification(siteContent?.siteVerification);

  const blogFreshSince = new Date(
    Date.now() - BLOG_FRESH_DAYS * 24 * 60 * 60 * 1000,
  );

  const [
    faqPublished,
    blogPublished,
    blogFresh,

    productsTotal,
    productsWithTitle,
    productsWithDescription,
    productsWithOgImage,
    productImagesTotal,
    productImagesWithAlt,

    collectionsTotal,
    collectionsWithTitle,
    collectionsWithDescription,
    collectionsWithOgImage,

    servicesTotal,
    servicesWithTitle,
    servicesWithDescription,
    servicesWithOgImage,

    cmsPagesTotal,
    cmsPagesWithTitle,
    cmsPagesWithDescription,
    cmsPagesWithOgImage,

    galleryImagesTotal,
    galleryImagesWithAlt,
  ] = await Promise.all([
    // FAQ has no feature flag of its own — it is always applicable.
    db.faqItem.count({ where: { businessId, published: true } }),
    countIf(blogEnabled, () =>
      db.page.count({ where: { businessId, type: "blog", published: true } }),
    ),
    countIf(blogEnabled, () =>
      db.page.count({
        where: {
          businessId,
          type: "blog",
          published: true,
          publishedAt: { gte: blogFreshSince },
        },
      }),
    ),

    countIf(productsEnabled, () =>
      db.product.count({ where: { businessId, published: true } }),
    ),
    countIf(productsEnabled, () =>
      db.product.count({
        where: { businessId, published: true, metaTitle: NON_BLANK },
      }),
    ),
    countIf(productsEnabled, () =>
      db.product.count({
        where: { businessId, published: true, metaDescription: NON_BLANK },
      }),
    ),
    countIf(productsEnabled, () =>
      db.product.count({
        where: { businessId, published: true, ogImage: NON_BLANK },
      }),
    ),
    // 🔴 Product images carry `productId` and leave `businessId` null
    // (`product.ts` creates them that way), so filtering on `businessId` here
    // would match nothing and score a perfect 100% while ignoring every product
    // photo in the store. Traverse the relation instead; `Image.productId` is
    // indexed.
    countIf(productsEnabled, () =>
      db.image.count({ where: { product: { businessId, published: true } } }),
    ),
    countIf(productsEnabled, () =>
      db.image.count({
        where: {
          product: { businessId, published: true },
          altText: NON_BLANK,
        },
      }),
    ),

    countIf(collectionsEnabled, () =>
      db.collection.count({ where: { businessId, published: true } }),
    ),
    countIf(collectionsEnabled, () =>
      db.collection.count({
        where: { businessId, published: true, metaTitle: NON_BLANK },
      }),
    ),
    countIf(collectionsEnabled, () =>
      db.collection.count({
        where: { businessId, published: true, metaDescription: NON_BLANK },
      }),
    ),
    countIf(collectionsEnabled, () =>
      db.collection.count({
        where: { businessId, published: true, ogImage: NON_BLANK },
      }),
    ),

    countIf(servicesEnabled, () =>
      db.service.count({ where: { businessId, published: true } }),
    ),
    countIf(servicesEnabled, () =>
      db.service.count({
        where: { businessId, published: true, metaTitle: NON_BLANK },
      }),
    ),
    countIf(servicesEnabled, () =>
      db.service.count({
        where: { businessId, published: true, metaDescription: NON_BLANK },
      }),
    ),
    countIf(servicesEnabled, () =>
      db.service.count({
        where: { businessId, published: true, ogImage: NON_BLANK },
      }),
    ),

    // CMS pages only — policies are legal boilerplate nobody optimises, and blog
    // posts are scored by freshness in the Answerability group instead.
    countIf(pagesEnabled, () =>
      db.page.count({ where: { businessId, type: "page", published: true } }),
    ),
    countIf(pagesEnabled, () =>
      db.page.count({
        where: {
          businessId,
          type: "page",
          published: true,
          metaTitle: NON_BLANK,
        },
      }),
    ),
    countIf(pagesEnabled, () =>
      db.page.count({
        where: {
          businessId,
          type: "page",
          published: true,
          metaDescription: NON_BLANK,
        },
      }),
    ),
    countIf(pagesEnabled, () =>
      db.page.count({
        where: {
          businessId,
          type: "page",
          published: true,
          ogImage: NON_BLANK,
        },
      }),
    ),

    // Galleries have no `published` column — every gallery image is live.
    countIf(galleriesEnabled, () =>
      db.galleryImage.count({ where: { gallery: { businessId } } }),
    ),
    countIf(galleriesEnabled, () =>
      db.galleryImage.count({
        where: { gallery: { businessId }, altText: NON_BLANK },
      }),
    ),
  ]);

  const groups: SeoScorecardGroup[] = [];

  // ── Foundation ─────────────────────────────────────────────────────────────
  // Declared first so `summary.next` tells a store with no live custom domain
  // that before it starts talking about alt text.
  const domainLive = business.domainStatus === "ACTIVE";
  groups.push(
    toGroup("foundation", "Foundation", [
      {
        key: "custom-domain",
        label: "Custom domain is live",
        // Not `customDomain != null` — a domain sitting in PENDING_DNS resolves
        // nowhere, and search engines index the subdomain in the meantime.
        href: "/admin/settings/domain",
        score: binary(domainLive),
        weight: 3,
        detail: domainLive
          ? "Verified and serving traffic"
          : "Your store is still on its temporary subdomain",
      },
      {
        key: "ai-crawlers",
        label: "AI answer engines can read your store",
        href: "/admin/content/seo",
        score: binary(business.allowAiCrawlers),
        detail: business.allowAiCrawlers
          ? "ChatGPT, Perplexity and Google AI are allowed"
          : "Blocked in robots.txt",
      },
    ]),
  );

  // ── Search listing ─────────────────────────────────────────────────────────
  const metaTitle = lengthBand(
    siteContent?.metaTitle,
    META_TITLE_MIN,
    META_TITLE_MAX,
  );
  const metaDescription = lengthBand(
    siteContent?.metaDescription,
    META_DESCRIPTION_MIN,
    META_DESCRIPTION_MAX,
  );
  groups.push(
    toGroup("listing", "Search listing", [
      {
        key: "meta-title",
        label: "Site meta title",
        href: "/admin/content/seo",
        score: metaTitle.score,
        weight: 3,
        detail: metaTitle.detail,
      },
      {
        key: "meta-description",
        label: "Site meta description",
        href: "/admin/content/seo",
        score: metaDescription.score,
        weight: 3,
        detail: metaDescription.detail,
      },
      {
        key: "og-image",
        label: "Social share image",
        href: "/admin/content/seo",
        score: binary(isNonBlank(siteContent?.ogImage)),
        weight: 2,
        detail: "Shown when someone shares your store link",
      },
      {
        key: "favicon",
        label: "Favicon",
        href: "/admin/content/branding",
        score: binary(isNonBlank(siteContent?.faviconUrl)),
        detail: "The small icon in browser tabs and search results",
      },
      {
        key: "site-verification",
        label: "Search Console ownership verified",
        href: "/admin/content/seo",
        // Google only. Bing verification is genuinely optional — grading it
        // would punish an owner who reasonably never bothered with Bing
        // Webmaster Tools.
        score: binary(isNonBlank(siteVerification.google)),
        weight: 2,
        detail: isNonBlank(siteVerification.google)
          ? "Google can confirm you own this site in Search Console"
          : "Not proof of ranking — just lets Google Search Console confirm you own this site",
      },
    ]),
  );

  // ── Page titles & descriptions ─────────────────────────────────────────────
  // The ten storefront routes in STATIC_SEO_ROUTES render from a template, not
  // a DB row, so they have no `metaTitle`/`metaDescription` columns to run
  // through `addCatalogEntity`'s coverage() — their values live in
  // `SiteContent.pageMeta` instead. A route whose owning feature is off is
  // filtered out first, the same guard `addCatalogEntity` applies per entity,
  // so a store with blog disabled isn't marked down for a blog title it can't
  // even reach.
  const routeFeatureEnabled: Record<string, boolean> = {
    products: productsEnabled,
    blog: blogEnabled,
    collections: collectionsEnabled,
    services: servicesEnabled,
    testimonials: testimonialsEnabled,
    events: eventsEnabled,
    videos: videosEnabled,
  };
  const applicableRoutes = STATIC_SEO_ROUTES.filter(
    (route) =>
      route.featureKey === null || routeFeatureEnabled[route.featureKey],
  );
  const pagesWithTitle = applicableRoutes.filter((route) =>
    isNonBlank(pageMeta[route.key]?.title),
  ).length;
  const pagesWithDescription = applicableRoutes.filter((route) =>
    isNonBlank(pageMeta[route.key]?.description),
  ).length;

  groups.push(
    toGroup(
      "page-listing",
      "Page titles & descriptions",
      applicableRoutes.length === 0
        ? []
        : [
            {
              ...coverage(pagesWithTitle, applicableRoutes.length, "pages"),
              key: "page-meta-title",
              label: "Pages with a custom title",
              href: "/admin/content/seo",
            },
            {
              ...coverage(
                pagesWithDescription,
                applicableRoutes.length,
                "pages",
              ),
              key: "page-meta-description",
              label: "Pages with a custom description",
              href: "/admin/content/seo",
              weight: 2,
            },
          ],
      applicableRoutes.length === 0
        ? "No storefront pages are enabled to score yet."
        : undefined,
    ),
  );

  // ── Local presence ─────────────────────────────────────────────────────────
  // Scored only when the owner opted into LocalBusiness JSON-LD. The SEO editor
  // explicitly tells online-only stores to leave this off, so scoring it as a
  // gap would contradict the app's own advice.
  if (business.localBusinessEnabled) {
    const hasHours = parseBusinessHours(business.businessHours).length > 0;
    groups.push(
      toGroup("local", "Local presence", [
        {
          key: "local-address",
          label: "Street address",
          href: "/admin/settings/general",
          score: binary(isNonBlank(business.businessAddress)),
          detail: "Emitted as PostalAddress in your LocalBusiness schema",
        },
        {
          key: "local-phone",
          label: "Phone number",
          href: "/admin/settings/general",
          score: binary(isNonBlank(business.phoneNumber)),
          detail: "Emitted as telephone in your LocalBusiness schema",
        },
        {
          key: "local-hours",
          label: "Opening hours",
          href: "/admin/settings/hours",
          score: binary(hasHours),
          detail: hasHours
            ? "Emitted as OpeningHoursSpecification"
            : "Not set — search results will not show when you're open",
        },
      ]),
    );
  } else {
    groups.push(
      toGroup(
        "local",
        "Local presence",
        [],
        "Local business results are turned off, so these checks don't apply. Turn them on in Search & AI settings if your store has a physical location.",
      ),
    );
  }

  // ── Answerability ──────────────────────────────────────────────────────────
  const answerItems: ChecklistItem[] = [
    {
      key: "faq-items",
      label: "Published FAQ answers",
      href: "/admin/content/faq",
      score: Math.min(faqPublished / FAQ_TARGET, 1),
      weight: 2,
      detail:
        faqPublished >= FAQ_TARGET
          ? `${faqPublished} published — AI answer engines quote these directly`
          : `${faqPublished} of ${FAQ_TARGET} published — AI answer engines quote these directly`,
    },
  ];
  if (blogEnabled) {
    const blogScore = blogFresh > 0 ? 1 : blogPublished > 0 ? 0.5 : 0;
    answerItems.push({
      key: "blog-freshness",
      label: "Recently published writing",
      href: "/admin/content/blog",
      score: blogScore,
      weight: 2,
      detail:
        blogFresh > 0
          ? `${blogFresh} post${blogFresh === 1 ? "" : "s"} in the last ${BLOG_FRESH_DAYS} days`
          : blogPublished > 0
            ? `Nothing published in the last ${BLOG_FRESH_DAYS} days`
            : "No published posts yet",
    });
  }
  groups.push(toGroup("answers", "Answerability", answerItems));

  // ── Catalog coverage ───────────────────────────────────────────────────────
  // Per entity, and only when its feature is on AND it has something published.
  // A store with no services shouldn't be marked down for empty service meta.
  //
  // Description carries double weight: a missing meta title falls back to the
  // site title, but a missing description gives Google nothing to quote, so it
  // writes its own snippet from whatever text it finds.
  const catalogItems: ChecklistItem[] = [];

  const addCatalogEntity = (opts: {
    enabled: boolean;
    total: number;
    withTitle: number;
    withDescription: number;
    withOgImage: number;
    keyPrefix: string;
    label: string;
    noun: string;
    href: string;
  }) => {
    if (!opts.enabled || opts.total === 0) return;
    catalogItems.push(
      {
        ...coverage(opts.withTitle, opts.total, opts.noun),
        key: `${opts.keyPrefix}-meta-title`,
        label: `${opts.label} with a meta title`,
        href: opts.href,
      },
      {
        ...coverage(opts.withDescription, opts.total, opts.noun),
        key: `${opts.keyPrefix}-meta-description`,
        label: `${opts.label} with a meta description`,
        href: opts.href,
        weight: 2,
      },
      {
        ...coverage(opts.withOgImage, opts.total, opts.noun),
        key: `${opts.keyPrefix}-og-image`,
        label: `${opts.label} with a social share image`,
        href: opts.href,
      },
    );
  };

  addCatalogEntity({
    enabled: productsEnabled,
    total: productsTotal,
    withTitle: productsWithTitle,
    withDescription: productsWithDescription,
    withOgImage: productsWithOgImage,
    keyPrefix: "products",
    label: "Products",
    noun: "products",
    href: "/admin/products",
  });
  addCatalogEntity({
    enabled: collectionsEnabled,
    total: collectionsTotal,
    withTitle: collectionsWithTitle,
    withDescription: collectionsWithDescription,
    withOgImage: collectionsWithOgImage,
    keyPrefix: "collections",
    label: "Collections",
    noun: "collections",
    href: "/admin/collections",
  });
  addCatalogEntity({
    enabled: servicesEnabled,
    total: servicesTotal,
    withTitle: servicesWithTitle,
    withDescription: servicesWithDescription,
    withOgImage: servicesWithOgImage,
    keyPrefix: "services",
    label: "Services",
    noun: "services",
    href: "/admin/services",
  });
  addCatalogEntity({
    enabled: pagesEnabled,
    total: cmsPagesTotal,
    withTitle: cmsPagesWithTitle,
    withDescription: cmsPagesWithDescription,
    withOgImage: cmsPagesWithOgImage,
    keyPrefix: "cms-pages",
    label: "Pages",
    noun: "pages",
    href: "/admin/content/pages",
  });

  groups.push(
    toGroup(
      "catalog",
      "Catalog coverage",
      catalogItems,
      catalogItems.length === 0
        ? "Nothing published yet. Publish a product, collection, service or page and its meta coverage will be scored here."
        : undefined,
    ),
  );

  // ── Image alt text ─────────────────────────────────────────────────────────
  const altItems: ChecklistItem[] = [];
  if (productImagesTotal > 0) {
    altItems.push({
      ...coverage(productImagesWithAlt, productImagesTotal, "product images"),
      key: "alt-product-images",
      label: "Product images with alt text",
      href: "/admin/products",
      weight: 2,
    });
  }
  if (galleriesEnabled && galleryImagesTotal > 0) {
    altItems.push({
      ...coverage(galleryImagesWithAlt, galleryImagesTotal, "gallery images"),
      key: "alt-gallery-images",
      label: "Gallery images with alt text",
      href: "/admin/galleries",
    });
  }
  groups.push(
    toGroup(
      "alt-text",
      "Image alt text",
      altItems,
      altItems.length === 0 ? "No images to describe yet." : undefined,
    ),
  );

  const summary = summarizeChecklist(groups.flatMap((group) => group.items));

  return { ...summary, groups };
}
