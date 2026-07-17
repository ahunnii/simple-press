import type { Prisma } from "generated/prisma";
import { TRPCError } from "@trpc/server";
import Papa from "papaparse";
import z from "zod";

import {
  exportToWooCommerceCSV,
  generateExportFilename,
} from "~/lib/wordpress/csv-exporter";
import { createTRPCRouter, ownerAdminProcedure } from "~/server/api/trpc";

const centsToDollars = (cents: number) => (cents / 100).toFixed(2);

export const exportRouter = createTRPCRouter({
  // Get products available for export
  getProductsForExport: ownerAdminProcedure
    .input(
      z.object({
        search: z.string().optional(),
        publishedOnly: z.boolean().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { businessId } = ctx;

      const products = await ctx.db.product.findMany({
        where: {
          businessId,
          ...(input.search && {
            OR: [
              { name: { contains: input.search, mode: "insensitive" } },
              { sku: { contains: input.search, mode: "insensitive" } },
            ],
          }),
          ...(input.publishedOnly && { published: true }),
        },
        select: {
          id: true,
          name: true,
          sku: true,
          price: true,
          published: true,
          featured: true,
          inventoryQty: true,
          images: {
            take: 1,
            orderBy: { sortOrder: "asc" },
          },
          variants: { select: { id: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      return products.map((p) => ({
        ...p,
        variantCount: p.variants.length,
      }));
    }),

  // Export selected products
  exportProducts: ownerAdminProcedure
    .input(
      z.object({
        productIds: z.array(z.string()).min(1, "Select at least one product"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      // Get products with all relations
      const products = await ctx.db.product.findMany({
        where: {
          id: { in: input.productIds },
          businessId,
        },
        include: {
          images: {
            orderBy: { sortOrder: "asc" },
          },
          variants: true,
        },
      });

      if (products.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No products found",
        });
      }

      // Generate CSV
      const csv = exportToWooCommerceCSV(products);

      // Get business name for filename
      const business = await ctx.db.business.findUnique({
        where: { id: businessId },
        select: { name: true },
      });

      const filename = generateExportFilename(business?.name ?? "products");

      return {
        csv,
        filename,
        productCount: products.length,
      };
    }),

  // Export orders to CSV (respects the same filters as the orders list page)
  exportOrders: ownerAdminProcedure
    .input(
      z.object({
        status: z.string().optional(),
        search: z.string().optional(),
        fulfillment: z.string().optional(),
        paymentStatus: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      // Mirror the filter logic of order.getAll so the export matches the list
      const where: Prisma.OrderWhereInput = { businessId };

      if (input.status && input.status !== "all") {
        where.status = input.status;
      }
      if (input.fulfillment && input.fulfillment !== "all") {
        where.fulfillmentStatus = input.fulfillment;
      }
      if (input.paymentStatus && input.paymentStatus !== "all") {
        where.paymentStatus = input.paymentStatus;
      }
      if (input.search) {
        where.OR = [
          { customerEmail: { contains: input.search, mode: "insensitive" } },
          { customerName: { contains: input.search, mode: "insensitive" } },
          { id: { contains: input.search, mode: "insensitive" } },
        ];
      }

      const orders = await ctx.db.order.findMany({
        where,
        include: {
          items: true,
          shippingAddress: true,
          discountCode: { select: { code: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      if (orders.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No orders match the current filters",
        });
      }

      const rows = orders.map((order) => {
        const addr = order.shippingAddress;
        const addressLine = addr
          ? [
              `${addr.firstName} ${addr.lastName}`.trim(),
              addr.address1,
              addr.address2,
              addr.city,
              [addr.province, addr.zip].filter(Boolean).join(" "),
              addr.country,
            ]
              .filter(Boolean)
              .join(", ")
          : "";

        return {
          "Order Number": order.orderNumber,
          Date: order.createdAt.toISOString(),
          "Customer Name": order.customerName ?? "",
          "Customer Email": order.customerEmail,
          Status: order.status,
          "Payment Status": order.paymentStatus,
          "Fulfillment Status": order.fulfillmentStatus,
          "Delivery Method": order.deliveryMethod,
          Subtotal: centsToDollars(order.subtotal),
          Shipping: centsToDollars(order.shipping),
          Tax: centsToDollars(order.tax),
          Discount: centsToDollars(order.discount),
          Total: centsToDollars(order.total),
          "Refund Amount": centsToDollars(order.refundAmountCents ?? 0),
          "Discount Code": order.discountCode?.code ?? "",
          "Item Count": order.items.reduce((sum, i) => sum + i.quantity, 0),
          Items: order.items
            .map(
              (i) =>
                `${i.quantity}x ${i.productName}${i.variantName ? ` (${i.variantName})` : ""}`,
            )
            .join("; "),
          "Shipping Address": addressLine,
        };
      });

      const csv = Papa.unparse(rows, { quotes: true, header: true });

      const business = await ctx.db.business.findUnique({
        where: { id: businessId },
        select: { name: true },
      });

      const slug = (business?.name ?? "store").toLowerCase().replace(/\s+/g, "-");
      const date = new Date().toISOString().split("T")[0];
      const filename = `orders-${slug}-${date}.csv`;

      return {
        csv,
        filename,
        orderCount: orders.length,
      };
    }),
});
