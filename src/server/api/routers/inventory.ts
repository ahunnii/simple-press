import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, ownerAdminProcedure } from "~/server/api/trpc";

export const inventoryRouter = createTRPCRouter({
  // Get inventory levels for a product
  getProductInventory: ownerAdminProcedure
    .input(z.object({ productId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { businessId } = ctx;

      const product = await ctx.db.product.findUnique({
        where: { id: input.productId, businessId },
        include: {
          business: { select: { id: true } },
          variants: {
            select: {
              id: true,
              name: true,
              sku: true,
              inventoryQty: true,
            },
          },
        },
      });

      if (!product) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Product not found",
        });
      }

      return {
        productId: product.id,
        productName: product.name,
        variants: product.variants,
      };
    }),

  // Update inventory for a variant
  updateVariantInventory: ownerAdminProcedure
    .input(
      z.object({
        variantId: z.string(),
        quantity: z.number().int(),
        reason: z
          .enum(["restock", "adjustment", "correction", "damage", "return"])
          .optional(),
        note: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const variant = await ctx.db.productVariant.findUnique({
        where: { id: input.variantId, product: { businessId } },
        select: { id: true, inventoryQty: true, productId: true },
      });

      if (!variant) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Variant not found",
        });
      }

      const newQty = input.quantity;

      const result = await ctx.db.$transaction(async (tx) => {
        const updated = await tx.productVariant.update({
          where: { id: input.variantId, product: { businessId } },
          data: { inventoryQty: newQty },
        });

        await tx.inventoryHistory.create({
          data: {
            variantId: input.variantId,
            productId: variant.productId,
            businessId,
            previousQty: variant.inventoryQty,
            newQty,
            changeQty: newQty - variant.inventoryQty,
            reason: input.reason ?? "adjustment",
            note: input.note,
            userId: ctx.session.user.id,
          },
        });

        // Reset alert flags atomically within the same transaction
        const parent = await tx.product.findUnique({
          where: { id: variant.productId },
          select: {
            lowInventoryThreshold: true,
            lowInventoryAlertSent: true,
            outOfStockAlertSent: true,
          },
        });
        if (parent) {
          const resetData: {
            outOfStockAlertSent?: boolean;
            lowInventoryAlertSent?: boolean;
          } = {};
          if (parent.outOfStockAlertSent && newQty > 0)
            resetData.outOfStockAlertSent = false;
          if (
            parent.lowInventoryAlertSent &&
            parent.lowInventoryThreshold !== null &&
            newQty > parent.lowInventoryThreshold
          ) {
            resetData.lowInventoryAlertSent = false;
          }
          if (Object.keys(resetData).length > 0) {
            await tx.product.update({
              where: { id: variant.productId },
              data: resetData,
            });
          }
        }

        return updated;
      });

      return result;
    }),

  // Update inventory for a base product (no variants)
  updateProductInventory: ownerAdminProcedure
    .input(
      z.object({
        productId: z.string(),
        quantity: z.number().int(),
        reason: z
          .enum(["restock", "adjustment", "correction", "damage", "return"])
          .optional(),
        note: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const product = await ctx.db.product.findUnique({
        where: { id: input.productId, businessId, variants: { none: {} } },
        select: {
          id: true,
          inventoryQty: true,
          lowInventoryThreshold: true,
          lowInventoryAlertSent: true,
          outOfStockAlertSent: true,
        },
      });

      if (!product) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message:
            "Product not found or has variants — use variant inventory update instead",
        });
      }

      const newQty = input.quantity;

      await ctx.db.$transaction(async (tx) => {
        await tx.product.update({
          where: { id: product.id },
          data: { inventoryQty: newQty },
        });

        await tx.inventoryHistory.create({
          data: {
            productId: product.id,
            businessId,
            previousQty: product.inventoryQty,
            newQty,
            changeQty: newQty - product.inventoryQty,
            reason: input.reason ?? "adjustment",
            note: input.note,
            userId: ctx.session.user.id,
          },
        });

        // Reset alert flags atomically
        const resetData: {
          outOfStockAlertSent?: boolean;
          lowInventoryAlertSent?: boolean;
        } = {};
        if (product.outOfStockAlertSent && newQty > 0)
          resetData.outOfStockAlertSent = false;
        if (
          product.lowInventoryAlertSent &&
          product.lowInventoryThreshold !== null &&
          newQty > product.lowInventoryThreshold
        ) {
          resetData.lowInventoryAlertSent = false;
        }
        if (Object.keys(resetData).length > 0) {
          await tx.product.update({
            where: { id: product.id },
            data: resetData,
          });
        }
      });

      return { message: "Inventory updated successfully" };
    }),


  // Get recent oversell alerts — InventoryHistory rows with reason: "oversell"
  getOversellAlerts: ownerAdminProcedure
    .input(
      z.object({
        days: z.number().int().min(1).max(365).default(30),
        take: z.number().int().min(1).max(50).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const since = new Date();
      since.setDate(since.getDate() - input.days);

      const rows = await ctx.db.inventoryHistory.findMany({
        where: {
          businessId,
          reason: "oversell",
          createdAt: { gte: since },
        },
        include: {
          product: { select: { id: true, name: true } },
          variant: { select: { name: true } },
          order: { select: { id: true, orderNumber: true } },
        },
        orderBy: { createdAt: "desc" },
        take: input.take,
      });

      return rows;
    }),

  // Get low stock alerts (variants + base products)
  getLowStockAlerts: ownerAdminProcedure
    .input(z.object({ threshold: z.number().int().default(10) }))
    .query(async ({ ctx, input }) => {
      const { businessId } = ctx;

      const [lowStockVariants, lowStockBaseProducts] = await Promise.all([
        ctx.db.productVariant.findMany({
          where: {
            product: { businessId, trackInventory: true },
            inventoryQty: { lte: input.threshold, gte: 0 },
          },
          include: {
            product: { select: { id: true, name: true, published: true } },
          },
          orderBy: { inventoryQty: "asc" },
        }),
        ctx.db.product.findMany({
          where: {
            businessId,
            trackInventory: true,
            variants: { none: {} },
            inventoryQty: { lte: input.threshold, gte: 0 },
          },
          select: {
            id: true,
            name: true,
            sku: true,
            inventoryQty: true,
            published: true,
          },
          orderBy: { inventoryQty: "asc" },
        }),
      ]);

      return { variants: lowStockVariants, baseProducts: lowStockBaseProducts };
    }),

  // Get inventory history
  getInventoryHistory: ownerAdminProcedure
    .input(
      z.object({
        variantId: z.string().optional(),
        productId: z.string().optional(),
        limit: z.number().int().min(1).max(100).default(50),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const where: Record<string, string> = {};

      if (input.variantId) {
        where.variantId = input.variantId;
      }

      if (input.productId) {
        where.productId = input.productId;
      }

      // Get history records
      const history = await ctx.db.inventoryHistory.findMany({
        where: {
          ...where,
          businessId,
        },
        include: {
          variant: {
            select: {
              name: true,
              sku: true,
            },
          },
          product: {
            select: {
              name: true,
            },
          },
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: input.limit,
      });

      return history;
    }),

  // Bulk update inventory from CSV
  bulkUpdateInventory: ownerAdminProcedure
    .input(
      z.object({
        updates: z.array(
          z.object({
            sku: z.string(),
            quantity: z.number().int().min(0),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      const results = {
        success: 0,
        failed: 0,
        errors: [] as string[],
      };

      // Process each update
      for (const update of input.updates) {
        try {
          // Try variant SKU first
          const variant = await ctx.db.productVariant.findFirst({
            where: { sku: update.sku, product: { businessId } },
            select: { id: true, inventoryQty: true, productId: true },
          });

          if (variant) {
            await ctx.db.$transaction(async (tx) => {
              await tx.productVariant.update({
                where: { id: variant.id, product: { businessId } },
                data: { inventoryQty: update.quantity },
              });
              await tx.inventoryHistory.create({
                data: {
                  variantId: variant.id,
                  productId: variant.productId,
                  businessId,
                  previousQty: variant.inventoryQty,
                  newQty: update.quantity,
                  changeQty: update.quantity - variant.inventoryQty,
                  reason: "adjustment",
                  note: "Bulk update via CSV",
                  userId: ctx.session.user.id,
                },
              });
              // Reset alert flags atomically
              const parent = await tx.product.findUnique({
                where: { id: variant.productId },
                select: {
                  lowInventoryThreshold: true,
                  lowInventoryAlertSent: true,
                  outOfStockAlertSent: true,
                },
              });
              if (parent) {
                const resetData: {
                  outOfStockAlertSent?: boolean;
                  lowInventoryAlertSent?: boolean;
                } = {};
                if (parent.outOfStockAlertSent && update.quantity > 0)
                  resetData.outOfStockAlertSent = false;
                if (
                  parent.lowInventoryAlertSent &&
                  parent.lowInventoryThreshold !== null &&
                  update.quantity > parent.lowInventoryThreshold
                ) {
                  resetData.lowInventoryAlertSent = false;
                }
                if (Object.keys(resetData).length > 0) {
                  await tx.product.update({
                    where: { id: variant.productId },
                    data: resetData,
                  });
                }
              }
            });
            results.success++;
            continue;
          }

          // Fall back to base product SKU (no variants)
          const baseProduct = await ctx.db.product.findFirst({
            where: { sku: update.sku, businessId, variants: { none: {} } },
            select: {
              id: true,
              inventoryQty: true,
              lowInventoryThreshold: true,
              lowInventoryAlertSent: true,
              outOfStockAlertSent: true,
            },
          });

          if (!baseProduct) {
            results.failed++;
            results.errors.push(`SKU ${update.sku} not found`);
            continue;
          }

          await ctx.db.$transaction(async (tx) => {
            await tx.product.update({
              where: { id: baseProduct.id },
              data: { inventoryQty: update.quantity },
            });
            await tx.inventoryHistory.create({
              data: {
                productId: baseProduct.id,
                businessId,
                previousQty: baseProduct.inventoryQty,
                newQty: update.quantity,
                changeQty: update.quantity - baseProduct.inventoryQty,
                reason: "adjustment",
                note: "Bulk update via CSV",
                userId: ctx.session.user.id,
              },
            });
            const resetData: {
              outOfStockAlertSent?: boolean;
              lowInventoryAlertSent?: boolean;
            } = {};
            if (baseProduct.outOfStockAlertSent && update.quantity > 0)
              resetData.outOfStockAlertSent = false;
            if (
              baseProduct.lowInventoryAlertSent &&
              baseProduct.lowInventoryThreshold !== null &&
              update.quantity > baseProduct.lowInventoryThreshold
            ) {
              resetData.lowInventoryAlertSent = false;
            }
            if (Object.keys(resetData).length > 0) {
              await tx.product.update({
                where: { id: baseProduct.id },
                data: resetData,
              });
            }
          });

          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push(
            `SKU ${update.sku}: ${error instanceof Error ? error.message : "Unknown error"}`,
          );
        }
      }

      return results;
    }),
});
