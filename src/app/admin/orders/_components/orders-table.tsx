import type { Order, OrderItem, ShippingAddress } from "generated/prisma";
import Link from "next/link";
import { Eye } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";

type Props = {
  orders: (Order & {
    items: OrderItem[];
    shippingAddress?: ShippingAddress;
    hasOversell?: boolean;
    deliveryMethod?: string;
  })[];
};

export function OrdersTable({ orders }: Props) {
  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(date));
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "open":
        return "default";
      case "completed":
        return "default";
      case "cancelled":
        return "destructive";
      case "refunded":
        return "secondary";
      default:
        return "secondary";
    }
  };

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full">
          <caption className="sr-only">Orders</caption>
          <thead className="bg-muted border-b">
            <tr>
              <th
                scope="col"
                className="text-muted-foreground px-6 py-3 text-left text-xs font-medium tracking-wider uppercase"
              >
                Order
              </th>
              <th
                scope="col"
                className="text-muted-foreground px-6 py-3 text-left text-xs font-medium tracking-wider uppercase"
              >
                Customer
              </th>
              <th
                scope="col"
                className="text-muted-foreground px-6 py-3 text-left text-xs font-medium tracking-wider uppercase"
              >
                Items
              </th>
              <th
                scope="col"
                className="text-muted-foreground px-6 py-3 text-left text-xs font-medium tracking-wider uppercase"
              >
                Total
              </th>
              <th
                scope="col"
                className="text-muted-foreground px-6 py-3 text-left text-xs font-medium tracking-wider uppercase"
              >
                Status
              </th>
              <th
                scope="col"
                className="text-muted-foreground px-6 py-3 text-right text-xs font-medium tracking-wider uppercase"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-border bg-card divide-y">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-muted/50">
                <td className="px-6 py-4">
                  <Link href={`/admin/orders/${order.id}`}>
                    <div>
                      <div className="text-foreground text-sm font-medium">
                        #{order.id.slice(0, 8)}
                      </div>
                      <div className="text-muted-foreground text-sm">
                        {formatDate(order.createdAt)}
                      </div>
                    </div>
                  </Link>
                </td>
                <td className="px-6 py-4">
                  <div>
                    <div className="text-foreground text-sm font-medium">
                      {order.customerName}
                    </div>
                    <div className="text-muted-foreground text-sm">
                      {order.customerEmail}
                    </div>
                  </div>
                </td>
                <td className="text-muted-foreground px-6 py-4 text-sm">
                  {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                </td>
                <td className="text-foreground px-6 py-4 text-sm font-medium">
                  {formatPrice(order.total)}
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant={getStatusColor(order.status)}>
                      {order.status}
                    </Badge>
                    {order.fulfillmentStatus === "partially_fulfilled" && (
                      <Badge
                        variant="outline"
                        className="border-amber-300 bg-amber-50 text-amber-700"
                      >
                        Partially fulfilled
                      </Badge>
                    )}
                    {order.deliveryMethod === "pickup" && (
                      <Badge
                        variant="outline"
                        className="border-amber-300 bg-amber-50 text-amber-700"
                      >
                        Pickup
                      </Badge>
                    )}
                    {order.hasOversell && (
                      <Badge variant="destructive">Oversold</Badge>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-right text-sm font-medium">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/admin/orders/${order.id}`}>
                      <Eye className="mr-2 h-4 w-4" />
                      View
                    </Link>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
