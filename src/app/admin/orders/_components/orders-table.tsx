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
          <thead className="border-b bg-muted">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase">
                Order
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase">
                Customer
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase">
                Items
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase">
                Total
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase">
                Status
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium tracking-wider text-muted-foreground uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-card">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-muted/50">
                <td className="px-6 py-4">
                  <Link href={`/admin/orders/${order.id}`}>
                    <div>
                      <div className="text-sm font-medium text-foreground">
                        #{order.id.slice(0, 8)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatDate(order.createdAt)}
                      </div>
                    </div>
                  </Link>
                </td>
                <td className="px-6 py-4">
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      {order.customerName}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {order.customerEmail}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-muted-foreground">
                  {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                </td>
                <td className="px-6 py-4 text-sm font-medium text-foreground">
                  {formatPrice(order.total)}
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant={getStatusColor(order.status)}>
                      {order.status}
                    </Badge>
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
