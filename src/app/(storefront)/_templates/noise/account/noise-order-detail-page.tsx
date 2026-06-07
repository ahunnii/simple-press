import Link from "next/link";

import type { OrderDetailPageTemplateProps } from "../../types";
import { formatDate } from "~/lib/format-date";
import { formatPrice } from "~/lib/prices";
import { PageTransition } from "~/components/page-animations";

import { NoiseAccountLayout } from "./noise-account-layout";

function statusStyle(status: string): React.CSSProperties {
  switch (status) {
    case "completed": return { borderColor: "#16a34a", color: "#16a34a" };
    case "cancelled": return { borderColor: "#dc2626", color: "#dc2626" };
    case "refunded": return { color: "var(--vn-steel-mist)", borderColor: "var(--vn-rule)" };
    default: return {};
  }
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between items-baseline py-2.5 border-b border-foreground/10">
      <span className="font-mono text-[10px] tracking-[0.18em] uppercase" style={{ color: "var(--vn-steel)" }}>
        {label}
      </span>
      <span className={bold ? "font-serif italic leading-none" : "font-mono text-[12px] tracking-[0.06em]"} style={bold ? { fontSize: "20px", letterSpacing: "-0.01em" } : {}}>
        {value}
      </span>
    </div>
  );
}

export function NoiseOrderDetailPage({ order }: OrderDetailPageTemplateProps) {
  const addr = order.shippingAddress;

  return (
    <PageTransition>
      <NoiseAccountLayout heading={`Order #${order.orderNumber}`}>
        {/* Meta bar */}
        <div className="flex flex-wrap items-center gap-3 mb-8 pb-5 border-b border-foreground/15">
          <span className="vn-stamp text-[9.5px]" style={statusStyle(order.status)}>
            {order.status}
          </span>
          <span className="font-mono text-[10px] tracking-[0.14em] uppercase" style={{ color: "var(--vn-steel-mist)" }}>
            {formatDate(order.createdAt)}
          </span>
          <Link href="/account/orders" className="font-mono text-[9.5px] tracking-[0.18em] uppercase ml-auto transition-opacity hover:opacity-60" style={{ color: "var(--vn-steel)" }}>
            ← All Orders
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
          {/* Items */}
          <div className="flex flex-col gap-6">
            <div className="border border-foreground/20">
              {/* Table header */}
              <div className="grid gap-4 px-5 py-3 border-b border-foreground/15" style={{ gridTemplateColumns: "1fr auto auto" }}>
                {["Garment", "Qty", "Total"].map((h) => (
                  <span key={h} className="font-mono text-[9.5px] tracking-[0.22em] uppercase" style={{ color: "var(--vn-steel-mist)" }}>
                    {h}
                  </span>
                ))}
              </div>

              {/* Items */}
              <div className="divide-y divide-foreground/10">
                {order.items.map((item) => (
                  <div key={item.id} className="grid items-start gap-4 px-5 py-4" style={{ gridTemplateColumns: "1fr auto auto" }}>
                    <div>
                      <p className="font-serif italic leading-none" style={{ fontSize: "18px", letterSpacing: "-0.005em" }}>
                        {item.productName}
                      </p>
                      {item.variantName && (
                        <p className="font-mono text-[9.5px] tracking-[0.14em] uppercase mt-1" style={{ color: "var(--vn-steel-mist)" }}>
                          {item.variantName}
                        </p>
                      )}
                    </div>
                    <span className="font-mono text-[11px] tracking-[0.1em]">×{item.quantity}</span>
                    <span className="font-mono text-[12px] tracking-[0.06em]">{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="px-5 pb-4 pt-2 border-t border-foreground/15">
                <Row label="Subtotal" value={formatPrice(order.subtotal)} />
                {order.discount > 0 && (
                  <div className="flex justify-between items-baseline py-2.5 border-b border-foreground/10">
                    <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-green-600">Discount</span>
                    <span className="font-mono text-[12px] tracking-[0.06em] text-green-600">−{formatPrice(order.discount)}</span>
                  </div>
                )}
                <Row label="Shipping" value={order.shipping > 0 ? formatPrice(order.shipping) : "Free"} />
                {order.tax > 0 && <Row label="Tax" value={formatPrice(order.tax)} />}
                <Row label="Total" value={formatPrice(order.total)} bold />
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="flex flex-col gap-4">
            {addr && (
              <div className="border border-foreground/20 p-5">
                <h2 className="font-mono text-[9px] tracking-[0.22em] uppercase mb-4" style={{ color: "var(--vn-steel-mist)" }}>
                  Shipping Address
                </h2>
                <address className="not-italic flex flex-col gap-1">
                  <p className="font-sans text-sm">{addr.firstName} {addr.lastName}</p>
                  <p className="font-sans text-sm" style={{ color: "var(--vn-steel-mist)" }}>{addr.address1}</p>
                  {addr.address2 && <p className="font-sans text-sm" style={{ color: "var(--vn-steel-mist)" }}>{addr.address2}</p>}
                  <p className="font-sans text-sm" style={{ color: "var(--vn-steel-mist)" }}>
                    {addr.city}{addr.province ? `, ${addr.province}` : ""} {addr.zip}
                  </p>
                  <p className="font-sans text-sm" style={{ color: "var(--vn-steel-mist)" }}>{addr.country}</p>
                </address>
              </div>
            )}

            {order.shipments && order.shipments.length > 0 && (
              <div className="border border-foreground/20 p-5">
                <h2 className="font-mono text-[9px] tracking-[0.22em] uppercase mb-4" style={{ color: "var(--vn-steel-mist)" }}>
                  Shipments
                </h2>
                <div className="flex flex-col gap-4">
                  {order.shipments.map((shipment) => (
                    <div key={shipment.id} className="flex flex-col gap-1">
                      {shipment.carrier && (
                        <p className="font-mono text-[10.5px] tracking-[0.14em] uppercase">{shipment.carrier}</p>
                      )}
                      {shipment.trackingNumber && (
                        <p className="font-mono text-[10px] tracking-[0.1em]" style={{ color: "var(--vn-steel-mist)" }}>
                          {shipment.trackingNumber}
                        </p>
                      )}
                      {shipment.trackingUrl && (
                        <Link href={shipment.trackingUrl} target="_blank" rel="noopener noreferrer"
                          className="vn-stamp text-[9.5px] w-fit transition-all hover:bg-foreground hover:text-background">
                          Track shipment →
                          <span className="sr-only">(opens in new tab)</span>
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </NoiseAccountLayout>
    </PageTransition>
  );
}
