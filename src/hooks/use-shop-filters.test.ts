import { describe, expect, it } from "vitest";

import type { Product } from "~/types";

import { isInStock } from "./use-shop-filters";

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "p1",
    name: "Widget",
    slug: "widget",
    description: null,
    price: 1_000,
    compareAtPrice: null,
    trackInventory: true,
    inventoryQty: 0,
    allowBackorders: false,
    baseUnitsConsumed: null,
    additionalFields: null,
    images: [],
    variants: [],
    collectionProducts: [],
    baseInventoryUnit: undefined,
    ...overrides,
  } as unknown as Product;
}

describe("isInStock", () => {
  it("is always in stock when trackInventory is false", () => {
    expect(
      isInStock(makeProduct({ trackInventory: false, inventoryQty: 0 })),
    ).toBe(true);
  });

  it("is always in stock when allowBackorders is true", () => {
    expect(
      isInStock(
        makeProduct({
          trackInventory: true,
          allowBackorders: true,
          inventoryQty: 0,
        }),
      ),
    ).toBe(true);
  });

  describe("pool-based (baseInventoryUnit)", () => {
    it("is in stock when the pool has inventory", () => {
      expect(
        isInStock(
          makeProduct({
            trackInventory: true,
            allowBackorders: false,
            baseInventoryUnit: { inventoryQty: 5, allowBackorders: false },
          }),
        ),
      ).toBe(true);
    });

    it("is in stock when the pool allows backorders even with 0 qty", () => {
      expect(
        isInStock(
          makeProduct({
            trackInventory: true,
            allowBackorders: false,
            baseInventoryUnit: { inventoryQty: 0, allowBackorders: true },
          }),
        ),
      ).toBe(true);
    });

    it("is out of stock when the pool has no qty and no backorders", () => {
      expect(
        isInStock(
          makeProduct({
            trackInventory: true,
            allowBackorders: false,
            baseInventoryUnit: { inventoryQty: 0, allowBackorders: false },
          }),
        ),
      ).toBe(false);
    });
  });

  describe("variants", () => {
    it("is in stock when at least one variant has inventory", () => {
      expect(
        isInStock(
          makeProduct({
            trackInventory: true,
            allowBackorders: false,
            variants: [
              {
                id: "v1",
                name: "V1",
                price: null,
                compareAtPrice: null,
                inventoryQty: 0,
              },
              {
                id: "v2",
                name: "V2",
                price: null,
                compareAtPrice: null,
                inventoryQty: 3,
              },
            ],
          }),
        ),
      ).toBe(true);
    });

    it("is out of stock when no variant has inventory", () => {
      expect(
        isInStock(
          makeProduct({
            trackInventory: true,
            allowBackorders: false,
            variants: [
              {
                id: "v1",
                name: "V1",
                price: null,
                compareAtPrice: null,
                inventoryQty: 0,
              },
              {
                id: "v2",
                name: "V2",
                price: null,
                compareAtPrice: null,
                inventoryQty: 0,
              },
            ],
          }),
        ),
      ).toBe(false);
    });
  });

  describe("base product inventoryQty fallback", () => {
    it("is in stock when inventoryQty is above 0", () => {
      expect(
        isInStock(
          makeProduct({
            trackInventory: true,
            allowBackorders: false,
            variants: [],
            inventoryQty: 5,
          }),
        ),
      ).toBe(true);
    });

    it("is out of stock when inventoryQty is 0", () => {
      expect(
        isInStock(
          makeProduct({
            trackInventory: true,
            allowBackorders: false,
            variants: [],
            inventoryQty: 0,
          }),
        ),
      ).toBe(false);
    });
  });
});
