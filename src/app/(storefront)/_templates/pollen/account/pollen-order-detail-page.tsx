import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { formatDate } from "~/lib/format-date";
import { formatPrice } from "~/lib/prices";
import { FadeIn } from "~/components/page-animations";

import type { OrderDetailPageTemplateProps } from "../../types";
import { PollenAccountLayout } from "./pollen-account-layout";

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

export function PollenOrderDetailPage({
  order,
}: OrderDetailPageTemplateProps) {
  const addr = order.shippingAddress;

  return (
    <PollenAccountLayout heading={`Order #${order.orderNumber}`}>
      <div className="mb-6 flex flex-wrap gap-2">
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${statusClass(order.status)}`}
        >
          {order.status}
        </span>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
          {formatDate(order.createdAt)}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <FadeIn direction="up">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 font-bold text-[#374151]">Items</h2>
              {order.items.length > 0 ? (
                <div className="divide-y">
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start justify-between py-4"
                    >
                      <div>
                        <p className="font-medium text-[#374151]">
                          {item.productName}
                        </p>
                        {item.variantName && (
                          <p className="text-sm text-[#4b5563]">
                            {item.variantName}
                          </p>
                        )}
                        <p className="mt-1 text-sm text-[#6b7280]">
                          Qty: {item.quantity} × {formatPrice(item.price)}
                        </p>
                      </div>
                      <p className="font-semibold text-[#374151]">
                        {formatPrice(item.total)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#6b7280]">
                  No item details recorded.
                </p>
              )}

              <div className="mt-4 space-y-2 border-t pt-4 text-sm">
                <div className="flex justify-between text-[#4b5563]">
                  <span>Subtotal</span>
                  <span>{formatPrice(order.subtotal)}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-[#4b5563]">Discount</span>
                    <span className="text-green-600">
                      -{formatPrice(order.discount)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-[#4b5563]">
                  <span>Shipping</span>
                  <span>{formatPrice(order.shipping)}</span>
                </div>
                <div className="flex justify-between text-[#4b5563]">
                  <span>Tax</span>
                  <span>{formatPrice(order.tax)}</span>
                </div>
                <div className="flex justify-between border-t pt-2 text-base font-bold text-[#374151]">
                  <span>Total</span>
                  <span>{formatPrice(order.total)}</span>
                </div>
              </div>
            </div>
          </FadeIn>

          {order.shipments.length > 0 && (
            <FadeIn direction="up" delay={0.1}>
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 font-bold text-[#374151]">Tracking</h2>
                <div className="space-y-3">
                  {order.shipments.map((shipment) => (
                    <div key={shipment.id} className="text-sm">
                      {shipment.carrier && (
                        <p className="font-medium text-[#374151]">
                          {shipment.carrier}
                        </p>
                      )}
                      {shipment.trackingNumber && (
                        <p className="text-[#4b5563]">
                          Tracking: {shipment.trackingNumber}
                        </p>
                      )}
                      {shipment.trackingUrl && (
                        <a
                          href={shipment.trackingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-semibold text-[#5e8b4a] hover:underline"
                        >
                          Track shipment <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                      <p className="mt-1 text-xs text-[#9ca3af]">
                        Added {formatDate(shipment.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </FadeIn>
          )}
        </div>

        <div className="space-y-6">
          {addr && (
            <FadeIn direction="up" delay={0.05}>
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 font-bold text-[#374151]">
                  Shipping Address
                </h2>
                <address className="not-italic text-sm leading-relaxed text-[#4b5563]">
                  {addr.firstName && addr.lastName && (
                    <p className="font-medium text-[#374151]">
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
            </FadeIn>
          )}

          <FadeIn direction="up" delay={0.1}>
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 font-bold text-[#374151]">Order Info</h2>
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-[#6b7280]">Email</dt>
                  <dd className="text-[#374151]">{order.customerEmail}</dd>
                </div>
                {order.customerPhone && (
                  <div>
                    <dt className="text-[#6b7280]">Phone</dt>
                    <dd className="text-[#374151]">{order.customerPhone}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-[#6b7280]">Payment</dt>
                  <dd className="capitalize text-[#374151]">
                    {order.paymentStatus}
                  </dd>
                </div>
              </dl>
            </div>
          </FadeIn>

          <Link
            href="/account/orders"
            className="block text-sm font-semibold text-[#5e8b4a] hover:underline"
          >
            ← Back to orders
          </Link>
        </div>
      </div>
    </PollenAccountLayout>
  );
}
