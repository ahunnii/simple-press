import Link from "next/link";
import { Package } from "lucide-react";

import type { OrdersPageTemplateProps } from "../../types";
import { formatDate } from "~/lib/format-date";
import { formatPrice } from "~/lib/prices";
import { Button } from "~/components/ui/button";

import { DarkTrendAccountLayout } from "./dark-trend-account-layout";

function statusClass(status: string) {
  switch (status) {
    case "open":
      return "bg-blue-900/40 text-blue-300";
    case "completed":
      return "bg-green-900/40 text-green-300";
    case "cancelled":
      return "bg-red-900/40 text-red-300";
    case "refunded":
      return "bg-zinc-700 text-zinc-300";
    default:
      return "bg-yellow-900/40 text-yellow-300";
  }
}

export function DarkTrendOrdersPage({ orders }: OrdersPageTemplateProps) {
  return (
    <DarkTrendAccountLayout heading="My Orders">
      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex size-16 items-center justify-center rounded-sm bg-purple-500/20">
            {/* N-1: decorative icon */}
            <Package aria-hidden="true" className="size-8 text-purple-400" />
          </div>
          <h2 className="mb-2 text-xl font-semibold text-white">
            No orders yet
          </h2>
          <p className="mb-6 text-sm text-white/70">
            When you place an order, it will appear here.
          </p>
          {/* S-11: violet-600 */}
          <Button
            asChild
            className="bg-violet-600 px-8 py-6 text-sm font-semibold tracking-wider text-white uppercase hover:bg-violet-700"
          >
            <Link href="/shop">Start Shopping</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="rounded-sm border border-white/10 bg-zinc-900 p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-white/50">
                    Order #{order.orderNumber}
                  </p>
                  <p className="mt-1 text-sm text-white/50">
                    {formatDate(order.createdAt)}
                  </p>
                  <p className="mt-1 text-sm text-white/50">
                    {order.items.length}{" "}
                    {order.items.length === 1 ? "item" : "items"}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span
                    className={`rounded-sm px-3 py-1 text-xs font-medium capitalize ${statusClass(order.status)}`}
                  >
                    {order.status}
                  </span>
                  <p className="text-lg font-semibold text-white">
                    {formatPrice(order.total)}
                  </p>
                </div>
              </div>
              <div className="mt-4 border-t border-white/10 pt-4">
                <div className="flex flex-wrap gap-2">
                  {order.items.slice(0, 3).map((item) => (
                    <span
                      key={item.id}
                      className="rounded-sm bg-white/10 px-2 py-1 text-xs text-white/70"
                    >
                      {item.productName}
                      {item.variantName ? ` — ${item.variantName}` : ""} ×{" "}
                      {item.quantity}
                    </span>
                  ))}
                  {order.items.length > 3 && (
                    <span className="rounded-sm bg-white/10 px-2 py-1 text-xs text-white/50">
                      +{order.items.length - 3} more
                    </span>
                  )}
                </div>
                {/* M-7: disambiguated aria-label per order */}
                <Link
                  href={`/account/orders/${order.id}`}
                  aria-label={`View details for order #${order.orderNumber}`}
                  className="mt-4 inline-block text-sm font-medium text-purple-400 hover:underline"
                >
                  View Details →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </DarkTrendAccountLayout>
  );
}
