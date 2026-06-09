import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { formatDate } from "~/lib/format-date";
import { formatPrice } from "~/lib/prices";

import type { OrderDetailPageTemplateProps } from "../../types";
import { DefaultAccountLayout } from "./default-account-layout";

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    open: "border-[#0a0a0a] text-[#0a0a0a]",
    completed: "border-[#15803d] text-[#15803d]",
    fulfilled: "border-[#15803d] text-[#15803d]",
    cancelled: "border-[#dc2626] text-[#dc2626]",
    refunded: "border-[#6b6b6b] text-[#6b6b6b]",
  };
  const style = styles[status] ?? "border-[#b45309] text-[#b45309]";
  return (
    <span
      className={`inline-flex items-center rounded-[2px] border px-2 py-0.5 text-[10px] font-medium tracking-[0.1em] uppercase ${style}`}
    >
      {status}
    </span>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[var(--radius)] border border-[#e8e8e8] p-6">
      <h2 className="mb-4 text-[11px] font-medium tracking-[0.14em] uppercase text-[#6b6b6b]">
        {title}
      </h2>
      {children}
    </div>
  );
}

export function DefaultOrderDetailPage({
  order,
}: OrderDetailPageTemplateProps) {
  const addr = order.shippingAddress;

  return (
    <DefaultAccountLayout heading={`Order #${order.orderNumber}`}>
      {/* Status + date strip */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <StatusBadge status={order.status} />
        <span className="text-[13px] text-[#6b6b6b]">
          {formatDate(order.createdAt)}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">

        {/* Left — items + totals + tracking */}
        <div className="flex flex-col gap-5 lg:col-span-2">

          {/* Items */}
          <Section title="Items">
            {order.items.length > 0 ? (
              <div className="flex flex-col divide-y divide-[#e8e8e8]">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between py-4 first:pt-0 last:pb-0"
                  >
                    <div className="flex flex-col gap-0.5">
                      <p className="text-sm font-medium">{item.productName}</p>
                      {item.variantName && (
                        <p className="text-[13px] text-[#6b6b6b]">
                          {item.variantName}
                        </p>
                      )}
                      <p className="text-[13px] text-[#6b6b6b]">
                        Qty {item.quantity} × {formatPrice(item.price)}
                      </p>
                    </div>
                    <p className="text-sm font-medium">
                      {formatPrice(item.total)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#6b6b6b]">
                No item details recorded.
              </p>
            )}

            {/* Totals */}
            <div className="mt-4 flex flex-col gap-2 border-t border-[#e8e8e8] pt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-[#6b6b6b]">Subtotal</span>
                <span>{formatPrice(order.subtotal)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between">
                  <span className="text-[#6b6b6b]">Discount</span>
                  <span className="text-[#15803d]">
                    -{formatPrice(order.discount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-[#6b6b6b]">Shipping</span>
                <span>
                  {order.shipping === 0 ? "Free" : formatPrice(order.shipping)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6b6b6b]">Tax</span>
                <span>{formatPrice(order.tax)}</span>
              </div>
              <div className="flex justify-between border-t border-[#e8e8e8] pt-2 font-medium">
                <span>Total</span>
                <span>{formatPrice(order.total)}</span>
              </div>
            </div>
          </Section>

          {/* Tracking */}
          {order.shipments.length > 0 && (
            <Section title="Tracking">
              <div className="flex flex-col gap-4">
                {order.shipments.map((shipment) => (
                  <div key={shipment.id} className="flex flex-col gap-1 text-sm">
                    {shipment.carrier && (
                      <p className="font-medium">{shipment.carrier}</p>
                    )}
                    {shipment.trackingNumber && (
                      <p className="text-[#6b6b6b]">
                        {shipment.trackingNumber}
                      </p>
                    )}
                    {shipment.trackingUrl && (
                      <a
                        href={shipment.trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 border-b border-current pb-0.5 text-sm font-medium self-start transition-opacity hover:opacity-70"
                      >
                        Track shipment{" "}
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                        <span className="sr-only">(opens in new tab)</span>
                      </a>
                    )}
                    <p className="text-[12px] text-[#6b6b6b]">
                      Added {formatDate(shipment.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>

        {/* Right — address + info */}
        <div className="flex flex-col gap-5">
          {addr && (
            <Section title="Shipping Address">
              <address className="flex flex-col gap-0.5 text-sm not-italic leading-relaxed">
                {addr.firstName && addr.lastName && (
                  <p className="font-medium">
                    {addr.firstName} {addr.lastName}
                  </p>
                )}
                <p className="text-[#6b6b6b]">{addr.address1}</p>
                {addr.address2 && (
                  <p className="text-[#6b6b6b]">{addr.address2}</p>
                )}
                <p className="text-[#6b6b6b]">
                  {addr.city}, {addr.province} {addr.zip}
                </p>
                <p className="text-[#6b6b6b]">{addr.country}</p>
              </address>
            </Section>
          )}

          <Section title="Order Info">
            <dl className="flex flex-col gap-3 text-sm">
              <div>
                <dt className="text-[11px] font-medium tracking-[0.1em] uppercase text-[#6b6b6b] mb-0.5">
                  Email
                </dt>
                <dd>{order.customerEmail}</dd>
              </div>
              {order.customerPhone && (
                <div>
                  <dt className="text-[11px] font-medium tracking-[0.1em] uppercase text-[#6b6b6b] mb-0.5">
                    Phone
                  </dt>
                  <dd>{order.customerPhone}</dd>
                </div>
              )}
              <div>
                <dt className="text-[11px] font-medium tracking-[0.1em] uppercase text-[#6b6b6b] mb-0.5">
                  Payment
                </dt>
                <dd className="capitalize">{order.paymentStatus}</dd>
              </div>
            </dl>
          </Section>

          <Link
            href="/account/orders"
            className="inline-flex items-center gap-2 text-sm font-medium border-b border-current pb-0.5 transition-[gap] hover:gap-3 self-start"
          >
            <span aria-hidden="true">←</span> Back to orders
          </Link>
        </div>
      </div>
    </DefaultAccountLayout>
  );
}
