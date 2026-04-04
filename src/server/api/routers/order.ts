import type { Prisma } from "generated/prisma";
import type Stripe from "stripe";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { findOrCreateShippingAddress } from "~/lib/address-utils";
import {
  sendOrderConfirmation,
  sendOrderFulfilled,
  sendOrderRefunded,
  sendOrderShipped,
} from "~/lib/email/templates";
import { stripeClient } from "~/lib/stripe/client";
import {
  manualOrderFormSchema,
  markAsFulfilledSchema,
  orderFiltersSchema,
  refundOrderSchema,
  updateFulfillmentSchema,
  updateOrderStatusSchema,
  updatePaymentStatusSchema,
} from "~/lib/validators/order";
import {
  createTRPCRouter,
  featureGate,
  ownerAdminProcedure,
} from "~/server/api/trpc";

const STRIPE_REFUND_REASON_LABEL: Record<string, string> = {
  requested_by_customer: "Customer requested refund",
  duplicate: "Duplicate order",
  fraudulent: "Fraudulent order",
};

export const orderRouter = createTRPCRouter({
  markAsFulfilled: ownerAdminProcedure
    .use(featureGate("orders"))
    .input(markAsFulfilledSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      // Get order with business info
      const order = await ctx.db.order.findUnique({
        where: { id: input.orderId, businessId },
        include: {
          business: {
            include: { siteContent: { select: { logoUrl: true } } },
          },
        },
      });

      if (!order) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Order not found",
        });
      }

      const hasTracking = Boolean(input.trackingNumber?.trim());
      const trimmedTrackingUrl = input.trackingUrl?.trim();
      const trackingUrlToSave =
        trimmedTrackingUrl && trimmedTrackingUrl.length > 0
          ? trimmedTrackingUrl
          : null;

      // Update order
      const updatedOrder = await ctx.db.order.update({
        where: { id: input.orderId },
        data: {
          status: "fulfilled",
          fulfillmentStatus: "fulfilled",
          shippedAt: new Date(),
          ...(hasTracking
            ? {
                trackingNumber: input.trackingNumber!.trim(),
                trackingUrl: trackingUrlToSave,
              }
            : {
                trackingNumber: null,
                trackingUrl: null,
              }),
        },
      });

      try {
        if (hasTracking) {
          await sendOrderShipped({
            to: order.customerEmail,
            orderNumber: order.orderNumber,
            customerName: order.customerName ?? "Guest",
            trackingNumber: input.trackingNumber!.trim(),
            trackingUrl: trackingUrlToSave ?? "",
            carrier: input.carrier!.trim(),
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
        } else {
          await sendOrderFulfilled({
            to: order.customerEmail,
            orderNumber: order.orderNumber,
            customerName: order.customerName ?? "Guest",
            business: {
              name: order.business.name,
              ownerEmail: order.business.ownerEmail,
              siteContent: order.business.siteContent,
              subdomain: order.business.subdomain,
              customDomain: order.business.customDomain,
            },
          });
          console.log(
            `[Orders] Order fulfilled email sent for order #${order.orderNumber}`,
          );
        }
      } catch (emailError) {
        console.error("[Orders] Failed to send fulfillment email:", emailError);
        // Don't fail the mutation if email fails
      }

      return updatedOrder;
    }),

  getAll: ownerAdminProcedure
    .use(featureGate("orders"))
    .input(orderFiltersSchema)
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
        include: { items: true },
        orderBy: { createdAt: "desc" },
      });

      return orders;
    }),

  getById: ownerAdminProcedure
    .use(featureGate("orders"))
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
    .use(featureGate("orders"))
    .input(refundOrderSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      const order = await ctx.db.order.findFirst({
        where: {
          id: input.orderId,
          businessId,
        },
        include: {
          business: {
            select: {
              stripeAccountId: true,
              name: true,
              ownerEmail: true,
              subdomain: true,
              customDomain: true,
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

      const stripeRefund = await stripeClient.refunds.create(
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

      try {
        const reasonLabel = input.reason
          ? (STRIPE_REFUND_REASON_LABEL[input.reason] ?? input.reason)
          : null;
        await sendOrderRefunded({
          to: order.customerEmail,
          orderNumber: order.orderNumber,
          customerName: order.customerName ?? "Guest",
          refundAmountCents: input.amount,
          orderTotalCents: order.total,
          isFullRefund,
          reason: reasonLabel,
          business: {
            name: order.business.name,
            ownerEmail: order.business.ownerEmail,
            siteContent: order.business.siteContent,
            subdomain: order.business.subdomain,
            customDomain: order.business.customDomain,
          },
        });
        console.log(
          `[Orders] Refund confirmation email sent for order #${order.orderNumber}`,
        );
      } catch (emailError) {
        console.error(
          "[Orders] Failed to send refund confirmation email:",
          emailError,
        );
      }

      return {
        success: true,
        refund: {
          id: stripeRefund.id,
          amount: stripeRefund.amount,
          status: stripeRefund.status,
        },
        order: updatedOrder,
      };
    }),

  updateStatus: ownerAdminProcedure
    .use(featureGate("orders"))
    .input(updateOrderStatusSchema)
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

  updatePaymentStatus: ownerAdminProcedure
    .input(updatePaymentStatusSchema)
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

      const derivedStatus = (() => {
        if (input.paymentStatus === "refunded") return "refunded";
        if (input.paymentStatus === "failed") return order.status;
        if (
          input.paymentStatus === "paid" &&
          order.fulfillmentStatus === "fulfilled"
        )
          return "fulfilled";
        if (input.paymentStatus === "paid") return "paid";
        return "pending";
      })();

      return ctx.db.order.update({
        where: { id: input.orderId },
        data: {
          paymentStatus: input.paymentStatus,
          status: derivedStatus,
        },
      });
    }),

  // TODO: Brainstorm more on the customer / shipping address relationship
  createManual: ownerAdminProcedure
    .use(featureGate("orders"))
    .input(manualOrderFormSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      // Fetch business info upfront (needed for email and order creation)
      const business = await ctx.db.business.findUnique({
        where: { id: businessId },
        include: { siteContent: { select: { logoUrl: true } } },
      });

      if (!business) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Business not found" });
      }

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

      // Find or create shipping address (optional)
      let shippingAddressId: string | undefined;
      if (input.shippingAddress) {
        const shippingName = input.shippingName?.trim() ?? input.customerName;
        const shippingNameParts = shippingName.split(" ");
        const shippingFirstName = shippingNameParts[0] ?? firstName;
        const shippingLastName = shippingNameParts.slice(1).join(" ") || lastName;

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
      }

      // Generate order number
      const orderCount = await ctx.db.order.count({
        where: { businessId },
      });

      // Auto-stamp internal note
      const baseNote = input.notes?.trim() ?? "";
      const internalNote = baseNote
        ? `[Manual Order]\n${baseNote}`
        : "[Manual Order]";

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

          status: input.status,
          paymentStatus: input.paymentStatus,
          fulfillmentStatus: input.fulfillmentStatus,

          // Shipping (optional)
          shippingAddressId,

          // Notes
          internalNote,

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

      // Optionally send order confirmation email to customer
      if (input.sendConfirmationEmail) {
        try {
          await sendOrderConfirmation({
            to: input.customerEmail,
            orderNumber: order.orderNumber,
            customerName: input.customerName,
            items: order.items,
            subtotal: order.subtotal,
            shipping: order.shipping,
            tax: order.tax,
            discount: order.discount,
            total: order.total,
            business: {
              name: business.name,
              ownerEmail: business.ownerEmail,
              siteContent: business.siteContent,
              subdomain: business.subdomain,
              customDomain: business.customDomain ?? undefined,
            },
          });
          console.log(
            `[Manual Order] Confirmation email sent to ${input.customerEmail}`,
          );
        } catch (emailError) {
          console.error(
            "[Manual Order] Failed to send confirmation email:",
            emailError,
          );
        }
      }

      // Note: Customer metrics are NOT updated for manual/pending orders
      // They will be updated when the order is marked as paid

      return order;
    }),

  updateFulfillment: ownerAdminProcedure
    .use(featureGate("orders"))
    .input(updateFulfillmentSchema)
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

  updateNote: ownerAdminProcedure
    .use(featureGate("orders"))
    .input(
      z.object({
        orderId: z.string(),
        internalNote: z.string().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      const order = await ctx.db.order.findFirst({
        where: { id: input.orderId, businessId },
      });

      if (!order) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      }

      return ctx.db.order.update({
        where: { id: input.orderId },
        data: { internalNote: input.internalNote },
      });
    }),

  markAsRefunded: ownerAdminProcedure
    .use(featureGate("orders"))
    .input(
      z.object({
        orderId: z.string(),
        reason: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      const order = await ctx.db.order.findFirst({
        where: { id: input.orderId, businessId },
        include: {
          business: {
            select: {
              name: true,
              ownerEmail: true,
              subdomain: true,
              customDomain: true,
              siteContent: { select: { logoUrl: true } },
            },
          },
        },
      });

      if (!order) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      }

      if (order.status === "refunded") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Order is already refunded",
        });
      }

      const updatedOrder = await ctx.db.order.update({
        where: { id: input.orderId },
        data: {
          status: "refunded",
          paymentStatus: "refunded",
        },
      });

      try {
        const reasonLabel = input.reason
          ? (STRIPE_REFUND_REASON_LABEL[input.reason] ?? input.reason)
          : null;
        await sendOrderRefunded({
          to: order.customerEmail,
          orderNumber: order.orderNumber,
          customerName: order.customerName ?? "Guest",
          refundAmountCents: order.total,
          orderTotalCents: order.total,
          isFullRefund: true,
          reason: reasonLabel,
          business: {
            name: order.business.name,
            ownerEmail: order.business.ownerEmail,
            siteContent: order.business.siteContent,
            subdomain: order.business.subdomain,
            customDomain: order.business.customDomain,
          },
        });
        console.log(
          `[Orders] Manual refund email sent for order #${order.orderNumber}`,
        );
      } catch (emailError) {
        console.error(
          "[Orders] Failed to send manual refund email:",
          emailError,
        );
      }

      return updatedOrder;
    }),
});
