import type { Prisma } from "generated/prisma";
import type Stripe from "stripe";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { findOrCreateShippingAddress } from "~/lib/address-utils";
import { sendOrderShipped } from "~/lib/email/templates";
import { stripeClient } from "~/lib/stripe/client";
import { createTRPCRouter, ownerAdminProcedure } from "~/server/api/trpc";

export const orderRouter = createTRPCRouter({
  markAsFulfilled: ownerAdminProcedure
    .input(
      z.object({
        orderId: z.string(),
        carrier: z.string(),
        trackingNumber: z.string(),
        trackingUrl: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      // Get order with business info
      const order = await ctx.db.order.findUnique({
        where: { id: input.orderId, businessId },
        include: {
          business: {
            include: {
              siteContent: {
                select: { logoUrl: true },
              },
            },
          },
        },
      });

      if (!order) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Order not found",
        });
      }

      // Update order
      const updatedOrder = await ctx.db.order.update({
        where: { id: input.orderId },
        data: {
          status: "fulfilled",
          fulfillmentStatus: "fulfilled",
          trackingNumber: input.trackingNumber,
          trackingUrl: input.trackingUrl,
          shippedAt: new Date(),
        },
      });

      // Send shipping notification email
      try {
        await sendOrderShipped({
          to: order.customerEmail,
          orderNumber: order.orderNumber,
          customerName: order.customerName ?? "Guest",
          trackingNumber: input.trackingNumber,
          trackingUrl: input.trackingUrl,
          carrier: input.carrier,
          business: {
            name: order.business.name,
            ownerEmail: order.business.ownerEmail,
            siteContent: order.business.siteContent,
            subdomain: order.business.subdomain,
          },
        });

        console.log(
          `[Orders] Shipping email sent for order #${order.orderNumber}`,
        );
      } catch (emailError) {
        console.error("[Orders] Failed to send shipping email:", emailError);
        // Don't fail the mutation if email fails
      }

      return updatedOrder;
    }),
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
      const { businessId } = ctx;

      const statusFilter = input?.status;
      const searchQuery = input?.search;

      const where: Prisma.OrderWhereInput = {
        businessId,
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
      const { businessId } = ctx;
      const order = await ctx.db.order.findFirst({
        where: { id, businessId },
        include: {
          discountCode: true,
          items: true,
          shippingAddress: true,
          customer: true,
        },
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
      const { businessId } = ctx;

      const order = await ctx.db.order.findFirst({
        where: {
          id: input.orderId,
          businessId,
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

      // const isFullRefund = input.amount === order.total;
      // const updatedOrder = await ctx.db.order.update({
      //   where: { id: input.orderId },
      //   data: {
      //     status: isFullRefund ? "refunded" : "partial_refund",
      //   },
      // });

      // Update order status
      const isFullRefund = input.amount === order.total;
      const updatedOrder = await ctx.db.order.update({
        where: { id: input.orderId },
        data: {
          status: isFullRefund ? "refunded" : "partial_refund",
          ...(isFullRefund && { paymentStatus: "refunded" }),
        },
        include: {
          items: true,
        },
      });

      // Restore inventory for refunded items (variant-level or product-level for no-variant items)
      if (isFullRefund) {
        try {
          await ctx.db.$transaction(async (tx) => {
            for (const item of updatedOrder.items) {
              if (item.productVariantId) {
                const variant = await tx.productVariant.findUnique({
                  where: { id: item.productVariantId },
                  select: {
                    id: true,
                    inventoryQty: true,
                    productId: true,
                    product: {
                      select: { businessId: true },
                    },
                  },
                });

                if (!variant) continue;

                const newQty = variant.inventoryQty + item.quantity;

                await tx.productVariant.update({
                  where: { id: item.productVariantId },
                  data: { inventoryQty: newQty },
                });

                await tx.inventoryHistory.create({
                  data: {
                    variantId: item.productVariantId,
                    productId: variant.productId,
                    businessId: variant.product.businessId,
                    previousQty: variant.inventoryQty,
                    newQty,
                    changeQty: item.quantity,
                    reason: "return",
                    note: `Refund Order #${updatedOrder.id.slice(0, 8)}`,
                    orderId: updatedOrder.id,
                  },
                });
              } else if (item.productId) {
                const product = await tx.product.findUnique({
                  where: { id: item.productId },
                  select: {
                    id: true,
                    inventoryQty: true,
                    trackInventory: true,
                  },
                });

                if (!product?.trackInventory) continue;

                const newQty = product.inventoryQty + item.quantity;

                await tx.product.update({
                  where: { id: item.productId },
                  data: { inventoryQty: newQty },
                });
              }
            }
          });
        } catch (invError) {
          console.error("Failed to restore inventory:", invError);
          // Don't fail the refund if inventory restoration fails
        }
      }

      // TODO: Send refund confirmation email to customer

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
      const { businessId } = ctx;

      const order = await ctx.db.order.findFirst({
        where: { id: input.orderId, businessId },
      });

      if (!order) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Order not found",
        });
      }

      const wasUnpaid =
        order.paymentStatus === "unpaid" || order.status === "pending";
      const isPaid = input.status === "paid";

      const updatedOrder = await ctx.db.order.update({
        where: { id: input.orderId },
        data: {
          status: input.status,
          // If marking as paid, also update payment status
          paymentStatus: isPaid ? "paid" : order.paymentStatus,
        },
      });

      // Update customer metrics if transitioning from unpaid to paid
      if (wasUnpaid && isPaid && order.customerId) {
        try {
          await ctx.db.customer.update({
            where: { id: order.customerId },
            data: {
              totalSpent: { increment: order.total },
              orderCount: { increment: 1 },
            },
          });
          console.log(
            `[Order Status] Updated customer metrics for order ${order.id}`,
          );
        } catch (error) {
          console.error(
            "[Order Status] Failed to update customer metrics:",
            error,
          );
        }
      }

      return updatedOrder;
    }),

  // TODO: Brainstorm more on the customer / shipping address relationship
  createManual: ownerAdminProcedure
    .input(
      z.object({
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
      const { businessId } = ctx;

      // Parse customer name into first/last
      const nameParts = input.customerName.trim().split(" ");
      const firstName = nameParts[0] ?? "Guest";
      const lastName = nameParts.slice(1).join(" ") || "";

      // Upsert customer first to ensure it exists
      const customer = await ctx.db.customer.upsert({
        where: {
          businessId_email: {
            email: input.customerEmail,
            businessId,
          },
        },
        create: {
          email: input.customerEmail,
          firstName,
          lastName,
          businessId,
        },
        update: {
          firstName,
          lastName,
        },
      });

      console.log(
        `[Manual Order] Customer upserted: ${customer.id} (${customer.email})`,
      );

      // Parse shipping name into first/last
      const shippingNameParts = input.shippingName.trim().split(" ");
      const shippingFirstName = shippingNameParts[0] ?? firstName;
      const shippingLastName = shippingNameParts.slice(1).join(" ") || lastName;

      // Find or create shipping address with deduplication
      let shippingAddressId: string;
      if (input.shippingAddress) {
        shippingAddressId = await findOrCreateShippingAddress({
          customerId: customer.id,
          firstName: shippingFirstName,
          lastName: shippingLastName,
          address1: input.shippingAddress.line1,
          city: input.shippingAddress.city,
          province: input.shippingAddress.state,
          zip: input.shippingAddress.postal_code,
          country: input.shippingAddress.country,
        });
      } else {
        // If no address provided, try to find default address
        const defaultAddress = await ctx.db.shippingAddress.findFirst({
          where: {
            customerId: customer.id,
            isDefault: true,
          },
        });

        if (!defaultAddress) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "No shipping address provided and no default address found",
          });
        }

        shippingAddressId = defaultAddress.id;
      }

      // Generate order number
      const orderCount = await ctx.db.order.count({
        where: { businessId },
      });

      const order = await ctx.db.order.create({
        data: {
          orderNumber: orderCount + 1,
          businessId,
          customerId: customer.id,
          customerEmail: input.customerEmail,
          customerName: input.customerName,

          // Amounts
          subtotal: input.subtotal,
          tax: input.tax || 0,
          shipping: input.shipping || 0,
          total: input.total,

          status: "pending", // Manual orders start as pending
          paymentStatus: "unpaid",

          // Shipping
          shippingAddressId,

          // Notes
          internalNote: input.notes,

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

      console.log(`[Manual Order] Order created: ${order.id}`);

      // Note: Customer metrics are NOT updated for manual/pending orders
      // They will be updated when the order is marked as paid

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
      const { businessId } = ctx;

      const updatedOrder = await ctx.db.order.update({
        where: { id: input.orderId, businessId },
        data: {
          fulfillmentStatus: input.fulfillmentStatus,
          trackingNumber: input.trackingNumber ?? null,
        },
      });

      return updatedOrder;
    }),
});
