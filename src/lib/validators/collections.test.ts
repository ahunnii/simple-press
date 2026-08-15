import { describe, expect, it } from "vitest";

import * as collectionsModule from "./collections";
import {
  collectionCreateSchema,
  collectionFormSchema,
  collectionUpdateSchema,
} from "./collections";

describe("collectionFormSchema", () => {
  const validCollection = {
    name: "Summer Collection",
    slug: "summer-collection",
    published: true,
    productIds: [],
  };

  it("accepts a fully-valid payload", () => {
    expect(collectionFormSchema.safeParse(validCollection).success).toBe(true);
  });

  describe("name", () => {
    it("rejects an empty name", () => {
      expect(
        collectionFormSchema.safeParse({ ...validCollection, name: "" })
          .success,
      ).toBe(false);
    });

    it("rejects a name over 120 characters", () => {
      expect(
        collectionFormSchema.safeParse({
          ...validCollection,
          name: "a".repeat(121),
        }).success,
      ).toBe(false);
    });

    it("accepts a name of exactly 120 characters", () => {
      expect(
        collectionFormSchema.safeParse({
          ...validCollection,
          name: "a".repeat(120),
        }).success,
      ).toBe(true);
    });
  });

  describe("slug", () => {
    it("accepts a normal slug", () => {
      expect(
        collectionFormSchema.safeParse({
          ...validCollection,
          slug: "summer-collection",
        }).success,
      ).toBe(true);
    });

    it("rejects an empty slug with the 'Slug is required' message", () => {
      const result = collectionFormSchema.safeParse({
        ...validCollection,
        slug: "",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.map((issue) => issue.message)).toContain(
          "Slug is required",
        );
      }
    });

    it("rejects a slug containing spaces", () => {
      expect(
        collectionFormSchema.safeParse({
          ...validCollection,
          slug: "summer collection",
        }).success,
      ).toBe(false);
    });

    it("rejects characters outside the allowed set", () => {
      expect(
        collectionFormSchema.safeParse({
          ...validCollection,
          slug: "summer/collection",
        }).success,
      ).toBe(false);
    });

    it("accepts uppercase letters because the regex is case-insensitive", () => {
      expect(
        collectionFormSchema.safeParse({
          ...validCollection,
          slug: "Summer-Collection",
        }).success,
      ).toBe(true);
    });

    it("accepts dots, dashes, tildes, and underscores", () => {
      expect(
        collectionFormSchema.safeParse({
          ...validCollection,
          slug: "summer.collection_2026~v2",
        }).success,
      ).toBe(true);
    });

    it("rejects a slug over 255 characters", () => {
      expect(
        collectionFormSchema.safeParse({
          ...validCollection,
          slug: "a".repeat(256),
        }).success,
      ).toBe(false);
    });

    it("accepts a slug of exactly 255 characters", () => {
      expect(
        collectionFormSchema.safeParse({
          ...validCollection,
          slug: "a".repeat(255),
        }).success,
      ).toBe(true);
    });
  });

  describe("metaTitle", () => {
    it("accepts a metaTitle of exactly 70 characters", () => {
      expect(
        collectionFormSchema.safeParse({
          ...validCollection,
          metaTitle: "a".repeat(70),
        }).success,
      ).toBe(true);
    });

    it("rejects a metaTitle over 70 characters", () => {
      expect(
        collectionFormSchema.safeParse({
          ...validCollection,
          metaTitle: "a".repeat(71),
        }).success,
      ).toBe(false);
    });
  });

  describe("metaDescription", () => {
    it("accepts a metaDescription of exactly 200 characters", () => {
      expect(
        collectionFormSchema.safeParse({
          ...validCollection,
          metaDescription: "a".repeat(200),
        }).success,
      ).toBe(true);
    });

    it("rejects a metaDescription over 200 characters", () => {
      expect(
        collectionFormSchema.safeParse({
          ...validCollection,
          metaDescription: "a".repeat(201),
        }).success,
      ).toBe(false);
    });
  });

  describe("productIds", () => {
    it("accepts exactly 500 productIds", () => {
      const productIds = Array.from({ length: 500 }, (_, i) => `prod_${i}`);
      expect(
        collectionFormSchema.safeParse({ ...validCollection, productIds })
          .success,
      ).toBe(true);
    });

    it("rejects more than 500 productIds", () => {
      const productIds = Array.from({ length: 501 }, (_, i) => `prod_${i}`);
      expect(
        collectionFormSchema.safeParse({ ...validCollection, productIds })
          .success,
      ).toBe(false);
    });
  });
});

describe("collectionCreateSchema", () => {
  const validCollection = {
    name: "Summer Collection",
    slug: "summer-collection",
    published: true,
    productIds: [],
  };

  it("derives cleanly from collectionFormSchema and accepts a valid payload", () => {
    expect(collectionCreateSchema.safeParse(validCollection).success).toBe(
      true,
    );
  });

  it("omits imageFile from its shape", () => {
    expect("imageFile" in collectionCreateSchema.shape).toBe(false);
  });

  it("still requires slug", () => {
    const result = collectionCreateSchema.safeParse({
      ...validCollection,
      slug: "",
    });
    expect(result.success).toBe(false);
  });

  it("strips an imageFile key silently rather than erroring, since omit() drops it from the shape", () => {
    const result = collectionCreateSchema.safeParse({
      ...validCollection,
      imageFile: "not-a-file",
    });
    expect(result.success).toBe(true);
  });
});

describe("collectionUpdateSchema", () => {
  const validCollection = {
    id: "col_1",
    name: "Summer Collection",
    slug: "summer-collection",
    published: true,
    productIds: [],
  };

  it("derives cleanly from collectionFormSchema and accepts a valid payload", () => {
    expect(collectionUpdateSchema.safeParse(validCollection).success).toBe(
      true,
    );
  });

  it("omits imageFile from its shape", () => {
    expect("imageFile" in collectionUpdateSchema.shape).toBe(false);
  });

  it("still requires slug", () => {
    const result = collectionUpdateSchema.safeParse({
      ...validCollection,
      slug: "",
    });
    expect(result.success).toBe(false);
  });

  it("requires id", () => {
    const withoutId = {
      name: "Summer Collection",
      slug: "summer-collection",
      published: true,
      productIds: [],
    };
    expect(collectionUpdateSchema.safeParse(withoutId).success).toBe(false);
  });
});

describe("collectionSetProductsSchema removal", () => {
  it("is no longer exported from the collections validator module", () => {
    expect(
      (collectionsModule as Record<string, unknown>)
        .collectionSetProductsSchema,
    ).toBeUndefined();
  });
});
