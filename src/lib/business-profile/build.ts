/**
 * Pure builder for the `simplepress.business-profile/v1` payload
 * (`GET /api/v1/business-profile`). No database, no `next/*`, no env: the
 * loader (`./load.ts`) does the Prisma reads and hands a `BusinessProfileSource`
 * in; this shapes it into the wire contract so it can be unit-tested.
 *
 * PUBLIC DATA ONLY. Every output object below is built field by field from an
 * explicit allowlist — never spread a source row into the output. The source
 * carries stock quantities only so `inStock` can be computed; they must never
 * reach the result (see build.test.ts, which greps the JSON for them).
 *
 * Visibility mirrors the storefront:
 *   - feature flags via `resolveFlags` + `routeEnabled` (the same gates the
 *     storefront routes and site search use): `/shop` → products,
 *     `/collections` → collections (which depends on products), `/services` →
 *     services. FAQs have no flag. Ratings need `reviews`, option group names
 *     need `productOptions`.
 *   - published rows only (a scheduled product stays `published: false` until
 *     the cron flips it, so it is excluded too).
 *   - `inStock` uses `canCheckoutOne` — the checkout authority's "would ONE
 *     unit be accepted right now" (reserved stock, pools, backorders,
 *     coming-soon).
 */
import type { BusinessProfileV1 } from "./types";
import { canCheckoutOne } from "~/lib/back-in-stock/purchasable";
import { extractTiptapLikeText } from "~/lib/blog-search";
import { parseBusinessHours } from "~/lib/business-hours";
import { resolveFlags } from "~/lib/features/resolve-flags";
import { routeEnabled } from "~/lib/features/route-flags";
import {
  formatPrice,
  getEffectiveCompareAtPrice,
  getEffectivePrice,
} from "~/lib/prices";
import { productDescriptionToPlainText } from "~/lib/product-description";
import { safeHref } from "~/lib/safe-href";
import {
  GOOGLE_BUSINESS_PROFILE_KEY,
  resolveSocialLinks,
} from "~/lib/social-links";
import { resolveVariantPrice } from "~/lib/variant-price";

import {
  ABOUT_MAX_CHARS,
  BUSINESS_PROFILE_SCHEMA,
  DESCRIPTION_MAX_CHARS,
  MAX_PRODUCTS,
} from "./types";

// ─── Source shape (what the loader selects) ──────────────────────────────────

export type BusinessProfileSourceProduct = {
  name: string;
  slug: string;
  published: boolean;
  /** Integer cents (stored as Float). */
  price: number;
  compareAtPrice: number | null;
  excerpt: string | null;
  description: string | null;
  additionalFields: unknown;
  averageRating: number | null;
  reviewCount: number;
  /** First photo (never a video) in gallery order. */
  imageUrl: string | null;
  collections: Array<{ name: string; published: boolean }>;
  /** Attached product-customizer option group names, in display order. */
  optionGroupNames: string[];
  // Stock inputs — used ONLY to compute inStock; never emitted.
  trackInventory: boolean;
  allowBackorders: boolean;
  inventoryQty: number;
  reservedQty: number;
  baseInventoryUnitId: string | null;
  baseUnitsConsumed: number | null;
  baseInventoryUnit: {
    inventoryQty: number;
    reservedQty: number;
    allowBackorders: boolean;
  } | null;
  variants: Array<{
    /** Internal only (the stock predicate's shape) — never emitted. */
    id: string;
    name: string;
    price: number | null;
    compareAtPrice: number | null;
    inventoryQty: number;
    reservedQty: number;
  }>;
};

export type BusinessProfileSource = {
  /** Canonical storefront origin from `getBusinessUrl`, no trailing slash. */
  baseUrl: string;
  business: {
    name: string;
    businessType: string | null;
    businessAddress: string | null;
    addressStreet: string | null;
    addressCity: string | null;
    addressState: string | null;
    addressPostalCode: string | null;
    latitude: number | null;
    longitude: number | null;
    localPresence: string;
    areaServed: string[];
    businessHours: unknown;
    timeZone: string;
    phoneNumber: string | null;
    supportEmail: string | null;
    featureFlags: unknown;
  };
  siteContent: {
    aboutText: string | null;
    metaDescription: string | null;
    socialLinks: unknown;
  } | null;
  /** Published products in catalog order, already capped by the loader. */
  products: BusinessProfileSourceProduct[];
  /** Total published products before any cap (null → count `products`). */
  productTotal: number | null;
  collections: Array<{
    name: string;
    slug: string;
    description: string | null;
    published: boolean;
    /** Published products in the collection. */
    productCount: number;
  }>;
  services: Array<{
    name: string;
    slug: string;
    description: string | null;
    published: boolean;
    items: Array<{
      name: string;
      description: string | null;
      priceLabel: string | null;
      durationLabel: string | null;
      published: boolean;
    }>;
  }>;
  faqs: Array<{ question: string; answer: string; published: boolean }>;
};

// ─── Text helpers ────────────────────────────────────────────────────────────

/**
 * Rich text → one line of plain text. Most fields are plain strings that may
 * carry a little imported HTML (`productDescriptionToPlainText` strips tags +
 * decodes entities); a string-encoded TipTap doc is flattened with the
 * blog-search walker instead.
 */
export function toPlainText(raw: string | null | undefined): string {
  if (!raw) return "";
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("{")) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (
        parsed &&
        typeof parsed === "object" &&
        (parsed as { type?: unknown }).type === "doc"
      ) {
        return productDescriptionToPlainText(extractTiptapLikeText(parsed));
      }
    } catch {
      // Not JSON — treat as text below.
    }
  }
  return productDescriptionToPlainText(trimmed);
}

/** Cap `text` at `max` characters (ellipsis included), preferring a word break. */
export function clipText(text: string, max: number): string {
  if (text.length <= max) return text;
  const hard = text.slice(0, max - 1);
  const lastSpace = hard.lastIndexOf(" ");
  const cut = lastSpace >= max * 0.8 ? hard.slice(0, lastSpace) : hard;
  return `${cut.trimEnd()}…`;
}

function plainOrNull(
  raw: string | null | undefined,
  max: number,
): string | null {
  const text = toPlainText(raw);
  return text ? clipText(text, max) : null;
}

function trimOrNull(value: string | null | undefined): string | null {
  const t = value?.trim();
  return t?.length ? t : null;
}

/** Absolute http(s) URL, or a site-relative path resolved against the store. */
function absoluteUrl(
  url: string | null | undefined,
  baseUrl: string,
): string | null {
  const t = url?.trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) return t;
  if (t.startsWith("/") && !t.startsWith("//")) return `${baseUrl}${t}`;
  return null;
}

const cents = (value: number): number => Math.round(value);

// ─── Business ────────────────────────────────────────────────────────────────

const BUSINESS_TYPES = [
  "products",
  "services",
  "informational",
  "donations",
] as const;
const LOCAL_PRESENCE = ["none", "service_area", "storefront"] as const;

function buildSocialLinks(raw: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  for (const link of resolveSocialLinks(raw)) {
    if (/^https:\/\//i.test(link.url)) out[link.key] = link.url;
  }
  // SEO-only Google Business Profile link (not an icon network).
  if (raw && typeof raw === "object") {
    const gbp = safeHref(
      (raw as Record<string, unknown>)[GOOGLE_BUSINESS_PROFILE_KEY],
    );
    if (gbp && /^https:\/\//i.test(gbp)) out[GOOGLE_BUSINESS_PROFILE_KEY] = gbp;
  }
  return out;
}

function buildBusiness(
  source: BusinessProfileSource,
): BusinessProfileV1["business"] {
  const b = source.business;

  const street = trimOrNull(b.addressStreet);
  const city = trimOrNull(b.addressCity);
  const state = trimOrNull(b.addressState);
  const postalCode = trimOrNull(b.addressPostalCode);
  const display = trimOrNull(b.businessAddress);
  const address =
    street || city || state || postalCode || display
      ? { street, city, state, postalCode, country: "US" as const, display }
      : null;

  const geo =
    typeof b.latitude === "number" &&
    Number.isFinite(b.latitude) &&
    typeof b.longitude === "number" &&
    Number.isFinite(b.longitude)
      ? { lat: b.latitude, lng: b.longitude }
      : null;

  const businessType = (BUSINESS_TYPES as readonly string[]).includes(
    b.businessType ?? "",
  )
    ? (b.businessType as (typeof BUSINESS_TYPES)[number])
    : null;
  const localPresence = (LOCAL_PRESENCE as readonly string[]).includes(
    b.localPresence,
  )
    ? (b.localPresence as (typeof LOCAL_PRESENCE)[number])
    : "none";

  const about =
    plainOrNull(source.siteContent?.aboutText, ABOUT_MAX_CHARS) ??
    plainOrNull(source.siteContent?.metaDescription, ABOUT_MAX_CHARS);

  return {
    name: b.name,
    about,
    url: source.baseUrl,
    businessType,
    address,
    geo,
    localPresence,
    areaServed: b.areaServed.map((a) => a.trim()).filter(Boolean),
    hours: parseBusinessHours(b.businessHours).map((row) => ({
      days: [...row.days],
      closed: row.closed,
      open: row.open,
      close: row.close,
    })),
    timeZone: b.timeZone,
    phone: trimOrNull(b.phoneNumber),
    email: trimOrNull(b.supportEmail),
    socialLinks: buildSocialLinks(source.siteContent?.socialLinks),
  };
}

// ─── Catalog ─────────────────────────────────────────────────────────────────

type Gates = {
  products: boolean;
  collections: boolean;
  services: boolean;
  reviews: boolean;
  productOptions: boolean;
};

function buildProduct(
  p: BusinessProfileSourceProduct,
  baseUrl: string,
  gates: Gates,
): BusinessProfileV1["products"][number] {
  const price = cents(getEffectivePrice(p));
  const rawCompare = getEffectiveCompareAtPrice(p);
  const compareAtPrice =
    rawCompare != null && rawCompare > 0 && cents(rawCompare) > price
      ? cents(rawCompare)
      : null;

  const stockProduct = {
    published: p.published,
    additionalFields: p.additionalFields,
    trackInventory: p.trackInventory,
    allowBackorders: p.allowBackorders,
    inventoryQty: p.inventoryQty,
    reservedQty: p.reservedQty,
    baseInventoryUnitId: p.baseInventoryUnitId,
    baseUnitsConsumed: p.baseUnitsConsumed,
    baseInventoryUnit: p.baseInventoryUnit,
    variants: p.variants.map((v) => ({
      id: v.id,
      inventoryQty: v.inventoryQty,
      reservedQty: v.reservedQty,
    })),
  };

  const variants = p.variants.map((v, i) => {
    const variantPrice = cents(resolveVariantPrice(v.price, p.price));
    return {
      name: v.name,
      price: variantPrice,
      priceFormatted: formatPrice(variantPrice),
      inStock: canCheckoutOne(stockProduct, stockProduct.variants[i]!),
    };
  });

  const description =
    plainOrNull(p.excerpt, DESCRIPTION_MAX_CHARS) ??
    plainOrNull(p.description, DESCRIPTION_MAX_CHARS);

  const collections = gates.collections
    ? [
        ...new Set(
          p.collections
            .filter((c) => c.published)
            .map((c) => c.name.trim())
            .filter(Boolean),
        ),
      ]
    : [];

  const options = gates.productOptions
    ? [...new Set(p.optionGroupNames.map((n) => n.trim()).filter(Boolean))]
    : [];

  const hasRating =
    gates.reviews &&
    p.reviewCount > 0 &&
    p.averageRating != null &&
    Number.isFinite(p.averageRating);

  return {
    name: p.name,
    url: `${baseUrl}/shop/${p.slug}`,
    price,
    priceFormatted: formatPrice(price),
    compareAtPrice,
    currency: "USD",
    description,
    imageUrl: absoluteUrl(p.imageUrl, baseUrl),
    collections,
    options,
    variants,
    inStock: canCheckoutOne(stockProduct, null),
    averageRating: hasRating ? Math.round(p.averageRating! * 10) / 10 : null,
    reviewCount: gates.reviews ? p.reviewCount : 0,
  };
}

function buildServices(
  source: BusinessProfileSource,
): BusinessProfileV1["services"] {
  const out: BusinessProfileV1["services"] = [];
  for (const service of source.services) {
    if (!service.published) continue;
    const url = `${source.baseUrl}/services/${service.slug}`;
    const items = service.items.filter((i) => i.published);
    if (items.length === 0) {
      // A published service with no published items still describes an offer.
      out.push({
        name: service.name,
        category: null,
        priceLabel: null,
        durationLabel: null,
        description: plainOrNull(service.description, DESCRIPTION_MAX_CHARS),
        url,
      });
      continue;
    }
    // Items have no page of their own — they render on the parent service's
    // page, so they link there and are grouped under its name.
    for (const item of items) {
      out.push({
        name: item.name,
        category: service.name,
        priceLabel: trimOrNull(item.priceLabel),
        durationLabel: trimOrNull(item.durationLabel),
        description: plainOrNull(item.description, DESCRIPTION_MAX_CHARS),
        url,
      });
    }
  }
  return out;
}

// ─── Entry point ─────────────────────────────────────────────────────────────

export function buildBusinessProfile(
  source: BusinessProfileSource,
  opts: { now: Date },
): BusinessProfileV1 {
  const { isEnabled } = resolveFlags(source.business.featureFlags);
  const productsOn = routeEnabled("/shop", isEnabled);
  const gates: Gates = {
    products: productsOn,
    collections: productsOn && routeEnabled("/collections", isEnabled),
    services: routeEnabled("/services", isEnabled),
    reviews: productsOn && isEnabled("reviews"),
    productOptions: productsOn && isEnabled("productOptions"),
  };

  const publishedProducts = gates.products
    ? source.products.filter((p) => p.published)
    : [];
  const productTotal = gates.products
    ? Math.max(source.productTotal ?? 0, publishedProducts.length)
    : 0;
  const products = publishedProducts
    .slice(0, MAX_PRODUCTS)
    .map((p) => buildProduct(p, source.baseUrl, gates));

  const collections = gates.collections
    ? source.collections
        .filter((c) => c.published)
        .map((c) => ({
          name: c.name,
          description: plainOrNull(c.description, DESCRIPTION_MAX_CHARS),
          url: `${source.baseUrl}/collections/${c.slug}`,
          productCount: c.productCount,
        }))
    : [];

  const services = gates.services ? buildServices(source) : [];

  const faqs = source.faqs
    .filter((f) => f.published)
    .map((f) => ({
      question: toPlainText(f.question),
      answer: toPlainText(f.answer),
    }))
    .filter((f) => f.question && f.answer);

  return {
    schema: BUSINESS_PROFILE_SCHEMA,
    generatedAt: opts.now.toISOString(),
    truncated: productTotal > products.length,
    business: buildBusiness(source),
    products,
    collections,
    services,
    faqs,
    counts: {
      products: productTotal,
      collections: collections.length,
      services: services.length,
      faqs: faqs.length,
    },
  };
}
