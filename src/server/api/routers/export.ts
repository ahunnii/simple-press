import { TRPCError } from "@trpc/server";
import z from "zod";

import {
  exportToWooCommerceCSV,
  generateExportFilename,
} from "~/lib/wordpress/csv-exporter";
import { createTRPCRouter, ownerAdminProcedure } from "~/server/api/trpc";

export const exportRouter = createTRPCRouter({
  // Get products available for export
  getProductsForExport: ownerAdminProcedure
    .input(
      z.object({
        search: z.string().optional(),
        publishedOnly: z.boolean().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { businessId } = ctx;

      const products = await ctx.db.product.findMany({
        where: {
          businessId,
          ...(input.search && {
            OR: [
              { name: { contains: input.search, mode: "insensitive" } },
              { sku: { contains: input.search, mode: "insensitive" } },
            ],
          }),
          ...(input.publishedOnly && { published: true }),
        },
        select: {
          id: true,
          name: true,
          sku: true,
          price: true,
          published: true,
          featured: true,
          inventoryQty: true,
          images: {
            take: 1,
            orderBy: { sortOrder: "asc" },
          },
          variants: { select: { id: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      return products.map((p) => ({
        ...p,
        variantCount: p.variants.length,
      }));
    }),

  // Export selected products
  exportProducts: ownerAdminProcedure
    .input(
      z.object({
        productIds: z.array(z.string()).min(1, "Select at least one product"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      // Get products with all relations
      const products = await ctx.db.product.findMany({
        where: {
          id: { in: input.productIds },
          businessId,
        },
        include: {
          images: {
            orderBy: { sortOrder: "asc" },
          },
          variants: true,
        },
      });

      if (products.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No products found",
        });
      }

      // Generate CSV
      const csv = exportToWooCommerceCSV(products);

      // Get business name for filename
      const business = await ctx.db.business.findUnique({
        where: { id: businessId },
        select: { name: true },
      });

      const filename = generateExportFilename(business?.name ?? "products");

      return {
        csv,
        filename,
        productCount: products.length,
      };
    }),
});
