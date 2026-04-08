import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { checkBusiness } from "~/lib/check-business";
import {
  createTRPCRouter,
  ownerAdminProcedure,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

export const customerRouter = createTRPCRouter({
  // Get customer profile for current user
  getMyProfile: protectedProcedure.query(async ({ ctx }) => {
    const user = ctx.session.user;

    // Get the current business from the domain
    const business = await checkBusiness();
    if (!business) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Business not found",
      });
    }

    // Find customer linked to this user
    const customer = await ctx.db.customer.findFirst({
      where: {
        userId: user.id,
        businessId: business.id,
      },
      include: {
        shippingAddresses: {
          orderBy: { isDefault: "desc" },
        },
      },
    });

    return customer;
  }),

  // Get a single order for the current user (by orderId, scoped to their customer record)
  getMyOrderById: protectedProcedure
    .input(z.object({ orderId: z.string() }))
    .query(async ({ ctx, input }) => {
      const business = await checkBusiness();
      if (!business) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Business not found",
        });
      }

      const user = ctx.session.user;

      const customer = await ctx.db.customer.findFirst({
        where: {
          userId: user.id,
          businessId: business.id,
        },
      });

      if (!customer) {
        return null;
      }

      const order = await ctx.db.order.findFirst({
        where: {
          id: input.orderId,
          customerId: customer.id,
        },
        include: {
          items: true,
          shippingAddress: true,
          shipments: true,
        },
      });

      return order ?? null;
    }),

  // Get order history for current user
  getMyOrders: protectedProcedure.query(async ({ ctx }) => {
    const business = await checkBusiness();
    if (!business) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Business not found",
      });
    }

    const user = ctx.session.user;

    // Find customer linked to this user
    const customer = await ctx.db.customer.findFirst({
      where: {
        userId: user.id,
        businessId: business.id,
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
    .input(z.object({ email: z.string().email() }))
    .query(async ({ ctx, input }) => {
      // This is a public endpoint but requires knowing the exact email
      // Used for "check order status" type features

      // Get the current business from the domain
      const business = await checkBusiness();
      if (!business) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Business not found",
        });
      }

      const orders = await ctx.db.order.findMany({
        where: {
          customerEmail: input.email.toLowerCase(),
          businessId: business.id,
        },
        include: {
          items: true,
          shippingAddress: {
            select: {
              city: true,
              province: true,
              zip: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 10, // Limit to last 10 orders
      });

      return orders;
    }),

  // Link customer account to authenticated user (Need to rethink)
  // linkToUser: protectedProcedure.mutation(async ({ ctx }) => {
  //   const user = ctx.session.user;

  //   if (!user.businessId) {
  //     throw new TRPCError({
  //       code: "BAD_REQUEST",
  //       message: "User must be associated with a business",
  //     });
  //   }

  //   // Find or create customer for this user's email
  //   const customer = await ctx.db.customer.upsert({
  //     where: {
  //       businessId_email: {
  //         email: user.email,
  //         businessId: user.businessId,
  //       },
  //     },
  //     create: {
  //       email: user.email,
  //       firstName: user.name.split(" ")[0] ?? "",
  //       lastName: user.name.split(" ").slice(1).join(" ") || "",
  //       businessId: user.businessId,
  //       userId: user.id,
  //     },
  //     update: {
  //       userId: user.id,
  //       // Optionally update name if not set
  //       firstName: user.name.split(" ")[0] ?? undefined,
  //       lastName: user.name.split(" ").slice(1).join(" ") || undefined,
  //     },
  //   });

  //   console.log(`[Customer] Linked customer ${customer.id} to user ${user.id}`);

  //   return customer;
  // }),

  updateMarketingPreference: protectedProcedure
    .input(z.object({ acceptsMarketing: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user;
      const business = await checkBusiness();
      if (!business) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Business not found" });
      }
      const customer = await ctx.db.customer.findFirst({
        where: { userId: user.id, businessId: business.id },
      });
      if (!customer) return null;
      return ctx.db.customer.update({
        where: { id: customer.id },
        data: { acceptsMarketing: input.acceptsMarketing },
      });
    }),

  addAddress: protectedProcedure
    .input(
      z.object({
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        company: z.string().optional(),
        address1: z.string().min(1),
        address2: z.string().optional(),
        city: z.string().min(1),
        province: z.string().optional(),
        country: z.string().min(1),
        zip: z.string().min(1),
        phone: z.string().optional(),
        isDefault: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user;
      const business = await checkBusiness();
      if (!business) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Business not found" });
      }

      // Upsert customer if they haven't ordered before
      const customer = await ctx.db.customer.upsert({
        where: { businessId_email: { businessId: business.id, email: user.email } },
        create: {
          email: user.email,
          firstName: user.name?.split(" ")[0] ?? "",
          lastName: user.name?.split(" ").slice(1).join(" ") ?? "",
          userId: user.id,
          businessId: business.id,
        },
        update: {},
      });

      if (input.isDefault) {
        await ctx.db.shippingAddress.updateMany({
          where: { customerId: customer.id },
          data: { isDefault: false },
        });
      }

      return ctx.db.shippingAddress.create({
        data: {
          customerId: customer.id,
          firstName: input.firstName,
          lastName: input.lastName,
          company: input.company,
          address1: input.address1,
          address2: input.address2,
          city: input.city,
          province: input.province,
          country: input.country,
          zip: input.zip,
          phone: input.phone,
          isDefault: input.isDefault ?? false,
        },
      });
    }),

  updateAddress: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        firstName: z.string().min(1).optional(),
        lastName: z.string().min(1).optional(),
        company: z.string().optional(),
        address1: z.string().min(1).optional(),
        address2: z.string().optional(),
        city: z.string().min(1).optional(),
        province: z.string().optional(),
        country: z.string().min(1).optional(),
        zip: z.string().min(1).optional(),
        phone: z.string().optional(),
        isDefault: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user;
      const business = await checkBusiness();
      if (!business) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Business not found" });
      }

      const address = await ctx.db.shippingAddress.findFirst({
        where: { id: input.id },
        include: { customer: true },
      });

      if (!address || address.customer.userId !== user.id || address.customer.businessId !== business.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Address not found" });
      }

      if (input.isDefault) {
        await ctx.db.shippingAddress.updateMany({
          where: { customerId: address.customerId },
          data: { isDefault: false },
        });
      }

      const { id, ...data } = input;
      return ctx.db.shippingAddress.update({
        where: { id },
        data,
      });
    }),

  deleteAddress: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user;
      const business = await checkBusiness();
      if (!business) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Business not found" });
      }

      const address = await ctx.db.shippingAddress.findFirst({
        where: { id: input.id },
        include: { customer: true },
      });

      if (!address || address.customer.userId !== user.id || address.customer.businessId !== business.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Address not found" });
      }

      await ctx.db.shippingAddress.delete({ where: { id: input.id } });
      return { success: true };
    }),

  setDefaultAddress: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user;
      const business = await checkBusiness();
      if (!business) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Business not found" });
      }

      const address = await ctx.db.shippingAddress.findFirst({
        where: { id: input.id },
        include: { customer: true },
      });

      if (!address || address.customer.userId !== user.id || address.customer.businessId !== business.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Address not found" });
      }

      await ctx.db.$transaction([
        ctx.db.shippingAddress.updateMany({
          where: { customerId: address.customerId },
          data: { isDefault: false },
        }),
        ctx.db.shippingAddress.update({
          where: { id: input.id },
          data: { isDefault: true },
        }),
      ]);

      return { success: true };
    }),

  getById: ownerAdminProcedure
    .input(z.string())
    .query(async ({ ctx, input: id }) => {
      const { businessId } = ctx;
      return ctx.db.customer.findFirst({
        where: { id, businessId },
        include: {
          orders: {
            include: {
              items: true,
              shippingAddress: true,
            },
            orderBy: { createdAt: "desc" },
          },
        },
      });
    }),

  list: ownerAdminProcedure
    .input(z.object({ search: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const search = input.search?.trim();

      return ctx.db.customer.findMany({
        where: {
          businessId,
          ...(search
            ? {
                OR: [
                  { email: { contains: search, mode: "insensitive" } },
                  { firstName: { contains: search, mode: "insensitive" } },
                  { lastName: { contains: search, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        orderBy: { createdAt: "desc" },
      });
    }),
});
