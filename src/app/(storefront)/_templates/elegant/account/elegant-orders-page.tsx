import Link from "next/link";
import { ArrowRight, Package } from "lucide-react";

import { formatDate } from "~/lib/format-date";
import { formatPrice } from "~/lib/prices";

import type { OrdersPageTemplateProps } from "../../types";
import { ElegantAccountLayout } from "./elegant-account-layout";

function statusBadge(status: string) {
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

export function ElegantOrdersPage({ orders }: OrdersPageTemplateProps) {
  return (
    <ElegantAccountLayout heading="My Orders">
      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-secondary">
            <Package className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="mt-6 font-serif text-2xl font-light tracking-wide text-foreground">
            No orders yet
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            When you place an order, it will appear here.
          </p>
          <Link
            href="/shop"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Start Shopping <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="boty-shadow rounded-3xl bg-card p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs tracking-widest text-muted-foreground uppercase">
                    Order #{order.orderNumber}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatDate(order.createdAt)}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {order.items.length}{" "}
                    {order.items.length === 1 ? "item" : "items"}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${statusBadge(order.status)}`}
                  >
                    {order.status}
                  </span>
                  <p className="font-serif text-lg text-foreground">
                    {formatPrice(order.total)}
                  </p>
                </div>
              </div>
              <div className="mt-4 border-t border-border pt-4">
                <div className="flex flex-wrap gap-2">
                  {order.items.slice(0, 3).map((item) => (
                    <span
                      key={item.id}
                      className="rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground"
                    >
                      {item.productName}
                      {item.variantName ? ` — ${item.variantName}` : ""} ×{" "}
                      {item.quantity}
                    </span>
                  ))}
                  {order.items.length > 3 && (
                    <span className="rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground">
                      +{order.items.length - 3} more
                    </span>
                  )}
                </div>
                <Link
                  href={`/account/orders/${order.id}`}
                  className="mt-4 inline-flex items-center gap-1 text-sm text-foreground hover:text-muted-foreground"
                >
                  View Details <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </ElegantAccountLayout>
  );
}
