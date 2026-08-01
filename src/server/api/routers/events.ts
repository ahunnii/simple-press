import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { DbClient } from "~/server/db";
import { normalizeEventDates } from "~/lib/events/normalize";
import { upcomingEventWhere } from "~/lib/events/query";
import {
  eventArchiveSchema,
  eventCreateSchema,
  eventReorderSchema,
  eventUpdateSchema,
} from "~/lib/validators/events";
import {
  createTRPCRouter,
  featureGate,
  getBusinessProcedure,
  ownerAdminProcedure,
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
      // Everything is returned unfiltered — the admin client splits it into
      // Upcoming/Past tabs itself (see pastEventWhere/upcomingEventWhere for
      // the storefront-facing equivalents of that split).
      return ctx.db.event.findMany({
        where: { businessId },
        orderBy: [{ startAt: "asc" }, { sortOrder: "asc" }],
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

  reorder: ownerAdminProcedure
    .use(featureGate("events"))
    .input(eventReorderSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      await ctx.db.$transaction(
        input.ids.map((id, index) =>
          ctx.db.event.update({
            where: { id, businessId },
            data: { sortOrder: index },
          }),
        ),
      );

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
