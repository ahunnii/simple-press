/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Prisma } from "generated/prisma";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { TxClient } from "~/server/db";
import { checkBusiness } from "~/lib/check-business";
import { resolveFlags } from "~/lib/features/resolve-flags";
import { getAuthorizedPreviewBusinessId } from "~/lib/preview/preview-context";
import { isPreviewDraft } from "~/lib/preview/preview-draft";
import {
  cmsPageDraftSchema,
  pageSchema,
  previewDraftSchema,
  siteContentSchema,
} from "~/lib/validators/content";
import {
  pageBulkDeleteSchema,
  pageBulkPublishSchema,
} from "~/lib/validators/content-pages";
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
  ownerOnlyProcedure,
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

/**
 * The transactional body of `bulkSetPublished`, pulled out into a standalone
 * exported function so its `count` derivation is unit-testable against a
 * mocked `tx` (see `content.test.ts`) without a real database.
 *
 * `changedIds` is the rows this call will actually FLIP, captured before the
 * write, and it is what the table's Undo re-sends. Re-sending the whole
 * selection with `published` inverted is not an inverse: a selection of 50
 * containing 20 already-published rows publishes all 50, then "Undo"
 * unpublishes all 50 — including the ones the user never touched. The client
 * cannot narrow it either (a selection spans pages, and off-page rows'
 * `published` state never reached the browser).
 *
 * `count` — the number the toast and the `data.count < requested` shortfall
 * check (page-list-client.tsx) both read — is ALWAYS derived from this same
 * pre-write `changed` read, never from summing `updateMany` results. For the
 * `published: true` branch that distinction is load-bearing, not cosmetic:
 * publishing partitions the selection into two `updateMany`s (below) because
 * a single `updateMany` can't set `publishedAt` conditionally per row. Both
 * run over the same interactive-transaction connection, so by the time the
 * SECOND one's `publishedAt: { not: null }` filter is evaluated, rows the
 * FIRST one just stamped a `publishedAt` onto already satisfy it too — it
 * re-matches (and harmlessly re-writes, but also RE-COUNTS) every
 * never-published row the first `updateMany` just flipped. Summing the two
 * results doubled `count` for exactly that overlap: publishing 3 fresh drafts
 * reported `count: 6`. Reading `count` off `changedIds.length` instead sides
 * with the number Undo actually operates on, which is also the number that
 * is true regardless of how the write happens to be partitioned internally.
 */
export async function runBulkSetPublished(
  tx: Pick<TxClient, "page">,
  params: {
    ids: string[];
    businessId: string;
    published: boolean;
    now: Date;
  },
): Promise<{ changedIds: string[]; count: number }> {
  const { ids, businessId, published, now } = params;

  const changed = await tx.page.findMany({
    where: {
      id: { in: ids },
      businessId,
      published: { not: published },
    },
    select: { id: true },
  });
  const changedIds = changed.map((p) => p.id);

  if (published) {
    // Publishing means the same thing here as everywhere else that publishes
    // a Page — the cron sweep (src/app/api/cron/route.ts) and both editors'
    // `published ? null : …`:
    //   - a pending `scheduledPublishAt` is superseded and cleared, or an
    //     Unpublish later would flip the row back to "Scheduled" and the
    //     cron would silently re-publish it;
    //   - a row that has never been published gets a `publishedAt`, so the
    //     storefront's `publishedAt ?? createdAt` coalesce shows the real
    //     publish date rather than the authoring date.
    // Split in two, like the cron, because `updateMany` cannot set a column
    // conditionally per row. Their RESULT COUNTS are intentionally unused —
    // see the docblock above for why summing them double-counts.
    await Promise.all([
      tx.page.updateMany({
        where: { id: { in: ids }, businessId, publishedAt: null },
        data: {
          published: true,
          publishedAt: now,
          scheduledPublishAt: null,
        },
      }),
      tx.page.updateMany({
        where: {
          id: { in: ids },
          businessId,
          publishedAt: { not: null },
        },
        data: { published: true, scheduledPublishAt: null },
      }),
    ]);
  } else {
    // Unpublishing touches `published` and nothing else. `publishedAt` is
    // kept (it is the date this page WAS published, which re-publishing
    // should not rewrite) and `scheduledPublishAt` is left alone — the
    // update runs over every selected id, including rows that were already
    // unpublished, so clearing it here would silently cancel a pending
    // schedule on a row this action didn't change.
    await tx.page.updateMany({
      where: { id: { in: ids }, businessId },
      data: { published },
    });
  }

  return { changedIds, count: changedIds.length };
}

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

    // A cleared draft can come back as `{}` instead of JSON null (see
    // `isPreviewDraft`) — normalize it to "no draft" so the editor doesn't
    // hydrate a phantom unpublished-changes state.
    const draft = siteContent?.previewCustomFields;
    return {
      customFields: (siteContent?.customFields ?? {}) as Record<
        string,
        unknown
      >,
      previewCustomFields: isPreviewDraft(draft) ? draft : null,
      previewUpdatedAt: siteContent?.previewUpdatedAt ?? null,
      hasDraft: isPreviewDraft(draft),
    };
  }),

  // Update site content
  updateSiteContent: ownerAdminProcedure
    .input(siteContentSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      // No `templateId` here on purpose — see the note on `siteContentSchema`.
      // Template switches must go through `business.updateTemplate`, which
      // enforces per-subdomain ownership of commercial templates.
      const { clearPreviewDraft, publishCmsPageDrafts, ...data } = input;

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

            // `{ previewDraft: { not: Prisma.DbNull } }` looks like the right
            // filter here, but it silently fails to match a `{}` residue row
            // (see `isPreviewDraft`) — so a stuck `{}` could never be healed
            // by a Publish either. Select id + previewDraft for the whole
            // business instead (cheap — page counts are small) and decide in
            // JS what each row is.
            const drafts = await tx.page.findMany({
              where: { businessId },
              select: { id: true, previewDraft: true },
            });

            for (const p of drafts) {
              if (p.previewDraft === null) continue;

              if (!isPreviewDraft(p.previewDraft)) {
                // `{}` residue is not a real draft, but publish clears it
                // anyway (a harmless heal) so the editor's "Unpublished
                // changes" pill can't stay stuck lit on a page nobody
                // actually edited after a Publish.
                await tx.page.update({
                  where: { id: p.id },
                  data: {
                    previewDraft: Prisma.DbNull,
                    previewDraftUpdatedAt: null,
                  },
                });
                continue;
              }

              const parsed = cmsPageDraftValueSchema.safeParse(p.previewDraft);
              // Skip a malformed (but non-empty) draft silently — a bad row
              // must not fail the whole publish, and unlike `{}` residue we
              // don't know it's safe to discard.
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

      return {
        data: siteContent,
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

    await ctx.db.$transaction(async (tx) => {
      await tx.siteContent.updateMany({
        where: { businessId },
        data: {
          previewCustomFields: Prisma.JsonNull,
          previewUpdatedAt: null,
        },
      });

      // `{ previewDraft: { not: Prisma.DbNull } }` looks like the right
      // filter here too, but it silently fails to match a `{}` residue row
      // (see `isPreviewDraft`) — so that row could never be cleared, and
      // `getEditorPages`'s "Unpublished changes" pill would stay lit forever.
      // Select id + previewDraft for the whole business instead (cheap —
      // page counts are small) and filter in JS. Unlike the publish path
      // above, discard clears BOTH real drafts and `{}` residue — it never
      // inspects a draft's content, so there is no distinction worth
      // preserving; anything non-null is scrubbed.
      const candidates = await tx.page.findMany({
        where: { businessId },
        select: { id: true, previewDraft: true },
      });
      const idsToClear = candidates
        .filter((p) => p.previewDraft !== null)
        .map((p) => p.id);

      if (idsToClear.length > 0) {
        await tx.page.updateMany({
          where: { id: { in: idsToClear } },
          data: {
            previewDraft: Prisma.DbNull,
            previewDraftUpdatedAt: null,
          },
        });
      }
    });

    return { ok: true };
  }),

  // ==========================================
  // PAGES
  // ==========================================

  /**
   * The list feed behind three admin surfaces: the Site Content hub dashboard
   * (`/admin/content`, no `type` — every row), the CMS Pages list
   * (`type: "page"`) and the Blog list (`type: "blog"`). All three narrow,
   * sort and paginate in memory via `buildTablePage`, so this stays input-free
   * apart from the type discriminator.
   *
   * Deliberately NOT feature-gated. It serves the ungated content hub as well
   * as the blog list, so a `featureGate("blog")` would 403 the hub for any
   * business with the blog flag off — the `baseInventoryUnit.list` situation
   * exactly. `/admin/content/blog/layout.tsx` is the blog gate.
   */
  getPages: ownerAdminProcedure
    .input(
      z
        .object({
          type: z.enum(["page", "policy", "blog", "custom", "all"]).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const { businessId } = ctx;

      // Explicit select = the list row contract, and the leak guard for the
      // visual-editor draft columns in one: `previewDraft` /
      // `previewDraftUpdatedAt` are never read at all here, which is stronger
      // than the destructuring strip this replaced (that one still pulled the
      // drafts out of Postgres and into the server's memory first).
      //
      // `content` in particular is gone: it is the page's entire TipTap
      // document, and shipping every page's body into an RSC payload for a
      // table that renders a title and a slug is the payload-discipline
      // failure docs/admin-table-migration.md §6 calls out. The editors read it
      // through `getPageById`.
      //   - id, title, slug: identity, link target and a search field
      //   - excerpt: rendered under the title, and the third search field
      //   - image: table thumbnail
      //   - type: the hub dashboard's per-type counts and badges
      //   - published, scheduledPublishAt: feed `getPageStatus`
      //   - publishedAt: the blog list's Published column + its two date sorts
      //   - createdAt, updatedAt: the Updated column and the newest/oldest sorts
      // `metaTitle`/`metaDescription`/`metaKeywords`/`ogImage`/`template`/
      // `sortOrder` are excluded — nothing in any of the three surfaces renders
      // or sorts on them.
      return ctx.db.page.findMany({
        where: {
          businessId,
          ...(input?.type && input?.type !== "all"
            ? { type: input?.type }
            : {}),
        },
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          image: true,
          type: true,
          published: true,
          publishedAt: true,
          scheduledPublishAt: true,
          createdAt: true,
          updatedAt: true,
        },
        // Transport order only — both list pages re-sort by their own sort
        // param. It still decides the hub dashboard's "Recent Pages" strip,
        // which takes the first five, so it is left exactly as it was; the
        // `id` tie-break is new, and only makes that strip deterministic when
        // rows share a `sortOrder` and a `createdAt` (routine — every row
        // created before a reorder shares the create path's default).
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }, { id: "asc" }],
      });
    }),

  /**
   * Bulk publish/unpublish for both admin Page lists (CMS pages and blog
   * posts), shared because they are one model.
   *
   * `ownerAdminProcedure` and deliberately **ungated**, for the same reason as
   * `getPages` above plus the Reviews precedent (docs/admin-table-migration.md
   * §11): one procedure serves a list that is blog-gated and a list that is
   * not, so any single gate would be wrong for the other, and an owner who has
   * just switched the blog off should still be able to unpublish the posts it
   * left on their storefront. Route-level gating (`content/blog/layout.tsx`)
   * is the blog enforcement.
   */
  bulkSetPublished: ownerAdminProcedure
    .input(pageBulkPublishSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const now = new Date();

      const { changedIds, count } = await ctx.db.$transaction((tx) =>
        runBulkSetPublished(tx, {
          ids: input.ids,
          businessId,
          published: input.published,
          now,
        }),
      );

      return {
        count,
        changedIds,
        message: `${count} page${count === 1 ? "" : "s"} updated`,
      };
    }),

  /**
   * OWNER only, unlike `bulkSetPublished` above. Not a statement about
   * trusting managers — it's blast radius. Publish/unpublish is reversible in
   * one click (and Undo-able); deleting N pages is unrecoverable without a
   * database restore, and every deleted row takes its storefront URL down
   * immediately. Same reason the schema's delete cap
   * (ADMIN_BULK_DELETE_LIMIT) sits far below the selection cap.
   *
   * No S3 cleanup: `Page.image` lives in the media library independently of
   * the page row, so deleting a page must not delete the file.
   */
  bulkDelete: ownerOnlyProcedure
    .input(pageBulkDeleteSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      const result = await ctx.db.page.deleteMany({
        where: { id: { in: input.ids }, businessId },
      });

      return {
        count: result.count,
        message: `${result.count} page${result.count === 1 ? "" : "s"} deleted`,
      };
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

    return pages.map((p) => {
      // A cleared draft can come back as `{}` instead of JSON null (see
      // `isPreviewDraft`) — normalize it to "no draft" the same way
      // `getEditorState` does for `SiteContent.previewCustomFields`, or a
      // `{}` row reports `hasDraft: true` here even after discard/publish
      // have healed it elsewhere, and the editor's `draft ?? live` resolves
      // to `{}`, crashing the CMS page panel on missing fields.
      const draft = isPreviewDraft(p.previewDraft) ? p.previewDraft : null;
      return {
        id: p.id,
        slug: p.slug,
        type: p.type as "page" | "blog",
        published: p.published,
        live: { title: p.title, excerpt: p.excerpt, content: p.content },
        draft: draft as {
          title: string;
          excerpt: string | null;
          content: unknown;
        } | null,
        hasDraft: draft !== null,
      };
    });
  }),

  /**
   * A representative product for the visual editor's "Product" page preview —
   * the newest published product, or `null` when the business has none (or the
   * `products` feature is off, in which case the editor hides the entry
   * entirely). Flags resolve off the session-scoped business rather than
   * `getBusinessFlags()` for the same reason as `getEditorPages` above.
   */
  getEditorProductPreview: ownerAdminProcedure.query(async ({ ctx }) => {
    const { businessId } = ctx;

    const flagRow = await ctx.db.business.findUnique({
      where: { id: businessId },
      select: { featureFlags: true },
    });
    if (!resolveFlags(flagRow?.featureFlags).isEnabled("products")) return null;

    const product = await ctx.db.product.findFirst({
      where: { businessId, published: true },
      orderBy: { createdAt: "desc" },
      select: { slug: true, name: true },
    });

    return product ?? null;
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
      const safe = (({
        previewDraft: _pd,
        previewDraftUpdatedAt: _pu,
        ...rest
      }) => rest)(page);

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
      const safe = (({
        previewDraft: _pd,
        previewDraftUpdatedAt: _pu,
        ...rest
      }) => rest)(page);

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

  // `reorderPages` used to sit here. It had zero callers anywhere in `src/` —
  // no admin surface has ever offered drag-reordering for pages — and a bulk
  // `sortOrder` writer with no UI is a hazard the moment either Page list
  // gains pagination (docs/admin-table-migration.md §7: reorder and pagination
  // are mutually exclusive). Removed during the Page-list migration, the same
  // way `events.reorder` was. `Page.sortOrder` itself stays: it is assigned at
  // create time and still orders `getSimplifiedPages` (nav menus) and
  // `getBlogPages`.

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
