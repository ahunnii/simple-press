/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Prisma } from "generated/prisma";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { checkBusiness } from "~/lib/check-business";
import { resolveFlags } from "~/lib/features/resolve-flags";
import { getAuthorizedPreviewBusinessId } from "~/lib/preview/preview-context";
import type { TxClient } from "~/server/db";
import {
  cmsPageDraftSchema,
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

/**
 * Shape used to validate a page's stored `previewDraft` before we either swap
 * it into a public response or promote it to the live columns. Kept permissive
 * (content is TipTap JSON) — a malformed draft is skipped/ignored, never
 * trusted or promoted.
 */
const cmsPageDraftValueSchema = z.object({
  title: z.string().min(1),
  excerpt: z.string().nullable(),
  content: z.any(),
});

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

      const { templateId, clearPreviewDraft, publishCmsPageDrafts, ...data } =
        input;

      const upsertSiteContent = (tx: TxClient) =>
        tx.siteContent.upsert({
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

      const siteContent = publishCmsPageDrafts
        ? // Visual editor Publish: promote every editable page's preview draft
          // (CMS pages and blog posts alike) to its live columns in the same
          // transaction as the site-content save.
          await ctx.db.$transaction(async (tx) => {
            const sc = await upsertSiteContent(tx);

            const drafts = await tx.page.findMany({
              where: { businessId, previewDraft: { not: Prisma.DbNull } },
              select: { id: true, previewDraft: true },
            });

            for (const p of drafts) {
              const parsed = cmsPageDraftValueSchema.safeParse(p.previewDraft);
              // Skip a malformed draft silently — a bad row must not fail the
              // whole publish.
              if (!parsed.success) continue;
              await tx.page.update({
                where: { id: p.id },
                data: {
                  title: parsed.data.title,
                  excerpt: parsed.data.excerpt,
                  content: parsed.data.content as Prisma.InputJsonValue,
                  previewDraft: Prisma.DbNull,
                  previewDraftUpdatedAt: null,
                },
              });
            }

            return sc;
          })
        : await upsertSiteContent(ctx.db);

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

  // Discard ALL visual-editor drafts at once — the site-content draft plus
  // every page and blog-post draft. Separate from `clearPreviewDraft` (above),
  // which the legacy Template Fields editor uses and must NOT touch page or
  // blog-post drafts.
  discardEditorDrafts: ownerAdminProcedure.mutation(async ({ ctx }) => {
    const { businessId } = ctx;

    await ctx.db.$transaction([
      ctx.db.siteContent.updateMany({
        where: { businessId },
        data: {
          previewCustomFields: Prisma.JsonNull,
          previewUpdatedAt: null,
        },
      }),
      ctx.db.page.updateMany({
        where: { businessId, previewDraft: { not: Prisma.DbNull } },
        data: {
          previewDraft: Prisma.DbNull,
          previewDraftUpdatedAt: null,
        },
      }),
    ]);

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

      // Never expose the visual-editor draft columns to admin list callers.
      return pages.map(
        ({ previewDraft: _pd, previewDraftUpdatedAt: _pu, ...page }) => page,
      );
    }),

  getEditorPages: ownerAdminProcedure.query(async ({ ctx }) => {
    const { businessId } = ctx;

    // Resolve the blog flag off the session-scoped business rather than
    // `getBusinessFlags()` — that helper resolves the business by hostname,
    // which this admin-session procedure has no business depending on.
    // `isEnabled` already folds in dependency-disabled flags.
    const flagRow = await ctx.db.business.findUnique({
      where: { id: businessId },
      select: { featureFlags: true },
    });
    const blogEnabled = resolveFlags(flagRow?.featureFlags).isEnabled("blog");

    const pages = await ctx.db.page.findMany({
      where: {
        businessId,
        // Blog posts are editable in the visual editor too, but only surface
        // them when the business actually has the blog feature on.
        type: { in: blogEnabled ? ["page", "blog"] : ["page"] },
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });

    return pages.map((p) => ({
      id: p.id,
      slug: p.slug,
      type: p.type as "page" | "blog",
      published: p.published,
      live: { title: p.title, excerpt: p.excerpt, content: p.content },
      draft:
        p.previewDraft == null
          ? null
          : (p.previewDraft as unknown as {
              title: string;
              excerpt: string | null;
              content: unknown;
            }),
      hasDraft: p.previewDraft != null,
    }));
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

      // Never expose the visual-editor draft columns to admin callers.
      return (({ previewDraft: _pd, previewDraftUpdatedAt: _pu, ...safe }) =>
        safe)(page);
    }),

  // Save a per-page CMS preview draft (visual editor). Owner-only; never
  // exposed to the public storefront except swapped-in via an authorized
  // preview.
  saveCmsPageDraft: ownerAdminProcedure
    .input(cmsPageDraftSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      // Deliberately NOT feature-gated on `blog`: if the flag is toggled off
      // mid-session, in-flight autosaves must not start erroring. Drafts are
      // owner-only and publicly invisible, so accepting one costs nothing.
      const { count } = await ctx.db.page.updateMany({
        where: { id: input.pageId, businessId, type: { in: ["page", "blog"] } },
        data: {
          previewDraft: input.draft as Prisma.InputJsonValue,
          previewDraftUpdatedAt: new Date(),
        },
      });

      if (count === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "This page no longer exists",
        });
      }

      return { ok: true };
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

      // Authorized owner/manager/platform-admin preview of THIS business.
      const previewBizId = await getAuthorizedPreviewBusinessId(business.id);
      const isPreview = previewBizId != null;

      const page = await ctx.db.page.findUnique({
        where: {
          businessId_slug: {
            businessId: business.id,
            slug: input.slug,
          },
          ...(input.type ? { type: input.type } : {}),
          // Public route: never leak unpublished pages. In an authorized
          // preview we intentionally drop this filter so drafts render.
          ...(isPreview ? {} : { published: true }),
        },
      });

      if (!page) return page;

      // LEAK-SAFETY INVARIANT: the response returned to the public storefront
      // route must NEVER contain the raw draft columns. Strip them here
      // unconditionally; for an authorized preview the draft *values* are
      // swapped into title/excerpt/content below instead.
      const previewDraft = page.previewDraft;
      const safe = (({ previewDraft: _pd, previewDraftUpdatedAt: _pu, ...rest }) =>
        rest)(page);

      if (isPreview && previewDraft != null) {
        const parsed = cmsPageDraftValueSchema.safeParse(previewDraft);
        // Ignore a malformed draft — fall through to the live values.
        if (parsed.success) {
          return {
            ...safe,
            title: parsed.data.title,
            excerpt: parsed.data.excerpt,
            content: parsed.data.content,
          };
        }
      }

      return safe;
    }),

  getBlogPostBySlug: publicProcedure
    .use(getBusinessProcedure())
    .use(featureGate("blog"))
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const { businessId } = ctx;

      // Authorized owner/manager/platform-admin preview of THIS business.
      const previewBizId = await getAuthorizedPreviewBusinessId(businessId);
      const isPreview = previewBizId != null;

      const page = await ctx.db.page.findUnique({
        where: {
          businessId_slug: {
            businessId,
            slug: input.slug,
          },
          type: "blog",
          // Public route: never leak draft/unpublished blog posts. In an
          // authorized preview we intentionally drop this filter so drafts
          // render.
          ...(isPreview ? {} : { published: true }),
        },
      });

      if (!page) return page;

      // LEAK-SAFETY INVARIANT: the response returned to the public storefront
      // route must NEVER contain the raw draft columns. Strip them here
      // unconditionally; for an authorized preview the draft *values* are
      // swapped into title/excerpt/content below instead.
      const previewDraft = page.previewDraft;
      const safe = (({ previewDraft: _pd, previewDraftUpdatedAt: _pu, ...rest }) =>
        rest)(page);

      // An unpublished preview has no `publishedAt`, so the fallback to
      // `createdAt` still yields a sensible date on every path.
      const createdAt = page.publishedAt ?? page.createdAt;

      if (isPreview && previewDraft != null) {
        const parsed = cmsPageDraftValueSchema.safeParse(previewDraft);
        // Ignore a malformed draft — fall through to the live values.
        if (parsed.success) {
          return {
            ...safe,
            title: parsed.data.title,
            excerpt: parsed.data.excerpt,
            content: parsed.data.content,
            createdAt,
          };
        }
      }

      return { ...safe, createdAt };
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

      // Blog posts CAN carry a visual-editor draft, so hard-nulling the draft
      // columns' VALUES here is the leak guard — we null rather than drop them
      // so the wide `Page`-compatible field types are preserved (the raw
      // `Page[]` shape `useBlogPosts` and the blog cards consume) while no
      // draft data is ever exposed. The listing (and related posts) stays
      // live-only on purpose: the previewed post itself is the only draft
      // surface.
      return pages.map((p) => ({
        ...p,
        previewDraft: null as Prisma.JsonValue,
        previewDraftUpdatedAt: null as Date | null,
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
        select: { businessId: true, slug: true, type: true },
      });

      if (!existingPage) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Page not found",
        });
      }

      // A page's `type` is immutable after creation. The blog editor always
      // sends `type: "blog"`, so opening a non-blog page id under the blog
      // editor route and saving would silently retype it (e.g. a policy page
      // becomes a blog post). Reject any attempt to change the type; legitimate
      // saves either omit `type` or send the page's own existing type.
      if (input.data.type && input.data.type !== existingPage.type) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "A page's type cannot be changed. This page was opened in the wrong editor.",
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

      // Update sort order for each page atomically — a mid-batch failure
      // must not leave the order partially applied.
      await ctx.db.$transaction(
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
