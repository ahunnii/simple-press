import { beforeEach, describe, expect, it } from "vitest";

import { reserveInventory } from "~/lib/inventory/reservation";

import { db, resetDb } from "../helpers/db";
import { createBusiness, createProduct } from "../helpers/factories";

describe("inventory reservation (checkout stock guarantee)", () => {
  beforeEach(resetDb);

  it("reserves available stock and prevents an oversell", async () => {
    const business = await createBusiness();
    const product = await createProduct(business.id, {
      inventoryQty: 5,
      reservedQty: 0,
      trackInventory: true,
    });

    // First reservation of 3 succeeds (5 available).
    const first = await db.$transaction((tx) =>
      reserveInventory(tx, {
        entries: [{ productId: product.id, qty: 3 }],
        businessId: business.id,
      }),
    );
    expect(first.ok).toBe(true);

    const afterFirst = await db.product.findUniqueOrThrow({
      where: { id: product.id },
    });
    expect(afterFirst.reservedQty).toBe(3);

    // Second reservation of 3 fails — only 2 remain — and rolls back.
    await expect(
      db.$transaction(async (tx) => {
        const result = await reserveInventory(tx, {
          entries: [{ productId: product.id, qty: 3 }],
          businessId: business.id,
        });
        if (!result.ok) throw new Error("OUT_OF_STOCK");
      }),
    ).rejects.toThrow("OUT_OF_STOCK");

    // reservedQty is unchanged by the failed attempt.
    const afterSecond = await db.product.findUniqueOrThrow({
      where: { id: product.id },
    });
    expect(afterSecond.reservedQty).toBe(3);
  });

  it("allows reserving exactly the remaining stock", async () => {
    const business = await createBusiness();
    const product = await createProduct(business.id, {
      inventoryQty: 4,
      reservedQty: 0,
    });

    const result = await db.$transaction((tx) =>
      reserveInventory(tx, {
        entries: [{ productId: product.id, qty: 4 }],
        businessId: business.id,
      }),
    );
    expect(result.ok).toBe(true);

    const after = await db.product.findUniqueOrThrow({
      where: { id: product.id },
    });
    expect(after.reservedQty).toBe(4);
  });
});
