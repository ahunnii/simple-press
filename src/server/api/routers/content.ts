/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { checkBusiness } from "~/lib/check-business";
import { EMPTY_TIPTAP_DOC } from "~/lib/validators/page";

import {
  createTRPCRouter,
  ownerAdminProcedure,
  protectedProcedure,
  publicProcedure,
} from "../trpc";

// Validation schemas
const siteContentSchema = z.object({
  templateId: z.string().optional(),
  // Hero Section
  heroTitle: z.string().optional(),
  heroSubtitle: z.string().optional(),
  heroImageUrl: z.string().url().optional().or(z.literal("")),
  heroButtonText: z.string().optional(),
  heroButtonLink: z.string().optional(),

  // About Section
  aboutTitle: z.string().optional(),
  aboutText: z.string().optional(),
  aboutImageUrl: z.string().url().optional().or(z.literal("")),

  // Features
  features: z.any().optional(), // JSON array

  // Footer
  footerText: z.string().optional(),
  socialLinks: z.any().optional(), // JSON object

  // SEO
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  metaKeywords: z.string().optional(),
  ogImage: z.string().url().optional().or(z.literal("")),
  faviconUrl: z.string().url().optional().or(z.literal("")),

  // Logo
  logoUrl: z.string().url().optional().or(z.literal("")),
  logoAltText: z.string().optional(),

  // Colors
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  accentColor: z.string().optional(),

  // Navigation
  navigationItems: z.any().optional(), // JSON array

  // Template-specific
  customFields: z.any().optional(), // JSON object
});

const pageSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase with hyphens"),
  content: z.any(),
  excerpt: z.string().optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  metaKeywords: z.string().optional(),
  ogImage: z.string().url().optional().or(z.literal("")),
  published: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
  type: z.enum(["page", "policy", "custom"]).default("page"),
  template: z.enum(["default", "sidebar", "full-width"]).default("default"),
});

export const contentRouter = createTRPCRouter({
  // ==========================================
  // SITE CONTENT (Homepage, SEO, etc.)
  // ==========================================

  // Get site content
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
        businessId: z.string(),
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
          businessId: input.businessId,
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

  // Get single page
  getPage: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const page = await ctx.db.page.findUnique({
        where: { id: input.id },
        include: { business: { select: { id: true } } },
      });

      if (!page) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Page not found",
        });
      }

      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { businessId: true },
      });

      if (user?.businessId !== page.business.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized",
        });
      }

      return page;
    }),

  // Get page by slug (for storefront)
  getPageBySlug: publicProcedure
    .input(
      z.object({
        slug: z.string(),
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
    .input(
      z.object({
        data: pageSchema,
      }),
    )
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
  updatePage: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        data: pageSchema.partial(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existingPage = await ctx.db.page.findUnique({
        where: { id: input.id },
        select: { businessId: true, slug: true },
      });

      if (!existingPage) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Page not found",
        });
      }

      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { businessId: true },
      });

      if (user?.businessId !== existingPage.businessId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized",
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
  deletePage: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const page = await ctx.db.page.findUnique({
        where: { id: input.id },
        select: { businessId: true },
      });

      if (!page) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Page not found",
        });
      }

      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { businessId: true },
      });

      if (user?.businessId !== page.businessId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized",
        });
      }

      await ctx.db.page.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  // Reorder pages
  reorderPages: protectedProcedure
    .input(
      z.object({
        businessId: z.string(),
        pageIds: z.array(z.string()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
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

      // Update sort order for each page
      await Promise.all(
        input.pageIds.map((pageId, index) =>
          ctx.db.page.update({
            where: { id: pageId },
            data: { sortOrder: index },
          }),
        ),
      );

      return { success: true };
    }),
});
