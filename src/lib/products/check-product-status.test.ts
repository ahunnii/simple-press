import { describe, expect, it } from "vitest";

import type { ProductStatusInput } from "./check-product-status";

import { checkProductStatus } from "./check-product-status";

function input(
  overrides: Partial<ProductStatusInput> = {},
): ProductStatusInput {
  return {
    price: 1000,
    compareAtPrice: null,
    trackInventory: false,
    inventoryQty: 0,
    allowBackorders: false,
    baseInventoryUnit: null,
    baseUnitsConsumed: null,
    additionalFields: null,
    variants: [],
    ...overrides,
  };
}

describe("checkProductStatus chooseOptions", () => {
  it("is false and leaves the cart enabled for a plain product", () => {
    const s = checkProductStatus(input());
    expect(s.chooseOptions).toBe(false);
    expect(s.disableCart).toBe(false);
  });

  it("is true for variants (unchanged disableCart behaviour)", () => {
    const s = checkProductStatus(
      input({
        variants: [{ price: null, compareAtPrice: null, inventoryQty: 1 }],
      }),
    );
    expect(s.chooseOptions).toBe(true);
    expect(s.hasVariants).toBe(true);
    expect(s.disableCart).toBe(true);
  });

  it("is true when option groups are attached, without implying variants", () => {
    const s = checkProductStatus(input({ hasOptions: true }));
    expect(s.chooseOptions).toBe(true);
    expect(s.hasVariants).toBe(false);
    expect(s.disableCart).toBe(true);
  });

  it("hasOptions=false/undefined behave identically", () => {
    expect(checkProductStatus(input({ hasOptions: false }))).toEqual(
      checkProductStatus(input()),
    );
  });
});
