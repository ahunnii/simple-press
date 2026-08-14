import Link from "next/link";

import type { OrdersPageTemplateProps } from "../../types";
import { formatDate } from "~/lib/format-date";
import { formatPrice } from "~/lib/prices";
import { PageTransition } from "~/components/page-animations";

import { PinkBadge } from "../shared/pink-badge";
import { PinkEmptyState } from "../shared/pink-empty-state";
import { PinkAccountLayout } from "./pink-account-layout";

/** rose = still moving (open); ink = settled (completed, cancelled, refunded). */
function statusTone(status: string): "rose" | "ink" {
  return status === "open" ? "rose" : "ink";
}

const THUMB_LIMIT = 3;

export function PinkOrdersPage({ orders }: OrdersPageTemplateProps) {
  return (
    <PageTransition>
      <PinkAccountLayout
        title="Orders"
        description="Everything you've ordered from us, most recent first."
      >
        {orders.length === 0 ? (
          <PinkEmptyState
            heading="No orders yet"
            body="When you place an order, it will show up here."
            ctaLabel="Shop now"
            ctaHref="/shop"
          />
        ) : (
          <div style={{ borderTop: "1px solid var(--pink-ink)" }}>
            {/* Column headers */}
            <div
              className="hidden gap-6 py-4 sm:grid"
              style={{ gridTemplateColumns: "140px 1fr auto auto" }}
            >
              <span className="pink-label">Order</span>
              <span className="pink-label">Pieces</span>
              <span className="pink-label">Status</span>
              <span className="pink-label text-right">Total</span>
            </div>

            {orders.map((order) => {
              const shown = order.items.slice(0, THUMB_LIMIT);
              const overflow = order.items.length - shown.length;

              return (
                <div
                  key={order.id}
                  className="py-6"
                  style={{ borderTop: "1px solid var(--pink-ink)" }}
                >
                  <div className="flex flex-col gap-4 sm:hidden">
                    <div className="flex items-center justify-between gap-3">
                      <span
                        className="pink-display"
                        style={{ fontSize: 16, fontWeight: 600 }}
                      >
                        #{order.orderNumber}
                      </span>
                      <PinkBadge tone={statusTone(order.status)}>
                        {order.status}
                      </PinkBadge>
                    </div>
                    <span
                      className="text-[13px]"
                      style={{ color: "var(--pink-subtle)" }}
                    >
                      {formatDate(order.createdAt)}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {shown.map((item) => (
                        <ItemThumb
                          key={item.id}
                          name={item.productName}
                          quantity={item.quantity}
                        />
                      ))}
                      {overflow > 0 && (
                        <span
                          className="flex items-center text-[12px]"
                          style={{ color: "var(--pink-subtle)" }}
                        >
                          +{overflow} more
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span
                        className="pink-display"
                        style={{ fontSize: 18, fontWeight: 600 }}
                      >
                        {formatPrice(order.total)}
                      </span>
                      <Link
                        href={`/account/orders/${order.id}`}
                        className="text-[13px] font-medium"
                        style={{ color: "var(--pink-rose)" }}
                      >
                        View order →
                      </Link>
                    </div>
                  </div>

                  <div
                    className="hidden items-center gap-6 sm:grid"
                    style={{ gridTemplateColumns: "140px 1fr auto auto" }}
                  >
                    <div className="flex flex-col gap-1">
                      <span
                        className="pink-display"
                        style={{ fontSize: 16, fontWeight: 600 }}
                      >
                        #{order.orderNumber}
                      </span>
                      <span
                        className="text-[13px]"
                        style={{ color: "var(--pink-subtle)" }}
                      >
                        {formatDate(order.createdAt)}
                      </span>
                    </div>

                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      {shown.map((item) => (
                        <ItemThumb
                          key={item.id}
                          name={item.productName}
                          quantity={item.quantity}
                        />
                      ))}
                      {overflow > 0 && (
                        <span
                          className="text-[12px]"
                          style={{ color: "var(--pink-subtle)" }}
                        >
                          +{overflow} more
                        </span>
                      )}
                    </div>

                    <PinkBadge tone={statusTone(order.status)}>
                      {order.status}
                    </PinkBadge>

                    <div className="flex flex-col items-end gap-1">
                      <span
                        className="pink-display"
                        style={{ fontSize: 18, fontWeight: 600 }}
                      >
                        {formatPrice(order.total)}
                      </span>
                      <Link
                        href={`/account/orders/${order.id}`}
                        className="text-[13px] font-medium whitespace-nowrap"
                        style={{ color: "var(--pink-rose)" }}
                      >
                        View order →
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </PinkAccountLayout>
    </PageTransition>
  );
}

/**
 * Item chip: a decorative square "thumbnail" (`OrderItem` is a pricing/name
 * snapshot with no image reference — see `prisma/schema.prisma` — so this
 * shows the piece's initial on a panel square rather than a photo, a
 * deviation noted in the build report) beside the piece name and quantity.
 */
function ItemThumb({ name, quantity }: { name: string; quantity: number }) {
  const initial = name.trim().charAt(0).toUpperCase() || "•";
  return (
    <span className="inline-flex items-center gap-2">
      <span
        aria-hidden="true"
        className="pink-display flex h-9 w-9 shrink-0 items-center justify-center text-[13px] font-semibold"
        style={{
          background: "var(--pink-panel)",
          border: "1px solid var(--pink-line)",
          color: "var(--pink-muted)",
        }}
      >
        {initial}
      </span>
      <span
        className="max-w-[16ch] truncate text-[13px]"
        style={{ color: "var(--pink-muted)" }}
      >
        {name}
        {quantity > 1 && (
          <span style={{ color: "var(--pink-subtle)" }}> ×{quantity}</span>
        )}
      </span>
    </span>
  );
}
