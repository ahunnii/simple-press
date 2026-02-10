// app/admin/dashboard/page.tsx
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "~/server/better-auth";
import { db } from "~/server/db";
import { DashboardContent } from "~/app/admin/_components/dashboard-content";

export default async function AdminDashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/auth/sign-in");
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: {
      business: {
        include: {
          _count: {
            select: {
              products: true,
              orders: true,
              customers: true,
            },
          },
        },
      },
    },
  });

  if (!user?.business) {
    redirect("/admin/welcome");
  }

  // Get stats for the dashboard
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    totalRevenue,
    totalOrders,
    recentOrders,
    lowStockProducts,
    revenueByDay,
    topProducts,
  ] = await Promise.all([
    // Total revenue (all time, paid orders)
    db.order.aggregate({
      where: {
        businessId: user.business.id,
        status: "paid",
      },
      _sum: {
        total: true,
      },
    }),

    // Total orders count
    db.order.count({
      where: {
        businessId: user.business.id,
      },
    }),

    // Recent orders (last 10)
    db.order.findMany({
      where: {
        businessId: user.business.id,
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

    // Low stock products
    db.productVariant.findMany({
      where: {
        product: {
          businessId: user.business.id,
          published: true,
        },
        inventoryQty: {
          lte: 10,
          gte: 0,
        },
      },
      orderBy: {
        inventoryQty: "asc",
      },
      take: 5,
      include: {
        product: {
          select: {
            name: true,
          },
        },
      },
    }),

    // Revenue by day (last 30 days)
    db.order.groupBy({
      by: ["createdAt"],
      where: {
        businessId: user.business.id,
        status: "paid",
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

    // Top products by revenue (last 30 days)
    db.orderItem.groupBy({
      by: ["productId"],
      where: {
        order: {
          businessId: user.business.id,
          status: "paid",
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
    <DashboardContent
      business={user.business}
      stats={{
        totalRevenue: totalRevenue._sum.total ?? 0,
        totalOrders,
        totalProducts: user.business._count.products,
        totalCustomers: user.business._count.customers,
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
      revenueByDay={revenueByDay}
      topProducts={topProductsWithDetails}
    />
  );
}
