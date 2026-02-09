import { TRPCError } from "@trpc/server";
import type { Prisma } from "generated/prisma";
import type Stripe from "stripe";
import { z } from "zod";
import { checkBusiness } from "~/lib/check-business";
import { stripeClient } from "~/lib/stripe/client";

import {
  createTRPCRouter,
  ownerAdminProcedure,
  publicProcedure,
} from "~/server/api/trpc";

export const orderRouter = createTRPCRouter({
  getAll: ownerAdminProcedure
    .input(
      z
        .object({
          status: z.string().optional(),
          search: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const business = await checkBusiness();

      if (!business) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Business not found",
        });
      }

      const statusFilter = input?.status;
      const searchQuery = input?.search;

      const where: Prisma.OrderWhereInput = {
        businessId: business.id,
      };

      if (statusFilter && statusFilter !== "all") {
        where.status = statusFilter;
      }

      if (searchQuery) {
        where.OR = [
          { customerEmail: { contains: searchQuery, mode: "insensitive" } },
          { customerName: { contains: searchQuery, mode: "insensitive" } },
          { id: { contains: searchQuery, mode: "insensitive" } },
        ];
      }

      const orders = await ctx.db.order.findMany({
        where,
        include: {
          items: true,
        },
        orderBy: { createdAt: "desc" },
      });

      return orders;
    }),

  getById: ownerAdminProcedure
    .input(z.string())
    .query(async ({ ctx, input: id }) => {
      const business = await checkBusiness();
      if (!business) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Business not found",
        });
      }
      const order = await ctx.db.order.findFirst({
        where: { id, businessId: business.id },
        include: { items: true, shippingAddress: true },
      });

      return order;
    }),

  //TODO: Wonder if I need to connect the refund info to the order?
  refund: ownerAdminProcedure
    .input(
      z.object({
        orderId: z.string(),
        amount: z.number(),
        reason: z.string().optional(),
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

      const order = await ctx.db.order.findFirst({
        where: {
          id: input.orderId,
          businessId: business.id,
        },
        include: {
          business: {
            select: { stripeAccountId: true },
          },
        },
      });

      if (!order) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Order not found",
        });
      }

      if (!order.stripePaymentIntentId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No payment intent found for this order",
        });
      }

      if (order.status === "refunded") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Order is already refunded",
        });
      }

      if (input.amount > order.total) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Refund amount cannot exceed order total",
        });
      }

      //Reasons: "duplicate" | "fraudulent" | "requested_by_customer"

      const refund = await stripeClient.refunds.create(
        {
          payment_intent: order.stripePaymentIntentId,
          amount: input.amount,
          reason: (input.reason ??
            "requested_by_customer") as Stripe.RefundCreateParams.Reason,
        },
        {
          stripeAccount: order.business.stripeAccountId!,
        },
      );

      const isFullRefund = input.amount === order.total;
      const updatedOrder = await ctx.db.order.update({
        where: { id: input.orderId },
        data: {
          status: isFullRefund ? "refunded" : "partial_refund",
        },
      });

      return {
        success: true,
        refund: {
          id: refund.id,
          amount: refund.amount,
          status: refund.status,
        },
        order: updatedOrder,
      };
    }),

  updateStatus: ownerAdminProcedure
    .input(
      z.object({
        orderId: z.string(),
        status: z.string(),
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

      const order = await ctx.db.order.findFirst({
        where: { id: input.orderId, businessId: business.id },
      });

      if (!order) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Order not found",
        });
      }

      const updatedOrder = await ctx.db.order.update({
        where: { id: input.orderId },
        data: { status: input.status },
      });

      return updatedOrder;
    }),

  // TODO: Brainstorm more on the customer / shipping address relationship
  createManual: ownerAdminProcedure
    .input(
      z.object({
        businessId: z.string(),
        customerName: z.string(),
        customerEmail: z.string(),
        shippingName: z.string(),
        shippingAddress: z.object({
          line1: z.string(),
          city: z.string(),
          state: z.string(),
          postal_code: z.string(),
          country: z.string(),
        }),
        items: z.array(
          z.object({
            productId: z.string().optional().nullable(),
            productName: z.string().optional().nullable(),
            productVariantId: z.string().optional().nullable(),
            quantity: z.number(),
            price: z.number(),
            total: z.number(),
          }),
        ),
        subtotal: z.number(),
        shipping: z.number(),
        tax: z.number(),
        total: z.number(),
        notes: z.string().optional(),
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

      const shippingAddress = input.shippingAddress
        ? await ctx.db.shippingAddress.create({
            data: {
              address1: input.shippingAddress.line1,
              city: input.shippingAddress.city,
              province: input.shippingAddress.state,
              zip: input.shippingAddress.postal_code,
              country: input.shippingAddress.country,
              firstName: input.shippingName,
              lastName: input.shippingName,
              customer: {
                connect: {
                  businessId_email: {
                    email: input.customerEmail,
                    businessId: business.id,
                  },
                },
              },
            },
          })
        : await ctx.db.shippingAddress.findFirst({
            where: {
              customer: {
                AND: {
                  email: input.customerEmail,
                  businessId: business.id,
                },
              },
            },
          });

      if (!shippingAddress) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Shipping address not found",
        });
      }

      const order = await ctx.db.order.create({
        data: {
          orderNumber:
            (await ctx.db.order.count({
              where: { businessId: business.id },
            })) + 1,
          businessId: business.id,
          customerEmail: input.customerEmail,
          customerName: input.customerName,

          // Amounts
          subtotal: input.subtotal,
          tax: input.tax || 0,
          shipping: input.shipping || 0,
          total: input.total,

          //   currency: "usd",
          status: "pending", // Manual orders start as pending
          paymentStatus: "unpaid",

          // Shipping
          shippingAddressId: shippingAddress.id,
          //   shippingName: input.shippingName || input.customerName,

          // Items
          items: {
            create: input.items.map((item) => ({
              productId: item.productId,
              productName: item.productName ?? "Unknown Product",
              productVariantId: item.productVariantId,
              quantity: item.quantity,
              price: item.price,
              total: item.total,
            })),
          },
        },
        include: {
          items: true,
        },
      });

      return order;
    }),

  updateFulfillment: ownerAdminProcedure
    .input(
      z.object({
        orderId: z.string(),
        fulfillmentStatus: z.string(),
        trackingNumber: z.string().optional(),
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

      const updatedOrder = await ctx.db.order.update({
        where: { id: input.orderId },
        data: {
          fulfillmentStatus: input.fulfillmentStatus,
          trackingNumber: input.trackingNumber ?? null,
        },
      });

      return updatedOrder;
    }),
});
