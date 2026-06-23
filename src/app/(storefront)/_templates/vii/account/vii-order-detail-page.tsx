import Link from "next/link";
import { ExternalLink } from "lucide-react";

import type { OrderDetailPageTemplateProps } from "../../types";
import { formatDate } from "~/lib/format-date";
import { formatPrice } from "~/lib/prices";
import { FadeIn, PageTransition } from "~/components/page-animations";

import { ViiOverline } from "../shared/vii-overline";

/** Returns inline-style objects for the order status badge — vii palette. */
function statusStyles(status: string): {
  background: string;
  color: string;
} {
  switch (status) {
    case "open":
      return {
        background: "color-mix(in srgb, var(--vii-glacier) 22%, transparent)",
        color: "var(--vii-navy)",
      };
    case "completed":
      return {
        background:
          "color-mix(in srgb, var(--vii-copper-deep) 12%, transparent)",
        color: "var(--vii-copper-deep)",
      };
    case "cancelled":
      return {
        background: "color-mix(in srgb, var(--vii-clay) 15%, transparent)",
        color: "var(--vii-ink-soft)",
      };
    case "refunded":
      return {
        background: "color-mix(in srgb, var(--vii-tan) 25%, transparent)",
        color: "var(--vii-ink-soft)",
      };
    default:
      return {
        background: "color-mix(in srgb, var(--vii-tan) 35%, transparent)",
        color: "var(--vii-navy)",
      };
  }
}

/** Thin reusable card shell — paper bg, hairline border, sharp radius. */
function ViiCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        background: "var(--vii-paper)",
        border: "1px solid var(--vii-hairline-strong)",
        borderRadius: "var(--radius)",
        padding: 24,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Section label inside a detail card. */
function CardHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontFamily: "var(--font-serif)",
        fontSize: 18,
        fontWeight: 500,
        color: "var(--vii-navy)",
        margin: "0 0 16px",
      }}
    >
      {children}
    </h2>
  );
}

export function ViiOrderDetailPage({ order }: OrderDetailPageTemplateProps) {
  const addr = order.shippingAddress;

  return (
    <PageTransition>
      {/* Hero band — own heading (the layout heading is NOT used here;
          this page renders its own h1 with order number) */}
      <section
        style={{
          background: "var(--vii-cream)",
          borderBottom: "1px solid var(--vii-hairline-strong)",
          paddingTop: "clamp(168px, 16vh, 200px)",
          paddingBottom: "clamp(32px, 5vh, 60px)",
        }}
      >
        <div
          style={{
            maxWidth: 1320,
            margin: "0 auto",
            paddingInline: "clamp(20px, 4vw, 32px)",
          }}
        >
          <FadeIn direction="up">
            <ViiOverline style={{ marginBottom: 16 }}>Account</ViiOverline>
            <h1
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: "clamp(1.75rem, 4vw, 2.75rem)",
                fontWeight: 500,
                lineHeight: 1.1,
                color: "var(--vii-navy)",
                margin: "0 0 12px",
              }}
            >
              Order #{order.orderNumber}
            </h1>

            {/* Breadcrumb */}
            <nav aria-label="Breadcrumb">
              <ol
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  listStyle: "none",
                  margin: "0 0 16px",
                  padding: 0,
                  fontFamily: "var(--font-sans)",
                  fontSize: 13,
                  color: "var(--vii-ink-soft)",
                }}
              >
                {[
                  { label: "Home", href: "/" },
                  { label: "Account", href: "/account/settings" },
                  { label: "Orders", href: "/account/orders" },
                  { label: `#${order.orderNumber}` },
                ].map((crumb, i) => (
                  <li key={i} style={{ display: "flex", alignItems: "center" }}>
                    {i > 0 && (
                      <span
                        aria-hidden
                        style={{
                          marginInline: "0.5rem",
                          color: "var(--vii-tan)",
                        }}
                      >
                        /
                      </span>
                    )}
                    {crumb.href ? (
                      <Link
                        href={crumb.href}
                        style={{
                          color: "var(--vii-ink-soft)",
                          textDecoration: "none",
                        }}
                      >
                        {crumb.label}
                      </Link>
                    ) : (
                      <span
                        aria-current="page"
                        style={{ color: "var(--vii-navy)" }}
                      >
                        {crumb.label}
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </nav>

            {/* Status + date chips */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
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
              <span
                style={{
                  background: "var(--vii-paper)",
                  border: "1px solid var(--vii-hairline-strong)",
                  fontFamily: "var(--font-sans)",
                  fontSize: 12,
                  color: "var(--vii-ink-soft)",
                  padding: "4px 12px",
                  borderRadius: "9999px",
                }}
              >
                {formatDate(order.createdAt)}
              </span>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Content grid */}
      <section
        style={{
          maxWidth: 1320,
          margin: "0 auto",
          paddingInline: "clamp(20px, 4vw, 32px)",
          paddingTop: "clamp(32px, 5vh, 56px)",
          paddingBottom: "clamp(48px, 7vh, 96px)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: 24,
          }}
          className="lg:grid-cols-[1fr_320px]"
        >
          {/* ── Left column ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Items card */}
            <FadeIn direction="up">
              <ViiCard>
                <CardHeading>Items</CardHeading>
                {order.items.length > 0 ? (
                  <ul
                    role="list"
                    style={{
                      listStyle: "none",
                      margin: 0,
                      padding: 0,
                    }}
                  >
                    {order.items.map((item, idx) => (
                      <li
                        key={item.id}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          justifyContent: "space-between",
                          gap: 16,
                          paddingTop: idx === 0 ? 0 : 16,
                          paddingBottom: 16,
                          borderBottom:
                            idx < order.items.length - 1
                              ? "1px solid var(--vii-hairline)"
                              : "none",
                        }}
                      >
                        {/* Product initial medallion — OrderItem has no image snapshot */}
                        <div
                          aria-hidden
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: "var(--radius)",
                            border: "1px solid var(--vii-hairline)",
                            background: "var(--vii-cream)",
                            flexShrink: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontFamily: "var(--font-serif)",
                            fontSize: 18,
                            fontWeight: 500,
                            color: "var(--vii-tan)",
                          }}
                        >
                          {item.productName.charAt(0).toUpperCase()}
                        </div>

                        {/* Name + variant */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p
                            style={{
                              fontFamily: "var(--font-sans)",
                              fontSize: 15,
                              fontWeight: 500,
                              color: "var(--vii-navy)",
                              margin: "0 0 2px",
                            }}
                          >
                            {item.productName}
                          </p>
                          {item.variantName && (
                            <p
                              style={{
                                fontFamily: "var(--font-sans)",
                                fontSize: 13,
                                color: "var(--vii-ink-soft)",
                                margin: "0 0 4px",
                              }}
                            >
                              {item.variantName}
                            </p>
                          )}
                          <p
                            style={{
                              fontFamily: "var(--font-sans)",
                              fontSize: 13,
                              color: "var(--vii-ink-soft)",
                              margin: 0,
                            }}
                          >
                            Qty {item.quantity} × {formatPrice(item.price)}
                          </p>
                        </div>

                        {/* Line total */}
                        <p
                          style={{
                            fontFamily: "var(--font-serif)",
                            fontSize: 16,
                            fontWeight: 500,
                            color: "var(--vii-navy)",
                            margin: 0,
                            flexShrink: 0,
                          }}
                        >
                          {formatPrice(item.total)}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 14,
                      color: "var(--vii-ink-soft)",
                      margin: 0,
                    }}
                  >
                    No item details recorded.
                  </p>
                )}

                {/* Order totals */}
                <div
                  style={{
                    marginTop: 20,
                    paddingTop: 20,
                    borderTop: "1px solid var(--vii-hairline-strong)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  {(
                    [
                      { label: "Subtotal", value: formatPrice(order.subtotal) },
                      ...(order.discount > 0
                        ? [
                            {
                              label: "Discount",
                              value: `−${formatPrice(order.discount)}`,
                              highlight: true,
                            },
                          ]
                        : []),
                      { label: "Shipping", value: formatPrice(order.shipping) },
                      { label: "Tax", value: formatPrice(order.tax) },
                    ] as { label: string; value: string; highlight?: boolean }[]
                  ).map(({ label, value, highlight }) => (
                    <div
                      key={label}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontFamily: "var(--font-sans)",
                        fontSize: 14,
                        color: highlight
                          ? "var(--vii-copper-deep)"
                          : "var(--vii-ink-soft)",
                      }}
                    >
                      <span>{label}</span>
                      <span>{value}</span>
                    </div>
                  ))}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      borderTop: "1px solid var(--vii-hairline-strong)",
                      paddingTop: 12,
                      marginTop: 4,
                      fontFamily: "var(--font-serif)",
                      fontSize: 18,
                      fontWeight: 500,
                      color: "var(--vii-navy)",
                    }}
                  >
                    <span>Total</span>
                    <span>{formatPrice(order.total)}</span>
                  </div>
                </div>
              </ViiCard>
            </FadeIn>

            {/* Tracking card */}
            {order.shipments.length > 0 && (
              <FadeIn direction="up" delay={0.1}>
                <ViiCard>
                  <CardHeading>Tracking</CardHeading>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 16,
                    }}
                  >
                    {order.shipments.map((shipment) => (
                      <div key={shipment.id}>
                        {shipment.carrier && (
                          <p
                            style={{
                              fontFamily: "var(--font-sans)",
                              fontSize: 14,
                              fontWeight: 500,
                              color: "var(--vii-navy)",
                              margin: "0 0 4px",
                            }}
                          >
                            {shipment.carrier}
                          </p>
                        )}
                        {shipment.trackingNumber && (
                          <p
                            style={{
                              fontFamily: "var(--font-sans)",
                              fontSize: 13,
                              color: "var(--vii-ink-soft)",
                              margin: "0 0 4px",
                            }}
                          >
                            Tracking: {shipment.trackingNumber}
                          </p>
                        )}
                        {shipment.trackingUrl && (
                          <a
                            href={shipment.trackingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              fontFamily: "var(--font-sans)",
                              fontSize: 13,
                              fontWeight: 500,
                              color: "var(--vii-copper-deep)",
                              textDecoration: "none",
                            }}
                          >
                            Track shipment{" "}
                            <ExternalLink
                              aria-hidden
                              style={{ width: 12, height: 12 }}
                            />
                          </a>
                        )}
                        <p
                          style={{
                            fontFamily: "var(--font-sans)",
                            fontSize: 12,
                            color: "var(--vii-ink-soft)",
                            margin: "6px 0 0",
                          }}
                        >
                          Added {formatDate(shipment.createdAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                </ViiCard>
              </FadeIn>
            )}
          </div>

          {/* ── Right column ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Shipping address */}
            {addr && (
              <FadeIn direction="up" delay={0.05}>
                <ViiCard>
                  <CardHeading>Shipping Address</CardHeading>
                  <address
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 14,
                      color: "var(--vii-ink-soft)",
                      lineHeight: 1.7,
                      fontStyle: "normal",
                    }}
                  >
                    {addr.firstName && addr.lastName && (
                      <p
                        style={{
                          fontWeight: 500,
                          color: "var(--vii-navy)",
                          margin: "0 0 2px",
                        }}
                      >
                        {addr.firstName} {addr.lastName}
                      </p>
                    )}
                    <p style={{ margin: 0 }}>{addr.address1}</p>
                    {addr.address2 && (
                      <p style={{ margin: 0 }}>{addr.address2}</p>
                    )}
                    <p style={{ margin: 0 }}>
                      {addr.city}, {addr.province} {addr.zip}
                    </p>
                    <p style={{ margin: 0 }}>{addr.country}</p>
                  </address>
                </ViiCard>
              </FadeIn>
            )}

            {/* Order info */}
            <FadeIn direction="up" delay={0.1}>
              <ViiCard>
                <CardHeading>Order Info</CardHeading>
                <dl
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    margin: 0,
                  }}
                >
                  <div>
                    <dt
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: 11,
                        fontWeight: 500,
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                        color: "var(--vii-ink-soft)",
                        marginBottom: 2,
                      }}
                    >
                      Email
                    </dt>
                    <dd
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: 14,
                        color: "var(--vii-navy)",
                        margin: 0,
                      }}
                    >
                      {order.customerEmail}
                    </dd>
                  </div>
                  {order.customerPhone && (
                    <div>
                      <dt
                        style={{
                          fontFamily: "var(--font-sans)",
                          fontSize: 11,
                          fontWeight: 500,
                          letterSpacing: "0.14em",
                          textTransform: "uppercase",
                          color: "var(--vii-ink-soft)",
                          marginBottom: 2,
                        }}
                      >
                        Phone
                      </dt>
                      <dd
                        style={{
                          fontFamily: "var(--font-sans)",
                          fontSize: 14,
                          color: "var(--vii-navy)",
                          margin: 0,
                        }}
                      >
                        {order.customerPhone}
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: 11,
                        fontWeight: 500,
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                        color: "var(--vii-ink-soft)",
                        marginBottom: 2,
                      }}
                    >
                      Payment
                    </dt>
                    <dd
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: 14,
                        color: "var(--vii-navy)",
                        textTransform: "capitalize",
                        margin: 0,
                      }}
                    >
                      {order.paymentStatus}
                    </dd>
                  </div>
                </dl>
              </ViiCard>
            </FadeIn>

            {/* Back link */}
            <Link
              href="/account/orders"
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 13,
                fontWeight: 500,
                color: "var(--vii-copper-deep)",
                textDecoration: "none",
              }}
            >
              ← Back to orders
            </Link>
          </div>
        </div>
      </section>
    </PageTransition>
  );
}
