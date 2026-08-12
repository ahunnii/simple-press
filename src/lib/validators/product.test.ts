import type { ZodTypeAny } from "zod";
import { describe, expect, it } from "vitest";

import {
  productCreateSchema,
  productFormSchema,
  productUpdateSchema,
  variantSchema,
} from "./product";

const issuesFor = (schema: ZodTypeAny, input: unknown): string[] => {
  const result = schema.safeParse(input);
  return result.success
    ? []
    : result.error.issues.map(
        (issue) => `${issue.path.join(".")}: ${issue.message}`,
      );
};

describe("variantSchema", () => {
  const validVariant = {
    name: "Small",
    price: 10,
    inventoryQty: 5,
    options: { size: "Small" },
  };

  it("accepts a valid variant", () => {
    expect(variantSchema.safeParse(validVariant).success).toBe(true);
  });

  describe("name", () => {
    it("rejects an empty name", () => {
      expect(
        variantSchema.safeParse({ ...validVariant, name: "" }).success,
      ).toBe(false);
    });
  });

  describe("price", () => {
    it("rejects a negative price", () => {
      expect(
        variantSchema.safeParse({ ...validVariant, price: -1 }).success,
      ).toBe(false);
    });

    it("rejects Infinity as a price", () => {
      expect(
        variantSchema.safeParse({ ...validVariant, price: Infinity }).success,
      ).toBe(false);
    });

    it("accepts a price of 0", () => {
      expect(
        variantSchema.safeParse({ ...validVariant, price: 0 }).success,
      ).toBe(true);
    });
  });

  describe("inventoryQty", () => {
    it("rejects a negative inventoryQty", () => {
      expect(
        variantSchema.safeParse({ ...validVariant, inventoryQty: -1 }).success,
      ).toBe(false);
    });

    it("accepts an inventoryQty of 0", () => {
      expect(
        variantSchema.safeParse({ ...validVariant, inventoryQty: 0 }).success,
      ).toBe(true);
    });
  });

  describe("compareAtPrice", () => {
    it("rejects a compareAtPrice equal to price, reporting the error on the compareAtPrice path", () => {
      expect(
        issuesFor(variantSchema, { ...validVariant, compareAtPrice: 10 }),
      ).toEqual([
        "compareAtPrice: Compare-at price must be greater than price",
      ]);
    });

    it("rejects a compareAtPrice below price", () => {
      expect(
        variantSchema.safeParse({ ...validVariant, compareAtPrice: 5 }).success,
      ).toBe(false);
    });

    it("accepts a compareAtPrice above price", () => {
      expect(
        variantSchema.safeParse({ ...validVariant, compareAtPrice: 15 })
          .success,
      ).toBe(true);
    });

    it("accepts compareAtPrice omitted entirely", () => {
      expect(variantSchema.safeParse(validVariant).success).toBe(true);
    });
  });
});

describe("productFormSchema", () => {
  const validProduct = {
    name: "Test Product",
    slug: "test-product",
    price: 10,
    published: true,
    featured: false,
    trackInventory: true,
    allowBackorders: false,
  };

  it("accepts a valid product", () => {
    expect(productFormSchema.safeParse(validProduct).success).toBe(true);
  });

  describe("slug", () => {
    it("rejects an empty slug", () => {
      expect(
        productFormSchema.safeParse({ ...validProduct, slug: "" }).success,
      ).toBe(false);
    });
  });

  describe("price", () => {
    it("rejects a negative price", () => {
      expect(
        productFormSchema.safeParse({ ...validProduct, price: -1 }).success,
      ).toBe(false);
    });

    it("rejects Infinity as a price", () => {
      expect(
        productFormSchema.safeParse({ ...validProduct, price: Infinity })
          .success,
      ).toBe(false);
    });

    it("accepts a price of 0", () => {
      expect(
        productFormSchema.safeParse({ ...validProduct, price: 0 }).success,
      ).toBe(true);
    });
  });

  describe("cost", () => {
    it("rejects a negative cost", () => {
      expect(
        productFormSchema.safeParse({ ...validProduct, cost: -1 }).success,
      ).toBe(false);
    });

    it("rejects Infinity as a cost", () => {
      expect(
        productFormSchema.safeParse({ ...validProduct, cost: Infinity })
          .success,
      ).toBe(false);
    });

    it("accepts a cost of 0", () => {
      expect(
        productFormSchema.safeParse({ ...validProduct, cost: 0 }).success,
      ).toBe(true);
    });

    it("accepts a numeric string for cost because productFormSchema coerces", () => {
      expect(
        productFormSchema.safeParse({ ...validProduct, cost: "10" }).success,
      ).toBe(true);
    });
  });

  describe("weight", () => {
    it("rejects a negative weight", () => {
      expect(
        productFormSchema.safeParse({ ...validProduct, weight: -1 }).success,
      ).toBe(false);
    });

    it("rejects Infinity as a weight", () => {
      expect(
        productFormSchema.safeParse({ ...validProduct, weight: Infinity })
          .success,
      ).toBe(false);
    });

    it("accepts a weight of 0", () => {
      expect(
        productFormSchema.safeParse({ ...validProduct, weight: 0 }).success,
      ).toBe(true);
    });
  });

  describe("inventoryQty", () => {
    it("rejects a negative inventoryQty", () => {
      expect(
        productFormSchema.safeParse({ ...validProduct, inventoryQty: -1 })
          .success,
      ).toBe(false);
    });

    it("accepts an inventoryQty of 0", () => {
      expect(
        productFormSchema.safeParse({ ...validProduct, inventoryQty: 0 })
          .success,
      ).toBe(true);
    });
  });

  describe("compareAtPrice", () => {
    it("rejects a compareAtPrice equal to price, reporting the error on the compareAtPrice path", () => {
      expect(
        issuesFor(productFormSchema, { ...validProduct, compareAtPrice: 10 }),
      ).toEqual([
        "compareAtPrice: Compare-at price must be greater than price",
      ]);
    });

    it("rejects a compareAtPrice below price", () => {
      expect(
        productFormSchema.safeParse({ ...validProduct, compareAtPrice: 5 })
          .success,
      ).toBe(false);
    });

    it("accepts a compareAtPrice above price", () => {
      expect(
        productFormSchema.safeParse({ ...validProduct, compareAtPrice: 15 })
          .success,
      ).toBe(true);
    });

    it("accepts compareAtPrice omitted entirely", () => {
      expect(productFormSchema.safeParse(validProduct).success).toBe(true);
    });
  });
});

describe("productCreateSchema", () => {
  const validProduct = {
    name: "Test Product",
    slug: "test-product",
    price: 10,
    published: true,
    featured: false,
    trackInventory: true,
    allowBackorders: false,
    variants: [],
  };

  it("accepts a valid product", () => {
    expect(productCreateSchema.safeParse(validProduct).success).toBe(true);
  });

  describe("price, cost, and weight bounds", () => {
    it("rejects a negative price", () => {
      expect(
        productCreateSchema.safeParse({ ...validProduct, price: -1 }).success,
      ).toBe(false);
    });

    it("rejects Infinity as a price", () => {
      expect(
        productCreateSchema.safeParse({ ...validProduct, price: Infinity })
          .success,
      ).toBe(false);
    });

    it("rejects a negative cost", () => {
      expect(
        productCreateSchema.safeParse({ ...validProduct, cost: -1 }).success,
      ).toBe(false);
    });

    it("rejects Infinity as a cost", () => {
      expect(
        productCreateSchema.safeParse({ ...validProduct, cost: Infinity })
          .success,
      ).toBe(false);
    });

    it("rejects a negative weight", () => {
      expect(
        productCreateSchema.safeParse({ ...validProduct, weight: -1 }).success,
      ).toBe(false);
    });

    it("rejects Infinity as a weight", () => {
      expect(
        productCreateSchema.safeParse({ ...validProduct, weight: Infinity })
          .success,
      ).toBe(false);
    });

    it("accepts 0 for price, cost, and weight", () => {
      expect(
        productCreateSchema.safeParse({
          ...validProduct,
          price: 0,
          cost: 0,
          weight: 0,
        }).success,
      ).toBe(true);
    });
  });

  describe("compareAtPrice", () => {
    it("rejects a compareAtPrice equal to price, reporting the error on the compareAtPrice path", () => {
      expect(
        issuesFor(productCreateSchema, {
          ...validProduct,
          compareAtPrice: 10,
        }),
      ).toEqual([
        "compareAtPrice: Compare-at price must be greater than price",
      ]);
    });

    it("rejects a compareAtPrice below price", () => {
      expect(
        productCreateSchema.safeParse({ ...validProduct, compareAtPrice: 5 })
          .success,
      ).toBe(false);
    });

    it("accepts a compareAtPrice above price", () => {
      expect(
        productCreateSchema.safeParse({ ...validProduct, compareAtPrice: 15 })
          .success,
      ).toBe(true);
    });

    it("accepts compareAtPrice omitted entirely", () => {
      expect(productCreateSchema.safeParse(validProduct).success).toBe(true);
    });
  });

  describe("sku, featured, and cost", () => {
    it("round-trips sku, featured, and cost unchanged", () => {
      const result = productCreateSchema.safeParse({
        ...validProduct,
        sku: "SKU-123",
        featured: true,
        cost: 4.5,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sku).toBe("SKU-123");
        expect(result.data.featured).toBe(true);
        expect(result.data.cost).toBe(4.5);
      }
    });

    it("rejects a sku over 100 characters", () => {
      expect(
        productCreateSchema.safeParse({
          ...validProduct,
          sku: "a".repeat(101),
        }).success,
      ).toBe(false);
    });
  });

  describe("coercion", () => {
    it("rejects a numeric string for cost because productCreateSchema does not coerce", () => {
      expect(
        productCreateSchema.safeParse({ ...validProduct, cost: "10" }).success,
      ).toBe(false);
    });
  });
});

describe("productUpdateSchema", () => {
  const validProduct = {
    id: "prod_1",
    name: "Test Product",
    slug: "test-product",
    price: 10,
    published: true,
    featured: false,
    trackInventory: true,
    allowBackorders: false,
    variants: [],
  };

  it("accepts a valid product", () => {
    expect(productUpdateSchema.safeParse(validProduct).success).toBe(true);
  });

  describe("compareAtPrice", () => {
    it("rejects a compareAtPrice equal to price, reporting the error on the compareAtPrice path", () => {
      expect(
        issuesFor(productUpdateSchema, {
          ...validProduct,
          compareAtPrice: 10,
        }),
      ).toEqual([
        "compareAtPrice: Compare-at price must be greater than price",
      ]);
    });

    it("rejects a compareAtPrice below price", () => {
      expect(
        productUpdateSchema.safeParse({ ...validProduct, compareAtPrice: 5 })
          .success,
      ).toBe(false);
    });

    it("accepts a compareAtPrice above price", () => {
      expect(
        productUpdateSchema.safeParse({ ...validProduct, compareAtPrice: 15 })
          .success,
      ).toBe(true);
    });

    it("accepts compareAtPrice omitted entirely", () => {
      expect(productUpdateSchema.safeParse(validProduct).success).toBe(true);
    });
  });

  describe("sku, featured, and cost", () => {
    it("round-trips sku, featured, and cost unchanged", () => {
      const result = productUpdateSchema.safeParse({
        ...validProduct,
        sku: "SKU-123",
        featured: true,
        cost: 4.5,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sku).toBe("SKU-123");
        expect(result.data.featured).toBe(true);
        expect(result.data.cost).toBe(4.5);
      }
    });
  });
});
