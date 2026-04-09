import Link from "next/link";

import type { OrderDetailPageTemplateProps } from "../../types";
import { formatDate } from "~/lib/format-date";
import { formatPrice } from "~/lib/prices";
import { PageTransition } from "~/components/page-animations";

import { NoiseAccountLayout } from "./noise-account-layout";

function statusClass(status: string) {
  switch (status) {
    case "paid":
      return "border-blue-500/40 text-blue-400";
    case "fulfilled":
      return "border-green-500/40 text-green-400";
    case "cancelled":
      return "border-red-500/40 text-red-400";
    case "refunded":
      return "border-border text-muted-foreground";
    default:
      return "border-yellow-500/40 text-yellow-400";
  }
}

export function NoiseOrderDetailPage({ order }: OrderDetailPageTemplateProps) {
  const addr = order.shippingAddress;

  return (
    <PageTransition>
      <NoiseAccountLayout heading={`Order #${order.orderNumber}`}>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <span
            className={`border px-3 py-1 font-sans text-[9px] tracking-[0.2em] uppercase ${statusClass(order.status)}`}
          >
            {order.status}
          </span>
          <span className="font-sans text-sm text-muted-foreground">
            {formatDate(order.createdAt)}
          </span>
          <Link
            href="/account/orders"
            className="font-sans text-[10px] tracking-[0.15em] uppercase text-muted-foreground underline-offset-4 hover:underline"
          >
            ← All Orders
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Items */}
          <div className="space-y-6 lg:col-span-2">
            <div className="border border-border p-6">
              <h2 className="font-sans text-[10px] tracking-[0.3em] uppercase text-muted-foreground">
                Items
              </h2>
              <div className="mt-4 space-y-4">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-sans text-sm text-foreground">{item.productName}</p>
                      {item.variantName && (
                        <p className="font-sans text-xs text-muted-foreground">{item.variantName}</p>
                      )}
                      <p className="font-sans text-xs text-muted-foreground">Qty: {item.quantity}</p>
                    </div>
                    <p className="font-serif text-lg font-light text-foreground">
                      {formatPrice(item.price * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-6 space-y-2 border-t border-border pt-4">
                <div className="flex justify-between font-sans text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatPrice(order.subtotal)}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between font-sans text-sm text-green-400">
                    <span>Discount</span>
                    <span>-{formatPrice(order.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-sans text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>{order.shipping > 0 ? formatPrice(order.shipping) : "Free"}</span>
                </div>
                {order.tax > 0 && (
                  <div className="flex justify-between font-sans text-sm">
                    <span className="text-muted-foreground">Tax</span>
                    <span>{formatPrice(order.tax)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-border pt-2">
                  <span className="font-sans text-sm font-medium">Total</span>
                  <span className="font-serif text-xl font-light">{formatPrice(order.total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {addr && (
              <div className="border border-border p-6">
                <h2 className="font-sans text-[10px] tracking-[0.3em] uppercase text-muted-foreground">
                  Shipping Address
                </h2>
                <address className="mt-3 space-y-0.5 font-sans text-sm not-italic text-foreground">
                  <p>{addr.firstName} {addr.lastName}</p>
                  <p className="text-muted-foreground">{addr.address1}</p>
                  {addr.address2 && <p className="text-muted-foreground">{addr.address2}</p>}
                  <p className="text-muted-foreground">
                    {addr.city}{addr.province ? `, ${addr.province}` : ""} {addr.zip}
                  </p>
                  <p className="text-muted-foreground">{addr.country}</p>
                </address>
              </div>
            )}

            {order.shipments && order.shipments.length > 0 && (
              <div className="border border-border p-6">
                <h2 className="font-sans text-[10px] tracking-[0.3em] uppercase text-muted-foreground">
                  Shipments
                </h2>
                <div className="mt-3 space-y-3">
                  {order.shipments.map((shipment) => (
                    <div key={shipment.id} className="font-sans text-sm">
                      {shipment.carrier && (
                        <p className="text-foreground">{shipment.carrier}</p>
                      )}
                      {shipment.trackingNumber && (
                        <p className="text-muted-foreground">{shipment.trackingNumber}</p>
                      )}
                      {shipment.trackingUrl && (
                        <Link
                          href={shipment.trackingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] tracking-[0.15em] uppercase underline-offset-4 hover:underline"
                        >
                          Track →
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
