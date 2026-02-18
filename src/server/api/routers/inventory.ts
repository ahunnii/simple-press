import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { checkBusiness } from "~/lib/check-business";
import {
  createTRPCRouter,
  ownerAdminProcedure,
  publicProcedure,
} from "~/server/api/trpc";

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
      // Get variant with product and business
      const variant = await ctx.db.productVariant.findUnique({
        where: { id: input.variantId, product: { businessId } },
        include: {
          product: {
            include: {
              business: {
                select: { id: true },
              },
            },
          },
        },
      });

      if (!variant) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Variant not found",
        });
      }

      // Update inventory in transaction with history
      const result = await ctx.db.$transaction(async (tx) => {
        // Update variant inventory
        const updated = await tx.productVariant.update({
          where: { id: input.variantId, product: { businessId } },
          data: {
            inventoryQty: input.quantity,
          },
        });

        // Create inventory history record
        await tx.inventoryHistory.create({
          data: {
            variantId: input.variantId,
            productId: variant.productId,
            businessId,
            previousQty: variant.inventoryQty,
            newQty: input.quantity,
            changeQty: input.quantity - variant.inventoryQty,
            reason: input.reason ?? "adjustment",
            note: input.note,
            userId: ctx.session.user.id,
          },
        });

        return updated;
      });

      return result;
    }),

  // Deduct inventory (called when order is placed)
  deductInventory: publicProcedure
    .input(
      z.object({
        items: z.array(
          z.object({
            productId: z.string(),
            variantId: z.string().nullable(),
            quantity: z.number().int().positive(),
          }),
        ),
        orderId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const business = await checkBusiness();
      if (!business) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Business not found",
        });
      }

      // Process inventory deduction in transaction
      await ctx.db.$transaction(async (tx) => {
        for (const item of input.items) {
          if (!item.variantId) continue; // Skip if no variant

          // Get current inventory
          const variant = await tx.productVariant.findUnique({
            where: { id: item.variantId, product: { businessId: business.id } },
            select: {
              id: true,
              inventoryQty: true,
              productId: true,
              product: {
                select: {
                  businessId: true,
                  name: true,
                },
              },
            },
          });

          if (!variant) continue;

          const newQty = variant.inventoryQty - item.quantity;

          // Update inventory
          await tx.productVariant.update({
            where: { id: item.variantId, product: { businessId: business.id } },
            data: {
              inventoryQty: newQty,
            },
          });

          // Create history record
          await tx.inventoryHistory.create({
            data: {
              variantId: item.variantId,
              productId: variant.productId,
              businessId: business.id,
              previousQty: variant.inventoryQty,
              newQty,
              changeQty: -item.quantity,
              reason: "sale",
              note: `Order #${input.orderId}`,
              orderId: input.orderId,
            },
          });
        }
      });

      return { success: true };
    }),

  // Restore inventory (called when order is refunded/cancelled)
  restoreInventory: ownerAdminProcedure
    .input(z.object({ orderId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      // Get order with items
      const order = await ctx.db.order.findUnique({
        where: { id: input.orderId, businessId },
        include: { items: true },
      });

      if (!order) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Order not found",
        });
      }

      // Restore inventory in transaction
      await ctx.db.$transaction(async (tx) => {
        for (const item of order.items) {
          if (!item.productVariantId) continue;

          const variant = await tx.productVariant.findUnique({
            where: { id: item.productVariantId, product: { businessId } },
            select: {
              id: true,
              inventoryQty: true,
              productId: true,
              product: {
                select: { businessId: true },
              },
            },
          });

          if (!variant) continue;

          const newQty = variant.inventoryQty + item.quantity;

          // Update inventory
          await tx.productVariant.update({
            where: { id: item.productVariantId, product: { businessId } },
            data: {
              inventoryQty: newQty,
            },
          });

          // Create history record
          await tx.inventoryHistory.create({
            data: {
              variantId: item.productVariantId,
              productId: variant.productId,
              businessId,
              previousQty: variant.inventoryQty,
              newQty,
              changeQty: item.quantity,
              reason: "return",
              note: `Refund/Cancel Order #${input.orderId}`,
              orderId: input.orderId,
            },
          });
        }
      });

      return { success: true };
    }),

  // Get low stock alerts
  getLowStockAlerts: ownerAdminProcedure
    .input(z.object({ threshold: z.number().int().default(10) }))
    .query(async ({ ctx, input }) => {
      const { businessId } = ctx;
      // Get variants with low stock
      const lowStockVariants = await ctx.db.productVariant.findMany({
        where: {
          product: {
            businessId,
          },
          inventoryQty: {
            lte: input.threshold,
            gte: 0,
          },
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              published: true,
            },
          },
        },
        orderBy: {
          inventoryQty: "asc",
        },
      });

      return lowStockVariants;
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
      const where: Record<string, string> = {};

      if (input.variantId) {
        where.variantId = input.variantId;
      }

      if (input.productId) {
        where.productId = input.productId;
      }

      // Get history records
      const history = await ctx.db.inventoryHistory.findMany({
        where,
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
          // Find variant by SKU
          const variant = await ctx.db.productVariant.findFirst({
            where: {
              sku: update.sku,
              product: { businessId },
            },
            include: {
              product: {
                select: {
                  businessId: true,
                },
              },
            },
          });

          if (!variant) {
            results.failed++;
            results.errors.push(`SKU ${update.sku} not found`);
            continue;
          }

          await ctx.db.$transaction(async (tx) => {
            // Update inventory
            await tx.productVariant.update({
              where: { id: variant.id, product: { businessId } },
              data: {
                inventoryQty: update.quantity,
              },
            });

            // Create history
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
