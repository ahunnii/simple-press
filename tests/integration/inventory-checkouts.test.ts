import { TRPCError } from "@trpc/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { PoolLedgerGroupRow } from "~/lib/inventory";
import {
  EMPTY_POOL_SALES,
  getOutstandingByItem,
  poolSalesWhere,
  summarizePoolSales,
} from "~/lib/inventory";

import { createTestCaller } from "../helpers/caller";
import { db, resetDb } from "../helpers/db";
import {
  createBaseInventoryUnit,
  createBusiness,
  createInventoryCheckout,
  createMembership,
  createOwnerUser,
  createUser,
} from "../helpers/factories";

/**
 * `inventoryCheckout` router: rental check-out / check-in.
 *
 * Every procedure call pays `timingMiddleware`'s 100–500ms artificial dev
 * delay, so the suite carries a generous per-test timeout.
 */

// Procedures resolve the tenant from the request host via `next/headers` — see
// tenant-isolation.test.ts for the reference pattern.
const reqHost = vi.hoisted(() => ({ value: "inv-co.simplepress.test" }));
vi.mock("next/headers", () => ({
  headers: () => Promise.resolve(new Headers({ host: reqHost.value })),
  cookies: () => Promise.resolve(new Headers()),
}));

async function expectTrpcError(
  call: Promise<unknown>,
  code: string,
  message?: string | RegExp,
): Promise<TRPCError> {
  const err = await call.then(
    () => {
      throw new Error(`Expected ${code}, but the call succeeded`);
    },
    (e: unknown) => e,
  );
  expect(err).toBeInstanceOf(TRPCError);
  const trpcErr = err as TRPCError;
  expect(trpcErr.code).toBe(code);
  if (typeof message === "string") expect(trpcErr.message).toContain(message);
  if (message instanceof RegExp) expect(trpcErr.message).toMatch(message);
  return trpcErr;
}

const qtyOf = async (id: string) =>
  (await db.baseInventoryUnit.findUniqueOrThrow({ where: { id } }))
    .inventoryQty;

/** Total = on hand + out (units on open check-out lines). */
async function totalOf(businessId: string, id: string) {
  const out = await getOutstandingByItem(db, businessId, [id]);
  return (await qtyOf(id)) + (out.get(id) ?? 0);
}

async function poolSales(businessId: string, poolId: string) {
  const grouped = await db.inventoryHistory.groupBy({
    by: ["baseInventoryUnitId", "reason"],
    where: poolSalesWhere({ businessId, poolId }),
    _sum: { changeQty: true },
    _count: { _all: true },
  });
  const rows: PoolLedgerGroupRow[] = grouped.map((r) => ({
    baseInventoryUnitId: r.baseInventoryUnitId,
    reason: r.reason,
    _sum: { changeQty: r._sum.changeQty },
    _count: { _all: r._count._all },
  }));
  return summarizePoolSales(rows).get(poolId) ?? EMPTY_POOL_SALES;
}

describe("inventoryCheckout router", { timeout: 60_000 }, () => {
  beforeEach(async () => {
    await resetDb();
    reqHost.value = "inv-co.simplepress.test";
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function setup(
    opts: { featureFlags?: Record<string, boolean>; timeZone?: string } = {},
  ) {
    const business = await createBusiness({
      featureFlags: opts.featureFlags ?? { inventoryRentals: true },
      ...(opts.timeZone ? { timeZone: opts.timeZone } : {}),
    });
    const owner = await createOwnerUser(business.id);
    const staffUser = await createUser({ name: "Test Staff" });
    await createMembership(business.id, staffUser.id, "STAFF");
    reqHost.value = `${business.subdomain}.simplepress.test`;
    return {
      business,
      owner,
      staffUser,
      caller: createTestCaller({ userId: owner.id }),
      staff: createTestCaller({ userId: staffUser.id }),
    };
  }

  const setFlags = (
    businessId: string,
    featureFlags: Record<string, boolean>,
  ) =>
    db.business.update({ where: { id: businessId }, data: { featureFlags } });

  const rental = (businessId: string, name: string, qty: number, extra = {}) =>
    createBaseInventoryUnit(businessId, {
      name,
      inventoryQty: qty,
      itemType: "rental",
      ...extra,
    });

  // ── create ──────────────────────────────────────────────────────────────────

  it("create takes units off hand, writes one checkout row per line, and Total = on hand + out", async () => {
    const { business, owner, caller } = await setup();
    const chairs = await rental(business.id, "Chairs", 100);
    const throne = await rental(business.id, "Throne", 1);

    const { id } = await caller.inventoryCheckout.create({
      label: "Smith wedding",
      customerName: "Jane Smith",
      notes: "Back door",
      dueBackOn: "2099-01-05",
      lines: [
        { itemId: chairs.id, qty: 40 },
        { itemId: throne.id, qty: 1 },
        { itemId: chairs.id, qty: 10 }, // merged with the first line
      ],
    });

    expect(await qtyOf(chairs.id)).toBe(50);
    expect(await qtyOf(throne.id)).toBe(0);
    expect(await totalOf(business.id, chairs.id)).toBe(100);
    expect(await totalOf(business.id, throne.id)).toBe(1);

    const checkout = await db.inventoryCheckout.findUniqueOrThrow({
      where: { id },
      include: { lines: { orderBy: { itemName: "asc" } } },
    });
    expect(checkout).toMatchObject({
      businessId: business.id,
      label: "Smith wedding",
      customerName: "Jane Smith",
      notes: "Back door",
      status: "open",
      createdById: owner.id,
      closedAt: null,
    });
    expect(checkout.dueBackOn?.toISOString()).toBe("2099-01-05T00:00:00.000Z");
    expect(checkout.lines.map((l) => [l.itemName, l.itemId, l.qtyOut])).toEqual(
      [
        ["Chairs", chairs.id, 50],
        ["Throne", throne.id, 1],
      ],
    );

    const history = await db.inventoryHistory.findMany({
      where: { businessId: business.id },
      orderBy: { changeQty: "asc" },
    });
    expect(history).toHaveLength(2);
    expect(
      history.map((h) => ({
        item: h.baseInventoryUnitId,
        reason: h.reason,
        changeQty: h.changeQty,
        previousQty: h.previousQty,
        newQty: h.newQty,
        checkoutId: h.checkoutId,
        note: h.note,
        userId: h.userId,
      })),
    ).toEqual([
      {
        item: chairs.id,
        reason: "checkout",
        changeQty: -50,
        previousQty: 100,
        newQty: 50,
        checkoutId: id,
        note: "Smith wedding",
        userId: owner.id,
      },
      {
        item: throne.id,
        reason: "checkout",
        changeQty: -1,
        previousQty: 1,
        newQty: 0,
        checkoutId: id,
        note: "Smith wedding",
        userId: owner.id,
      },
    ]);

    const detail = await caller.inventoryCheckout.getById({ id });
    expect(detail.outstanding).toBe(51);
    expect(detail.dueBackOnYmd).toBe("2099-01-05");
    expect(detail.overdue).toBe(false);
    expect(detail.notes).toBe("Back door");
    expect(detail.createdBy).toEqual({
      name: owner.name,
      email: owner.email,
    });
    expect(detail.lines.map((l) => [l.itemName, l.outstanding])).toEqual([
      ["Chairs", 50],
      ["Throne", 1],
    ]);
    expect(detail.lines[0]!.item).toEqual({
      id: chairs.id,
      name: "Chairs",
      sku: null,
      itemType: "rental",
    });
    expect(detail.history.map((h) => [h.reason, h.itemName])).toHaveLength(2);

    const picker = await caller.inventoryCheckout.availableRentalItems();
    expect(
      picker.map((p) => [p.name, p.inventoryQty, p.available, p.outQty]),
    ).toEqual([
      ["Chairs", 50, 50, 50],
      ["Throne", 0, 0, 1],
    ]);
    expect(picker[0]).not.toHaveProperty("unitCostCents");
  });

  it("create with a short line rolls back everything and lists every short item", async () => {
    const { business, caller } = await setup();
    const chairs = await rental(business.id, "Chairs", 40);
    const throne = await rental(business.id, "Throne", 0);
    const tables = await rental(business.id, "Tables", 10);

    const err = await expectTrpcError(
      caller.inventoryCheckout.create({
        label: "Too big",
        lines: [
          { itemId: tables.id, qty: 5 },
          { itemId: chairs.id, qty: 80 },
          { itemId: throne.id, qty: 1 },
        ],
      }),
      "BAD_REQUEST",
    );
    expect(err.message).toBe(
      "Chairs: 40 available, 80 requested; Throne: 0 available, 1 requested",
    );

    expect(await db.inventoryCheckout.count()).toBe(0);
    expect(await db.inventoryCheckoutLine.count()).toBe(0);
    expect(await db.inventoryHistory.count()).toBe(0);
    expect(await qtyOf(tables.id)).toBe(10);
    expect(await qtyOf(chairs.id)).toBe(40);
  });

  it("create never takes units a storefront checkout is holding (reservedQty)", async () => {
    const { business, caller } = await setup();
    const tents = await rental(business.id, "Tents", 10, { reservedQty: 8 });

    await expectTrpcError(
      caller.inventoryCheckout.create({
        label: "Camp",
        lines: [{ itemId: tents.id, qty: 3 }],
      }),
      "BAD_REQUEST",
      "Tents: 2 available, 3 requested",
    );
    expect(await qtyOf(tents.id)).toBe(10);

    await caller.inventoryCheckout.create({
      label: "Camp",
      lines: [{ itemId: tents.id, qty: 2 }],
    });
    expect(await qtyOf(tents.id)).toBe(8);
  });

  it("create rejects stock items and another business's items, writing nothing", async () => {
    const { business, caller } = await setup();
    const balloons = await createBaseInventoryUnit(business.id, {
      name: "Balloons",
      inventoryQty: 500,
    });
    const chairs = await rental(business.id, "Chairs", 10);

    await expectTrpcError(
      caller.inventoryCheckout.create({
        label: "Party",
        lines: [
          { itemId: chairs.id, qty: 1 },
          { itemId: balloons.id, qty: 5 },
        ],
      }),
      "BAD_REQUEST",
      "Balloons is a stock item — only rental items can be checked out",
    );

    const other = await createBusiness({});
    const foreign = await rental(other.id, "Their chairs", 50);
    await expectTrpcError(
      caller.inventoryCheckout.create({
        label: "Party",
        lines: [
          { itemId: chairs.id, qty: 1 },
          { itemId: foreign.id, qty: 5 },
        ],
      }),
      "NOT_FOUND",
    );

    expect(await db.inventoryCheckout.count()).toBe(0);
    expect(await db.inventoryHistory.count()).toBe(0);
    expect(await qtyOf(chairs.id)).toBe(10);
    expect(await qtyOf(balloons.id)).toBe(500);
    expect(await qtyOf(foreign.id)).toBe(50);
  });

  it("create validates dates: due before the check-out day and far-future check-outs are refused", async () => {
    const { business, caller } = await setup({
      featureFlags: { inventoryRentals: true },
      timeZone: "UTC",
    });
    const chairs = await rental(business.id, "Chairs", 10);

    await expectTrpcError(
      caller.inventoryCheckout.create({
        label: "Past due",
        checkedOutAt: new Date("2026-03-10T12:00:00Z"),
        dueBackOn: "2026-03-09",
        lines: [{ itemId: chairs.id, qty: 1 }],
      }),
      "BAD_REQUEST",
      "due date",
    );
    await expectTrpcError(
      caller.inventoryCheckout.create({
        label: "Future",
        checkedOutAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        lines: [{ itemId: chairs.id, qty: 1 }],
      }),
      "BAD_REQUEST",
      "future",
    );

    // Back-dated with a same-day due date is fine.
    const { id } = await caller.inventoryCheckout.create({
      label: "Back-dated",
      checkedOutAt: new Date("2026-03-10T12:00:00Z"),
      dueBackOn: "2026-03-10",
      lines: [{ itemId: chairs.id, qty: 1 }],
    });
    const row = await db.inventoryCheckout.findUniqueOrThrow({ where: { id } });
    expect(row.checkedOutAt.toISOString()).toBe("2026-03-10T12:00:00.000Z");
    expect(await qtyOf(chairs.id)).toBe(9);
  });

  // ── checkIn ─────────────────────────────────────────────────────────────────

  it("partial check-in, then damaged + lost write-offs, then auto-close", async () => {
    const { business, owner, caller } = await setup();
    const chairs = await rental(business.id, "Chairs", 10);
    const { id } = await caller.inventoryCheckout.create({
      label: "Gala",
      lines: [{ itemId: chairs.id, qty: 10 }],
    });
    const [line] = await db.inventoryCheckoutLine.findMany({
      where: { checkoutId: id },
    });
    const lineId = line!.id;
    expect(await qtyOf(chairs.id)).toBe(0);

    // 1. Four come back.
    const r1 = await caller.inventoryCheckout.checkIn({
      checkoutId: id,
      lines: [{ lineId, returned: 4, damaged: 0, lost: 0 }],
      note: "First van",
    });
    expect(r1).toEqual({ closed: false, outstanding: 6 });
    expect(await qtyOf(chairs.id)).toBe(4);
    const checkinRow = await db.inventoryHistory.findFirstOrThrow({
      where: { reason: "checkin" },
    });
    expect(checkinRow).toMatchObject({
      baseInventoryUnitId: chairs.id,
      changeQty: 4,
      previousQty: 0,
      newQty: 4,
      checkoutId: id,
      note: "First van",
      userId: owner.id,
    });

    // 2. Two damaged, one lost — informational rows, on-hand unchanged.
    const r2 = await caller.inventoryCheckout.checkIn({
      checkoutId: id,
      lines: [{ lineId, returned: 0, damaged: 2, lost: 1 }],
    });
    expect(r2).toEqual({ closed: false, outstanding: 3 });
    expect(await qtyOf(chairs.id)).toBe(4);
    const writeOffs = await db.inventoryHistory.findMany({
      where: { reason: { in: ["damage", "lost"] } },
      orderBy: { reason: "asc" },
    });
    expect(
      writeOffs.map((h) => [h.reason, h.changeQty, h.previousQty, h.newQty]),
    ).toEqual([
      ["damage", 0, 4, 4],
      ["lost", 0, 4, 4],
    ]);
    expect(writeOffs.every((h) => h.checkoutId === id)).toBe(true);
    expect(await totalOf(business.id, chairs.id)).toBe(7);

    // 3. The rest come back → auto-close.
    const r3 = await caller.inventoryCheckout.checkIn({
      checkoutId: id,
      lines: [{ lineId, returned: 3, damaged: 0, lost: 0 }],
    });
    expect(r3).toEqual({ closed: true, outstanding: 0 });
    expect(await qtyOf(chairs.id)).toBe(7);
    expect(await totalOf(business.id, chairs.id)).toBe(7);

    const closed = await db.inventoryCheckout.findUniqueOrThrow({
      where: { id },
      include: { lines: true },
    });
    expect(closed.status).toBe("closed");
    expect(closed.closedAt).toBeInstanceOf(Date);
    expect(closed.lines[0]).toMatchObject({
      qtyOut: 10,
      qtyReturned: 7,
      qtyDamaged: 2,
      qtyLost: 1,
    });

    const detail = await caller.inventoryCheckout.getById({ id });
    expect(detail.history.map((h) => h.reason)).toEqual([
      "checkout",
      "checkin",
      expect.stringMatching(/^(damage|lost)$/),
      expect.stringMatching(/^(damage|lost)$/),
      "checkin",
    ]);
    expect(detail.history[0]!.itemName).toBe("Chairs");
    expect(detail.history[1]!.user).toEqual({
      name: owner.name,
      email: owner.email,
    });
  });

  it("check-in rejects over-returns, all-zero submissions, closed check-outs, foreign lines and foreign check-outs", async () => {
    const { business, caller } = await setup();
    const chairs = await rental(business.id, "Chairs", 10);
    const tables = await rental(business.id, "Tables", 5);
    const { id } = await caller.inventoryCheckout.create({
      label: "Gala",
      lines: [
        { itemId: chairs.id, qty: 10 },
        { itemId: tables.id, qty: 2 },
      ],
    });
    const lines = await db.inventoryCheckoutLine.findMany({
      where: { checkoutId: id },
      orderBy: { itemName: "asc" },
    });
    const chairLine = lines[0]!.id;
    const tableLine = lines[1]!.id;

    await expectTrpcError(
      caller.inventoryCheckout.checkIn({
        checkoutId: id,
        lines: [
          { lineId: chairLine, returned: 8, damaged: 2, lost: 1 },
          { lineId: tableLine, returned: 3, damaged: 0, lost: 0 },
        ],
      }),
      "BAD_REQUEST",
      "Chairs: only 10 still out; Tables: only 2 still out",
    );
    await expectTrpcError(
      caller.inventoryCheckout.checkIn({
        checkoutId: id,
        lines: [{ lineId: chairLine, returned: 0, damaged: 0, lost: 0 }],
      }),
      "BAD_REQUEST",
      "Nothing to check in",
    );

    // A line from a different check-out of the same business.
    const other = await caller.inventoryCheckout.create({
      label: "Other",
      lines: [{ itemId: tables.id, qty: 1 }],
    });
    const otherLine = await db.inventoryCheckoutLine.findFirstOrThrow({
      where: { checkoutId: other.id },
    });
    await expectTrpcError(
      caller.inventoryCheckout.checkIn({
        checkoutId: id,
        lines: [{ lineId: otherLine.id, returned: 1, damaged: 0, lost: 0 }],
      }),
      "BAD_REQUEST",
    );

    // Nothing was written by any rejected call.
    expect(await qtyOf(chairs.id)).toBe(0);
    expect(await qtyOf(tables.id)).toBe(2);
    expect(
      await db.inventoryHistory.count({ where: { reason: "checkin" } }),
    ).toBe(0);

    // Close it, then try again.
    await caller.inventoryCheckout.checkIn({
      checkoutId: id,
      lines: [
        { lineId: chairLine, returned: 10, damaged: 0, lost: 0 },
        { lineId: tableLine, returned: 2, damaged: 0, lost: 0 },
      ],
    });
    await expectTrpcError(
      caller.inventoryCheckout.checkIn({
        checkoutId: id,
        lines: [{ lineId: chairLine, returned: 1, damaged: 0, lost: 0 }],
      }),
      "BAD_REQUEST",
      "This check-out is already closed",
    );

    // Another business's check-out id.
    const otherBiz = await createBusiness({});
    const foreign = await createInventoryCheckout(otherBiz.id, {
      lines: [{ itemName: "X", qtyOut: 1 }],
    });
    await expectTrpcError(
      caller.inventoryCheckout.checkIn({
        checkoutId: foreign.id,
        lines: [
          { lineId: foreign.lines[0]!.id, returned: 1, damaged: 0, lost: 0 },
        ],
      }),
      "NOT_FOUND",
    );
    expect(await qtyOf(chairs.id)).toBe(10);
  });

  it("a line whose item was deleted can only be written off", async () => {
    const { business, caller } = await setup();
    const checkout = await createInventoryCheckout(business.id, {
      lines: [{ itemId: null, itemName: "Old arch", qtyOut: 2 }],
    });
    const lineId = checkout.lines[0]!.id;

    await expectTrpcError(
      caller.inventoryCheckout.checkIn({
        checkoutId: checkout.id,
        lines: [{ lineId, returned: 1, damaged: 0, lost: 0 }],
      }),
      "BAD_REQUEST",
      "Old arch",
    );
    const res = await caller.inventoryCheckout.checkIn({
      checkoutId: checkout.id,
      lines: [{ lineId, returned: 0, damaged: 1, lost: 1 }],
    });
    expect(res).toEqual({ closed: true, outstanding: 0 });
    expect(await db.inventoryHistory.count()).toBe(0);
  });

  it("concurrent check-ins of the same line: exactly one succeeds", async () => {
    const { business, caller, staff } = await setup();
    const chairs = await rental(business.id, "Chairs", 6);
    const { id } = await caller.inventoryCheckout.create({
      label: "Race",
      lines: [{ itemId: chairs.id, qty: 6 }],
    });
    const line = await db.inventoryCheckoutLine.findFirstOrThrow({
      where: { checkoutId: id },
    });
    const input = {
      checkoutId: id,
      lines: [{ lineId: line.id, returned: 6, damaged: 0, lost: 0 }],
    };

    const results = await Promise.allSettled([
      caller.inventoryCheckout.checkIn(input),
      staff.inventoryCheckout.checkIn(input),
    ]);
    const ok = results.filter((r) => r.status === "fulfilled");
    const failed = results.filter(
      (r): r is PromiseRejectedResult => r.status === "rejected",
    );
    expect(ok).toHaveLength(1);
    expect(failed).toHaveLength(1);
    expect(failed[0]!.reason).toBeInstanceOf(TRPCError);
    expect((failed[0]!.reason as TRPCError).code).toBe("BAD_REQUEST");

    expect(await qtyOf(chairs.id)).toBe(6);
    expect(
      await db.inventoryHistory.count({ where: { reason: "checkin" } }),
    ).toBe(1);
    const after = await db.inventoryCheckoutLine.findUniqueOrThrow({
      where: { id: line.id },
    });
    expect(after.qtyReturned).toBe(6);
  });

  // ── feature flags + roles ───────────────────────────────────────────────────

  it("rentals off: create/picker are FORBIDDEN, but check-in, list, getById and updateDetails keep working", async () => {
    const { business, caller } = await setup();
    const chairs = await rental(business.id, "Chairs", 10);
    const { id } = await caller.inventoryCheckout.create({
      label: "Before toggle",
      lines: [{ itemId: chairs.id, qty: 5 }],
    });
    const line = await db.inventoryCheckoutLine.findFirstOrThrow({
      where: { checkoutId: id },
    });

    await setFlags(business.id, { inventoryRentals: false });

    await expectTrpcError(
      caller.inventoryCheckout.create({
        label: "After toggle",
        lines: [{ itemId: chairs.id, qty: 1 }],
      }),
      "FORBIDDEN",
      "inventoryRentals",
    );
    await expectTrpcError(
      caller.inventoryCheckout.availableRentalItems(),
      "FORBIDDEN",
      "inventoryRentals",
    );

    const list = await caller.inventoryCheckout.list({});
    expect(list.rows.map((r) => r.id)).toEqual([id]);
    expect((await caller.inventoryCheckout.getById({ id })).label).toBe(
      "Before toggle",
    );
    await caller.inventoryCheckout.updateDetails({ id, label: "Renamed" });
    const res = await caller.inventoryCheckout.checkIn({
      checkoutId: id,
      lines: [{ lineId: line.id, returned: 5, damaged: 0, lost: 0 }],
    });
    expect(res.closed).toBe(true);
    expect(await qtyOf(chairs.id)).toBe(10);
  });

  it("inventory off: every procedure is FORBIDDEN", async () => {
    const { business, caller } = await setup();
    const chairs = await rental(business.id, "Chairs", 10);
    const { id } = await caller.inventoryCheckout.create({
      label: "x",
      lines: [{ itemId: chairs.id, qty: 1 }],
    });
    const line = await db.inventoryCheckoutLine.findFirstOrThrow({
      where: { checkoutId: id },
    });
    await setFlags(business.id, { inventory: false, inventoryRentals: true });

    // Thunks, so each call starts only when awaited (no unhandled rejections).
    const calls: (() => Promise<unknown>)[] = [
      () => caller.inventoryCheckout.list({}),
      () => caller.inventoryCheckout.getById({ id }),
      () => caller.inventoryCheckout.availableRentalItems(),
      () =>
        caller.inventoryCheckout.create({
          label: "y",
          lines: [{ itemId: chairs.id, qty: 1 }],
        }),
      () =>
        caller.inventoryCheckout.checkIn({
          checkoutId: id,
          lines: [{ lineId: line.id, returned: 1, damaged: 0, lost: 0 }],
        }),
      () => caller.inventoryCheckout.updateDetails({ id, label: "z" }),
    ];
    for (const call of calls) {
      await expectTrpcError(call(), "FORBIDDEN", "inventory");
    }
    expect(await qtyOf(chairs.id)).toBe(9);
  });

  it("STAFF can use every procedure; a non-member is FORBIDDEN", async () => {
    const { business, staff, staffUser } = await setup();
    const chairs = await rental(business.id, "Chairs", 10);

    const picker = await staff.inventoryCheckout.availableRentalItems();
    expect(picker).toHaveLength(1);
    const { id } = await staff.inventoryCheckout.create({
      label: "Staff run",
      lines: [{ itemId: chairs.id, qty: 3 }],
    });
    const detail = await staff.inventoryCheckout.getById({ id });
    expect(detail.createdBy?.name).toBe(staffUser.name);
    expect((await staff.inventoryCheckout.list({})).totalCount).toBe(1);
    await staff.inventoryCheckout.updateDetails({ id, customerName: "Bob" });
    await staff.inventoryCheckout.checkIn({
      checkoutId: id,
      lines: [
        { lineId: detail.lines[0]!.id, returned: 3, damaged: 0, lost: 0 },
      ],
    });
    expect(await qtyOf(chairs.id)).toBe(10);

    const stranger = await createUser({});
    const outsider = createTestCaller({ userId: stranger.id });
    await expectTrpcError(
      outsider.inventoryCheckout.list({}),
      "FORBIDDEN",
      "Not a business member",
    );
    await expectTrpcError(
      outsider.inventoryCheckout.create({
        label: "no",
        lines: [{ itemId: chairs.id, qty: 1 }],
      }),
      "FORBIDDEN",
      "Not a business member",
    );
    await expectTrpcError(
      outsider.inventoryCheckout.getById({ id }),
      "FORBIDDEN",
      "Not a business member",
    );
    expect(await qtyOf(chairs.id)).toBe(10);
  });

  // ── updateDetails ───────────────────────────────────────────────────────────

  it("updateDetails edits, clears and validates fields; scoped to the business; works on closed check-outs", async () => {
    const { business, caller } = await setup({
      featureFlags: { inventoryRentals: true },
      timeZone: "UTC",
    });
    const checkout = await createInventoryCheckout(business.id, {
      label: "Old",
      customerName: "Ann",
      notes: "Keep dry",
      checkedOutAt: new Date("2026-05-10T15:00:00Z"),
      status: "closed",
      closedAt: new Date("2026-05-12T15:00:00Z"),
    });
    const id = checkout.id;

    await caller.inventoryCheckout.updateDetails({
      id,
      label: "  New label ",
      customerName: "   ",
      notes: "Secret gate code 1234",
      dueBackOn: "2026-05-11",
    });
    let row = await db.inventoryCheckout.findUniqueOrThrow({ where: { id } });
    expect(row).toMatchObject({
      label: "New label",
      customerName: null,
      notes: "Secret gate code 1234",
    });
    expect(row.dueBackOn?.toISOString()).toBe("2026-05-11T00:00:00.000Z");
    // Encrypted at rest.
    const [raw] = await db.$queryRaw<{ notes: string | null }[]>`
      SELECT "notes" FROM "InventoryCheckout" WHERE "id" = ${id}
    `;
    expect(raw!.notes).not.toContain("Secret");

    await caller.inventoryCheckout.updateDetails({
      id,
      notes: null,
      dueBackOn: null,
    });
    row = await db.inventoryCheckout.findUniqueOrThrow({ where: { id } });
    expect(row.notes).toBeNull();
    expect(row.dueBackOn).toBeNull();
    expect(row.label).toBe("New label");

    await expectTrpcError(
      caller.inventoryCheckout.updateDetails({ id, dueBackOn: "2026-05-09" }),
      "BAD_REQUEST",
      "due date",
    );

    const otherBiz = await createBusiness({});
    const foreign = await createInventoryCheckout(otherBiz.id, {
      label: "Theirs",
    });
    await expectTrpcError(
      caller.inventoryCheckout.updateDetails({ id: foreign.id, label: "Mine" }),
      "NOT_FOUND",
    );
    await expectTrpcError(
      caller.inventoryCheckout.getById({ id: foreign.id }),
      "NOT_FOUND",
    );
    expect(
      (
        await db.inventoryCheckout.findUniqueOrThrow({
          where: { id: foreign.id },
        })
      ).label,
    ).toBe("Theirs");
  });

  // ── list ────────────────────────────────────────────────────────────────────

  it("list: status filters, overdue in the business's zone, search, counts, ordering and row aggregates", async () => {
    // 2026-09-24T12:00Z is already 2026-09-25 in Kiritimati (UTC+14) but still
    // 2026-09-24 in Los Angeles. Only Date is faked — real timers keep running.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-24T12:00:00Z"));

    const { business, owner, caller } = await setup({
      featureFlags: { inventoryRentals: true },
      timeZone: "Pacific/Kiritimati",
    });
    const dueToday = new Date("2026-09-24T00:00:00Z");
    const dueLater = new Date("2026-09-30T00:00:00Z");

    const a = await createInventoryCheckout(business.id, {
      label: "Smith wedding",
      customerName: "Jane Smith",
      dueBackOn: dueToday,
      createdById: owner.id,
      lines: [
        { itemName: "Chairs", qtyOut: 10, qtyReturned: 4 },
        { itemName: "Throne", qtyOut: 1, qtyLost: 1 },
      ],
    });
    const b = await createInventoryCheckout(business.id, {
      label: "Corporate gala",
      customerName: "Acme",
      dueBackOn: dueLater,
      lines: [{ itemName: "Tables", qtyOut: 3 }],
    });
    const c = await createInventoryCheckout(business.id, {
      label: "No due date",
      lines: [{ itemName: "Tables", qtyOut: 1 }],
    });
    const d = await createInventoryCheckout(business.id, {
      label: "Old party",
      customerName: "Smithers",
      dueBackOn: new Date("2026-01-01T00:00:00Z"),
      status: "closed",
      closedAt: new Date("2026-01-02T00:00:00Z"),
      checkedOutAt: new Date("2025-12-30T00:00:00Z"),
    });
    // Another business's rows never leak.
    const otherBiz = await createBusiness({});
    await createInventoryCheckout(otherBiz.id, { label: "Smith elsewhere" });

    const open = await caller.inventoryCheckout.list({});
    expect(open.rows.map((r) => r.id)).toEqual([a.id, b.id, c.id]);
    expect(open.counts).toEqual({ open: 3, overdue: 1, closed: 1 });
    expect(open.totalCount).toBe(3);
    expect(open.timeZone).toBe("Pacific/Kiritimati");
    const rowA = open.rows[0]!;
    expect(rowA).toMatchObject({
      label: "Smith wedding",
      customerName: "Jane Smith",
      status: "open",
      overdue: true,
      lineCount: 2,
      unitsOut: 11,
      outstanding: 6,
      createdBy: { name: owner.name, email: owner.email },
      closedAt: null,
    });
    expect(open.rows[1]!.overdue).toBe(false);
    expect(open.rows[2]!.createdBy).toBeNull();

    const overdue = await caller.inventoryCheckout.list({ status: "overdue" });
    expect(overdue.rows.map((r) => r.id)).toEqual([a.id]);

    const closed = await caller.inventoryCheckout.list({ status: "closed" });
    expect(closed.rows.map((r) => r.id)).toEqual([d.id]);
    expect(closed.rows[0]!.overdue).toBe(false);

    const all = await caller.inventoryCheckout.list({ status: "all" });
    expect(all.totalCount).toBe(4);
    expect(all.rows.at(-1)!.id).toBe(d.id); // checkedOutAt desc

    // Search: label or customer name, case-insensitive; counts follow search.
    const smith = await caller.inventoryCheckout.list({
      status: "all",
      search: "SMITH",
    });
    expect(smith.rows.map((r) => r.id).sort()).toEqual([a.id, d.id].sort());
    expect(smith.counts).toEqual({ open: 1, overdue: 1, closed: 1 });
    const acme = await caller.inventoryCheckout.list({ search: "acme" });
    expect(acme.rows.map((r) => r.id)).toEqual([b.id]);

    // Same data, Los Angeles zone: due "today" is not overdue yet.
    await db.business.update({
      where: { id: business.id },
      data: { timeZone: "America/Los_Angeles" },
    });
    const la = await caller.inventoryCheckout.list({});
    expect(la.counts.overdue).toBe(0);
    expect(la.rows.every((r) => !r.overdue)).toBe(true);
    expect(
      (await caller.inventoryCheckout.list({ status: "overdue" })).rows,
    ).toHaveLength(0);
  });

  it("list paginates 25 per page and clamps an out-of-range page", async () => {
    const { business, caller } = await setup();
    for (let i = 0; i < 27; i++) {
      await createInventoryCheckout(business.id, {
        label: `Event ${String(i).padStart(2, "0")}`,
        checkedOutAt: new Date(Date.UTC(2026, 0, 1 + i)),
      });
    }
    const p1 = await caller.inventoryCheckout.list({ status: "all" });
    expect(p1).toMatchObject({
      totalCount: 27,
      page: 1,
      pageCount: 2,
      pageSize: 25,
    });
    expect(p1.rows).toHaveLength(25);
    expect(p1.rows[0]!.label).toBe("Event 26");

    const clamped = await caller.inventoryCheckout.list({
      status: "all",
      page: 9,
    });
    expect(clamped.page).toBe(2);
    expect(clamped.rows.map((r) => r.label)).toEqual(["Event 01", "Event 00"]);

    const none = await caller.inventoryCheckout.list({ status: "closed" });
    expect(none).toMatchObject({ totalCount: 0, page: 1, pageCount: 1 });
    expect(none.rows).toEqual([]);
  });

  // ── pool sales isolation ────────────────────────────────────────────────────

  it("checkout, checkin, damage and lost rows never change the pool's sales summary", async () => {
    const { business, caller } = await setup();
    const chairs = await rental(business.id, "Chairs", 20);
    const { id } = await caller.inventoryCheckout.create({
      label: "Sales check",
      lines: [{ itemId: chairs.id, qty: 12 }],
    });
    const line = await db.inventoryCheckoutLine.findFirstOrThrow({
      where: { checkoutId: id },
    });
    await caller.inventoryCheckout.checkIn({
      checkoutId: id,
      lines: [{ lineId: line.id, returned: 5, damaged: 3, lost: 4 }],
    });

    const reasons = (
      await db.inventoryHistory.findMany({
        where: { baseInventoryUnitId: chairs.id },
        select: { reason: true },
      })
    )
      .map((r) => r.reason)
      .sort();
    expect(reasons).toEqual(["checkin", "checkout", "damage", "lost"]);
    expect(await poolSales(business.id, chairs.id)).toEqual(EMPTY_POOL_SALES);
  });
});
