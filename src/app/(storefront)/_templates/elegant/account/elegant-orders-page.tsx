import Link from "next/link";
import { ArrowRight, Package } from "lucide-react";

import { formatDate } from "~/lib/format-date";
import { formatPrice } from "~/lib/prices";

import type { OrdersPageTemplateProps } from "../../types";
import { ElegantAccountLayout } from "./elegant-account-layout";

const STATUS_STYLES: Record<string, { color: string; label: string }> = {
  open:      { color: "var(--el-sage, #4a5240)",         label: "Open" },
  completed: { color: "var(--el-sage-soft, #8a9474)",    label: "Completed" },
  cancelled: { color: "var(--el-ink-soft, #6b6659)",     label: "Cancelled" },
  refunded:  { color: "var(--el-ink-mute, #9a9485)",     label: "Refunded" },
  fulfilled: { color: "var(--el-sage, #4a5240)",         label: "Fulfilled" },
};

function StatusChip({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? { color: "var(--el-ink-soft, #6b6659)", label: status };
  return (
    <span
      style={{
        fontFamily: "var(--font-mono, ui-monospace)",
        fontSize: 10,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        color: s.color,
        padding: "3px 10px",
        border: `1px solid ${s.color}`,
        borderRadius: 999,
      }}
    >
      {s.label}
    </span>
  );
}

export function ElegantOrdersPage({ orders }: OrdersPageTemplateProps) {
  return (
    <ElegantAccountLayout heading="My Orders">
      {orders.length === 0 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "60px 0",
            textAlign: "center",
          }}
        >
          <Package
            aria-hidden={true}
            style={{
              width: 36,
              height: 36,
              color: "var(--el-ink-soft, #6b6659)",
              marginBottom: 20,
            }}
            strokeWidth={1}
          />
          <p
            style={{
              fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)",
              fontSize: 26,
              color: "var(--el-ink, #1c1a17)",
              marginBottom: 10,
            }}
          >
            No orders yet.
          </p>
          <p
            style={{
              fontSize: 14,
              color: "var(--el-ink-soft, #6b6659)",
              marginBottom: 28,
              fontFamily: "var(--font-sans, sans-serif)",
            }}
          >
            When you place an order, it will appear here.
          </p>
          <Link
            href="/shop"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 22px",
              borderRadius: 999,
              fontSize: 12,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              fontWeight: 500,
              background: "var(--el-ink, #1c1a17)",
              color: "var(--el-paper, #fbf8f2)",
              textDecoration: "none",
              fontFamily: "var(--font-sans, sans-serif)",
            }}
          >
            Start shopping
            <ArrowRight aria-hidden={true} style={{ width: 13, height: 13 }} />
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {orders.map((order) => (
            <div
              key={order.id}
              style={{
                background: "var(--el-paper, #fbf8f2)",
                border: "1px solid var(--el-line, rgba(28,26,23,0.12))",
                borderRadius: 8,
                padding: "20px 24px",
              }}
            >
              {/* Top row */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 16,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div
                    style={{
                      fontFamily: "var(--font-mono, ui-monospace)",
                      fontSize: 10,
                      letterSpacing: "0.16em",
                      textTransform: "uppercase",
                      color: "var(--el-ink-soft, #6b6659)",
                      marginBottom: 4,
                    }}
                  >
                    Order #{order.orderNumber}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: "var(--el-ink-soft, #6b6659)",
                      fontFamily: "var(--font-sans, sans-serif)",
                    }}
                  >
                    {formatDate(order.createdAt)} ·{" "}
                    {order.items.length}{" "}
                    {order.items.length === 1 ? "item" : "items"}
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                    gap: 8,
                  }}
                >
                  <StatusChip status={order.status} />
                  <span
                    style={{
                      fontFamily:
                        "var(--font-serif, 'Cormorant Garamond', serif)",
                      fontSize: 20,
                      color: "var(--el-ink, #1c1a17)",
                    }}
                  >
                    {formatPrice(order.total)}
                  </span>
                </div>
              </div>

              {/* Item tags + link */}
              <div
                style={{
                  marginTop: 16,
                  paddingTop: 14,
                  borderTop:
                    "1px solid var(--el-line-2, rgba(28,26,23,0.06))",
                }}
              >
                <div
                  style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}
                >
                  {order.items.slice(0, 3).map((item) => (
                    <span
                      key={item.id}
                      style={{
                        fontFamily: "var(--font-mono, ui-monospace)",
                        fontSize: 10,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: "var(--el-ink-soft, #6b6659)",
                        padding: "4px 10px",
                        border:
                          "1px solid var(--el-line, rgba(28,26,23,0.12))",
                        borderRadius: 999,
                      }}
                    >
                      {item.productName}
                      {item.variantName ? ` — ${item.variantName}` : ""} ×
                      {item.quantity}
                    </span>
                  ))}
                  {order.items.length > 3 && (
                    <span
                      style={{
                        fontFamily: "var(--font-mono, ui-monospace)",
                        fontSize: 10,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: "var(--el-ink-soft, #6b6659)",
                        padding: "4px 10px",
                        border:
                          "1px solid var(--el-line, rgba(28,26,23,0.12))",
                        borderRadius: 999,
                      }}
                    >
                      +{order.items.length - 3} more
                    </span>
                  )}
                </div>
                <Link
                  href={`/account/orders/${order.id}`}
                  aria-label={`View details for order #${order.orderNumber}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 12,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "var(--el-ink, #1c1a17)",
                    textDecoration: "none",
                    fontFamily: "var(--font-mono, ui-monospace)",
                  }}
                >
                  View details
                  <ArrowRight aria-hidden={true} style={{ width: 12, height: 12 }} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </ElegantAccountLayout>
  );
}
