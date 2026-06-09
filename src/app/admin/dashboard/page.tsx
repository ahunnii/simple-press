import { notFound } from "next/navigation";

import { checkBusiness } from "~/lib/check-business";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { db } from "~/server/db";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { DashboardContent } from "~/app/admin/dashboard/_components/dashboard-content";

import { SiteHeader } from "../_components/site-header";

export default async function AdminDashboardPage() {
  const business = await checkBusiness();

  if (!business) {
    notFound();
  }

  const flags = await getBusinessFlags();

  const businessData = await db.business.findUnique({
    where: { id: business.id },
    include: {
      _count: {
        select: {
          products: true,
          orders: true,
          customers: true,
        },
      },
    },
  });

  // Get stats for the dashboard
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    totalRevenue,
    totalOrders,
    recentOrders,
    lowStockProducts,
    lowStockPools,
    revenueByDay,
    recentOversells,
    topProducts,
  ] = await Promise.all([
    // Total revenue (all time, paid orders that are not fully refunded)
    // Subtract refundAmountCents from partial-refund orders so the stat
    // matches what the orders list page reports.
    db.order.aggregate({
      where: {
        businessId: business.id,
        paymentStatus: "paid",
      },
      _sum: {
        total: true,
        refundAmountCents: true,
      },
    }),

    // Total orders count
    db.order.count({
      where: {
        businessId: business.id,
      },
    }),

    // Recent orders (last 10)
    db.order.findMany({
      where: {
        businessId: business.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        total: true,
        status: true,
        createdAt: true,
      },
    }),

    // Low stock products — variants first, then base products without variants.
    Promise.all([
      db.productVariant.findMany({
        where: {
          product: {
            businessId: business.id,
            published: true,
            trackInventory: true,
          },
          inventoryQty: { lte: 10, gte: 0 },
        },
        orderBy: { inventoryQty: "asc" },
        take: 10,
        include: { product: { select: { name: true } } },
      }),
      db.product.findMany({
        where: {
          businessId: business.id,
          published: true,
          trackInventory: true,
          inventoryQty: { lte: 10, gte: 0 },
          variants: { none: {} },
        },
        orderBy: { inventoryQty: "asc" },
        take: 10,
        select: { id: true, name: true, inventoryQty: true },
      }),
    ]).then(([variants, baseProducts]) => {
      const baseAsVariants = baseProducts.map((p) => ({
        id: p.id,
        name: "",
        inventoryQty: p.inventoryQty,
        product: { name: p.name },
      }));
      return [...variants, ...baseAsVariants]
        .sort((a, b) => a.inventoryQty - b.inventoryQty)
        .slice(0, 5);
    }),

    // Low stock pools — pools with inventory at or near zero
    db.baseInventoryUnit.findMany({
      where: {
        businessId: business.id,
        inventoryQty: { lte: 10 },
      },
      orderBy: { inventoryQty: "asc" },
      take: 5,
      select: {
        id: true,
        name: true,
        inventoryQty: true,
        lowInventoryThreshold: true,
      },
    }),

    // Revenue by day (last 30 days)
    db.order.groupBy({
      by: ["createdAt"],
      where: {
        businessId: business.id,
        paymentStatus: "paid",
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
      _sum: {
        total: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    }),

    // Recent oversells (last 30 days)
    db.inventoryHistory.findMany({
      where: {
        businessId: business.id,
        reason: "oversell",
        createdAt: { gte: thirtyDaysAgo },
      },
      include: {
        product: { select: { id: true, name: true } },
        variant: { select: { name: true } },
        order: { select: { id: true, orderNumber: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),

    // Top products by revenue (last 30 days)
    db.orderItem.groupBy({
      by: ["productId"],
      where: {
        order: {
          businessId: business.id,
          paymentStatus: "paid",
          createdAt: {
            gte: thirtyDaysAgo,
          },
        },
        productId: {
          not: null,
        },
      },

      _sum: {
        total: true,
        quantity: true,
      },
      orderBy: {
        _sum: {
          total: "desc",
        },
      },
      take: 5,
    }),
  ]);

  // Get product details for top products
  const topProductIds = topProducts
    .map((item) => item.productId)
    .filter((id): id is string => id !== null);

  const productDetails = await db.product.findMany({
    where: {
      id: { in: topProductIds },
    },
    select: {
      id: true,
      name: true,
      images: {
        take: 1,
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  const topProductsWithDetails = topProducts.map((item) => {
    const product = productDetails.find((p) => p.id === item.productId);
    return {
      productId: item.productId,
      productName: product?.name ?? "Unknown Product",
      imageUrl: product?.images[0]?.url ?? null,
      revenue: item._sum.total ?? 0,
      unitsSold: item._sum.quantity ?? 0,
    };
  });

  return (
    <>
      <SiteHeader title="Dashboard" />

      {!flags.isEnabled("cart") && (
        <Alert className="mx-auto my-4 w-full max-w-5xl">
          <AlertTitle>Cart is disabled</AlertTitle>
          <AlertDescription>
            The cart feature is disabled for this business. Please enable it in
            the settings to use the dashboard. You can enable it in the settings
            to allow customers to add products to their cart and checkout.
          </AlertDescription>
        </Alert>
      )}
      <DashboardContent
        business={businessData!}
        stats={{
          totalRevenue:
            (totalRevenue._sum.total ?? 0) -
            (totalRevenue._sum.refundAmountCents ?? 0),
          totalOrders,
          totalProducts: businessData!._count.products,
          totalCustomers: businessData!._count.customers,
        }}
        recentOrders={
          recentOrders as Array<{
            id: string;
            orderNumber: number;
            customerName: string;
            total: number;
            status: string;
            createdAt: Date;
          }>
        }
        lowStockProducts={lowStockProducts}
        lowStockPools={lowStockPools}
        recentOversells={recentOversells}
        revenueByDay={revenueByDay}
        topProducts={topProductsWithDetails}
      />
    </>
  );
}

export const metadata = {
  title: "Admin Dashboard",
};
