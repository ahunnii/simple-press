import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { formatDate } from "~/lib/format-date";
import { formatPrice } from "~/lib/prices";

import type { OrderDetailPageTemplateProps } from "../../types";
import { DarkTrendAccountLayout } from "./dark-trend-account-layout";

function statusClass(status: string) {
  switch (status) {
    case "open":
      return "bg-blue-900/40 text-blue-300";
    case "completed":
      return "bg-green-900/40 text-green-300";
    case "cancelled":
      return "bg-red-900/40 text-red-300";
    case "refunded":
      return "bg-zinc-700 text-zinc-300";
    default:
      return "bg-yellow-900/40 text-yellow-300";
  }
}

export function DarkTrendOrderDetailPage({
  order,
}: OrderDetailPageTemplateProps) {
  const addr = order.shippingAddress;

  return (
    <DarkTrendAccountLayout heading={`Order #${order.orderNumber}`}>
      <div className="mb-4 flex flex-wrap gap-2">
        <span
          className={`rounded-sm px-3 py-1 text-xs font-medium capitalize ${statusClass(order.status)}`}
        >
          {order.status}
        </span>
        <span className="rounded-sm bg-white/10 px-3 py-1 text-xs text-white/70">
          {formatDate(order.createdAt)}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-sm border border-white/10 bg-zinc-900 p-6">
            <h2 className="mb-4 font-semibold text-white">Items</h2>
            {order.items.length > 0 ? (
              <div className="divide-y divide-white/10">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between py-4"
                  >
                    <div>
                      <p className="font-medium text-white">
                        {item.productName}
                      </p>
                      {item.variantName && (
                        <p className="text-sm text-white/60">
                          {item.variantName}
                        </p>
                      )}
                      <p className="mt-1 text-sm text-white/50">
                        Qty: {item.quantity} × {formatPrice(item.price)}
                      </p>
                    </div>
                    <p className="font-semibold text-white">
                      {formatPrice(item.total)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-white/50">No item details recorded.</p>
            )}

            <div className="mt-4 space-y-2 border-t border-white/10 pt-4 text-sm">
              <div className="flex justify-between text-white/60">
                <span>Subtotal</span>
                <span>{formatPrice(order.subtotal)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between">
                  <span className="text-white/60">Discount</span>
                  <span className="text-green-400">
                    -{formatPrice(order.discount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-white/60">
                <span>Shipping</span>
                <span>{formatPrice(order.shipping)}</span>
              </div>
              <div className="flex justify-between text-white/60">
                <span>Tax</span>
                <span>{formatPrice(order.tax)}</span>
              </div>
              <div className="flex justify-between border-t border-white/10 pt-2 text-base font-bold text-white">
                <span>Total</span>
                <span>{formatPrice(order.total)}</span>
              </div>
            </div>
          </div>

          {order.shipments.length > 0 && (
            <div className="rounded-sm border border-white/10 bg-zinc-900 p-6">
              <h2 className="mb-4 font-semibold text-white">Tracking</h2>
              <div className="space-y-3">
                {order.shipments.map((shipment) => (
                  <div key={shipment.id} className="text-sm">
                    {shipment.carrier && (
                      <p className="font-medium text-white">
                        {shipment.carrier}
                      </p>
                    )}
                    {shipment.trackingNumber && (
                      <p className="text-white/60">
                        Tracking: {shipment.trackingNumber}
                      </p>
                    )}
                    {shipment.trackingUrl && (
                      <a
                        href={shipment.trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-purple-400 hover:underline"
                      >
                        Track shipment <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    <p className="mt-1 text-xs text-white/40">
                      Added {formatDate(shipment.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {addr && (
            <div className="rounded-sm border border-white/10 bg-zinc-900 p-6">
              <h2 className="mb-4 font-semibold text-white">
                Shipping Address
              </h2>
              <address className="not-italic text-sm leading-relaxed text-white/60">
                {addr.firstName && addr.lastName && (
                  <p className="font-medium text-white">
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

          <div className="rounded-sm border border-white/10 bg-zinc-900 p-6">
            <h2 className="mb-4 font-semibold text-white">Order Info</h2>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-white/50">Email</dt>
                <dd className="text-white">{order.customerEmail}</dd>
              </div>
              {order.customerPhone && (
                <div>
                  <dt className="text-white/50">Phone</dt>
                  <dd className="text-white">{order.customerPhone}</dd>
                </div>
              )}
              <div>
                <dt className="text-white/50">Payment</dt>
                <dd className="capitalize text-white">{order.paymentStatus}</dd>
              </div>
            </dl>
          </div>

          <Link
            href="/account/orders"
            className="block text-sm font-medium text-purple-400 hover:underline"
          >
            ← Back to orders
          </Link>
        </div>
      </div>
    </DarkTrendAccountLayout>
  );
}
