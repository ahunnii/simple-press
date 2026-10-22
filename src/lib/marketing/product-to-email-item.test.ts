import { describe, expect, it } from "vitest";

import type { PickerProduct } from "./product-to-email-item";

import { productToEmailItem } from "./product-to-email-item";

const product = (overrides: Partial<PickerProduct> = {}): PickerProduct => ({
  id: "p1",
  name: "Tote",
  slug: "tote",
  price: 2000,
  compareAtPrice: null,
  variants: [],
  images: [{ url: "https://cdn.example.com/tote.jpg" }],
  ...overrides,
});

describe("productToEmailItem", () => {
  it("snapshots a product without variants", () => {
    expect(productToEmailItem(product({ compareAtPrice: 2500 }))).toEqual({
      productId: "p1",
      name: "Tote",
      imageUrl: "https://cdn.example.com/tote.jpg",
      priceCents: 2000,
      compareAtCents: 2500,
      slug: "tote",
    });
  });

  it("uses the cheapest variant's price and its compare-at price", () => {
    const item = productToEmailItem(
      product({
        variants: [
          { price: 3000, compareAtPrice: 3500 },
          { price: 1500, compareAtPrice: 1800 },
        ],
      }),
    );
    expect(item.priceCents).toBe(1500);
    expect(item.compareAtCents).toBe(1800);
  });

  it("treats a 0/null variant price as the product's", () => {
    const item = productToEmailItem(
      product({
        price: 1200,
        compareAtPrice: 1600,
        variants: [
          { price: 0, compareAtPrice: null },
          { price: 5000, compareAtPrice: null },
        ],
      }),
    );
    expect(item.priceCents).toBe(1200);
    expect(item.compareAtCents).toBe(1600);
  });

  it("drops a compare-at price that isn't above the price, and a missing image", () => {
    const item = productToEmailItem(
      product({ compareAtPrice: 1000, images: [] }),
    );
    expect(item.compareAtCents).toBeNull();
    expect(item.imageUrl).toBeNull();
  });
});
