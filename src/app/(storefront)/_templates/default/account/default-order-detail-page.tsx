import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { formatDate } from "~/lib/format-date";
import { formatPrice } from "~/lib/prices";

import type { OrderDetailPageTemplateProps } from "../../types";
import { DefaultAccountLayout } from "./default-account-layout";

function statusClass(status: string) {
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

export function DefaultOrderDetailPage({ order }: OrderDetailPageTemplateProps) {
  const addr = order.shippingAddress;

  return (
    <DefaultAccountLayout heading={`Order #${order.orderNumber}`}>
      <div className="mb-6 flex flex-wrap gap-2">
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${statusClass(order.status)}`}
        >
          {order.status}
        </span>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
          {formatDate(order.createdAt)}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: items + totals */}
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-semibold text-gray-900">Items</h2>
            {order.items.length > 0 ? (
              <div className="divide-y">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between py-4"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {item.productName}
                      </p>
                      {item.variantName && (
                        <p className="text-sm text-gray-600">
                          {item.variantName}
                        </p>
                      )}
                      <p className="mt-1 text-sm text-gray-500">
                        Qty: {item.quantity} × {formatPrice(item.price)}
                      </p>
                    </div>
                    <p className="font-semibold text-gray-900">
                      {formatPrice(item.total)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No item details recorded.</p>
            )}

            <div className="mt-4 space-y-2 border-t pt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span>{formatPrice(order.subtotal)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Discount</span>
                  <span className="text-green-600">
                    -{formatPrice(order.discount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Shipping</span>
                <span>{formatPrice(order.shipping)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tax</span>
                <span>{formatPrice(order.tax)}</span>
              </div>
              <div className="flex justify-between border-t pt-2 text-base font-bold">
                <span>Total</span>
                <span>{formatPrice(order.total)}</span>
              </div>
            </div>
          </div>

          {order.shipments.length > 0 && (
            <div className="rounded-lg border bg-white p-6 shadow-sm">
              <h2 className="mb-4 font-semibold text-gray-900">Tracking</h2>
              <div className="space-y-3">
                {order.shipments.map((shipment) => (
                  <div key={shipment.id} className="text-sm">
                    {shipment.carrier && (
                      <p className="font-medium text-gray-900">
                        {shipment.carrier}
                      </p>
                    )}
                    {shipment.trackingNumber && (
                      <p className="text-gray-600">
                        Tracking: {shipment.trackingNumber}
                      </p>
                    )}
                    {shipment.trackingUrl && (
                      <a
                        href={shipment.trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary inline-flex items-center gap-1 hover:underline"
                      >
                        Track shipment <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    <p className="mt-1 text-xs text-gray-400">
                      Added {formatDate(shipment.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: shipping address */}
        <div className="space-y-6">
          {addr && (
            <div className="rounded-lg border bg-white p-6 shadow-sm">
              <h2 className="mb-4 font-semibold text-gray-900">
                Shipping Address
              </h2>
              <address className="not-italic text-sm leading-relaxed text-gray-600">
                {addr.firstName && addr.lastName && (
                  <p className="font-medium text-gray-900">
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

          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-semibold text-gray-900">Order Info</h2>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-gray-500">Email</dt>
                <dd className="text-gray-900">{order.customerEmail}</dd>
              </div>
              {order.customerPhone && (
                <div>
                  <dt className="text-gray-500">Phone</dt>
                  <dd className="text-gray-900">{order.customerPhone}</dd>
                </div>
              )}
              <div>
                <dt className="text-gray-500">Payment</dt>
                <dd className="capitalize text-gray-900">
                  {order.paymentStatus}
                </dd>
              </div>
            </dl>
          </div>

          <Link
            href="/account/orders"
            className="text-primary block text-sm font-medium hover:underline"
          >
            ← Back to orders
          </Link>
        </div>
      </div>
    </DefaultAccountLayout>
  );
}
