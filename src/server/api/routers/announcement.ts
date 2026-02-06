import type { Announcement } from "generated/prisma";
import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

export const announcementRouter = createTRPCRouter({
  getById: publicProcedure
    .input(z.string())
    .query(async ({ ctx, input: id }) => {
      const announcement = await ctx.db.announcement.findUnique({
        where: { id },
        include: { club: true },
      });
      return announcement;
    }),

  getAll: publicProcedure.query(async ({ ctx }) => {
    const announcements = await ctx.db.announcement.findMany({
      include: { club: true },
      orderBy: { updatedAt: "desc" },
    });
    return announcements as (Announcement & { club: { id: string; name: string } })[];
  }),

  create: protectedProcedure
    .input(
      z.object({
        clubId: z.string().min(1),
        title: z.string().min(1),
        content: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const announcement = await ctx.db.announcement.create({
        data: {
          clubId: input.clubId,
          title: input.title,
          content: input.content,
        },
      });
      return {
        data: announcement,
        message: "Announcement created successfully",
      };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1),
        content: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const announcement = await ctx.db.announcement.update({
        where: { id: input.id },
        data: {
          title: input.title,
          content: input.content,
        },
      });
      return {
        data: announcement,
        message: "Announcement updated successfully",
      };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.announcement.delete({
        where: { id: input.id },
      });
      return { message: "Announcement deleted successfully" };
    }),
});
