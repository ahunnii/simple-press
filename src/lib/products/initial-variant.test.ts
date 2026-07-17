import { describe, expect, it } from "vitest";

import { isVariantPurchasable, pickInitialVariant } from "./initial-variant";

describe("isVariantPurchasable", () => {
  it("is unavailable only when tracked, no backorders, and qty depleted", () => {
    expect(
      isVariantPurchasable(
        { inventoryQty: 0 },
        { trackInventory: true, allowBackorders: false },
      ),
    ).toBe(false);
  });

  it("is purchasable when untracked, regardless of qty", () => {
    expect(
      isVariantPurchasable(
        { inventoryQty: 0 },
        { trackInventory: false, allowBackorders: false },
      ),
    ).toBe(true);
  });

  it("is purchasable when backorders are allowed, regardless of qty", () => {
    expect(
      isVariantPurchasable(
        { inventoryQty: 0 },
        { trackInventory: true, allowBackorders: true },
      ),
    ).toBe(true);
  });

  it("is purchasable when tracked with positive qty", () => {
    expect(
      isVariantPurchasable(
        { inventoryQty: 5 },
        { trackInventory: true, allowBackorders: false },
      ),
    ).toBe(true);
  });
});

describe("pickInitialVariant", () => {
  const product = { trackInventory: true, allowBackorders: false };

  it("prefers the first purchasable variant even if it isn't first in the array", () => {
    const variants = [
      { id: "a", inventoryQty: 0 },
      { id: "b", inventoryQty: 0 },
      { id: "c", inventoryQty: 3 },
    ];
    expect(pickInitialVariant(variants, product)?.id).toBe("c");
  });

  it("falls back to variants[0] when every variant is sold out", () => {
    const variants = [
      { id: "a", inventoryQty: 0 },
      { id: "b", inventoryQty: 0 },
    ];
    expect(pickInitialVariant(variants, product)?.id).toBe("a");
  });

  it("returns null when there are no variants", () => {
    expect(pickInitialVariant([], product)).toBeNull();
  });

  it("returns the first variant when the product doesn't track inventory", () => {
    const variants = [
      { id: "a", inventoryQty: 0 },
      { id: "b", inventoryQty: 10 },
    ];
    expect(
      pickInitialVariant(variants, {
        trackInventory: false,
        allowBackorders: false,
      })?.id,
    ).toBe("a");
  });
});
