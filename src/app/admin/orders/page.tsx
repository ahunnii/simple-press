import Link from "next/link";
import { Plus } from "lucide-react";

import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import { api } from "~/trpc/server";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

import { TrailHeader } from "../_components/trail-header";
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
  const orders = await api.order
    .getAll({
      status: params.status,
      search: params.search,
    })
    .catch(rethrowTrpcForErrorBoundary);

  // Calculate stats — exclude fully refunded orders; subtract partial refund amounts from partial-refund orders.
  const totalRevenue = orders
    .filter((order) => order.paymentStatus !== "refunded")
    .reduce((sum, order) => sum + order.total - (order.refundAmountCents ?? 0), 0);
  const totalOrders = orders.length;
  const paidOrders = orders.filter((o) => o.status === "paid").length;

  return (
    <>
      <TrailHeader breadcrumbs={[{ label: "Orders" }]} />
      <div className="admin-container">
        <div className="admin-header">
          <div>
            <h1>Orders</h1>
            <p>Manage your customer orders</p>
          </div>
          <Button asChild>
            <Link href="/admin/orders/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Manual Order
            </Link>
          </Button>
        </div>

        {/* Stats */}
        {!params.status && !params.search && (
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
        )}

        {/* Filters */}
        <OrderFilters orderCount={totalOrders} />

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
    </>
  );
}

export const metadata = {
  title: "Orders",
};
