import { describe, expect, it } from "vitest";

import { sellableQty, toPublicProduct } from "./public-product";

const baseRow = {
  id: "p1",
  name: "Mug",
  sku: "MUG-1",
  barcode: "012345678905",
  price: 1200,
  trackInventory: true,
  allowBackorders: false,
  inventoryQty: 10,
  reservedQty: 3,
  cost: 400,
  lowInventoryThreshold: 5,
  lowInventoryAlertSent: false,
  outOfStockAlertSent: true,
  scheduledPublishAt: null,
};

describe("sellableQty", () => {
  it("subtracts reservations", () => {
    expect(sellableQty({ inventoryQty: 10, reservedQty: 3 })).toBe(7);
  });

  it("never goes negative", () => {
    expect(sellableQty({ inventoryQty: 2, reservedQty: 5 })).toBe(0);
    expect(sellableQty({ inventoryQty: -4 })).toBe(0);
  });

  it("treats a missing reservedQty as none held", () => {
    expect(sellableQty({ inventoryQty: 4 })).toBe(4);
  });
});

describe("toPublicProduct", () => {
  it("drops private bookkeeping columns", () => {
    const out = toPublicProduct(baseRow) as Record<string, unknown>;
    for (const key of [
      "cost",
      "reservedQty",
      "lowInventoryThreshold",
      "lowInventoryAlertSent",
      "outOfStockAlertSent",
      "scheduledPublishAt",
    ]) {
      expect(out).not.toHaveProperty(key);
    }
  });

  it("keeps storefront fields, including the public sku/barcode", () => {
    const out = toPublicProduct(baseRow);
    expect(out).toMatchObject({
      id: "p1",
      name: "Mug",
      sku: "MUG-1",
      barcode: "012345678905",
      price: 1200,
      trackInventory: true,
      allowBackorders: false,
    });
  });

  it("replaces inventoryQty with the sellable quantity", () => {
    expect(toPublicProduct(baseRow).inventoryQty).toBe(7);
  });

  it("sanitizes every variant", () => {
    const out = toPublicProduct({
      ...baseRow,
      variants: [
        { id: "v1", sku: "MUG-RED", inventoryQty: 4, reservedQty: 1 },
        { id: "v2", sku: "MUG-BLU", inventoryQty: 1, reservedQty: 2 },
      ],
    });
    expect(out.variants).toEqual([
      { id: "v1", sku: "MUG-RED", inventoryQty: 3 },
      { id: "v2", sku: "MUG-BLU", inventoryQty: 0 },
    ]);
  });

  it("sanitizes the shared inventory pool and passes null through", () => {
    const pooled = toPublicProduct({
      ...baseRow,
      baseInventoryUnit: {
        inventoryQty: 50,
        reservedQty: 8,
        allowBackorders: false,
      },
    });
    expect(pooled.baseInventoryUnit).toEqual({
      inventoryQty: 42,
      allowBackorders: false,
    });

    const unpooled = toPublicProduct({ ...baseRow, baseInventoryUnit: null });
    expect(unpooled.baseInventoryUnit).toBeNull();
  });

  it("does not mutate the input row", () => {
    const row = { ...baseRow, variants: [{ inventoryQty: 2, reservedQty: 1 }] };
    toPublicProduct(row);
    expect(row.reservedQty).toBe(3);
    expect(row.variants[0]).toEqual({ inventoryQty: 2, reservedQty: 1 });
  });
});
