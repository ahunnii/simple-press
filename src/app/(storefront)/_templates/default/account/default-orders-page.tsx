import Link from "next/link";
import { Package } from "lucide-react";

import { formatDate } from "~/lib/format-date";
import { formatPrice } from "~/lib/prices";

import type { OrdersPageTemplateProps } from "../../types";
import { DefaultAccountLayout } from "./default-account-layout";

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    open: "border-[#0a0a0a] text-[#0a0a0a]",
    completed: "border-[#15803d] text-[#15803d]",
    fulfilled: "border-[#15803d] text-[#15803d]",
    cancelled: "border-[#dc2626] text-[#dc2626]",
    refunded: "border-[#6b6b6b] text-[#6b6b6b]",
  };
  const style = styles[status] ?? "border-[#b45309] text-[#b45309]";
  return (
    <span
      className={`inline-flex items-center rounded-[2px] border px-2 py-0.5 text-[10px] font-medium tracking-[0.1em] uppercase ${style}`}
    >
      {status}
    </span>
  );
}

export function DefaultOrdersPage({ orders }: OrdersPageTemplateProps) {
  return (
    <DefaultAccountLayout heading="Orders">
      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Package className="mb-4 h-10 w-10 text-[#6b6b6b]" aria-hidden="true" />
          <h2 className="font-serif text-xl font-medium">No orders yet</h2>
          <p className="mt-2 text-sm text-[#6b6b6b]">
            When you place an order, it will appear here.
          </p>
          <Link
            href="/shop"
            className="mt-8 inline-flex h-10 items-center justify-center rounded-[var(--radius)] bg-[#0a0a0a] px-6 text-sm font-medium text-white transition-colors hover:bg-[#2a2a2a]"
          >
            Start shopping
          </Link>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-[#e8e8e8]">
          {orders.map((order) => (
            <div key={order.id} className="py-6 first:pt-0">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-medium">
                      Order #{order.orderNumber}
                    </p>
                    <StatusBadge status={order.status} />
                  </div>
                  <p className="text-[13px] text-[#6b6b6b]">
                    {formatDate(order.createdAt)} &middot;{" "}
                    {order.items.length}{" "}
                    {order.items.length === 1 ? "item" : "items"}
                  </p>
                </div>
                <p className="text-base font-semibold">
                  {formatPrice(order.total)}
                </p>
              </div>

              {/* Item names */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {order.items.slice(0, 3).map((item) => (
                  <span
                    key={item.id}
                    className="rounded-[2px] border border-[#e8e8e8] px-2 py-0.5 text-xs text-[#6b6b6b]"
                  >
                    {item.productName}
                    {item.variantName ? ` — ${item.variantName}` : ""} ×{" "}
                    {item.quantity}
                  </span>
                ))}
                {order.items.length > 3 && (
                  <span className="rounded-[2px] border border-[#e8e8e8] px-2 py-0.5 text-xs text-[#6b6b6b]">
                    +{order.items.length - 3} more
                  </span>
                )}
              </div>

              <Link
                href={`/account/orders/${order.id}`}
                className="mt-4 inline-flex items-center gap-2 text-sm font-medium border-b border-current pb-0.5 transition-[gap] hover:gap-3"
              >
                View details <span aria-hidden="true">→</span>
              </Link>
            </div>
          ))}
        </div>
      )}
    </DefaultAccountLayout>
  );
}
