/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { parseWooCommerceCSV } from "~/lib/woocommerce/csv-parser";
import { validateImport } from "~/lib/woocommerce/import-validator";
import { importProducts } from "~/lib/woocommerce/product-importer";

import { createTRPCRouter, ownerAdminProcedure } from "../trpc";

export const importRouter = createTRPCRouter({
  parseCSV: ownerAdminProcedure
    .input(
      z.object({
        csvContent: z.string(),
        filename: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      // Parse CSV
      const products = await parseWooCommerceCSV(input.csvContent);

      // Validate
      const validation = await validateImport(businessId, products);

      // Save to database for review
      const importRecord = await ctx.db.productImport.create({
        data: {
          businessId: businessId,
          filename: input.filename,
          totalRows: products.length,
          status: "pending",
          mappedData: validation.valid,
          errors: validation.invalid,
          warnings: validation.valid.filter((p) => p.warnings.length > 0),
          createdById: ctx.session.user.id,
        },
      });

      return {
        importId: importRecord.id,
        summary: validation.summary,
        valid: validation.valid,
        invalid: validation.invalid,
      };
    }),

  getImport: ownerAdminProcedure
    .input(z.object({ importId: z.string() }))
    .query(async ({ ctx, input }) => {
      const importRecord = await ctx.db.productImport.findUnique({
        where: { id: input.importId },
        include: {
          business: { select: { id: true } },
        },
      });

      if (!importRecord) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Import not found",
        });
      }

      // Verify ownership
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { businessId: true },
      });

      if (user?.businessId !== importRecord.business.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized",
        });
      }

      return importRecord;
    }),

  executeImport: ownerAdminProcedure
    .input(
      z.object({
        importId: z.string(),
        options: z.object({
          onDuplicateSku: z.enum(["skip", "update", "create_new"]),
          importImages: z.boolean(),
          createCollectionsFromCategories: z.boolean(),
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const importRecord = await ctx.db.productImport.findUnique({
        where: { id: input.importId },
        include: {
          business: { select: { id: true } },
        },
      });

      if (!importRecord) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Import not found",
        });
      }

      // Verify ownership
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { businessId: true },
      });

      if (user?.businessId !== importRecord.business.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized",
        });
      }

      // Update status
      await ctx.db.productImport.update({
        where: { id: input.importId },
        data: { status: "processing" },
      });

      try {
        // Execute import
        const result = await importProducts(importRecord.mappedData as any, {
          businessId: importRecord.businessId,
          ...input.options,
        });

        // Update import record with results
        await ctx.db.productImport.update({
          where: { id: input.importId },
          data: {
            status: "completed",
            importedCount: result.imported,
            skippedCount: result.skipped,
            errorCount: result.errors.length,
          },
        });

        return {
          success: true,
          imported: result.imported,
          skipped: result.skipped,
          errors: result.errors,
        };
      } catch (error) {
        // Update status to failed
        await ctx.db.productImport.update({
          where: { id: input.importId },
          data: {
            status: "failed",
            errors: {
              message: error instanceof Error ? error.message : "Import failed",
            },
          },
        });

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Import failed",
        });
      }
    }),

  getImportHistory: ownerAdminProcedure
    .input(z.object({ businessId: z.string() }))
    .query(async ({ ctx, input }) => {
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

      const imports = await ctx.db.productImport.findMany({
        where: { businessId: input.businessId },
        orderBy: { createdAt: "desc" },
        take: 10,
      });

      return imports;
    }),
});
