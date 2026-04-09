import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { formatDate } from "~/lib/format-date";
import { formatPrice } from "~/lib/prices";

import type { OrderDetailPageTemplateProps } from "../../types";
import { ElegantAccountLayout } from "./elegant-account-layout";

function statusBadge(status: string) {
  switch (status) {
    case "paid":
      return "bg-blue-100 text-blue-800";
    case "fulfilled":
      return "bg-green-100 text-green-800";
    case "cancelled":
      return "bg-red-100 text-red-800";
    case "refunded":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-yellow-100 text-yellow-800";
  }
}

export function ElegantOrderDetailPage({
  order,
}: OrderDetailPageTemplateProps) {
  const addr = order.shippingAddress;

  return (
    <ElegantAccountLayout heading={`Order #${order.orderNumber}`}>
      <div className="mb-6 flex flex-wrap gap-2">
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${statusBadge(order.status)}`}
        >
          {order.status}
        </span>
        <span className="rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground">
          {formatDate(order.createdAt)}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Items + Totals */}
        <div className="space-y-6 lg:col-span-2">
          <div className="boty-shadow rounded-3xl bg-card p-6">
            <h2 className="mb-4 font-serif text-xl font-light tracking-wide text-foreground">
              Items
            </h2>
            {order.items.length > 0 ? (
              <div className="divide-y divide-border">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between py-4"
                  >
                    <div>
                      <p className="font-medium text-foreground">
                        {item.productName}
                      </p>
                      {item.variantName && (
                        <p className="text-sm text-muted-foreground">
                          {item.variantName}
                        </p>
                      )}
                      <p className="mt-1 text-sm text-muted-foreground">
                        Qty: {item.quantity} × {formatPrice(item.price)}
                      </p>
                    </div>
                    <p className="font-serif text-foreground">
                      {formatPrice(item.total)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No item details recorded.
              </p>
            )}

            <div className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-foreground">
                  {formatPrice(order.subtotal)}
                </span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="text-green-600">
                    -{formatPrice(order.discount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span className="text-foreground">
                  {formatPrice(order.shipping)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span className="text-foreground">{formatPrice(order.tax)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-2">
                <span className="font-serif font-medium text-foreground">
                  Total
                </span>
                <span className="font-serif text-lg text-foreground">
                  {formatPrice(order.total)}
                </span>
              </div>
            </div>
          </div>

          {order.shipments.length > 0 && (
            <div className="boty-shadow rounded-3xl bg-card p-6">
              <h2 className="mb-4 font-serif text-xl font-light tracking-wide text-foreground">
                Tracking
              </h2>
              <div className="space-y-3">
                {order.shipments.map((shipment) => (
                  <div key={shipment.id} className="text-sm">
                    {shipment.carrier && (
                      <p className="font-medium text-foreground">
                        {shipment.carrier}
                      </p>
                    )}
                    {shipment.trackingNumber && (
                      <p className="text-muted-foreground">
                        Tracking: {shipment.trackingNumber}
                      </p>
                    )}
                    {shipment.trackingUrl && (
                      <a
                        href={shipment.trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-foreground underline underline-offset-4 hover:text-muted-foreground"
                      >
                        Track shipment <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      Added {formatDate(shipment.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {addr && (
            <div className="boty-shadow rounded-3xl bg-card p-6">
              <h2 className="mb-4 font-serif text-lg font-light tracking-wide text-foreground">
                Shipping Address
              </h2>
              <address className="not-italic text-sm leading-relaxed text-muted-foreground">
                {addr.firstName && addr.lastName && (
                  <p className="font-medium text-foreground">
                    {addr.firstName} {addr.lastName}
                  </p>
                )}
                <p>{addr.address1}</p>
                {addr.address2 && <p>{addr.address2}</p>}
                <p>
                  {addr.city}, {addr.province} {addr.zip}
                </p>
                <p>{addr.country}</p>
              </address>
            </div>
          )}

          <div className="boty-shadow rounded-3xl bg-card p-6">
            <h2 className="mb-4 font-serif text-lg font-light tracking-wide text-foreground">
              Order Info
            </h2>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-muted-foreground">Email</dt>
                <dd className="text-foreground">{order.customerEmail}</dd>
              </div>
              {order.customerPhone && (
                <div>
                  <dt className="text-muted-foreground">Phone</dt>
                  <dd className="text-foreground">{order.customerPhone}</dd>
                </div>
              )}
              <div>
                <dt className="text-muted-foreground">Payment</dt>
                <dd className="capitalize text-foreground">
                  {order.paymentStatus}
                </dd>
              </div>
            </dl>
          </div>

          <Link
            href="/account/orders"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back to orders
          </Link>
        </div>
      </div>
    </ElegantAccountLayout>
  );
}
