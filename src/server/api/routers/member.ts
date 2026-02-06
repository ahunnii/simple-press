import type { Member } from "generated/prisma";
import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

export const memberRouter = createTRPCRouter({
  getById: publicProcedure
    .input(z.string())
    .query(async ({ ctx, input: id }) => {
      const member = await ctx.db.member.findUnique({
        where: { id },
        include: { club: true, user: true },
      });
      return member;
    }),

  getAll: publicProcedure.query(async ({ ctx }) => {
    const members = await ctx.db.member.findMany({
      include: {
        club: true,
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
    return members as (Member & {
      club: { id: string; name: string };
      user: { id: string; name: string | null; email: string | null };
    })[];
  }),

  getUsersForSelect: publicProcedure.query(async ({ ctx }) => {
    const users = await ctx.db.user.findMany({
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });
    return users;
  }),

  create: protectedProcedure
    .input(
      z.object({
        clubId: z.string().min(1),
        userId: z.string().min(1),
        role: z.string().min(1),
        isSubscribed: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const member = await ctx.db.member.create({
        data: {
          clubId: input.clubId,
          userId: input.userId,
          role: input.role,
          isSubscribed: input.isSubscribed,
        },
      });
      return {
        data: member,
        message: "Member created successfully",
      };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        role: z.string().min(1),
        isSubscribed: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const member = await ctx.db.member.update({
        where: { id: input.id },
        data: {
          role: input.role,
          isSubscribed: input.isSubscribed,
        },
      });
      return {
        data: member,
        message: "Member updated successfully",
      };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.member.delete({
        where: { id: input.id },
      });
      return { message: "Member deleted successfully" };
    }),
});
