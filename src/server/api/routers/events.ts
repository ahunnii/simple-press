import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { DbClient } from "~/server/db";
import { normalizeEventDates } from "~/lib/events/normalize";
import { upcomingEventWhere } from "~/lib/events/query";
import {
  eventArchiveSchema,
  eventBulkArchiveSchema,
  eventBulkDeleteSchema,
  eventBulkPublishSchema,
  eventCreateSchema,
  eventUpdateSchema,
} from "~/lib/validators/events";
import {
  createTRPCRouter,
  featureGate,
  getBusinessProcedure,
  ownerAdminProcedure,
  ownerOnlyProcedure,
  publicProcedure,
} from "~/server/api/trpc";

/** Matches `Business.timeZone`'s column default in schema.prisma. */
const DEFAULT_TIME_ZONE = "America/Detroit";

/**
 * `create`/`update` normalize the admin form's wall-clock strings in the
 * shop's own zone, not the server's — "2026-08-15T19:00" is a different UTC
 * instant in America/Detroit than in America/Los_Angeles, and the shop's zone
 * is the authority on which one the owner meant. The fallback only matters if
 * a row somehow lacks a value; the column itself is non-null with a default.
 */
async function resolveTimeZone(
  db: DbClient,
  businessId: string,
): Promise<string> {
  const business = await db.business.findUnique({
    where: { id: businessId },
    select: { timeZone: true },
  });
  return business?.timeZone ?? DEFAULT_TIME_ZONE;
}

export const eventsRouter = createTRPCRouter({
  // ─── Admin: read ────────────────────────────────────────────────────────────

  getAll: ownerAdminProcedure
    .use(featureGate("events"))
    .query(async ({ ctx }) => {
      const { businessId } = ctx;
      // Input-free: the admin page filters (When/Status/search), sorts and
      // paginates in memory via `buildTablePage`, so the router just ships
      // the full tenant-scoped set. `orderBy` here is only a stable transport
      // order — the page re-sorts according to its own sort param.
      //
      // The `select` below is the admin table's row contract — exactly what
      // the columns, the mobile reflow line, search, and the When/Status
      // derivations (`getEventWhen`/`getEventStatus`/`eventCutoff` in
      // ~/lib/validators/events and ~/lib/events/format) need:
      //   - id, name: identity + link target
      //   - coverImage: table thumbnail
      //   - startAt, endAt, allDay: feed formatEventDate/eventCutoff and the
      //     When (upcoming/past) derivation
      //   - location: mobile reflow line + search field
      //   - published, isArchived: feed the Status derivation
      //   - createdAt: "newest"/"oldest" sort key
      // `blurb`, `externalUrl`, `externalUrlLabel`, `priceLabel`, and
      // `sortOrder` are deliberately excluded — nothing in the table renders
      // or sorts on them; the detail/edit form reads those through `getById`.
      return ctx.db.event.findMany({
        where: { businessId },
        select: {
          id: true,
          name: true,
          coverImage: true,
          startAt: true,
          endAt: true,
          allDay: true,
          location: true,
          published: true,
          isArchived: true,
          createdAt: true,
        },
        orderBy: { startAt: "asc" },
      });
    }),

  getById: ownerAdminProcedure
    .use(featureGate("events"))
    .input(z.string())
    .query(async ({ ctx, input: id }) => {
      const { businessId } = ctx;
      const event = await ctx.db.event.findUnique({
        where: { id, businessId },
      });

      if (!event) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" });
      }

      return event;
    }),

  // ─── Admin: write ───────────────────────────────────────────────────────────

  create: ownerAdminProcedure
    .use(featureGate("events"))
    .input(eventCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const timeZone = await resolveTimeZone(ctx.db, businessId);
      const { startAt, endAt } = normalizeEventDates(input, timeZone);

      const maxSort = await ctx.db.event.findFirst({
        where: { businessId },
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      });

      return ctx.db.event.create({
        data: {
          businessId,
          name: input.name,
          blurb: input.blurb,
          coverImage: input.coverImage,
          startAt,
          endAt,
          allDay: input.allDay,
          location: input.location,
          externalUrl: input.externalUrl,
          externalUrlLabel: input.externalUrlLabel,
          priceLabel: input.priceLabel,
          published: input.published,
          sortOrder: (maxSort?.sortOrder ?? 0) + 1,
        },
      });
    }),

  update: ownerAdminProcedure
    .use(featureGate("events"))
    .input(eventUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const { id, ...updates } = input;

      const existing = await ctx.db.event.findUnique({
        where: { id, businessId },
        select: { id: true },
      });

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" });
      }

      const timeZone = await resolveTimeZone(ctx.db, businessId);
      const { startAt, endAt } = normalizeEventDates(updates, timeZone);

      return ctx.db.event.update({
        where: { id },
        data: { ...updates, startAt, endAt },
      });
    }),

  delete: ownerAdminProcedure
    .use(featureGate("events"))
    .input(z.string())
    .mutation(async ({ ctx, input: id }) => {
      const { businessId } = ctx;

      const existing = await ctx.db.event.findUnique({
        where: { id, businessId },
        select: { id: true },
      });

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" });
      }

      await ctx.db.event.delete({ where: { id, businessId } });
      return { success: true };
    }),

  setArchived: ownerAdminProcedure
    .use(featureGate("events"))
    .input(eventArchiveSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const { id, isArchived } = input;

      const existing = await ctx.db.event.findUnique({
        where: { id, businessId },
        select: { id: true },
      });

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" });
      }

      return ctx.db.event.update({
        where: { id },
        data: { isArchived },
      });
    }),

  // ─── Admin: bulk mutations ──────────────────────────────────────────────────

  bulkSetPublished: ownerAdminProcedure
    .use(featureGate("events"))
    .input(eventBulkPublishSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      // `changedIds` is the rows this call will actually FLIP, captured before
      // the write, and it is what the table's Undo re-sends. Re-sending the
      // whole selection with `published` inverted is not an inverse: a
      // selection of 50 containing 20 already-published rows publishes all
      // 50, then "Undo" unpublishes all 50 — including the ones the user
      // never touched. The client can't narrow it either (a selection spans
      // pages, and off-page rows' `published` state never reached the
      // browser). One transaction so nothing can change between the read and
      // the update.
      const { changedIds, count } = await ctx.db.$transaction(async (tx) => {
        const changed = await tx.event.findMany({
          where: {
            id: { in: input.ids },
            businessId,
            published: { not: input.published },
          },
          select: { id: true },
        });

        const result = await tx.event.updateMany({
          where: { id: { in: input.ids }, businessId },
          data: { published: input.published },
        });

        return { changedIds: changed.map((e) => e.id), count: result.count };
      });

      return { count, changedIds };
    }),

  // Unarchiving a past-dated event is deliberately unguarded: the
  // platform-wide `archivePastEvents` cron sweep (src/lib/events/archive.ts)
  // will re-archive it within ~15 minutes regardless, so `isArchived` is
  // cosmetic here — the admin When column and the storefront both derive
  // "past"/"upcoming" from dates (`eventCutoff`/`getEventWhen`), never from
  // this flag. The per-row `setArchived` procedure above sets the same
  // precedent. Contrast Discounts' bulk Activate, which DOES skip expired
  // rows (`discount.bulkSetActive`) — there `active` has a real checkout
  // effect, so reactivating an expired code would be a dressed-up no-op.
  bulkSetArchived: ownerAdminProcedure
    .use(featureGate("events"))
    .input(eventBulkArchiveSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      // Same undo contract as `bulkSetPublished` above: `changedIds` is read
      // inside the transaction, before the write, and is the only valid Undo
      // target.
      const { changedIds, count } = await ctx.db.$transaction(async (tx) => {
        const changed = await tx.event.findMany({
          where: {
            id: { in: input.ids },
            businessId,
            isArchived: { not: input.isArchived },
          },
          select: { id: true },
        });

        const result = await tx.event.updateMany({
          where: { id: { in: input.ids }, businessId },
          data: { isArchived: input.isArchived },
        });

        return { changedIds: changed.map((e) => e.id), count: result.count };
      });

      return { count, changedIds };
    }),

  // OWNER only, unlike the two bulk toggles above. Not a statement about
  // trusting managers — it's blast radius. Publish/archive is reversible in
  // one click (and Undo-able); deleting N events is unrecoverable without a
  // database restore, and the deleted events disappear from the storefront
  // immediately. No S3 cleanup here — `coverImage` lives in the media library
  // independently of the event row, so deleting an event does not touch it.
  // Same reason the schema's delete cap (ADMIN_BULK_DELETE_LIMIT) sits far
  // below the selection cap the toggles use.
  bulkDelete: ownerOnlyProcedure
    .use(featureGate("events"))
    .input(eventBulkDeleteSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const result = await ctx.db.event.deleteMany({
        where: { id: { in: input.ids }, businessId },
      });
      return { count: result.count };
    }),

  // ─── Public: storefront reads ────────────────────────────────────────────────

  getUpcomingPublic: publicProcedure
    .use(getBusinessProcedure())
    .use(featureGate("events"))
    .input(
      z
        .object({ limit: z.number().int().min(1).max(50).optional() })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const { businessId } = ctx;

      return ctx.db.event.findMany({
        where: upcomingEventWhere(businessId, new Date()),
        orderBy: [{ startAt: "asc" }, { sortOrder: "asc" }, { id: "asc" }],
        ...(input?.limit ? { take: input.limit } : {}),
      });
    }),
});
