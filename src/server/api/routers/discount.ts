import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { checkBusiness } from "~/lib/check-business";
import { deactivateExpiredDiscountCodes } from "~/lib/deactivate-expired-discounts";
import { validateAndComputeDiscount } from "~/lib/discount-validation";
import { discountFormSchema } from "~/lib/validators/discounts";
import {
  createTRPCRouter,
  ownerAdminProcedure,
  publicProcedure,
} from "~/server/api/trpc";

export const discountRouter = createTRPCRouter({
  getAll: ownerAdminProcedure.query(async ({ ctx }) => {
    const currentBusiness = await checkBusiness();
    if (!currentBusiness) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Business not found",
      });
    }
    return ctx.db.discountCode.findMany({
      where: { businessId: currentBusiness.id },
      orderBy: { createdAt: "desc" },
    });
  }),

  getById: ownerAdminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const currentBusiness = await checkBusiness();
      if (!currentBusiness) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Business not found",
        });
      }
      const discount = await ctx.db.discountCode.findFirst({
        where: { id: input.id, businessId: currentBusiness.id },
      });
      if (!discount) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Discount code not found",
        });
      }
      return discount;
    }),

  create: ownerAdminProcedure
    .input(discountFormSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      const existingCode = await ctx.db.discountCode.findFirst({
        where: {
          businessId,
          code: input.code,
        },
      });
      if (existingCode) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A discount code with this code already exists",
        });
      }

      const discount = await ctx.db.discountCode.create({
        data: {
          businessId,
          code: input.code,
          type: input.type,
          value: input.value,
          active: input.active,
          usageLimit: input.usageLimit,
          expiresAt: input.expiresAt ?? undefined,
          minPurchase: input.minPurchase,
          maxDiscount: input.maxDiscount,
          showAsBanner: input.showAsBanner ?? false,
          bannerText: input.bannerText?.trim() ?? null,
          bannerLinkUrl: input.bannerLinkUrl?.trim() ?? null,
        },
      });
      return {
        data: discount,
        message: "Discount code created successfully",
      };
    }),

  update: ownerAdminProcedure
    .input(
      discountFormSchema.extend({
        id: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      const codeTaken = await ctx.db.discountCode.findFirst({
        where: {
          businessId,
          code: input.code,
          NOT: { id: input.id },
        },
      });
      if (codeTaken) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A discount code with this code already exists",
        });
      }

      const discount = await ctx.db.discountCode.update({
        where: { id: input.id },
        data: {
          code: input.code,
          type: input.type,
          value: input.value,
          active: input.active,
          usageLimit: input.usageLimit ?? undefined,
          expiresAt: input.expiresAt ?? undefined,
          minPurchase: input.minPurchase ?? undefined,
          maxDiscount: input.maxDiscount ?? undefined,
          showAsBanner: input.showAsBanner ?? false,
          bannerText: input.bannerText?.trim() ?? null,
          bannerLinkUrl: input.bannerLinkUrl?.trim() ?? null,
        },
      });

      return { data: discount, message: "Discount code updated successfully" };
    }),

  deactivateExpired: ownerAdminProcedure.mutation(async ({ ctx }) => {
    const { businessId } = ctx;
    return deactivateExpiredDiscountCodes(ctx.db, businessId);
  }),

  getActiveBanner: publicProcedure.query(async ({ ctx, input }) => {
    const business = await checkBusiness();
    if (!business) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Business not found",
      });
    }
    const { id: businessId } = business;

    const now = new Date();
    const codes = await ctx.db.discountCode.findMany({
      where: {
        businessId,
        showAsBanner: true,
        active: true,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ expiresAt: null }, { expiresAt: { gte: now } }] },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    for (const code of codes) {
      if (code.usageLimit != null && code.usageCount >= code.usageLimit) {
        continue;
      }
      const text = code.bannerText?.trim();
      if (!text) continue;
      return {
        id: code.id,
        code: code.code,
        bannerText: text,
        bannerLinkUrl: code.bannerLinkUrl?.trim() ?? null,
      };
    }

    return null;
  }),

  validate: publicProcedure
    .input(
      z.object({
        code: z.string().min(1),
        cartTotal: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const business = await checkBusiness();
      if (!business) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Business not found",
        });
      }

      const { id: businessId } = business;
      const { cartTotal } = input;

      const discount = await ctx.db.discountCode.findFirst({
        where: {
          code: input.code.trim().toUpperCase(),
          businessId,
        },
      });

      if (!discount) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Discount code not found",
        });
      }

      const result = validateAndComputeDiscount(discount, cartTotal);
      if (!result.ok) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: result.error,
        });
      }

      return {
        valid: true,
        discount: {
          id: discount.id,
          code: discount.code,
          type: discount.type,
          value: discount.value,
          discountAmount: result.discountAmountCents,
        },
      };
    }),

  delete: ownerAdminProcedure
    .input(z.string())
    .mutation(async ({ ctx, input: id }) => {
      const { businessId } = ctx;
      const discount = await ctx.db.discountCode.delete({
        where: { id, businessId },
      });
      return { data: discount, message: "Discount code deleted successfully" };
    }),
});
