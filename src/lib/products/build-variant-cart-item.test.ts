import { describe, expect, it } from "vitest";

import type {
  CartItemProductInput,
  CartItemVariantInput,
} from "./build-variant-cart-item";

import { buildVariantCartItem } from "./build-variant-cart-item";

function makeProduct(
  overrides: Partial<CartItemProductInput> = {},
): CartItemProductInput {
  return {
    id: "prod_1",
    slug: "widget",
    name: "Widget",
    price: 1_000,
    compareAtPrice: null,
    images: [],
    ...overrides,
  };
}

function makeVariant(
  overrides: Partial<CartItemVariantInput> = {},
): CartItemVariantInput {
  return {
    id: "var_1",
    name: "Small",
    price: 500,
    compareAtPrice: null,
    imageUrl: null,
    sku: "SKU-1",
    ...overrides,
  };
}

describe("buildVariantCartItem", () => {
  it("builds a cart item using the variant's own price", () => {
    const item = buildVariantCartItem(
      makeProduct({ price: 1_000 }),
      makeVariant({ price: 500 }),
      10,
    );
    expect(item.price).toBe(500);
    expect(item.productId).toBe("prod_1");
    expect(item.productSlug).toBe("widget");
    expect(item.variantId).toBe("var_1");
    expect(item.sku).toBe("SKU-1");
    expect(item.maxInventory).toBe(10);
  });

  it("keeps compareAtPrice only when strictly greater than price", () => {
    const item = buildVariantCartItem(
      makeProduct({ price: 1_000, compareAtPrice: 1_200 }),
      makeVariant({ price: 500, compareAtPrice: 800 }),
      10,
    );
    expect(item.price).toBe(500);
    expect(item.compareAtPrice).toBe(800);
  });

  it("nulls out compareAtPrice when it equals the price", () => {
    const item = buildVariantCartItem(
      makeProduct({ price: 1_000 }),
      makeVariant({ price: 500, compareAtPrice: 500 }),
      10,
    );
    expect(item.compareAtPrice).toBeNull();
  });

  it("nulls out compareAtPrice when it is less than the price", () => {
    const item = buildVariantCartItem(
      makeProduct({ price: 1_000 }),
      makeVariant({ price: 500, compareAtPrice: 400 }),
      10,
    );
    expect(item.compareAtPrice).toBeNull();
  });

  it("inherits the base product price when variant price is 0", () => {
    const item = buildVariantCartItem(
      makeProduct({ price: 1_000 }),
      makeVariant({ price: 0, compareAtPrice: 900 }),
      10,
    );
    expect(item.price).toBe(1_000);
  });

  it("inherits the base product price when variant price is null", () => {
    const item = buildVariantCartItem(
      makeProduct({ price: 1_000 }),
      makeVariant({ price: null, compareAtPrice: 900 }),
      10,
    );
    expect(item.price).toBe(1_000);
  });

  describe("imageUrl fallback chain", () => {
    it("uses the variant's imageUrl when present", () => {
      const item = buildVariantCartItem(
        makeProduct({ images: [{ url: "https://x/product.jpg" }] }),
        makeVariant({ imageUrl: "https://x/variant.jpg" }),
        10,
      );
      expect(item.imageUrl).toBe("https://x/variant.jpg");
    });

    it("falls back to the product's first image when the variant has none", () => {
      const item = buildVariantCartItem(
        makeProduct({ images: [{ url: "https://x/product.jpg" }] }),
        makeVariant({ imageUrl: null }),
        10,
      );
      expect(item.imageUrl).toBe("https://x/product.jpg");
    });

    it("falls back to null when neither variant nor product has an image", () => {
      const item = buildVariantCartItem(
        makeProduct({ images: [] }),
        makeVariant({ imageUrl: null }),
        10,
      );
      expect(item.imageUrl).toBeNull();
    });
  });
});
