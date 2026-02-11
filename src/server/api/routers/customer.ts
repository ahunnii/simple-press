import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { checkBusiness } from "~/lib/check-business";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

export const customerRouter = createTRPCRouter({
  // Get customer profile for current user
  getMyProfile: protectedProcedure.query(async ({ ctx }) => {
    const user = ctx.session.user;

    // Find customer linked to this user
    const customer = await ctx.db.customer.findFirst({
      where: {
        userId: user.id,
        businessId: user.businessId ?? undefined,
      },
      include: {
        shippingAddresses: {
          orderBy: { isDefault: "desc" },
        },
      },
    });

    return customer;
  }),

  // Get order history for current user
  getMyOrders: protectedProcedure.query(async ({ ctx }) => {
    const user = ctx.session.user;

    // Find customer linked to this user
    const customer = await ctx.db.customer.findFirst({
      where: {
        userId: user.id,
        businessId: user.businessId ?? undefined,
      },
    });

    if (!customer) {
      return [];
    }

    // Get all orders for this customer
    const orders = await ctx.db.order.findMany({
      where: {
        customerId: customer.id,
      },
      include: {
        items: true,
        shippingAddress: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return orders;
  }),

  // Get orders by email (for guest checkout that later signs in)
  getOrdersByEmail: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // This is a public endpoint but requires knowing the exact email
      // Used for "check order status" type features

      const orders = await ctx.db.order.findMany({
        where: {
          customerEmail: input.email.toLowerCase(),
        },
        include: {
          items: true,
          shippingAddress: true,
        },
        orderBy: { createdAt: "desc" },
        take: 10, // Limit to last 10 orders
      });

      return orders;
    }),

  // Link customer account to authenticated user
  linkToUser: protectedProcedure.mutation(async ({ ctx }) => {
    const user = ctx.session.user;

    if (!user.businessId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "User must be associated with a business",
      });
    }

    // Find or create customer for this user's email
    const customer = await ctx.db.customer.upsert({
      where: {
        businessId_email: {
          email: user.email,
          businessId: user.businessId,
        },
      },
      create: {
        email: user.email,
        firstName: user.name.split(" ")[0] ?? "",
        lastName: user.name.split(" ").slice(1).join(" ") || "",
        businessId: user.businessId,
        userId: user.id,
      },
      update: {
        userId: user.id,
        // Optionally update name if not set
        firstName:
          user.name.split(" ")[0] ?? undefined,
        lastName:
          user.name.split(" ").slice(1).join(" ") || undefined,
      },
    });

    console.log(
      `[Customer] Linked customer ${customer.id} to user ${user.id}`,
    );

    return customer;
  }),
});
