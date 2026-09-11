import Link from "next/link";
import { ExternalLink } from "lucide-react";

import type { OrderDetailPageTemplateProps } from "../../types";
import { formatDate } from "~/lib/format-date";
import { formatPrice } from "~/lib/prices";

import { WealthEyebrow } from "../shared/wealth-eyebrow";
import { WealthH1 } from "../shared/wealth-h1";
import { WealthReveal, WealthRevealGroup } from "../shared/wealth-reveal";
import { statusStyles } from "./wealth-order-status-badge";

function WealthCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        background: "var(--wealth-paper)",
        border: "1px solid var(--wealth-surface-2)",
        padding: 24,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function CardHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontFamily: "var(--font-wealth-sub)",
        fontStyle: "italic",
        fontSize: 19,
        color: "var(--wealth-ink)",
        margin: "0 0 16px",
      }}
    >
      {children}
    </h2>
  );
}

/**
 * OrderDetailPage renders its own hero (dynamic "Order #N" heading +
 * breadcrumb) rather than wrapping WealthAccountLayout's shared nav — the
 * same exception the playbook calls out and vii/vii-order-detail-page.tsx
 * takes.
 */
export function WealthOrderDetailPage({ order }: OrderDetailPageTemplateProps) {
  const addr = order.shippingAddress;

  return (
    <div className="wealth-account">
      <section
        style={{
          background: "var(--wealth-surface)",
          borderBottom: "1px solid var(--wealth-surface-2)",
          paddingTop: "calc(var(--wealth-rhythm) * 2)",
          paddingBottom: "calc(var(--wealth-rhythm) * 1.5)",
        }}
      >
        <div
          className="mx-auto"
          style={{ maxWidth: "var(--wealth-container)", padding: "0 var(--wealth-gutter)" }}
        >
          <WealthReveal>
            <WealthEyebrow as="p" className="mb-3">
              Account
            </WealthEyebrow>
            {/* `.wealth-h1` sets `margin: 0` via an unlayered rule
                (deliberately, so it beats Tailwind utilities) — a `mb-*`
                className would be silently dropped, so spacing below wraps
                the heading in a plain div instead. */}
            <div style={{ marginBottom: 16 }}>
              <WealthH1>Order #{order.orderNumber}</WealthH1>
            </div>

            <nav aria-label="Breadcrumb" className="mb-4">
              <ol
                className="flex flex-wrap items-center gap-0"
                style={{
                  listStyle: "none",
                  margin: 0,
                  padding: 0,
                  fontSize: 13,
                  color: "var(--wealth-muted)",
                }}
              >
                {[
                  { label: "Home", href: "/" },
                  { label: "Account", href: "/account/settings" },
                  { label: "Orders", href: "/account/orders" },
                  { label: `#${order.orderNumber}` },
                ].map((crumb, i) => (
                  <li key={i} className="flex items-center">
                    {i > 0 && (
                      <span aria-hidden style={{ margin: "0 8px" }}>
                        /
                      </span>
                    )}
                    {crumb.href ? (
                      <Link href={crumb.href} style={{ color: "var(--wealth-muted)" }}>
                        {crumb.label}
                      </Link>
                    ) : (
                      <span aria-current="page" style={{ color: "var(--wealth-ink)" }}>
                        {crumb.label}
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </nav>

            <div className="flex flex-wrap gap-2">
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
              <span
                style={{
                  background: "var(--wealth-paper)",
                  border: "1px solid var(--wealth-surface-2)",
                  fontSize: 12,
                  color: "var(--wealth-muted)",
                  padding: "4px 10px",
                }}
              >
                {formatDate(order.createdAt)}
              </span>
            </div>
          </WealthReveal>
        </div>
      </section>

      <section
        className="mx-auto"
        style={{
          maxWidth: "var(--wealth-container)",
          padding: "calc(var(--wealth-rhythm) * 1.5) var(--wealth-gutter) calc(var(--wealth-rhythm) * 2)",
        }}
      >
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          <WealthRevealGroup className="flex flex-col gap-6">
            <div className="wealth-reveal-item" style={{ "--i": 0 } as React.CSSProperties}>
              <WealthCard>
                <CardHeading>Items</CardHeading>
                {order.items.length > 0 ? (
                  <ul role="list" className="m-0 list-none p-0">
                    {order.items.map((item, idx) => (
                      <li
                        key={item.id}
                        className="flex items-start justify-between gap-4"
                        style={{
                          paddingTop: idx === 0 ? 0 : 16,
                          paddingBottom: 16,
                          borderBottom:
                            idx < order.items.length - 1 ? "1px solid var(--wealth-surface-2)" : "none",
                        }}
                      >
                        <div
                          aria-hidden
                          className="flex shrink-0 items-center justify-center"
                          style={{
                            width: 48,
                            height: 48,
                            border: "1px solid var(--wealth-surface-2)",
                            background: "var(--wealth-surface)",
                            fontFamily: "var(--font-wealth-sub)",
                            fontStyle: "italic",
                            fontSize: 18,
                            color: "var(--wealth-primary)",
                          }}
                        >
                          {item.productName.charAt(0).toUpperCase()}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p style={{ fontSize: 15, fontWeight: 500, color: "var(--wealth-ink)", margin: "0 0 2px" }}>
                            {item.productName}
                          </p>
                          {item.variantName && (
                            <p style={{ fontSize: 13, color: "var(--wealth-muted)", margin: "0 0 4px" }}>
                              {item.variantName}
                            </p>
                          )}
                          <p style={{ fontSize: 13, color: "var(--wealth-muted)", margin: 0 }}>
                            Qty {item.quantity} × {formatPrice(item.price)}
                          </p>
                        </div>

                        <p
                          className="shrink-0"
                          style={{
                            fontFamily: "var(--font-wealth-sub)",
                            fontStyle: "italic",
                            fontSize: 16,
                            color: "var(--wealth-ink)",
                            margin: 0,
                          }}
                        >
                          {formatPrice(item.total)}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ fontSize: 14, color: "var(--wealth-muted)", margin: 0 }}>
                    No item details recorded.
                  </p>
                )}

                <div
                  className="mt-5 flex flex-col gap-2 pt-5"
                  style={{ borderTop: "1px solid var(--wealth-surface-2)" }}
                >
                  {(
                    [
                      { label: "Subtotal", value: formatPrice(order.subtotal) },
                      ...(order.discount > 0
                        ? [{ label: "Discount", value: `−${formatPrice(order.discount)}`, highlight: true }]
                        : []),
                      { label: "Shipping", value: formatPrice(order.shipping) },
                      { label: "Tax", value: formatPrice(order.tax) },
                    ] as { label: string; value: string; highlight?: boolean }[]
                  ).map(({ label, value, highlight }) => (
                    <div
                      key={label}
                      className="flex justify-between"
                      style={{
                        fontSize: 14,
                        color: highlight ? "var(--wealth-primary)" : "var(--wealth-muted)",
                      }}
                    >
                      <span>{label}</span>
                      <span>{value}</span>
                    </div>
                  ))}
                  <div
                    className="mt-1 flex justify-between pt-3"
                    style={{
                      borderTop: "1px solid var(--wealth-surface-2)",
                      fontFamily: "var(--font-wealth-sub)",
                      fontStyle: "italic",
                      fontSize: 18,
                      color: "var(--wealth-ink)",
                    }}
                  >
                    <span>Total</span>
                    <span>{formatPrice(order.total)}</span>
                  </div>
                </div>
              </WealthCard>
            </div>

            {order.shipments.length > 0 && (
              <div className="wealth-reveal-item" style={{ "--i": 1 } as React.CSSProperties}>
                <WealthCard>
                  <CardHeading>Tracking</CardHeading>
                  <div className="flex flex-col gap-4">
                    {order.shipments.map((shipment) => (
                      <div key={shipment.id}>
                        {shipment.carrier && (
                          <p style={{ fontSize: 14, fontWeight: 500, color: "var(--wealth-ink)", margin: "0 0 4px" }}>
                            {shipment.carrier}
                          </p>
                        )}
                        {shipment.trackingNumber && (
                          <p style={{ fontSize: 13, color: "var(--wealth-muted)", margin: "0 0 4px" }}>
                            Tracking: {shipment.trackingNumber}
                          </p>
                        )}
                        {shipment.trackingUrl && (
                          <a
                            href={shipment.trackingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1"
                            style={{ fontSize: 13, fontWeight: 500, color: "var(--wealth-primary)" }}
                          >
                            Track shipment <ExternalLink aria-hidden style={{ width: 12, height: 12 }} />
                          </a>
                        )}
                        <p style={{ fontSize: 12, color: "var(--wealth-muted)", margin: "6px 0 0" }}>
                          Added {formatDate(shipment.createdAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                </WealthCard>
              </div>
            )}
          </WealthRevealGroup>

          <WealthRevealGroup className="flex flex-col gap-6">
            {addr && (
              <div className="wealth-reveal-item" style={{ "--i": 0 } as React.CSSProperties}>
                <WealthCard>
                  <CardHeading>Shipping Address</CardHeading>
                  <address style={{ fontSize: 14, color: "var(--wealth-muted)", lineHeight: 1.7, fontStyle: "normal" }}>
                    {addr.firstName && addr.lastName && (
                      <p style={{ fontWeight: 500, color: "var(--wealth-ink)", margin: "0 0 2px" }}>
                        {addr.firstName} {addr.lastName}
                      </p>
                    )}
                    <p style={{ margin: 0 }}>{addr.address1}</p>
                    {addr.address2 && <p style={{ margin: 0 }}>{addr.address2}</p>}
                    <p style={{ margin: 0 }}>
                      {addr.city}, {addr.province} {addr.zip}
                    </p>
                    <p style={{ margin: 0 }}>{addr.country}</p>
                  </address>
                </WealthCard>
              </div>
            )}

            <div className="wealth-reveal-item" style={{ "--i": 1 } as React.CSSProperties}>
              <WealthCard>
                <CardHeading>Order Info</CardHeading>
                <dl className="m-0 flex flex-col gap-3">
                  <div>
                    <dt
                      style={{
                        fontFamily: "var(--font-wealth-mono)",
                        fontSize: 11,
                        letterSpacing: "1px",
                        textTransform: "uppercase",
                        color: "var(--wealth-eyebrow)",
                        marginBottom: 2,
                      }}
                    >
                      Email
                    </dt>
                    <dd style={{ fontSize: 14, color: "var(--wealth-ink)", margin: 0 }}>{order.customerEmail}</dd>
                  </div>
                  {order.customerPhone && (
                    <div>
                      <dt
                        style={{
                          fontFamily: "var(--font-wealth-mono)",
                          fontSize: 11,
                          letterSpacing: "1px",
                          textTransform: "uppercase",
                          color: "var(--wealth-eyebrow)",
                          marginBottom: 2,
                        }}
                      >
                        Phone
                      </dt>
                      <dd style={{ fontSize: 14, color: "var(--wealth-ink)", margin: 0 }}>{order.customerPhone}</dd>
                    </div>
                  )}
                  <div>
                    <dt
                      style={{
                        fontFamily: "var(--font-wealth-mono)",
                        fontSize: 11,
                        letterSpacing: "1px",
                        textTransform: "uppercase",
                        color: "var(--wealth-eyebrow)",
                        marginBottom: 2,
                      }}
                    >
                      Payment
                    </dt>
                    <dd style={{ fontSize: 14, color: "var(--wealth-ink)", textTransform: "capitalize", margin: 0 }}>
                      {order.paymentStatus}
                    </dd>
                  </div>
                </dl>
              </WealthCard>
            </div>

            <Link href="/account/orders" style={{ fontSize: 13, fontWeight: 500, color: "var(--wealth-primary)" }}>
              ← Back to orders
            </Link>
          </WealthRevealGroup>
        </div>
      </section>
    </div>
  );
}
