import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  deductPoolInventory,
  EMPTY_POOL_SALES,
  restorePoolInventory,
} from "~/lib/inventory";

import { createTestCaller } from "../helpers/caller";
import { db, resetDb } from "../helpers/db";
import {
  createBaseInventoryUnit,
  createBusiness,
  createOrder,
  createOwnerUser,
  createProduct,
} from "../helpers/factories";

// Procedures resolve the tenant from the request host via `next/headers` — see
// tenant-isolation.test.ts for the reference pattern.
const reqHost = vi.hoisted(() => ({ value: "pool-biz.simplepress.test" }));
vi.mock("next/headers", () => ({
  headers: () => Promise.resolve(new Headers({ host: reqHost.value })),
  cookies: () => Promise.resolve(new Headers()),
}));

describe("base-inventory-unit pool sales (deductPoolInventory / restorePoolInventory / router)", () => {
  beforeEach(async () => {
    await resetDb();
    reqHost.value = "pool-biz.simplepress.test";
  });

  async function setupBusiness() {
    const business = await createBusiness({});
    const owner = await createOwnerUser(business.id);
    reqHost.value = `${business.subdomain}.simplepress.test`;
    const caller = createTestCaller({ userId: owner.id });
    return { business, owner, caller };
  }

  /**
   * Product-level pools only — variants can't use them. `createProduct`
   * doesn't expose `baseInventoryUnitId`/`baseUnitsConsumed`, so they're
   * patched via a direct db update after creation (not editing
   * tests/helpers/factories.ts).
   */
  async function makePooledProduct(
    businessId: string,
    poolId: string,
    baseUnitsConsumed: number | null = 1,
  ) {
    const product = await createProduct(businessId, { trackInventory: false });
    return db.product.update({
      where: { id: product.id },
      data: { baseInventoryUnitId: poolId, baseUnitsConsumed },
    });
  }

  it("deductPoolInventory sums units consumed across two products in the same pool (2 + 6 = 8)", async () => {
    const { business, caller } = await setupBusiness();
    const pool = await createBaseInventoryUnit(business.id, {
      inventoryQty: 100,
    });
    const productA = await makePooledProduct(business.id, pool.id, 2);
    const productB = await makePooledProduct(business.id, pool.id, 6);
    const order = await createOrder(business.id, { total: 1000 });

    await db.$transaction((tx) =>
      deductPoolInventory(tx, {
        poolId: pool.id,
        items: [
          { productId: productA.id, quantity: 1 },
          { productId: productB.id, quantity: 1 },
        ],
        unitsConsumedMap: { [productA.id]: 2, [productB.id]: 6 },
        orderId: order.id,
        orderNumber: order.orderNumber,
        businessId: business.id,
      }),
    );

    const updatedPool = await db.baseInventoryUnit.findUniqueOrThrow({
      where: { id: pool.id },
    });
    expect(updatedPool.inventoryQty).toBe(100 - 8);

    const detail = await caller.baseInventoryUnit.getById({ id: pool.id });
    expect(detail.sales.netSoldUnits).toBe(8);
    expect(detail.sales.grossSoldUnits).toBe(8);
    expect(detail.sales.netSoldUnits).toBe(100 - updatedPool.inventoryQty);
  });

  it("allowBackorders: true pool deducting below zero still records the full sold units", async () => {
    const { business, caller } = await setupBusiness();
    const pool = await createBaseInventoryUnit(business.id, {
      inventoryQty: 3,
      allowBackorders: true,
    });
    const product = await makePooledProduct(business.id, pool.id, 1);
    const order = await createOrder(business.id, { total: 500 });

    await db.$transaction((tx) =>
      deductPoolInventory(tx, {
        poolId: pool.id,
        items: [{ productId: product.id, quantity: 10 }],
        unitsConsumedMap: { [product.id]: 1 },
        orderId: order.id,
        orderNumber: order.orderNumber,
        businessId: business.id,
      }),
    );

    const updatedPool = await db.baseInventoryUnit.findUniqueOrThrow({
      where: { id: pool.id },
    });
    expect(updatedPool.inventoryQty).toBe(-7);

    const detail = await caller.baseInventoryUnit.getById({ id: pool.id });
    expect(detail.sales.netSoldUnits).toBe(10);
    expect(detail.sales.grossSoldUnits).toBe(10);
    expect(detail.sales.oversellEvents).toBe(0);
  });

  it("insufficient stock (no backorders) writes an oversell row and never counts the units as sold", async () => {
    const { business, caller } = await setupBusiness();
    const pool = await createBaseInventoryUnit(business.id, {
      inventoryQty: 2,
      allowBackorders: false,
    });
    const product = await makePooledProduct(business.id, pool.id, 1);
    const order = await createOrder(business.id, { total: 500 });

    const result = await db.$transaction((tx) =>
      deductPoolInventory(tx, {
        poolId: pool.id,
        items: [{ productId: product.id, quantity: 5 }],
        unitsConsumedMap: { [product.id]: 1 },
        orderId: order.id,
        orderNumber: order.orderNumber,
        businessId: business.id,
      }),
    );

    expect(result?.wasOversell).toBe(true);
    expect(result?.totalBaseUnitsDeducted).toBe(0);

    const updatedPool = await db.baseInventoryUnit.findUniqueOrThrow({
      where: { id: pool.id },
    });
    expect(updatedPool.inventoryQty).toBe(2); // unchanged

    const history = await db.inventoryHistory.findMany({
      where: { baseInventoryUnitId: pool.id },
    });
    expect(history).toHaveLength(1);
    expect(history[0]?.reason).toBe("oversell");
    expect(history[0]?.changeQty).toBe(0);

    const detail = await caller.baseInventoryUnit.getById({ id: pool.id });
    expect(detail.sales.oversellEvents).toBe(1);
    expect(detail.sales.netSoldUnits).toBe(0);
    expect(detail.sales.grossSoldUnits).toBe(0);
  });

  it("restorePoolInventory (order-driven restock) reduces netSoldUnits and raises returnedUnits", async () => {
    const { business, caller } = await setupBusiness();
    const pool = await createBaseInventoryUnit(business.id, {
      inventoryQty: 50,
    });
    const product = await makePooledProduct(business.id, pool.id, 1);
    const order = await createOrder(business.id, { total: 500 });

    await db.$transaction((tx) =>
      deductPoolInventory(tx, {
        poolId: pool.id,
        items: [{ productId: product.id, quantity: 10 }],
        unitsConsumedMap: { [product.id]: 1 },
        orderId: order.id,
        orderNumber: order.orderNumber,
        businessId: business.id,
      }),
    );

    await db.$transaction((tx) =>
      restorePoolInventory(tx, {
        poolId: pool.id,
        items: [{ productId: product.id, quantity: 4 }],
        unitsConsumedMap: { [product.id]: 1 },
        orderId: order.id,
        orderNumber: order.orderNumber,
        businessId: business.id,
      }),
    );

    const detail = await caller.baseInventoryUnit.getById({ id: pool.id });
    expect(detail.sales.grossSoldUnits).toBe(10);
    expect(detail.sales.returnedUnits).toBe(4);
    expect(detail.sales.netSoldUnits).toBe(6);

    const updatedPool = await db.baseInventoryUnit.findUniqueOrThrow({
      where: { id: pool.id },
    });
    expect(updatedPool.inventoryQty).toBe(50 - 10 + 4);
  });

  it("disambiguation lock: admin adjustInventory({reason:'return'}) (userId, no orderId) is EXCLUDED from returnedUnits, while an order-driven restock (has orderId) IS included", async () => {
    const { business, caller } = await setupBusiness();
    const pool = await createBaseInventoryUnit(business.id, {
      inventoryQty: 50,
    });
    const product = await makePooledProduct(business.id, pool.id, 1);
    const order = await createOrder(business.id, { total: 500 });

    // Prime some sold units so returns have something to net against.
    await db.$transaction((tx) =>
      deductPoolInventory(tx, {
        poolId: pool.id,
        items: [{ productId: product.id, quantity: 10 }],
        unitsConsumedMap: { [product.id]: 1 },
        orderId: order.id,
        orderNumber: order.orderNumber,
        businessId: business.id,
      }),
    );

    // Order-driven restock — writes orderId, must count toward returnedUnits.
    await db.$transaction((tx) =>
      restorePoolInventory(tx, {
        poolId: pool.id,
        items: [{ productId: product.id, quantity: 3 }],
        unitsConsumedMap: { [product.id]: 1 },
        orderId: order.id,
        orderNumber: order.orderNumber,
        businessId: business.id,
      }),
    );

    // Admin manual "return" adjustment via the router — writes userId and NO
    // orderId. This is the row the disambiguation guard must exclude.
    const beforeAdjust = await db.baseInventoryUnit.findUniqueOrThrow({
      where: { id: pool.id },
    });
    await caller.baseInventoryUnit.adjustInventory({
      id: pool.id,
      quantity: beforeAdjust.inventoryQty + 20,
      reason: "return",
    });

    // Sanity: the admin ledger row really has no orderId (the disambiguator).
    const adminRow = await db.inventoryHistory.findFirst({
      where: { baseInventoryUnitId: pool.id, reason: "return", orderId: null },
    });
    expect(adminRow?.userId).toBeTruthy();

    const detail = await caller.baseInventoryUnit.getById({ id: pool.id });
    expect(detail.sales.grossSoldUnits).toBe(10);
    expect(detail.sales.returnedUnits).toBe(3); // only the order-driven restock
    expect(detail.sales.netSoldUnits).toBe(7);
  });

  it("other admin adjust reasons (restock, damage, correction, adjustment) never affect the sales figures", async () => {
    const { business, caller } = await setupBusiness();
    const pool = await createBaseInventoryUnit(business.id, {
      inventoryQty: 20,
    });

    for (const reason of [
      "restock",
      "damage",
      "correction",
      "adjustment",
    ] as const) {
      const current = await db.baseInventoryUnit.findUniqueOrThrow({
        where: { id: pool.id },
      });
      await caller.baseInventoryUnit.adjustInventory({
        id: pool.id,
        quantity: current.inventoryQty + 5,
        reason,
      });
    }

    const detail = await caller.baseInventoryUnit.getById({ id: pool.id });
    expect(detail.sales).toEqual(EMPTY_POOL_SALES);
  });

  it("list and getById report identical sales figures for the same pool", async () => {
    const { business, caller } = await setupBusiness();
    const pool = await createBaseInventoryUnit(business.id, {
      inventoryQty: 30,
    });
    const product = await makePooledProduct(business.id, pool.id, 1);
    const order = await createOrder(business.id, { total: 500 });

    await db.$transaction((tx) =>
      deductPoolInventory(tx, {
        poolId: pool.id,
        items: [{ productId: product.id, quantity: 5 }],
        unitsConsumedMap: { [product.id]: 1 },
        orderId: order.id,
        orderNumber: order.orderNumber,
        businessId: business.id,
      }),
    );

    const listResult = await caller.baseInventoryUnit.list();
    const fromList = listResult.find((p) => p.id === pool.id);
    const fromGetById = await caller.baseInventoryUnit.getById({ id: pool.id });

    expect(fromList).toBeDefined();
    expect(fromList?.sales).toEqual(fromGetById.sales);
  });

  it("a pool with no movement reports all zeros (not undefined/NaN) from both list and getById", async () => {
    const { business, caller } = await setupBusiness();
    const pool = await createBaseInventoryUnit(business.id, {
      inventoryQty: 15,
    });

    const listResult = await caller.baseInventoryUnit.list();
    const fromList = listResult.find((p) => p.id === pool.id);
    const fromGetById = await caller.baseInventoryUnit.getById({ id: pool.id });

    expect(fromList?.sales).toEqual(EMPTY_POOL_SALES);
    expect(fromGetById.sales).toEqual(EMPTY_POOL_SALES);
    for (const v of Object.values(fromGetById.sales)) {
      expect(v).not.toBeUndefined();
      expect(Number.isNaN(v)).toBe(false);
    }
  });

  it("tenant isolation: getById on another business's pool throws NOT_FOUND, and list never returns it", async () => {
    const { caller } = await setupBusiness();
    const other = await createBusiness({});
    const foreignPool = await createBaseInventoryUnit(other.id, {});

    await expect(
      caller.baseInventoryUnit.getById({ id: foreignPool.id }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    const listResult = await caller.baseInventoryUnit.list();
    expect(listResult.map((p) => p.id)).not.toContain(foreignPool.id);
  });
});
