import Link from "next/link";
import { Package } from "lucide-react";

import type { OrdersPageTemplateProps } from "../../types";
import { formatDate } from "~/lib/format-date";
import { formatPrice } from "~/lib/prices";
import { PageTransition } from "~/components/page-animations";

import { SledgeAccountLayout } from "./sledge-account-layout";

function statusStyle(status: string): React.CSSProperties {
  switch (status) {
    case "completed":
      return { borderColor: "#16a34a", color: "#16a34a", background: "#f0fdf4" };
    case "cancelled":
      return { borderColor: "#dc2626", color: "#dc2626", background: "#fef2f2" };
    case "refunded":
      return {
        color: "var(--sl-ink-soft)",
        borderColor: "#d8d8d8",
        background: "var(--sl-cream)",
      };
    default:
      return {
        borderColor: "#d8d8d8",
        color: "var(--sl-ink)",
        background: "#ffffff",
      };
  }
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className="inline-block rounded-sm border px-2 py-1 font-sans text-[10px] tracking-[0.12em] uppercase"
      style={statusStyle(status)}
    >
      {status}
    </span>
  );
}

export function SledgeOrdersPage({ orders }: OrdersPageTemplateProps) {
  return (
    <PageTransition className="bg-white">
      <SledgeAccountLayout heading="My Orders">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-6 py-20 text-center">
            <div
              className="flex items-center justify-center rounded-sm"
              style={{
                width: "64px",
                height: "64px",
                background: "var(--sl-cream)",
                color: "var(--sl-coral)",
              }}
            >
              <Package className="size-6" />
            </div>
            <div>
              <p
                className="uppercase"
                style={{
                  fontSize: "clamp(1.25rem, 3vw, 1.75rem)",
                  color: "var(--sl-coral)",
                  letterSpacing: "0.04em",
                  lineHeight: 1,
                }}
              >
                No orders yet
              </p>
              <p
                className="mt-2 font-sans text-sm"
                style={{ color: "var(--sl-ink-soft)" }}
              >
                When you place an order, it will appear here.
              </p>
            </div>
            <Link href="/shop" className="sl-btn text-xs">
              Browse Shop →
            </Link>
          </div>
        ) : (
          <div className="flex flex-col">
            <div
              className="mb-0 hidden items-center gap-4 border-b pb-3 md:grid"
              style={{
                gridTemplateColumns: "auto 1fr auto auto auto",
                borderColor: "#e8e8e8",
              }}
            >
              {["Order", "Items", "Date", "Status", "Total"].map((h) => (
                <span
                  key={h}
                  className="font-sans text-xs tracking-[0.16em] uppercase"
                  style={{ color: "var(--sl-ink-soft)" }}
                >
                  {h}
                </span>
              ))}
            </div>

            {orders.map((order) => (
              <div
                key={order.id}
                className="border-b py-5"
                style={{ borderColor: "#e8e8e8" }}
              >
                <div
                  className="hidden items-center gap-x-4 gap-y-2 md:grid"
                  style={{ gridTemplateColumns: "auto 1fr auto auto auto" }}
                >
                  <span
                    className="font-sans text-xs tracking-[0.12em] whitespace-nowrap uppercase"
                    style={{ color: "var(--sl-ink)" }}
                  >
                    #{order.orderNumber}
                  </span>

                  <div className="flex min-w-0 flex-wrap gap-1.5">
                    {order.items.slice(0, 2).map((item) => (
                      <span
                        key={item.id}
                        className="font-sans text-sm tracking-[0.03em] uppercase"
                        style={{ color: "var(--sl-ink)" }}
                      >
                        {item.productName}
                        {item.quantity > 1 && (
                          <span
                            className="ml-1 text-[10px] not-uppercase"
                            style={{ color: "var(--sl-ink-soft)" }}
                          >
                            ×{item.quantity}
                          </span>
                        )}
                      </span>
                    ))}
                    {order.items.length > 2 && (
                      <span
                        className="font-sans text-[10px] tracking-[0.12em] uppercase"
                        style={{ color: "var(--sl-ink-soft)" }}
                      >
                        +{order.items.length - 2}
                      </span>
                    )}
                  </div>

                  <span
                    className="font-sans text-xs tracking-[0.1em] whitespace-nowrap"
                    style={{ color: "var(--sl-ink-soft)" }}
                  >
                    {formatDate(order.createdAt)}
                  </span>

                  <StatusBadge status={order.status} />

                  <div className="flex flex-col items-end gap-1.5">
                    <span
                      className="font-sans text-lg tracking-[0.02em]"
                      style={{ color: "var(--sl-ink)" }}
                    >
                      {formatPrice(order.total)}
                    </span>
                    <Link
                      href={`/account/orders/${order.id}`}
                      className="font-sans text-xs tracking-[0.14em] uppercase transition-opacity hover:opacity-60"
                      style={{ color: "var(--sl-coral)" }}
                    >
                      Details →
                    </Link>
                  </div>
                </div>

                <div className="flex flex-col gap-3 md:hidden">
                  <div className="flex items-center justify-between gap-3">
                    <span
                      className="font-sans text-xs tracking-[0.12em] uppercase"
                      style={{ color: "var(--sl-ink)" }}
                    >
                      #{order.orderNumber}
                    </span>
                    <span
                      className="font-sans text-xs"
                      style={{ color: "var(--sl-ink-soft)" }}
                    >
                      {formatDate(order.createdAt)}
                    </span>
                  </div>

                  <div className="flex min-w-0 flex-wrap gap-1.5">
                    {order.items.slice(0, 2).map((item) => (
                      <span
                        key={item.id}
                        className="font-sans text-sm tracking-[0.03em] uppercase"
                        style={{ color: "var(--sl-ink)" }}
                      >
                        {item.productName}
                        {item.quantity > 1 && (
                          <span
                            className="ml-1 text-[10px]"
                            style={{ color: "var(--sl-ink-soft)" }}
                          >
                            ×{item.quantity}
                          </span>
                        )}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <StatusBadge status={order.status} />
                    <div className="flex items-center gap-3">
                      <span
                        className="font-sans text-base tracking-[0.02em]"
                        style={{ color: "var(--sl-ink)" }}
                      >
                        {formatPrice(order.total)}
                      </span>
                      <Link
                        href={`/account/orders/${order.id}`}
                        className="font-sans text-xs tracking-[0.14em] uppercase"
                        style={{ color: "var(--sl-coral)" }}
                      >
                        Details →
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SledgeAccountLayout>
    </PageTransition>
  );
}
