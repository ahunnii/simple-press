import { z } from "zod";

import { TRPCError } from "@trpc/server";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

export const siteContentRouter = createTRPCRouter({
  getAll: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.siteContent.findMany({
      orderBy: { key: "asc" },
    });
  }),

  getByKey: publicProcedure
    .input(z.string().min(1))
    .query(async ({ ctx, input: key }) => {
      return ctx.db.siteContent.findUnique({
        where: { key },
      });
    }),

  /** Fetch multiple keys in one query. Returns entries in arbitrary order; use the key to look up. */
  getByKeys: publicProcedure
    .input(z.object({ keys: z.array(z.string().min(1)) }))
    .query(async ({ ctx, input }) => {
      if (input.keys.length === 0) return [];
      return ctx.db.siteContent.findMany({
        where: { key: { in: input.keys } },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        key: z.string().min(1),
        value: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.siteContent.findUnique({
        where: { key: input.key },
      });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `A site content entry with key "${input.key}" already exists.`,
        });
      }
      const siteContent = await ctx.db.siteContent.create({
        data: {
          key: input.key,
          value: input.value,
        },
      });
      return {
        data: siteContent,
        message: "Site content created successfully",
      };
    }),

  update: protectedProcedure
    .input(
      z.object({
        key: z.string().min(1),
        value: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const siteContent = await ctx.db.siteContent.update({
        where: { key: input.key },
        data: { value: input.value },
      });
      return {
        data: siteContent,
        message: "Site content updated successfully",
      };
    }),

  delete: protectedProcedure
    .input(z.object({ key: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.siteContent.delete({
        where: { key: input.key },
      });
      return { message: "Site content deleted successfully" };
    }),
});
