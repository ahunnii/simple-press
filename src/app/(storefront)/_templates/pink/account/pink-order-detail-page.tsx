import Link from "next/link";

import type { OrderDetailPageTemplateProps } from "../../types";
import { formatDate } from "~/lib/format-date";
import { formatPrice } from "~/lib/prices";
import { PageTransition } from "~/components/page-animations";

import { PinkBadge } from "../shared/pink-badge";
import { PinkFactRows } from "../shared/pink-fact-rows";
import { PinkAccountLayout } from "./pink-account-layout";

/** rose = still moving (open); ink = settled (completed, cancelled, refunded). */
function statusTone(status: string): "rose" | "ink" {
  return status === "open" ? "rose" : "ink";
}

/**
 * Order detail — reuses the checkout language (design.md → "Account pages"):
 * a paper item list on the left, an ink summary panel on the right. Built
 * from shared primitives/tokens only, independent of the checkout slot
 * another agent owns concurrently.
 */
export function PinkOrderDetailPage({ order }: OrderDetailPageTemplateProps) {
  const addr = order.shippingAddress;

  const totalsRows = [
    { label: "Subtotal", value: formatPrice(order.subtotal) },
    ...(order.discount > 0
      ? [{ label: "Discount", value: `−${formatPrice(order.discount)}` }]
      : []),
    {
      label: "Shipping",
      value: order.shipping > 0 ? formatPrice(order.shipping) : "Free",
    },
    ...(order.tax > 0 ? [{ label: "Tax", value: formatPrice(order.tax) }] : []),
  ];

  return (
    <PageTransition>
      <PinkAccountLayout
        title={`Order #${order.orderNumber}`}
        description={formatDate(order.createdAt)}
      >
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <PinkBadge tone={statusTone(order.status)}>{order.status}</PinkBadge>
          <Link
            href="/account/orders"
            className="text-[14px] font-medium"
            style={{ color: "var(--pink-rose)" }}
          >
            ← All orders
          </Link>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-start">
          {/* Item list — paper */}
          <div
            style={{
              background: "var(--pink-white)",
              border: "1px solid var(--pink-line)",
            }}
          >
            {order.items.map((item, i) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-4 px-6 py-5"
                style={{
                  borderTop: i === 0 ? "none" : "1px solid var(--pink-ink)",
                }}
              >
                <div className="min-w-0">
                  <p
                    className="pink-display truncate"
                    style={{ fontSize: 17, fontWeight: 600 }}
                  >
                    {item.productName}
                  </p>
                  {item.variantName && (
                    <p className="pink-label mt-1">{item.variantName}</p>
                  )}
                  <p
                    className="mt-1 text-[13px]"
                    style={{ color: "var(--pink-subtle)" }}
                  >
                    Qty {item.quantity}
                  </p>
                </div>
                <span
                  className="pink-display shrink-0"
                  style={{ fontSize: 16, fontWeight: 600 }}
                >
                  {formatPrice(item.price * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          {/* Summary — ink */}
          <div
            className="p-8"
            style={{
              background: "var(--pink-ink)",
              color: "var(--pink-paper)",
            }}
          >
            <p className="pink-label-dark mb-5">Summary</p>

            <PinkFactRows rows={totalsRows} surface="paper" />

            <div
              className="mt-4 flex items-baseline justify-between pt-4"
              style={{ borderTop: "1px solid var(--pink-ink-line)" }}
            >
              <span className="pink-label-dark">Total</span>
              <span
                className="pink-display"
                style={{
                  fontSize: 20,
                  fontWeight: 600,
                  color: "var(--pink-paper)",
                }}
              >
                {formatPrice(order.total)}
              </span>
            </div>

            {addr && (
              <div
                className="mt-8 pt-8"
                style={{ borderTop: "1px solid var(--pink-ink-line)" }}
              >
                <p className="pink-label-dark mb-3">Shipping address</p>
                <address
                  className="flex flex-col gap-0.5 text-[14px] leading-[1.7] not-italic"
                  style={{ color: "var(--pink-ink-body)" }}
                >
                  <span>
                    {addr.firstName} {addr.lastName}
                  </span>
                  <span>{addr.address1}</span>
                  {addr.address2 && <span>{addr.address2}</span>}
                  <span>
                    {addr.city}
                    {addr.province ? `, ${addr.province}` : ""} {addr.zip}
                  </span>
                  <span>{addr.country}</span>
                </address>
              </div>
            )}

            {order.shipments && order.shipments.length > 0 && (
              <div
                className="mt-8 pt-8"
                style={{ borderTop: "1px solid var(--pink-ink-line)" }}
              >
                <p className="pink-label-dark mb-3">Shipments</p>
                <div className="flex flex-col gap-4">
                  {order.shipments.map((shipment) => (
                    <div key={shipment.id} className="flex flex-col gap-1">
                      {shipment.carrier && (
                        <span
                          className="text-[13px] font-medium"
                          style={{ color: "var(--pink-ink-body)" }}
                        >
                          {shipment.carrier}
                        </span>
                      )}
                      {shipment.trackingNumber && (
                        <span
                          className="text-[13px]"
                          style={{ color: "var(--pink-ink-subtle)" }}
                        >
                          {shipment.trackingNumber}
                        </span>
                      )}
                      {shipment.trackingUrl && (
                        <a
                          href={shipment.trackingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 w-fit text-[13px] font-medium"
                          style={{ color: "var(--pink-blush)" }}
                        >
                          Track shipment →
                          <span className="sr-only"> (opens in new tab)</span>
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </PinkAccountLayout>
    </PageTransition>
  );
}
