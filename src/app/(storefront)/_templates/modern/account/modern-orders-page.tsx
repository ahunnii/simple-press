import Link from "next/link";
import { ArrowRight, Package } from "lucide-react";

import type { OrdersPageTemplateProps } from "../../types";
import { formatDate } from "~/lib/format-date";
import { formatPrice } from "~/lib/prices";

import { ModernAccountLayout } from "./modern-account-layout";

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

export function ModernOrdersPage({ orders }: OrdersPageTemplateProps) {
  return (
    <ModernAccountLayout heading="My Orders">
      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="bg-accent/10 mb-4 flex size-16 items-center justify-center rounded-full">
            <Package className="text-accent size-8" aria-hidden="true" />
          </div>
          <h2 className="text-foreground mb-2 font-serif text-xl">
            No orders yet
          </h2>
          <p className="text-muted-foreground mb-6 text-sm">
            When you place an order, it will appear here.
          </p>
          <Link
            href="/shop"
            className="bg-primary text-primary-foreground inline-flex items-center gap-2 px-6 py-3 text-sm font-medium tracking-wide transition-opacity hover:opacity-90"
          >
            Start Shopping <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="border-border bg-card rounded-sm border p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
                    Order #{order.orderNumber}
                  </p>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {formatDate(order.createdAt)}
                  </p>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {order.items.length}{" "}
                    {order.items.length === 1 ? "item" : "items"}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span
                    className={`rounded px-3 py-1 text-xs font-medium capitalize ${statusClass(order.status)}`}
                  >
                    {order.status}
                  </span>
                  <p className="text-foreground font-serif text-lg">
                    {formatPrice(order.total)}
                  </p>
                </div>
              </div>
              <div className="mt-4 border-t pt-4">
                <div className="flex flex-wrap gap-2">
                  {order.items.slice(0, 3).map((item) => (
                    <span
                      key={item.id}
                      className="bg-secondary text-muted-foreground rounded px-2 py-1 text-xs"
                    >
                      {item.productName}
                      {item.variantName ? ` — ${item.variantName}` : ""} ×{" "}
                      {item.quantity}
                    </span>
                  ))}
                  {order.items.length > 3 && (
                    <span className="bg-secondary text-muted-foreground rounded px-2 py-1 text-xs">
                      +{order.items.length - 3} more
                    </span>
                  )}
                </div>
                <Link
                  href={`/account/orders/${order.id}`}
                  className="text-accent mt-4 inline-flex items-center gap-1 text-sm font-medium hover:underline"
                >
                  View Details
                  <span className="sr-only">
                    {" "}
                    for order #{order.orderNumber}
                  </span>
                  <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </ModernAccountLayout>
  );
}
