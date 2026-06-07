import Link from "next/link";

import type { OrderDetailPageTemplateProps } from "../../types";
import { cn } from "~/lib/utils";
import { formatDate } from "~/lib/format-date";
import { formatPrice } from "~/lib/prices";
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

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between border-b border-[var(--sl-border-subtle)] py-2.5">
      <span className="sl-eyebrow font-sans text-xs tracking-[0.14em] uppercase">
        {label}
      </span>
      <span
        className={cn(
          "font-sans text-[var(--sl-ink)]",
          bold ? "text-lg tracking-[0.02em]" : "text-sm",
        )}
      >
        {value}
      </span>
    </div>
  );
}

export function SledgeOrderDetailPage({ order }: OrderDetailPageTemplateProps) {
  const addr = order.shippingAddress;

  return (
    <PageTransition className="bg-white">
      <SledgeAccountLayout heading={`Order #${order.orderNumber}`}>
        <div className="mb-8 flex flex-wrap items-center gap-3 border-b border-[var(--sl-border)] pb-5">
          <span
            className={cn(
              "inline-block rounded-sm border px-2 py-1 font-sans text-[10px] tracking-[0.12em] uppercase",
              statusClass(order.status),
            )}
          >
            {order.status}
          </span>
          <span className="sl-eyebrow font-sans text-xs tracking-[0.12em] uppercase">
            {formatDate(order.createdAt)}
          </span>
          <Link
            href="/account/orders"
            className="ml-auto font-sans text-xs tracking-[0.14em] text-[var(--sl-coral)] uppercase transition-opacity hover:opacity-60"
          >
            ← All Orders
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
          <div className="flex flex-col gap-6">
            <div className="sl-card-panel sl-card-shadow overflow-hidden rounded-sm bg-white">
              <div className="grid grid-cols-[1fr_auto_auto] gap-4 border-b border-[var(--sl-border)] bg-[var(--sl-cream)] px-5 py-3">
                {["Item", "Qty", "Total"].map((h) => (
                  <span
                    key={h}
                    className="sl-eyebrow font-sans text-[10px] tracking-[0.16em] uppercase"
                  >
                    {h}
                  </span>
                ))}
              </div>

              <div>
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-[1fr_auto_auto] items-start gap-4 border-b border-[var(--sl-border-subtle)] px-5 py-4"
                  >
                    <div>
                      <p className="font-sans text-sm tracking-[0.03em] text-[var(--sl-ink)] uppercase">
                        {item.productName}
                      </p>
                      {item.variantName && (
                        <p className="sl-eyebrow mt-1 font-sans text-[10px] tracking-[0.12em] uppercase">
                          {item.variantName}
                        </p>
                      )}
                    </div>
                    <span className="sl-eyebrow font-sans text-xs">
                      ×{item.quantity}
                    </span>
                    <span className="font-sans text-sm text-[var(--sl-ink)]">
                      {formatPrice(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="px-5 pt-2 pb-4">
                <Row label="Subtotal" value={formatPrice(order.subtotal)} />
                {order.discount > 0 && (
                  <div className="flex items-baseline justify-between border-b border-[var(--sl-border-subtle)] py-2.5">
                    <span className="font-sans text-xs tracking-[0.14em] text-green-600 uppercase">
                      Discount
                    </span>
                    <span className="font-sans text-sm text-green-600">
                      −{formatPrice(order.discount)}
                    </span>
                  </div>
                )}
                <Row
                  label="Shipping"
                  value={
                    order.shipping > 0 ? formatPrice(order.shipping) : "Free"
                  }
                />
                {order.tax > 0 && (
                  <Row label="Tax" value={formatPrice(order.tax)} />
                )}
                <Row label="Total" value={formatPrice(order.total)} bold />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {addr && (
              <div className="sl-card-panel rounded-sm bg-[var(--sl-cream)] p-5">
                <h5 className="mb-4 font-sans text-[10px] tracking-[0.18em] text-[var(--sl-coral)] uppercase">
                  Shipping Address
                </h5>
                <address className="flex flex-col gap-1 not-italic">
                  <p className="font-sans text-sm text-[var(--sl-ink)]">
                    {addr.firstName} {addr.lastName}
                  </p>
                  <p className="sl-eyebrow font-sans text-sm">
                    {addr.address1}
                  </p>
                  {addr.address2 && (
                    <p className="sl-eyebrow font-sans text-sm">
                      {addr.address2}
                    </p>
                  )}
                  <p className="sl-eyebrow font-sans text-sm">
                    {addr.city}
                    {addr.province ? `, ${addr.province}` : ""} {addr.zip}
                  </p>
                  <p className="sl-eyebrow font-sans text-sm">{addr.country}</p>
                </address>
              </div>
            )}

            {order.shipments && order.shipments.length > 0 && (
              <div className="sl-card-panel rounded-sm bg-white p-5">
                <h5 className="mb-4 font-sans text-[10px] tracking-[0.18em] text-[var(--sl-coral)] uppercase">
                  Shipments
                </h5>
                <div className="flex flex-col gap-4">
                  {order.shipments.map((shipment) => (
                    <div key={shipment.id} className="flex flex-col gap-1">
                      {shipment.carrier && (
                        <p className="font-sans text-xs tracking-[0.12em] text-[var(--sl-ink)] uppercase">
                          {shipment.carrier}
                        </p>
                      )}
                      {shipment.trackingNumber && (
                        <p className="sl-eyebrow font-sans text-xs">
                          {shipment.trackingNumber}
                        </p>
                      )}
                      {shipment.trackingUrl && (
                        <Link
                          href={shipment.trackingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="sl-btn mt-1 w-fit text-[10px]"
                        >
                          Track Shipment →
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </SledgeAccountLayout>
    </PageTransition>
  );
}
