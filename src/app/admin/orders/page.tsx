import Link from "next/link";
import { Plus } from "lucide-react";

import { api, HydrateClient } from "~/trpc/server";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

import { SiteHeader } from "../_components/site-header";
import { OrderFilters } from "./_components/order-filters";
import { OrdersTable } from "./_components/orders-table";

type Props = {
  searchParams: Promise<{
    status?: string;
    search?: string;
  }>;
};

export default async function OrdersPage({ searchParams }: Props) {
  const params = await searchParams;

  // Get all orders for this business
  const orders = await api.order.getAll({
    status: params.status,
    search: params.search,
  });

  // Calculate stats
  const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
  const totalOrders = orders.length;
  const paidOrders = orders.filter((o) => o.status === "paid").length;

  return (
    <HydrateClient>
      <SiteHeader title="Orders" />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
            <p className="mt-1 text-gray-600">Manage your customer orders</p>
          </div>
          <Button asChild>
            <Link href="/admin/orders/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Order
            </Link>
          </Button>
        </div>

        {/* Stats */}
        <div className="mb-8 grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Revenue</CardDescription>
              <CardTitle className="text-3xl">
                ${(totalRevenue / 100).toFixed(2)}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Orders</CardDescription>
              <CardTitle className="text-3xl">{totalOrders}</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Paid Orders</CardDescription>
              <CardTitle className="text-3xl">{paidOrders}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Filters */}
        <OrderFilters />

        {/* Orders List */}
        {orders.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No orders yet</CardTitle>
              <CardDescription>
                Orders will appear here when customers make purchases
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <OrdersTable orders={orders} />
        )}
      </div>
    </HydrateClient>
  );
}
