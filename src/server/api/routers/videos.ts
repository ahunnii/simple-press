import { Prisma } from "generated/prisma";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { PublishRules } from "~/lib/youtube/publish-rules";
import { isUniqueConstraintError } from "~/lib/prisma-errors";
import {
  parseStoredPublishRules,
  videoCreateSchema,
  videoReorderSchema,
  videoSourceCreateSchema,
  videoSourceUpdateSchema,
  videoUpdateSchema,
} from "~/lib/validators/videos";
import { fetchVideoOembed } from "~/lib/youtube/oembed";
import { parseSourceInput, parseYouTubeVideoId } from "~/lib/youtube/parse";
import { evaluatePublishRules, hasAnyRule } from "~/lib/youtube/publish-rules";
import { publishedVideoWhere } from "~/lib/youtube/query";
import { resolveChannelHandle } from "~/lib/youtube/resolve-channel";
import { syncOneSource } from "~/lib/youtube/sync";
import {
  createTRPCRouter,
  featureGate,
  getBusinessProcedure,
  ownerAdminProcedure,
  publicProcedure,
} from "~/server/api/trpc";

/**
 * Normalizes an incoming `publishRules` value to Prisma's update semantics
 * for the `Json?` column:
 *
 *   undefined                     → undefined  (key omitted — leave alone)
 *   null / empty rule set         → Prisma.DbNull  (write NULL)
 *   a rule set with any clause    → the object itself
 *
 * Plain `null` is a Prisma RUNTIME error for a `Json?` field — Prisma only
 * accepts `Prisma.DbNull`/`Prisma.JsonNull` there, not the JS literal — so
 * this can't be `?? null` like the string-override fields in
 * `~/lib/validators/videos`. An all-empty parsed rule set (every clause
 * cleared in the admin form) is collapsed to NULL too, per the `"none"` state
 * in `parseStoredPublishRules` — a saved-then-cleared rule set must read back
 * identically to a column that was never touched.
 */
function toPublishRulesWrite(
  value: PublishRules | null | undefined,
): Prisma.InputJsonValue | typeof Prisma.DbNull | undefined {
  if (value === undefined) return undefined;
  if (value === null || !hasAnyRule(value)) return Prisma.DbNull;
  return value;
}

export const videosRouter = createTRPCRouter({
  // ─── Admin: read ────────────────────────────────────────────────────────────

  getAll: ownerAdminProcedure
    .use(featureGate("videos"))
    .query(async ({ ctx }) => {
      const { businessId } = ctx;
      // Everything is returned unfiltered — the admin client splits
      // published/draft itself (see publishedVideoWhere for the
      // storefront-facing equivalent of that split).
      //
      // `select` here is deliberate: the admin list page is `getAll`'s only
      // consumer (verified), and this drops both `@db.Text` description
      // columns (`description`, `descriptionOverride`) from the RSC
      // payload — the edit form fetches the full row via `getById`. The
      // trailing `{ id: "asc" }` tie-break matches the platform's
      // stable-order rule (see `getPublic` below, which uses the same
      // three-key order).
      return ctx.db.video.findMany({
        where: { businessId },
        select: {
          id: true,
          youtubeId: true,
          title: true,
          titleOverride: true,
          thumbnailUrl: true,
          thumbnailOverride: true,
          channelTitle: true,
          publishedAt: true,
          published: true,
          hiddenByRule: true,
          sortOrder: true,
          sourceId: true,
        },
        orderBy: [{ sortOrder: "asc" }, { publishedAt: "desc" }, { id: "asc" }],
      });
    }),

  getById: ownerAdminProcedure
    .use(featureGate("videos"))
    .input(z.string())
    .query(async ({ ctx, input: id }) => {
      const { businessId } = ctx;
      const video = await ctx.db.video.findUnique({
        where: { id, businessId },
      });

      if (!video) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Video not found" });
      }

      return video;
    }),

  listSources: ownerAdminProcedure
    .use(featureGate("videos"))
    .query(async ({ ctx }) => {
      const { businessId } = ctx;
      return ctx.db.videoSource.findMany({
        where: { businessId },
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { videos: true } } },
      });
    }),

  // ─── Admin: write ───────────────────────────────────────────────────────────

  create: ownerAdminProcedure
    .use(featureGate("videos"))
    .input(videoCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      const youtubeId = parseYouTubeVideoId(input.url);
      if (!youtubeId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Enter a valid YouTube video URL",
        });
      }

      const oembed = await fetchVideoOembed(youtubeId);
      if (!oembed) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "That video could not be found — it may be private, deleted, or age-restricted.",
        });
      }

      const maxSort = await ctx.db.video.findFirst({
        where: { businessId },
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      });

      try {
        return await ctx.db.video.create({
          data: {
            businessId,
            youtubeId,
            title: oembed.title,
            channelTitle: oembed.authorName,
            thumbnailUrl: oembed.thumbnailUrl,
            // oEmbed carries no upload date, so we stamp "now" as a
            // placeholder. If this video also arrives later via a feed
            // sync, the sync's upsert overwrites `publishedAt` with
            // YouTube's real upload date (publishedAt is sync-owned — see
            // the Video model comment in schema.prisma).
            publishedAt: new Date(),
            sourceId: null, // null marks this a manual add, not synced
            published: true,
            sortOrder: (maxSort?.sortOrder ?? 0) + 1,
          },
        });
      } catch (error) {
        if (isUniqueConstraintError(error)) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "This video has already been added.",
          });
        }
        throw error;
      }
    }),

  update: ownerAdminProcedure
    .use(featureGate("videos"))
    .input(videoUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const { id, ...updates } = input;

      const existing = await ctx.db.video.findUnique({
        where: { id, businessId },
        select: { id: true },
      });

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Video not found" });
      }

      return ctx.db.video.update({
        where: { id },
        // Publishing by hand clears the "Hidden by rule" badge — see the
        // `hiddenByRule` docblock on the Video model in schema.prisma.
        // Manually UNpublishing does NOT set it: `hiddenByRule` means
        // specifically "the sync rules rejected this at insert", not "not
        // currently published".
        data: {
          ...updates,
          ...(updates.published === true ? { hiddenByRule: false } : {}),
        },
      });
    }),

  delete: ownerAdminProcedure
    .use(featureGate("videos"))
    .input(z.string())
    .mutation(async ({ ctx, input: id }) => {
      const { businessId } = ctx;

      const existing = await ctx.db.video.findUnique({
        where: { id, businessId },
        select: { id: true },
      });

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Video not found" });
      }

      await ctx.db.video.delete({ where: { id, businessId } });
      return { success: true };
    }),

  reorder: ownerAdminProcedure
    .use(featureGate("videos"))
    .input(videoReorderSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      await ctx.db.$transaction(
        input.ids.map((id, index) =>
          ctx.db.video.update({
            where: { id, businessId },
            data: { sortOrder: index },
          }),
        ),
      );

      return { success: true };
    }),

  createSource: ownerAdminProcedure
    .use(featureGate("videos"))
    .input(videoSourceCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      const ref = parseSourceInput(input.input);
      if (!ref) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Enter a valid YouTube channel or playlist URL",
        });
      }

      let kind: "channel" | "playlist";
      let externalId: string;

      if (ref.kind === "handle") {
        const resolved = await resolveChannelHandle(ref.handle);
        if (!resolved) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "We couldn't resolve that channel handle. Paste the channel ID instead — find it in YouTube Studio → Settings → Channel → Advanced.",
          });
        }
        kind = "channel";
        externalId = resolved;
      } else {
        kind = ref.kind;
        externalId = ref.externalId;
      }

      try {
        return await ctx.db.videoSource.create({
          data: {
            businessId,
            kind,
            externalId,
            label: input.label,
            autoPublish: input.autoPublish,
            publishRules: toPublishRulesWrite(input.publishRules),
          },
        });
      } catch (error) {
        if (isUniqueConstraintError(error)) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "This channel or playlist has already been added.",
          });
        }
        throw error;
      }
    }),

  updateSource: ownerAdminProcedure
    .use(featureGate("videos"))
    .input(videoSourceUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const { id, ...updates } = input;

      const existing = await ctx.db.videoSource.findUnique({
        where: { id, businessId },
        select: { id: true },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Source not found",
        });
      }

      return ctx.db.videoSource.update({
        where: { id },
        data: {
          ...updates,
          publishRules: toPublishRulesWrite(updates.publishRules),
        },
      });
    }),

  deleteSource: ownerAdminProcedure
    .use(featureGate("videos"))
    .input(z.string())
    .mutation(async ({ ctx, input: id }) => {
      const { businessId } = ctx;

      const existing = await ctx.db.videoSource.findUnique({
        where: { id, businessId },
        select: { id: true },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Source not found",
        });
      }

      // Deleting a source does NOT delete its videos — the FK is
      // `ON DELETE SET NULL`, demoting them to manual entries the owner can
      // keep or delete individually (see the Video model comment).
      await ctx.db.videoSource.delete({ where: { id, businessId } });
      return { success: true };
    }),

  syncNow: ownerAdminProcedure
    .use(featureGate("videos"))
    .input(z.string())
    .mutation(async ({ ctx, input: id }) => {
      const { businessId } = ctx;

      const existing = await ctx.db.videoSource.findUnique({
        where: { id, businessId },
        select: { id: true },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Source not found",
        });
      }

      try {
        return await syncOneSource(ctx.db, id);
      } catch (error) {
        // `syncOneSource` throws for (a) source-not-found — belt-and-braces,
        // already ruled out by the businessId-scoped check above — and (b)
        // feed/sync failures (network error, bad feed, unknown source kind).
        // It has already written a truncated message to the source's
        // `lastSyncError` column before throwing, so the admin page can show
        // the detail inline. A flaky external feed is a routine, expected
        // outcome of polling YouTube (same reasoning `resolveChannelHandle`
        // uses to skip Sentry), not a bug in our code, so we deliberately
        // use BAD_REQUEST rather than INTERNAL_SERVER_ERROR — the tRPC
        // onError handler only reports INTERNAL_SERVER_ERROR to Sentry, and
        // we don't want every transient feed hiccup paging anyone.
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            error instanceof Error
              ? `Sync failed: ${error.message}`
              : "Sync failed. See the source's error details.",
        });
      }
    }),

  /**
   * Re-evaluates a source's CURRENT `publishRules` against its EXISTING
   * videos and flips `published`/`hiddenByRule` to match — the owner just
   * edited a rule set and wants it applied retroactively, not only to future
   * syncs. Manual adds (`sourceId: null`) and videos on other sources are
   * never touched (the `where` below is scoped to `source.id`).
   *
   * Deliberately the ONE place other than insert-time sync that writes
   * `published`/`hiddenByRule` from rule evaluation — everywhere else,
   * "rules only act at insert" (see the VideoSource model comment in
   * schema.prisma). This is safe specifically because it's owner-triggered
   * (the owner clicks a button after editing rules, sees a dry-run preview
   * first), not something sync does silently on a timer. It sets `published`
   * from the verdict alone, independent of `autoPublish` — the admin UI
   * hides this action entirely when the source has no rules configured.
   */
  reapplyRules: ownerAdminProcedure
    .use(featureGate("videos"))
    .input(
      z.object({ sourceId: z.string(), dryRun: z.boolean().default(false) }),
    )
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      const source = await ctx.db.videoSource.findUnique({
        where: { id: input.sourceId, businessId },
        select: {
          id: true,
          publishRules: true,
          business: { select: { timeZone: true } },
        },
      });

      if (!source) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Source not found" });
      }

      const stored = parseStoredPublishRules(source.publishRules);
      if (stored.kind === "invalid") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "This source's publish rules could not be read — open Rules and save them again.",
        });
      }
      const rules = stored.kind === "rules" ? stored.rules : null;
      const timeZone = source.business.timeZone;

      const videos = await ctx.db.video.findMany({
        where: { businessId, sourceId: source.id },
        select: {
          id: true,
          title: true,
          publishedAt: true,
          published: true,
          hiddenByRule: true,
        },
      });

      const toPublish: string[] = [];
      const toHide: string[] = [];

      for (const v of videos) {
        // Evaluated against YouTube's own `title` — never `titleOverride` —
        // per the doctrine in `~/lib/youtube/publish-rules`: a rule describes
        // what the creator actually uploads, not what this app displays it as.
        const { publish } = evaluatePublishRules(
          rules,
          { title: v.title, publishedAt: v.publishedAt },
          { timeZone },
        );

        if (publish && (!v.published || v.hiddenByRule)) {
          toPublish.push(v.id);
        } else if (!publish && (v.published || !v.hiddenByRule)) {
          toHide.push(v.id);
        }
      }

      const counts = {
        total: videos.length,
        published: toPublish.length,
        hidden: toHide.length,
        unchanged: videos.length - toPublish.length - toHide.length,
      };

      if (input.dryRun) return counts;

      await ctx.db.$transaction([
        ctx.db.video.updateMany({
          where: { id: { in: toPublish }, businessId },
          data: { published: true, hiddenByRule: false },
        }),
        ctx.db.video.updateMany({
          where: { id: { in: toHide }, businessId },
          data: { published: false, hiddenByRule: true },
        }),
      ]);

      return counts;
    }),

  // ─── Public: storefront reads ────────────────────────────────────────────────

  getPublic: publicProcedure
    .use(getBusinessProcedure())
    .use(featureGate("videos"))
    .input(
      z
        .object({ limit: z.number().int().min(1).max(50).optional() })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const { businessId } = ctx;

      return ctx.db.video.findMany({
        where: publishedVideoWhere(businessId),
        orderBy: [{ sortOrder: "asc" }, { publishedAt: "desc" }, { id: "asc" }],
        ...(input?.limit ? { take: input.limit } : {}),
      });
    }),
});
