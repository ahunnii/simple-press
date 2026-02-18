/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { checkBusiness } from "~/lib/check-business";
import { pageSchema, siteContentSchema } from "~/lib/validators/content";
import { EMPTY_TIPTAP_DOC } from "~/lib/validators/page";

import {
  createTRPCRouter,
  ownerAdminProcedure,
  publicProcedure,
} from "../trpc";

export const contentRouter = createTRPCRouter({
  // ==========================================
  // SITE CONTENT (Homepage, SEO, etc.)
  // ==========================================

  getSiteContent: ownerAdminProcedure.query(async ({ ctx }) => {
    const { businessId } = ctx;

    let siteContent = await ctx.db.siteContent.findUnique({
      where: { businessId: businessId },
    });

    // Create if doesn't exist
    siteContent ??= await ctx.db.siteContent.create({
      data: {
        businessId,
      },
    });

    return siteContent;
  }),

  // Update site content
  updateSiteContent: ownerAdminProcedure
    .input(siteContentSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      const { templateId, ...data } = input;

      const siteContent = await ctx.db.siteContent.upsert({
        where: { businessId },
        create: {
          businessId,
          ...data,
        },
        update: data,
      });

      if (templateId) {
        await ctx.db.business.update({
          where: { id: businessId },
          data: { templateId },
        });
      }

      return {
        data: siteContent,
        templateId,
      };
    }),

  // ==========================================
  // PAGES
  // ==========================================

  // Get all pages
  getPages: ownerAdminProcedure
    .input(
      z
        .object({
          type: z.enum(["page", "policy", "custom", "all"]).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const { businessId } = ctx;

      const pages = await ctx.db.page.findMany({
        where: {
          businessId,
          ...(input?.type && input?.type !== "all"
            ? { type: input?.type }
            : {}),
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      });

      return pages;
    }),

  getSimplifiedPages: publicProcedure
    .input(
      z.object({
        type: z.enum(["page", "policy", "custom", "all"]).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const business = await checkBusiness();

      if (!business) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Business not found",
        });
      }

      const pages = await ctx.db.page.findMany({
        where: {
          businessId: business.id,
          ...(input.type && input.type !== "all" ? { type: input.type } : {}),
          published: true,
        },
        select: {
          id: true,
          title: true,
          slug: true,
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      });

      return pages;
    }),

  getPageById: ownerAdminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const page = await ctx.db.page.findUnique({
        where: { id: input.id, businessId },
        include: { business: { select: { id: true } } },
      });

      if (!page) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Page not found",
        });
      }

      return page;
    }),

  getPageBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const business = await checkBusiness();

      if (!business) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Business not found",
        });
      }

      const page = await ctx.db.page.findUnique({
        where: {
          businessId_slug: {
            businessId: business.id,
            slug: input.slug,
          },
        },
      });

      return page;
    }),

  // Create page
  createPage: ownerAdminProcedure
    .input(z.object({ data: pageSchema }))
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      // Check if slug already exists
      const existing = await ctx.db.page.findUnique({
        where: {
          businessId_slug: {
            businessId,
            slug: input.data.slug,
          },
        },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A page with this slug already exists",
        });
      }

      const page = await ctx.db.page.create({
        data: {
          ...input.data,
          businessId,
          content: input.data.content ?? EMPTY_TIPTAP_DOC,
        },
      });

      return page;
    }),

  // Update page
  updatePage: ownerAdminProcedure
    .input(
      z.object({
        id: z.string(),
        data: pageSchema.partial(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const existingPage = await ctx.db.page.findUnique({
        where: { id: input.id, businessId },
        select: { businessId: true, slug: true },
      });

      if (!existingPage) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Page not found",
        });
      }

      // If changing slug, check it doesn't conflict
      if (input.data.slug && input.data.slug !== existingPage.slug) {
        const conflict = await ctx.db.page.findUnique({
          where: {
            businessId_slug: {
              businessId: existingPage.businessId,
              slug: input.data.slug,
            },
          },
        });

        if (conflict) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "A page with this slug already exists",
          });
        }
      }

      const page = await ctx.db.page.update({
        where: { id: input.id },
        data: input.data,
      });

      return page;
    }),

  // Delete page
  deletePage: ownerAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const page = await ctx.db.page.findUnique({
        where: { id: input.id, businessId },
        select: { businessId: true },
      });

      if (!page) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Page not found",
        });
      }

      await ctx.db.page.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  // Reorder pages
  reorderPages: ownerAdminProcedure
    .input(z.object({ pageIds: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      // Update sort order for each page
      await Promise.all(
        input.pageIds.map((pageId, index) =>
          ctx.db.page.update({
            where: { id: pageId, businessId },
            data: { sortOrder: index },
          }),
        ),
      );

      return { success: true };
    }),
});
