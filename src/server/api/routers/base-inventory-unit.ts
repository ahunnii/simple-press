import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  EMPTY_POOL_SALES,
  poolSalesWhere,
  summarizePoolSales,
  type PoolLedgerGroupRow,
} from "~/lib/inventory";
import {
  createTRPCRouter,
  featureGate,
  ownerAdminProcedure,
} from "~/server/api/trpc";

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

  getById: ownerAdminProcedure
    .use(featureGate("inventory"))
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const [pool, salesRows] = await Promise.all([
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
            inventoryHistory: {
              orderBy: { createdAt: "desc" },
              take: 100,
              include: {
                order: { select: { id: true, orderNumber: true } },
                product: { select: { id: true, name: true } },
                user: { select: { name: true, email: true } },
              },
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
      ]);
      if (!pool) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Pool not found" });
      }

      const rows: PoolLedgerGroupRow[] = salesRows.map((r) => ({
        baseInventoryUnitId: r.baseInventoryUnitId,
        reason: r.reason,
        _sum: { changeQty: r._sum.changeQty },
        _count: { _all: r._count._all },
      }));
      const sales = summarizePoolSales(rows).get(input.id) ?? EMPTY_POOL_SALES;

      return { ...pool, sales };
    }),

  create: ownerAdminProcedure
    .use(featureGate("inventory"))
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        inventoryQty: z.number().int().min(0).default(0),
        lowInventoryThreshold: z
          .number()
          .int()
          .positive()
          .nullable()
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      return ctx.db.baseInventoryUnit.create({
        data: {
          businessId,
          name: input.name,
          description: input.description,
          inventoryQty: input.inventoryQty,
          lowInventoryThreshold: input.lowInventoryThreshold ?? null,
          allowBackorders: false,
        },
      });
    }),

  update: ownerAdminProcedure
    .use(featureGate("inventory"))
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().nullable().optional(),
        lowInventoryThreshold: z
          .number()
          .int()
          .positive()
          .nullable()
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const pool = await ctx.db.baseInventoryUnit.findUnique({
        where: { id: input.id, businessId },
        select: { id: true },
      });
      if (!pool) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Pool not found" });
      }
      return ctx.db.baseInventoryUnit.update({
        where: { id: input.id },
        data: {
          name: input.name,
          description: input.description,
          lowInventoryThreshold: input.lowInventoryThreshold,
        },
      });
    }),

  delete: ownerAdminProcedure
    .use(featureGate("inventory"))
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const pool = await ctx.db.baseInventoryUnit.findUnique({
        where: { id: input.id, businessId },
        select: { id: true },
      });
      if (!pool) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Pool not found" });
      }
      await ctx.db.$transaction(async (tx) => {
        // Re-enable individual tracking on linked products before the pool is deleted.
        // Without this, the cascade SetNull leaves trackInventory=false and products
        // silently become unlimited-stock. Setting inventoryQty=0 ensures they show
        // as out of stock until the admin manually restocks them.
        await tx.product.updateMany({
          where: { baseInventoryUnitId: input.id },
          data: {
            trackInventory: true,
            inventoryQty: 0,
            baseUnitsConsumed: null,
          },
        });
        await tx.baseInventoryUnit.delete({ where: { id: input.id } });
      });
      return { success: true };
    }),

  adjustInventory: ownerAdminProcedure
    .use(featureGate("inventory"))
    .input(
      z.object({
        id: z.string(),
        quantity: z.number().int().min(0),
        reason: z
          .enum(["restock", "adjustment", "correction", "damage", "return"])
          .default("adjustment"),
        note: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      const pool = await ctx.db.baseInventoryUnit.findUnique({
        where: { id: input.id, businessId },
        select: {
          id: true,
          inventoryQty: true,
          lowInventoryThreshold: true,
          lowInventoryAlertSent: true,
          outOfStockAlertSent: true,
        },
      });

      if (!pool) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Pool not found" });
      }

      const previousQty = pool.inventoryQty;
      const newQty = input.quantity;

      await ctx.db.$transaction(async (tx) => {
        await tx.baseInventoryUnit.update({
          where: { id: input.id },
          data: { inventoryQty: newQty },
        });

        await tx.inventoryHistory.create({
          data: {
            baseInventoryUnitId: input.id,
            businessId,
            previousQty,
            newQty,
            changeQty: newQty - previousQty,
            reason: input.reason,
            note: input.note,
            userId: ctx.session.user.id,
          },
        });

        const resetData: {
          outOfStockAlertSent?: boolean;
          lowInventoryAlertSent?: boolean;
        } = {};
        if (pool.outOfStockAlertSent && newQty > 0)
          resetData.outOfStockAlertSent = false;
        if (
          pool.lowInventoryAlertSent &&
          pool.lowInventoryThreshold !== null &&
          newQty > (pool.lowInventoryThreshold ?? 0)
        ) {
          resetData.lowInventoryAlertSent = false;
        }
        if (Object.keys(resetData).length > 0) {
          await tx.baseInventoryUnit.update({
            where: { id: input.id },
            data: resetData,
          });
        }
      });

      return { success: true };
    }),
});
