import type { CSSProperties, ReactNode } from "react";
import { ExternalLink } from "lucide-react";

import type { OrderDetailPageTemplateProps } from "../../types";
import type { OliveStatus } from "../shared";
import { formatDate } from "~/lib/format-date";
import { formatPrice } from "~/lib/prices";

import {
  OliveBreadcrumb,
  OliveButton,
  OliveRevealGroup,
  OliveSection,
  OliveStatusBadge,
} from "../shared";

/** `Order.status` is only ever one of these four (see prisma/schema.prisma). */
const ORDER_STATUSES = new Set<string>([
  "open",
  "completed",
  "cancelled",
  "refunded",
]);

function toOrderStatus(status: string): OliveStatus {
  return (ORDER_STATUSES.has(status) ? status : "open") as OliveStatus;
}

/** Thin reusable card shell — white face, hairline border, the template's one container. */
function OliveDetailCard({ children }: { children: ReactNode }) {
  return (
    <div className="olive-card" style={{ padding: "1.5rem" }}>
      {children}
    </div>
  );
}

function CardHeading({ children }: { children: ReactNode }) {
  return (
    <h2 className="olive-h3" style={{ margin: "0 0 1rem" }}>
      {children}
    </h2>
  );
}

/**
 * OliveOrderDetailPage — skips `OliveAccountLayout` in favour of its own
 * hero (dynamic "Order #N" heading + breadcrumb), matching vii's precedent
 * for this slot. Server component throughout — every primitive it composes
 * (`OliveSection`, `OliveBreadcrumb`, `OliveStatusBadge`, `OliveButton`,
 * `OliveReveal`/`OliveRevealGroup`) is server-safe.
 */
export function OliveOrderDetailPage({ order }: OrderDetailPageTemplateProps) {
  const addr = order.shippingAddress;

  return (
    <>
      <OliveSection tone="slate" bleed>
        <div>
          <h1 className="olive-h1" style={{ margin: "0 0 0.75rem" }}>
            Order #{order.orderNumber}
          </h1>
          <OliveBreadcrumb
            items={[
              { label: "Home", href: "/" },
              { label: "Account", href: "/account/settings" },
              { label: "Orders", href: "/account/orders" },
              { label: `#${order.orderNumber}` },
            ]}
            style={{ marginBottom: "1rem" }}
          />
          <div className="flex flex-wrap items-center gap-3">
            <OliveStatusBadge status={toOrderStatus(order.status)} />
            <span className="olive-caption">{formatDate(order.createdAt)}</span>
          </div>
        </div>
      </OliveSection>

      <OliveSection>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          {/* Left column */}
          <OliveRevealGroup className="flex flex-col gap-6">
            <div
              className="olive-reveal-item"
              style={{ "--i": 0 } as CSSProperties}
            >
              <OliveDetailCard>
                <CardHeading>Items</CardHeading>
                {order.items.length > 0 ? (
                  <ul role="list" className="m-0 flex flex-col p-0">
                    {order.items.map((item, idx) => (
                      <li
                        key={item.id}
                        className="flex items-start justify-between gap-4"
                        style={{
                          paddingTop: idx === 0 ? 0 : "1rem",
                          paddingBottom: "1rem",
                          borderBottom:
                            idx < order.items.length - 1
                              ? "1px solid var(--olive-hairline)"
                              : "none",
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p
                            style={{
                              margin: "0 0 0.125rem",
                              fontFamily: "var(--olive-font-body)",
                              fontWeight: 500,
                              color: "var(--olive-ink)",
                            }}
                          >
                            {item.productName}
                          </p>
                          {item.variantName ? (
                            <p
                              className="olive-caption"
                              style={{ margin: "0 0 0.25rem" }}
                            >
                              {item.variantName}
                            </p>
                          ) : null}
                          <p className="olive-caption" style={{ margin: 0 }}>
                            Qty {item.quantity} × {formatPrice(item.price)}
                          </p>
                        </div>
                        <p className="olive-price" style={{ flexShrink: 0 }}>
                          {formatPrice(item.total)}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="olive-caption">No item details recorded.</p>
                )}

                <div
                  className="mt-5 flex flex-col gap-2 pt-5"
                  style={{
                    borderTop: "1px solid var(--olive-hairline-strong)",
                  }}
                >
                  <div className="olive-caption flex justify-between">
                    <span>Subtotal</span>
                    <span className="olive-price">
                      {formatPrice(order.subtotal)}
                    </span>
                  </div>
                  {order.discount > 0 ? (
                    <div
                      className="olive-caption flex justify-between"
                      style={{ color: "var(--olive-leaf)" }}
                    >
                      <span>Discount</span>
                      <span className="olive-price">
                        −{formatPrice(order.discount)}
                      </span>
                    </div>
                  ) : null}
                  <div className="olive-caption flex justify-between">
                    <span>Shipping</span>
                    <span className="olive-price">
                      {formatPrice(order.shipping)}
                    </span>
                  </div>
                  <div className="olive-caption flex justify-between">
                    <span>Tax</span>
                    <span className="olive-price">
                      {formatPrice(order.tax)}
                    </span>
                  </div>
                  <div
                    className="flex justify-between pt-3"
                    style={{
                      borderTop: "1px solid var(--olive-hairline-strong)",
                      marginTop: "0.25rem",
                    }}
                  >
                    <span className="olive-h3">Total</span>
                    <span
                      className="olive-h3 olive-price"
                      style={{ fontSize: "1.25rem" }}
                    >
                      {formatPrice(order.total)}
                    </span>
                  </div>
                </div>
              </OliveDetailCard>
            </div>

            {order.shipments.length > 0 ? (
              <div
                className="olive-reveal-item"
                style={{ "--i": 1 } as CSSProperties}
              >
                <OliveDetailCard>
                  <CardHeading>Tracking</CardHeading>
                  <div className="flex flex-col gap-4">
                    {order.shipments.map((shipment) => (
                      <div key={shipment.id}>
                        {shipment.carrier ? (
                          <p
                            style={{
                              margin: "0 0 0.25rem",
                              fontWeight: 500,
                              color: "var(--olive-ink)",
                            }}
                          >
                            {shipment.carrier}
                          </p>
                        ) : null}
                        {shipment.trackingNumber ? (
                          <p
                            className="olive-caption"
                            style={{ margin: "0 0 0.25rem" }}
                          >
                            Tracking: {shipment.trackingNumber}
                          </p>
                        ) : null}
                        {shipment.trackingUrl ? (
                          <OliveButton
                            variant="ghost"
                            href={shipment.trackingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Track shipment{" "}
                            <ExternalLink
                              aria-hidden
                              style={{ width: 12, height: 12 }}
                            />
                          </OliveButton>
                        ) : null}
                        <p
                          className="olive-caption"
                          style={{ margin: "0.375rem 0 0" }}
                        >
                          Added {formatDate(shipment.createdAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                </OliveDetailCard>
              </div>
            ) : null}
          </OliveRevealGroup>

          {/* Right column */}
          <OliveRevealGroup className="flex flex-col gap-6">
            {addr ? (
              <div
                className="olive-reveal-item"
                style={{ "--i": 0 } as CSSProperties}
              >
                <OliveDetailCard>
                  <CardHeading>Shipping address</CardHeading>
                  <address
                    className="olive-caption"
                    style={{ fontStyle: "normal", lineHeight: 1.7 }}
                  >
                    {addr.firstName && addr.lastName ? (
                      <p
                        style={{
                          margin: "0 0 0.125rem",
                          fontWeight: 500,
                          color: "var(--olive-ink)",
                        }}
                      >
                        {addr.firstName} {addr.lastName}
                      </p>
                    ) : null}
                    <p style={{ margin: 0 }}>{addr.address1}</p>
                    {addr.address2 ? (
                      <p style={{ margin: 0 }}>{addr.address2}</p>
                    ) : null}
                    <p style={{ margin: 0 }}>
                      {addr.city}, {addr.province} {addr.zip}
                    </p>
                    <p style={{ margin: 0 }}>{addr.country}</p>
                  </address>
                </OliveDetailCard>
              </div>
            ) : null}

            <div
              className="olive-reveal-item"
              style={{ "--i": 1 } as CSSProperties}
            >
              <OliveDetailCard>
                <CardHeading>Order info</CardHeading>
                <dl className="m-0 flex flex-col gap-3">
                  <div>
                    <dt
                      className="olive-label"
                      style={{ marginBottom: "0.125rem" }}
                    >
                      Email
                    </dt>
                    <dd
                      className="olive-caption"
                      style={{ margin: 0, color: "var(--olive-ink)" }}
                    >
                      {order.customerEmail}
                    </dd>
                  </div>
                  {order.customerPhone ? (
                    <div>
                      <dt
                        className="olive-label"
                        style={{ marginBottom: "0.125rem" }}
                      >
                        Phone
                      </dt>
                      <dd
                        className="olive-caption"
                        style={{ margin: 0, color: "var(--olive-ink)" }}
                      >
                        {order.customerPhone}
                      </dd>
                    </div>
                  ) : null}
                  <div>
                    <dt
                      className="olive-label"
                      style={{ marginBottom: "0.125rem" }}
                    >
                      Payment
                    </dt>
                    <dd
                      className="olive-caption"
                      style={{
                        margin: 0,
                        color: "var(--olive-ink)",
                        textTransform: "capitalize",
                      }}
                    >
                      {order.paymentStatus}
                    </dd>
                  </div>
                </dl>
              </OliveDetailCard>
            </div>

            <OliveButton variant="ghost" href="/account/orders">
              ← Back to orders
            </OliveButton>
          </OliveRevealGroup>
        </div>
      </OliveSection>
    </>
  );
}
