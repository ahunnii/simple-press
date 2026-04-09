import Link from "next/link";
import { Package } from "lucide-react";

import { formatDate } from "~/lib/format-date";
import { formatPrice } from "~/lib/prices";
import { FadeIn, StaggerContainer, StaggerItem } from "~/components/page-animations";

import type { OrdersPageTemplateProps } from "../../types";
import { PollenAccountLayout } from "./pollen-account-layout";

function statusClass(status: string) {
  switch (status) {
    case "paid":
      return "bg-blue-100 text-blue-800";
    case "fulfilled":
      return "bg-green-100 text-green-800";
    case "cancelled":
      return "bg-red-100 text-red-800";
    case "refunded":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-yellow-100 text-yellow-800";
  }
}

export function PollenOrdersPage({ orders }: OrdersPageTemplateProps) {
  return (
    <PollenAccountLayout heading="My Orders">
      {orders.length === 0 ? (
        <FadeIn direction="up">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-[#5e8b4a]/10">
              <Package className="size-8 text-[#5e8b4a]" />
            </div>
            <h2 className="mb-2 text-xl font-bold text-[#374151]">
              No orders yet
            </h2>
            <p className="mb-6 text-sm text-[#4b5563]">
              When you place an order, it will appear here.
            </p>
            <Link
              href="/shop"
              className="rounded-full bg-[#5e8b4a] px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Start Shopping
            </Link>
          </div>
        </FadeIn>
      ) : (
        <StaggerContainer className="space-y-4" staggerDelay={0.08}>
          {orders.map((order) => (
            <StaggerItem key={order.id}>
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-[#4b5563]">
                      Order #{order.orderNumber}
                    </p>
                    <p className="mt-1 text-sm text-[#4b5563]">
                      {formatDate(order.createdAt)}
                    </p>
                    <p className="mt-1 text-sm text-[#4b5563]">
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
                    <p className="text-lg font-bold text-[#374151]">
                      {formatPrice(order.total)}
                    </p>
                  </div>
                </div>
                <div className="mt-4 border-t pt-4">
                  <div className="flex flex-wrap gap-2">
                    {order.items.slice(0, 3).map((item) => (
                      <span
                        key={item.id}
                        className="rounded-full bg-gray-100 px-3 py-1 text-xs text-[#4b5563]"
                      >
                        {item.productName}
                        {item.variantName ? ` — ${item.variantName}` : ""} ×{" "}
                        {item.quantity}
                      </span>
                    ))}
                    {order.items.length > 3 && (
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-500">
                        +{order.items.length - 3} more
                      </span>
                    )}
                  </div>
                  <Link
                    href={`/account/orders/${order.id}`}
                    className="mt-4 inline-block text-sm font-semibold text-[#5e8b4a] hover:underline"
                  >
                    View Details →
                  </Link>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      )}
    </PollenAccountLayout>
  );
}
