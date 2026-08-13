import { describe, expect, it } from "vitest";

import { pageMetaSchema, STATIC_SEO_ROUTES } from "./site-seo";

/**
 * The `pageMetaSchema` validator enforces that only known route keys are
 * accepted in the record. This protects against unbounded key growth in the
 * `SiteContent.pageMeta` JSON column, which is selected on every storefront
 * render via `business.simplifiedGet`.
 *
 * The read path (`parsePageMeta`) already drops unknown keys, so writes must
 * match: unknown keys are rejected at validation time rather than preserved.
 */
describe("pageMetaSchema — route key validation", () => {
  const validKeys = STATIC_SEO_ROUTES.map((r) => r.key);

  it("accepts an empty record", () => {
    const result = pageMetaSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({});
    }
  });

  it("accepts a record with a single valid route key", () => {
    const result = pageMetaSchema.safeParse({
      shop: {
        title: "Shop Our Products",
        description: "Browse our full collection",
      },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        shop: {
          title: "Shop Our Products",
          description: "Browse our full collection",
        },
      });
    }
  });

  it("accepts a record with multiple valid route keys", () => {
    const result = pageMetaSchema.safeParse({
      about: { title: "About Us" },
      contact: { description: "Get in touch" },
      shop: { title: "Shop" },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(Object.keys(result.data)).toHaveLength(3);
    }
  });

  it("accepts a record with all valid route keys", () => {
    const data: Record<string, unknown> = {};
    for (const route of STATIC_SEO_ROUTES) {
      data[route.key] = { title: `${route.label} Title` };
    }
    const result = pageMetaSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(Object.keys(result.data)).toHaveLength(validKeys.length);
    }
  });

  it("rejects a record with a single unknown key", () => {
    const result = pageMetaSchema.safeParse({
      unknownRoute: {
        title: "This should fail",
      },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toHaveLength(1);
      expect(result.error.issues[0]?.message).toBe(
        "unknown page key: unknownRoute",
      );
    }
  });

  it("rejects a record with an unknown key mixed with valid keys", () => {
    const result = pageMetaSchema.safeParse({
      shop: { title: "Shop" },
      invalidKey: { title: "Invalid" },
      about: { title: "About" },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) =>
        issue.message.includes("unknown page key: invalidKey"),
      )).toBe(true);
    }
  });

  it("rejects a record with multiple unknown keys", () => {
    const result = pageMetaSchema.safeParse({
      unknownOne: { title: "Unknown 1" },
      unknownTwo: { title: "Unknown 2" },
      unknownThree: { title: "Unknown 3" },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      // Should have 3 issues, one per unknown key
      expect(result.error.issues).toHaveLength(3);
      const messages = result.error.issues.map((issue) => issue.message);
      expect(messages).toContain("unknown page key: unknownOne");
      expect(messages).toContain("unknown page key: unknownTwo");
      expect(messages).toContain("unknown page key: unknownThree");
    }
  });

  it("rejects a record with a huge number of unknown keys", () => {
    const data: Record<string, unknown> = {};
    for (let i = 0; i < 100; i++) {
      data[`fakeRoute${i}`] = { title: "Fake" };
    }
    const result = pageMetaSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      // Should have 100 issues, one per unknown key
      expect(result.error.issues).toHaveLength(100);
    }
  });

  it("allows valid entries with optional fields", () => {
    const result = pageMetaSchema.safeParse({
      shop: {
        title: "Shop",
      },
      about: {
        description: "About us",
      },
      contact: {
        ogImage: "https://example.com/og.jpg",
      },
    });
    expect(result.success).toBe(true);
  });

  it("strips unknown fields from entry objects (Zod default behavior)", () => {
    const result = pageMetaSchema.safeParse({
      shop: {
        title: "Shop",
        description: "Description",
        invalidField: "Should be stripped",
      },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.shop).toEqual({
        title: "Shop",
        description: "Description",
      });
      expect(result.data.shop).not.toHaveProperty("invalidField");
    }
  });
});
