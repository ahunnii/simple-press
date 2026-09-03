import type { CSSProperties } from "react";
import Link from "next/link";

import type { OrdersPageTemplateProps } from "../../types";
import { formatDate } from "~/lib/format-date";
import { formatPrice } from "~/lib/prices";

import { BambooGlyph } from "../shared/bamboo-glyph";
import { BambooReveal, BambooRevealGroup } from "../shared/bamboo-reveal";
import { BambooAccountLayout } from "./bamboo-account-layout";
import { bambooStatusPillClass } from "./bamboo-order-status";

/**
 * Order history. Every row is a slim white "roll paper" panel with the card
 * system's perforation top edge (`.bamboo-torn-card` — the perforation without
 * the featured card's hover tilt, because account data should sit still).
 */
export function BambooOrdersPage({ orders }: OrdersPageTemplateProps) {
  return (
    <BambooAccountLayout heading="My Orders">
      {orders.length === 0 ? (
        <BambooReveal>
          <div className="bamboo-torn-card flex flex-col items-center gap-4 px-8 py-16 text-center">
            <BambooGlyph id="s-sprig" className="h-auto w-[104px]" />
            <h2 className="font-heading text-xl font-semibold text-[var(--bamboo-pine)]">
              No orders yet
            </h2>
            <p className="text-[0.95rem] text-[var(--bamboo-ink-soft)]">
              When you place an order, it will appear here.
            </p>
            <Link href="/shop" className="bamboo-btn bamboo-btn-primary mt-2">
              Start Shopping
            </Link>
          </div>
        </BambooReveal>
      ) : (
        <BambooRevealGroup className="flex flex-col gap-5">
          {orders.map((order, index) => (
            <article
              key={order.id}
              className="bamboo-reveal-item bamboo-torn-card"
              style={{ "--i": index } as CSSProperties}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-heading text-[1.1rem] font-semibold text-[var(--bamboo-pine)]">
                    Order #{order.orderNumber}
                  </p>
                  <p className="mt-1 text-sm text-[var(--bamboo-ink-soft)]">
                    {formatDate(order.createdAt)}
                  </p>
                  <p className="mt-1 text-sm text-[var(--bamboo-muted)]">
                    {order.items.length}{" "}
                    {order.items.length === 1 ? "item" : "items"}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={bambooStatusPillClass(order.status)}>
                    {order.status}
                  </span>
                  <p className="bamboo-price">{formatPrice(order.total)}</p>
                </div>
              </div>

              <div className="mt-5 border-t border-[var(--bamboo-outline)] pt-4">
                <div className="flex flex-wrap gap-2">
                  {order.items.slice(0, 3).map((item) => (
                    <span
                      key={item.id}
                      className="rounded-full bg-[var(--bamboo-sage)] px-3 py-1 text-xs text-[var(--bamboo-pine)]"
                    >
                      {item.productName}
                      {item.variantName ? ` — ${item.variantName}` : ""} ×{" "}
                      {item.quantity}
                    </span>
                  ))}
                  {order.items.length > 3 && (
                    <span className="rounded-full border-2 border-[var(--bamboo-outline)] px-3 py-1 text-xs text-[var(--bamboo-ink-soft)]">
                      +{order.items.length - 3} more
                    </span>
                  )}
                </div>
                <Link
                  href={`/account/orders/${order.id}`}
                  className="bamboo-swipe mt-5 inline-block text-[0.95rem] text-[var(--bamboo-pine)]"
                  aria-label={`View details for order #${order.orderNumber}`}
                >
                  View Details
                  <span aria-hidden="true"> →</span>
                </Link>
              </div>
            </article>
          ))}
        </BambooRevealGroup>
      )}
    </BambooAccountLayout>
  );
}
