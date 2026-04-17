import { Prisma } from "generated/prisma";
import type Stripe from "stripe";
import * as Sentry from "@sentry/nextjs";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { findOrCreateShippingAddress } from "~/lib/address-utils";
import {
  sendOrderCancelled,
  sendOrderConfirmation,
  sendOrderFulfilled,
  sendOrderRefunded,
  sendOrderShipped,
} from "~/lib/email/templates";
import { restorePoolInventory } from "~/lib/inventory";
import { stripeClient } from "~/lib/stripe/client";
import {
  addShipmentSchema,
  manualOrderFormSchema,
  markAsRefundedSchema,
  markAsFulfilledSchema,
  orderFiltersSchema,
  refundOrderSchema,
  updateFulfillmentSchema,
  updateOrderStatusSchema,
  updatePaymentStatusSchema,
  updateShipmentSchema,
  updateShippingAddressSchema,
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

      const updatedOrder = await ctx.db.order.update({
        where: { id: input.orderId },
        data: {
          status: "fulfilled",
          fulfillmentStatus: "fulfilled",
          shipments: {
            create: input.shipments.map((s) => ({
              carrier: s.carrier?.trim() ?? null,
              trackingNumber: s.trackingNumber?.trim() ?? null,
              trackingUrl: s.trackingUrl?.trim() ?? null,
            })),
          },
        },
        include: { shipments: { orderBy: { shippedAt: "asc" } } },
      });

      const shipmentsWithTracking = updatedOrder.shipments.filter(
        (s) => s.trackingNumber,
      );
      const anyTracking = shipmentsWithTracking.length > 0;

      try {
        if (anyTracking) {
          for (const shipment of shipmentsWithTracking) {
            await sendOrderShipped({
              to: order.customerEmail,
              orderNumber: order.orderNumber,
              customerName: order.customerName ?? "Guest",
              trackingNumber: shipment.trackingNumber!,
              trackingUrl: shipment.trackingUrl ?? "",
              carrier: shipment.carrier ?? "",
              business: {
                name: order.business.name,
                ownerEmail: order.business.ownerEmail,
                siteContent: order.business.siteContent,
                subdomain: order.business.subdomain,
              },
            });
          }
          console.log(
            `[Orders] Shipped email(s) sent for order #${order.orderNumber}`,
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
              domainStatus: order.business.domainStatus,
            },
          });
          console.log(
            `[Orders] Fulfilled email sent for order #${order.orderNumber}`,
          );
        }
      } catch (emailError) {
        console.error("[Orders] Failed to send fulfillment email:", emailError);
        Sentry.captureException(emailError, {
          tags: {
            "trpc.procedure": "order.markAsFulfilled",
            "email.type": "fulfillment",
          },
        });
      }

      return updatedOrder;
    }),

  addShipment: ownerAdminProcedure
    .use(featureGate("orders"))
    .input(addShipmentSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      const order = await ctx.db.order.findFirst({
        where: { id: input.orderId, businessId },
        include: {
          business: {
            include: { siteContent: { select: { logoUrl: true } } },
          },
        },
      });

      if (!order) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      }

      const shipment = await ctx.db.orderShipment.create({
        data: {
          orderId: input.orderId,
          carrier: input.carrier?.trim() ?? null,
          trackingNumber: input.trackingNumber?.trim() ?? null,
          trackingUrl: input.trackingUrl?.trim() ?? null,
        },
      });

      try {
        if (shipment.trackingNumber) {
          await sendOrderShipped({
            to: order.customerEmail,
            orderNumber: order.orderNumber,
            customerName: order.customerName ?? "Guest",
            trackingNumber: shipment.trackingNumber,
            trackingUrl: shipment.trackingUrl ?? "",
            carrier: shipment.carrier ?? "",
            business: {
              name: order.business.name,
              ownerEmail: order.business.ownerEmail,
              siteContent: order.business.siteContent,
              subdomain: order.business.subdomain,
            },
          });
          console.log(
            `[Orders] Additional shipped email sent for order #${order.orderNumber}`,
          );
        } else if (order.fulfillmentStatus !== "fulfilled") {
          // Only send "fulfilled" email if this is the first time the order is
          // being marked fulfilled. Calling addShipment on an already-fulfilled
          // order (e.g. to add a second package with no tracking) would otherwise
          // send a duplicate "your order has been fulfilled" email.
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
              domainStatus: order.business.domainStatus,
            },
          });
        }
      } catch (emailError) {
        console.error("[Orders] Failed to send shipment email:", emailError);
        Sentry.captureException(emailError, {
          tags: {
            "trpc.procedure": "order.addShipment",
            "email.type": "shipment",
          },
        });
      }

      return shipment;
    }),

  updateShipment: ownerAdminProcedure
    .use(featureGate("orders"))
    .input(updateShipmentSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      // Scope to businessId via the parent order
      const shipment = await ctx.db.orderShipment.findFirst({
        where: {
          id: input.shipmentId,
          order: { businessId },
        },
      });

      if (!shipment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Shipment not found",
        });
      }

      return ctx.db.orderShipment.update({
        where: { id: input.shipmentId },
        data: {
          carrier: input.carrier?.trim() ?? shipment.carrier,
          trackingNumber:
            input.trackingNumber?.trim() ?? shipment.trackingNumber,
          trackingUrl: input.trackingUrl?.trim() ?? shipment.trackingUrl,
        },
      });
    }),

  resendEmail: ownerAdminProcedure
    .use(featureGate("orders"))
    .input(
      z.object({
        orderId: z.string(),
        type: z.enum(["confirmation", "shipped", "fulfilled", "refunded"]),
        shipmentId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      const order = await ctx.db.order.findFirst({
        where: { id: input.orderId, businessId },
        include: {
          items: true,
          shippingAddress: true,
          shipments: { orderBy: { shippedAt: "asc" } },
          business: {
            include: { siteContent: { select: { logoUrl: true } } },
          },
        },
      });

      if (!order) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      }

      const { business } = order;

      switch (input.type) {
        case "confirmation": {
          await sendOrderConfirmation({
            to: order.customerEmail,
            orderNumber: order.orderNumber,
            customerName: order.customerName ?? "Guest",
            items: order.items,
            subtotal: order.subtotal,
            shipping: order.shipping,
            tax: order.tax,
            discount: order.discount,
            total: order.total,
            shippingAddress: order.shippingAddress,
            business: {
              name: business.name,
              ownerEmail: business.ownerEmail,
              siteContent: business.siteContent,
              subdomain: business.subdomain,
              customDomain: business.customDomain,
              domainStatus: business.domainStatus,
            },
          });
          break;
        }
        case "shipped": {
          if (!input.shipmentId) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "shipmentId is required for type 'shipped'",
            });
          }
          const shipment = order.shipments.find(
            (s) => s.id === input.shipmentId,
          );
          if (!shipment) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Shipment not found",
            });
          }
          await sendOrderShipped({
            to: order.customerEmail,
            orderNumber: order.orderNumber,
            customerName: order.customerName ?? "Guest",
            trackingNumber: shipment.trackingNumber ?? "",
            trackingUrl: shipment.trackingUrl ?? "",
            carrier: shipment.carrier ?? "",
            business: {
              name: business.name,
              ownerEmail: business.ownerEmail,
              siteContent: business.siteContent,
              subdomain: business.subdomain,
            },
          });
          break;
        }
        case "fulfilled": {
          await sendOrderFulfilled({
            to: order.customerEmail,
            orderNumber: order.orderNumber,
            customerName: order.customerName ?? "Guest",
            business: {
              name: business.name,
              ownerEmail: business.ownerEmail,
              siteContent: business.siteContent,
              subdomain: business.subdomain,
              customDomain: business.customDomain,
              domainStatus: business.domainStatus,
            },
          });
          break;
        }
        case "refunded": {
          const storedRefund = order.refundAmountCents ?? order.total;
          const isFullRefundResend = storedRefund >= order.total;
          await sendOrderRefunded({
            to: order.customerEmail,
            orderNumber: order.orderNumber,
            customerName: order.customerName ?? "Guest",
            refundAmountCents: storedRefund,
            orderTotalCents: order.total,
            isFullRefund: isFullRefundResend,
            reason: order.refundReason ?? null,
            business: {
              name: business.name,
              ownerEmail: business.ownerEmail,
              siteContent: business.siteContent,
              subdomain: business.subdomain,
              customDomain: business.customDomain,
              domainStatus: business.domainStatus,
            },
          });
          break;
        }
      }

      console.log(
        `[Orders] Resent '${input.type}' email for order #${order.orderNumber}`,
      );
      return { success: true };
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
          shipments: { orderBy: { shippedAt: "asc" } },
        },
      });

      return order;
    }),

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
              domainStatus: true,
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

      const alreadyRefunded = order.refundAmountCents ?? 0;
      const maxRefundable = order.total - alreadyRefunded;

      if (input.amount > maxRefundable) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            alreadyRefunded > 0
              ? `Refund amount cannot exceed the remaining refundable amount ($${(maxRefundable / 100).toFixed(2)})`
              : "Refund amount cannot exceed order total",
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

      const newTotalRefunded = alreadyRefunded + input.amount;
      const isFullRefund = newTotalRefunded >= order.total;
      const reasonLabel = input.reason
        ? (STRIPE_REFUND_REASON_LABEL[input.reason] ?? input.reason)
        : null;

      const updatedOrder = await ctx.db.order.update({
        where: { id: input.orderId },
        data: {
          status: isFullRefund ? "refunded" : "partial_refund",
          ...(isFullRefund && { paymentStatus: "refunded" }),
          refundReason: reasonLabel,
          refundAmountCents: newTotalRefunded,
        },
        include: {
          items: true,
        },
      });

      // Restore inventory only when explicitly requested
      if (input.restockItems) {
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
                      select: { businessId: true, trackInventory: true },
                    },
                  },
                });

                if (!variant) continue;
                if (!variant.product.trackInventory) continue;

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
                    note: `Refund Order #${updatedOrder.orderNumber}`,
                    orderId: updatedOrder.id,
                  },
                });
              } else if (item.productId) {
                const product = await tx.product.findUnique({
                  where: { id: item.productId },
                  select: {
                    id: true,
                    inventoryQty: true,
                    businessId: true,
                    trackInventory: true,
                    baseInventoryUnitId: true,
                    baseUnitsConsumed: true,
                  },
                });

                if (!product) continue;

                // Pool-based product — restore pool inventory
                if (product.baseInventoryUnitId) {
                  await restorePoolInventory(tx, {
                    poolId: product.baseInventoryUnitId,
                    items: [{ productId: product.id, quantity: item.quantity }],
                    unitsConsumedMap: { [product.id]: product.baseUnitsConsumed ?? 1 },
                    orderId: updatedOrder.id,
                    orderNumber: updatedOrder.orderNumber,
                    businessId: product.businessId,
                  });
                  continue;
                }

                if (!product.trackInventory) continue;

                const newQty = product.inventoryQty + item.quantity;

                await tx.product.update({
                  where: { id: item.productId },
                  data: { inventoryQty: newQty },
                });

                await tx.inventoryHistory.create({
                  data: {
                    productId: item.productId,
                    businessId: product.businessId,
                    previousQty: product.inventoryQty,
                    newQty,
                    changeQty: item.quantity,
                    reason: "return",
                    note: `Refund Order #${updatedOrder.orderNumber}`,
                    orderId: updatedOrder.id,
                    variantId: null,
                  },
                });

                if (newQty > 0) {
                  await tx.product.updateMany({
                    where: { id: item.productId, outOfStockAlertSent: true },
                    data: { outOfStockAlertSent: false, lowInventoryAlertSent: false },
                  });
                }
              }
            }
          });
        } catch (invError) {
          console.error("Failed to restore inventory:", invError);
        }
      }

      if (input.sendEmail) {
        try {
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
              domainStatus: order.business.domainStatus,
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

      const isCancelling = input.status === "cancelled";

      const order = await ctx.db.order.findFirst({
        where: { id: input.orderId, businessId },
        include: {
          items: true,
          business: {
            select: {
              name: true,
              ownerEmail: true,
              subdomain: true,
              customDomain: true,
              domainStatus: true,
              siteContent: { select: { logoUrl: true } },
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

      const wasUnpaid =
        order.paymentStatus === "unpaid" || order.status === "pending";
      const isPaid = input.status === "paid";

      const updatedOrder = await ctx.db.order.update({
        where: { id: input.orderId },
        data: {
          status: input.status,
          paymentStatus: isPaid ? "paid" : order.paymentStatus,
        },
      });

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

      // Handle cancellation side-effects
      if (isCancelling) {
        const hadInventoryDeducted =
          order.status === "paid" || order.status === "fulfilled";

        if (input.restockItems && hadInventoryDeducted) {
          try {
            await ctx.db.$transaction(async (tx) => {
              for (const item of order.items) {
                if (item.productVariantId) {
                  const variant = await tx.productVariant.findUnique({
                    where: { id: item.productVariantId },
                    select: {
                      id: true,
                      inventoryQty: true,
                      productId: true,
                      product: { select: { businessId: true, trackInventory: true } },
                    },
                  });
                  if (!variant) continue;
                  if (!variant.product.trackInventory) continue;
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
                      note: `Cancelled Order #${order.orderNumber}`,
                      orderId: order.id,
                    },
                  });
                } else if (item.productId) {
                  const product = await tx.product.findUnique({
                    where: { id: item.productId },
                    select: {
                      id: true,
                      inventoryQty: true,
                      businessId: true,
                      trackInventory: true,
                      baseInventoryUnitId: true,
                      baseUnitsConsumed: true,
                    },
                  });
                  if (!product) continue;

                  if (product.baseInventoryUnitId) {
                    await restorePoolInventory(tx, {
                      poolId: product.baseInventoryUnitId,
                      items: [{ productId: product.id, quantity: item.quantity }],
                      unitsConsumedMap: { [product.id]: product.baseUnitsConsumed ?? 1 },
                      orderId: order.id,
                      orderNumber: order.orderNumber,
                      businessId: product.businessId,
                    });
                    continue;
                  }

                  if (!product.trackInventory) continue;
                  const newQty = product.inventoryQty + item.quantity;
                  await tx.product.update({
                    where: { id: item.productId },
                    data: { inventoryQty: newQty },
                  });
                  await tx.inventoryHistory.create({
                    data: {
                      productId: item.productId,
                      businessId: product.businessId,
                      previousQty: product.inventoryQty,
                      newQty,
                      changeQty: item.quantity,
                      reason: "return",
                      note: `Cancelled Order #${order.orderNumber}`,
                      orderId: order.id,
                      variantId: null,
                    },
                  });
                  if (newQty > 0) {
                    await tx.product.updateMany({
                      where: { id: item.productId, outOfStockAlertSent: true },
                      data: { outOfStockAlertSent: false, lowInventoryAlertSent: false },
                    });
                  }
                }
              }
            });
            console.log(
              `[Order Status] Inventory restocked for cancelled order #${order.orderNumber}`,
            );
          } catch (invError) {
            console.error(
              "[Order Status] Failed to restock inventory on cancellation:",
              invError,
            );
          }
        }

        if (input.sendEmail) {
          try {
            await sendOrderCancelled({
              to: order.customerEmail,
              orderNumber: order.orderNumber,
              customerName: order.customerName ?? "Guest",
              business: {
                name: order.business.name,
                ownerEmail: order.business.ownerEmail,
                siteContent: order.business.siteContent,
                subdomain: order.business.subdomain,
                customDomain: order.business.customDomain,
              domainStatus: order.business.domainStatus,
              },
            });
            console.log(
              `[Order Status] Cancellation email sent for order #${order.orderNumber}`,
            );
          } catch (emailError) {
            console.error(
              "[Order Status] Failed to send cancellation email:",
              emailError,
            );
          }
        }
      }

      return updatedOrder;
    }),

  updatePaymentStatus: ownerAdminProcedure
    .use(featureGate("orders"))
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

  createManual: ownerAdminProcedure
    .use(featureGate("orders"))
    .input(manualOrderFormSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      const business = await ctx.db.business.findUnique({
        where: { id: businessId },
        include: { siteContent: { select: { logoUrl: true } } },
      });

      if (!business) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Business not found",
        });
      }

      const nameParts = input.customerName.trim().split(" ");
      const firstName = nameParts[0] ?? "Guest";
      const lastName = nameParts.slice(1).join(" ") || "";

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

      let shippingAddressId: string | undefined;
      if (input.shippingAddress) {
        const shippingName = input.shippingName?.trim() ?? input.customerName;
        const shippingNameParts = shippingName.split(" ");
        const shippingFirstName = shippingNameParts[0] ?? firstName;
        const shippingLastName =
          shippingNameParts.slice(1).join(" ") || lastName;

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

      const baseNote = input.notes?.trim() ?? "";
      const internalNote = baseNote
        ? `[Manual Order]\n${baseNote}`
        : "[Manual Order]";

      // Derive paymentMethod: use provided value or default based on payment source
      const paymentMethod = input.paymentMethod?.trim() ?? "manual";

      // Retry up to 3 times on orderNumber unique-constraint conflict — concurrent
      // manual order creation can race and produce the same number.
      const getNextOrderNumber = async () => {
        const lastOrder = await ctx.db.order.findFirst({
          where: { businessId },
          orderBy: { orderNumber: "desc" },
          select: { orderNumber: true },
        });
        return (lastOrder?.orderNumber ?? 0) + 1;
      };

      let orderNumber = await getNextOrderNumber();
      const order = await (async () => {
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            return await ctx.db.order.create({
              data: {
                orderNumber,
                businessId,
                customerId: customer.id,
                customerEmail: input.customerEmail,
                customerName: input.customerName,

                subtotal: input.subtotal,
                tax: input.tax ?? 0,
                shipping: input.shipping ?? 0,
                total: input.total,

                status: input.status,
                paymentStatus: input.paymentStatus,
                paymentMethod,
                fulfillmentStatus: input.fulfillmentStatus,

                shippingAddressId,
                internalNote,

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
              include: { items: true },
            });
          } catch (createErr: unknown) {
            const isOrderNumberConflict =
              createErr instanceof Prisma.PrismaClientKnownRequestError &&
              createErr.code === "P2002" &&
              (createErr.meta?.target as string[] | undefined)?.some(
                (f) =>
                  f === "orderNumber" ||
                  f === "Order_businessId_orderNumber_key",
              );
            if (attempt < 2 && isOrderNumberConflict) {
              orderNumber = await getNextOrderNumber();
              continue;
            }
            throw createErr;
          }
        }
        throw new Error("[createManual] Order creation retry exhausted");
      })();

      console.log(`[Manual Order] Order created: ${order.id}`);

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
              domainStatus: business.domainStatus,
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
    .input(markAsRefundedSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      const order = await ctx.db.order.findFirst({
        where: { id: input.orderId, businessId },
        include: {
          items: true,
          business: {
            select: {
              name: true,
              ownerEmail: true,
              subdomain: true,
              customDomain: true,
              domainStatus: true,
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

      const reasonLabel = input.reason
        ? (STRIPE_REFUND_REASON_LABEL[input.reason] ?? input.reason)
        : null;

      const updatedOrder = await ctx.db.order.update({
        where: { id: input.orderId },
        data: {
          status: "refunded",
          paymentStatus: "refunded",
          refundReason: reasonLabel,
          refundAmountCents: order.total,
        },
      });

      if (input.restockItems) {
        try {
          await ctx.db.$transaction(async (tx) => {
            for (const item of order.items) {
              if (item.productVariantId) {
                const variant = await tx.productVariant.findUnique({
                  where: { id: item.productVariantId },
                  select: {
                    id: true,
                    inventoryQty: true,
                    productId: true,
                    product: { select: { businessId: true, trackInventory: true } },
                  },
                });
                if (!variant) continue;
                if (!variant.product.trackInventory) continue;
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
                    note: `Manual Refund Order #${order.orderNumber}`,
                    orderId: order.id,
                  },
                });
              } else if (item.productId) {
                const product = await tx.product.findUnique({
                  where: { id: item.productId },
                  select: {
                    id: true,
                    inventoryQty: true,
                    businessId: true,
                    trackInventory: true,
                    baseInventoryUnitId: true,
                    baseUnitsConsumed: true,
                  },
                });
                if (!product) continue;

                if (product.baseInventoryUnitId) {
                  await restorePoolInventory(tx, {
                    poolId: product.baseInventoryUnitId,
                    items: [{ productId: product.id, quantity: item.quantity }],
                    unitsConsumedMap: { [product.id]: product.baseUnitsConsumed ?? 1 },
                    orderId: order.id,
                    orderNumber: order.orderNumber,
                    businessId: product.businessId,
                  });
                  continue;
                }

                if (!product.trackInventory) continue;
                const newQty = product.inventoryQty + item.quantity;
                await tx.product.update({
                  where: { id: item.productId },
                  data: { inventoryQty: newQty },
                });
                await tx.inventoryHistory.create({
                  data: {
                    productId: item.productId,
                    businessId: product.businessId,
                    previousQty: product.inventoryQty,
                    newQty,
                    changeQty: item.quantity,
                    reason: "return",
                    note: `Manual Refund Order #${order.orderNumber}`,
                    orderId: order.id,
                    variantId: null,
                  },
                });
                if (newQty > 0) {
                  await tx.product.updateMany({
                    where: { id: item.productId, outOfStockAlertSent: true },
                    data: { outOfStockAlertSent: false, lowInventoryAlertSent: false },
                  });
                }
              }
            }
          });
        } catch (invError) {
          console.error("[Orders] Failed to restore inventory on manual refund:", invError);
        }
      }

      if (input.sendEmail) {
        try {
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
              domainStatus: order.business.domainStatus,
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
      }

      return updatedOrder;
    }),

  updateShippingAddress: ownerAdminProcedure
    .use(featureGate("orders"))
    .input(updateShippingAddressSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      const order = await ctx.db.order.findFirst({
        where: { id: input.orderId, businessId },
        select: { id: true, shippingAddressId: true, customerId: true },
      });

      if (!order) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      }

      const addressData = {
        firstName: input.firstName,
        lastName: input.lastName,
        company: input.company ?? null,
        address1: input.address1,
        address2: input.address2 ?? null,
        city: input.city,
        province: input.province ?? null,
        zip: input.zip,
        country: input.country,
        phone: input.phone ?? null,
      };

      if (order.shippingAddressId) {
        await ctx.db.shippingAddress.update({
          where: { id: order.shippingAddressId },
          data: addressData,
        });
      } else if (order.customerId) {
        const newAddress = await ctx.db.shippingAddress.create({
          data: { ...addressData, customerId: order.customerId },
        });
        await ctx.db.order.update({
          where: { id: input.orderId },
          data: { shippingAddressId: newAddress.id },
        });
      } else {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot add a shipping address: order has no linked customer",
        });
      }
    }),
});
