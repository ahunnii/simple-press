import { Prisma } from "generated/prisma";
import { TRPCError } from "@trpc/server";
import Papa from "papaparse";
import { z } from "zod";

import type { PoolLedgerGroupRow } from "~/lib/inventory";
import type { ExistingItem, PlannedRow } from "~/lib/inventory/csv";
import type { DbClient, TxClient } from "~/server/db";
import {
  addCalendarDays,
  isRealCalendarDate,
  zonedCalendarDate,
} from "~/lib/calendar-date";
import { sanitizeCsvRows } from "~/lib/csv/escape-cell";
import { parseZonedDateTime } from "~/lib/events/normalize";
import {
  applyMovement,
  EMPTY_POOL_SALES,
  getOutstandingByItem,
  InventoryMovementError,
  isCheckoutOverdue,
  lineOutstanding,
  lockItems,
  poolSalesWhere,
  reasonLabel,
  rethrowMovementError,
  summarizePoolSales,
  toTrpcError,
  withManualInventoryTx,
} from "~/lib/inventory";
import {
  buildInventoryCsv,
  generateInventoryCsvFilename,
  MAX_IMPORT_BYTES,
  parseInventoryCsv,
  planInventoryImport,
} from "~/lib/inventory/csv";
import {
  createTRPCRouter,
  featureGate,
  ownerAdminProcedure,
  staffProcedure,
} from "~/server/api/trpc";

// Inventory access tiers. STAFF may view and count/move stock; creating,
// editing, deleting items and import/export stay owner/admin.
const invStaff = staffProcedure.use(featureGate("inventory"));
const invOwner = ownerAdminProcedure.use(featureGate("inventory"));

/** Rows per page of `history`. */
export const INVENTORY_HISTORY_PAGE_SIZE = 25;
/** Hard cap on `exportHistory` rows. */
export const INVENTORY_HISTORY_EXPORT_MAX_ROWS = 20_000;

const MAX_QTY = 2_147_483_647;
const MAX_UNIT_COST_CENTS = 100_000_000;

// ─── Input helpers ──────────────────────────────────────────────────────────

/**
 * Optional free-text field: trimmed, blank → null. `undefined` stays
 * `undefined` (update: "leave unchanged"); `null` or blank clears it.
 */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "" ? null : v));

const itemTypeSchema = z.enum(["stock", "rental"]);
const unitCostSchema = z
  .number()
  .int()
  .min(0)
  .max(MAX_UNIT_COST_CENTS)
  .nullable()
  .optional();
const thresholdSchema = z.number().int().positive().nullable().optional();

const ymdSchema = z
  .string()
  .refine(isRealCalendarDate, { message: "Use a YYYY-MM-DD date" });

const historyFiltersSchema = z.object({
  itemId: z.string().optional(),
  reasons: z.array(z.string().max(32)).max(20).optional(),
  from: ymdSchema.optional(),
  to: ymdSchema.optional(),
});
type HistoryFilters = z.infer<typeof historyFiltersSchema>;

// ─── Shared helpers ─────────────────────────────────────────────────────────

/** Staff never see unit cost; owners/managers and platform admins do. */
const canSeeCost = (role: string | null) => role !== "STAFF";

function unitsOutMessage(n: number): string {
  return `${n} ${n === 1 ? "unit is" : "units are"} still checked out — check them in first`;
}

async function loadTimeZone(db: DbClient, businessId: string) {
  const business = await db.business.findUnique({
    where: { id: businessId },
    select: { timeZone: true },
  });
  return business?.timeZone ?? "UTC";
}

/** Local midnight of `ymd` in `timeZone`; UTC midnight if the zone is bad. */
function zonedDayStart(ymd: string, timeZone: string): Date {
  try {
    return parseZonedDateTime(ymd, timeZone);
  } catch {
    return new Date(`${ymd}T00:00:00Z`);
  }
}

function historyWhere(
  businessId: string,
  filters: HistoryFilters,
  timeZone: string,
): Prisma.InventoryHistoryWhereInput {
  const createdAt: Prisma.DateTimeFilter = {};
  if (filters.from) createdAt.gte = zonedDayStart(filters.from, timeZone);
  if (filters.to) {
    createdAt.lt = zonedDayStart(addCalendarDays(filters.to, 1), timeZone);
  }
  return {
    businessId,
    // Item-level ledger only: product/variant-only rows (no pool) are excluded.
    baseInventoryUnitId: filters.itemId ?? { not: null },
    ...(filters.reasons && filters.reasons.length > 0
      ? { reason: { in: filters.reasons } }
      : {}),
    ...(createdAt.gte || createdAt.lt ? { createdAt } : {}),
  };
}

const HISTORY_INCLUDE = {
  baseInventoryUnit: {
    select: { id: true, name: true, sku: true, itemType: true },
  },
  order: { select: { id: true, orderNumber: true } },
  checkout: { select: { id: true, label: true } },
  product: { select: { id: true, name: true } },
  user: { select: { name: true, email: true } },
} satisfies Prisma.InventoryHistoryInclude;

function toSalesRows(
  rows: {
    baseInventoryUnitId: string | null;
    reason: string;
    _sum: { changeQty: number | null };
    _count: { _all: number };
  }[],
): PoolLedgerGroupRow[] {
  return rows.map((r) => ({
    baseInventoryUnitId: r.baseInventoryUnitId,
    reason: r.reason,
    _sum: { changeQty: r._sum.changeQty },
    _count: { _all: r._count._all },
  }));
}

function isUniqueViolation(
  err: unknown,
): err is Prisma.PrismaClientKnownRequestError {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002"
  );
}

/** CONFLICT when another item in the business already uses `sku` (any case). */
async function assertSkuFree(
  db: DbClient | TxClient,
  businessId: string,
  sku: string,
  excludeId?: string,
): Promise<void> {
  const clash = await db.baseInventoryUnit.findFirst({
    where: {
      businessId,
      sku: { equals: sku, mode: "insensitive" },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { name: true },
  });
  if (clash) {
    throw new TRPCError({
      code: "CONFLICT",
      message: `SKU ${sku} is already used by ${clash.name}`,
    });
  }
}

/** Map a P2002 on the (businessId, sku) index to the same CONFLICT. */
async function skuConflictFromUniqueViolation(
  db: DbClient,
  businessId: string,
  sku: string | null | undefined,
): Promise<TRPCError> {
  const clash = sku
    ? await db.baseInventoryUnit.findFirst({
        where: { businessId, sku: { equals: sku, mode: "insensitive" } },
        select: { name: true },
      })
    : null;
  return new TRPCError({
    code: "CONFLICT",
    message: `SKU ${sku ?? ""} is already used by ${clash?.name ?? "another item"}`,
  });
}

/** Every item of the business in the shape the CSV helpers take. */
async function loadExistingItems(
  db: DbClient,
  businessId: string,
): Promise<ExistingItem[]> {
  const [items, outstanding] = await Promise.all([
    db.baseInventoryUnit.findMany({
      where: { businessId },
      select: {
        id: true,
        name: true,
        sku: true,
        itemType: true,
        category: true,
        storageLocation: true,
        description: true,
        inventoryQty: true,
        reservedQty: true,
        lowInventoryThreshold: true,
        unitCostCents: true,
        _count: { select: { products: true } },
      },
      orderBy: [{ name: "asc" }, { id: "asc" }],
    }),
    getOutstandingByItem(db, businessId),
  ]);
  return items.map(({ _count, ...item }) => ({
    ...item,
    outstanding: outstanding.get(item.id) ?? 0,
    linkedProducts: _count.products,
  }));
}

type ImportFieldChange = {
  field: string;
  from: string | number | null;
  to: string | number | null;
};

const asCell = (v: unknown): string | number | null =>
  typeof v === "string" || typeof v === "number" ? v : null;

/** Preview-friendly summary of a create/update planned row. */
function summarizePlannedRow(row: PlannedRow) {
  if (row.action === "create") {
    const { rowNumber, name, inventoryQty, ...rest } = row.data;
    void rowNumber;
    const changes: ImportFieldChange[] = Object.entries(rest)
      .filter(([, v]) => v !== undefined)
      .map(([field, v]) => ({ field, from: null, to: asCell(v) }));
    return {
      rowNumber: row.rowNumber,
      action: "create" as const,
      itemId: null,
      itemName: name,
      changes,
      qtyChange:
        inventoryQty !== undefined ? { from: 0, to: inventoryQty } : null,
    };
  }
  const changes: ImportFieldChange[] = Object.entries(row.changes).map(
    ([field, change]) => ({
      field,
      from: asCell(change?.from),
      to: asCell(change?.to),
    }),
  );
  return {
    rowNumber: row.rowNumber,
    action: "update" as const,
    itemId: row.itemId as string | null,
    itemName: row.itemName,
    changes,
    qtyChange: row.qtyChange ?? null,
  };
}

/** Prisma `data` for the detail fields of a planned update row. */
function updateDataFromChanges(
  changes: Extract<PlannedRow, { action: "update" | "unchanged" }>["changes"],
): Prisma.BaseInventoryUnitUpdateInput {
  const data: Prisma.BaseInventoryUnitUpdateInput = {};
  for (const [field, change] of Object.entries(changes)) {
    if (!change) continue;
    (data as Record<string, unknown>)[field] = change.to;
  }
  return data;
}

// ─── Router ─────────────────────────────────────────────────────────────────

export const baseInventoryUnitRouter = createTRPCRouter({
  // NOT gated on "inventory" — unlike every other procedure below, `list` is
  // also called from the product create/edit form (admin/products/new and
  // admin/products/[id]) to populate the pool picker, and that UI is gated on
  // "products", not "inventory". Gating this one would 403 product
  // create/edit for any business that has products enabled but inventory
  // disabled. See admin/inventory/page.tsx and admin/products/[new|[id]]/page.tsx.
  list: ownerAdminProcedure.query(async ({ ctx }) => {
    const { businessId } = ctx;
    const [pools, salesRows] = await Promise.all([
      ctx.db.baseInventoryUnit.findMany({
        where: { businessId },
        include: { _count: { select: { products: true } } },
        orderBy: { name: "asc" },
      }),
      ctx.db.inventoryHistory.groupBy({
        by: ["baseInventoryUnitId", "reason"],
        where: poolSalesWhere({ businessId }),
        _sum: { changeQty: true },
        _count: { _all: true },
      }),
    ]);

    const rows: PoolLedgerGroupRow[] = salesRows.map((r) => ({
      baseInventoryUnitId: r.baseInventoryUnitId,
      reason: r.reason,
      _sum: { changeQty: r._sum.changeQty },
      _count: { _all: r._count._all },
    }));
    const sales = summarizePoolSales(rows);

    return pools.map((p) => ({
      ...p,
      sales: sales.get(p.id) ?? EMPTY_POOL_SALES,
    }));
  }),

  /**
   * The `/admin/inventory` items table: every item with sales, linked product
   * count and units currently checked out. `unitCostCents` is null for STAFF.
   */
  items: invStaff.query(async ({ ctx }) => {
    const { businessId } = ctx;
    const [pools, salesRows, outstanding] = await Promise.all([
      ctx.db.baseInventoryUnit.findMany({
        where: { businessId },
        include: { _count: { select: { products: true } } },
        orderBy: [{ name: "asc" }, { id: "asc" }],
      }),
      ctx.db.inventoryHistory.groupBy({
        by: ["baseInventoryUnitId", "reason"],
        where: poolSalesWhere({ businessId }),
        _sum: { changeQty: true },
        _count: { _all: true },
      }),
      getOutstandingByItem(ctx.db, businessId),
    ]);
    const sales = summarizePoolSales(toSalesRows(salesRows));
    const showCost = canSeeCost(ctx.membershipRole);

    const categories = [
      ...new Set(
        pools.map((p) => p.category?.trim()).filter((c): c is string => !!c),
      ),
    ].sort((a, b) => a.localeCompare(b));

    return {
      items: pools.map((p) => ({
        ...p,
        unitCostCents: showCost ? p.unitCostCents : null,
        sales: sales.get(p.id) ?? EMPTY_POOL_SALES,
        outQty: outstanding.get(p.id) ?? 0,
      })),
      categories,
      canManage: ctx.membershipRole !== "STAFF",
    };
  }),

  getById: invStaff
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const [pool, salesRows, lines, timeZone] = await Promise.all([
        ctx.db.baseInventoryUnit.findUnique({
          where: { id: input.id, businessId },
          include: {
            products: {
              select: {
                id: true,
                name: true,
                baseUnitsConsumed: true,
                published: true,
              },
              orderBy: { name: "asc" },
            },
            _count: { select: { products: true } },
          },
        }),
        ctx.db.inventoryHistory.groupBy({
          by: ["baseInventoryUnitId", "reason"],
          where: poolSalesWhere({ businessId, poolId: input.id }),
          _sum: { changeQty: true },
          _count: { _all: true },
        }),
        ctx.db.inventoryCheckoutLine.findMany({
          where: {
            businessId,
            itemId: input.id,
            checkout: { status: "open" },
          },
          include: {
            checkout: {
              select: {
                id: true,
                label: true,
                customerName: true,
                checkedOutAt: true,
                dueBackOn: true,
                status: true,
              },
            },
          },
          orderBy: [{ checkout: { checkedOutAt: "asc" } }, { id: "asc" }],
        }),
        loadTimeZone(ctx.db, businessId),
      ]);
      if (!pool) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Item not found" });
      }

      const sales =
        summarizePoolSales(toSalesRows(salesRows)).get(input.id) ??
        EMPTY_POOL_SALES;

      const now = new Date();
      const openLines = lines
        .map((line) => ({
          lineId: line.id,
          checkoutId: line.checkout.id,
          label: line.checkout.label,
          customerName: line.checkout.customerName,
          checkedOutAt: line.checkout.checkedOutAt,
          dueBackOn: line.checkout.dueBackOn,
          outstanding: lineOutstanding(line),
          overdue: isCheckoutOverdue(line.checkout, now, timeZone),
        }))
        .filter((line) => line.outstanding > 0);
      const outQty = openLines.reduce((sum, l) => sum + l.outstanding, 0);

      return {
        ...pool,
        unitCostCents: canSeeCost(ctx.membershipRole)
          ? pool.unitCostCents
          : null,
        sales,
        outQty,
        openLines,
      };
    }),

  /**
   * Item-level movement history (rows with a pool), newest first, paged.
   * `from`/`to` are calendar dates in the business's time zone, inclusive.
   * `page` is clamped onto the last real page.
   */
  history: invStaff
    .input(
      historyFiltersSchema.extend({
        page: z.number().int().min(1).default(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const pageSize = INVENTORY_HISTORY_PAGE_SIZE;
      const timeZone = await loadTimeZone(ctx.db, businessId);
      const where = historyWhere(businessId, input, timeZone);

      const totalCount = await ctx.db.inventoryHistory.count({ where });
      const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
      const page = Math.min(input.page, pageCount);

      const rows = await ctx.db.inventoryHistory.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: HISTORY_INCLUDE,
      });

      return {
        rows: rows.map(({ baseInventoryUnit, ...row }) => ({
          ...row,
          item: baseInventoryUnit,
        })),
        totalCount,
        page,
        pageCount,
        pageSize,
      };
    }),

  exportHistory: invOwner
    .input(historyFiltersSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const timeZone = await loadTimeZone(ctx.db, businessId);
      const found = await ctx.db.inventoryHistory.findMany({
        where: historyWhere(businessId, input, timeZone),
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: INVENTORY_HISTORY_EXPORT_MAX_ROWS + 1,
        include: HISTORY_INCLUDE,
      });
      const capped = found.length > INVENTORY_HISTORY_EXPORT_MAX_ROWS;
      const rows = found.slice(0, INVENTORY_HISTORY_EXPORT_MAX_ROWS);

      const records = rows.map((row) => ({
        // ISO UTC, matching the orders export.
        Date: row.createdAt.toISOString(),
        Item: row.baseInventoryUnit?.name ?? "",
        SKU: row.baseInventoryUnit?.sku ?? "",
        Reason: reasonLabel(row.reason),
        Change: row.changeQty,
        "Resulting qty": row.newQty,
        "Order #": row.order?.orderNumber ?? "",
        "Check-out": row.checkout?.label ?? "",
        By: row.user?.name ?? row.user?.email ?? "",
        Note: row.note ?? "",
      }));
      const fields = [
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
      ] as const;
      const csv = Papa.unparse({
        fields: [...fields],
        data: sanitizeCsvRows(records).map((r) => fields.map((f) => r[f])),
      });

      return {
        csv,
        filename: `inventory-activity-${zonedCalendarDate(new Date(), timeZone)}.csv`,
        capped,
      };
    }),

  create: invOwner
    .input(
      z.object({
        name: z.string().trim().min(1).max(191),
        description: optionalText(5000),
        inventoryQty: z.number().int().min(0).max(MAX_QTY).default(0),
        lowInventoryThreshold: thresholdSchema,
        itemType: itemTypeSchema.default("stock"),
        sku: optionalText(64),
        category: optionalText(100),
        storageLocation: optionalText(100),
        unitCostCents: unitCostSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const sku = input.sku ?? null;
      try {
        return await withManualInventoryTx(ctx.db, async (tx) => {
          if (sku) await assertSkuFree(tx, businessId, sku);
          const created = await tx.baseInventoryUnit.create({
            data: {
              businessId,
              name: input.name,
              description: input.description ?? null,
              inventoryQty: 0,
              lowInventoryThreshold: input.lowInventoryThreshold ?? null,
              allowBackorders: false,
              itemType: input.itemType,
              sku,
              category: input.category ?? null,
              storageLocation: input.storageLocation ?? null,
              unitCostCents: input.unitCostCents ?? null,
            },
          });
          if (input.inventoryQty === 0) return created;

          const locked = await lockItems(tx, {
            businessId,
            ids: [created.id],
          });
          await applyMovement(tx, locked.get(created.id)!, {
            movement: { mode: "set", quantity: input.inventoryQty },
            reason: "initial",
            userId: ctx.session.user.id,
          });
          return tx.baseInventoryUnit.findUniqueOrThrow({
            where: { id: created.id },
          });
        });
      } catch (err) {
        if (isUniqueViolation(err)) {
          throw await skuConflictFromUniqueViolation(ctx.db, businessId, sku);
        }
        rethrowMovementError(err);
      }
    }),

  /** Omitted fields are unchanged; `null` (or blank text) clears a field. */
  update: invOwner
    .input(
      z.object({
        id: z.string(),
        name: z.string().trim().min(1).max(191).optional(),
        description: optionalText(5000),
        lowInventoryThreshold: thresholdSchema,
        itemType: itemTypeSchema.optional(),
        sku: optionalText(64),
        category: optionalText(100),
        storageLocation: optionalText(100),
        unitCostCents: unitCostSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      try {
        return await withManualInventoryTx(ctx.db, async (tx) => {
          const locked = await lockItems(tx, { businessId, ids: [input.id] });
          const item = locked.get(input.id)!;

          if (input.sku) {
            await assertSkuFree(tx, businessId, input.sku, input.id);
          }
          if (input.itemType === "stock" && item.itemType === "rental") {
            const out =
              (await getOutstandingByItem(tx, businessId, [input.id])).get(
                input.id,
              ) ?? 0;
            if (out > 0) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: unitsOutMessage(out),
              });
            }
          }

          return tx.baseInventoryUnit.update({
            where: { id: input.id, businessId },
            data: {
              name: input.name,
              description: input.description,
              lowInventoryThreshold: input.lowInventoryThreshold,
              itemType: input.itemType,
              sku: input.sku,
              category: input.category,
              storageLocation: input.storageLocation,
              unitCostCents: input.unitCostCents,
            },
          });
        });
      } catch (err) {
        if (isUniqueViolation(err)) {
          throw await skuConflictFromUniqueViolation(
            ctx.db,
            businessId,
            input.sku,
          );
        }
        rethrowMovementError(err);
      }
    }),

  delete: invOwner
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      try {
        await withManualInventoryTx(ctx.db, async (tx) => {
          await lockItems(tx, { businessId, ids: [input.id] });
          const out =
            (await getOutstandingByItem(tx, businessId, [input.id])).get(
              input.id,
            ) ?? 0;
          if (out > 0) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: unitsOutMessage(out),
            });
          }
          // Re-enable individual tracking on linked products before the pool is deleted.
          // Without this, the cascade SetNull leaves trackInventory=false and products
          // silently become unlimited-stock. Setting inventoryQty=0 ensures they show
          // as out of stock until the admin manually restocks them.
          await tx.product.updateMany({
            where: { baseInventoryUnitId: input.id, businessId },
            data: {
              trackInventory: true,
              inventoryQty: 0,
              baseUnitsConsumed: null,
            },
          });
          await tx.baseInventoryUnit.delete({
            where: { id: input.id, businessId },
          });
        });
      } catch (err) {
        rethrowMovementError(err);
      }
      return { success: true };
    }),

  adjustInventory: invStaff
    .input(
      z.object({
        id: z.string(),
        quantity: z.number().int().min(0),
        reason: z
          .enum(["restock", "adjustment", "correction", "damage", "return"])
          .default("adjustment"),
        note: z.string().optional(),
        /**
         * The count the dialog showed when it opened. If the item has moved
         * since (a sale, another admin), the save is refused with CONFLICT
         * instead of silently overwriting it.
         */
        expectedQty: z.number().int().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      try {
        await withManualInventoryTx(ctx.db, async (tx) => {
          const items = await lockItems(tx, { businessId, ids: [input.id] });
          const item = items.get(input.id);
          if (!item) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Item not found",
            });
          }
          await applyMovement(tx, item, {
            movement: {
              mode: "set",
              quantity: input.quantity,
              expectedQty: input.expectedQty,
            },
            reason: input.reason,
            note: input.note,
            userId: ctx.session.user.id,
          });
        });
      } catch (err) {
        rethrowMovementError(err);
      }

      return { success: true };
    }),

  /**
   * `use` takes units off a stock item (never units a storefront checkout is
   * holding); `restock` adds units to any item.
   */
  moveStock: invStaff
    .input(
      z.object({
        id: z.string(),
        kind: z.enum(["use", "restock"]),
        quantity: z.number().int().min(1).max(1_000_000),
        note: z.string().trim().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      try {
        return await withManualInventoryTx(ctx.db, async (tx) => {
          const locked = await lockItems(tx, { businessId, ids: [input.id] });
          const item = locked.get(input.id)!;
          if (input.kind === "use" && item.itemType !== "stock") {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Use applies to stock items — check rentals out instead",
            });
          }
          const result = await applyMovement(tx, item, {
            movement:
              input.kind === "use"
                ? { mode: "delta", delta: -input.quantity, guard: "available" }
                : { mode: "delta", delta: input.quantity, guard: "none" },
            reason: input.kind === "use" ? "used" : "restock",
            note: input.note?.length ? input.note : null,
            userId: ctx.session.user.id,
          });
          return { previousQty: result.previousQty, newQty: result.newQty };
        });
      } catch (err) {
        rethrowMovementError(err);
      }
    }),

  // ─── CSV ──────────────────────────────────────────────────────────────────

  exportCsv: invOwner.mutation(async ({ ctx }) => {
    const items = await loadExistingItems(ctx.db, ctx.businessId);
    return {
      csv: buildInventoryCsv(items),
      filename: generateInventoryCsvFilename(),
    };
  }),

  /**
   * Parse + plan an import against current state, without writing. The
   * commit re-plans against fresh state, so this is advisory — except
   * `expectedQuantities`, which the client passes back so a quantity that
   * moved in between is skipped rather than overwritten.
   */
  previewImport: invOwner
    .input(
      z.object({
        csvContent: z.string().max(MAX_IMPORT_BYTES),
        fileName: z.string().max(255),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const parsed = parseInventoryCsv(input.csvContent);
      const base = {
        fileErrors: parsed.fileErrors,
        recognizedColumns: parsed.recognizedColumns,
        ignoredColumns: parsed.ignoredColumns,
        skippedBlank: parsed.skippedBlank,
      };
      if (parsed.fileErrors.length > 0) {
        return {
          ...base,
          counts: {
            create: 0,
            update: 0,
            unchanged: 0,
            quantityChanges: 0,
            errors: 0,
          },
          errors: [],
          errorCount: 0,
          warnings: [],
          warningCount: 0,
          sample: [],
          changedItems: [],
          expectedQuantities: {} as Record<string, number>,
        };
      }

      const existing = await loadExistingItems(ctx.db, ctx.businessId);
      const plan = planInventoryImport(parsed.rows, existing);
      const errors = [...parsed.errors, ...plan.errors].sort(
        (a, b) => a.rowNumber - b.rowNumber,
      );

      // Quantity cells per row, so every matched row that NAMES a quantity is
      // pinned — including rows whose quantity equals today's count. Without
      // that, a sale between preview and commit would turn an "unchanged" row
      // into an overwrite that undoes the sale.
      const qtyRows = new Set(
        parsed.rows
          .filter((r) => r.inventoryQty !== undefined)
          .map((r) => r.rowNumber),
      );
      const byId = new Map(existing.map((item) => [item.id, item]));
      const expectedQuantities: Record<string, number> = {};
      for (const row of plan.planned) {
        if (row.action === "create" || !qtyRows.has(row.rowNumber)) continue;
        const item = byId.get(row.itemId);
        if (item) expectedQuantities[row.itemId] = item.inventoryQty;
      }

      return {
        ...base,
        counts: { ...plan.counts, errors: errors.length },
        errors: errors.slice(0, 100),
        errorCount: errors.length,
        warnings: plan.warnings.slice(0, 100),
        warningCount: plan.warnings.length,
        sample: plan.planned
          .filter(
            (row): row is Extract<PlannedRow, { itemId: string }> =>
              row.action !== "create" && row.qtyChange !== undefined,
          )
          .slice(0, 20)
          .map((row) => ({
            rowNumber: row.rowNumber,
            itemId: row.itemId,
            itemName: row.itemName,
            from: row.qtyChange!.from,
            to: row.qtyChange!.to,
          })),
        changedItems: plan.planned
          .filter((row) => row.action === "create" || row.action === "update")
          .slice(0, 50)
          .map(summarizePlannedRow),
        expectedQuantities,
      };
    }),

  /**
   * Re-parse and re-plan against fresh state, then apply row by row — one
   * short transaction per row, so an import never holds many item locks.
   * Re-running the same file is a no-op.
   *
   * Counters: `updated` = rows whose details changed; `quantityAdjusted` =
   * rows whose count changed (a row can count in both); `unchanged` = matched
   * rows where nothing was written.
   */
  commitImport: invOwner
    .input(
      z.object({
        csvContent: z.string().max(MAX_IMPORT_BYTES),
        fileName: z.string().max(255),
        expectedQuantities: z.record(z.string(), z.number().int()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const userId = ctx.session.user.id;
      const parsed = parseInventoryCsv(input.csvContent);
      if (parsed.fileErrors.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: parsed.fileErrors.join(" "),
        });
      }

      const existing = await loadExistingItems(ctx.db, businessId);
      const plan = planInventoryImport(parsed.rows, existing);
      const note = `CSV import: ${input.fileName}`.slice(0, 500);

      let created = 0;
      let updated = 0;
      let quantityAdjusted = 0;
      let unchanged = 0;
      const changedSincePreview: {
        rowNumber: number;
        itemName: string;
        expected: number;
        current: number;
      }[] = [];
      const failed: { rowNumber: number; message: string }[] = [];

      for (const row of plan.planned) {
        if (row.action === "unchanged") {
          unchanged += 1;
          continue;
        }
        try {
          if (row.action === "create") {
            const { data } = row;
            await withManualInventoryTx(ctx.db, async (tx) => {
              if (data.sku) await assertSkuFree(tx, businessId, data.sku);
              const item = await tx.baseInventoryUnit.create({
                data: {
                  businessId,
                  name: data.name,
                  description: data.description ?? null,
                  inventoryQty: 0,
                  lowInventoryThreshold: data.lowInventoryThreshold ?? null,
                  allowBackorders: false,
                  itemType: data.itemType ?? "stock",
                  sku: data.sku ?? null,
                  category: data.category ?? null,
                  storageLocation: data.storageLocation ?? null,
                  unitCostCents: data.unitCostCents ?? null,
                },
              });
              if (data.inventoryQty !== undefined && data.inventoryQty > 0) {
                const locked = await lockItems(tx, {
                  businessId,
                  ids: [item.id],
                });
                await applyMovement(tx, locked.get(item.id)!, {
                  movement: { mode: "set", quantity: data.inventoryQty },
                  reason: "import",
                  note,
                  userId,
                });
              }
            });
            created += 1;
            continue;
          }

          const outcome = await withManualInventoryTx(ctx.db, async (tx) => {
            const locked = await lockItems(tx, {
              businessId,
              ids: [row.itemId],
            });
            const item = locked.get(row.itemId)!;

            const data = updateDataFromChanges(row.changes);
            const detailsChanged = Object.keys(data).length > 0;
            if (detailsChanged) {
              const skuTo = row.changes.sku?.to;
              if (typeof skuTo === "string" && skuTo !== "") {
                await assertSkuFree(tx, businessId, skuTo, item.id);
              }
              if (row.changes.itemType?.to === "stock") {
                const out =
                  (await getOutstandingByItem(tx, businessId, [item.id])).get(
                    item.id,
                  ) ?? 0;
                if (out > 0) {
                  throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: unitsOutMessage(out),
                  });
                }
              }
              await tx.baseInventoryUnit.update({
                where: { id: item.id, businessId },
                data,
              });
            }

            let qty: "none" | "adjusted" | { expected: number } = "none";
            if (row.qtyChange) {
              const expected = input.expectedQuantities?.[item.id];
              if (expected !== undefined && expected !== item.inventoryQty) {
                qty = { expected };
              } else {
                const result = await applyMovement(tx, item, {
                  movement: { mode: "set", quantity: row.qtyChange.to },
                  reason: "import",
                  note,
                  userId,
                  skipIfUnchanged: true,
                });
                if (result.historyId) qty = "adjusted";
              }
            }
            return { detailsChanged, qty, currentQty: item.inventoryQty };
          });

          if (outcome.detailsChanged) updated += 1;
          if (outcome.qty === "adjusted") quantityAdjusted += 1;
          if (typeof outcome.qty === "object") {
            changedSincePreview.push({
              rowNumber: row.rowNumber,
              itemName: row.itemName,
              expected: outcome.qty.expected,
              current: outcome.currentQty,
            });
          }
          if (!outcome.detailsChanged && outcome.qty !== "adjusted") {
            unchanged += 1;
          }
        } catch (err) {
          if (err instanceof InventoryMovementError) {
            failed.push({
              rowNumber: row.rowNumber,
              message: toTrpcError(err).message,
            });
          } else if (err instanceof TRPCError) {
            failed.push({ rowNumber: row.rowNumber, message: err.message });
          } else if (isUniqueViolation(err)) {
            failed.push({
              rowNumber: row.rowNumber,
              message: "That SKU is already used by another item",
            });
          } else {
            throw err;
          }
        }
      }

      return {
        created,
        updated,
        quantityAdjusted,
        unchanged,
        changedSincePreview,
        failed,
        skippedErrors: parsed.errors.length + plan.errors.length,
      };
    }),
});
