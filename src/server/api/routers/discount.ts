import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { checkBusiness } from "~/lib/check-business";
import {
  createTRPCRouter,
  ownerAdminProcedure,
  publicProcedure,
} from "~/server/api/trpc";

export const discountRouter = createTRPCRouter({
  create: ownerAdminProcedure
    .input(
      z.object({
        businessId: z.string().min(1),
        code: z.string().min(1),
        type: z.enum(["percentage", "fixed"]),
        value: z.number(),
        active: z.boolean(),
        usageLimit: z.number().optional(),
        expiresAt: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const currentBusiness = await checkBusiness();
      if (!currentBusiness) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Business not found",
        });
      }

      const existingCode = await ctx.db.discountCode.findFirst({
        where: {
          businessId: currentBusiness.id,
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
          businessId: currentBusiness.id,
          code: input.code,
          type: input.type,
          value: input.value,
          active: input.active,
          usageLimit: input.usageLimit,
          expiresAt: input.expiresAt,
        },
      });
      return {
        data: discount,
        message: "Discount code created successfully",
      };
    }),

  validate: publicProcedure
    .input(
      z.object({
        code: z.string().min(1),
        businessId: z.string().min(1),
        cartTotal: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { cartTotal } = input;
      const currentBusiness = await checkBusiness();
      if (!currentBusiness) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Business not found",
        });
      }
      const discount = await ctx.db.discountCode.findFirst({
        where: { code: input.code, businessId: input.businessId },
      });
      if (!discount) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Discount code not found",
        });
      }

      // Check if active
      if (!discount.active) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This discount code is no longer active",
        });
      }

      // Check start date
      if (discount.startsAt && new Date(discount.startsAt) > new Date()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This discount code is not yet valid",
        });
      }

      // Check expiry
      if (discount.expiresAt && new Date(discount.expiresAt) < new Date()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This discount code has expired",
        });
      }

      // Check usage limit
      if (discount.usageLimit && discount.usageCount >= discount.usageLimit) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This discount code has reached its usage limit",
        });
      }

      // Check minimum purchase
      if (discount.minPurchase && cartTotal < discount.minPurchase) {
        const minAmount = (discount.minPurchase / 100).toFixed(2);
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Minimum purchase of $${minAmount} required`,
        });
      }

      // Calculate discount amount
      let discountAmount = 0;

      if (discount.type === "percentage") {
        discountAmount = Math.round((cartTotal * discount.value) / 100);
      } else if (discount.type === "fixed") {
        discountAmount = discount.value;
      }

      // Apply max discount cap if set
      if (discount.maxDiscount && discountAmount > discount.maxDiscount) {
        discountAmount = discount.maxDiscount;
      }

      // Ensure discount doesn't exceed cart total
      if (discountAmount > cartTotal) {
        discountAmount = cartTotal;
      }

      return {
        valid: true,
        discount: {
          id: discount.id,
          code: discount.code,
          type: discount.type,
          value: discount.value,
          discountAmount,
        },
      };
    }),
});
