/**
 * structured-data.ts — Pure builder functions for schema.org JSON-LD objects.
 *
 * All functions are pure and tolerate missing/undefined fields by omitting
 * optional keys rather than emitting `undefined` (which JSON.stringify drops
 * anyway, but explicit omission keeps the output tidy and type-safe).
 *
 * URL helpers: always use getCanonicalBaseUrl / getCanonicalUrl from
 * ~/lib/canonical so absolute URLs reflect the correct tenant domain.
 *
 * Image URLs: images stored in MinIO/S3 are already absolute
 * (format: `https://${NEXT_PUBLIC_STORAGE_URL}/business-sites/...`).
 * For logo / ogImage fields on SiteContent they follow the same convention.
 * This module passes them through as-is; callers should not supply relative paths.
 *
 * Currency: SimplePress processes all payments in USD (hardcoded in the Stripe
 * checkout session). priceCurrency is therefore always "USD".
 */

import { getCanonicalBaseUrl, getCanonicalUrl } from "~/lib/canonical";

// ---------------------------------------------------------------------------
// Local type aliases mirroring the shape returned by tRPC / Prisma selects.
// These are intentionally loose so the builders can be called from any page
// without importing generated Prisma types.
// ---------------------------------------------------------------------------

interface CanonicalBusiness {
  subdomain: string;
  customDomain?: string | null;
  domainStatus?: string | null;
}

interface BusinessForOrganization extends CanonicalBusiness {
  name: string;
  siteContent?: {
    logoUrl?: string | null;
    socialLinks?: unknown;
  } | null;
}

interface ProductImage {
  url: string;
  altText?: string | null;
}

interface ProductVariant {
  price?: number | null;
  inventoryQty: number;
}

interface BaseInventoryUnit {
  inventoryQty: number;
  allowBackorders: boolean;
}

interface ProductForSchema {
  name: string;
  slug: string;
  description?: string | null;
  sku?: string | null;
  price: number;
  images: ProductImage[];
  averageRating?: number | null;
  reviewCount: number;
  trackInventory: boolean;
  inventoryQty: number;
  allowBackorders: boolean;
  additionalFields?: unknown;
  baseInventoryUnit?: BaseInventoryUnit | null;
  variants?: ProductVariant[];
}

interface PageForBlogPosting {
  title: string;
  slug: string;
  excerpt?: string | null;
  ogImage?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Determine schema.org availability for a product.
 * Mirrors the same logic used in the Stripe checkout route to keep them in sync.
 */
function getAvailability(product: ProductForSchema): string {
  // comingSoon products are never purchasable
  const fields = product.additionalFields as Record<string, unknown> | null;
  if (fields?.comingSoon === true) {
    return "https://schema.org/PreOrder";
  }

  // Pool-based inventory
  if (product.baseInventoryUnit) {
    const pool = product.baseInventoryUnit;
    if (!pool.allowBackorders && pool.inventoryQty <= 0) {
      return "https://schema.org/OutOfStock";
    }
    return "https://schema.org/InStock";
  }

  // Per-product / variant inventory
  if (product.trackInventory && !product.allowBackorders) {
    if (product.inventoryQty <= 0) {
      return "https://schema.org/OutOfStock";
    }
  }

  return "https://schema.org/InStock";
}

/**
 * Normalise a value that may already be an absolute URL or may be a path/key.
 * Images uploaded via the MinIO upload route are stored as full HTTPS URLs, so
 * this is mostly a safety net for any legacy relative paths.
 */
function toAbsoluteUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  // Relative paths — return undefined rather than risk a broken URL in LD+JSON.
  return undefined;
}

/**
 * Parse socialLinks JSON into an array of URL strings for sameAs.
 * The DB schema stores this as `{ instagram?: string, facebook?: string, twitter?: string, ... }`.
 */
function parseSameAs(socialLinks: unknown): string[] | undefined {
  if (!socialLinks || typeof socialLinks !== "object") return undefined;
  const links = socialLinks as Record<string, unknown>;
  const urls = Object.values(links).filter(
    (v): v is string => typeof v === "string" && v.startsWith("http"),
  );
  return urls.length > 0 ? urls : undefined;
}

// ---------------------------------------------------------------------------
// Builder: Product
// ---------------------------------------------------------------------------

/**
 * Build a schema.org Product object for a product detail page.
 *
 * Includes:
 * - name, description, sku, brand
 * - image (first product image, absolute URL)
 * - offers (Offer with price, priceCurrency, availability, url)
 * - aggregateRating — ONLY when reviewCount > 0 (Google rejects zero-review ratings)
 */
export function buildProductSchema(
  product: ProductForSchema,
  business: CanonicalBusiness & { name: string },
): Record<string, unknown> {
  const canonicalUrl = getCanonicalUrl(business, `/shop/${product.slug}`);
  const firstImage = toAbsoluteUrl(product.images[0]?.url);

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    url: canonicalUrl,
    brand: {
      "@type": "Brand",
      name: business.name,
    },
    offers: {
      "@type": "Offer",
      price: product.price.toFixed(2),
      priceCurrency: "USD",
      availability: getAvailability(product),
      url: canonicalUrl,
    },
  };

  if (product.description) {
    schema.description = product.description;
  }

  if (product.sku) {
    schema.sku = product.sku;
  }

  if (firstImage) {
    schema.image = firstImage;
  }

  // AggregateRating is only valid when reviewCount > 0
  if (
    product.reviewCount > 0 &&
    product.averageRating !== null &&
    product.averageRating !== undefined
  ) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: product.averageRating.toFixed(1),
      reviewCount: product.reviewCount,
    };
  }

  return schema;
}

// ---------------------------------------------------------------------------
// Builder: Organization
// ---------------------------------------------------------------------------

/**
 * Build a schema.org Organization object for the storefront homepage.
 *
 * Includes name, url, optional logo, and optional sameAs social URLs.
 */
export function buildOrganizationSchema(
  business: BusinessForOrganization,
): Record<string, unknown> {
  const baseUrl = getCanonicalBaseUrl(business);

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: business.name,
    url: baseUrl,
  };

  const logoUrl = toAbsoluteUrl(business.siteContent?.logoUrl);
  if (logoUrl) {
    schema.logo = logoUrl;
  }

  const sameAs = parseSameAs(business.siteContent?.socialLinks);
  if (sameAs) {
    schema.sameAs = sameAs;
  }

  return schema;
}

// ---------------------------------------------------------------------------
// Builder: WebSite
// ---------------------------------------------------------------------------

/**
 * Build a schema.org WebSite object for the storefront homepage.
 *
 * SearchAction is intentionally omitted — SimplePress has no storefront search
 * URL yet. It can be added once a search route exists.
 */
export function buildWebSiteSchema(
  business: CanonicalBusiness & { name: string },
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: business.name,
    url: getCanonicalBaseUrl(business),
  };
}

// ---------------------------------------------------------------------------
// Builder: BreadcrumbList
// ---------------------------------------------------------------------------

export interface BreadcrumbItem {
  name: string;
  /** Path starting with "/" — e.g. "/shop/my-product". Pass "" for the homepage. */
  path: string;
}

/**
 * Build a schema.org BreadcrumbList from an ordered array of items.
 *
 * Example input:
 *   [{ name: "Home", path: "/" }, { name: "Shop", path: "/shop" }, { name: "Product", path: "/shop/my-product" }]
 */
export function buildBreadcrumbSchema(
  business: CanonicalBusiness,
  items: BreadcrumbItem[],
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: getCanonicalUrl(business, item.path || "/"),
    })),
  };
}

// ---------------------------------------------------------------------------
// Builder: BlogPosting
// ---------------------------------------------------------------------------

/**
 * Build a schema.org BlogPosting object for a blog post detail page.
 *
 * Includes headline, description, image, datePublished/dateModified,
 * author (Organization), and mainEntityOfPage.
 */
export function buildBlogPostingSchema(
  page: PageForBlogPosting,
  business: CanonicalBusiness & { name: string },
): Record<string, unknown> {
  const canonicalUrl = getCanonicalUrl(business, `/blog/${page.slug}`);

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: page.title,
    datePublished: page.createdAt.toISOString(),
    dateModified: page.updatedAt.toISOString(),
    author: {
      "@type": "Organization",
      name: business.name,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": canonicalUrl,
    },
    url: canonicalUrl,
  };

  if (page.excerpt) {
    schema.description = page.excerpt;
  }

  const image = toAbsoluteUrl(page.ogImage);
  if (image) {
    schema.image = image;
  }

  return schema;
}
