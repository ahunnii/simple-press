import { describe, expect, it } from "vitest";

import type { RestockProduct, RestockVariant } from "./purchasable";

import { canCheckoutOne } from "./purchasable";

function makeProduct(overrides: Partial<RestockProduct> = {}): RestockProduct {
  return {
    published: true,
    additionalFields: null,
    trackInventory: true,
    allowBackorders: false,
    inventoryQty: 0,
    reservedQty: 0,
    baseInventoryUnitId: null,
    baseUnitsConsumed: null,
    baseInventoryUnit: null,
    variants: [],
    ...overrides,
  };
}

function makeVariant(overrides: Partial<RestockVariant> = {}): RestockVariant {
  return { id: "v1", inventoryQty: 0, reservedQty: 0, ...overrides };
}

function makePooled(
  pool: Partial<NonNullable<RestockProduct["baseInventoryUnit"]>>,
  overrides: Partial<RestockProduct> = {},
): RestockProduct {
  return makeProduct({
    // The product router forces this off whenever a pool is linked.
    trackInventory: false,
    baseInventoryUnitId: "pool1",
    baseInventoryUnit: {
      inventoryQty: 0,
      reservedQty: 0,
      allowBackorders: false,
      ...pool,
    },
    ...overrides,
  });
}

describe("canCheckoutOne", () => {
  describe("gates", () => {
    it("is false for unpublished products even with stock", () => {
      expect(
        canCheckoutOne(
          makeProduct({ published: false, inventoryQty: 5 }),
          null,
        ),
      ).toBe(false);
    });

    it("is false for coming-soon products even with stock", () => {
      expect(
        canCheckoutOne(
          makeProduct({
            inventoryQty: 5,
            additionalFields: { comingSoon: true },
          }),
          null,
        ),
      ).toBe(false);
    });
  });

  describe("simple products", () => {
    it("is true when not tracking inventory", () => {
      expect(canCheckoutOne(makeProduct({ trackInventory: false }), null)).toBe(
        true,
      );
    });

    it("is true when backorders are allowed", () => {
      expect(canCheckoutOne(makeProduct({ allowBackorders: true }), null)).toBe(
        true,
      );
    });

    it("is false when all stock is reserved by in-flight checkouts", () => {
      expect(
        canCheckoutOne(makeProduct({ inventoryQty: 2, reservedQty: 2 }), null),
      ).toBe(false);
    });

    it("is true with one unreserved unit", () => {
      expect(
        canCheckoutOne(makeProduct({ inventoryQty: 3, reservedQty: 2 }), null),
      ).toBe(true);
    });
  });

  describe("pooled products", () => {
    it("is false when the pool is empty despite trackInventory being off", () => {
      expect(canCheckoutOne(makePooled({ inventoryQty: 0 }), null)).toBe(false);
    });

    it("is true when the pool has a free unit", () => {
      expect(canCheckoutOne(makePooled({ inventoryQty: 1 }), null)).toBe(true);
    });

    it("subtracts the pool's reservedQty", () => {
      expect(
        canCheckoutOne(makePooled({ inventoryQty: 4, reservedQty: 4 }), null),
      ).toBe(false);
    });

    it("needs baseUnitsConsumed free pool units for one sale", () => {
      const product = (inventoryQty: number) =>
        makePooled({ inventoryQty, reservedQty: 1 }, { baseUnitsConsumed: 3 });
      expect(canCheckoutOne(product(3), null)).toBe(false);
      expect(canCheckoutOne(product(4), null)).toBe(true);
    });

    it("is true when the pool allows backorders", () => {
      expect(
        canCheckoutOne(
          makePooled({ inventoryQty: 0, allowBackorders: true }),
          null,
        ),
      ).toBe(true);
    });

    it("ignores the product's own backorder flag", () => {
      expect(
        canCheckoutOne(
          makePooled({ inventoryQty: 0 }, { allowBackorders: true }),
          null,
        ),
      ).toBe(false);
    });

    it("is false when the pool row is missing", () => {
      expect(
        canCheckoutOne(makePooled({}, { baseInventoryUnit: null }), null),
      ).toBe(false);
    });
  });

  describe("variants", () => {
    it("checks the requested variant's unreserved stock, not the pool", () => {
      const variant = makeVariant({ inventoryQty: 1, reservedQty: 1 });
      const product = makeProduct({
        baseInventoryUnitId: "pool1",
        baseInventoryUnit: {
          inventoryQty: 10,
          reservedQty: 0,
          allowBackorders: false,
        },
        variants: [variant],
      });
      expect(canCheckoutOne(product, variant)).toBe(false);
      variant.inventoryQty = 2;
      expect(canCheckoutOne(product, variant)).toBe(true);
    });

    it("is true for any variant when the product doesn't track inventory", () => {
      const variant = makeVariant();
      expect(
        canCheckoutOne(
          makeProduct({ trackInventory: false, variants: [variant] }),
          variant,
        ),
      ).toBe(true);
    });

    it("is true for a bare request when some variant can be bought", () => {
      expect(
        canCheckoutOne(
          makeProduct({
            variants: [
              makeVariant({ id: "a", inventoryQty: 1, reservedQty: 1 }),
              makeVariant({ id: "b", inventoryQty: 1 }),
            ],
          }),
          null,
        ),
      ).toBe(true);
    });

    it("is false for a bare request when every variant is fully reserved", () => {
      expect(
        canCheckoutOne(
          makeProduct({
            variants: [makeVariant({ inventoryQty: 2, reservedQty: 2 })],
          }),
          null,
        ),
      ).toBe(false);
    });
  });
});
