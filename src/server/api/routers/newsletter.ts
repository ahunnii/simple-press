import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

export const newsletterRouter = createTRPCRouter({
  getById: publicProcedure
    .input(z.string())
    .query(async ({ ctx, input: id }) => {
      const newsletter = await ctx.db.newsletter.findUnique({
        where: { id },
      });
      return newsletter;
    }),

  getAll: publicProcedure.query(async ({ ctx }) => {
    const newsletters = await ctx.db.newsletter.findMany({
      orderBy: { updatedAt: "desc" },
    });
    return newsletters;
  }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        content: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const newsletter = await ctx.db.newsletter.create({
        data: {
          title: input.title,
          content: input.content,
        },
      });
      return {
        data: newsletter,
        message: "Newsletter created successfully",
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
      const newsletter = await ctx.db.newsletter.update({
        where: { id: input.id },
        data: {
          title: input.title,
          content: input.content,
        },
      });
      return {
        data: newsletter,
        message: "Newsletter updated successfully",
      };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.newsletter.delete({
        where: { id: input.id },
      });
      return { message: "Newsletter deleted successfully" };
    }),
});
