import Link from "next/link";

import type { OrderDetailPageTemplateProps } from "../../types";
import { formatDate } from "~/lib/format-date";
import { formatPrice } from "~/lib/prices";
import { PageTransition } from "~/components/page-animations";

import { SledgeAccountLayout } from "./sledge-account-layout";

function statusStyle(status: string): React.CSSProperties {
  switch (status) {
    case "completed":
      return { borderColor: "#16a34a", color: "#16a34a", background: "#f0fdf4" };
    case "cancelled":
      return { borderColor: "#dc2626", color: "#dc2626", background: "#fef2f2" };
    case "refunded":
      return {
        color: "var(--sl-ink-soft)",
        borderColor: "#d8d8d8",
        background: "var(--sl-cream)",
      };
    default:
      return {
        borderColor: "#d8d8d8",
        color: "var(--sl-ink)",
        background: "#ffffff",
      };
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
    <div
      className="flex items-baseline justify-between border-b py-2.5"
      style={{ borderColor: "#f0f0f0" }}
    >
      <span
        className="font-sans text-xs tracking-[0.14em] uppercase"
        style={{ color: "var(--sl-ink-soft)" }}
      >
        {label}
      </span>
      <span
        className={bold ? "font-sans text-lg tracking-[0.02em]" : "font-sans text-sm"}
        style={{ color: "var(--sl-ink)" }}
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
        <div
          className="mb-8 flex flex-wrap items-center gap-3 border-b pb-5"
          style={{ borderColor: "#e8e8e8" }}
        >
          <span
            className="inline-block rounded-sm border px-2 py-1 font-sans text-[10px] tracking-[0.12em] uppercase"
            style={statusStyle(order.status)}
          >
            {order.status}
          </span>
          <span
            className="font-sans text-xs tracking-[0.12em] uppercase"
            style={{ color: "var(--sl-ink-soft)" }}
          >
            {formatDate(order.createdAt)}
          </span>
          <Link
            href="/account/orders"
            className="ml-auto font-sans text-xs tracking-[0.14em] uppercase transition-opacity hover:opacity-60"
            style={{ color: "var(--sl-coral)" }}
          >
            ← All Orders
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
          <div className="flex flex-col gap-6">
            <div
              className="overflow-hidden rounded-sm bg-white"
              style={{
                border: "1px solid #e8e8e8",
                boxShadow: "0 2px 12px rgba(0, 0, 0, 0.04)",
              }}
            >
              <div
                className="grid gap-4 border-b px-5 py-3"
                style={{
                  gridTemplateColumns: "1fr auto auto",
                  borderColor: "#e8e8e8",
                  background: "var(--sl-cream)",
                }}
              >
                {["Item", "Qty", "Total"].map((h) => (
                  <span
                    key={h}
                    className="font-sans text-[10px] tracking-[0.16em] uppercase"
                    style={{ color: "var(--sl-ink-soft)" }}
                  >
                    {h}
                  </span>
                ))}
              </div>

              <div>
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="grid items-start gap-4 border-b px-5 py-4"
                    style={{
                      gridTemplateColumns: "1fr auto auto",
                      borderColor: "#f0f0f0",
                    }}
                  >
                    <div>
                      <p
                        className="font-sans text-sm tracking-[0.03em] uppercase"
                        style={{ color: "var(--sl-ink)" }}
                      >
                        {item.productName}
                      </p>
                      {item.variantName && (
                        <p
                          className="mt-1 font-sans text-[10px] tracking-[0.12em] uppercase"
                          style={{ color: "var(--sl-ink-soft)" }}
                        >
                          {item.variantName}
                        </p>
                      )}
                    </div>
                    <span
                      className="font-sans text-xs"
                      style={{ color: "var(--sl-ink-soft)" }}
                    >
                      ×{item.quantity}
                    </span>
                    <span
                      className="font-sans text-sm"
                      style={{ color: "var(--sl-ink)" }}
                    >
                      {formatPrice(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="px-5 pt-2 pb-4">
                <Row label="Subtotal" value={formatPrice(order.subtotal)} />
                {order.discount > 0 && (
                  <div
                    className="flex items-baseline justify-between border-b py-2.5"
                    style={{ borderColor: "#f0f0f0" }}
                  >
                    <span className="font-sans text-xs tracking-[0.14em] uppercase text-green-600">
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
              <div
                className="rounded-sm p-5"
                style={{
                  border: "1px solid #e8e8e8",
                  background: "var(--sl-cream)",
                }}
              >
                <h5
                  className="mb-4 font-sans text-[10px] tracking-[0.18em] uppercase"
                  style={{ color: "var(--sl-coral)" }}
                >
                  Shipping Address
                </h5>
                <address className="flex flex-col gap-1 not-italic">
                  <p className="font-sans text-sm" style={{ color: "var(--sl-ink)" }}>
                    {addr.firstName} {addr.lastName}
                  </p>
                  <p className="font-sans text-sm" style={{ color: "var(--sl-ink-soft)" }}>
                    {addr.address1}
                  </p>
                  {addr.address2 && (
                    <p className="font-sans text-sm" style={{ color: "var(--sl-ink-soft)" }}>
                      {addr.address2}
                    </p>
                  )}
                  <p className="font-sans text-sm" style={{ color: "var(--sl-ink-soft)" }}>
                    {addr.city}
                    {addr.province ? `, ${addr.province}` : ""} {addr.zip}
                  </p>
                  <p className="font-sans text-sm" style={{ color: "var(--sl-ink-soft)" }}>
                    {addr.country}
                  </p>
                </address>
              </div>
            )}

            {order.shipments && order.shipments.length > 0 && (
              <div
                className="rounded-sm p-5"
                style={{ border: "1px solid #e8e8e8", background: "#ffffff" }}
              >
                <h5
                  className="mb-4 font-sans text-[10px] tracking-[0.18em] uppercase"
                  style={{ color: "var(--sl-coral)" }}
                >
                  Shipments
                </h5>
                <div className="flex flex-col gap-4">
                  {order.shipments.map((shipment) => (
                    <div key={shipment.id} className="flex flex-col gap-1">
                      {shipment.carrier && (
                        <p className="font-sans text-xs tracking-[0.12em] uppercase" style={{ color: "var(--sl-ink)" }}>
                          {shipment.carrier}
                        </p>
                      )}
                      {shipment.trackingNumber && (
                        <p
                          className="font-sans text-xs"
                          style={{ color: "var(--sl-ink-soft)" }}
                        >
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
