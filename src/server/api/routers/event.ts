import type { Event } from "generated/prisma";
import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

export const eventRouter = createTRPCRouter({
  getById: publicProcedure
    .input(z.string())
    .query(async ({ ctx, input: id }) => {
      const event = await ctx.db.event.findUnique({
        where: { id },
        include: { club: true },
      });
      return event;
    }),

  getAll: publicProcedure.query(async ({ ctx }) => {
    const events = await ctx.db.event.findMany({
      include: { club: true },
      orderBy: { startTime: "desc" },
    });
    return events as (Event & { club: { id: string; name: string } })[];
  }),

  getUpcoming: publicProcedure.query(async ({ ctx }) => {
    const events = await ctx.db.event.findMany({
      include: { club: true },
      where: { startTime: { gte: new Date() } },
      orderBy: { startTime: "asc" },
      take: 3,
    });
    return events as (Event & { club: { id: string; name: string } })[];
  }),

  create: protectedProcedure
    .input(
      z.object({
        clubId: z.string().min(1),
        name: z.string().min(1),
        startTime: z.coerce.date(),
        endTime: z.coerce.date(),
        description: z.string().optional(),
        mediaUrl: z.string().optional(),
        isPublic: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const event = await ctx.db.event.create({
        data: {
          clubId: input.clubId,
          name: input.name,
          startTime: input.startTime,
          endTime: input.endTime,
          description: input.description,
          mediaUrl: input.mediaUrl,
          isPublic: input.isPublic,
        },
      });
      return {
        data: event,
        message: "Event created successfully",
      };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1),
        startTime: z.coerce.date(),
        endTime: z.coerce.date(),
        description: z.string().optional(),
        mediaUrl: z.string().optional(),
        isPublic: z.boolean(),
        location: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const event = await ctx.db.event.update({
        where: { id: input.id },
        data: {
          name: input.name,
          startTime: input.startTime,
          endTime: input.endTime,
          description: input.description,
          mediaUrl: input.mediaUrl,
          isPublic: input.isPublic,
          location: input.location,
        },
      });
      return {
        data: event,
        message: "Event updated successfully",
      };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.event.delete({
        where: { id: input.id },
      });
      return { message: "Event deleted successfully" };
    }),
});
