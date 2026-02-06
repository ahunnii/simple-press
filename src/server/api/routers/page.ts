import type { Page } from "generated/prisma";
import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

export const pageRouter = createTRPCRouter({
  getById: publicProcedure
    .input(z.string())
    .query(async ({ ctx, input: id }) => {
      const page = await ctx.db.page.findUnique({
        where: { id },
        include: { club: true },
      });
      return page;
    }),

  getAll: publicProcedure.query(async ({ ctx }) => {
    const pages = await ctx.db.page.findMany({
      include: { club: true },
      orderBy: { updatedAt: "desc" },
    });
    return pages as (Page & { club: { id: string; name: string } })[];
  }),

  create: protectedProcedure
    .input(
      z.object({
        clubId: z.string().min(1),
        slug: z.string().min(1),
        title: z.string().min(1),
        content: z.record(z.string(), z.unknown()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const page = await ctx.db.page.create({
        data: {
          clubId: input.clubId,
          slug: input.slug,
          title: input.title,
          content: input.content as object,
        },
      });
      return {
        data: page,
        message: "Page created successfully",
      };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        slug: z.string().min(1),
        title: z.string().min(1),
        content: z.record(z.string(), z.unknown()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const page = await ctx.db.page.update({
        where: { id: input.id },
        data: {
          slug: input.slug,
          title: input.title,
          content: input.content as object,
        },
      });
      return {
        data: page,
        message: "Page updated successfully",
      };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.page.delete({
        where: { id: input.id },
      });
      return { message: "Page deleted successfully" };
    }),
});
