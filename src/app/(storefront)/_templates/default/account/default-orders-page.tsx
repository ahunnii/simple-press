import Link from "next/link";
import { Package } from "lucide-react";

import { formatDate } from "~/lib/format-date";
import { formatPrice } from "~/lib/prices";

import type { OrdersPageTemplateProps } from "../../types";
import { DefaultAccountLayout } from "./default-account-layout";

function statusClass(status: string) {
  switch (status) {
    case "open":
      return "bg-blue-100 text-blue-800";
    case "completed":
      return "bg-green-100 text-green-800";
    case "cancelled":
      return "bg-red-100 text-red-800";
    case "refunded":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-yellow-100 text-yellow-800";
  }
}

export function DefaultOrdersPage({ orders }: OrdersPageTemplateProps) {
  return (
    <DefaultAccountLayout heading="My Orders">
      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Package className="text-muted-foreground mb-4 h-12 w-12" />
          <h2 className="mb-2 text-xl font-semibold">No orders yet</h2>
          <p className="text-muted-foreground mb-6 text-sm">
            When you place an order, it will appear here.
          </p>
          <Link
            href="/shop"
            className="bg-primary text-primary-foreground rounded-md px-6 py-2 text-sm font-medium transition-opacity hover:opacity-90"
          >
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="rounded-lg border bg-white p-6 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-gray-500">
                    Order #{order.orderNumber}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    {formatDate(order.createdAt)}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    {order.items.length}{" "}
                    {order.items.length === 1 ? "item" : "items"}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${statusClass(order.status)}`}
                  >
                    {order.status}
                  </span>
                  <p className="text-lg font-semibold">
                    {formatPrice(order.total)}
                  </p>
                </div>
              </div>
              <div className="mt-4 border-t pt-4">
                <div className="flex flex-wrap gap-2">
                  {order.items.slice(0, 3).map((item) => (
                    <span
                      key={item.id}
                      className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700"
                    >
                      {item.productName}
                      {item.variantName ? ` — ${item.variantName}` : ""} ×{" "}
                      {item.quantity}
                    </span>
                  ))}
                  {order.items.length > 3 && (
                    <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-500">
                      +{order.items.length - 3} more
                    </span>
                  )}
                </div>
                <Link
                  href={`/account/orders/${order.id}`}
                  className="text-primary mt-4 inline-block text-sm font-medium hover:underline"
                >
                  View Details →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </DefaultAccountLayout>
  );
}
