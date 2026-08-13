import type Stripe from "stripe";
import { Prisma } from "generated/prisma";
import * as Sentry from "@sentry/nextjs";
import { TRPCError } from "@trpc/server";
import { carrierLabel } from "~/data/fulfillment-constants";
import { z } from "zod";

import type { OrderSortValue } from "~/lib/validators/order";
import { findOrCreateShippingAddress } from "~/lib/address-utils";
import {
  sendOrderCancelled,
  sendOrderConfirmation,
  sendOrderFulfilled,
  sendOrderReadyForPickup,
  sendOrderRefunded,
  sendOrderShipped,
} from "~/lib/email/templates";
import { deductPoolInventory, restorePoolInventory } from "~/lib/inventory";
import { stripeClient } from "~/lib/stripe/client";
import { normalizeEmail } from "~/lib/utils";
import { MAX_REQUESTED_PAGE } from "~/lib/validators/admin-table";
import {
  addShipmentSchema,
  buildOrderListWhere,
  computeManualOrderTotals,
  manualOrderInputSchema,
  markAsFulfilledSchema,
  markAsRefundedSchema,
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
  staffProcedure,
} from "~/server/api/trpc";

/**
 * What the admin Orders TABLE needs per row, and nothing else. It renders an
 * item count and an oversell badge, so both are counts — `include: { items:
 * true }` was shipping every column of every OrderItem for a whole page of
 * orders into the RSC payload to be reduced to `items.length`.
 */
const LIST_INCLUDE = {
  _count: {
    select: {
      items: true,
      inventoryHistory: { where: { reason: "oversell" } },
    },
  },
} satisfies Prisma.OrderInclude;

const STRIPE_REFUND_REASON_LABEL: Record<string, string> = {
  requested_by_customer: "Customer requested refund",
  duplicate: "Duplicate order",
  fraudulent: "Fraudulent order",
};

type ShipmentItemRequest = { orderItemId: string; quantity: number };

/**
 * Validates requested per-item shipment quantities against what is still
 * unfulfilled on the order — cumulatively across every shipment in the
 * request, so two packages can't both claim the same remaining unit.
 * Returns the aggregated requested quantity per orderItemId.
 * Throws BAD_REQUEST naming the offending item.
 */
function aggregateAndValidateShipmentItems(
  orderItems: {
    id: string;
    productName: string;
    quantity: number;
    fulfilledQuantity: number;
  }[],
  shipmentItemLists: ShipmentItemRequest[][],
): Map<string, number> {
  const itemMap = new Map(orderItems.map((item) => [item.id, item]));
  const requested = new Map<string, number>();

  for (const items of shipmentItemLists) {
    for (const entry of items) {
      const orderItem = itemMap.get(entry.orderItemId);
      if (!orderItem) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Item ${entry.orderItemId} does not belong to this order`,
        });
      }
      const alreadyRequested = requested.get(entry.orderItemId) ?? 0;
      const remaining = Math.max(
        0,
        orderItem.quantity - orderItem.fulfilledQuantity - alreadyRequested,
      );
      if (entry.quantity > remaining) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot ship ${entry.quantity} × ${orderItem.productName} — only ${remaining} unit${remaining === 1 ? "" : "s"} remaining to fulfill`,
        });
      }
      requested.set(entry.orderItemId, alreadyRequested + entry.quantity);
    }
  }

  return requested;
}

export const orderRouter = createTRPCRouter({
  markAsFulfilled: staffProcedure
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

      // Shipments carrying explicit line items drive partial fulfillment.
      // A request with no itemized shipments is the legacy path: everything
      // on the order is considered shipped.
      const { createdShipments, updatedOrder } = await ctx.db.$transaction(
        async (tx) => {
          const orderItems = await tx.orderItem.findMany({
            where: { orderId: input.orderId },
          });

          const itemizedShipments = input.shipments.filter(
            (s): s is typeof s & { items: ShipmentItemRequest[] } =>
              !!s.items && s.items.length > 0,
          );

          // Validate + aggregate requested quantities (throws BAD_REQUEST).
          const requested = aggregateAndValidateShipmentItems(
            orderItems,
            itemizedShipments.map((s) => s.items),
          );

          const createdShipments = [];
          for (const s of input.shipments) {
            createdShipments.push(
              await tx.orderShipment.create({
                data: {
                  orderId: input.orderId,
                  carrier: s.carrier?.trim() ?? null,
                  trackingNumber: s.trackingNumber?.trim() ?? null,
                  trackingUrl: s.trackingUrl?.trim() ?? null,
                  ...(s.items && s.items.length > 0 && { items: s.items }),
                },
              }),
            );
          }

          if (itemizedShipments.length > 0) {
            for (const [orderItemId, qty] of requested) {
              await tx.orderItem.update({
                where: { id: orderItemId },
                data: { fulfilledQuantity: { increment: qty } },
              });
            }
          } else {
            // Legacy whole-order fulfillment: everything ships.
            for (const item of orderItems) {
              if (item.fulfilledQuantity !== item.quantity) {
                await tx.orderItem.update({
                  where: { id: item.id },
                  data: { fulfilledQuantity: item.quantity },
                });
              }
            }
          }

          const finalItems = await tx.orderItem.findMany({
            where: { orderId: input.orderId },
            select: { quantity: true, fulfilledQuantity: true },
          });
          const fullyFulfilled = finalItems.every(
            (i) => i.fulfilledQuantity >= i.quantity,
          );

          const updatedOrder = await tx.order.update({
            where: { id: input.orderId },
            data: fullyFulfilled
              ? {
                  status: order.paymentStatus === "paid" ? "completed" : "open",
                  fulfillmentStatus: "fulfilled",
                }
              : { fulfillmentStatus: "partially_fulfilled" },
            include: { shipments: { orderBy: { shippedAt: "asc" } } },
          });

          return { createdShipments, updatedOrder };
        },
      );

      // Only email about the shipments created in THIS request — a partially
      // fulfilled order can be fulfilled again later, and we must not re-send
      // tracking emails for its earlier shipments.
      const shipmentsWithTracking = createdShipments.filter(
        (s) => s.trackingNumber,
      );
      const anyTracking = shipmentsWithTracking.length > 0;
      const becameFullyFulfilled =
        updatedOrder.fulfillmentStatus === "fulfilled";

      try {
        if (anyTracking) {
          for (const shipment of shipmentsWithTracking) {
            await sendOrderShipped({
              to: order.customerEmail,
              orderNumber: order.orderNumber,
              customerName: order.customerName ?? "Guest",
              trackingNumber: shipment.trackingNumber!,
              trackingUrl: shipment.trackingUrl ?? "",
              carrier: carrierLabel(shipment.carrier),
              business: {
                name: order.business.name,
                ownerEmail: order.business.ownerEmail,
                siteContent: order.business.siteContent,
                subdomain: order.business.subdomain,
                customDomain: order.business.customDomain,
                domainStatus: order.business.domainStatus,
              },
              orderId: order.id,
            });
          }
          console.log(
            `[Orders] Shipped email(s) sent for order #${order.orderNumber}`,
          );
        } else if (becameFullyFulfilled) {
          // The "fulfilled" (no-tracking) email is only correct when the
          // whole order is now fulfilled — skip it for partial shipments.
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

  markReadyForPickup: staffProcedure
    .use(featureGate("orders"))
    .input(z.object({ orderId: z.string() }))
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

      if (order.deliveryMethod !== "pickup") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This order is not a pickup order",
        });
      }

      const updatedOrder = await ctx.db.order.update({
        where: { id: input.orderId },
        data: {
          fulfillmentStatus: "fulfilled",
          status: order.paymentStatus === "paid" ? "completed" : order.status,
        },
      });

      try {
        await sendOrderReadyForPickup({
          to: order.customerEmail,
          orderNumber: order.orderNumber,
          customerName: order.customerName ?? undefined,
          pickupLocation:
            order.business.pickupLocation ??
            order.business.businessAddress ??
            undefined,
          pickupInstructions: order.business.pickupInstructions ?? undefined,
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
          `[Orders] Ready for pickup email sent for order #${order.orderNumber}`,
        );
      } catch (emailError) {
        console.error(
          "[Orders] Failed to send ready-for-pickup email:",
          emailError,
        );
        Sentry.captureException(emailError, {
          tags: {
            "trpc.procedure": "order.markReadyForPickup",
            "email.type": "ready-for-pickup",
          },
        });
      }

      return updatedOrder;
    }),

  addShipment: staffProcedure
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

      const { shipment, updatedOrder } = await ctx.db.$transaction(
        async (tx) => {
          const orderItems = await tx.orderItem.findMany({
            where: { orderId: input.orderId },
          });

          const hasItems = !!input.items && input.items.length > 0;
          // Validate + aggregate requested quantities (throws BAD_REQUEST).
          const requested = hasItems
            ? aggregateAndValidateShipmentItems(orderItems, [input.items!])
            : null;

          const shipment = await tx.orderShipment.create({
            data: {
              orderId: input.orderId,
              carrier: input.carrier?.trim() ?? null,
              trackingNumber: input.trackingNumber?.trim() ?? null,
              trackingUrl: input.trackingUrl?.trim() ?? null,
              ...(hasItems && { items: input.items }),
            },
          });

          if (requested) {
            for (const [orderItemId, qty] of requested) {
              await tx.orderItem.update({
                where: { id: orderItemId },
                data: { fulfilledQuantity: { increment: qty } },
              });
            }
          } else {
            // Legacy path: a shipment without line items ships everything
            // remaining on the order.
            for (const item of orderItems) {
              if (item.fulfilledQuantity !== item.quantity) {
                await tx.orderItem.update({
                  where: { id: item.id },
                  data: { fulfilledQuantity: item.quantity },
                });
              }
            }
          }

          const finalItems = await tx.orderItem.findMany({
            where: { orderId: input.orderId },
            select: { quantity: true, fulfilledQuantity: true },
          });
          const fullyFulfilled = finalItems.every(
            (i) => i.fulfilledQuantity >= i.quantity,
          );

          const updatedOrder = await tx.order.update({
            where: { id: input.orderId },
            data: fullyFulfilled
              ? {
                  fulfillmentStatus: "fulfilled",
                  ...(order.paymentStatus === "paid" && {
                    status: "completed",
                  }),
                }
              : { fulfillmentStatus: "partially_fulfilled" },
          });

          return { shipment, updatedOrder };
        },
      );

      try {
        if (shipment.trackingNumber) {
          await sendOrderShipped({
            to: order.customerEmail,
            orderNumber: order.orderNumber,
            customerName: order.customerName ?? "Guest",
            trackingNumber: shipment.trackingNumber,
            trackingUrl: shipment.trackingUrl ?? "",
            carrier: carrierLabel(shipment.carrier),
            business: {
              name: order.business.name,
              ownerEmail: order.business.ownerEmail,
              siteContent: order.business.siteContent,
              subdomain: order.business.subdomain,
              customDomain: order.business.customDomain,
              domainStatus: order.business.domainStatus,
            },
            orderId: order.id,
          });
          console.log(
            `[Orders] Additional shipped email sent for order #${order.orderNumber}`,
          );
        } else if (
          order.fulfillmentStatus !== "fulfilled" &&
          updatedOrder.fulfillmentStatus === "fulfilled"
        ) {
          // Only send "fulfilled" email if this shipment just completed the
          // order for the first time. Calling addShipment on an already-fulfilled
          // order (e.g. to add a second package with no tracking) would otherwise
          // send a duplicate "your order has been fulfilled" email, and a partial
          // shipment with no tracking shouldn't claim the order is fulfilled.
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

  updateShipment: staffProcedure
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
            orderId: order.id,
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
            carrier: carrierLabel(shipment.carrier),
            business: {
              name: business.name,
              ownerEmail: business.ownerEmail,
              siteContent: business.siteContent,
              subdomain: business.subdomain,
              customDomain: business.customDomain,
              domainStatus: business.domainStatus,
            },
            orderId: order.id,
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

  getAll: staffProcedure
    .use(featureGate("orders"))
    .input(orderFiltersSchema)
    .query(async ({ ctx, input }) => {
      const { businessId } = ctx;

      // Shared with `export.exportOrders` so "Export CSV" always exports what
      // the table shows — see ~/lib/validators/order.
      const where = buildOrderListWhere({
        businessId,
        status: input.status,
        fulfillment: input.fulfillment,
        paymentStatus: input.paymentStatus,
        search: input.search,
      });

      // Sort. Each entry is the PRIMARY ordering only — `id` is appended below
      // as a mandatory tie-break, mirroring product.secureList / customer.list
      // and the guarantee `buildTablePage` makes for the in-memory admin tables
      // (~/app/admin/_lib/table-query). Without it, orders sharing a `createdAt`
      // (routine — a webhook burst writes several within the same millisecond)
      // or a `total` have no defined relative order, Postgres is free to return
      // them differently between executions, and with pagination that renders
      // one order on two pages and another on none.
      //
      // `total` is unindexed, unlike `createdAt`; at small-business scale (tens
      // to low thousands of orders) that sort is a trivial in-memory sort in
      // Postgres and does not warrant an index.
      type OrderOrderBy = Prisma.OrderOrderByWithRelationInput;
      const orderByMap = {
        newest: [{ createdAt: "desc" }],
        oldest: [{ createdAt: "asc" }],
        total_desc: [{ total: "desc" }],
        total_asc: [{ total: "asc" }],
      } satisfies Record<OrderSortValue, OrderOrderBy[]>;
      const orderBy: OrderOrderBy[] = [
        ...orderByMap[input.sort],
        { id: "asc" },
      ];

      // Pagination — 25, the one page size every admin list uses, so "page 3"
      // means the same amount of scrolling everywhere.
      const pageSize = 25;
      // Bounded BEFORE it becomes an offset. The clamp further down handles
      // "past the end", but it needs `totalCount` first, so the opening query
      // still runs with whatever `skip` this produces — and an unbounded page
      // number overflows Postgres' OFFSET rather than paging past the end. See
      // MAX_REQUESTED_PAGE.
      const page = Math.min(input.page ?? 1, MAX_REQUESTED_PAGE);
      const skip = (page - 1) * pageSize;

      // The three queue counts below are DELIBERATELY unconditional on the
      // current filters — `businessId` only. Each one backs a card that's a
      // filter shortcut linking to exactly that filter combo (e.g. "Needs
      // fulfillment" -> ?status=open&fulfillment=unfulfilled), so its number
      // has to be what the table will show right after the click. Scoping
      // them to `where` would make the cards lie the moment any filter is
      // active — the same bug class the old all-time stat cards had, just
      // inverted. Kept in the same $transaction as the page query and count
      // for a consistent snapshot, not because they're expensive.
      const [
        firstPassOrders,
        totalCount,
        openCount,
        needsFulfillmentCount,
        awaitingPaymentCount,
      ] = await ctx.db.$transaction([
        ctx.db.order.findMany({
          where,
          include: LIST_INCLUDE,
          orderBy,
          skip,
          take: pageSize,
        }),
        ctx.db.order.count({ where }),
        ctx.db.order.count({ where: { businessId, status: "open" } }),
        // Deliberately NOT including partially_fulfilled: this count must
        // match the ?status=open&fulfillment=unfulfilled filter exactly.
        // Partial fulfillment gets its own row badge instead.
        ctx.db.order.count({
          where: {
            businessId,
            status: "open",
            fulfillmentStatus: "unfulfilled",
          },
        }),
        ctx.db.order.count({
          where: { businessId, status: "open", paymentStatus: "pending" },
        }),
      ]);

      // `Math.max(1, …)` so an empty result set reports one page rather than
      // zero, matching `buildTablePage`.
      const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

      // Clamp an out-of-range page HERE rather than leaving it to callers. An
      // unclamped `?page=900` against a 3-page list echoes `page: 900` back with
      // an empty slice, and a paginator faithfully renders "Showing
      // 22,476–75 of 75" above a no-matches empty state. The re-query only
      // fires on that path — in-app navigation never produces it — so the
      // common case stays a single round trip.
      const clampedPage = Math.min(page, totalPages);
      const pageOrders =
        clampedPage === page
          ? firstPassOrders
          : await ctx.db.order.findMany({
              where,
              include: LIST_INCLUDE,
              orderBy,
              skip: (clampedPage - 1) * pageSize,
              take: pageSize,
            });

      // D2: strip internalNote + stripePaymentIntentId from STAFF rows.
      // staffProcedure's own docblock (trpc.ts) draws the line at "anything
      // touching money, prices, refunds, products, or settings must stay on
      // ownerAdminProcedure" — money TOTALS are the deliberate exception here
      // (user decision): subtotal/tax/shipping/discount/total stay visible to
      // STAFF because a fulfillment worker needs them for packing-slip and
      // order-context purposes. internalNote (owner-to-owner notes, may
      // contain anything) and stripePaymentIntentId (a raw Stripe identifier,
      // not needed for fulfillment) are not fulfillment-relevant and are
      // nulled out below. OWNER/MANAGER and PLATFORM_ADMIN (who has no
      // membership row, so `membershipRole` reads null) keep full rows.
      const isStaff = ctx.session.session.membershipRole === "STAFF";

      return {
        orders: pageOrders.map(({ _count, ...order }) => ({
          ...order,
          internalNote: isStaff ? null : order.internalNote,
          stripePaymentIntentId: isStaff ? null : order.stripePaymentIntentId,
          itemCount: _count.items,
          hasOversell: _count.inventoryHistory > 0,
        })),
        totalCount,
        page: clampedPage,
        pageSize,
        totalPages,
        stats: {
          openCount,
          needsFulfillmentCount,
          awaitingPaymentCount,
        },
      };
    }),

  // Cheap existence check for the admin empty state — distinguishes "no orders
  // yet" (explain that orders arrive from the storefront) from "no matches for
  // the current filters" (offer Clear filters). A single COUNT(*), and only
  // issued when the filtered query came back empty, so the common page load
  // never pays for it.
  hasAny: staffProcedure.use(featureGate("orders")).query(async ({ ctx }) => {
    const { businessId } = ctx;
    const count = await ctx.db.order.count({ where: { businessId } });
    return { hasAny: count > 0 };
  }),

  getById: staffProcedure
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
          inventoryHistory: {
            where: { reason: "oversell" },
            include: {
              product: { select: { id: true, name: true } },
              variant: { select: { name: true } },
            },
            orderBy: { createdAt: "asc" },
          },
        },
      });

      if (!order) return order;

      return {
        ...order,
        hasOversell: order.inventoryHistory.length > 0,
        oversellItems: order.inventoryHistory.map((h) => ({
          productId: h.productId,
          productName: h.product?.name ?? null,
          variantName: h.variant?.name ?? null,
          previousQty: h.previousQty,
          requestedQty: Math.abs(h.changeQty) || 1,
        })),
      };
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

      // The idempotency key is stable for a given (order, prior-refund-state,
      // amount) so a double-clicked or retried mutation reuses the same Stripe
      // refund instead of creating a second one. metadata.source lets the
      // charge.refunded webhook skip the customer email for refunds we already
      // email about here.
      const stripeRefund = await stripeClient.refunds.create(
        {
          payment_intent: order.stripePaymentIntentId,
          amount: input.amount,
          reason: (input.reason ??
            "requested_by_customer") as Stripe.RefundCreateParams.Reason,
          metadata: { source: "simplepress", orderId: order.id },
        },
        {
          stripeAccount: order.business.stripeAccountId!,
          idempotencyKey: `refund:${order.id}:${alreadyRefunded}:${input.amount}`,
        },
      );

      // Read the authoritative cumulative refunded amount back from the
      // charge, so concurrent refunds can't undercount each other in the DB.
      let newTotalRefunded = alreadyRefunded + input.amount;
      const chargeId =
        typeof stripeRefund.charge === "string"
          ? stripeRefund.charge
          : stripeRefund.charge?.id;
      if (chargeId) {
        try {
          const charge = await stripeClient.charges.retrieve(chargeId, {
            stripeAccount: order.business.stripeAccountId!,
          });
          newTotalRefunded = charge.amount_refunded;
        } catch {
          // fall back to the locally computed total
        }
      }
      const isFullRefund = newTotalRefunded >= order.total;
      const reasonLabel = input.reason
        ? (STRIPE_REFUND_REASON_LABEL[input.reason] ?? input.reason)
        : null;

      const updatedOrder = await ctx.db.order.update({
        where: { id: input.orderId },
        data: {
          status: isFullRefund
            ? "refunded"
            : order.fulfillmentStatus === "fulfilled"
              ? "completed"
              : "open",
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
                    unitsConsumedMap: {
                      [product.id]: product.baseUnitsConsumed ?? 1,
                    },
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
                    data: {
                      outOfStockAlertSent: false,
                      lowInventoryAlertSent: false,
                    },
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
            // For a cumulative full refund the customer must see the full
            // refunded amount, not just this final partial. When still partial,
            // report only the amount moved in this transaction.
            refundAmountCents: isFullRefund ? newTotalRefunded : input.amount,
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
        order.paymentStatus === "unpaid" || order.paymentStatus === "pending";
      const isCompleted = input.status === "completed";

      const updatedOrder = await ctx.db.order.update({
        where: { id: input.orderId },
        data: {
          status: input.status,
          paymentStatus: isCompleted ? "paid" : order.paymentStatus,
        },
      });

      if (wasUnpaid && isCompleted && order.customerId) {
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
          order.status === "open" || order.status === "completed";

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
                      items: [
                        { productId: product.id, quantity: item.quantity },
                      ],
                      unitsConsumedMap: {
                        [product.id]: product.baseUnitsConsumed ?? 1,
                      },
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
                      data: {
                        outOfStockAlertSent: false,
                        lowInventoryAlertSent: false,
                      },
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
          return "completed";
        if (input.paymentStatus === "paid") return "open";
        return "open";
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
    .input(manualOrderInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      // Authoritative money. The client sends items and charges, never the
      // resulting subtotal/total — those used to come straight off the request
      // and be written verbatim, so a crafted payload could record a $500 order
      // as `total: 0` and silently skew the Finances page.
      const totals = computeManualOrderTotals(input);

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

      // Verify every line item references a product/variant owned by this
      // tenant. Without this a manual order could reference a foreign
      // business's product, and a later restock (refund/cancel) would mutate
      // that other business's inventory.
      const lineItemProductIds = [
        ...new Set(
          input.items
            .map((i) => i.productId)
            .filter((id): id is string => !!id),
        ),
      ];
      const lineItemVariantIds = [
        ...new Set(
          input.items
            .map((i) => i.productVariantId)
            .filter((id): id is string => !!id),
        ),
      ];

      // Fetched rather than counted so the same round-trip can also answer
      // "does this product have variants?" below.
      const ownedProducts =
        lineItemProductIds.length > 0
          ? await ctx.db.product.findMany({
              where: { id: { in: lineItemProductIds }, businessId },
              select: {
                id: true,
                name: true,
                _count: { select: { variants: true } },
              },
            })
          : [];

      if (ownedProducts.length !== lineItemProductIds.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "One or more products do not belong to this business",
        });
      }

      if (lineItemVariantIds.length > 0) {
        const ownedCount = await ctx.db.productVariant.count({
          where: { id: { in: lineItemVariantIds }, product: { businessId } },
        });
        if (ownedCount !== lineItemVariantIds.length) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "One or more product variants do not belong to this business",
          });
        }
      }

      // A product that HAS variants must have one chosen. The form checks this
      // too, but only against the catalog it was rendered with — a product that
      // gained variants after the page loaded would slip past it and be stored
      // variant-less at the base price, which then reads as a bare product name
      // everywhere downstream and cannot be fulfilled against a specific SKU.
      const variantfulProductIds = new Set(
        ownedProducts.filter((p) => p._count.variants > 0).map((p) => p.id),
      );
      const missingVariant = input.items.find(
        (item) =>
          variantfulProductIds.has(item.productId) && !item.productVariantId,
      );
      if (missingVariant) {
        const name =
          ownedProducts.find((p) => p.id === missingVariant.productId)?.name ??
          missingVariant.productName;
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Choose a variant for "${name}".`,
        });
      }

      const nameParts = input.customerName.trim().split(" ");
      const firstName = nameParts[0] ?? "Guest";
      const lastName = nameParts.slice(1).join(" ") || "";

      const normalizedCustomerEmail = normalizeEmail(input.customerEmail);
      const customer = await ctx.db.customer.upsert({
        where: {
          businessId_email: {
            email: normalizedCustomerEmail,
            businessId,
          },
        },
        create: {
          email: normalizedCustomerEmail,
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
      // A pickup order has nothing to ship, so no address is recorded even if
      // one came along in the payload.
      if (input.shippingAddress && input.deliveryMethod !== "pickup") {
        // Emptiness-checked, not `??`: an empty-string shippingName is not
        // nullish, so `??` let it through and produced an address with a blank
        // first name.
        const trimmedShippingName = input.shippingName?.trim() ?? "";
        const shippingName =
          trimmedShippingName === "" ? input.customerName : trimmedShippingName;
        const shippingNameParts = shippingName.split(" ");
        const shippingFirstName = shippingNameParts[0] ?? firstName;
        const shippingLastName =
          shippingNameParts.slice(1).join(" ") || lastName;

        shippingAddressId = await findOrCreateShippingAddress({
          customerId: customer.id,
          firstName: shippingFirstName,
          lastName: shippingLastName,
          address1: input.shippingAddress.line1,
          address2: input.shippingAddress.line2 ?? null,
          city: input.shippingAddress.city,
          // `ShippingAddress.province` is nullable and plenty of countries have
          // no subdivision, but the helper takes a plain string.
          province: input.shippingAddress.state ?? "",
          zip: input.shippingAddress.postal_code,
          country: input.shippingAddress.country,
          phone: input.shippingAddress.phone ?? null,
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
                customerEmail: normalizedCustomerEmail,
                customerName: input.customerName,

                subtotal: totals.subtotal,
                tax: totals.tax,
                shipping: totals.shipping,
                discount: totals.discount,
                total: totals.total,

                status: input.status,
                paymentStatus: input.paymentStatus,
                paymentMethod,
                fulfillmentStatus: input.fulfillmentStatus,
                deliveryMethod: input.deliveryMethod,

                // Backdating for sales recorded after the fact. Omitted =
                // Prisma's `@default(now())`.
                ...(input.orderDate ? { createdAt: input.orderDate } : {}),

                shippingAddressId,
                internalNote,

                items: {
                  create: input.items.map((item) => ({
                    productId: item.productId,
                    productName: item.productName,
                    productVariantId: item.productVariantId,
                    // Snapshot fields. `variantName` in particular was being
                    // computed on the client and then dropped, so every manual
                    // order with a variant rendered as a bare product name on
                    // the detail page, packing slip and invoice.
                    variantName: item.variantName ?? null,
                    sku: item.sku ?? null,
                    quantity: item.quantity,
                    price: item.price,
                    total: Math.round(item.price * item.quantity),
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

      // Manual orders only count as a settled sale once they are marked paid.
      // Both customer spend aggregates and inventory deduction are gated on
      // this so a pending manual order neither inflates spend nor oversells.
      const isPaidOrder = input.paymentStatus === "paid";

      // Increment customer spend/order-count aggregates for paid manual orders
      // so they surface in the customer list metrics — mirrors the Stripe
      // webhook's customer-metrics update.
      if (isPaidOrder) {
        try {
          await ctx.db.customer.update({
            where: { id: customer.id },
            data: {
              totalSpent: { increment: order.total },
              orderCount: { increment: 1 },
            },
          });
        } catch (customerError) {
          console.error(
            "[Manual Order] Failed to update customer metrics:",
            customerError,
          );
        }
      }

      // Decrement inventory for paid manual orders using the same
      // oversell-safe conditional-update pattern as the checkout webhook
      // (respects trackInventory / allowBackorders, logs oversells, and
      // handles pool-based products). A hard oversell leaves inventory
      // unchanged and records an "oversell" history row rather than going
      // negative.
      if (isPaidOrder) {
        try {
          await ctx.db.$transaction(async (tx) => {
            const poolGroups = new Map<
              string,
              {
                items: { productId: string; quantity: number }[];
                unitsConsumedMap: Record<string, number>;
              }
            >();

            for (const item of order.items) {
              const qty = item.quantity;

              if (item.productVariantId) {
                const variant = await tx.productVariant.findUnique({
                  where: { id: item.productVariantId },
                  select: {
                    id: true,
                    inventoryQty: true,
                    productId: true,
                    product: {
                      select: {
                        businessId: true,
                        trackInventory: true,
                        allowBackorders: true,
                      },
                    },
                  },
                });
                if (!variant) continue;
                if (!variant.product.trackInventory) continue;
                const previousQty = variant.inventoryQty;

                if (variant.product.allowBackorders) {
                  await tx.productVariant.update({
                    where: { id: variant.id },
                    data: { inventoryQty: { decrement: qty } },
                  });
                  await tx.inventoryHistory.create({
                    data: {
                      variantId: variant.id,
                      productId: variant.productId,
                      businessId: variant.product.businessId,
                      previousQty,
                      newQty: previousQty - qty,
                      changeQty: -qty,
                      reason: "sale",
                      note: `Manual Order #${order.orderNumber}`,
                      orderId: order.id,
                    },
                  });
                } else {
                  const result = await tx.productVariant.updateMany({
                    where: { id: variant.id, inventoryQty: { gte: qty } },
                    data: { inventoryQty: { decrement: qty } },
                  });
                  if (result.count === 0) {
                    await tx.inventoryHistory.create({
                      data: {
                        variantId: variant.id,
                        productId: variant.productId,
                        businessId: variant.product.businessId,
                        previousQty,
                        newQty: previousQty,
                        changeQty: 0,
                        reason: "oversell",
                        note: `Manual Order #${order.orderNumber}: insufficient stock; inventory unchanged`,
                        orderId: order.id,
                      },
                    });
                    continue;
                  }
                  await tx.inventoryHistory.create({
                    data: {
                      variantId: variant.id,
                      productId: variant.productId,
                      businessId: variant.product.businessId,
                      previousQty,
                      newQty: previousQty - qty,
                      changeQty: -qty,
                      reason: "sale",
                      note: `Manual Order #${order.orderNumber}`,
                      orderId: order.id,
                    },
                  });
                }
              } else if (item.productId) {
                const product = await tx.product.findUnique({
                  where: { id: item.productId },
                  select: {
                    id: true,
                    inventoryQty: true,
                    businessId: true,
                    trackInventory: true,
                    allowBackorders: true,
                    baseInventoryUnitId: true,
                    baseUnitsConsumed: true,
                  },
                });
                if (!product) continue;

                // Pool-based product — accumulate for aggregate deduction.
                if (product.baseInventoryUnitId) {
                  const poolId = product.baseInventoryUnitId;
                  if (!poolGroups.has(poolId)) {
                    poolGroups.set(poolId, {
                      items: [],
                      unitsConsumedMap: {},
                    });
                  }
                  const group = poolGroups.get(poolId)!;
                  group.items.push({ productId: product.id, quantity: qty });
                  group.unitsConsumedMap[product.id] =
                    product.baseUnitsConsumed ?? 1;
                  continue;
                }

                if (!product.trackInventory) continue;
                const previousQty = product.inventoryQty;

                if (product.allowBackorders) {
                  await tx.product.update({
                    where: { id: product.id },
                    data: { inventoryQty: { decrement: qty } },
                  });
                  await tx.inventoryHistory.create({
                    data: {
                      productId: product.id,
                      businessId: product.businessId,
                      previousQty,
                      newQty: previousQty - qty,
                      changeQty: -qty,
                      reason: "sale",
                      note: `Manual Order #${order.orderNumber}`,
                      orderId: order.id,
                      variantId: null,
                    },
                  });
                } else {
                  const result = await tx.product.updateMany({
                    where: { id: product.id, inventoryQty: { gte: qty } },
                    data: { inventoryQty: { decrement: qty } },
                  });
                  if (result.count === 0) {
                    await tx.inventoryHistory.create({
                      data: {
                        productId: product.id,
                        businessId: product.businessId,
                        previousQty,
                        newQty: previousQty,
                        changeQty: 0,
                        reason: "oversell",
                        note: `Manual Order #${order.orderNumber}: insufficient stock; inventory unchanged`,
                        orderId: order.id,
                        variantId: null,
                      },
                    });
                    continue;
                  }
                  await tx.inventoryHistory.create({
                    data: {
                      productId: product.id,
                      businessId: product.businessId,
                      previousQty,
                      newQty: previousQty - qty,
                      changeQty: -qty,
                      reason: "sale",
                      note: `Manual Order #${order.orderNumber}`,
                      orderId: order.id,
                      variantId: null,
                    },
                  });
                }
              }
            }

            for (const [poolId, group] of poolGroups) {
              await deductPoolInventory(tx, {
                poolId,
                items: group.items,
                unitsConsumedMap: group.unitsConsumedMap,
                orderId: order.id,
                orderNumber: order.orderNumber,
                businessId,
              });
            }
          });
        } catch (invError) {
          console.error("[Manual Order] Failed to deduct inventory:", invError);
        }
      }

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
            orderId: order.id,
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

  updateFulfillment: staffProcedure
    .use(featureGate("orders"))
    .input(updateFulfillmentSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      const order = await ctx.db.order.findFirst({
        where: { id: input.orderId, businessId },
        select: { paymentStatus: true, status: true },
      });

      if (!order) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      }

      let derivedStatus: string | undefined;
      if (
        input.fulfillmentStatus === "fulfilled" &&
        order.paymentStatus === "paid"
      ) {
        derivedStatus = "completed";
      } else if (
        input.fulfillmentStatus !== "fulfilled" &&
        order.status === "completed"
      ) {
        derivedStatus = "open";
      }

      const updatedOrder = await ctx.db.$transaction(async (tx) => {
        // Keep per-item fulfillment counters coherent with manual overrides:
        // "fulfilled" means every unit shipped, "unfulfilled" means none.
        // "partially_fulfilled" leaves the existing per-item counts alone.
        if (
          input.fulfillmentStatus === "fulfilled" ||
          input.fulfillmentStatus === "unfulfilled"
        ) {
          const items = await tx.orderItem.findMany({
            where: { orderId: input.orderId },
          });
          for (const item of items) {
            const target =
              input.fulfillmentStatus === "fulfilled" ? item.quantity : 0;
            if (item.fulfilledQuantity !== target) {
              await tx.orderItem.update({
                where: { id: item.id },
                data: { fulfilledQuantity: target },
              });
            }
          }
        }

        return tx.order.update({
          where: { id: input.orderId, businessId },
          data: {
            fulfillmentStatus: input.fulfillmentStatus,
            ...(derivedStatus !== undefined && { status: derivedStatus }),
          },
        });
      });

      return updatedOrder;
    }),

  updateNote: staffProcedure
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
                    unitsConsumedMap: {
                      [product.id]: product.baseUnitsConsumed ?? 1,
                    },
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
                    data: {
                      outOfStockAlertSent: false,
                      lowInventoryAlertSent: false,
                    },
                  });
                }
              }
            }
          });
        } catch (invError) {
          console.error(
            "[Orders] Failed to restore inventory on manual refund:",
            invError,
          );
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
          message:
            "Cannot add a shipping address: order has no linked customer",
        });
      }
    }),
});
