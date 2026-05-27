import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { formatDate } from "~/lib/format-date";
import { formatPrice } from "~/lib/prices";

import type { OrderDetailPageTemplateProps } from "../../types";
import { ElegantAccountLayout } from "./elegant-account-layout";

const STATUS_STYLES: Record<string, { color: string; label: string }> = {
  open:      { color: "var(--el-sage, #4a5240)",      label: "Open" },
  completed: { color: "var(--el-sage-soft, #8a9474)", label: "Completed" },
  cancelled: { color: "var(--el-ink-soft, #6b6659)",  label: "Cancelled" },
  refunded:  { color: "var(--el-ink-mute, #9a9485)",  label: "Refunded" },
  fulfilled: { color: "var(--el-sage, #4a5240)",      label: "Fulfilled" },
};

function StatusChip({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? { color: "var(--el-ink-soft, #6b6659)", label: status };
  return (
    <span style={{
      fontFamily: "var(--font-mono, ui-monospace)",
      fontSize: 10,
      letterSpacing: "0.16em",
      textTransform: "uppercase",
      color: s.color,
      padding: "3px 10px",
      border: `1px solid ${s.color}`,
      borderRadius: 999,
    }}>
      {s.label}
    </span>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: "var(--el-paper, #fbf8f2)",
      border: "1px solid var(--el-line, rgba(28,26,23,0.12))",
      borderRadius: 8,
      padding: "20px 24px",
    }}>
      <h2 style={{
        fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)",
        fontWeight: 400,
        fontSize: 20,
        color: "var(--el-ink, #1c1a17)",
        marginBottom: 16,
        letterSpacing: "-0.01em",
      }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

function MetaLabel({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontFamily: "var(--font-mono, ui-monospace)",
      fontSize: 10,
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      color: "var(--el-ink-soft, #6b6659)",
    }}>
      {children}
    </span>
  );
}

export function ElegantOrderDetailPage({ order }: OrderDetailPageTemplateProps) {
  const addr = order.shippingAddress;

  return (
    <ElegantAccountLayout heading={`Order #${order.orderNumber}`}>
      {/* Status + date row */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 24 }}>
        <StatusChip status={order.status} />
        <span style={{
          fontFamily: "var(--font-mono, ui-monospace)",
          fontSize: 10,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--el-ink-soft, #6b6659)",
        }}>
          {formatDate(order.createdAt)}
        </span>
      </div>

      <div className="el-order-detail-grid" style={{
        display: "grid",
        gridTemplateColumns: "1fr 280px",
        gap: 20,
        alignItems: "start",
      }}>
        {/* Left: items + tracking */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Items */}
          <Panel title="Items">
            {order.items.length > 0 ? (
              <div>
                {order.items.map((item, i) => (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      padding: "12px 0",
                      borderTop: i === 0 ? "none" : "1px solid var(--el-line-2, rgba(28,26,23,0.06))",
                    }}
                  >
                    <div>
                      <div style={{
                        fontSize: 15,
                        fontWeight: 500,
                        color: "var(--el-ink, #1c1a17)",
                        fontFamily: "var(--font-sans, sans-serif)",
                        marginBottom: 2,
                      }}>
                        {item.productName}
                      </div>
                      {item.variantName && (
                        <MetaLabel>{item.variantName}</MetaLabel>
                      )}
                      <div style={{
                        marginTop: 4,
                        fontSize: 13,
                        color: "var(--el-ink-soft, #6b6659)",
                        fontFamily: "var(--font-sans, sans-serif)",
                      }}>
                        Qty {item.quantity} × {formatPrice(item.price)}
                      </div>
                    </div>
                    <span style={{
                      fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)",
                      fontSize: 18,
                      color: "var(--el-ink, #1c1a17)",
                    }}>
                      {formatPrice(item.total)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 14, color: "var(--el-ink-soft, #6b6659)", fontFamily: "var(--font-sans, sans-serif)" }}>
                No item details recorded.
              </p>
            )}

            {/* Totals */}
            <div style={{
              borderTop: "1px solid var(--el-line, rgba(28,26,23,0.12))",
              marginTop: 12,
              paddingTop: 14,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}>
              {[
                { label: "Subtotal", value: formatPrice(order.subtotal) },
                ...(order.discount > 0 ? [{ label: "Discount", value: `−${formatPrice(order.discount)}`, green: true }] : []),
                { label: "Shipping", value: formatPrice(order.shipping) },
                { label: "Tax", value: formatPrice(order.tax) },
              ].map(({ label, value, green }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between" }}>
                  <MetaLabel>{label}</MetaLabel>
                  <span style={{
                    fontSize: 14,
                    color: green ? "var(--el-sage, #4a5240)" : "var(--el-ink, #1c1a17)",
                    fontFamily: "var(--font-sans, sans-serif)",
                  }}>
                    {value}
                  </span>
                </div>
              ))}
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                borderTop: "1px solid var(--el-line, rgba(28,26,23,0.12))",
                paddingTop: 10,
                marginTop: 4,
              }}>
                <MetaLabel>Total</MetaLabel>
                <span style={{
                  fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)",
                  fontSize: 22,
                  color: "var(--el-ink, #1c1a17)",
                }}>
                  {formatPrice(order.total)}
                </span>
              </div>
            </div>
          </Panel>

          {/* Tracking */}
          {order.shipments.length > 0 && (
            <Panel title="Tracking">
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {order.shipments.map((shipment) => (
                  <div key={shipment.id}>
                    {shipment.carrier && (
                      <div style={{
                        fontSize: 14,
                        fontWeight: 500,
                        color: "var(--el-ink, #1c1a17)",
                        fontFamily: "var(--font-sans, sans-serif)",
                        marginBottom: 4,
                      }}>
                        {shipment.carrier}
                      </div>
                    )}
                    {shipment.trackingNumber && (
                      <div style={{ fontSize: 13, color: "var(--el-ink-soft, #6b6659)", fontFamily: "var(--font-sans, sans-serif)" }}>
                        {shipment.trackingNumber}
                      </div>
                    )}
                    {shipment.trackingUrl && (
                      <a
                        href={shipment.trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: 12,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: "var(--el-ink, #1c1a17)",
                          textDecoration: "none",
                          fontFamily: "var(--font-mono, ui-monospace)",
                          marginTop: 6,
                        }}
                      >
                        Track shipment
                        <ExternalLink aria-hidden={true} style={{ width: 11, height: 11 }} />
                        <span className="sr-only">(opens in new tab)</span>
                      </a>
                    )}
                    <div style={{
                      marginTop: 4,
                      fontFamily: "var(--font-mono, ui-monospace)",
                      fontSize: 10,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: "var(--el-ink-mute, #9a9485)",
                    }}>
                      Added {formatDate(shipment.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          )}
        </div>

        {/* Right: address + info */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {addr && (
            <Panel title="Ship to">
              <address style={{
                fontStyle: "normal",
                fontSize: 14,
                lineHeight: 1.65,
                color: "var(--el-ink-soft, #6b6659)",
                fontFamily: "var(--font-sans, sans-serif)",
              }}>
                {addr.firstName && addr.lastName && (
                  <div style={{ fontWeight: 500, color: "var(--el-ink, #1c1a17)", marginBottom: 4 }}>
                    {addr.firstName} {addr.lastName}
                  </div>
                )}
                <div>{addr.address1}</div>
                {addr.address2 && <div>{addr.address2}</div>}
                <div>{addr.city}, {addr.province} {addr.zip}</div>
                <div>{addr.country}</div>
              </address>
            </Panel>
          )}

          <Panel title="Order info">
            <dl style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <dt><MetaLabel>Email</MetaLabel></dt>
                <dd style={{ marginLeft: 0, marginTop: 4, fontSize: 13, color: "var(--el-ink, #1c1a17)", fontFamily: "var(--font-sans, sans-serif)" }}>
                  {order.customerEmail}
                </dd>
              </div>
              {order.customerPhone && (
                <div>
                  <dt><MetaLabel>Phone</MetaLabel></dt>
                  <dd style={{ marginLeft: 0, marginTop: 4, fontSize: 13, color: "var(--el-ink, #1c1a17)", fontFamily: "var(--font-sans, sans-serif)" }}>
                    {order.customerPhone}
                  </dd>
                </div>
              )}
              <div>
                <dt><MetaLabel>Payment</MetaLabel></dt>
                <dd style={{ marginLeft: 0, marginTop: 4, fontSize: 13, color: "var(--el-ink, #1c1a17)", fontFamily: "var(--font-sans, sans-serif)", textTransform: "capitalize" }}>
                  {order.paymentStatus}
                </dd>
              </div>
            </dl>
          </Panel>

          <Link
            href="/account/orders"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--el-ink-soft, #6b6659)",
              textDecoration: "none",
              fontFamily: "var(--font-mono, ui-monospace)",
            }}
          >
            <ArrowLeft aria-hidden={true} style={{ width: 12, height: 12 }} />
            Back to orders
          </Link>
        </div>
      </div>

    </ElegantAccountLayout>
  );
}
