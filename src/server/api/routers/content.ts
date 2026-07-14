/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Prisma } from "generated/prisma";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { checkBusiness } from "~/lib/check-business";
import {
  pageSchema,
  previewDraftSchema,
  siteContentSchema,
} from "~/lib/validators/content";
import { EMPTY_TIPTAP_DOC } from "~/lib/validators/page";
import {
  bannerConfigSchema,
  newVersion,
  popupConfigSchema,
  updateBannerConfigSchema,
  updatePopupConfigSchema,
} from "~/lib/validators/site-banner";

import {
  createTRPCRouter,
  featureGate,
  getBusinessProcedure,
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

  getEditorState: ownerAdminProcedure.query(async ({ ctx }) => {
    const { businessId } = ctx;

    const siteContent = await ctx.db.siteContent.findUnique({
      where: { businessId },
      select: {
        customFields: true,
        previewCustomFields: true,
        previewUpdatedAt: true,
      },
    });

    return {
      customFields: (siteContent?.customFields ?? {}) as Record<
        string,
        unknown
      >,
      previewCustomFields: (siteContent?.previewCustomFields ?? null) as Record<
        string,
        unknown
      > | null,
      previewUpdatedAt: siteContent?.previewUpdatedAt ?? null,
      hasDraft: siteContent?.previewCustomFields != null,
    };
  }),

  // Update site content
  updateSiteContent: ownerAdminProcedure
    .input(siteContentSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      const { templateId, clearPreviewDraft, ...data } = input;

      const siteContent = await ctx.db.siteContent.upsert({
        where: { businessId },
        create: {
          businessId,
          ...data,
        },
        update: {
          ...data,
          // Only clear the durable /editor draft when the caller explicitly
          // says this save supersedes it (the visual editor's Publish
          // action). Unrelated saves — Branding, Navigation, the legacy
          // Template Fields editor — must never silently wipe an
          // in-progress draft.
          ...(clearPreviewDraft
            ? { previewCustomFields: Prisma.JsonNull, previewUpdatedAt: null }
            : {}),
        },
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

  // Save a preview draft (owner-only, not visible to public visitors)
  savePreviewDraft: ownerAdminProcedure
    .input(previewDraftSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      await ctx.db.siteContent.upsert({
        where: { businessId },
        create: {
          businessId,
          previewCustomFields: input.customFields as Prisma.InputJsonValue,
          previewUpdatedAt: new Date(),
        },
        update: {
          previewCustomFields: input.customFields as Prisma.InputJsonValue,
          previewUpdatedAt: new Date(),
        },
      });

      return { ok: true };
    }),

  // Clear the preview draft (e.g., on editor unmount or explicit clear)
  clearPreviewDraft: ownerAdminProcedure.mutation(async ({ ctx }) => {
    const { businessId } = ctx;

    await ctx.db.siteContent.updateMany({
      where: { businessId },
      data: {
        previewCustomFields: Prisma.JsonNull,
        previewUpdatedAt: null,
      },
    });

    return { ok: true };
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
    .input(
      z.object({
        slug: z.string(),
        type: z.enum(["page", "policy", "blog", "custom"]).optional(),
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
          ...(input.type ? { type: input.type } : {}),
        },
      });

      return page;
    }),

  getBlogPostBySlug: publicProcedure
    .use(getBusinessProcedure())
    .use(featureGate("blog"))
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const { businessId } = ctx;

      const page = await ctx.db.page.findUnique({
        where: {
          businessId_slug: {
            businessId,
            slug: input.slug,
          },
          type: "blog",
        },
      });

      return page
        ? { ...page, createdAt: page.publishedAt ?? page.createdAt }
        : page;
    }),

  getBlogPages: publicProcedure
    .use(getBusinessProcedure())
    .use(featureGate("blog"))
    .query(async ({ ctx }) => {
      const { businessId } = ctx;

      const pages = await ctx.db.page.findMany({
        where: {
          businessId,
          type: "blog",
          published: true,
        },
        orderBy: [
          { sortOrder: "asc" },
          { publishedAt: { sort: "desc", nulls: "last" } },
          { createdAt: "desc" },
        ],
      });

      return pages.map((p) => ({
        ...p,
        createdAt: p.publishedAt ?? p.createdAt,
      }));
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

      return { data: page, message: "Page updated successfully" };
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

  // ==========================================
  // BANNER & POPUP CONFIG
  // ==========================================

  getBannerConfig: ownerAdminProcedure.query(async ({ ctx }) => {
    const { businessId } = ctx;
    const siteContent = await ctx.db.siteContent.findUnique({
      where: { businessId },
      select: { bannerConfig: true },
    });
    const parsed = bannerConfigSchema.safeParse(siteContent?.bannerConfig);
    return parsed.success ? parsed.data : null;
  }),

  getPopupConfig: ownerAdminProcedure.query(async ({ ctx }) => {
    const { businessId } = ctx;
    const siteContent = await ctx.db.siteContent.findUnique({
      where: { businessId },
      select: { popupConfig: true },
    });
    const parsed = popupConfigSchema.safeParse(siteContent?.popupConfig);
    return parsed.success ? parsed.data : null;
  }),

  updateBannerConfig: ownerAdminProcedure
    .input(updateBannerConfigSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const bannerConfig = {
        ...input,
        version: newVersion(),
      } satisfies Record<string, unknown>;

      await ctx.db.siteContent.upsert({
        where: { businessId },
        create: {
          businessId,
          bannerConfig: bannerConfig as Prisma.InputJsonValue,
        },
        update: {
          bannerConfig: bannerConfig as Prisma.InputJsonValue,
        },
      });

      return { ok: true };
    }),

  updatePopupConfig: ownerAdminProcedure
    .input(updatePopupConfigSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const popupConfig = {
        ...input,
        version: newVersion(),
      } satisfies Record<string, unknown>;

      await ctx.db.siteContent.upsert({
        where: { businessId },
        create: {
          businessId,
          popupConfig: popupConfig as Prisma.InputJsonValue,
        },
        update: {
          popupConfig: popupConfig as Prisma.InputJsonValue,
        },
      });

      return { ok: true };
    }),
});
