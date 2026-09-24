import Papa from "papaparse";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  applyMovement,
  deductPoolInventory,
  EMPTY_POOL_SALES,
  lockItems,
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

/**
 * Items router (base-inventory-unit): the item list/detail/history reads, the
 * owner CRUD + CSV procedures, use/restock, and the role/tenant/flag
 * boundaries around all of them. Ledger-core concurrency lives in
 * inventory-manual-movement.test.ts; CSV import in inventory-import.test.ts.
 *
 * `timingMiddleware` adds 100–500ms per call in NODE_ENV=test, hence the
 * explicit per-test timeouts.
 */

const reqHost = vi.hoisted(() => ({ value: "inv-items.simplepress.test" }));
vi.mock("next/headers", () => ({
  headers: () => Promise.resolve(new Headers({ host: reqHost.value })),
  cookies: () => Promise.resolve(new Headers()),
}));

const T = 60_000;

describe("inventory items router", () => {
  beforeEach(async () => {
    await resetDb();
    reqHost.value = "inv-items.simplepress.test";
  });

  async function setupBusiness(
    opts: { featureFlags?: Record<string, boolean>; timeZone?: string } = {},
  ) {
    const business = await createBusiness(opts);
    const owner = await createOwnerUser(business.id);
    reqHost.value = `${business.subdomain}.simplepress.test`;
    const caller = createTestCaller({ userId: owner.id });
    const staffUser = await createUser({ name: "Staff Person" });
    await createMembership(business.id, staffUser.id, "STAFF");
    const staff = createTestCaller({ userId: staffUser.id });
    return { business, owner, caller, staffUser, staff };
  }

  /** Check `qty` units out on an open check-out and take them off hand. */
  async function checkOut(
    businessId: string,
    itemId: string,
    qty: number,
    opts: { dueBackOn?: Date | null; label?: string } = {},
  ) {
    const checkout = await createInventoryCheckout(businessId, {
      label: opts.label ?? "Smith wedding",
      customerName: "Jane Smith",
      dueBackOn: opts.dueBackOn ?? null,
      lines: [{ itemId, itemName: "Item", qtyOut: qty }],
    });
    await db.baseInventoryUnit.update({
      where: { id: itemId },
      data: { inventoryQty: { decrement: qty } },
    });
    return checkout;
  }

  async function closeCheckout(
    checkoutId: string,
    itemId: string,
    qty: number,
  ) {
    await db.inventoryCheckoutLine.updateMany({
      where: { checkoutId },
      data: { qtyReturned: qty },
    });
    await db.inventoryCheckout.update({
      where: { id: checkoutId },
      data: { status: "closed", closedAt: new Date() },
    });
    await db.baseInventoryUnit.update({
      where: { id: itemId },
      data: { inventoryQty: { increment: qty } },
    });
  }

  const historyFor = (itemId: string) =>
    db.inventoryHistory.findMany({
      where: { baseInventoryUnitId: itemId },
      orderBy: { createdAt: "asc" },
    });

  const qtyOf = async (id: string) =>
    (await db.baseInventoryUnit.findUniqueOrThrow({ where: { id } }))
      .inventoryQty;

  const ymdDaysFromNow = (days: number) =>
    new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

  // ── items() ───────────────────────────────────────────────────────────────

  it(
    "items(): returns every item with sales, product count, outQty and sorted distinct categories",
    async () => {
      const { business, caller } = await setupBusiness();
      const throne = await createBaseInventoryUnit(business.id, {
        name: "Throne",
        itemType: "rental",
        inventoryQty: 3,
        category: "Furniture",
        unitCostCents: 125_000,
      });
      await createBaseInventoryUnit(business.id, {
        name: "Balloons",
        inventoryQty: 200,
        category: "Decor",
      });
      await createBaseInventoryUnit(business.id, {
        name: "Chairs",
        itemType: "rental",
        inventoryQty: 50,
        category: "Furniture",
      });
      await createBaseInventoryUnit(business.id, { name: "Tape" });
      await checkOut(business.id, throne.id, 2);

      const other = await createBusiness({});
      await createBaseInventoryUnit(other.id, {
        name: "Foreign",
        category: "Zzz",
      });

      const result = await caller.baseInventoryUnit.items();
      expect(result.canManage).toBe(true);
      expect(result.categories).toEqual(["Decor", "Furniture"]);
      expect(result.items.map((i) => i.name)).toEqual([
        "Balloons",
        "Chairs",
        "Tape",
        "Throne",
      ]);
      const t = result.items.find((i) => i.id === throne.id)!;
      expect(t).toMatchObject({
        itemType: "rental",
        inventoryQty: 1,
        outQty: 2,
        unitCostCents: 125_000,
        sales: EMPTY_POOL_SALES,
        _count: { products: 0 },
      });
      expect(result.items.find((i) => i.name === "Chairs")!.outQty).toBe(0);
    },
    T,
  );

  it(
    "items()/getById(): unit cost is null for STAFF, visible to owner and platform admin",
    async () => {
      const { business, caller, staff } = await setupBusiness();
      const item = await createBaseInventoryUnit(business.id, {
        name: "Throne",
        unitCostCents: 99_900,
      });

      const staffItems = await staff.baseInventoryUnit.items();
      expect(staffItems.canManage).toBe(false);
      expect(staffItems.items[0]!.unitCostCents).toBeNull();
      const staffDetail = await staff.baseInventoryUnit.getById({
        id: item.id,
      });
      expect(staffDetail.unitCostCents).toBeNull();

      expect(
        (await caller.baseInventoryUnit.items()).items[0]!.unitCostCents,
      ).toBe(99_900);
      expect(
        (await caller.baseInventoryUnit.getById({ id: item.id })).unitCostCents,
      ).toBe(99_900);

      const admin = await createUser({ platformRole: "PLATFORM_ADMIN" });
      const adminCaller = createTestCaller({
        userId: admin.id,
        platformRole: "PLATFORM_ADMIN",
      });
      expect(
        (await adminCaller.baseInventoryUnit.items()).items[0]!.unitCostCents,
      ).toBe(99_900);
    },
    T,
  );

  // ── getById() ─────────────────────────────────────────────────────────────

  it(
    "getById(): open lines with outstanding > 0, overdue in the business zone, outQty; no inline history",
    async () => {
      const { business, caller } = await setupBusiness();
      const throne = await createBaseInventoryUnit(business.id, {
        name: "Throne",
        itemType: "rental",
        inventoryQty: 10,
      });
      const late = await checkOut(business.id, throne.id, 2, {
        label: "Late event",
        dueBackOn: new Date(`${ymdDaysFromNow(-5)}T00:00:00Z`),
      });
      const onTime = await checkOut(business.id, throne.id, 3, {
        label: "Future event",
        dueBackOn: new Date(`${ymdDaysFromNow(5)}T00:00:00Z`),
      });
      // Fully returned line on an open check-out: not listed.
      await createInventoryCheckout(business.id, {
        label: "Done line",
        lines: [
          { itemId: throne.id, itemName: "Throne", qtyOut: 1, qtyReturned: 1 },
        ],
      });
      // Closed check-out: not listed.
      await createInventoryCheckout(business.id, {
        label: "Closed",
        status: "closed",
        lines: [{ itemId: throne.id, itemName: "Throne", qtyOut: 4 }],
      });

      const detail = await caller.baseInventoryUnit.getById({ id: throne.id });
      expect(detail.outQty).toBe(5);
      expect(detail.inventoryQty).toBe(5);
      expect(detail).not.toHaveProperty("inventoryHistory");
      expect(detail.openLines).toHaveLength(2);
      const byLabel = new Map(detail.openLines.map((l) => [l.label, l]));
      expect(byLabel.get("Late event")).toMatchObject({
        checkoutId: late.id,
        lineId: late.lines[0]!.id,
        customerName: "Jane Smith",
        outstanding: 2,
        overdue: true,
      });
      expect(byLabel.get("Future event")).toMatchObject({
        checkoutId: onTime.id,
        outstanding: 3,
        overdue: false,
      });
      expect(detail.products).toEqual([]);
    },
    T,
  );

  it(
    "getById(): another business's item is NOT_FOUND 'Item not found'",
    async () => {
      const { staff } = await setupBusiness();
      const other = await createBusiness({});
      const foreign = await createBaseInventoryUnit(other.id, {});
      await expect(
        staff.baseInventoryUnit.getById({ id: foreign.id }),
      ).rejects.toMatchObject({ code: "NOT_FOUND", message: "Item not found" });
    },
    T,
  );

  // ── history() ─────────────────────────────────────────────────────────────

  it(
    "history(): pages of 25 newest-first, page clamped, product/variant-only rows and other tenants excluded",
    async () => {
      const { business, staff } = await setupBusiness();
      const item = await createBaseInventoryUnit(business.id, { name: "A" });
      const base = Date.UTC(2026, 8, 1, 12);
      await db.inventoryHistory.createMany({
        data: Array.from({ length: 30 }, (_, i) => ({
          businessId: business.id,
          baseInventoryUnitId: item.id,
          previousQty: i,
          newQty: i + 1,
          changeQty: 1,
          reason: "restock",
          createdAt: new Date(base + i * 60_000),
        })),
      });
      // Product-only row (no pool): never part of item history.
      const product = await createProduct(business.id, {});
      await db.inventoryHistory.create({
        data: {
          businessId: business.id,
          productId: product.id,
          previousQty: 0,
          newQty: 5,
          changeQty: 5,
          reason: "adjustment",
        },
      });
      const other = await createBusiness({});
      const foreign = await createBaseInventoryUnit(other.id, {});
      await db.inventoryHistory.create({
        data: {
          businessId: other.id,
          baseInventoryUnitId: foreign.id,
          previousQty: 0,
          newQty: 1,
          changeQty: 1,
          reason: "restock",
        },
      });

      const page1 = await staff.baseInventoryUnit.history({});
      expect(page1).toMatchObject({
        totalCount: 30,
        page: 1,
        pageCount: 2,
        pageSize: 25,
      });
      expect(page1.rows).toHaveLength(25);
      expect(page1.rows[0]!.newQty).toBe(30);
      expect(page1.rows[0]!.item).toMatchObject({
        id: item.id,
        name: "A",
        itemType: "stock",
      });

      const clamped = await staff.baseInventoryUnit.history({ page: 99 });
      expect(clamped.page).toBe(2);
      expect(clamped.rows).toHaveLength(5);
      expect(clamped.rows.at(-1)!.newQty).toBe(1);
    },
    T,
  );

  it(
    "history(): filters by item, reasons, and inclusive local-day range in the business zone",
    async () => {
      const { business, owner, staff } = await setupBusiness({
        timeZone: "America/Detroit",
      });
      const a = await createBaseInventoryUnit(business.id, { name: "A" });
      const b = await createBaseInventoryUnit(business.id, { name: "B" });
      const order = await createOrder(business.id, { total: 100 });
      const row = (
        itemId: string,
        reason: string,
        createdAt: string,
        extra: Record<string, unknown> = {},
      ) => ({
        businessId: business.id,
        baseInventoryUnitId: itemId,
        previousQty: 0,
        newQty: 0,
        changeQty: 0,
        reason,
        createdAt: new Date(createdAt),
        ...extra,
      });
      await db.inventoryHistory.createMany({
        data: [
          // 2026-09-09 23:30 in Detroit (EDT, UTC−4)
          row(a.id, "used", "2026-09-10T03:30:00Z", { userId: owner.id }),
          // 2026-09-10 01:00 in Detroit
          row(a.id, "restock", "2026-09-10T05:00:00Z"),
          // 2026-09-10 23:59 in Detroit
          row(b.id, "sale", "2026-09-11T03:59:00Z", { orderId: order.id }),
          // 2026-09-11 00:01 in Detroit
          row(b.id, "used", "2026-09-11T04:01:00Z"),
        ],
      });

      const onlyA = await staff.baseInventoryUnit.history({ itemId: a.id });
      expect(onlyA.totalCount).toBe(2);

      const used = await staff.baseInventoryUnit.history({ reasons: ["used"] });
      expect(used.rows.map((r) => r.item?.name).sort()).toEqual(["A", "B"]);
      expect(used.rows.find((r) => r.item?.name === "A")!.user).toMatchObject({
        name: "Test Owner",
      });

      const day10 = await staff.baseInventoryUnit.history({
        from: "2026-09-10",
        to: "2026-09-10",
      });
      expect(day10.rows.map((r) => r.reason).sort()).toEqual([
        "restock",
        "sale",
      ]);
      expect(day10.rows.find((r) => r.reason === "sale")!.order).toMatchObject({
        id: order.id,
        orderNumber: order.orderNumber,
      });

      const day9 = await staff.baseInventoryUnit.history({ to: "2026-09-09" });
      expect(day9.rows.map((r) => r.reason)).toEqual(["used"]);

      const from11 = await staff.baseInventoryUnit.history({
        from: "2026-09-11",
        itemId: b.id,
        reasons: ["used", "sale"],
      });
      expect(from11.rows.map((r) => r.reason)).toEqual(["used"]);

      await expect(
        staff.baseInventoryUnit.history({ from: "2026-13-45" }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    },
    T,
  );

  it(
    "exportHistory(): CSV columns, labels, sanitized notes, filename",
    async () => {
      const { business, owner, caller } = await setupBusiness();
      const item = await createBaseInventoryUnit(business.id, {
        name: "Balloons",
        sku: "BAL-1",
        inventoryQty: 10,
      });
      await caller.baseInventoryUnit.moveStock({
        id: item.id,
        kind: "use",
        quantity: 3,
        note: "=HYPERLINK(evil)",
      });
      const checkout = await createInventoryCheckout(business.id, {
        label: "Gala",
      });
      await db.inventoryHistory.create({
        data: {
          businessId: business.id,
          baseInventoryUnitId: item.id,
          previousQty: 7,
          newQty: 7,
          changeQty: 0,
          reason: "lost",
          checkoutId: checkout.id,
          userId: owner.id,
          createdAt: new Date(Date.now() - 60_000),
        },
      });

      const result = await caller.baseInventoryUnit.exportHistory({});
      expect(result.capped).toBe(false);
      expect(result.filename).toMatch(
        /^inventory-activity-\d{4}-\d{2}-\d{2}\.csv$/,
      );
      const parsed = Papa.parse<Record<string, string>>(result.csv, {
        header: true,
      });
      expect(parsed.meta.fields).toEqual([
        "Date",
        "Item",
        "SKU",
        "Reason",
        "Change",
        "Resulting qty",
        "Order #",
        "Check-out",
        "By",
        "Note",
      ]);
      expect(parsed.data).toHaveLength(2);
      const [used, lost] = parsed.data;
      expect(used).toMatchObject({
        Item: "Balloons",
        SKU: "BAL-1",
        Reason: "Used",
        Change: "-3",
        "Resulting qty": "7",
        By: "Test Owner",
        Note: "'=HYPERLINK(evil)",
      });
      expect(new Date(used!.Date!).toISOString()).toBe(used!.Date);
      expect(lost).toMatchObject({ Reason: "Lost", "Check-out": "Gala" });

      const filtered = await caller.baseInventoryUnit.exportHistory({
        reasons: ["lost"],
      });
      expect(filtered.csv.trim().split("\n")).toHaveLength(2);
    },
    T,
  );

  // ── create / update ───────────────────────────────────────────────────────

  it(
    "create(): new fields trimmed/blank→null; qty > 0 writes one 'initial' row; qty 0 writes none",
    async () => {
      const { business, owner, caller } = await setupBusiness();
      const created = await caller.baseInventoryUnit.create({
        name: "  Throne  ",
        itemType: "rental",
        sku: " THR-1 ",
        category: "Furniture",
        storageLocation: "   ",
        unitCostCents: 50_000,
        inventoryQty: 2,
        description: "",
      });
      expect(created).toMatchObject({
        businessId: business.id,
        name: "Throne",
        itemType: "rental",
        sku: "THR-1",
        category: "Furniture",
        storageLocation: null,
        description: null,
        unitCostCents: 50_000,
        inventoryQty: 2,
        allowBackorders: false,
      });
      const rows = await historyFor(created.id);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        reason: "initial",
        previousQty: 0,
        newQty: 2,
        changeQty: 2,
        userId: owner.id,
        orderId: null,
      });

      const empty = await caller.baseInventoryUnit.create({ name: "Tape" });
      expect(empty).toMatchObject({ itemType: "stock", inventoryQty: 0 });
      expect(await historyFor(empty.id)).toHaveLength(0);
    },
    T,
  );

  it(
    "create()/update(): SKU conflicts are case-insensitive; an item may keep its own SKU",
    async () => {
      const { business, caller } = await setupBusiness();
      const throne = await createBaseInventoryUnit(business.id, {
        name: "Throne",
        sku: "THR-1",
      });
      await expect(
        caller.baseInventoryUnit.create({ name: "Other", sku: "thr-1" }),
      ).rejects.toMatchObject({
        code: "CONFLICT",
        message: "SKU thr-1 is already used by Throne",
      });
      expect(await db.baseInventoryUnit.count()).toBe(1);

      const chair = await caller.baseInventoryUnit.create({
        name: "Chair",
        sku: "CH-1",
      });
      await expect(
        caller.baseInventoryUnit.update({ id: chair.id, sku: "Thr-1" }),
      ).rejects.toMatchObject({
        code: "CONFLICT",
        message: "SKU Thr-1 is already used by Throne",
      });
      // Re-casing its own SKU is not a conflict.
      await expect(
        caller.baseInventoryUnit.update({ id: throne.id, sku: "thr-1" }),
      ).resolves.toMatchObject({ sku: "thr-1" });
      // null clears; omitted fields are untouched.
      const cleared = await caller.baseInventoryUnit.update({
        id: chair.id,
        sku: null,
        category: "Seating",
      });
      expect(cleared).toMatchObject({
        sku: null,
        category: "Seating",
        name: "Chair",
      });
    },
    T,
  );

  it(
    "update(): rental → stock is blocked while units are out, allowed once back",
    async () => {
      const { business, caller } = await setupBusiness();
      const throne = await createBaseInventoryUnit(business.id, {
        name: "Throne",
        itemType: "rental",
        inventoryQty: 3,
      });
      const co = await checkOut(business.id, throne.id, 2);
      await expect(
        caller.baseInventoryUnit.update({ id: throne.id, itemType: "stock" }),
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: "2 units are still checked out — check them in first",
      });
      // Other edits are fine while out.
      await caller.baseInventoryUnit.update({
        id: throne.id,
        name: "Big Throne",
      });

      await closeCheckout(co.id, throne.id, 2);
      await expect(
        caller.baseInventoryUnit.update({ id: throne.id, itemType: "stock" }),
      ).resolves.toMatchObject({ itemType: "stock", name: "Big Throne" });
    },
    T,
  );

  // ── delete ────────────────────────────────────────────────────────────────

  it(
    "delete(): blocked while units are out; after check-in it deletes and re-enables linked products",
    async () => {
      const { business, caller } = await setupBusiness();
      const throne = await createBaseInventoryUnit(business.id, {
        name: "Throne",
        itemType: "rental",
        inventoryQty: 1,
      });
      const product = await createProduct(business.id, {
        trackInventory: false,
      });
      await db.product.update({
        where: { id: product.id },
        data: {
          baseInventoryUnitId: throne.id,
          baseUnitsConsumed: 1,
          inventoryQty: 7,
        },
      });
      const co = await checkOut(business.id, throne.id, 1);

      await expect(
        caller.baseInventoryUnit.delete({ id: throne.id }),
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: "1 unit is still checked out — check them in first",
      });
      expect(
        await db.baseInventoryUnit.count({ where: { id: throne.id } }),
      ).toBe(1);

      await closeCheckout(co.id, throne.id, 1);
      await expect(
        caller.baseInventoryUnit.delete({ id: throne.id }),
      ).resolves.toEqual({ success: true });
      expect(
        await db.baseInventoryUnit.count({ where: { id: throne.id } }),
      ).toBe(0);
      const after = await db.product.findUniqueOrThrow({
        where: { id: product.id },
      });
      expect(after).toMatchObject({
        trackInventory: true,
        inventoryQty: 0,
        baseUnitsConsumed: null,
        baseInventoryUnitId: null,
      });
      // The closed check-out's line survives with its snapshot name.
      const line = await db.inventoryCheckoutLine.findFirstOrThrow({
        where: { checkoutId: co.id },
      });
      expect(line.itemId).toBeNull();
    },
    T,
  );

  // ── moveStock ─────────────────────────────────────────────────────────────

  it(
    "moveStock(): use/restock write 'used'/'restock' rows; use on a rental or beyond available is refused",
    async () => {
      const { business, staffUser, staff } = await setupBusiness();
      const balloons = await createBaseInventoryUnit(business.id, {
        name: "Balloons",
        inventoryQty: 10,
        reservedQty: 4,
      });

      await expect(
        staff.baseInventoryUnit.moveStock({
          id: balloons.id,
          kind: "use",
          quantity: 6,
          note: "  Gala  ",
        }),
      ).resolves.toEqual({ previousQty: 10, newQty: 4 });
      // 4 on hand, all 4 reserved → nothing available.
      await expect(
        staff.baseInventoryUnit.moveStock({
          id: balloons.id,
          kind: "use",
          quantity: 1,
        }),
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: "Only 0 available for Balloons",
      });
      await expect(
        staff.baseInventoryUnit.moveStock({
          id: balloons.id,
          kind: "restock",
          quantity: 20,
        }),
      ).resolves.toEqual({ previousQty: 4, newQty: 24 });

      const rows = await historyFor(balloons.id);
      expect(
        rows.map((r) => [r.reason, r.changeQty, r.note, r.userId]),
      ).toEqual([
        ["used", -6, "Gala", staffUser.id],
        ["restock", 20, null, staffUser.id],
      ]);

      const throne = await createBaseInventoryUnit(business.id, {
        name: "Throne",
        itemType: "rental",
        inventoryQty: 2,
      });
      await expect(
        staff.baseInventoryUnit.moveStock({
          id: throne.id,
          kind: "use",
          quantity: 1,
        }),
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: "Use applies to stock items — check rentals out instead",
      });
      await expect(
        staff.baseInventoryUnit.moveStock({
          id: throne.id,
          kind: "restock",
          quantity: 1,
        }),
      ).resolves.toEqual({ previousQty: 2, newQty: 3 });

      await expect(
        staff.baseInventoryUnit.moveStock({
          id: throne.id,
          kind: "restock",
          quantity: 0,
        }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    },
    T,
  );

  // ── sales isolation ───────────────────────────────────────────────────────

  it(
    "sales summary is unchanged by initial/used/restock/import/adjust rows",
    async () => {
      const { business, owner, caller } = await setupBusiness();
      const created = await caller.baseInventoryUnit.create({
        name: "Balloons",
        sku: "BAL",
        inventoryQty: 100,
      });
      const product = await createProduct(business.id, {
        trackInventory: false,
      });
      await db.product.update({
        where: { id: product.id },
        data: { baseInventoryUnitId: created.id, baseUnitsConsumed: 2 },
      });
      const order = await createOrder(business.id, { total: 1000 });
      await db.$transaction((tx) =>
        deductPoolInventory(tx, {
          poolId: created.id,
          items: [{ productId: product.id, quantity: 3 }],
          unitsConsumedMap: { [product.id]: 2 },
          orderId: order.id,
          orderNumber: order.orderNumber,
          businessId: business.id,
        }),
      );
      const before = (
        await caller.baseInventoryUnit.getById({ id: created.id })
      ).sales;
      expect(before.netSoldUnits).toBe(6);

      await caller.baseInventoryUnit.moveStock({
        id: created.id,
        kind: "use",
        quantity: 5,
      });
      await caller.baseInventoryUnit.moveStock({
        id: created.id,
        kind: "restock",
        quantity: 9,
      });
      await caller.baseInventoryUnit.adjustInventory({
        id: created.id,
        quantity: 50,
        reason: "return",
      });
      await caller.baseInventoryUnit.commitImport({
        csvContent: "SKU,Quantity\nBAL,77\n",
        fileName: "x.csv",
      });
      await db.$transaction(async (tx) => {
        const locked = await lockItems(tx, {
          businessId: business.id,
          ids: [created.id],
        });
        await applyMovement(tx, locked.get(created.id)!, {
          movement: { mode: "delta", delta: 1, guard: "none" },
          reason: "checkin",
          userId: owner.id,
        });
      });

      const reasons = (await historyFor(created.id)).map((r) => r.reason);
      expect(reasons).toEqual([
        "initial",
        "sale",
        "used",
        "restock",
        "return",
        "import",
        "checkin",
      ]);
      const after = await caller.baseInventoryUnit.getById({ id: created.id });
      expect(after.sales).toEqual(before);
      const listed = (await caller.baseInventoryUnit.items()).items[0]!;
      expect(listed.sales).toEqual(before);
    },
    T,
  );

  // ── permissions / tenancy / flags ─────────────────────────────────────────

  it(
    "STAFF: allowed reads/adjust/moveStock; FORBIDDEN on owner procedures and on list",
    async () => {
      const { business, staff } = await setupBusiness();
      const item = await createBaseInventoryUnit(business.id, {
        name: "Balloons",
        inventoryQty: 10,
      });

      await expect(staff.baseInventoryUnit.items()).resolves.toBeDefined();
      await expect(
        staff.baseInventoryUnit.getById({ id: item.id }),
      ).resolves.toBeDefined();
      await expect(staff.baseInventoryUnit.history({})).resolves.toBeDefined();
      await expect(
        staff.baseInventoryUnit.adjustInventory({ id: item.id, quantity: 9 }),
      ).resolves.toEqual({ success: true });
      await expect(
        staff.baseInventoryUnit.moveStock({
          id: item.id,
          kind: "use",
          quantity: 1,
        }),
      ).resolves.toEqual({ previousQty: 9, newQty: 8 });

      const forbidden = [
        () => staff.baseInventoryUnit.list(),
        () => staff.baseInventoryUnit.create({ name: "X" }),
        () => staff.baseInventoryUnit.update({ id: item.id, name: "Y" }),
        () => staff.baseInventoryUnit.delete({ id: item.id }),
        () => staff.baseInventoryUnit.exportCsv(),
        () => staff.baseInventoryUnit.exportHistory({}),
        () =>
          staff.baseInventoryUnit.previewImport({
            csvContent: "Name\nX\n",
            fileName: "x.csv",
          }),
        () =>
          staff.baseInventoryUnit.commitImport({
            csvContent: "Name\nX\n",
            fileName: "x.csv",
          }),
      ];
      for (const call of forbidden) {
        await expect(call()).rejects.toMatchObject({ code: "FORBIDDEN" });
      }
      const fresh = await db.baseInventoryUnit.findMany();
      expect(fresh).toHaveLength(1);
      expect(fresh[0]).toMatchObject({ name: "Balloons", inventoryQty: 8 });
    },
    T,
  );

  it(
    "a non-member is FORBIDDEN on staff and owner procedures",
    async () => {
      const { business } = await setupBusiness();
      const item = await createBaseInventoryUnit(business.id, {
        inventoryQty: 5,
      });
      const stranger = await createUser({});
      const c = createTestCaller({ userId: stranger.id });
      for (const call of [
        () => c.baseInventoryUnit.items(),
        () => c.baseInventoryUnit.getById({ id: item.id }),
        () => c.baseInventoryUnit.history({}),
        () =>
          c.baseInventoryUnit.moveStock({
            id: item.id,
            kind: "restock",
            quantity: 1,
          }),
        () => c.baseInventoryUnit.create({ name: "X" }),
      ]) {
        await expect(call()).rejects.toMatchObject({ code: "FORBIDDEN" });
      }
      expect(await qtyOf(item.id)).toBe(5);
      expect(await db.baseInventoryUnit.count()).toBe(1);
    },
    T,
  );

  it(
    "another business's ids are NOT_FOUND on every mutation, with nothing written",
    async () => {
      const { caller } = await setupBusiness();
      const other = await createBusiness({});
      const foreign = await createBaseInventoryUnit(other.id, {
        name: "Foreign",
        itemType: "stock",
        inventoryQty: 50,
      });
      const product = await createProduct(other.id, { trackInventory: false });
      await db.product.update({
        where: { id: product.id },
        data: { baseInventoryUnitId: foreign.id, baseUnitsConsumed: 1 },
      });

      for (const call of [
        () => caller.baseInventoryUnit.getById({ id: foreign.id }),
        () => caller.baseInventoryUnit.update({ id: foreign.id, name: "Mine" }),
        () =>
          caller.baseInventoryUnit.update({
            id: foreign.id,
            itemType: "rental",
          }),
        () => caller.baseInventoryUnit.delete({ id: foreign.id }),
        () =>
          caller.baseInventoryUnit.adjustInventory({
            id: foreign.id,
            quantity: 0,
          }),
        () =>
          caller.baseInventoryUnit.moveStock({
            id: foreign.id,
            kind: "use",
            quantity: 1,
          }),
        () =>
          caller.baseInventoryUnit.moveStock({
            id: foreign.id,
            kind: "restock",
            quantity: 1,
          }),
      ]) {
        await expect(call()).rejects.toMatchObject({ code: "NOT_FOUND" });
      }

      const after = await db.baseInventoryUnit.findUniqueOrThrow({
        where: { id: foreign.id },
      });
      expect(after).toMatchObject({
        name: "Foreign",
        itemType: "stock",
        inventoryQty: 50,
      });
      expect(await historyFor(foreign.id)).toHaveLength(0);
      expect(
        await db.product.findUniqueOrThrow({ where: { id: product.id } }),
      ).toMatchObject({
        baseInventoryUnitId: foreign.id,
        trackInventory: false,
      });

      // history() filtered to a foreign item is simply empty.
      const h = await caller.baseInventoryUnit.history({ itemId: foreign.id });
      expect(h.totalCount).toBe(0);
    },
    T,
  );

  it(
    "inventory flag off: gated procedures are FORBIDDEN; list stays available",
    async () => {
      const { business, caller, staff } = await setupBusiness({
        featureFlags: { inventory: false },
      });
      const item = await createBaseInventoryUnit(business.id, {
        inventoryQty: 5,
      });
      for (const call of [
        () => caller.baseInventoryUnit.items(),
        () => caller.baseInventoryUnit.getById({ id: item.id }),
        () => caller.baseInventoryUnit.history({}),
        () => caller.baseInventoryUnit.exportHistory({}),
        () => caller.baseInventoryUnit.create({ name: "X" }),
        () => caller.baseInventoryUnit.update({ id: item.id, name: "Y" }),
        () => caller.baseInventoryUnit.delete({ id: item.id }),
        () =>
          caller.baseInventoryUnit.moveStock({
            id: item.id,
            kind: "restock",
            quantity: 1,
          }),
        () => caller.baseInventoryUnit.exportCsv(),
        () =>
          caller.baseInventoryUnit.previewImport({
            csvContent: "Name\nX\n",
            fileName: "x.csv",
          }),
        () =>
          caller.baseInventoryUnit.commitImport({
            csvContent: "Name\nX\n",
            fileName: "x.csv",
          }),
        () => staff.baseInventoryUnit.items(),
      ]) {
        await expect(call()).rejects.toMatchObject({
          code: "FORBIDDEN",
          message: expect.stringContaining(
            "inventory feature is not enabled",
          ) as string,
        });
      }
      await expect(caller.baseInventoryUnit.list()).resolves.toHaveLength(1);
      expect(await qtyOf(item.id)).toBe(5);
    },
    T,
  );
});
