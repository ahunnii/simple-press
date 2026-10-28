import { describe, expect, it } from "vitest";

import {
  buildBlogPostingSchema,
  buildEventSchema,
  buildLocalBusinessSchema,
  buildOrganizationSchema,
  buildProductSchema,
  buildVideoObjectSchema,
  buildWebSiteSchema,
  parseEventPrice,
} from "./structured-data";

const business = {
  subdomain: "testshop",
  customDomain: null,
  domainStatus: null,
  name: "Test Shop",
};

describe("buildEventSchema", () => {
  const baseEvent = {
    name: "Market Day",
    slug: "market-day",
    startAt: new Date("2026-08-15T19:00:00.000Z"),
    allDay: false,
  };
  const build = (extra: Record<string, unknown>) =>
    buildEventSchema({ ...baseEvent, ...extra }, business, "America/Detroit");

  it("emits a priced InStock Offer pointing at the event page when priceLabel has a dollar amount", () => {
    expect(build({ priceLabel: "$25 per person" }).offers).toEqual({
      "@type": "Offer",
      price: "25.00",
      priceCurrency: "USD",
      url: "https://testshop.simplepress.test/events/market-day",
      availability: "https://schema.org/InStock",
    });
  });

  it("uses externalUrl as the Offer url when set", () => {
    expect(
      build({
        priceLabel: "$10",
        externalUrl: "https://tickets.example.com/market",
      }).offers,
    ).toMatchObject({
      price: "10.00",
      url: "https://tickets.example.com/market",
    });
  });

  it("reads the first amount of a range label", () => {
    expect(build({ priceLabel: "$10–$20" }).offers).toMatchObject({
      price: "10.00",
    });
  });

  it("emits price 0 for a free label", () => {
    expect(build({ priceLabel: "Free" }).offers).toMatchObject({
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    });
  });

  it("emits a url-only Offer when the label is unparseable but externalUrl exists", () => {
    expect(
      build({
        priceLabel: "Sliding scale",
        externalUrl: "https://tickets.example.com/market",
      }).offers,
    ).toEqual({ "@type": "Offer", url: "https://tickets.example.com/market" });
  });

  it("omits offers when the label is unparseable/absent and there is no externalUrl", () => {
    expect(build({ priceLabel: "Sliding scale" })).not.toHaveProperty("offers");
    expect(build({})).not.toHaveProperty("offers");
    expect(build({ priceLabel: "  ", externalUrl: " " })).not.toHaveProperty(
      "offers",
    );
  });

  it("sets eventAttendanceMode to offline only when a location is set", () => {
    expect(build({ location: "Eastern Market" }).eventAttendanceMode).toBe(
      "https://schema.org/OfflineEventAttendanceMode",
    );
    expect(build({})).not.toHaveProperty("eventAttendanceMode");
    expect(build({ location: null })).not.toHaveProperty("eventAttendanceMode");
  });

  it("emits image once, from coverImage", () => {
    const schema = build({
      coverImage: "https://cdn.example.com/flier.jpg",
    });
    expect(schema.image).toBe("https://cdn.example.com/flier.jpg");
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

describe("parseEventPrice", () => {
  it.each([
    ["$25 per person", "25.00"],
    ["$25", "25.00"],
    ["$7.5 at the door", "7.50"],
    ["$12.99", "12.99"],
    ["$ 30", "30.00"],
    ["$10–$20", "10.00"],
    ["$1,200 per table", "1200.00"],
    ["Adults $15, kids free", "15.00"],
    ["Free", "0"],
    ["FREE admission", "0"],
    ["No charge", "0"],
    ["Complimentary", "0"],
  ])("parses %j as %j", (label, expected) => {
    expect(parseEventPrice(label)).toBe(expected);
  });

  it.each([
    ["Sliding scale"],
    ["Donation"],
    ["Ages 5-10"],
    ["2 for 1"],
    ["Carefree fun"],
    ["$"],
    [""],
    ["   "],
    [null],
    [undefined],
  ])("returns null for %j", (label) => {
    expect(parseEventPrice(label)).toBeNull();
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

/** buildProductSchema for fixtures that are expected to produce a Product. */
function productSchemaOf(
  ...args: Parameters<typeof buildProductSchema>
): Record<string, unknown> {
  const schema = buildProductSchema(...args);
  if (!schema) throw new Error("expected a Product schema, got null");
  return schema;
}

describe("buildProductSchema", () => {
  it("emits an array of every absolute product image URL", () => {
    const schema = productSchemaOf(
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
    const schema = productSchemaOf(
      { ...baseProduct, images: [{ url: "/relative/only.jpg" }] },
      business,
    );

    expect(schema).not.toHaveProperty("image");
  });

  it("emits a single Offer when there is only one variant", () => {
    const schema = productSchemaOf(
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
    const schema = productSchemaOf(
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
    const schema = productSchemaOf(
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
    const schema = productSchemaOf(
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

  it("prefers ogImage over image", () => {
    const schema = buildBlogPostingSchema(
      {
        ...page,
        ogImage: "https://cdn.example.com/og.jpg",
        image: "https://cdn.example.com/cover.jpg",
      },
      business,
    );

    expect(schema.image).toBe("https://cdn.example.com/og.jpg");
  });

  it("falls back to image when ogImage is null or blank", () => {
    for (const ogImage of [null, "", "   "]) {
      const schema = buildBlogPostingSchema(
        { ...page, ogImage, image: "https://cdn.example.com/cover.jpg" },
        business,
      );
      expect(schema.image).toBe("https://cdn.example.com/cover.jpg");
    }
  });

  it("omits image when neither is set", () => {
    expect(buildBlogPostingSchema(page, business)).not.toHaveProperty("image");
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

  it("emits description from siteContent.metaDescription, trimmed", () => {
    const schema = buildOrganizationSchema({
      ...business,
      siteContent: { metaDescription: "  Handmade candles in Detroit.  " },
    });

    expect(schema.description).toBe("Handmade candles in Detroit.");
  });

  it("omits description when metaDescription is null, blank, or absent", () => {
    for (const metaDescription of [null, "", "   "]) {
      expect(
        buildOrganizationSchema({
          ...business,
          siteContent: { metaDescription },
        }),
      ).not.toHaveProperty("description");
    }
    expect(buildOrganizationSchema(business)).not.toHaveProperty("description");
  });

  it("omits telephone and email when neither is set", () => {
    const schema = buildOrganizationSchema(business);

    expect(schema).not.toHaveProperty("telephone");
    expect(schema).not.toHaveProperty("email");
  });
});

describe("buildProductSchema — description and gtin", () => {
  it("emits the description as plain text (tags stripped, entities decoded)", () => {
    const schema = productSchemaOf(
      {
        ...baseProduct,
        description: "<h2>Soft &amp; warm</h2><p>Hand-knit<br/>wool.</p>",
      },
      business,
    );
    expect(schema.description).toBe("Soft & warm Hand-knit wool.");
  });

  it("omits description when it is blank after stripping tags", () => {
    const schema = productSchemaOf(
      { ...baseProduct, description: "<p>  </p>" },
      business,
    );
    expect(schema).not.toHaveProperty("description");
  });

  it("emits a normalized gtin from a valid product barcode", () => {
    const schema = productSchemaOf(
      { ...baseProduct, barcode: "0360-00 291452" },
      business,
    );
    expect(schema.gtin).toBe("036000291452");
  });

  it("omits gtin for an invalid product barcode", () => {
    const schema = productSchemaOf(
      { ...baseProduct, barcode: "036000291453" },
      business,
    );
    expect(schema).not.toHaveProperty("gtin");
  });

  it("falls back to the single variant with a valid barcode", () => {
    const schema = productSchemaOf(
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
    const schema = productSchemaOf(
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
    const schema = productSchemaOf(
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
    const schema = productSchemaOf(baseProduct, business);
    expect(schema.offers).toEqual({
      "@type": "Offer",
      price: "10.00",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: expect.any(String) as string,
    });
  });

  it("adds a single shippingDetails object and hasMerchantReturnPolicy to an Offer", () => {
    const schema = productSchemaOf(baseProduct, business, [], {
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
    const schema = productSchemaOf(
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
    const schema = productSchemaOf(
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
    const schema = productSchemaOf(
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
    const schema = productSchemaOf(baseProduct, business, [], {
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

describe("buildWebSiteSchema — SearchAction", () => {
  it("omits potentialAction by default (site search off)", () => {
    expect(buildWebSiteSchema(business)).not.toHaveProperty("potentialAction");
    expect(
      buildWebSiteSchema(business, { siteSearch: false }),
    ).not.toHaveProperty("potentialAction");
  });

  it("emits a /search SearchAction when site search is on", () => {
    const schema = buildWebSiteSchema(
      { ...business, customDomain: "shop.example.com", domainStatus: "ACTIVE" },
      { siteSearch: true },
    );
    expect(schema.potentialAction).toEqual({
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: "https://shop.example.com/search?q={search_term_string}",
      },
      "query-input": "required name=search_term_string",
    });
  });
});

describe("entity ids and alternateName", () => {
  // Derive the base URL from the builder's own `url`, so the test does not
  // hard-code the platform root domain.
  const baseUrl = buildWebSiteSchema(business).url as string;
  const orgId = `${baseUrl}/#organization`;

  it("gives Organization and LocalBusiness the same @id (one merged entity)", () => {
    const org = buildOrganizationSchema(business);
    const local = buildLocalBusinessSchema({
      ...business,
      localPresence: "storefront",
    });
    expect(org["@id"]).toBe(orgId);
    expect(local["@id"]).toBe(orgId);
  });

  it("gives WebSite its own @id and points publisher at the Organization", () => {
    const site = buildWebSiteSchema(business);
    expect(site["@id"]).toBe(`${baseUrl}/#website`);
    expect(site.publisher).toEqual({ "@id": orgId });
  });

  it("orders keys readably: @context, @type, @id, name, alternateName, url", () => {
    const schema = buildOrganizationSchema({
      ...business,
      siteContent: { seoBrandName: "Shop" },
    });
    expect(Object.keys(schema).slice(0, 5)).toEqual([
      "@context",
      "@type",
      "@id",
      "name",
      "alternateName",
    ]);
  });

  it("emits alternateName on Organization and WebSite when seoBrandName differs", () => {
    const withBrand = { ...business, siteContent: { seoBrandName: " TS " } };
    expect(buildOrganizationSchema(withBrand).alternateName).toBe("TS");
    expect(buildWebSiteSchema(withBrand).alternateName).toBe("TS");
  });

  it.each([
    ["blank", "   "],
    ["null", null],
    ["equal to the name", "Test Shop"],
    ["equal ignoring case and padding", "  TEST shop "],
  ])("omits alternateName when seoBrandName is %s", (_label, seoBrandName) => {
    const b = { ...business, siteContent: { seoBrandName } };
    expect(buildOrganizationSchema(b)).not.toHaveProperty("alternateName");
    expect(buildWebSiteSchema(b)).not.toHaveProperty("alternateName");
  });

  it("omits alternateName when there is no siteContent", () => {
    expect(buildWebSiteSchema(business)).not.toHaveProperty("alternateName");
  });
});

describe("buildLocalBusinessSchema — service_area full address", () => {
  it("includes region and postal code when given, never the street", () => {
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
});

describe("buildProductSchema — coming-soon (price 0)", () => {
  const review = {
    rating: 5,
    customerName: "Sam",
    comment: "Lovely",
    reviewDate: new Date("2026-06-01T12:00:00.000Z"),
  };

  it("returns null for a $0 product with no reviews", () => {
    expect(
      buildProductSchema({ ...baseProduct, price: 0 }, business),
    ).toBeNull();
  });

  it("returns null for a $0 product with $0/inheriting variants and no reviews", () => {
    expect(
      buildProductSchema(
        {
          ...baseProduct,
          price: 0,
          variants: [
            { price: 0, inventoryQty: 0 },
            { price: null, inventoryQty: 0 },
          ],
        },
        business,
      ),
    ).toBeNull();
  });

  it("returns null for $0 even when merchant data is supplied", () => {
    expect(
      buildProductSchema({ ...baseProduct, price: 0 }, business, [], {
        merchant: {
          shipping: {
            shippingType: "flat_rate",
            shippingFlatRate: 599,
            freeShippingThreshold: null,
            salesCountries: [],
            shippingDefaultItemWeightLb: 0,
            transitDaysMin: 2,
            transitDaysMax: 5,
          },
          returns: {},
        } as never,
      }),
    ).toBeNull();
  });

  it("keeps the Product but omits offers when a $0 product has an aggregateRating", () => {
    const schema = productSchemaOf(
      { ...baseProduct, price: 0, averageRating: 4.5, reviewCount: 2 },
      business,
    );

    expect(schema["@type"]).toBe("Product");
    expect(schema).not.toHaveProperty("offers");
    expect(schema.aggregateRating).toMatchObject({
      "@type": "AggregateRating",
      ratingValue: "4.5",
      reviewCount: 2,
    });
  });

  it("keeps the Product but omits offers when a $0 product has reviews", () => {
    const schema = productSchemaOf({ ...baseProduct, price: 0 }, business, [
      review,
    ]);

    expect(schema).not.toHaveProperty("offers");
    expect(schema.review).toHaveLength(1);
  });

  it("returns null when reviews exist but are switched off and the price is $0", () => {
    expect(
      buildProductSchema(
        { ...baseProduct, price: 0, averageRating: 4.5, reviewCount: 2 },
        business,
        [review],
        { includeReviews: false },
      ),
    ).toBeNull();
  });

  it("still emits an Offer for a $0 base price when a variant has its own positive price", () => {
    const schema = productSchemaOf(
      {
        ...baseProduct,
        price: 0,
        variants: [
          { price: 0, inventoryQty: 5 },
          { price: 1500, inventoryQty: 5 },
        ],
      },
      business,
    );

    expect(schema.offers).toMatchObject({ "@type": "Offer", price: "15.00" });
  });

  it("keeps a positive-price product's Offer unchanged", () => {
    const schema = productSchemaOf({ ...baseProduct, price: 2500 }, business);

    expect(schema.offers).toEqual({
      "@type": "Offer",
      price: "25.00",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: expect.any(String) as string,
    });
  });
});
