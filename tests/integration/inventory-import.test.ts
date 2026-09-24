import { beforeEach, describe, expect, it, vi } from "vitest";

import { createTestCaller } from "../helpers/caller";
import { db, resetDb } from "../helpers/db";
import {
  createBaseInventoryUnit,
  createBusiness,
  createInventoryCheckout,
  createOwnerUser,
  createProduct,
} from "../helpers/factories";

/**
 * CSV import/export procedures on the items router: preview → commit, row
 * matching, quantity pinning (`expectedQuantities`), idempotence and tenancy.
 * Parsing/planning details are unit-tested in src/lib/inventory/csv.test.ts.
 */

const reqHost = vi.hoisted(() => ({ value: "inv-import.simplepress.test" }));
vi.mock("next/headers", () => ({
  headers: () => Promise.resolve(new Headers({ host: reqHost.value })),
  cookies: () => Promise.resolve(new Headers()),
}));

const T = 60_000;

describe("inventory CSV import/export", () => {
  beforeEach(async () => {
    await resetDb();
    reqHost.value = "inv-import.simplepress.test";
  });

  async function setupBusiness() {
    const business = await createBusiness({});
    const owner = await createOwnerUser(business.id);
    reqHost.value = `${business.subdomain}.simplepress.test`;
    const caller = createTestCaller({ userId: owner.id });
    return { business, owner, caller };
  }

  async function checkOut(businessId: string, itemId: string, qty: number) {
    await createInventoryCheckout(businessId, {
      label: "Event",
      lines: [{ itemId, itemName: "Item", qtyOut: qty }],
    });
    await db.baseInventoryUnit.update({
      where: { id: itemId },
      data: { inventoryQty: { decrement: qty } },
    });
  }

  const historyFor = (itemId: string) =>
    db.inventoryHistory.findMany({
      where: { baseInventoryUnitId: itemId },
      orderBy: { createdAt: "asc" },
    });

  const csv = (...lines: string[]) => lines.join("\n") + "\n";

  it(
    "previewImport(): counts, row errors, warnings, sample, changed items and expected quantities",
    async () => {
      const { business, caller } = await setupBusiness();
      const throne = await createBaseInventoryUnit(business.id, {
        name: "Throne",
        sku: "THR",
        itemType: "rental",
        inventoryQty: 3,
      });
      await checkOut(business.id, throne.id, 2); // on hand 1, out 2
      const balloons = await createBaseInventoryUnit(business.id, {
        name: "Balloons",
        inventoryQty: 100,
        reservedQty: 10,
      });
      const drapes = await createBaseInventoryUnit(business.id, {
        name: "Drapes",
        inventoryQty: 4,
        category: "Linens",
      });

      const preview = await caller.baseInventoryUnit.previewImport({
        fileName: "items.csv",
        csvContent: csv(
          "SKU,Name,Type,Quantity,Unit cost,Category,Checked out",
          "THR,Throne,rental,5,,,2",
          ",Balloons,,5,,,",
          ",Drapes,,4,,Linens,",
          "NEW-1,Chair,rental,10,$12.50,Seating,",
          ",Tape,,abc,,,",
          "BAD,,,,,,",
          ",,,,,,3", // only an ignored column filled → skipped as blank
        ),
      });

      expect(preview.fileErrors).toEqual([]);
      expect(preview.recognizedColumns).toEqual([
        "SKU",
        "Name",
        "Type",
        "Quantity",
        "Unit cost",
        "Category",
      ]);
      expect(preview.ignoredColumns).toEqual(["Checked out"]);
      expect(preview.skippedBlank).toBe(1);
      expect(preview.counts).toEqual({
        create: 1,
        update: 2,
        unchanged: 1,
        quantityChanges: 2,
        errors: 2,
      });
      expect(preview.errorCount).toBe(2);
      expect(preview.errors.map((e) => e.rowNumber)).toEqual([6, 7]);
      expect(preview.errors[0]!.message).toContain("Quantity");
      expect(preview.errors[1]!.message).toBe("Name is required for new items");
      expect(preview.warningCount).toBe(2);
      expect(preview.warnings.map((w) => w.message).join("\n")).toMatch(
        /Throne: 2 units are currently checked out[\s\S]*Balloons: new quantity 5 is below 10 reserved/,
      );
      expect(preview.sample).toEqual([
        { rowNumber: 2, itemId: throne.id, itemName: "Throne", from: 1, to: 5 },
        {
          rowNumber: 3,
          itemId: balloons.id,
          itemName: "Balloons",
          from: 100,
          to: 5,
        },
      ]);
      // Every matched row that names a quantity is pinned — Drapes too, even
      // though its count is unchanged.
      expect(preview.expectedQuantities).toEqual({
        [throne.id]: 1,
        [balloons.id]: 100,
        [drapes.id]: 4,
      });
      const create = preview.changedItems.find((c) => c.action === "create")!;
      expect(create).toMatchObject({
        rowNumber: 5,
        itemId: null,
        itemName: "Chair",
        qtyChange: { from: 0, to: 10 },
      });
      expect(create.changes).toEqual(
        expect.arrayContaining([
          { field: "sku", from: null, to: "NEW-1" },
          { field: "itemType", from: null, to: "rental" },
          { field: "unitCostCents", from: null, to: 1250 },
          { field: "category", from: null, to: "Seating" },
        ]),
      );
      expect(preview.changedItems).toHaveLength(3);

      // Nothing written by a preview.
      expect(await db.baseInventoryUnit.count()).toBe(3);
      expect(await db.inventoryHistory.count()).toBe(0);
    },
    T,
  );

  it(
    "previewImport()/commitImport(): file-level errors",
    async () => {
      const { caller } = await setupBusiness();
      const preview = await caller.baseInventoryUnit.previewImport({
        fileName: "bad.csv",
        csvContent: csv("foo,bar", "1,2"),
      });
      expect(preview.fileErrors[0]).toContain("Name or SKU column");
      expect(preview.counts.create).toBe(0);
      expect(preview.changedItems).toEqual([]);

      await expect(
        caller.baseInventoryUnit.commitImport({
          fileName: "bad.csv",
          csvContent: csv("foo,bar", "1,2"),
        }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    },
    T,
  );

  it(
    "commitImport(): creates and updates; quantity diffs write 'import' rows with userId and no orderId; blank qty leaves stock alone",
    async () => {
      const { business, owner, caller } = await setupBusiness();
      const balloons = await createBaseInventoryUnit(business.id, {
        name: "Balloons",
        inventoryQty: 100,
        category: "Old",
      });
      const drapes = await createBaseInventoryUnit(business.id, {
        name: "Drapes",
        inventoryQty: 8,
      });

      const result = await caller.baseInventoryUnit.commitImport({
        fileName: "spring.csv",
        csvContent: csv(
          "SKU,Name,Type,Quantity,Category,Location,Unit cost,Description",
          ",Balloons,,60,Decor,Shelf A,,",
          ",Drapes,,,Linens,,$4,",
          "CH-1,Chair,rental,12,Seating,Barn,$25.00,Folding",
          "TP-1,Tape,,,,,,",
        ),
      });
      expect(result).toEqual({
        created: 2,
        updated: 2,
        quantityAdjusted: 1,
        unchanged: 0,
        changedSincePreview: [],
        failed: [],
        skippedErrors: 0,
      });

      const b = await db.baseInventoryUnit.findUniqueOrThrow({
        where: { id: balloons.id },
      });
      expect(b).toMatchObject({
        inventoryQty: 60,
        category: "Decor",
        storageLocation: "Shelf A",
      });
      const bRows = await historyFor(balloons.id);
      expect(bRows).toHaveLength(1);
      expect(bRows[0]).toMatchObject({
        reason: "import",
        previousQty: 100,
        newQty: 60,
        changeQty: -40,
        userId: owner.id,
        orderId: null,
        note: "CSV import: spring.csv",
      });

      // Blank quantity: details only, stock untouched, no ledger row.
      const d = await db.baseInventoryUnit.findUniqueOrThrow({
        where: { id: drapes.id },
      });
      expect(d).toMatchObject({
        inventoryQty: 8,
        category: "Linens",
        unitCostCents: 400,
      });
      expect(await historyFor(drapes.id)).toHaveLength(0);

      const chair = await db.baseInventoryUnit.findFirstOrThrow({
        where: { businessId: business.id, sku: "CH-1" },
      });
      expect(chair).toMatchObject({
        name: "Chair",
        itemType: "rental",
        inventoryQty: 12,
        category: "Seating",
        storageLocation: "Barn",
        unitCostCents: 2500,
        description: "Folding",
      });
      const chairRows = await historyFor(chair.id);
      expect(chairRows).toHaveLength(1);
      expect(chairRows[0]).toMatchObject({
        reason: "import",
        previousQty: 0,
        newQty: 12,
        userId: owner.id,
        orderId: null,
      });

      const tape = await db.baseInventoryUnit.findFirstOrThrow({
        where: { businessId: business.id, sku: "TP-1" },
      });
      expect(tape).toMatchObject({ itemType: "stock", inventoryQty: 0 });
      expect(await historyFor(tape.id)).toHaveLength(0);

      // Re-running the same file is a no-op.
      const historyCount = await db.inventoryHistory.count();
      const again = await caller.baseInventoryUnit.commitImport({
        fileName: "spring.csv",
        csvContent: csv(
          "SKU,Name,Type,Quantity,Category,Location,Unit cost,Description",
          ",Balloons,,60,Decor,Shelf A,,",
          ",Drapes,,,Linens,,$4,",
          "CH-1,Chair,rental,12,Seating,Barn,$25.00,Folding",
          "TP-1,Tape,,,,,,",
        ),
      });
      expect(again).toMatchObject({
        created: 0,
        updated: 0,
        quantityAdjusted: 0,
        unchanged: 4,
      });
      expect(await db.inventoryHistory.count()).toBe(historyCount);
      expect(await db.baseInventoryUnit.count()).toBe(4);
    },
    T,
  );

  it(
    "matching: SKU wins over name, name fallback fills a missing SKU, ambiguous names are row errors",
    async () => {
      const { business, caller } = await setupBusiness();
      const alpha = await createBaseInventoryUnit(business.id, {
        name: "Alpha",
        sku: "A1",
        inventoryQty: 1,
      });
      const beta = await createBaseInventoryUnit(business.id, {
        name: "Beta",
        inventoryQty: 2,
      });
      const gamma1 = await createBaseInventoryUnit(business.id, {
        name: "Gamma",
        inventoryQty: 3,
      });
      const gamma2 = await createBaseInventoryUnit(business.id, {
        name: "gamma",
        inventoryQty: 3,
      });

      const result = await caller.baseInventoryUnit.commitImport({
        fileName: "m.csv",
        csvContent: csv(
          "SKU,Name,Quantity",
          "a1,Alpha Renamed,5", // SKU match (case-insensitive) → rename; file casing wins
          "B9,BETA,4", // no SKU match → name match on SKU-less Beta → fills SKU (and re-cases the name)
          ",Gamma,9", // two Gammas → ambiguous
        ),
      });
      expect(result).toMatchObject({
        created: 0,
        updated: 2,
        quantityAdjusted: 2,
        skippedErrors: 1,
        failed: [],
      });

      expect(
        await db.baseInventoryUnit.findUniqueOrThrow({
          where: { id: alpha.id },
        }),
      ).toMatchObject({ name: "Alpha Renamed", sku: "a1", inventoryQty: 5 });
      expect(
        await db.baseInventoryUnit.findUniqueOrThrow({
          where: { id: beta.id },
        }),
      ).toMatchObject({ name: "BETA", sku: "B9", inventoryQty: 4 });
      for (const g of [gamma1, gamma2]) {
        expect(
          (
            await db.baseInventoryUnit.findUniqueOrThrow({
              where: { id: g.id },
            })
          ).inventoryQty,
        ).toBe(3);
      }

      const preview = await caller.baseInventoryUnit.previewImport({
        fileName: "m.csv",
        csvContent: csv("SKU,Name,Quantity", ",Gamma,9"),
      });
      expect(preview.errors[0]!.message).toMatch(/Ambiguous name/);
    },
    T,
  );

  it(
    "expectedQuantities: a count that moved since the preview is skipped and reported; details still apply",
    async () => {
      const { business, caller } = await setupBusiness();
      const balloons = await createBaseInventoryUnit(business.id, {
        name: "Balloons",
        inventoryQty: 10,
      });
      const drapes = await createBaseInventoryUnit(business.id, {
        name: "Drapes",
        inventoryQty: 5,
      });
      const file = csv(
        "Name,Quantity,Category",
        "Balloons,20,Decor",
        "Drapes,5,Linens",
      );
      const preview = await caller.baseInventoryUnit.previewImport({
        fileName: "e.csv",
        csvContent: file,
      });
      expect(preview.expectedQuantities).toEqual({
        [balloons.id]: 10,
        [drapes.id]: 5,
      });

      // Sales land between preview and commit.
      await caller.baseInventoryUnit.moveStock({
        id: balloons.id,
        kind: "use",
        quantity: 3,
      });
      await caller.baseInventoryUnit.moveStock({
        id: drapes.id,
        kind: "use",
        quantity: 1,
      });

      const result = await caller.baseInventoryUnit.commitImport({
        fileName: "e.csv",
        csvContent: file,
        expectedQuantities: preview.expectedQuantities,
      });
      expect(result.changedSincePreview).toEqual([
        { rowNumber: 2, itemName: "Balloons", expected: 10, current: 7 },
        // Drapes' count equalled the file at preview time; it is pinned too,
        // so the sale is not silently undone.
        { rowNumber: 3, itemName: "Drapes", expected: 5, current: 4 },
      ]);
      expect(result).toMatchObject({ updated: 2, quantityAdjusted: 0 });
      expect(
        await db.baseInventoryUnit.findUniqueOrThrow({
          where: { id: balloons.id },
        }),
      ).toMatchObject({ inventoryQty: 7, category: "Decor" });
      expect(
        await db.baseInventoryUnit.findUniqueOrThrow({
          where: { id: drapes.id },
        }),
      ).toMatchObject({ inventoryQty: 4, category: "Linens" });
      expect(
        (await historyFor(balloons.id)).filter((r) => r.reason === "import"),
      ).toHaveLength(0);
    },
    T,
  );

  it(
    "export → import is a no-op: every row unchanged, zero new history rows",
    async () => {
      const { business, caller } = await setupBusiness();
      const throne = await createBaseInventoryUnit(business.id, {
        name: "Throne",
        sku: "THR",
        itemType: "rental",
        inventoryQty: 3,
        category: "Furniture",
        storageLocation: "Barn, loft",
        unitCostCents: 125_050,
        description: '=cmd "quoted", multi\nline',
        lowInventoryThreshold: 1,
      });
      await checkOut(business.id, throne.id, 1);
      const pool = await createBaseInventoryUnit(business.id, {
        name: "-Balloons",
        inventoryQty: 40,
        reservedQty: 5,
      });
      const product = await createProduct(business.id, {
        trackInventory: false,
      });
      await db.product.update({
        where: { id: product.id },
        data: { baseInventoryUnitId: pool.id, baseUnitsConsumed: 1 },
      });
      await createBaseInventoryUnit(business.id, { name: "Empty" });

      const exported = await caller.baseInventoryUnit.exportCsv();
      expect(exported.filename).toMatch(/^inventory-\d{4}-\d{2}-\d{2}\.csv$/);
      expect(exported.csv.split("\n")[0]).toContain("SKU,Name,Type");

      const before = await db.inventoryHistory.count();
      const preview = await caller.baseInventoryUnit.previewImport({
        fileName: exported.filename,
        csvContent: exported.csv,
      });
      expect(preview.counts).toMatchObject({
        create: 0,
        update: 0,
        unchanged: 3,
        quantityChanges: 0,
        errors: 0,
      });

      const result = await caller.baseInventoryUnit.commitImport({
        fileName: exported.filename,
        csvContent: exported.csv,
        expectedQuantities: preview.expectedQuantities,
      });
      expect(result).toEqual({
        created: 0,
        updated: 0,
        quantityAdjusted: 0,
        unchanged: 3,
        changedSincePreview: [],
        failed: [],
        skippedErrors: 0,
      });
      expect(await db.inventoryHistory.count()).toBe(before);
    },
    T,
  );

  it(
    "tenant isolation: another business's same SKU/name is invisible — the row creates a new item here",
    async () => {
      const { business, caller } = await setupBusiness();
      const other = await createBusiness({});
      const foreign = await createBaseInventoryUnit(other.id, {
        name: "Shared",
        sku: "SHARED",
        inventoryQty: 50,
      });

      const preview = await caller.baseInventoryUnit.previewImport({
        fileName: "t.csv",
        csvContent: csv("SKU,Name,Quantity", "SHARED,Shared,3"),
      });
      expect(preview.counts.create).toBe(1);

      const result = await caller.baseInventoryUnit.commitImport({
        fileName: "t.csv",
        csvContent: csv("SKU,Name,Quantity", "SHARED,Shared,3"),
        // A forged pin for the foreign item is ignored (it's never matched).
        expectedQuantities: { [foreign.id]: 50 },
      });
      expect(result.created).toBe(1);

      const mine = await db.baseInventoryUnit.findFirstOrThrow({
        where: { businessId: business.id, sku: "SHARED" },
      });
      expect(mine.inventoryQty).toBe(3);
      expect(
        await db.baseInventoryUnit.findUniqueOrThrow({
          where: { id: foreign.id },
        }),
      ).toMatchObject({ businessId: other.id, inventoryQty: 50 });
      expect(await historyFor(foreign.id)).toHaveLength(0);

      const exported = await caller.baseInventoryUnit.exportCsv();
      expect(exported.csv.match(/SHARED/g)).toHaveLength(1);
    },
    T,
  );

  it(
    "commit re-plans against fresh state: an item deleted after the preview is created fresh",
    async () => {
      const { business, caller } = await setupBusiness();
      const drapes = await createBaseInventoryUnit(business.id, {
        name: "Drapes",
        sku: "DR",
        inventoryQty: 5,
      });
      const file = csv("SKU,Name,Quantity", "DR,Drapes,9");
      const preview = await caller.baseInventoryUnit.previewImport({
        fileName: "r.csv",
        csvContent: file,
      });
      expect(preview.counts.update).toBe(1);

      await caller.baseInventoryUnit.delete({ id: drapes.id });

      const result = await caller.baseInventoryUnit.commitImport({
        fileName: "r.csv",
        csvContent: file,
        expectedQuantities: preview.expectedQuantities,
      });
      expect(result).toMatchObject({ created: 1, updated: 0, failed: [] });
      const fresh = await db.baseInventoryUnit.findFirstOrThrow({
        where: { businessId: business.id, sku: "DR" },
      });
      expect(fresh.id).not.toBe(drapes.id);
      expect(fresh.inventoryQty).toBe(9);
    },
    T,
  );

  it(
    "rental → stock via import is a row error while units are out",
    async () => {
      const { business, caller } = await setupBusiness();
      const throne = await createBaseInventoryUnit(business.id, {
        name: "Throne",
        itemType: "rental",
        inventoryQty: 2,
      });
      await checkOut(business.id, throne.id, 1);
      const result = await caller.baseInventoryUnit.commitImport({
        fileName: "s.csv",
        csvContent: csv("Name,Type", "Throne,stock"),
      });
      expect(result).toMatchObject({ updated: 0, skippedErrors: 1 });
      expect(
        (
          await db.baseInventoryUnit.findUniqueOrThrow({
            where: { id: throne.id },
          })
        ).itemType,
      ).toBe("rental");
    },
    T,
  );
});
