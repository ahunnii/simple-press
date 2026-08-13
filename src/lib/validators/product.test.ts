import type { ZodTypeAny } from "zod";
import { describe, expect, it } from "vitest";
import { z } from "zod";

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

    it("reports the negative-price message on the price path", () => {
      expect(issuesFor(variantSchema, { ...validVariant, price: -1 })).toEqual([
        "price: Price can't be negative",
      ]);
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

    it("requires a price — `z.coerce.number()` turns a missing one into NaN rather than skipping it", () => {
      // The variant rows in the product form leave price blank to mean "inherit
      // the base product price", so anything validating a row against this
      // schema has to substitute that base price first (which is what the
      // submit path does: `price: v.price ?? priceInCents`).
      const withoutPrice: Record<string, unknown> = { ...validVariant };
      delete withoutPrice.price;
      expect(variantSchema.safeParse(withoutPrice).success).toBe(false);
    });
  });

  describe("inventoryQty", () => {
    it("rejects a negative inventoryQty", () => {
      expect(
        variantSchema.safeParse({ ...validVariant, inventoryQty: -1 }).success,
      ).toBe(false);
    });

    it("reports the negative-quantity message on the inventoryQty path", () => {
      expect(
        issuesFor(variantSchema, { ...validVariant, inventoryQty: -1 }),
      ).toEqual(["inventoryQty: Quantity can't be negative"]);
    });

    it("rejects a fractional inventoryQty", () => {
      expect(
        issuesFor(variantSchema, { ...validVariant, inventoryQty: 1.5 }),
      ).toEqual(["inventoryQty: Quantity must be a whole number"]);
    });

    it("accepts an inventoryQty of 0", () => {
      expect(
        variantSchema.safeParse({ ...validVariant, inventoryQty: 0 }).success,
      ).toBe(true);
    });
  });

  describe("compareAtPrice", () => {
    it("rejects a negative compareAtPrice", () => {
      // Two issues, not one: a failing field leaves the parse "dirty" rather
      // than aborted, so the `.refine` still runs and adds its own message on
      // the same path. Anything mapping issues back to a row has to tolerate
      // more than one per field.
      expect(
        issuesFor(variantSchema, { ...validVariant, compareAtPrice: -1 }),
      ).toEqual([
        "compareAtPrice: Compare-at price can't be negative",
        "compareAtPrice: Compare-at price must be greater than price",
      ]);
    });

    it("accepts an explicitly undefined compareAtPrice", () => {
      expect(
        variantSchema.safeParse({ ...validVariant, compareAtPrice: undefined })
          .success,
      ).toBe(true);
    });

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

/**
 * Variants live in `useState` in the product form, not in React Hook Form, so
 * `productFormSchema.variants` is always `undefined` at the resolver and the
 * server is the only thing that has ever rejected a bad row — as a raw tRPC 400
 * with no field association. The form now parses the rows itself against
 * `z.array(variantSchema)` and maps each issue back onto a row by reading
 * `issue.path[0]` as the array index.
 *
 * That index is the whole contract. If Zod stopped putting it first, or a
 * wrapper flattened the path, every message would pile onto row 0 (or vanish)
 * with no other symptom — so it is asserted explicitly here rather than left
 * implied by the per-field tests above.
 */
describe("z.array(variantSchema)", () => {
  const variantArraySchema = z.array(variantSchema);

  const validVariant = {
    name: "Small",
    price: 10,
    inventoryQty: 5,
    options: { size: "Small" },
  };

  it("accepts an empty array", () => {
    expect(variantArraySchema.safeParse([]).success).toBe(true);
  });

  it("accepts an array of valid variants", () => {
    expect(
      variantArraySchema.safeParse([validVariant, validVariant]).success,
    ).toBe(true);
  });

  it("puts the row index first in `issue.path` for a field error", () => {
    const result = variantArraySchema.safeParse([
      validVariant,
      { ...validVariant, price: -1 },
    ]);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path[0]).toBe(1);
      expect(result.error.issues[0]?.path).toEqual([1, "price"]);
    }
  });

  it("puts the row index first in `issue.path` for the compare-at refinement", () => {
    const result = variantArraySchema.safeParse([
      validVariant,
      validVariant,
      { ...validVariant, price: 10, compareAtPrice: 5 },
    ]);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path[0]).toBe(2);
      expect(result.error.issues[0]?.path).toEqual([2, "compareAtPrice"]);
    }
  });

  it("reports every bad row, not just the first", () => {
    const result = variantArraySchema.safeParse([
      { ...validVariant, inventoryQty: -1 },
      validVariant,
      { ...validVariant, inventoryQty: 2.5 },
    ]);

    expect(result.success).toBe(false);
    if (!result.success) {
      const rowIndexes = result.error.issues.map((issue) => issue.path[0]);
      expect(rowIndexes).toContain(0);
      expect(rowIndexes).toContain(2);
      expect(rowIndexes).not.toContain(1);
    }
  });

  it("yields a row index usable as a `Record<number, string>` key", () => {
    const result = variantArraySchema.safeParse([
      validVariant,
      { ...validVariant, inventoryQty: -1 },
    ]);

    expect(result.success).toBe(false);
    if (!result.success) {
      const byRow: Record<number, string> = {};
      for (const issue of result.error.issues) {
        const row = issue.path[0];
        if (typeof row === "number" && byRow[row] === undefined) {
          byRow[row] = issue.message;
        }
      }

      expect(Object.keys(byRow)).toEqual(["1"]);
      expect(byRow[1]).toBe("Quantity can't be negative");
    }
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

    it("rejects a fractional price (wire-level price is whole cents)", () => {
      expect(
        productCreateSchema.safeParse({ ...validProduct, price: 10.5 })
          .success,
      ).toBe(false);
    });

    it("rejects a fractional cost (wire-level cost is whole cents)", () => {
      expect(
        productCreateSchema.safeParse({ ...validProduct, cost: 4.5 }).success,
      ).toBe(false);
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
        cost: 450,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sku).toBe("SKU-123");
        expect(result.data.featured).toBe(true);
        expect(result.data.cost).toBe(450);
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

  describe("price and cost bounds", () => {
    it("rejects a fractional price (wire-level price is whole cents)", () => {
      expect(
        productUpdateSchema.safeParse({ ...validProduct, price: 10.5 })
          .success,
      ).toBe(false);
    });

    it("rejects a fractional cost (wire-level cost is whole cents)", () => {
      expect(
        productUpdateSchema.safeParse({ ...validProduct, cost: 4.5 }).success,
      ).toBe(false);
    });
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
        cost: 450,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sku).toBe("SKU-123");
        expect(result.data.featured).toBe(true);
        expect(result.data.cost).toBe(450);
      }
    });
  });
});
