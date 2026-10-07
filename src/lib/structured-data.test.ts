import { describe, expect, it } from "vitest";

import {
  buildBlogPostingSchema,
  buildEventSchema,
  buildLocalBusinessSchema,
  buildOrganizationSchema,
  buildProductSchema,
  buildVideoObjectSchema,
} from "./structured-data";

const business = {
  subdomain: "testshop",
  customDomain: null,
  domainStatus: null,
  name: "Test Shop",
};

describe("buildEventSchema", () => {
  it("never emits an `offers` key, even when priceLabel looks parseable", () => {
    const schema = buildEventSchema(
      {
        name: "Market Day",
        slug: "market-day",
        startAt: new Date("2026-08-15T19:00:00.000Z"),
        endAt: new Date("2026-08-15T21:00:00.000Z"),
        allDay: false,
        priceLabel: "$45",
      },
      business,
      "America/Detroit",
    );

    expect(schema).not.toHaveProperty("offers");
  });

  it("never emits `offers` for a free-text priceLabel like 'Free'", () => {
    const schema = buildEventSchema(
      {
        name: "Community Meetup",
        slug: "community-meetup",
        startAt: new Date("2026-08-15T19:00:00.000Z"),
        allDay: false,
        priceLabel: "Free",
      },
      business,
      "America/Detroit",
    );

    expect(schema).not.toHaveProperty("offers");
  });

  it("emits a date-only startDate/endDate for an all-day event, computed in the passed timeZone (west-of-UTC zone catches the endDate-rollover bug)", () => {
    // All-day Aug 15 2026 in America/Los_Angeles (PDT, UTC-7). Normalized per
    // normalizeEventDates: start = local midnight, end = local 23:59:59.999.
    // In UTC those instants are 2026-08-15T07:00:00.000Z and
    // 2026-08-16T06:59:59.999Z respectively — a naive UTC-based date read
    // would report the END as Aug 16, which is wrong. This is exactly the
    // regression this feature's spec calls out.
    const schema = buildEventSchema(
      {
        name: "Summer Fair",
        slug: "summer-fair",
        startAt: new Date("2026-08-15T07:00:00.000Z"),
        endAt: new Date("2026-08-16T06:59:59.999Z"),
        allDay: true,
      },
      business,
      "America/Los_Angeles",
    );

    expect(schema.startDate).toBe("2026-08-15");
    expect(schema.endDate).toBe("2026-08-15");
  });

  it("emits a date-only startDate for an all-day event in an east-of-UTC zone (catches the startDate-rollback bug)", () => {
    // All-day Aug 15 2026 in Asia/Tokyo (UTC+9, no DST). Local midnight Aug 15
    // is 2026-08-14T15:00:00.000Z — a naive UTC-based date read would report
    // the START as Aug 14, which is wrong.
    const schema = buildEventSchema(
      {
        name: "Night Market",
        slug: "night-market",
        startAt: new Date("2026-08-14T15:00:00.000Z"),
        endAt: new Date("2026-08-15T14:59:59.999Z"),
        allDay: true,
      },
      business,
      "Asia/Tokyo",
    );

    expect(schema.startDate).toBe("2026-08-15");
    expect(schema.endDate).toBe("2026-08-15");
  });

  it("emits full ISO instants for a timed event", () => {
    const schema = buildEventSchema(
      {
        name: "Evening Workshop",
        slug: "evening-workshop",
        startAt: new Date("2026-08-15T19:00:00.000Z"),
        endAt: new Date("2026-08-15T21:00:00.000Z"),
        allDay: false,
      },
      business,
      "America/Detroit",
    );

    expect(schema.startDate).toBe("2026-08-15T19:00:00.000Z");
    expect(schema.endDate).toBe("2026-08-15T21:00:00.000Z");
  });

  it("omits endDate entirely when there is no endAt", () => {
    const schema = buildEventSchema(
      {
        name: "Pop-Up",
        slug: "pop-up",
        startAt: new Date("2026-08-15T19:00:00.000Z"),
        endAt: null,
        allDay: false,
      },
      business,
      "America/Detroit",
    );

    expect(schema).not.toHaveProperty("endDate");
  });

  it("omits location when not set", () => {
    const schema = buildEventSchema(
      {
        name: "Pop-Up",
        slug: "pop-up",
        startAt: new Date("2026-08-15T19:00:00.000Z"),
        allDay: false,
        location: null,
      },
      business,
      "America/Detroit",
    );

    expect(schema).not.toHaveProperty("location");
  });

  it("shapes location as a Place when set", () => {
    const schema = buildEventSchema(
      {
        name: "Pop-Up",
        slug: "pop-up",
        startAt: new Date("2026-08-15T19:00:00.000Z"),
        allDay: false,
        location: "123 Main St, Detroit, MI",
      },
      business,
      "America/Detroit",
    );

    expect(schema.location).toEqual({
      "@type": "Place",
      name: "123 Main St, Detroit, MI",
      address: "123 Main St, Detroit, MI",
    });
  });

  it("points url at the event's own canonical detail path, not the /events index", () => {
    const schema = buildEventSchema(
      {
        name: "Pop-Up",
        slug: "pop-up",
        startAt: new Date("2026-08-15T19:00:00.000Z"),
        allDay: false,
      },
      business,
      "America/Detroit",
    );

    expect(schema.url).toBe("https://testshop.simplepress.test/events/pop-up");
  });
});

describe("buildVideoObjectSchema", () => {
  it("emits every field when overrides, description, and thumbnail are all present", () => {
    const schema = buildVideoObjectSchema({
      youtubeId: "dQw4w9WgXcQ",
      publishedAt: new Date("2026-06-01T12:00:00.000Z"),
      title: "Synced title",
      description: "Synced description",
      thumbnailUrl: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
      titleOverride: "Owner title",
      descriptionOverride: "Owner description",
      thumbnailOverride:
        "https://storage.simplepress.test/business-sites/biz1/video-thumb.jpg",
    });

    expect(schema).toEqual({
      "@context": "https://schema.org",
      "@type": "VideoObject",
      name: "Owner title",
      description: "Owner description",
      thumbnailUrl:
        "https://storage.simplepress.test/business-sites/biz1/video-thumb.jpg",
      uploadDate: "2026-06-01T12:00:00.000Z",
      embedUrl: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
      contentUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    });
  });

  it("falls back to synced title/description/thumbnail when no override is set", () => {
    const schema = buildVideoObjectSchema({
      youtubeId: "dQw4w9WgXcQ",
      publishedAt: new Date("2026-06-01T12:00:00.000Z"),
      title: "Synced title",
      description: "Synced description",
      thumbnailUrl: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
      titleOverride: null,
      descriptionOverride: null,
      thumbnailOverride: null,
    });

    expect(schema.name).toBe("Synced title");
    expect(schema.description).toBe("Synced description");
    expect(schema.thumbnailUrl).toBe(
      "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
    );
  });

  it("emits only the required fields when description and thumbnail are absent", () => {
    const schema = buildVideoObjectSchema({
      youtubeId: "dQw4w9WgXcQ",
      publishedAt: new Date("2026-06-01T12:00:00.000Z"),
      title: "Minimal video",
    });

    expect(schema).toEqual({
      "@context": "https://schema.org",
      "@type": "VideoObject",
      name: "Minimal video",
      uploadDate: "2026-06-01T12:00:00.000Z",
      embedUrl: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
      contentUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    });
    expect(schema).not.toHaveProperty("description");
    expect(schema).not.toHaveProperty("thumbnailUrl");
  });

  it("accepts a string publishedAt (as returned after JSON round-tripping) and still emits an ISO uploadDate", () => {
    const schema = buildVideoObjectSchema({
      youtubeId: "dQw4w9WgXcQ",
      publishedAt: "2026-06-01T12:00:00.000Z",
      title: "String date video",
    });

    expect(schema.uploadDate).toBe("2026-06-01T12:00:00.000Z");
  });
});

const baseProduct = {
  name: "Test Product",
  slug: "test-product",
  price: 1000,
  images: [],
  averageRating: null,
  reviewCount: 0,
  trackInventory: false,
  inventoryQty: 0,
  allowBackorders: false,
};

describe("buildProductSchema", () => {
  it("emits an array of every absolute product image URL", () => {
    const schema = buildProductSchema(
      {
        ...baseProduct,
        images: [
          { url: "https://storage.simplepress.test/business-sites/biz1/a.jpg" },
          { url: "https://storage.simplepress.test/business-sites/biz1/b.jpg" },
          { url: "/relative/not-absolute.jpg" },
        ],
      },
      business,
    );

    expect(schema.image).toEqual([
      "https://storage.simplepress.test/business-sites/biz1/a.jpg",
      "https://storage.simplepress.test/business-sites/biz1/b.jpg",
    ]);
  });

  it("omits image entirely when there are no usable image URLs", () => {
    const schema = buildProductSchema(
      { ...baseProduct, images: [{ url: "/relative/only.jpg" }] },
      business,
    );

    expect(schema).not.toHaveProperty("image");
  });

  it("emits a single Offer when there is only one variant", () => {
    const schema = buildProductSchema(
      { ...baseProduct, variants: [{ price: 1500, inventoryQty: 5 }] },
      business,
    );

    expect(schema.offers).toEqual({
      "@type": "Offer",
      price: "15.00",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: expect.any(String) as string,
    });
  });

  it("emits a single Offer when multiple variants all resolve to the same effective price", () => {
    const schema = buildProductSchema(
      {
        ...baseProduct,
        price: 1000,
        variants: [
          { price: 1000, inventoryQty: 5 },
          { price: 0, inventoryQty: 5 }, // 0 inherits the base price (1000)
        ],
      },
      business,
    );

    expect(schema.offers).toMatchObject({
      "@type": "Offer",
      price: "10.00",
    });
  });

  it("emits an AggregateOffer with the correct low/high prices when variant prices differ", () => {
    const schema = buildProductSchema(
      {
        ...baseProduct,
        price: 1000,
        variants: [
          { price: 1000, inventoryQty: 5 },
          { price: 1500, inventoryQty: 5 },
          { price: 1200, inventoryQty: 5 },
        ],
      },
      business,
    );

    expect(schema.offers).toEqual({
      "@type": "AggregateOffer",
      lowPrice: "10.00",
      highPrice: "15.00",
      offerCount: 3,
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: expect.any(String) as string,
    });
  });

  it("treats a variant price of 0 as inheriting the base price when computing the AggregateOffer range", () => {
    const schema = buildProductSchema(
      {
        ...baseProduct,
        price: 1000,
        variants: [
          { price: 0, inventoryQty: 5 }, // inherits 1000
          { price: 1500, inventoryQty: 5 },
        ],
      },
      business,
    );

    expect(schema.offers).toMatchObject({
      "@type": "AggregateOffer",
      lowPrice: "10.00",
      highPrice: "15.00",
    });
  });
});

describe("buildLocalBusinessSchema", () => {
  describe("storefront mode", () => {
    it("emits @type Store", () => {
      const schema = buildLocalBusinessSchema({
        ...business,
        localPresence: "storefront",
      });

      expect(schema["@type"]).toBe("Store");
    });

    it("emits a full PostalAddress from structured parts, including addressCountry US", () => {
      const schema = buildLocalBusinessSchema({
        ...business,
        localPresence: "storefront",
        addressStreet: "123 Main St",
        addressCity: "Detroit",
        addressState: "MI",
        addressPostalCode: "48201",
      });

      expect(schema.address).toEqual({
        "@type": "PostalAddress",
        streetAddress: "123 Main St",
        addressLocality: "Detroit",
        addressRegion: "MI",
        postalCode: "48201",
        addressCountry: "US",
      });
    });

    it("includes only the non-blank structured parts", () => {
      const schema = buildLocalBusinessSchema({
        ...business,
        localPresence: "storefront",
        addressStreet: "123 Main St",
        addressCity: "  ", // blank after trim
        addressState: null,
        addressPostalCode: undefined,
      });

      expect(schema.address).toEqual({
        "@type": "PostalAddress",
        streetAddress: "123 Main St",
        addressCountry: "US",
      });
    });

    it("falls back to the legacy free-text businessAddress as streetAddress when no structured parts are set", () => {
      const schema = buildLocalBusinessSchema({
        ...business,
        localPresence: "storefront",
        businessAddress: "456 Legacy Ave, Ferndale, MI",
      });

      expect(schema.address).toEqual({
        "@type": "PostalAddress",
        streetAddress: "456 Legacy Ave, Ferndale, MI",
      });
    });

    it("prefers structured parts over the legacy businessAddress when both are present", () => {
      const schema = buildLocalBusinessSchema({
        ...business,
        localPresence: "storefront",
        businessAddress: "456 Legacy Ave, Ferndale, MI",
        addressStreet: "123 Main St",
        addressCity: "Detroit",
      });

      expect(schema.address).toEqual({
        "@type": "PostalAddress",
        streetAddress: "123 Main St",
        addressLocality: "Detroit",
        addressCountry: "US",
      });
    });

    it("omits address entirely when neither structured parts nor businessAddress are set", () => {
      const schema = buildLocalBusinessSchema({
        ...business,
        localPresence: "storefront",
      });

      expect(schema).not.toHaveProperty("address");
    });

    it("emits areaServed when non-empty", () => {
      const schema = buildLocalBusinessSchema({
        ...business,
        localPresence: "storefront",
        areaServed: ["Detroit", "Ferndale"],
      });

      expect(schema.areaServed).toEqual(["Detroit", "Ferndale"]);
    });
  });

  describe("service_area mode", () => {
    it("emits @type LocalBusiness", () => {
      const schema = buildLocalBusinessSchema({
        ...business,
        localPresence: "service_area",
        addressCity: "Detroit",
        addressState: "MI",
      });

      expect(schema["@type"]).toBe("LocalBusiness");
    });

    it("emits only city/state/postalCode — never streetAddress", () => {
      const schema = buildLocalBusinessSchema({
        ...business,
        localPresence: "service_area",
        addressStreet: "123 Main St",
        addressCity: "Detroit",
        addressState: "MI",
        addressPostalCode: "48201",
      });

      expect(schema.address).toEqual({
        "@type": "PostalAddress",
        addressLocality: "Detroit",
        addressRegion: "MI",
        postalCode: "48201",
        addressCountry: "US",
      });
    });

    it("never falls back to the legacy free-text businessAddress (it's a street address)", () => {
      const schema = buildLocalBusinessSchema({
        ...business,
        localPresence: "service_area",
        businessAddress: "456 Legacy Ave, Ferndale, MI",
      });

      expect(schema).not.toHaveProperty("address");
    });

    it("omits address when neither city nor state is present, even with a postal code", () => {
      const schema = buildLocalBusinessSchema({
        ...business,
        localPresence: "service_area",
        addressPostalCode: "48201",
      });

      expect(schema).not.toHaveProperty("address");
    });

    it("emits address from city alone", () => {
      const schema = buildLocalBusinessSchema({
        ...business,
        localPresence: "service_area",
        addressCity: "Detroit",
      });

      expect(schema.address).toEqual({
        "@type": "PostalAddress",
        addressLocality: "Detroit",
        addressCountry: "US",
      });
    });

    it("emits areaServed when non-empty", () => {
      const schema = buildLocalBusinessSchema({
        ...business,
        localPresence: "service_area",
        areaServed: ["Detroit", "Ferndale", "Royal Oak"],
      });

      expect(schema.areaServed).toEqual(["Detroit", "Ferndale", "Royal Oak"]);
    });

    it("includes telephone, email, and openingHoursSpecification when set", () => {
      const schema = buildLocalBusinessSchema({
        ...business,
        localPresence: "service_area",
        phoneNumber: "313-555-0100",
        supportEmail: "hi@example.com",
        businessHours: [
          { days: ["mon"], open: "09:00", close: "17:00", closed: false },
        ],
      });

      expect(schema.telephone).toBe("313-555-0100");
      expect(schema.email).toBe("hi@example.com");
      expect(schema.openingHoursSpecification).toBeDefined();
    });
  });

  describe("areaServed normalization", () => {
    it("omits areaServed entirely when empty", () => {
      const schema = buildLocalBusinessSchema({
        ...business,
        localPresence: "storefront",
        areaServed: [],
      });

      expect(schema).not.toHaveProperty("areaServed");
    });
  });

  describe("geo coordinates", () => {
    it("emits geo with both valid coordinates for storefront mode", () => {
      const schema = buildLocalBusinessSchema({
        ...business,
        localPresence: "storefront",
        latitude: 42.33,
        longitude: -83.14,
      });

      expect(schema.geo).toEqual({
        "@type": "GeoCoordinates",
        latitude: 42.33,
        longitude: -83.14,
      });
    });

    it("omits geo when latitude is out of range (> 90)", () => {
      const schema = buildLocalBusinessSchema({
        ...business,
        localPresence: "storefront",
        latitude: 91.0,
        longitude: -83.14,
      });

      expect(schema).not.toHaveProperty("geo");
    });

    it("omits geo when latitude is out of range (< -90)", () => {
      const schema = buildLocalBusinessSchema({
        ...business,
        localPresence: "storefront",
        latitude: -91.0,
        longitude: -83.14,
      });

      expect(schema).not.toHaveProperty("geo");
    });

    it("omits geo when longitude is out of range (> 180)", () => {
      const schema = buildLocalBusinessSchema({
        ...business,
        localPresence: "storefront",
        latitude: 42.33,
        longitude: 181.0,
      });

      expect(schema).not.toHaveProperty("geo");
    });

    it("omits geo when longitude is out of range (< -180)", () => {
      const schema = buildLocalBusinessSchema({
        ...business,
        localPresence: "storefront",
        latitude: 42.33,
        longitude: -181.0,
      });

      expect(schema).not.toHaveProperty("geo");
    });

    it("omits geo when only latitude is present (missing longitude)", () => {
      const schema = buildLocalBusinessSchema({
        ...business,
        localPresence: "storefront",
        latitude: 42.33,
        longitude: undefined,
      });

      expect(schema).not.toHaveProperty("geo");
    });

    it("omits geo when only longitude is present (missing latitude)", () => {
      const schema = buildLocalBusinessSchema({
        ...business,
        localPresence: "storefront",
        latitude: undefined,
        longitude: -83.14,
      });

      expect(schema).not.toHaveProperty("geo");
    });

    it("omits geo when both coordinates are null", () => {
      const schema = buildLocalBusinessSchema({
        ...business,
        localPresence: "storefront",
        latitude: null,
        longitude: null,
      });

      expect(schema).not.toHaveProperty("geo");
    });

    it("never emits geo for service_area mode even with valid coordinates", () => {
      const schema = buildLocalBusinessSchema({
        ...business,
        localPresence: "service_area",
        addressCity: "Detroit",
        addressState: "MI",
        latitude: 42.33,
        longitude: -83.14,
      });

      expect(schema).not.toHaveProperty("geo");
    });

    it("omits geo when coordinates are non-finite (NaN)", () => {
      const schema = buildLocalBusinessSchema({
        ...business,
        localPresence: "storefront",
        latitude: NaN,
        longitude: -83.14,
      });

      expect(schema).not.toHaveProperty("geo");
    });

    it("omits geo when coordinates are non-finite (Infinity)", () => {
      const schema = buildLocalBusinessSchema({
        ...business,
        localPresence: "storefront",
        latitude: Infinity,
        longitude: -83.14,
      });

      expect(schema).not.toHaveProperty("geo");
    });
  });
});

describe("buildBlogPostingSchema", () => {
  const page = {
    title: "How We Do It",
    slug: "how-we-do-it",
    createdAt: new Date("2026-06-01T12:00:00.000Z"),
    updatedAt: new Date("2026-06-02T12:00:00.000Z"),
  };

  it("emits a publisher Organization with the business name", () => {
    const schema = buildBlogPostingSchema(page, business);

    expect(schema.publisher).toMatchObject({
      "@type": "Organization",
      name: business.name,
    });
  });

  it("includes publisher.logo only when the business has an absolute logo URL", () => {
    const schema = buildBlogPostingSchema(page, {
      ...business,
      siteContent: {
        logoUrl:
          "https://storage.simplepress.test/business-sites/biz1/logo.png",
      },
    });

    expect(schema.publisher).toEqual({
      "@type": "Organization",
      name: business.name,
      logo: {
        "@type": "ImageObject",
        url: "https://storage.simplepress.test/business-sites/biz1/logo.png",
      },
    });
  });

  it("omits publisher.logo when the logo URL is relative (not absolute)", () => {
    const schema = buildBlogPostingSchema(page, {
      ...business,
      siteContent: { logoUrl: "/relative/logo.png" },
    });

    expect(schema.publisher).toEqual({
      "@type": "Organization",
      name: business.name,
    });
  });

  it("omits publisher.logo when there is no siteContent at all", () => {
    const schema = buildBlogPostingSchema(page, business);

    expect(schema.publisher).not.toHaveProperty("logo");
  });
});

describe("buildOrganizationSchema", () => {
  it("emits telephone and email when both are set", () => {
    const schema = buildOrganizationSchema({
      ...business,
      phoneNumber: "313-555-0100",
      supportEmail: "hello@testshop.com",
    });

    expect(schema.telephone).toBe("313-555-0100");
    expect(schema.email).toBe("hello@testshop.com");
  });

  it("omits telephone and email when neither is set", () => {
    const schema = buildOrganizationSchema(business);

    expect(schema).not.toHaveProperty("telephone");
    expect(schema).not.toHaveProperty("email");
  });
});

describe("buildProductSchema — description and gtin", () => {
  it("emits the description as plain text (tags stripped, entities decoded)", () => {
    const schema = buildProductSchema(
      {
        ...baseProduct,
        description: "<h2>Soft &amp; warm</h2><p>Hand-knit<br/>wool.</p>",
      },
      business,
    );
    expect(schema.description).toBe("Soft & warm Hand-knit wool.");
  });

  it("omits description when it is blank after stripping tags", () => {
    const schema = buildProductSchema(
      { ...baseProduct, description: "<p>  </p>" },
      business,
    );
    expect(schema).not.toHaveProperty("description");
  });

  it("emits a normalized gtin from a valid product barcode", () => {
    const schema = buildProductSchema(
      { ...baseProduct, barcode: "0360-00 291452" },
      business,
    );
    expect(schema.gtin).toBe("036000291452");
  });

  it("omits gtin for an invalid product barcode", () => {
    const schema = buildProductSchema(
      { ...baseProduct, barcode: "036000291453" },
      business,
    );
    expect(schema).not.toHaveProperty("gtin");
  });

  it("falls back to the single variant with a valid barcode", () => {
    const schema = buildProductSchema(
      {
        ...baseProduct,
        barcode: null,
        variants: [
          { price: 1000, inventoryQty: 1, barcode: "4006381333931" },
          { price: 1000, inventoryQty: 1, barcode: "not-a-gtin" },
          { price: 1000, inventoryQty: 1 },
        ],
      },
      business,
    );
    expect(schema.gtin).toBe("4006381333931");
  });

  it("omits gtin when two variants carry different valid barcodes", () => {
    const schema = buildProductSchema(
      {
        ...baseProduct,
        variants: [
          { price: 1000, inventoryQty: 1, barcode: "4006381333931" },
          { price: 1000, inventoryQty: 1, barcode: "036000291452" },
        ],
      },
      business,
    );
    expect(schema).not.toHaveProperty("gtin");
  });

  it("prefers the product barcode over variant barcodes", () => {
    const schema = buildProductSchema(
      {
        ...baseProduct,
        barcode: "96385074",
        variants: [{ price: 1000, inventoryQty: 1, barcode: "4006381333931" }],
      },
      business,
    );
    expect(schema.gtin).toBe("96385074");
  });
});

describe("buildProductSchema — merchant listing", () => {
  const shipping = {
    shippingType: "flat_rate_with_threshold",
    shippingFlatRate: 599,
    freeShippingThreshold: 5000,
    salesCountries: [],
    shippingDefaultItemWeightLb: 0,
    transitDaysMin: 2,
    transitDaysMax: 5,
  };
  const returns = {
    returnWindowDays: 30,
    returnFees: "free",
    returnShippingFeeCents: null,
    returnMethod: "by_mail",
    salesCountries: [],
  };

  it("leaves offers unchanged when merchant is not passed", () => {
    const schema = buildProductSchema(baseProduct, business);
    expect(schema.offers).toEqual({
      "@type": "Offer",
      price: "10.00",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: expect.any(String) as string,
    });
  });

  it("adds a single shippingDetails object and hasMerchantReturnPolicy to an Offer", () => {
    const schema = buildProductSchema(baseProduct, business, [], {
      merchant: {
        shipping,
        returns,
        returnPolicyUrl: "https://testshop.test/refund-policy",
      },
    });
    const offers = schema.offers as Record<string, unknown>;
    expect(offers.shippingDetails).toEqual({
      "@type": "OfferShippingDetails",
      shippingRate: {
        "@type": "MonetaryAmount",
        value: "5.99",
        currency: "USD",
      },
      shippingDestination: { "@type": "DefinedRegion", addressCountry: "US" },
      deliveryTime: {
        "@type": "ShippingDeliveryTime",
        transitTime: {
          "@type": "QuantitativeValue",
          minValue: 2,
          maxValue: 5,
          unitCode: "DAY",
        },
      },
    });
    expect(offers.hasMerchantReturnPolicy).toMatchObject({
      "@type": "MerchantReturnPolicy",
      merchantReturnDays: 30,
      merchantReturnLink: "https://testshop.test/refund-policy",
    });
  });

  it("prices shipping from the AggregateOffer lowPrice", () => {
    const schema = buildProductSchema(
      {
        ...baseProduct,
        price: 4000,
        variants: [
          { price: 4000, inventoryQty: 1 },
          { price: 6000, inventoryQty: 1 },
        ],
      },
      business,
      [],
      { merchant: { shipping, returns } },
    );
    const offers = schema.offers as Record<string, unknown>;
    expect(offers["@type"]).toBe("AggregateOffer");
    // lowPrice 40.00 is under the 50.00 threshold → flat rate applies.
    expect(offers.shippingDetails).toMatchObject({
      shippingRate: { value: "5.99" },
    });
  });

  it("uses the effective price for the free-shipping threshold", () => {
    const schema = buildProductSchema(
      { ...baseProduct, price: 5000 },
      business,
      [],
      { merchant: { shipping, returns } },
    );
    expect(
      (schema.offers as Record<string, unknown>).shippingDetails,
    ).toMatchObject({ shippingRate: { value: "0.00" } });
  });

  it("emits a shippingDetails array for multi-entry zone_weight stores", () => {
    const schema = buildProductSchema(
      { ...baseProduct, weight: 1, weightUnit: "lb" },
      business,
      [],
      {
        merchant: {
          shipping: {
            shippingType: "zone_weight",
            shippingFlatRate: null,
            freeShippingThreshold: null,
            salesCountries: [],
            shippingWeightTiers: [{ label: "All", minLb: 0, maxLb: null }],
            shippingFallbackRate: 1200,
            shippingDefaultItemWeightLb: 0,
            zones: [
              {
                name: "Local",
                states: ["MI"],
                rates: [{ tierIndex: 0, priceCents: 400 }],
              },
            ],
          },
          returns: { returnWindowDays: null },
        },
      },
    );
    const offers = schema.offers as Record<string, unknown>;
    expect(Array.isArray(offers.shippingDetails)).toBe(true);
    expect(offers.shippingDetails).toHaveLength(2);
    expect(offers).not.toHaveProperty("hasMerchantReturnPolicy");
  });

  it("omits shippingDetails when nothing can be priced", () => {
    const schema = buildProductSchema(baseProduct, business, [], {
      merchant: {
        shipping: {
          shippingType: "zone_weight",
          shippingFlatRate: null,
          freeShippingThreshold: null,
          shippingFallbackRate: null,
          zones: [],
        },
        returns,
      },
    });
    const offers = schema.offers as Record<string, unknown>;
    expect(offers).not.toHaveProperty("shippingDetails");
    expect(offers).toHaveProperty("hasMerchantReturnPolicy");
  });
});

describe("buildOrganizationSchema — return policy", () => {
  it("omits hasMerchantReturnPolicy by default", () => {
    expect(buildOrganizationSchema(business)).not.toHaveProperty(
      "hasMerchantReturnPolicy",
    );
  });

  it("emits hasMerchantReturnPolicy when given", () => {
    const returnPolicy = {
      "@type": "MerchantReturnPolicy",
      applicableCountry: "US",
      returnPolicyCountry: "US",
      returnPolicyCategory: "https://schema.org/MerchantReturnNotPermitted",
    };
    expect(
      buildOrganizationSchema(business, { returnPolicy })
        .hasMerchantReturnPolicy,
    ).toEqual(returnPolicy);
  });
});
