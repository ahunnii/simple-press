import Link from "next/link";
import { Package } from "lucide-react";

import type { OrdersPageTemplateProps } from "../../types";
import { formatDate } from "~/lib/format-date";
import { formatPrice } from "~/lib/prices";
import {
  FadeIn,
  PageTransition,
  StaggerContainer,
  StaggerItem,
} from "~/components/page-animations";

import { ViiAccountLayout } from "./vii-account-layout";

/** Returns inline-style objects for the order status badge — vii palette. */
function statusStyles(status: string): {
  background: string;
  color: string;
} {
  switch (status) {
    case "open":
      // glacier tint on cream — navy text passes AA
      return { background: "color-mix(in srgb, var(--vii-glacier) 22%, transparent)", color: "var(--vii-navy)" };
    case "completed":
      // subtle copper-light tint on paper — navy text
      return {
        background: "color-mix(in srgb, var(--vii-copper-deep) 12%, transparent)",
        color: "var(--vii-copper-deep)",
      };
    case "cancelled":
      // muted clay tint — ink-soft text
      return {
        background: "color-mix(in srgb, var(--vii-clay) 15%, transparent)",
        color: "var(--vii-ink-soft)",
      };
    case "refunded":
      // light tan wash — ink-soft text
      return {
        background: "color-mix(in srgb, var(--vii-tan) 25%, transparent)",
        color: "var(--vii-ink-soft)",
      };
    default:
      // pending — tan tint / navy
      return { background: "color-mix(in srgb, var(--vii-tan) 35%, transparent)", color: "var(--vii-navy)" };
  }
}

export function ViiOrdersPage({ orders }: OrdersPageTemplateProps) {
  return (
    <PageTransition>
      <ViiAccountLayout
        heading="My Orders"
        breadcrumb={[
          { label: "Home", href: "/" },
          { label: "Account", href: "/account/settings" },
          { label: "Orders" },
        ]}
      >
        {orders.length === 0 ? (
          <FadeIn direction="up">
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                paddingTop: 80,
                paddingBottom: 80,
                textAlign: "center",
              }}
            >
              {/* Icon medallion */}
              <div
                aria-hidden
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  background: "var(--vii-paper)",
                  border: "1px solid var(--vii-hairline-strong)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 24,
                }}
              >
                <Package
                  style={{ width: 28, height: 28, color: "var(--vii-copper-light)" }}
                />
              </div>
              <h2
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: 22,
                  fontWeight: 500,
                  color: "var(--vii-navy)",
                  margin: "0 0 12px",
                }}
              >
                No orders yet
              </h2>
              <p
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 15,
                  color: "var(--vii-ink-soft)",
                  lineHeight: 1.6,
                  margin: "0 0 28px",
                  maxWidth: "36ch",
                }}
              >
                When you place an order, it will appear here.
              </p>
              <Link
                href="/shop"
                style={{
                  display: "inline-block",
                  background: "var(--vii-copper-deep)",
                  color: "var(--vii-paper)",
                  fontFamily: "var(--font-sans)",
                  fontSize: 11,
                  fontWeight: 500,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  padding: "14px 32px",
                  borderRadius: "var(--radius)",
                  textDecoration: "none",
                }}
              >
                Shop Now
              </Link>
            </div>
          </FadeIn>
        ) : (
          <StaggerContainer className="space-y-4" staggerDelay={0.08}>
            {orders.map((order) => (
              <StaggerItem key={order.id}>
                <article
                  style={{
                    background: "var(--vii-paper)",
                    border: "1px solid var(--vii-hairline-strong)",
                    borderRadius: "var(--radius)",
                    padding: 24,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: 16,
                    }}
                  >
                    {/* Left: order meta */}
                    <div>
                      <p
                        style={{
                          fontFamily: "var(--font-sans)",
                          fontSize: 11,
                          fontWeight: 500,
                          letterSpacing: "0.14em",
                          textTransform: "uppercase",
                          color: "var(--vii-ink-soft)",
                          margin: "0 0 4px",
                        }}
                      >
                        Order #{order.orderNumber}
                      </p>
                      <p
                        style={{
                          fontFamily: "var(--font-sans)",
                          fontSize: 13,
                          color: "var(--vii-ink-soft)",
                          margin: "0 0 2px",
                        }}
                      >
                        {formatDate(order.createdAt)}
                      </p>
                      <p
                        style={{
                          fontFamily: "var(--font-sans)",
                          fontSize: 13,
                          color: "var(--vii-ink-soft)",
                          margin: 0,
                        }}
                      >
                        {order.items.length}{" "}
                        {order.items.length === 1 ? "item" : "items"}
                      </p>
                    </div>

                    {/* Right: status + total */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-end",
                        gap: 8,
                      }}
                    >
                      <span
                        style={{
                          ...statusStyles(order.status),
                          fontFamily: "var(--font-sans)",
                          fontSize: 11,
                          fontWeight: 500,
                          letterSpacing: "0.1em",
                          textTransform: "capitalize",
                          padding: "4px 12px",
                          borderRadius: "9999px",
                        }}
                      >
                        {order.status}
                      </span>
                      <p
                        style={{
                          fontFamily: "var(--font-serif)",
                          fontSize: 20,
                          fontWeight: 500,
                          color: "var(--vii-navy)",
                          margin: 0,
                        }}
                      >
                        {formatPrice(order.total)}
                      </p>
                    </div>
                  </div>

                  {/* Item chips + link */}
                  <div
                    style={{
                      marginTop: 16,
                      paddingTop: 16,
                      borderTop: "1px solid var(--vii-hairline)",
                    }}
                  >
                    <div
                      style={{ display: "flex", flexWrap: "wrap", gap: 6 }}
                    >
                      {order.items.slice(0, 3).map((item) => (
                        <span
                          key={item.id}
                          style={{
                            fontFamily: "var(--font-sans)",
                            fontSize: 12,
                            color: "var(--vii-ink-soft)",
                            background: "var(--vii-cream)",
                            border: "1px solid var(--vii-hairline)",
                            borderRadius: "9999px",
                            padding: "3px 10px",
                          }}
                        >
                          {item.productName}
                          {item.variantName ? ` — ${item.variantName}` : ""} ×{" "}
                          {item.quantity}
                        </span>
                      ))}
                      {order.items.length > 3 && (
                        <span
                          style={{
                            fontFamily: "var(--font-sans)",
                            fontSize: 12,
                            color: "var(--vii-tan)",
                            background: "var(--vii-cream)",
                            border: "1px solid var(--vii-hairline)",
                            borderRadius: "9999px",
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
                        fontFamily: "var(--font-sans)",
                        fontSize: 13,
                        fontWeight: 500,
                        color: "var(--vii-copper-deep)",
                        textDecoration: "none",
                        letterSpacing: "0.02em",
                      }}
                    >
                      View details →
                    </Link>
                  </div>
                </article>
              </StaggerItem>
            ))}
          </StaggerContainer>
        )}
      </ViiAccountLayout>
    </PageTransition>
  );
}
