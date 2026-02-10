import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const inventoryRouter = createTRPCRouter({
  // Get inventory levels for a product
  getProductInventory: protectedProcedure
    .input(
      z.object({
        productId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Verify user owns this product's business
      const product = await ctx.db.product.findUnique({
        where: { id: input.productId },
        include: {
          business: {
            select: { id: true },
          },
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

      // Check user owns this business
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { businessId: true },
      });

      if (user?.businessId !== product.business.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized",
        });
      }

      return {
        productId: product.id,
        productName: product.name,
        variants: product.variants,
      };
    }),

  // Update inventory for a variant
  updateVariantInventory: protectedProcedure
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
      // Get variant with product and business
      const variant = await ctx.db.productVariant.findUnique({
        where: { id: input.variantId },
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

      // Verify ownership
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { businessId: true },
      });

      if (user?.businessId !== variant.product.business.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized",
        });
      }

      // Update inventory in transaction with history
      const result = await ctx.db.$transaction(async (tx) => {
        // Update variant inventory
        const updated = await tx.productVariant.update({
          where: { id: input.variantId },
          data: {
            inventoryQty: input.quantity,
          },
        });

        // Create inventory history record
        await tx.inventoryHistory.create({
          data: {
            variantId: input.variantId,
            productId: variant.productId,
            businessId: variant.product.business.id,
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
  deductInventory: protectedProcedure
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
      // Process inventory deduction in transaction
      await ctx.db.$transaction(async (tx) => {
        for (const item of input.items) {
          if (!item.variantId) continue; // Skip if no variant

          // Get current inventory
          const variant = await tx.productVariant.findUnique({
            where: { id: item.variantId },
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
            where: { id: item.variantId },
            data: {
              inventoryQty: newQty,
            },
          });

          // Create history record
          await tx.inventoryHistory.create({
            data: {
              variantId: item.variantId,
              productId: variant.productId,
              businessId: variant.product.businessId,
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
  restoreInventory: protectedProcedure
    .input(
      z.object({
        orderId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Get order with items
      const order = await ctx.db.order.findUnique({
        where: { id: input.orderId },
        include: {
          items: true,
        },
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
            where: { id: item.productVariantId },
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
            where: { id: item.productVariantId },
            data: {
              inventoryQty: newQty,
            },
          });

          // Create history record
          await tx.inventoryHistory.create({
            data: {
              variantId: item.productVariantId,
              productId: variant.productId,
              businessId: variant.product.businessId,
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
  getLowStockAlerts: protectedProcedure
    .input(
      z.object({
        businessId: z.string(),
        threshold: z.number().int().default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Verify ownership
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { businessId: true },
      });

      if (user?.businessId !== input.businessId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized",
        });
      }

      // Get variants with low stock
      const lowStockVariants = await ctx.db.productVariant.findMany({
        where: {
          product: {
            businessId: input.businessId,
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
  getInventoryHistory: protectedProcedure
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
  bulkUpdateInventory: protectedProcedure
    .input(
      z.object({
        businessId: z.string(),
        updates: z.array(
          z.object({
            sku: z.string(),
            quantity: z.number().int().min(0),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { businessId: true },
      });

      if (user?.businessId !== input.businessId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized",
        });
      }

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
              product: {
                businessId: input.businessId,
              },
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
              where: { id: variant.id },
              data: {
                inventoryQty: update.quantity,
              },
            });

            // Create history
            await tx.inventoryHistory.create({
              data: {
                variantId: variant.id,
                productId: variant.productId,
                businessId: variant.product.businessId,
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
