import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  applyMovement,
  deductPoolInventory,
  EMPTY_POOL_SALES,
  getOutstandingByItem,
  INVENTORY_BUSY_MESSAGE,
  InventoryMovementError,
  lockItems,
  MANUAL_REASONS,
  recordWriteOff,
  reserveInventory,
  withManualInventoryTx,
} from "~/lib/inventory";

import { createTestCaller } from "../helpers/caller";
import { db, resetDb } from "../helpers/db";
import {
  createBaseInventoryUnit,
  createBusiness,
  createInventoryCheckout,
  createMembership,
  createOrder,
  createOwnerUser,
  createProduct,
  createUser,
} from "../helpers/factories";

// Procedures resolve the tenant from the request host via `next/headers` — see
// tenant-isolation.test.ts for the reference pattern.
const reqHost = vi.hoisted(() => ({ value: "inv-move.simplepress.test" }));
vi.mock("next/headers", () => ({
  headers: () => Promise.resolve(new Headers({ host: reqHost.value })),
  cookies: () => Promise.resolve(new Headers()),
}));

/** A manually released promise, used to hold a transaction open. */
function latch() {
  let release!: () => void;
  const promise = new Promise<void>((r) => (release = r));
  return { promise, release };
}

/**
 * Poll pg_stat_activity until `n` backends are waiting on a lock — proof that
 * the competing transaction is actually BLOCKED on our row lock (not merely
 * slow). Integration files run serially, so no other test's backends exist.
 */
async function waitForLockWaiters(n = 1, timeoutMs = 4000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const [row] = await db.$queryRaw<{ waiting: bigint }[]>`
      SELECT count(*)::bigint AS waiting FROM pg_stat_activity
      WHERE datname = current_database() AND wait_event_type = 'Lock'
    `;
    if (Number(row?.waiting ?? 0) >= n) return;
    if (Date.now() > deadline) {
      throw new Error(`Timed out waiting for ${n} lock waiter(s)`);
    }
    await new Promise((r) => setTimeout(r, 25));
  }
}

const TX_OPTS = { timeout: 20_000, maxWait: 5_000 } as const;

describe("manual inventory movements (ledger core + adjustInventory)", () => {
  beforeEach(async () => {
    await resetDb();
    reqHost.value = "inv-move.simplepress.test";
  });

  async function setupBusiness() {
    const business = await createBusiness({});
    const owner = await createOwnerUser(business.id);
    reqHost.value = `${business.subdomain}.simplepress.test`;
    const caller = createTestCaller({ userId: owner.id });
    return { business, owner, caller };
  }

  async function makePooledProduct(businessId: string, poolId: string) {
    const product = await createProduct(businessId, { trackInventory: false });
    return db.product.update({
      where: { id: product.id },
      data: { baseInventoryUnitId: poolId, baseUnitsConsumed: 1 },
    });
  }

  async function saleParams(businessId: string, poolId: string, qty: number) {
    const product = await makePooledProduct(businessId, poolId);
    const order = await createOrder(businessId, { total: 1000 });
    return {
      poolId,
      items: [{ productId: product.id, quantity: qty }],
      unitsConsumedMap: { [product.id]: 1 },
      orderId: order.id,
      orderNumber: order.orderNumber,
      businessId,
    };
  }

  const historyFor = (poolId: string) =>
    db.inventoryHistory.findMany({
      where: { baseInventoryUnitId: poolId },
      orderBy: { createdAt: "asc" },
    });

  const qtyOf = async (poolId: string) =>
    (
      await db.baseInventoryUnit.findUniqueOrThrow({
        where: { id: poolId },
      })
    ).inventoryQty;

  // ── a/b: latch-driven races against the order path ────────────────────────

  it("a. manual set holds the lock first: the sale waits, then decrements the committed value", async () => {
    const { business, owner } = await setupBusiness();
    const pool = await createBaseInventoryUnit(business.id, {
      inventoryQty: 100,
    });
    const sale = await saleParams(business.id, pool.id, 3);

    const gate = latch();
    const locked = latch();
    const txA = db.$transaction(async (tx) => {
      const items = await lockItems(tx, {
        businessId: business.id,
        ids: [pool.id],
      });
      await applyMovement(tx, items.get(pool.id)!, {
        movement: { mode: "set", quantity: 50 },
        reason: "adjustment",
        userId: owner.id,
      });
      locked.release();
      await gate.promise;
    }, TX_OPTS);
    await locked.promise;

    let bSettled = false;
    const txB = db
      .$transaction((tx) => deductPoolInventory(tx, sale), TX_OPTS)
      .finally(() => (bSettled = true));

    await waitForLockWaiters(1);
    expect(bSettled).toBe(false);
    gate.release();
    const [, saleResult] = await Promise.all([txA, txB]);

    expect(saleResult?.wasOversell).toBe(false);
    expect(await qtyOf(pool.id)).toBe(47);

    const rows = await historyFor(pool.id);
    const adjust = rows.find((r) => r.reason === "adjustment")!;
    expect(adjust).toMatchObject({
      previousQty: 100,
      newQty: 50,
      changeQty: -50,
    });
    const saleRow = rows.find((r) => r.reason === "sale")!;
    expect(saleRow.changeQty).toBe(-3);
    // The sale's own prev/new may be stale (it reads before it waits) — only
    // the changeQty sum is guaranteed to reconcile.
    expect(rows.reduce((s, r) => s + r.changeQty, 0)).toBe(47 - 100);
  }, 30_000);

  it("b. the sale holds the lock first: adjust waits and records the exact post-sale previousQty", async () => {
    const { business, caller } = await setupBusiness();
    const pool = await createBaseInventoryUnit(business.id, {
      inventoryQty: 100,
    });
    const sale = await saleParams(business.id, pool.id, 3);

    const gate = latch();
    const sold = latch();
    const txA = db.$transaction(async (tx) => {
      const result = await deductPoolInventory(tx, sale);
      sold.release();
      await gate.promise;
      return result;
    }, TX_OPTS);
    await sold.promise;

    let bSettled = false;
    const adjust = caller.baseInventoryUnit
      .adjustInventory({ id: pool.id, quantity: 60 })
      .finally(() => (bSettled = true));

    await waitForLockWaiters(1);
    expect(bSettled).toBe(false);
    gate.release();
    await Promise.all([txA, adjust]);

    expect(await qtyOf(pool.id)).toBe(60);
    const rows = await historyFor(pool.id);
    const adjustRow = rows.find((r) => r.reason === "adjustment")!;
    expect(adjustRow).toMatchObject({
      previousQty: 97,
      newQty: 60,
      changeQty: -37,
    });
    expect(rows.reduce((s, r) => s + r.changeQty, 0)).toBe(60 - 100);
  }, 30_000);

  // ── c/d: reservations ─────────────────────────────────────────────────────

  it("c. reserveInventory waits on a held check-out lock and then fails against the committed count", async () => {
    const { business, owner } = await setupBusiness();
    const pool = await createBaseInventoryUnit(business.id, {
      inventoryQty: 10,
      itemType: "rental",
    });

    const gate = latch();
    const locked = latch();
    const txA = db.$transaction(async (tx) => {
      const items = await lockItems(tx, {
        businessId: business.id,
        ids: [pool.id],
      });
      await applyMovement(tx, items.get(pool.id)!, {
        movement: { mode: "delta", delta: -8, guard: "available" },
        reason: "checkout",
        userId: owner.id,
      });
      locked.release();
      await gate.promise;
    }, TX_OPTS);
    await locked.promise;

    let bSettled = false;
    const txB = db
      .$transaction(
        (tx) =>
          reserveInventory(tx, {
            entries: [{ baseInventoryUnitId: pool.id, qty: 5 }],
            businessId: business.id,
          }),
        TX_OPTS,
      )
      .finally(() => (bSettled = true));

    await waitForLockWaiters(1);
    expect(bSettled).toBe(false);
    gate.release();
    const [, reserve] = await Promise.all([txA, txB]);

    expect(reserve).toEqual({ ok: false });
    const after = await db.baseInventoryUnit.findUniqueOrThrow({
      where: { id: pool.id },
    });
    expect(after.inventoryQty).toBe(2);
    expect(after.reservedQty).toBe(0);
  }, 30_000);

  it("d. the available guard never takes units held by storefront reservations", async () => {
    const { business, owner } = await setupBusiness();
    const pool = await createBaseInventoryUnit(business.id, {
      inventoryQty: 10,
      reservedQty: 8,
    });

    const take = (delta: number) =>
      withManualInventoryTx(db, async (tx) => {
        const items = await lockItems(tx, {
          businessId: business.id,
          ids: [pool.id],
        });
        return applyMovement(tx, items.get(pool.id)!, {
          movement: { mode: "delta", delta, guard: "available" },
          reason: "used",
          userId: owner.id,
        });
      });

    const err = await take(-3).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(InventoryMovementError);
    expect(err).toMatchObject({
      code: "INSUFFICIENT_AVAILABLE",
      details: { available: 2, requested: 3 },
    });
    expect(await qtyOf(pool.id)).toBe(10);
    expect(await historyFor(pool.id)).toHaveLength(0);

    const ok = await take(-2);
    expect(ok).toMatchObject({ previousQty: 10, newQty: 8, changeQty: -2 });
    expect(ok.historyId).toEqual(expect.any(String));
    expect(await qtyOf(pool.id)).toBe(8);
  }, 30_000);

  // ── e: expectedQty ────────────────────────────────────────────────────────

  it("e. adjustInventory with a stale expectedQty is refused with CONFLICT and writes nothing", async () => {
    const { business, caller } = await setupBusiness();
    const pool = await createBaseInventoryUnit(business.id, {
      inventoryQty: 10,
    });

    const err = await caller.baseInventoryUnit
      .adjustInventory({ id: pool.id, quantity: 4, expectedQty: 12 })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(TRPCError);
    expect(err).toMatchObject({
      code: "CONFLICT",
      message:
        "The count changed to 10 since you opened this — review and re-enter.",
    });
    expect(await qtyOf(pool.id)).toBe(10);
    expect(await historyFor(pool.id)).toHaveLength(0);

    // A matching expectedQty goes through.
    await expect(
      caller.baseInventoryUnit.adjustInventory({
        id: pool.id,
        quantity: 4,
        expectedQty: 10,
        reason: "correction",
        note: "recount",
      }),
    ).resolves.toEqual({ success: true });
    expect(await qtyOf(pool.id)).toBe(4);
    const rows = await historyFor(pool.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      previousQty: 10,
      newQty: 4,
      changeQty: -6,
      reason: "correction",
      note: "recount",
    });
  }, 30_000);

  // ── f: NOWAIT multi-row + retry ───────────────────────────────────────────

  it("f. multi-item NOWAIT lock retries until the holder commits, and gives up with CONFLICT when it never does", async () => {
    const { business, owner } = await setupBusiness();
    const itemA = await createBaseInventoryUnit(business.id, {
      name: "A",
      inventoryQty: 5,
    });
    const itemB = await createBaseInventoryUnit(business.id, {
      name: "B",
      inventoryQty: 5,
    });

    const holdB = () => {
      const gate = latch();
      const locked = latch();
      const tx = db.$transaction(async (t) => {
        await lockItems(t, { businessId: business.id, ids: [itemB.id] });
        locked.release();
        await gate.promise;
      }, TX_OPTS);
      return { tx, gate, locked };
    };

    const restockBoth = (onRetry: (attempt: number) => Promise<void>) =>
      withManualInventoryTx(
        db,
        async (tx) => {
          const items = await lockItems(tx, {
            businessId: business.id,
            ids: [itemA.id, itemB.id],
          });
          for (const item of items.values()) {
            await applyMovement(tx, item, {
              movement: { mode: "delta", delta: 1, guard: "none" },
              reason: "restock",
              userId: owner.id,
            });
          }
        },
        { onRetry: ({ attempt }) => onRetry(attempt) },
      );

    // 1) Holder releases during the retry window → succeeds on attempt 2.
    const holder1 = holdB();
    await holder1.locked.promise;
    const retries1: number[] = [];
    await restockBoth(async (attempt) => {
      retries1.push(attempt);
      holder1.gate.release();
      await holder1.tx;
    });
    expect(retries1).toEqual([1]);
    expect(await qtyOf(itemA.id)).toBe(6);
    expect(await qtyOf(itemB.id)).toBe(6);

    // 2) Holder outlives every attempt → CONFLICT, and A is untouched.
    await db.inventoryHistory.deleteMany({});
    const holder2 = holdB();
    await holder2.locked.promise;
    const retries2: number[] = [];
    const err = await restockBoth(async (attempt) => {
      retries2.push(attempt);
    }).catch((e: unknown) => e);
    holder2.gate.release();
    await holder2.tx;

    expect(err).toBeInstanceOf(TRPCError);
    expect(err).toMatchObject({
      code: "CONFLICT",
      message: INVENTORY_BUSY_MESSAGE,
    });
    expect(retries2).toEqual([1, 2, 3]); // 4 attempts total
    expect(await qtyOf(itemA.id)).toBe(6);
    expect(await qtyOf(itemB.id)).toBe(6);
    expect(await db.inventoryHistory.count()).toBe(0);
  }, 30_000);

  // ── g: alert flags ────────────────────────────────────────────────────────

  it("g. alert-flag reset matches the pre-refactor adjustInventory rule", async () => {
    const { business, caller } = await setupBusiness();
    const pool = await createBaseInventoryUnit(business.id, {
      inventoryQty: 0,
      lowInventoryThreshold: 5,
    });
    await db.baseInventoryUnit.update({
      where: { id: pool.id },
      data: { outOfStockAlertSent: true, lowInventoryAlertSent: true },
    });
    const flags = (id: string) =>
      db.baseInventoryUnit.findUniqueOrThrow({
        where: { id },
        select: { outOfStockAlertSent: true, lowInventoryAlertSent: true },
      });

    await caller.baseInventoryUnit.adjustInventory({
      id: pool.id,
      quantity: 3,
    });
    expect(await flags(pool.id)).toEqual({
      outOfStockAlertSent: false,
      lowInventoryAlertSent: true, // 3 is not above the threshold of 5
    });

    await caller.baseInventoryUnit.adjustInventory({
      id: pool.id,
      quantity: 6,
    });
    expect(await flags(pool.id)).toEqual({
      outOfStockAlertSent: false,
      lowInventoryAlertSent: false,
    });

    // No threshold → the low-stock flag is never reset.
    const noThreshold = await createBaseInventoryUnit(business.id, {
      inventoryQty: 0,
      lowInventoryThreshold: null,
    });
    await db.baseInventoryUnit.update({
      where: { id: noThreshold.id },
      data: { outOfStockAlertSent: true, lowInventoryAlertSent: true },
    });
    await caller.baseInventoryUnit.adjustInventory({
      id: noThreshold.id,
      quantity: 100,
    });
    expect(await flags(noThreshold.id)).toEqual({
      outOfStockAlertSent: false,
      lowInventoryAlertSent: true,
    });

    // Setting to 0 never resets the out-of-stock flag.
    await db.baseInventoryUnit.update({
      where: { id: noThreshold.id },
      data: { outOfStockAlertSent: true },
    });
    await caller.baseInventoryUnit.adjustInventory({
      id: noThreshold.id,
      quantity: 0,
    });
    expect((await flags(noThreshold.id)).outOfStockAlertSent).toBe(true);
  }, 30_000);

  // ── h: backorder pools ────────────────────────────────────────────────────

  it("h. a backordered (negative) pool rejects guarded removals but accepts a positive delta", async () => {
    const { business, owner } = await setupBusiness();
    const pool = await createBaseInventoryUnit(business.id, {
      inventoryQty: -5,
      allowBackorders: true,
    });
    const move = (delta: number, guard: "available" | "none") =>
      withManualInventoryTx(db, async (tx) => {
        const items = await lockItems(tx, {
          businessId: business.id,
          ids: [pool.id],
        });
        return applyMovement(tx, items.get(pool.id)!, {
          movement: { mode: "delta", delta, guard },
          reason: delta > 0 ? "restock" : "used",
          userId: owner.id,
        });
      });

    await expect(move(-1, "available")).rejects.toMatchObject({
      code: "INSUFFICIENT_AVAILABLE",
      details: { available: 0, requested: 1 },
    });
    await expect(move(-1, "none")).rejects.toMatchObject({ code: "NEGATIVE" });
    expect(await qtyOf(pool.id)).toBe(-5);

    await expect(move(10, "none")).resolves.toMatchObject({
      previousQty: -5,
      newQty: 5,
      changeQty: 10,
    });
    expect(await qtyOf(pool.id)).toBe(5);
  }, 30_000);

  // ── i: permissions + tenancy ──────────────────────────────────────────────

  it("i. STAFF may adjust; a non-member may not; another business's item is NOT_FOUND", async () => {
    const { business } = await setupBusiness();
    const pool = await createBaseInventoryUnit(business.id, {
      inventoryQty: 10,
    });

    const staffUser = await createUser({ name: "Staff" });
    await createMembership(business.id, staffUser.id, "STAFF");
    const staffCaller = createTestCaller({ userId: staffUser.id });
    await expect(
      staffCaller.baseInventoryUnit.adjustInventory({
        id: pool.id,
        quantity: 7,
      }),
    ).resolves.toEqual({ success: true });
    expect(await qtyOf(pool.id)).toBe(7);
    const [row] = await historyFor(pool.id);
    expect(row?.userId).toBe(staffUser.id);

    const stranger = await createUser({ name: "Stranger" });
    const strangerCaller = createTestCaller({ userId: stranger.id });
    await expect(
      strangerCaller.baseInventoryUnit.adjustInventory({
        id: pool.id,
        quantity: 1,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(await qtyOf(pool.id)).toBe(7);

    // An item in another business looks missing from this tenant.
    const other = await createBusiness({});
    const otherPool = await createBaseInventoryUnit(other.id, {
      inventoryQty: 50,
    });
    await expect(
      staffCaller.baseInventoryUnit.adjustInventory({
        id: otherPool.id,
        quantity: 0,
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(await qtyOf(otherPool.id)).toBe(50);
    expect(await historyFor(otherPool.id)).toHaveLength(0);
  }, 30_000);

  // ── j: sales totals are isolated from manual reasons ──────────────────────

  it("j. getById().sales stays empty after manual movements with every manual reason and write-offs", async () => {
    const { business, owner, caller } = await setupBusiness();
    const pool = await createBaseInventoryUnit(business.id, {
      inventoryQty: 100,
    });
    const checkout = await createInventoryCheckout(business.id, {
      lines: [{ itemId: pool.id, qtyOut: 2 }],
    });

    await withManualInventoryTx(db, async (tx) => {
      const items = await lockItems(tx, {
        businessId: business.id,
        ids: [pool.id],
      });
      const item = items.get(pool.id)!;
      for (const [i, reason] of MANUAL_REASONS.entries()) {
        await applyMovement(tx, item, {
          movement: {
            mode: "delta",
            delta: i % 2 === 0 ? 1 : -1,
            guard: "none",
          },
          reason,
          note: `manual ${reason}`,
          userId: owner.id,
          checkoutId: checkout.id,
        });
      }
      await recordWriteOff(tx, item, {
        reason: "damage",
        qty: 1,
        userId: owner.id,
        checkoutId: checkout.id,
      });
      await recordWriteOff(tx, item, {
        reason: "lost",
        qty: 3,
        note: "left at venue",
        userId: owner.id,
        checkoutId: checkout.id,
      });
    });

    const rows = await historyFor(pool.id);
    expect(rows).toHaveLength(MANUAL_REASONS.length + 2);
    // Movements chain in-place: 11 alternating ±1 → +1 net.
    expect(await qtyOf(pool.id)).toBe(101);
    const lost = rows.find((r) => r.reason === "lost" && r.changeQty === 0)!;
    expect(lost).toMatchObject({
      previousQty: 101,
      newQty: 101,
      changeQty: 0,
      note: "3 lost — left at venue",
      checkoutId: checkout.id,
    });
    expect(
      rows.find((r) => r.reason === "damage" && r.changeQty === 0)?.note,
    ).toBe("1 unit(s) not returned (damage)");

    const detail = await caller.baseInventoryUnit.getById({ id: pool.id });
    expect(detail.sales).toEqual(EMPTY_POOL_SALES);
  }, 30_000);

  // ── k: outstanding rentals ────────────────────────────────────────────────

  it("k. getOutstandingByItem sums open lines only, per item, tenant-scoped", async () => {
    const { business } = await setupBusiness();
    const throne = await createBaseInventoryUnit(business.id, {
      name: "Throne",
      itemType: "rental",
    });
    const chairs = await createBaseInventoryUnit(business.id, {
      name: "Chairs",
      itemType: "rental",
    });
    await createInventoryCheckout(business.id, {
      lines: [
        { itemId: throne.id, qtyOut: 1 },
        {
          itemId: chairs.id,
          qtyOut: 20,
          qtyReturned: 5,
          qtyDamaged: 1,
          qtyLost: 2,
        },
      ],
    });
    await createInventoryCheckout(business.id, {
      lines: [{ itemId: chairs.id, qtyOut: 10 }],
    });
    // Closed and fully returned lines don't count.
    await createInventoryCheckout(business.id, {
      status: "closed",
      lines: [{ itemId: chairs.id, qtyOut: 50 }],
    });
    await createInventoryCheckout(business.id, {
      lines: [{ itemId: throne.id, qtyOut: 2, qtyReturned: 2 }],
    });
    // Another business's checkout never leaks in.
    const other = await createBusiness({});
    const otherItem = await createBaseInventoryUnit(other.id);
    await createInventoryCheckout(other.id, {
      lines: [{ itemId: otherItem.id, qtyOut: 4 }],
    });

    const all = await getOutstandingByItem(db, business.id);
    expect(Object.fromEntries(all)).toEqual({
      [throne.id]: 1,
      [chairs.id]: 12 + 10,
    });
    const onlyChairs = await getOutstandingByItem(db, business.id, [chairs.id]);
    expect(Object.fromEntries(onlyChairs)).toEqual({ [chairs.id]: 22 });
    expect((await getOutstandingByItem(db, business.id, [])).size).toBe(0);
  }, 30_000);
});
