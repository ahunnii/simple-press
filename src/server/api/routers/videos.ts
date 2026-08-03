import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { publishedVideoWhere } from "~/lib/youtube/query";
import { fetchVideoOembed } from "~/lib/youtube/oembed";
import { parseSourceInput, parseYouTubeVideoId } from "~/lib/youtube/parse";
import { resolveChannelHandle } from "~/lib/youtube/resolve-channel";
import { syncOneSource } from "~/lib/youtube/sync";
import {
  videoCreateSchema,
  videoReorderSchema,
  videoSourceCreateSchema,
  videoSourceUpdateSchema,
  videoUpdateSchema,
} from "~/lib/validators/videos";
import {
  createTRPCRouter,
  featureGate,
  getBusinessProcedure,
  ownerAdminProcedure,
  publicProcedure,
} from "~/server/api/trpc";

/** Prisma's unique-constraint-violation error code. */
const P2002_UNIQUE_CONSTRAINT = "P2002";

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === P2002_UNIQUE_CONSTRAINT
  );
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
      return ctx.db.video.findMany({
        where: { businessId },
        orderBy: [{ sortOrder: "asc" }, { publishedAt: "desc" }],
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
        data: updates,
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
        data: updates,
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
        orderBy: [
          { sortOrder: "asc" },
          { publishedAt: "desc" },
          { id: "asc" },
        ],
        ...(input?.limit ? { take: input.limit } : {}),
      });
    }),
});
