import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { checkBusiness } from "~/lib/check-business";

import {
  createTRPCRouter,
  ownerAdminProcedure,
  publicProcedure,
} from "../trpc";

// ─── Input validators ─────────────────────────────────────────────────────────

const createFaqItemSchema = z.object({
  question: z.string().min(1).max(500),
  answer: z.string().min(1).max(10000),
  sortOrder: z.number().int().min(0).default(0),
  published: z.boolean().default(true),
});

const updateFaqItemSchema = z.object({
  id: z.string(),
  question: z.string().min(1).max(500).optional(),
  answer: z.string().min(1).max(10000).optional(),
  sortOrder: z.number().int().min(0).optional(),
  published: z.boolean().optional(),
});

const reorderFaqItemsSchema = z.object({
  // Array of { id, sortOrder } pairs in the new desired order
  items: z.array(
    z.object({
      id: z.string(),
      sortOrder: z.number().int().min(0),
    }),
  ),
});

// ─── Router ───────────────────────────────────────────────────────────────────

export const faqRouter = createTRPCRouter({
  // ─── PUBLIC ──────────────────────────────────────────────────────────────

  /**
   * Public storefront query — returns ONLY published items ordered by sortOrder.
   * Drafts are never exposed here; admins read all items via `adminList` below.
   */
  list: publicProcedure.query(async ({ ctx }) => {
    const business = await checkBusiness();
    if (!business) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Business not found",
      });
    }

    return ctx.db.faqItem.findMany({
      where: {
        businessId: business.id,
        published: true,
      },
      orderBy: { sortOrder: "asc" },
    });
  }),

  // ─── PROTECTED (owner / admin) ────────────────────────────────────────────

  /**
   * Admin list — returns all items (published + drafts), ordered by sortOrder.
   */
  adminList: ownerAdminProcedure.query(async ({ ctx }) => {
    const { businessId } = ctx;
    return ctx.db.faqItem.findMany({
      where: { businessId },
      orderBy: { sortOrder: "asc" },
    });
  }),

  create: ownerAdminProcedure
    .input(createFaqItemSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      return ctx.db.faqItem.create({
        data: {
          businessId,
          question: input.question,
          answer: input.answer,
          sortOrder: input.sortOrder,
          published: input.published,
        },
      });
    }),

  update: ownerAdminProcedure
    .input(updateFaqItemSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const { id, ...rest } = input;

      // Ownership-scoped update — Prisma throws if the record doesn't exist or
      // doesn't belong to this business (combined where clause).
      const updated = await ctx.db.faqItem
        .update({ where: { id, businessId }, data: rest })
        .catch(() => null);

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "FAQ item not found",
        });
      }

      return updated;
    }),

  delete: ownerAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      // Ownership-scoped delete — Prisma throws if the record doesn't exist or
      // doesn't belong to this business.
      const deleted = await ctx.db.faqItem
        .delete({ where: { id: input.id, businessId } })
        .catch(() => null);

      if (!deleted) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "FAQ item not found",
        });
      }

      return deleted;
    }),

  /**
   * Bulk reorder — accepts an array of { id, sortOrder } pairs and updates
   * all items in a transaction. Only items belonging to the business are updated.
   */
  reorder: ownerAdminProcedure
    .input(reorderFaqItemsSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      await ctx.db.$transaction(
        input.items.map(({ id, sortOrder }) =>
          ctx.db.faqItem.updateMany({
            where: { id, businessId },
            data: { sortOrder },
          }),
        ),
      );

      return { success: true };
    }),
});
