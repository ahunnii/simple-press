"use client";

import type { CSSProperties } from "react";

import type { OrdersPageTemplateProps } from "../../types";
import { formatDate } from "~/lib/format-date";
import { formatPrice } from "~/lib/prices";

import { DreamLink } from "../shared/dream-link";
import { DreamRevealGroup } from "../shared/dream-reveal";
import { DreamAccountEmptyState } from "./dream-account-empty-state";
import { DreamAccountLayout } from "./dream-account-layout";
import { DreamOrderStatusBadge } from "./dream-order-status-badge";

export function DreamOrdersPage({ orders }: OrdersPageTemplateProps) {
  return (
    <DreamAccountLayout
      heading="My Orders"
      breadcrumb={[
        { label: "Home", href: "/" },
        { label: "Account", href: "/account/settings" },
        { label: "Orders" },
      ]}
    >
      {orders.length === 0 ? (
        <DreamAccountEmptyState
          heading="No orders yet"
          body="When Selest sends you an estimate and it's confirmed, it will appear here."
          ctaLabel="Request an estimate"
          ctaHref="/contact"
        />
      ) : (
        <DreamRevealGroup className="flex flex-col gap-4">
          {orders.map((order, i) => (
            <article
              key={order.id}
              className="dream-reveal-item dream-card"
              style={{ "--i": Math.min(i, 7) } as CSSProperties}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="m-0 mb-1.5 text-[12px] tracking-[0.06em] text-[var(--dream-gold-ink)] tabular-nums">
                    Order #{order.orderNumber}
                  </p>
                  <p className="m-0 mb-0.5 text-[13px] text-[var(--dream-soft)]">
                    {formatDate(order.createdAt)}
                  </p>
                  <p className="m-0 text-[13px] text-[var(--dream-soft)]">
                    {order.items.length}{" "}
                    {order.items.length === 1 ? "item" : "items"}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <DreamOrderStatusBadge status={order.status} />
                  <p className="m-0 [font-family:var(--font-dream-display)] text-[20px] text-[var(--dream-ink)] tabular-nums">
                    {formatPrice(order.total)}
                  </p>
                </div>
              </div>

              <div className="mt-4 border-t border-[var(--dream-line)] pt-4">
                <div className="flex flex-wrap gap-1.5">
                  {order.items.slice(0, 3).map((item) => (
                    <span
                      key={item.id}
                      className="rounded-[var(--dream-radius-pill)] bg-[var(--dream-sky)] px-2.5 py-1 text-[12px] text-[var(--dream-soft)]"
                    >
                      {item.productName}
                      {item.variantName ? ` — ${item.variantName}` : ""} ×{" "}
                      {item.quantity}
                    </span>
                  ))}
                  {order.items.length > 3 ? (
                    <span className="rounded-[var(--dream-radius-pill)] bg-[var(--dream-sky)] px-2.5 py-1 text-[12px] text-[var(--dream-soft)]">
                      +{order.items.length - 3} more
                    </span>
                  ) : null}
                </div>

                <div className="mt-3.5">
                  <DreamLink href={`/account/orders/${order.id}`}>
                    View details →
                  </DreamLink>
                </div>
              </div>
            </article>
          ))}
        </DreamRevealGroup>
      )}
    </DreamAccountLayout>
  );
}
