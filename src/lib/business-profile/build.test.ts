import { describe, expect, it } from "vitest";

import type {
  BusinessProfileSource,
  BusinessProfileSourceProduct,
} from "./build";

import { buildBusinessProfile, clipText, toPlainText } from "./build";
import { BUSINESS_PROFILE_SCHEMA, MAX_PRODUCTS } from "./types";

const NOW = new Date("2026-10-27T12:00:00.000Z");
const BASE = "https://shop.example.com";

function product(
  overrides: Partial<BusinessProfileSourceProduct> = {},
): BusinessProfileSourceProduct {
  return {
    name: "Candle",
    slug: "candle",
    published: true,
    price: 1250,
    compareAtPrice: null,
    excerpt: null,
    description: "<p>Hand-poured <strong>soy</strong> candle &amp; wick.</p>",
    additionalFields: null,
    averageRating: 4.66,
    reviewCount: 3,
    imageUrl: "https://cdn.example.com/candle.jpg",
    collections: [
      { name: "Home", published: true },
      { name: "Hidden", published: false },
    ],
    optionGroupNames: ["Scent"],
    trackInventory: false,
    allowBackorders: false,
    inventoryQty: 0,
    reservedQty: 0,
    baseInventoryUnitId: null,
    baseUnitsConsumed: null,
    baseInventoryUnit: null,
    variants: [],
    ...overrides,
  };
}

function source(
  overrides: Partial<BusinessProfileSource> = {},
): BusinessProfileSource {
  return {
    baseUrl: BASE,
    business: {
      name: "Example Shop",
      businessType: "products",
      businessAddress: "1 Main St, Detroit, MI 48201",
      addressStreet: "1 Main St",
      addressCity: "Detroit",
      addressState: "MI",
      addressPostalCode: "48201",
      latitude: 42.33,
      longitude: -83.05,
      localPresence: "storefront",
      areaServed: ["Detroit", "  ", "Ann Arbor "],
      businessHours: [
        { days: ["mon", "tue"], closed: false, open: "09:00", close: "17:00" },
        { days: ["sun"], closed: true, open: null, close: null },
      ],
      timeZone: "America/Detroit",
      phoneNumber: "313-555-0100",
      supportEmail: "help@example.com",
      featureFlags: {
        products: true,
        collections: true,
        services: true,
        reviews: true,
        customerAccounts: true,
        productOptions: true,
        cart: true,
      },
    },
    siteContent: {
      aboutText: "We make <em>candles</em>.",
      metaDescription: "Meta",
      socialLinks: {
        instagram: "https://instagram.com/example",
        facebook: "",
        twitter: "http://twitter.com/insecure",
        tiktok: "javascript:alert(1)",
        googleBusinessProfile: "https://g.page/example",
      },
    },
    products: [product()],
    productTotal: 1,
    collections: [
      {
        name: "Home",
        slug: "home",
        description: "Things for home",
        published: true,
        productCount: 1,
      },
      {
        name: "Draft col",
        slug: "draft",
        description: null,
        published: false,
        productCount: 0,
      },
    ],
    services: [
      {
        name: "Consulting",
        slug: "consulting",
        description: "Advice",
        published: true,
        items: [
          {
            name: "1-hour session",
            description: "<p>One hour</p>",
            priceLabel: "$100",
            durationLabel: "60 min",
            published: true,
          },
          {
            name: "Draft item",
            description: null,
            priceLabel: null,
            durationLabel: null,
            published: false,
          },
        ],
      },
      {
        name: "Workshops",
        slug: "workshops",
        description: "Group classes",
        published: true,
        items: [],
      },
      {
        name: "Unpublished",
        slug: "unpublished",
        description: null,
        published: false,
        items: [],
      },
    ],
    faqs: [
      {
        question: "Do you ship?",
        answer: "Yes, <b>nationwide</b>.",
        published: true,
      },
      { question: "Draft?", answer: "No", published: false },
    ],
    ...overrides,
  };
}

const build = (s: BusinessProfileSource) =>
  buildBusinessProfile(s, { now: NOW });

describe("buildBusinessProfile", () => {
  it("shapes the v1 envelope and business block", () => {
    const out = build(source());
    expect(out.schema).toBe(BUSINESS_PROFILE_SCHEMA);
    expect(out.generatedAt).toBe(NOW.toISOString());
    expect(out.truncated).toBe(false);
    expect(out.business).toEqual({
      name: "Example Shop",
      about: "We make candles.",
      url: BASE,
      businessType: "products",
      address: {
        street: "1 Main St",
        city: "Detroit",
        state: "MI",
        postalCode: "48201",
        country: "US",
        display: "1 Main St, Detroit, MI 48201",
      },
      geo: { lat: 42.33, lng: -83.05 },
      localPresence: "storefront",
      areaServed: ["Detroit", "Ann Arbor"],
      hours: [
        { days: ["mon", "tue"], closed: false, open: "09:00", close: "17:00" },
        { days: ["sun"], closed: true, open: null, close: null },
      ],
      timeZone: "America/Detroit",
      phone: "313-555-0100",
      email: "help@example.com",
      socialLinks: {
        instagram: "https://instagram.com/example",
        googleBusinessProfile: "https://g.page/example",
      },
    });
  });

  it("emits product price in cents, plain-text description, and gated extras", () => {
    const [p] = build(source()).products;
    expect(p).toEqual({
      name: "Candle",
      url: `${BASE}/shop/candle`,
      price: 1250,
      priceFormatted: "$12.50",
      compareAtPrice: null,
      currency: "USD",
      description: "Hand-poured soy candle & wick.",
      imageUrl: "https://cdn.example.com/candle.jpg",
      collections: ["Home"],
      options: ["Scent"],
      variants: [],
      inStock: true,
      averageRating: 4.7,
      reviewCount: 3,
    });
  });

  it("excludes draft products", () => {
    const out = build(
      source({
        products: [
          product(),
          product({ name: "Draft", slug: "draft", published: false }),
        ],
        productTotal: null,
      }),
    );
    expect(out.products.map((p) => p.name)).toEqual(["Candle"]);
    expect(out.counts.products).toBe(1);
  });

  it("reports a tracked product with zero stock as out of stock", () => {
    const out = build(
      source({
        products: [product({ trackInventory: true, inventoryQty: 0 })],
      }),
    );
    expect(out.products[0]!.inStock).toBe(false);
  });

  it("treats reserved stock as unavailable and backorders as available", () => {
    const reserved = build(
      source({
        products: [
          product({ trackInventory: true, inventoryQty: 2, reservedQty: 2 }),
        ],
      }),
    );
    expect(reserved.products[0]!.inStock).toBe(false);

    const backorder = build(
      source({
        products: [
          product({
            trackInventory: true,
            allowBackorders: true,
            inventoryQty: 0,
          }),
        ],
      }),
    );
    expect(backorder.products[0]!.inStock).toBe(true);
  });

  it("uses the base inventory unit (pool) for pooled products", () => {
    const out = build(
      source({
        products: [
          product({
            trackInventory: false,
            baseInventoryUnitId: "pool",
            baseUnitsConsumed: 3,
            baseInventoryUnit: {
              inventoryQty: 2,
              reservedQty: 0,
              allowBackorders: false,
            },
          }),
        ],
      }),
    );
    expect(out.products[0]!.inStock).toBe(false);
  });

  it("handles a variant mix: per-variant stock and inherited prices", () => {
    const out = build(
      source({
        products: [
          product({
            price: 2000,
            compareAtPrice: 2500,
            trackInventory: true,
            variants: [
              {
                id: "v1",
                name: "Small",
                price: null,
                compareAtPrice: null,
                inventoryQty: 0,
                reservedQty: 0,
              },
              {
                id: "v2",
                name: "Large",
                price: 3000,
                compareAtPrice: null,
                inventoryQty: 5,
                reservedQty: 1,
              },
              {
                id: "v3",
                name: "XL",
                price: 0,
                compareAtPrice: null,
                inventoryQty: 1,
                reservedQty: 1,
              },
            ],
          }),
        ],
      }),
    );
    const p = out.products[0]!;
    expect(p.variants).toEqual([
      { name: "Small", price: 2000, priceFormatted: "$20.00", inStock: false },
      { name: "Large", price: 3000, priceFormatted: "$30.00", inStock: true },
      { name: "XL", price: 2000, priceFormatted: "$20.00", inStock: false },
    ]);
    expect(p.inStock).toBe(true);
    // First variant inherits the base price, so the product compare-at applies.
    expect(p.price).toBe(2000);
    expect(p.compareAtPrice).toBe(2500);
  });

  it("returns [] for products and collections when products are off", () => {
    const s = source();
    s.business.featureFlags = {
      ...(s.business.featureFlags as object),
      products: false,
    };
    const out = build(s);
    expect(out.products).toEqual([]);
    expect(out.collections).toEqual([]);
    expect(out.counts.products).toBe(0);
    expect(out.counts.collections).toBe(0);
    expect(out.truncated).toBe(false);
  });

  it("drops collections (list and per-product names) when collections are off", () => {
    const s = source();
    s.business.featureFlags = {
      ...(s.business.featureFlags as object),
      collections: false,
    };
    const out = build(s);
    expect(out.collections).toEqual([]);
    expect(out.products[0]!.collections).toEqual([]);
  });

  it("hides ratings and option names when their features are off", () => {
    const s = source();
    s.business.featureFlags = {
      ...(s.business.featureFlags as object),
      reviews: false,
      productOptions: false,
    };
    const p = build(s).products[0]!;
    expect(p.averageRating).toBeNull();
    expect(p.reviewCount).toBe(0);
    expect(p.options).toEqual([]);
  });

  it("lists published collections with storefront urls", () => {
    expect(build(source()).collections).toEqual([
      {
        name: "Home",
        description: "Things for home",
        url: `${BASE}/collections/home`,
        productCount: 1,
      },
    ]);
  });

  it("flattens published service items under their service, linking the service page", () => {
    const out = build(source());
    expect(out.services).toEqual([
      {
        name: "1-hour session",
        category: "Consulting",
        priceLabel: "$100",
        durationLabel: "60 min",
        description: "One hour",
        url: `${BASE}/services/consulting`,
      },
      {
        name: "Workshops",
        category: null,
        priceLabel: null,
        durationLabel: null,
        description: "Group classes",
        url: `${BASE}/services/workshops`,
      },
    ]);
    expect(out.counts.services).toBe(2);
  });

  it("returns [] for services when the services feature is off", () => {
    const s = source();
    s.business.featureFlags = {
      ...(s.business.featureFlags as object),
      services: false,
    };
    const out = build(s);
    expect(out.services).toEqual([]);
    expect(out.counts.services).toBe(0);
  });

  it("emits published FAQs as plain text", () => {
    expect(build(source()).faqs).toEqual([
      { question: "Do you ship?", answer: "Yes, nationwide." },
    ]);
  });

  it("caps products at MAX_PRODUCTS and sets truncated with pre-cap counts", () => {
    const many = Array.from({ length: MAX_PRODUCTS + 1 }, (_, i) =>
      product({ name: `P${i}`, slug: `p-${i}` }),
    );
    const out = build(source({ products: many, productTotal: null }));
    expect(out.products).toHaveLength(MAX_PRODUCTS);
    expect(out.truncated).toBe(true);
    expect(out.counts.products).toBe(MAX_PRODUCTS + 1);

    // Loader-side cap: fewer rows than the total also means truncated.
    const capped = build(
      source({ products: many.slice(0, MAX_PRODUCTS), productTotal: 742 }),
    );
    expect(capped.truncated).toBe(true);
    expect(capped.counts.products).toBe(742);
  });

  it("sets geo to null when one coordinate is missing", () => {
    const s = source();
    s.business.longitude = null;
    expect(build(s).business.geo).toBeNull();
  });

  it("sets address to null when no part is set", () => {
    const s = source();
    Object.assign(s.business, {
      businessAddress: " ",
      addressStreet: null,
      addressCity: null,
      addressState: null,
      addressPostalCode: null,
    });
    expect(build(s).business.address).toBeNull();
  });

  it("never leaks private keys or values", () => {
    const s = source({
      products: [
        product({
          trackInventory: true,
          inventoryQty: 7,
          reservedQty: 2,
          variants: [
            {
              id: "variant-secret-id",
              name: "One",
              price: null,
              compareAtPrice: null,
              inventoryQty: 3,
              reservedQty: 1,
            },
          ],
        }),
      ],
    });
    // Extra private fields on the source rows must not be spread into output.
    Object.assign(s.products[0]!, {
      sku: "SKU-1",
      barcode: "0123456789012",
      cost: 300,
    });
    Object.assign(s.business, { stripeAccountId: "acct_123" });

    const json = JSON.stringify(build(s));
    for (const banned of [
      "sku",
      "barcode",
      "inventoryQty",
      "reservedQty",
      "cost",
      "stripeAccountId",
      "acct_123",
      "variant-secret-id",
    ]) {
      expect(json).not.toContain(banned);
    }
  });
});

describe("text helpers", () => {
  it("flattens a string-encoded TipTap doc", () => {
    const doc = JSON.stringify({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Hello" }] },
        {
          type: "paragraph",
          content: [{ type: "text", text: "world &amp; more" }],
        },
      ],
    });
    expect(toPlainText(doc)).toBe("Hello world & more");
  });

  it("clips at a word boundary within the cap", () => {
    const text = "word ".repeat(200).trim();
    const clipped = clipText(text, 600);
    expect(clipped.length).toBeLessThanOrEqual(600);
    expect(clipped.endsWith("word…")).toBe(true);
  });
});
