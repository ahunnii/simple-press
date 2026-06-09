import Link from "next/link";
import { Package } from "lucide-react";

import type { OrdersPageTemplateProps } from "../../types";
import { formatDate } from "~/lib/format-date";
import { formatPrice } from "~/lib/prices";
import { cn } from "~/lib/utils";
import { PageTransition } from "~/components/page-animations";

import { SledgeAccountLayout } from "./sledge-account-layout";

function statusClass(status: string): string {
  switch (status) {
    case "completed":
      return "sl-status-completed";
    case "cancelled":
      return "sl-status-cancelled";
    case "refunded":
      return "sl-status-refunded";
    default:
      return "sl-status-default";
  }
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-block rounded-sm border px-2 py-1 font-sans text-[10px] tracking-[0.12em] uppercase",
        statusClass(status),
      )}
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
            <div className="flex h-16 w-16 items-center justify-center rounded-sm bg-[var(--sl-cream)] text-[var(--sl-coral)]">
              {/* N-1: decorative icon */}
              <Package className="size-6" aria-hidden="true" />
            </div>
            <div>
              {/* N-5: only heading in empty state → h2; C-3: large heading → AA accent token */}
              <h2 className="sl-page-title-md font-heading text-[var(--sl-coral-aa)] uppercase">
                No orders yet
              </h2>
              <p className="sl-eyebrow mt-2 font-sans text-sm">
                When you place an order, it will appear here.
              </p>
            </div>
            <Link href="/shop" className="sl-btn text-xs">
              Browse Shop →
            </Link>
          </div>
        ) : (
          <div className="flex flex-col">
            {/* M-4: visual column headers are decorative — sr-only labels in cells carry semantics */}
            <div
              aria-hidden="true"
              className="mb-0 hidden grid-cols-[auto_1fr_auto_auto_auto] items-center gap-4 border-b border-[var(--sl-border)] pb-3 md:grid"
            >
              {["Order", "Items", "Date", "Status", "Total"].map((h) => (
                <span
                  key={h}
                  className="sl-eyebrow font-sans text-xs tracking-[0.16em] uppercase"
                >
                  {h}
                </span>
              ))}
            </div>

            {orders.map((order) => (
              <div
                key={order.id}
                className="border-b border-[var(--sl-border)] py-5"
              >
                <div className="hidden grid-cols-[auto_1fr_auto_auto_auto] items-center gap-x-4 gap-y-2 md:grid">
                  {/* M-4: sr-only label for order number cell */}
                  <span className="font-sans text-xs tracking-[0.12em] whitespace-nowrap text-[var(--sl-ink)] uppercase">
                    <span className="sr-only">Order </span>#{order.orderNumber}
                  </span>

                  <div className="flex min-w-0 flex-wrap gap-1.5">
                    {order.items.slice(0, 2).map((item) => (
                      <span
                        key={item.id}
                        className="font-sans text-sm tracking-[0.03em] text-[var(--sl-ink)] uppercase"
                      >
                        {item.productName}
                        {item.quantity > 1 && (
                          <span className="sl-eyebrow not-uppercase ml-1 text-[10px]">
                            ×{item.quantity}
                          </span>
                        )}
                      </span>
                    ))}
                    {order.items.length > 2 && (
                      <span className="sl-eyebrow font-sans text-[10px] tracking-[0.12em] uppercase">
                        +{order.items.length - 2}
                      </span>
                    )}
                  </div>

                  {/* M-4: sr-only label for date cell */}
                  <span className="sl-eyebrow font-sans text-xs tracking-[0.1em] whitespace-nowrap">
                    <span className="sr-only">Date: </span>
                    {formatDate(order.createdAt)}
                  </span>

                  <StatusBadge status={order.status} />

                  <div className="flex flex-col items-end gap-1.5">
                    {/* M-4: sr-only label for total cell */}
                    <span className="font-sans text-lg tracking-[0.02em] text-[var(--sl-ink)]">
                      <span className="sr-only">Total: </span>
                      {formatPrice(order.total)}
                    </span>
                    {/* N-2: descriptive aria-label; C-3: coral → coral-aa */}
                    <Link
                      href={`/account/orders/${order.id}`}
                      aria-label={`Details for order #${order.orderNumber}`}
                      className="font-sans text-xs tracking-[0.14em] text-[var(--sl-coral-aa)] uppercase transition-opacity hover:opacity-60"
                    >
                      Details →
                    </Link>
                  </div>
                </div>

                <div className="flex flex-col gap-3 md:hidden">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-sans text-xs tracking-[0.12em] text-[var(--sl-ink)] uppercase">
                      #{order.orderNumber}
                    </span>
                    <span className="sl-eyebrow font-sans text-xs">
                      {formatDate(order.createdAt)}
                    </span>
                  </div>

                  <div className="flex min-w-0 flex-wrap gap-1.5">
                    {order.items.slice(0, 2).map((item) => (
                      <span
                        key={item.id}
                        className="font-sans text-sm tracking-[0.03em] text-[var(--sl-ink)] uppercase"
                      >
                        {item.productName}
                        {item.quantity > 1 && (
                          <span className="sl-eyebrow ml-1 text-[10px]">
                            ×{item.quantity}
                          </span>
                        )}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <StatusBadge status={order.status} />
                    <div className="flex items-center gap-3">
                      <span className="font-sans text-base tracking-[0.02em] text-[var(--sl-ink)]">
                        {formatPrice(order.total)}
                      </span>
                      {/* N-2: descriptive aria-label; C-3: coral → coral-aa */}
                      <Link
                        href={`/account/orders/${order.id}`}
                        aria-label={`Details for order #${order.orderNumber}`}
                        className="font-sans text-xs tracking-[0.14em] text-[var(--sl-coral-aa)] uppercase"
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
