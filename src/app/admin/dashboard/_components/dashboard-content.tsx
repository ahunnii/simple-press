"use client";

import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  DollarSign,
  Package,
  ShoppingCart,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

type DashboardContentProps = {
  business: {
    id: string;
    name: string;
    subdomain: string;
  };
  stats: {
    totalRevenue: number;
    totalOrders: number;
    totalProducts: number;
    totalCustomers: number;
  };
  recentOrders: Array<{
    id: string;
    orderNumber: number;
    customerName: string;
    total: number;
    status: string;
    createdAt: Date;
  }>;
  lowStockProducts: Array<{
    id: string;
    name: string;
    inventoryQty: number;
    product: {
      name: string;
    };
  }>;
  lowStockPools: Array<{
    id: string;
    name: string;
    inventoryQty: number;
    lowInventoryThreshold: number | null;
  }>;
  recentOversells: Array<{
    id: string;
    createdAt: Date;
    product: { id: string; name: string } | null;
    variant: { name: string } | null;
    order: { id: string; orderNumber: number } | null;
    previousQty: number;
  }>;
  revenueByDay: Array<{
    createdAt: Date;
    _sum: {
      total: number | null;
    };
  }>;
  topProducts: Array<{
    productId: string | null;
    productName: string;
    imageUrl: string | null;
    revenue: number;
    unitsSold: number;
  }>;
};

export function DashboardContent({
  business,
  stats,
  recentOrders,
  lowStockProducts,
  lowStockPools,
  recentOversells,
  revenueByDay,
  topProducts,
}: DashboardContentProps) {
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins} min${diffMins !== 1 ? "s" : ""} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return new Date(date).toLocaleDateString();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "processing":
        return "bg-blue-100 text-blue-800";
      case "cancelled":
        return "bg-gray-100 text-gray-800";
      case "refunded":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Process revenue data for chart
  const chartData = revenueByDay.map((item) => ({
    date: new Date(item.createdAt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    revenue: (item._sum.total ?? 0) / 100,
  }));

  return (
    <div className="bg-muted min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-foreground text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back! Here&apos;s what&apos;s happening with {business.name}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Revenue */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                Total Revenue
              </CardTitle>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(stats.totalRevenue)}
              </div>
              <p className="text-muted-foreground mt-1 text-xs">All time</p>
            </CardContent>
          </Card>

          {/* Orders */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                Total Orders
              </CardTitle>
              <ShoppingCart className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalOrders}</div>
              <p className="text-muted-foreground mt-1 text-xs">All time</p>
            </CardContent>
          </Card>

          {/* Products */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                Products
              </CardTitle>
              <Package className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalProducts}</div>
              <p className="text-muted-foreground mt-1 text-xs">In catalog</p>
            </CardContent>
          </Card>

          {/* Customers */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                Customers
              </CardTitle>
              <Users className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCustomers}</div>
              <p className="text-muted-foreground mt-1 text-xs">
                Total customers
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Two Column Layout */}
        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Recent Orders */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Orders</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/admin/orders">
                  View All
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {recentOrders.length === 0 ? (
                <div className="py-8 text-center">
                  <ShoppingCart className="text-muted-foreground mx-auto mb-3 h-12 w-12" />
                  <p className="text-muted-foreground">No orders yet</p>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Orders will appear here once customers start purchasing
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentOrders.map((order) => (
                    <Link
                      key={order.id}
                      href={`/admin/orders/${order.id}`}
                      className="block"
                    >
                      <div className="hover:bg-muted flex items-center justify-between rounded-lg p-3 transition-colors">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">
                              #{order.orderNumber}
                            </p>
                            <Badge
                              className={`text-xs ${getStatusColor(order.status)}`}
                            >
                              {order.status}
                            </Badge>
                          </div>
                          <p className="text-muted-foreground truncate text-sm">
                            {order.customerName}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {formatDate(order.createdAt)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">
                            {formatCurrency(order.total)}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Low Stock Alerts */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Low Stock Alerts</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/admin/products">
                  Manage Stock
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {lowStockProducts.length === 0 && lowStockPools.length === 0 ? (
                <div className="py-8 text-center">
                  <Package className="mx-auto mb-3 h-12 w-12 text-green-400" />
                  <p className="text-muted-foreground">
                    All stock levels are good!
                  </p>
                  <p className="text-muted-foreground mt-1 text-sm">
                    No products are running low
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {lowStockProducts.map((variant) => (
                    <div
                      key={variant.id}
                      className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-3"
                    >
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
                        <div>
                          <p className="text-foreground text-sm font-medium">
                            {variant.product.name}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {variant.name}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-amber-700">
                          {variant.inventoryQty} left
                        </p>
                      </div>
                    </div>
                  ))}
                  {lowStockPools.map((pool) => (
                    <Link key={pool.id} href="/admin/inventory">
                      <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-3 transition-colors hover:bg-amber-100">
                        <div className="flex items-center gap-3">
                          <AlertTriangle
                            className={`h-5 w-5 shrink-0 ${pool.inventoryQty === 0 ? "text-red-600" : "text-amber-600"}`}
                          />
                          <div>
                            <p className="text-foreground text-sm font-medium">
                              {pool.name}
                            </p>
                            <p className="text-muted-foreground text-xs">
                              Inventory pool
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p
                            className={`text-sm font-semibold ${pool.inventoryQty === 0 ? "text-red-700" : "text-amber-700"}`}
                          >
                            {pool.inventoryQty} left
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Oversell Alerts */}
        {recentOversells.length > 0 && (
          <div className="mb-8">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Oversold items need attention</AlertTitle>
              <AlertDescription>
                <p className="mb-3">
                  The following items were sold beyond available stock in the
                  last 30 days. Review the affected orders and consider
                  restocking.
                </p>
                <div className="space-y-2">
                  {recentOversells.map((row) => (
                    <div
                      key={row.id}
                      className="flex items-center justify-between rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900"
                    >
                      <div>
                        <span className="font-medium">
                          {row.product?.name ?? "Unknown product"}
                        </span>
                        {row.variant?.name && (
                          <span className="ml-1 text-red-700">
                            — {row.variant.name}
                          </span>
                        )}
                        <span className="ml-2 text-xs text-red-600">
                          (was {row.previousQty} in stock)
                        </span>
                      </div>
                      {row.order && (
                        <Link
                          href={`/admin/orders/${row.order.id}`}
                          className="shrink-0 text-xs font-medium text-red-700 underline-offset-2 hover:underline"
                        >
                          Order #{row.order.orderNumber}
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Revenue Chart */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Revenue (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <div className="py-12 text-center">
                <DollarSign className="text-muted-foreground mx-auto mb-3 h-12 w-12" />
                <p className="text-muted-foreground">No revenue data yet</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  Revenue will be tracked here once you start making sales
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `$${value}`}
                  />
                  <Tooltip
                    formatter={(value: number) => [
                      `$${value.toFixed(2)}`,
                      "Revenue",
                    ]}
                    contentStyle={{
                      backgroundColor: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: "6px",
                    }}
                  />
                  <Bar
                    dataKey="revenue"
                    fill="var(--chart-1)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle>Top Products (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts.length === 0 ? (
              <div className="py-8 text-center">
                <Package className="text-muted-foreground mx-auto mb-3 h-12 w-12" />
                <p className="text-muted-foreground">No sales data yet</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  Top selling products will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {topProducts.map((product, index) => (
                  <div
                    key={product.productId}
                    className="hover:bg-muted flex items-center gap-4 rounded-lg p-3 transition-colors"
                  >
                    <div className="w-8 shrink-0 text-center">
                      <span className="text-muted-foreground text-lg font-bold">
                        {index + 1}
                      </span>
                    </div>
                    <div className="bg-muted h-16 w-16 shrink-0 overflow-hidden rounded">
                      {product.imageUrl ? (
                        <Image
                          src={product.imageUrl}
                          alt={product.productName}
                          width={64}
                          height={64}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Package className="text-muted-foreground h-6 w-6" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-foreground truncate text-sm font-medium">
                        {product.productName}
                      </p>
                      <p className="text-muted-foreground text-sm">
                        {product.unitsSold} sold
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">
                        {formatCurrency(product.revenue)}
                      </p>
                      <p className="text-muted-foreground text-xs">revenue</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
