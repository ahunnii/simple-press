import Link from "next/link";
import { Package } from "lucide-react";

import type { OrdersPageTemplateProps } from "../../types";
import { formatDate } from "~/lib/format-date";
import { formatPrice } from "~/lib/prices";
import { Button } from "~/components/ui/button";
import { PageTransition } from "~/components/page-animations";

import { NoiseAccountLayout } from "./noise-account-layout";

function statusClass(status: string) {
  switch (status) {
    case "open":
      return "border-blue-500/40 text-blue-400";
    case "completed":
      return "border-green-500/40 text-green-400";
    case "cancelled":
      return "border-red-500/40 text-red-400";
    case "refunded":
      return "border-border text-muted-foreground";
    default:
      return "border-yellow-500/40 text-yellow-400";
  }
}

export function NoiseOrdersPage({ orders }: OrdersPageTemplateProps) {
  return (
    <PageTransition>
      <NoiseAccountLayout heading="My Orders">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-6 flex size-16 items-center justify-center border border-border">
              <Package className="size-7 text-muted-foreground" />
            </div>
            <h2 className="font-serif text-2xl font-light text-foreground">
              No orders yet
            </h2>
            <p className="mt-2 font-sans text-sm text-muted-foreground">
              When you place an order, it will appear here.
            </p>
            <Button
              asChild
              className="mt-8 rounded-none font-sans text-[10px] tracking-[0.25em] uppercase"
              size="lg"
            >
              <Link href="/shop">Shop the Collection</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-px">
            {orders.map((order) => (
              <div
                key={order.id}
                className="border border-border bg-background p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-sans text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                      Order #{order.orderNumber}
                    </p>
                    <p className="mt-1 font-sans text-sm text-muted-foreground">
                      {formatDate(order.createdAt)}
                    </p>
                    <p className="mt-1 font-sans text-sm text-muted-foreground">
                      {order.items.length}{" "}
                      {order.items.length === 1 ? "item" : "items"}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span
                      className={`border px-3 py-1 font-sans text-[9px] tracking-[0.2em] uppercase ${statusClass(order.status)}`}
                    >
                      {order.status}
                    </span>
                    <p className="font-serif text-xl font-light text-foreground">
                      {formatPrice(order.total)}
                    </p>
                  </div>
                </div>
                <div className="mt-4 border-t border-border pt-4">
                  <div className="flex flex-wrap gap-2">
                    {order.items.slice(0, 3).map((item) => (
                      <span
                        key={item.id}
                        className="border border-border px-2 py-1 font-sans text-[10px] tracking-wide text-muted-foreground"
                      >
                        {item.productName}
                        {item.variantName ? ` — ${item.variantName}` : ""} ×{" "}
                        {item.quantity}
                      </span>
                    ))}
                    {order.items.length > 3 && (
                      <span className="border border-border px-2 py-1 font-sans text-[10px] tracking-wide text-muted-foreground">
                        +{order.items.length - 3} more
                      </span>
                    )}
                  </div>
                  <Link
                    href={`/account/orders/${order.id}`}
                    className="mt-4 inline-block font-sans text-[10px] tracking-[0.2em] uppercase text-foreground underline-offset-4 hover:underline"
                  >
                    View Details →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </NoiseAccountLayout>
    </PageTransition>
  );
}
