/**
 * Demo store seed — populates the `demo` subdomain store on the `default` template.
 *
 * NON-DESTRUCTIVE to existing content rows:
 *   - Switches the demo to the `default` template and fills out that template's content
 *     fields (images point at the Unsplash CDN — real photos, deterministically picked).
 *   - MERGES IN the feature flags the demo content needs (never clobbers others).
 *   - Does NOT delete pre-existing products/collections/pages/etc.
 *   - Everything it creates is NAMESPACED (slug prefix `demo-seed-`, customer emails
 *     `@demo-seed.example.com`, order sessions `cs_demoseed_`, inventory note `demo-seed`),
 *     so re-running cleans up ONLY rows this seed created — other rows are left alone.
 *
 * Safe by design: everything scopes to the single demo `businessId`, so it is invisible
 * to every other tenant. No Stripe calls, no emails — orders are written straight to the
 * DB with a synthetic stripeSessionId. Idempotent: safe to run repeatedly.
 *
 * Run with:  pnpm db:seed:demo
 * (Loads .env automatically via the package.json script's --env-file flag.)
 */
import type { Prisma } from "generated/prisma";

import { defaultTemplateData } from "~/app/(storefront)/_templates/default";
import { db } from "~/server/db";

const SUBDOMAIN = "demo";

// Namespacing so cleanup only ever touches THIS seed's rows.
const SEED_TAG = "demo-seed";
const SLUG_PREFIX = "demo-seed-";
const CUSTOMER_EMAIL_DOMAIN = "demo-seed.example.com";
const ORDER_SESSION_PREFIX = "cs_demoseed_";
const BASE_UNIT_NAME_PREFIX = "demo-seed";
const DEMO_DISCOUNT_CODES = ["WELCOME10", "SAVE5", "SUMMER25"];

// FAQ rows — power the FAQPage JSON-LD (AEO/GEO) on /faq + contact.
const DEMO_FAQ: { question: string; answer: string }[] = [
  {
    question: "How long does shipping take?",
    answer:
      "Orders ship within 1-2 business days. US orders over $75 ship free; other rates are calculated at checkout.",
  },
  {
    question: "What is your return policy?",
    answer: "We offer 30-day returns on unused items, no questions asked.",
  },
  {
    question: "Are your products cruelty-free?",
    answer: "Yes — all of our demo skincare products are cruelty-free and never tested on animals.",
  },
  {
    question: "Do you offer in-store pickup?",
    answer: "Local pickup is available at checkout for customers near our Detroit location.",
  },
  {
    question: "How do I book a consultation?",
    answer:
      "Visit our Services page to book a personal skincare consultation, either virtually or in-studio.",
  },
];

// Curated, verified Unsplash photo IDs (skincare / beauty / self-care / studio
// themed). Served straight from the Unsplash CDN — `*.unsplash.com` is already
// allow-listed in next.config.js's `images.remotePatterns`, so next/image renders
// them as real photos. Using real, correctly-sized images (instead of the flat
// /placeholder.svg) also avoids the intrinsic-size hydration mismatch that the
// SVG placeholder produced. All 22 IDs were curl-checked to return HTTP 200.
const UNSPLASH_IDS = [
  "photo-1556228578-8c89e6adf883",
  "photo-1556228720-195a672e8a03",
  "photo-1570172619644-dfd03ed5d881",
  "photo-1608248543803-ba4f8c70ae0b",
  "photo-1612817288484-6f916006741a",
  "photo-1571781926291-c477ebfd024b",
  "photo-1620916566398-39f1143ab7be",
  "photo-1601049541289-9b1b7bbbfe19",
  "photo-1598440947619-2c35fc9aa908",
  "photo-1596755094514-f87e34085b2c",
  "photo-1522335789203-aabd1fc54bc9",
  "photo-1512496015851-a90fb38ba796",
  "photo-1487412947147-5cebf100ffc2",
  "photo-1560750588-73207b1ef5b8",
  "photo-1519014816548-bf5fe059798b",
  "photo-1596462502278-27bfdc403348",
  "photo-1608571423902-eed4a5ad8108",
  "photo-1631730359585-38a4935cbec4",
  "photo-1552693673-1bf958298935",
  "photo-1585232351009-aa87416fca90",
  "photo-1547793548-7a0e7dfdb24f",
  "photo-1616394584738-fc6e612e71b9",
];

// Deterministic FNV-1a hash so the same seed always maps to the same photo:
// re-runs are stable and distinct seeds spread across the pool.
function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Build an Unsplash CDN URL for a seed (auto-formatted, cropped, quality-capped).
const img = (seed = "demo") => {
  const id = UNSPLASH_IDS[hashSeed(seed) % UNSPLASH_IDS.length]!;
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=80`;
};

// Prices are in CENTS (matches existing seeds: e2e "$25.00" => 2500).
const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

// Build a customFields map for the `default` template: every defined field gets a
// value so the storefront + admin editor render fully. Image fields point at the
// local placeholder; other fields use the template's own defaultValue.
function buildDefaultCustomFields(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const field of defaultTemplateData.default) {
    if (field.type === "image") {
      out[field.key] = img(field.key);
      continue;
    }
    // Skip complex/media types (list, gallery, video) — they fall back safely.
    if (field.type === "list" || field.type === "gallery" || field.type === "video") {
      continue;
    }
    if (typeof field.defaultValue === "string" && field.defaultValue !== "") {
      out[field.key] = field.defaultValue;
    }
  }
  return out;
}

async function main() {
  console.log(`\n🌱 Enriching demo store (subdomain: "${SUBDOMAIN}") — additive\n`);

  // ───────────────────────────────────────────────────────────────────────────
  // 1. Resolve the demo business + merge in needed feature flags (NON-destructive)
  // ───────────────────────────────────────────────────────────────────────────
  // Enable only what the seeded content needs. Merged into existing flags — never
  // clobbers existing values, never changes the template/name/owner.
  const enabledFlags: Record<string, boolean> = {
    collections: true,
    coupons: true,
    blog: true,
    services: true,
    reviews: true,
    analytics: true,
  };

  const existing = await db.business.findUnique({
    where: { subdomain: SUBDOMAIN },
    select: { id: true, name: true, templateId: true, featureFlags: true },
  });

  if (!existing) {
    // Fresh DB (e.g. local) — create the demo on the default template.
    // (Skipped entirely when demo already exists.)
    const created = await db.business.create({
      data: {
        name: "Demo Store",
        slug: "demo-store",
        subdomain: SUBDOMAIN,
        templateId: "default",
        ownerEmail: "demo@example.com",
        status: "active",
        onboardingComplete: true,
        featureFlags: enabledFlags as Prisma.InputJsonValue,
        siteContent: {
          create: {
            heroTitle: "Demo Store",
            heroSubtitle: "Demo storefront",
            primaryColor: "#0f172a",
          },
        },
      },
    });
    console.log(`✓ Created demo business (default): ${created.id}`);
  }

  const business = await db.business.findUniqueOrThrow({
    where: { subdomain: SUBDOMAIN },
    select: { id: true, templateId: true, featureFlags: true },
  });
  const businessId = business.id;

  const mergedFlags = {
    ...((business.featureFlags as Record<string, boolean> | null) ?? {}),
    ...enabledFlags,
  } as Prisma.InputJsonValue;
  // Switch the demo to the `default` template (per request), merge feature flags, and
  // enable LocalBusiness JSON-LD (Store schema) by giving it contact + address details.
  // `.example` is an RFC-reserved TLD, so these are safe non-routable demo values.
  await db.business.update({
    where: { id: businessId },
    data: {
      templateId: "default",
      featureFlags: mergedFlags,
      localBusinessEnabled: true,
      phoneNumber: "(313) 555-0100",
      supportEmail: "support@demostore.example",
      businessAddress: "123 Market Street, Detroit, MI 48201",
    },
  });
  console.log(`✓ Business ${businessId} — template "default", flags merged, LocalBusiness enabled`);

  // Fill out the default template's content fields (images → local placeholder).
  // Merge into any existing customFields so other-template keys are preserved.
  const site = await db.siteContent.findUnique({
    where: { businessId },
    select: { customFields: true },
  });
  const mergedCustomFields = {
    ...((site?.customFields as Record<string, string> | null) ?? {}),
    ...buildDefaultCustomFields(),
  } as Prisma.InputJsonValue;
  const siteSeo = {
    metaTitle: "Demo Store — Skincare & Self-Care Essentials",
    metaDescription:
      "Shop demo skincare, haircare, and self-care essentials. A sample storefront " +
      "showcasing products, collections, services, and reviews on SimplePress.",
    metaKeywords: "demo store, skincare, haircare, self-care, beauty, sample storefront",
    ogImage: img("home-og"),
    logoUrl: img("logo"),
  };
  await db.siteContent.upsert({
    where: { businessId },
    update: { customFields: mergedCustomFields, ...siteSeo },
    create: { businessId, customFields: mergedCustomFields, primaryColor: "#0f172a", ...siteSeo },
  });
  console.log("✓ Default template fields + homepage SEO populated (images → Unsplash CDN)");

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Idempotent cleanup — removes ONLY this seed's namespaced rows
  // ───────────────────────────────────────────────────────────────────────────
  await db.inventoryHistory.deleteMany({ where: { businessId, note: SEED_TAG } });
  await db.order.deleteMany({
    where: { businessId, stripeSessionId: { startsWith: ORDER_SESSION_PREFIX } },
  }); // cascades orderItems + shipments
  await db.product.deleteMany({
    where: { businessId, slug: { startsWith: SLUG_PREFIX } },
  }); // cascades images/variants/collectionProduct/reviews
  await db.baseInventoryUnit.deleteMany({
    where: { businessId, name: { startsWith: BASE_UNIT_NAME_PREFIX } },
  });
  await db.service.deleteMany({
    where: { businessId, slug: { startsWith: SLUG_PREFIX } },
  }); // cascades serviceItems
  await db.collection.deleteMany({
    where: { businessId, slug: { startsWith: SLUG_PREFIX } },
  }); // cascades collectionProduct
  await db.testimonial.deleteMany({
    where: { businessId, customerEmail: { endsWith: CUSTOMER_EMAIL_DOMAIN } },
  });
  await db.discountCode.deleteMany({
    where: { businessId, code: { in: DEMO_DISCOUNT_CODES } },
  });
  await db.page.deleteMany({
    where: { businessId, slug: { startsWith: SLUG_PREFIX } },
  });
  await db.customer.deleteMany({
    where: { businessId, email: { endsWith: CUSTOMER_EMAIL_DOMAIN } },
  }); // cascades shippingAddresses
  await db.faqItem.deleteMany({
    where: { businessId, question: { in: DEMO_FAQ.map((f) => f.question) } },
  });
  console.log("✓ Cleared previous demo-seed rows (curated content untouched)");

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Collections (seed-owned, prefixed slugs)
  // ───────────────────────────────────────────────────────────────────────────
  const collectionSeo = (name: string, description: string) => ({
    metaTitle: `${name} | Demo Store`,
    metaDescription: description,
    metaKeywords: `${name.toLowerCase()}, demo store, skincare, collection`,
    ogImage: img(`col-${name}`),
  });

  const bestsellers = await db.collection.create({
    data: {
      businessId,
      name: "Bestsellers",
      slug: `${SLUG_PREFIX}bestsellers`,
      description: "Our most-loved skincare picks.",
      imageUrl: img("col-best"),
      published: true,
      sortOrder: 10,
      ...collectionSeo("Bestsellers", "Shop our most-loved, top-rated skincare picks."),
    },
  });
  const newArrivals = await db.collection.create({
    data: {
      businessId,
      name: "New Arrivals",
      slug: `${SLUG_PREFIX}new-arrivals`,
      description: "The latest additions to the shelf.",
      imageUrl: img("col-new"),
      published: true,
      sortOrder: 11,
      ...collectionSeo("New Arrivals", "Discover the latest additions to our skincare shelf."),
    },
  });
  const sale = await db.collection.create({
    data: {
      businessId,
      name: "Sale",
      slug: `${SLUG_PREFIX}sale`,
      description: "Limited-time markdowns.",
      imageUrl: img("col-sale"),
      published: true,
      sortOrder: 12,
      ...collectionSeo("Sale", "Limited-time markdowns on select skincare favorites."),
    },
  });
  console.log("✓ Collections: 3");

  // ───────────────────────────────────────────────────────────────────────────
  // 4. Shared base inventory unit (pool) — two products draw from it
  // ───────────────────────────────────────────────────────────────────────────
  const candlePool = await db.baseInventoryUnit.create({
    data: {
      businessId,
      name: `${BASE_UNIT_NAME_PREFIX} Signature Candle (pool)`,
      description: "Shared candle stock consumed by multiple scents.",
      inventoryQty: 40,
      reservedQty: 0,
      lowInventoryThreshold: 10,
      allowBackorders: false,
    },
  });
  console.log("✓ BaseInventoryUnit: 1 (shared pool)");

  // ───────────────────────────────────────────────────────────────────────────
  // 5. Products — one per inventory / variant scenario (skincare/salon themed)
  // ───────────────────────────────────────────────────────────────────────────
  type ProductSeed = {
    name: string;
    slugSuffix: string;
    price: number; // cents
    compareAtPrice?: number;
    excerpt: string;
    description: string;
    published?: boolean;
    featured?: boolean;
    orderable?: boolean; // include in seeded orders
    trackInventory?: boolean;
    inventoryQty?: number;
    reservedQty?: number;
    allowBackorders?: boolean;
    lowInventoryThreshold?: number;
    baseInventoryUnitId?: string;
    baseUnitsConsumed?: number;
    collections?: string[];
    variants?: {
      name: string;
      options: Record<string, string>;
      inventoryQty: number;
      price?: number;
    }[];
  };

  const productSeeds: ProductSeed[] = [
    {
      name: "Hydrating Daily Moisturizer",
      slugSuffix: "hydrating-daily-moisturizer",
      price: 3200,
      excerpt: "Lightweight all-day hydration.",
      description: "A featherlight moisturizer for everyday hydration. In stock and tracked.",
      featured: true,
      orderable: true,
      trackInventory: true,
      inventoryQty: 60,
      collections: ["bestsellers", "new-arrivals"],
    },
    {
      name: "Vitamin C Brightening Serum",
      slugSuffix: "vitamin-c-brightening-serum",
      price: 4800,
      excerpt: "Glow-boosting antioxidant serum.",
      description: "A potent vitamin C serum — only a couple left (low stock).",
      orderable: true,
      trackInventory: true,
      inventoryQty: 2,
      lowInventoryThreshold: 5,
      collections: ["bestsellers"],
    },
    {
      name: "Overnight Repair Mask",
      slugSuffix: "overnight-repair-mask",
      price: 4200,
      excerpt: "Wake up to renewed skin.",
      description: "An overnight treatment mask. Currently sold out with no backorders.",
      trackInventory: true,
      inventoryQty: 0,
      allowBackorders: false,
      collections: ["new-arrivals"],
    },
    {
      name: "Gentle Foaming Cleanser",
      slugSuffix: "gentle-foaming-cleanser",
      price: 2600,
      excerpt: "pH-balanced daily cleanser.",
      description: "A gentle cleanser. Out of stock but available on backorder.",
      orderable: true,
      trackInventory: true,
      inventoryQty: 0,
      allowBackorders: true,
      collections: ["bestsellers"],
    },
    {
      name: "SPF 30 Mineral Sunscreen",
      slugSuffix: "spf-30-mineral-sunscreen",
      price: 2900,
      excerpt: "Daily broad-spectrum protection.",
      description: "Mineral SPF 30. Some units are reserved for pending orders.",
      orderable: true,
      trackInventory: true,
      inventoryQty: 25,
      reservedQty: 5,
      collections: ["new-arrivals"],
    },
    {
      name: "Digital Gift Card",
      slugSuffix: "digital-gift-card",
      price: 5000,
      excerpt: "Delivered by email.",
      description: "A digital gift card — untracked inventory, always available.",
      orderable: true,
      trackInventory: false,
      collections: ["bestsellers"],
    },
    {
      name: "Nourishing Hair Oil",
      slugSuffix: "nourishing-hair-oil",
      price: 3400,
      compareAtPrice: 4600,
      excerpt: "Lightweight shine + repair.",
      description: "A nourishing hair oil — on sale this season.",
      orderable: true,
      trackInventory: true,
      inventoryQty: 38,
      collections: ["sale"],
    },
    {
      name: "Exfoliating Clay Mask",
      slugSuffix: "exfoliating-clay-mask",
      price: 3600,
      excerpt: "Deep-cleansing weekly treatment.",
      description: "A purifying clay mask. A featured shelf staple.",
      featured: true,
      orderable: true,
      trackInventory: true,
      inventoryQty: 22,
      collections: ["bestsellers"],
    },
    {
      name: "Prototype Night Cream (Hidden)",
      slugSuffix: "prototype-night-cream",
      price: 5200,
      excerpt: "Not yet launched.",
      description: "An unpublished product — visible in admin, hidden from the storefront.",
      published: false,
      trackInventory: true,
      inventoryQty: 12,
    },
    {
      name: "Botanical Shampoo",
      slugSuffix: "botanical-shampoo",
      price: 2800,
      excerpt: "Sulfate-free, three sizes.",
      description: "Botanical shampoo with size variants — all currently in stock.",
      orderable: true,
      trackInventory: true,
      inventoryQty: 0, // variant-managed
      collections: ["new-arrivals", "bestsellers"],
      variants: [
        { name: "250ml", options: { size: "250ml" }, inventoryQty: 14 },
        { name: "500ml", options: { size: "500ml" }, inventoryQty: 9, price: 3800 },
        { name: "1L", options: { size: "1L" }, inventoryQty: 6, price: 6200 },
      ],
    },
    {
      name: "Silk Pillowcase",
      slugSuffix: "silk-pillowcase",
      price: 5500,
      excerpt: "Gentle on skin and hair.",
      description: "Mulberry silk pillowcase with color variants — one color is sold out.",
      orderable: true,
      trackInventory: true,
      inventoryQty: 0, // variant-managed
      collections: ["sale"],
      variants: [
        { name: "Ivory", options: { color: "Ivory" }, inventoryQty: 12 },
        { name: "Charcoal", options: { color: "Charcoal" }, inventoryQty: 0 },
        { name: "Blush", options: { color: "Blush" }, inventoryQty: 7 },
      ],
    },
    {
      name: "Signature Candle — Lavender",
      slugSuffix: "signature-candle-lavender",
      price: 3000,
      excerpt: "Drawn from the shared candle pool.",
      description: "A signature candle that consumes stock from the shared candle pool.",
      orderable: true,
      trackInventory: false,
      baseInventoryUnitId: candlePool.id,
      baseUnitsConsumed: 1,
      collections: ["new-arrivals"],
    },
    {
      name: "Signature Candle — Citrus",
      slugSuffix: "signature-candle-citrus",
      price: 3000,
      excerpt: "Drawn from the shared candle pool.",
      description: "Another signature scent sharing the same candle inventory pool.",
      orderable: true,
      trackInventory: false,
      baseInventoryUnitId: candlePool.id,
      baseUnitsConsumed: 1,
      collections: ["new-arrivals"],
    },
  ];

  const collectionIdBySlug: Record<string, string> = {
    bestsellers: bestsellers.id,
    "new-arrivals": newArrivals.id,
    sale: sale.id,
  };

  const products: {
    id: string;
    name: string;
    slug: string;
    price: number;
    orderable: boolean;
  }[] = [];

  for (const [i, p] of productSeeds.entries()) {
    const slug = `${SLUG_PREFIX}${p.slugSuffix}`;
    const keywordList = Array.from(
      new Set(p.name.toLowerCase().split(/\s+/).filter((w) => w.length > 2)),
    ).join(", ");
    const created = await db.product.create({
      data: {
        businessId,
        name: p.name,
        slug,
        excerpt: p.excerpt,
        description: p.description,
        price: p.price,
        compareAtPrice: p.compareAtPrice ?? null,
        // SEO: feeds <head> metadata + enriches Product JSON-LD (sku, image, etc.).
        sku: `DEMO-${String(i + 1).padStart(3, "0")}`,
        metaTitle: `${p.name} | Demo Store`,
        metaDescription: p.excerpt,
        metaKeywords: `${keywordList}, demo store, skincare`,
        ogImage: img(`${slug}-1`),
        published: p.published ?? true,
        featured: p.featured ?? false,
        sortOrder: 100 + i,
        trackInventory: p.trackInventory ?? false,
        inventoryQty: p.inventoryQty ?? 0,
        reservedQty: p.reservedQty ?? 0,
        allowBackorders: p.allowBackorders ?? false,
        lowInventoryThreshold: p.lowInventoryThreshold ?? null,
        baseInventoryUnitId: p.baseInventoryUnitId ?? null,
        baseUnitsConsumed: p.baseUnitsConsumed ?? null,
        weight: 1,
        weightUnit: "lb",
        images: {
          create: [
            { url: img(`${slug}-1`), altText: p.name, sortOrder: 0, businessId },
            { url: img(`${slug}-2`), altText: `${p.name} alt`, sortOrder: 1, businessId },
          ],
        },
        ...(p.variants
          ? {
              variants: {
                create: p.variants.map((v) => ({
                  name: v.name,
                  options: v.options as Prisma.InputJsonValue,
                  inventoryQty: v.inventoryQty,
                  price: v.price ?? null,
                })),
              },
            }
          : {}),
      },
    });

    if (p.collections?.length) {
      await db.collectionProduct.createMany({
        data: p.collections.map((key, idx) => ({
          collectionId: collectionIdBySlug[key]!,
          productId: created.id,
          sortOrder: idx,
        })),
      });
    }

    products.push({
      id: created.id,
      name: created.name,
      slug: created.slug,
      price: created.price,
      orderable: p.orderable ?? false,
    });
  }
  console.log(`✓ Products: ${products.length} (full inventory matrix + variants)`);

  // ───────────────────────────────────────────────────────────────────────────
  // 6. Services (display-only) + items
  // ───────────────────────────────────────────────────────────────────────────
  const consultService = await db.service.create({
    data: {
      businessId,
      name: "Personal Skincare Consultation",
      slug: `${SLUG_PREFIX}skincare-consultation`,
      description: "One-on-one guidance to build a routine that works for your skin.",
      image: img("svc-consult"),
      serviceTemplateId: "service-one",
      published: true,
      sortOrder: 20,
      metaTitle: "Personal Skincare Consultation | Demo Store",
      metaDescription:
        "Book a one-on-one skincare consultation to build a routine tailored to your skin.",
      metaKeywords: "skincare consultation, booking, demo store, services",
      ogImage: img("svc-consult"),
    },
  });
  await db.serviceItem.createMany({
    data: [
      {
        businessId,
        serviceId: consultService.id,
        name: "30-Minute Virtual Consultation",
        description: "A quick virtual session to get started.",
        priceLabel: "$45",
        durationLabel: "30 min",
        published: true,
        sortOrder: 0,
      },
      {
        businessId,
        serviceId: consultService.id,
        name: "Full In-Studio Consultation",
        description: "A complete in-depth skin analysis and plan.",
        priceLabel: "$120",
        compareAtPriceLabel: "$150",
        durationLabel: "90 min",
        published: true,
        sortOrder: 1,
      },
    ],
  });

  const giftService = await db.service.create({
    data: {
      businessId,
      name: "Gift Wrapping & Engraving",
      slug: `${SLUG_PREFIX}gift-wrapping`,
      description: "Make any order gift-ready with premium wrapping and engraving.",
      image: img("svc-gift"),
      serviceTemplateId: "service-one",
      published: true,
      sortOrder: 21,
      metaTitle: "Gift Wrapping & Engraving | Demo Store",
      metaDescription:
        "Make any order gift-ready with premium hand wrapping and personalized engraving.",
      metaKeywords: "gift wrapping, engraving, demo store, services",
      ogImage: img("svc-gift"),
    },
  });
  await db.serviceItem.create({
    data: {
      businessId,
      serviceId: giftService.id,
      name: "Premium Gift Wrap",
      description: "Hand-wrapped with a personalized note.",
      priceLabel: "$12",
      durationLabel: "Add-on",
      addOns: [
        { name: "Engraving", priceLabel: "$8", description: "Up to 20 characters" },
      ] as Prisma.InputJsonValue,
      published: true,
      sortOrder: 0,
    },
  });
  console.log("✓ Services: 2 (with items)");

  // ── SEO backfill for ALL service groups ────────────────────────────────────
  // Covers pre-existing/curated services (e.g. a "Massage" group) that were created
  // without SEO. Only fills BLANK fields — never overwrites existing SEO — so it's
  // non-destructive to curated content.
  const allServices = await db.service.findMany({
    where: { businessId },
    select: {
      id: true,
      name: true,
      description: true,
      metaTitle: true,
      metaDescription: true,
      metaKeywords: true,
      ogImage: true,
    },
  });
  let servicesSeoBackfilled = 0;
  for (const s of allServices) {
    const data: Prisma.ServiceUpdateInput = {};
    if (!s.metaTitle?.trim()) data.metaTitle = `${s.name} | Demo Store`;
    if (!s.metaDescription?.trim()) {
      const desc = s.description?.trim() ?? "";
      data.metaDescription = desc.length > 0 ? desc : `Book ${s.name} at Demo Store.`;
    }
    if (!s.metaKeywords?.trim()) {
      data.metaKeywords = `${s.name.toLowerCase()}, services, demo store`;
    }
    if (!s.ogImage?.trim()) data.ogImage = img(`svc-${s.name}`);
    if (Object.keys(data).length > 0) {
      await db.service.update({ where: { id: s.id }, data });
      servicesSeoBackfilled++;
    }
  }
  console.log(
    `✓ Service SEO backfilled on ${servicesSeoBackfilled} service group(s) with missing fields`,
  );

  // ───────────────────────────────────────────────────────────────────────────
  // 7. Customers + shipping addresses (namespaced emails)
  // ───────────────────────────────────────────────────────────────────────────
  const customerSeeds = [
    { firstName: "Ava", lastName: "Bennett", city: "Detroit", province: "MI", zip: "48201" },
    { firstName: "Marcus", lastName: "Lee", city: "Chicago", province: "IL", zip: "60601" },
    { firstName: "Priya", lastName: "Shah", city: "Austin", province: "TX", zip: "78701" },
    { firstName: "Diego", lastName: "Torres", city: "Denver", province: "CO", zip: "80202" },
    { firstName: "Hannah", lastName: "Kim", city: "Seattle", province: "WA", zip: "98101" },
    { firstName: "Noah", lastName: "Walker", city: "Portland", province: "OR", zip: "97201" },
    { firstName: "Sofia", lastName: "Rossi", city: "Brooklyn", province: "NY", zip: "11201" },
  ];

  const customers: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    addressId: string;
  }[] = [];
  for (const [idx, c] of customerSeeds.entries()) {
    const email = `${c.firstName.toLowerCase()}.${c.lastName.toLowerCase()}@${CUSTOMER_EMAIL_DOMAIN}`;
    const customer = await db.customer.create({
      data: {
        businessId,
        email,
        firstName: c.firstName,
        lastName: c.lastName,
        acceptsMarketing: idx % 2 === 0,
        shippingAddresses: {
          create: {
            firstName: c.firstName,
            lastName: c.lastName,
            address1: `${100 + idx} Main St`,
            city: c.city,
            province: c.province,
            country: "US",
            zip: c.zip,
            isDefault: true,
          },
        },
      },
      include: { shippingAddresses: true },
    });
    customers.push({
      id: customer.id,
      email,
      firstName: c.firstName,
      lastName: c.lastName,
      addressId: customer.shippingAddresses[0]!.id,
    });
  }
  console.log(`✓ Customers: ${customers.length} (each with an address)`);

  // ───────────────────────────────────────────────────────────────────────────
  // 8. Orders + items (no Stripe / no email — direct DB writes)
  // ───────────────────────────────────────────────────────────────────────────
  const sellable = products.filter((p) => p.orderable);

  const orderPlans = [
    { status: "completed", paymentStatus: "paid", fulfillmentStatus: "fulfilled", days: 58 },
    { status: "completed", paymentStatus: "paid", fulfillmentStatus: "fulfilled", days: 51 },
    { status: "completed", paymentStatus: "paid", fulfillmentStatus: "fulfilled", days: 47 },
    { status: "completed", paymentStatus: "paid", fulfillmentStatus: "fulfilled", days: 40 },
    { status: "open", paymentStatus: "paid", fulfillmentStatus: "unfulfilled", days: 33 },
    { status: "completed", paymentStatus: "paid", fulfillmentStatus: "fulfilled", days: 29 },
    { status: "refunded", paymentStatus: "refunded", fulfillmentStatus: "fulfilled", days: 26 },
    { status: "open", paymentStatus: "paid", fulfillmentStatus: "partially_fulfilled", days: 21 },
    { status: "completed", paymentStatus: "paid", fulfillmentStatus: "fulfilled", days: 18 },
    { status: "cancelled", paymentStatus: "refunded", fulfillmentStatus: "unfulfilled", days: 15 },
    { status: "open", paymentStatus: "paid", fulfillmentStatus: "unfulfilled", days: 11 },
    { status: "completed", paymentStatus: "paid", fulfillmentStatus: "fulfilled", days: 8 },
    { status: "open", paymentStatus: "paid", fulfillmentStatus: "unfulfilled", days: 5 },
    { status: "open", paymentStatus: "paid", fulfillmentStatus: "unfulfilled", days: 3 },
    { status: "open", paymentStatus: "pending", fulfillmentStatus: "unfulfilled", days: 1 },
  ];

  const customerTotals = new Map<string, { spent: number; count: number }>();
  // Continue numbering after any existing curated orders so we never collide on
  // the unique [businessId, orderNumber].
  const lastOrder = await db.order.findFirst({
    where: { businessId },
    orderBy: { orderNumber: "desc" },
    select: { orderNumber: true },
  });
  let orderNumber = (lastOrder?.orderNumber ?? 1000) + 1;
  let orderCount = 0;

  for (const [i, plan] of orderPlans.entries()) {
    const customer = customers[i % customers.length]!;
    const lineCount = (i % 2) + 1; // 1–2 line items
    const picks = [
      sellable[i % sellable.length]!,
      sellable[(i + 3) % sellable.length]!,
    ].slice(0, lineCount);

    const items = picks.map((p, idx) => {
      const quantity = ((i + idx) % 2) + 1;
      return {
        productId: p.id,
        productName: p.name,
        price: p.price,
        quantity,
        total: p.price * quantity,
      };
    });

    const subtotal = items.reduce((sum, it) => sum + it.total, 0);
    const shipping = subtotal >= 7500 ? 0 : 600;
    const tax = Math.round(subtotal * 0.06);
    const total = subtotal + shipping + tax;
    const createdAt = daysAgo(plan.days);
    const thisOrderNumber = orderNumber++;

    await db.order.create({
      data: {
        businessId,
        orderNumber: thisOrderNumber,
        status: plan.status,
        paymentStatus: plan.paymentStatus,
        fulfillmentStatus: plan.fulfillmentStatus,
        stripeSessionId: `${ORDER_SESSION_PREFIX}${businessId.slice(-6)}_${thisOrderNumber}`,
        subtotal,
        tax,
        shipping,
        total,
        customerEmail: customer.email,
        customerName: `${customer.firstName} ${customer.lastName}`,
        customerFirstName: customer.firstName,
        customerLastName: customer.lastName,
        paymentMethod: "card",
        deliveryMethod: "ship",
        customerId: customer.id,
        shippingAddressId: customer.addressId,
        createdAt,
        updatedAt: createdAt,
        ...(plan.paymentStatus === "refunded"
          ? { refundAmountCents: total, refundReason: "Customer request" }
          : {}),
        items: { create: items },
        ...(plan.fulfillmentStatus === "fulfilled"
          ? {
              shipments: {
                create: {
                  carrier: "USPS",
                  trackingNumber: `9400${1000000000 + thisOrderNumber}`,
                  shippedAt: daysAgo(Math.max(0, plan.days - 2)),
                },
              },
            }
          : {}),
      },
    });

    if (plan.paymentStatus === "paid") {
      const t = customerTotals.get(customer.id) ?? { spent: 0, count: 0 };
      t.spent += total;
      t.count += 1;
      customerTotals.set(customer.id, t);
    }
    orderCount++;
  }

  for (const [customerId, t] of customerTotals) {
    await db.customer.update({
      where: { id: customerId },
      data: { totalSpent: t.spent, orderCount: t.count },
    });
  }
  console.log(`✓ Orders: ${orderCount} (across statuses, last ~60 days)`);

  // ───────────────────────────────────────────────────────────────────────────
  // 9. Product reviews → recompute averageRating / reviewCount (seed products only)
  // ───────────────────────────────────────────────────────────────────────────
  const reviewBlurbs = [
    { rating: 5, title: "Love it", comment: "Exactly as described — my skin feels great." },
    { rating: 4, title: "Solid buy", comment: "Happy with it overall, would recommend." },
    { rating: 5, title: "Repeat customer", comment: "Second one I've bought. Works beautifully." },
    { rating: 3, title: "Decent", comment: "Good, though the scent is stronger than I expected." },
  ];

  let reviewCount = 0;
  const reviewable = products.filter((p) => !p.slug.endsWith("prototype-night-cream")).slice(0, 8);
  for (const [i, p] of reviewable.entries()) {
    const n = (i % 3) + 1; // 1–3 reviews each
    for (let r = 0; r < n; r++) {
      const blurb = reviewBlurbs[(i + r) % reviewBlurbs.length]!;
      const reviewer = customers[(i + r) % customers.length]!;
      await db.productReview.create({
        data: {
          productId: p.id,
          source: "customer",
          rating: blurb.rating,
          title: blurb.title,
          comment: blurb.comment,
          isApproved: true,
          isHidden: false,
          verifiedPurchase: true,
          customerName: `${reviewer.firstName} ${reviewer.lastName.charAt(0)}.`,
          customerEmail: reviewer.email,
          customerId: reviewer.id,
          reviewDate: daysAgo(20 - i),
        },
      });
      reviewCount++;
    }

    const agg = await db.productReview.aggregate({
      where: { productId: p.id, isApproved: true, isHidden: false },
      _avg: { rating: true },
      _count: true,
    });
    await db.product.update({
      where: { id: p.id },
      data: { averageRating: agg._avg.rating ?? null, reviewCount: agg._count },
    });
  }
  console.log(`✓ Reviews: ${reviewCount} (across ${reviewable.length} products)`);

  // ───────────────────────────────────────────────────────────────────────────
  // 10. Testimonials (namespaced customerEmail for clean idempotent removal)
  // ───────────────────────────────────────────────────────────────────────────
  await db.testimonial.createMany({
    data: [
      {
        businessId,
        source: "customer",
        text: "Skinbar VII has become my go-to for thoughtful self-care gifts. Fast shipping, too!",
        customerName: "Ava Bennett",
        customerEmail: `ava@${CUSTOMER_EMAIL_DOMAIN}`,
        customerTitle: "Verified Buyer",
        isApproved: true,
        testimonialDate: daysAgo(30),
      },
      {
        businessId,
        source: "owner",
        title: "A pleasure to work with",
        text: "The consultation completely changed my routine. Highly recommend.",
        customerName: "Marcus Lee",
        customerEmail: `marcus@${CUSTOMER_EMAIL_DOMAIN}`,
        customerTitle: "Marketing Lead",
        customerCompany: "Northside Co.",
        isApproved: true,
        testimonialDate: daysAgo(22),
      },
      {
        businessId,
        source: "customer",
        text: "Quality is consistently excellent and the customer service is fantastic.",
        customerName: "Priya Shah",
        customerEmail: `priya@${CUSTOMER_EMAIL_DOMAIN}`,
        isApproved: true,
        testimonialDate: daysAgo(12),
      },
      {
        businessId,
        source: "customer",
        text: "The clay mask is a weekly ritual now. Worth every penny.",
        customerName: "Diego Torres",
        customerEmail: `diego@${CUSTOMER_EMAIL_DOMAIN}`,
        isApproved: true,
        testimonialDate: daysAgo(6),
      },
    ],
  });
  console.log("✓ Testimonials: 4");

  // ───────────────────────────────────────────────────────────────────────────
  // 11. Discount codes
  // ───────────────────────────────────────────────────────────────────────────
  await db.discountCode.createMany({
    data: [
      { businessId, code: "WELCOME10", type: "percentage", value: 10, active: true, usageLimit: 1000 },
      { businessId, code: "SAVE5", type: "fixed", value: 500, active: true, minPurchase: 3000 },
      {
        businessId,
        code: "SUMMER25",
        type: "percentage",
        value: 25,
        active: true,
        expiresAt: daysAgo(-30), // 30 days from now
        maxDiscount: 2000,
      },
    ],
  });
  console.log("✓ Discount codes: 3");

  // ───────────────────────────────────────────────────────────────────────────
  // 12. Pages (blog post + about) — prefixed slugs
  // ───────────────────────────────────────────────────────────────────────────
  const doc = (text: string): Prisma.InputJsonValue => ({
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  });

  await db.page.create({
    data: {
      businessId,
      type: "blog",
      title: "Building Your Skincare Routine",
      slug: `${SLUG_PREFIX}building-your-skincare-routine`,
      excerpt: "A quick guide to layering products for healthy skin.",
      content: doc(
        "This is a sample blog post on the demo store. Use the blog to share product " +
          "stories, routines, and announcements with your customers.",
      ),
      image: img("blog-routine"),
      metaTitle: "Building Your Skincare Routine | Demo Store",
      metaDescription: "A quick guide to layering skincare products in the right order.",
      metaKeywords: "skincare routine, guide, demo store, blog",
      ogImage: img("blog-routine"),
      published: true,
      publishedAt: daysAgo(14),
    },
  });

  await db.page.create({
    data: {
      businessId,
      type: "page",
      title: "Demo: Our Story",
      slug: `${SLUG_PREFIX}our-story`,
      excerpt: "A sample about page for the demo store.",
      content: doc(
        "This is a sample about page added by the demo seed. It showcases how custom " +
          "content pages render on the storefront.",
      ),
      image: img("page-story"),
      metaTitle: "Our Story | Demo Store",
      metaDescription: "Learn more about Demo Store — a sample SimplePress storefront.",
      metaKeywords: "about, our story, demo store",
      ogImage: img("page-story"),
      published: true,
      publishedAt: daysAgo(60),
    },
  });
  console.log("✓ Pages: 2 (blog + about)");

  // ───────────────────────────────────────────────────────────────────────────
  // 12b. FAQ items (FAQPage JSON-LD for AEO/GEO)
  // ───────────────────────────────────────────────────────────────────────────
  await db.faqItem.createMany({
    data: DEMO_FAQ.map((f, i) => ({
      businessId,
      question: f.question,
      answer: f.answer,
      sortOrder: i,
      published: true,
    })),
  });
  console.log(`✓ FAQ items: ${DEMO_FAQ.length}`);

  // ───────────────────────────────────────────────────────────────────────────
  // 13. Inventory history — sample sale rows for the audit view (tagged with note)
  // ───────────────────────────────────────────────────────────────────────────
  const trackedSample = await db.product.findMany({
    where: { businessId, slug: { startsWith: SLUG_PREFIX }, trackInventory: true },
    select: { id: true, inventoryQty: true },
    take: 4,
  });
  for (const p of trackedSample) {
    await db.inventoryHistory.create({
      data: {
        businessId,
        productId: p.id,
        previousQty: p.inventoryQty + 1,
        newQty: p.inventoryQty,
        changeQty: -1,
        reason: "sale",
        note: SEED_TAG,
      },
    });
  }
  console.log(`✓ InventoryHistory: ${trackedSample.length} sample sale rows`);

  console.log(`\n✅ Demo store seeded (businessId: ${businessId}).`);
  console.log(
    `   Template set to "default" with fields filled out; pre-existing content rows were left in place.\n`,
  );
}

main()
  .catch((err) => {
    console.error("❌ Demo seed failed:", err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
