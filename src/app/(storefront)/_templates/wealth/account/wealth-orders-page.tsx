"use client";

import Link from "next/link";
import { Package } from "lucide-react";

import type { OrdersPageTemplateProps } from "../../types";
import { formatDate } from "~/lib/format-date";
import { formatPrice } from "~/lib/prices";

import { WealthLedgeButton } from "../shared/wealth-ledge-button";
import { WealthReveal, WealthRevealGroup } from "../shared/wealth-reveal";
import { WealthAccountLayout } from "./wealth-account-layout";
import { statusStyles } from "./wealth-order-status-badge";

export function WealthOrdersPage({ orders }: OrdersPageTemplateProps) {
  return (
    <WealthAccountLayout
      heading="My Orders"
      breadcrumb={[
        { label: "Home", href: "/" },
        { label: "Account", href: "/account/settings" },
        { label: "Orders" },
      ]}
    >
      {orders.length === 0 ? (
        <WealthReveal>
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div
              aria-hidden
              className="mb-6 flex h-16 w-16 items-center justify-center rounded-full"
              style={{ background: "var(--wealth-surface)" }}
            >
              <Package style={{ width: 28, height: 28, color: "var(--wealth-muted)" }} />
            </div>
            <h2
              style={{
                fontFamily: "var(--font-wealth-sub)",
                fontStyle: "italic",
                fontSize: 24,
                color: "var(--wealth-ink)",
                margin: "0 0 12px",
              }}
            >
              No orders yet
            </h2>
            {/* DCWF is a service/lending organization with no shop — the
                nearest equivalent "purchase" action is a donation, so the
                empty-state CTA points there rather than at a nonexistent
                /shop flow (see build report). */}
            <p
              style={{
                fontFamily: "var(--font-wealth-body)",
                fontSize: 15,
                color: "var(--wealth-muted)",
                lineHeight: "25.5px",
                margin: "0 0 28px",
                maxWidth: "36ch",
              }}
            >
              When you make a donation or purchase, it will appear here.
            </p>
            <WealthLedgeButton href="/donate" variant="donate">
              Support DCWF
            </WealthLedgeButton>
          </div>
        </WealthReveal>
      ) : (
        <WealthRevealGroup className="flex flex-col gap-4">
          {orders.map((order, i) => (
            <article
              key={order.id}
              className="wealth-reveal-item"
              style={
                {
                  "--i": Math.min(i, 7),
                  background: "var(--wealth-paper)",
                  border: "1px solid var(--wealth-surface-2)",
                  padding: 24,
                } as React.CSSProperties
              }
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p
                    style={{
                      fontFamily: "var(--font-wealth-mono)",
                      fontSize: 12,
                      letterSpacing: "1.2px",
                      textTransform: "uppercase",
                      color: "var(--wealth-eyebrow)",
                      margin: "0 0 6px",
                    }}
                  >
                    Order #{order.orderNumber}
                  </p>
                  <p style={{ fontSize: 13, color: "var(--wealth-muted)", margin: "0 0 2px" }}>
                    {formatDate(order.createdAt)}
                  </p>
                  <p style={{ fontSize: 13, color: "var(--wealth-muted)", margin: 0 }}>
                    {order.items.length} {order.items.length === 1 ? "item" : "items"}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <span
                    style={{
                      ...statusStyles(order.status),
                      fontFamily: "var(--font-wealth-mono)",
                      fontSize: 11,
                      letterSpacing: "1px",
                      textTransform: "uppercase",
                      padding: "4px 10px",
                    }}
                  >
                    {order.status}
                  </span>
                  <p
                    style={{
                      fontFamily: "var(--font-wealth-sub)",
                      fontStyle: "italic",
                      fontSize: 20,
                      color: "var(--wealth-ink)",
                      margin: 0,
                    }}
                  >
                    {formatPrice(order.total)}
                  </p>
                </div>
              </div>

              <div
                className="mt-4 pt-4"
                style={{ borderTop: "1px solid var(--wealth-surface-2)" }}
              >
                <div className="flex flex-wrap gap-1.5">
                  {order.items.slice(0, 3).map((item) => (
                    <span
                      key={item.id}
                      style={{
                        fontSize: 12,
                        color: "var(--wealth-muted)",
                        background: "var(--wealth-surface)",
                        padding: "3px 10px",
                      }}
                    >
                      {item.productName}
                      {item.variantName ? ` — ${item.variantName}` : ""} × {item.quantity}
                    </span>
                  ))}
                  {order.items.length > 3 && (
                    <span
                      style={{
                        fontSize: 12,
                        color: "var(--wealth-muted)",
                        background: "var(--wealth-surface)",
                        padding: "3px 10px",
                      }}
                    >
                      +{order.items.length - 3} more
                    </span>
                  )}
                </div>
                <Link
                  href={`/account/orders/${order.id}`}
                  style={{
                    display: "inline-block",
                    marginTop: 14,
                    fontSize: 13,
                    fontWeight: 500,
                    color: "var(--wealth-primary)",
                  }}
                >
                  View details →
                </Link>
              </div>
            </article>
          ))}
        </WealthRevealGroup>
      )}
    </WealthAccountLayout>
  );
}
