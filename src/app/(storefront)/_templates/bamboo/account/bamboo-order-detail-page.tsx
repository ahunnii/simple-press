import Link from "next/link";
import { ExternalLink } from "lucide-react";

import type { OrderDetailPageTemplateProps } from "../../types";
import { formatDate } from "~/lib/format-date";
import { formatPrice } from "~/lib/prices";

import { BambooReveal } from "../shared/bamboo-reveal";
import { BambooAccountLayout } from "./bamboo-account-layout";
import { bambooStatusPillClass } from "./bamboo-order-status";

/**
 * A single order. Same panels as the order list — white roll paper with a
 * perforation top edge, pine headings, terracotta-free body copy — and exactly
 * the same fields the previous implementation rendered (items, money summary,
 * tracking, shipping address, order info). Nothing owner-only is exposed here:
 * this page is fed by `customer.getMyOrderById`, which never returns
 * `internalNote` or `stripePaymentIntentId`.
 */
export function BambooOrderDetailPage({ order }: OrderDetailPageTemplateProps) {
  const addr = order.shippingAddress;

  return (
    <BambooAccountLayout heading={`Order #${order.orderNumber}`}>
      <div className="mb-6 flex flex-wrap gap-2">
        <span className={bambooStatusPillClass(order.status)}>
          {order.status}
        </span>
        <span className="inline-flex items-center rounded-full border-2 border-[var(--bamboo-outline)] bg-[var(--bamboo-paper)] px-3 py-1 text-xs font-medium text-[var(--bamboo-ink-soft)]">
          {formatDate(order.createdAt)}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <BambooReveal>
            <section
              aria-labelledby="bamboo-order-items"
              className="bamboo-torn-card"
            >
              <h2
                id="bamboo-order-items"
                className="font-heading mb-4 text-[1.15rem] font-semibold text-[var(--bamboo-pine)]"
              >
                Items
              </h2>
              {order.items.length > 0 ? (
                <ul className="flex flex-col">
                  {order.items.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-start justify-between gap-4 border-t border-[var(--bamboo-outline)] py-4 first:border-t-0 first:pt-0"
                    >
                      <div>
                        <p className="font-medium text-[var(--bamboo-ink)]">
                          {item.productName}
                        </p>
                        {item.variantName && (
                          <p className="text-sm text-[var(--bamboo-ink-soft)]">
                            {item.variantName}
                          </p>
                        )}
                        <p className="mt-1 text-sm text-[var(--bamboo-muted)]">
                          Qty: {item.quantity} × {formatPrice(item.price)}
                        </p>
                      </div>
                      <p className="font-semibold text-[var(--bamboo-ink)]">
                        {formatPrice(item.total)}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-[var(--bamboo-ink-soft)]">
                  No item details recorded.
                </p>
              )}

              <dl className="mt-5 flex flex-col gap-2 border-t border-[var(--bamboo-outline)] pt-4 text-sm">
                <div className="flex justify-between text-[var(--bamboo-ink-soft)]">
                  <dt>Subtotal</dt>
                  <dd>{formatPrice(order.subtotal)}</dd>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-[var(--bamboo-ink-soft)]">Discount</dt>
                    <dd className="font-medium text-[var(--bamboo-pine)]">
                      -{formatPrice(order.discount)}
                    </dd>
                  </div>
                )}
                <div className="flex justify-between text-[var(--bamboo-ink-soft)]">
                  <dt>Shipping</dt>
                  <dd>{formatPrice(order.shipping)}</dd>
                </div>
                <div className="flex justify-between text-[var(--bamboo-ink-soft)]">
                  <dt>Tax</dt>
                  <dd>{formatPrice(order.tax)}</dd>
                </div>
                <div className="flex items-baseline justify-between border-t border-[var(--bamboo-outline)] pt-3 text-[var(--bamboo-ink)]">
                  <dt className="font-heading text-base font-semibold">
                    Total
                  </dt>
                  <dd className="font-heading text-[1.15rem] font-bold text-[var(--bamboo-ink)]">
                    {formatPrice(order.total)}
                  </dd>
                </div>
              </dl>
            </section>
          </BambooReveal>

          {order.shipments.length > 0 && (
            <BambooReveal>
              <section
                aria-labelledby="bamboo-order-tracking"
                className="bamboo-torn-card"
              >
                <h2
                  id="bamboo-order-tracking"
                  className="font-heading mb-4 text-[1.15rem] font-semibold text-[var(--bamboo-pine)]"
                >
                  Tracking
                </h2>
                <ul className="flex flex-col gap-4">
                  {order.shipments.map((shipment) => (
                    <li key={shipment.id} className="text-sm">
                      {shipment.carrier && (
                        <p className="font-medium text-[var(--bamboo-ink)]">
                          {shipment.carrier}
                        </p>
                      )}
                      {shipment.trackingNumber && (
                        <p className="text-[var(--bamboo-ink-soft)]">
                          Tracking: {shipment.trackingNumber}
                        </p>
                      )}
                      {shipment.trackingUrl && (
                        <a
                          href={shipment.trackingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bamboo-swipe mt-1 inline-flex items-center gap-1 text-[var(--bamboo-pine)]"
                        >
                          Track shipment
                          <ExternalLink
                            className="h-3 w-3"
                            aria-hidden="true"
                          />
                          <span className="sr-only">(opens in new tab)</span>
                        </a>
                      )}
                      <p className="mt-1 text-xs text-[var(--bamboo-muted)]">
                        Added {formatDate(shipment.createdAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            </BambooReveal>
          )}
        </div>

        <div className="flex flex-col gap-6">
          {addr && (
            <BambooReveal>
              <section
                aria-labelledby="bamboo-order-address"
                className="bamboo-torn-card"
              >
                <h2
                  id="bamboo-order-address"
                  className="font-heading mb-4 text-[1.15rem] font-semibold text-[var(--bamboo-pine)]"
                >
                  Shipping Address
                </h2>
                <address className="text-sm leading-relaxed text-[var(--bamboo-ink-soft)] not-italic">
                  {addr.firstName && addr.lastName && (
                    <p className="font-medium text-[var(--bamboo-ink)]">
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
              </section>
            </BambooReveal>
          )}

          <BambooReveal>
            <section
              aria-labelledby="bamboo-order-info"
              className="bamboo-torn-card"
            >
              <h2
                id="bamboo-order-info"
                className="font-heading mb-4 text-[1.15rem] font-semibold text-[var(--bamboo-pine)]"
              >
                Order Info
              </h2>
              <dl className="flex flex-col gap-3 text-sm">
                <div>
                  <dt className="text-[var(--bamboo-muted)]">Email</dt>
                  <dd className="text-[var(--bamboo-ink)]">
                    {order.customerEmail}
                  </dd>
                </div>
                {order.customerPhone && (
                  <div>
                    <dt className="text-[var(--bamboo-muted)]">Phone</dt>
                    <dd className="text-[var(--bamboo-ink)]">
                      {order.customerPhone}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-[var(--bamboo-muted)]">Payment</dt>
                  <dd className="text-[var(--bamboo-ink)] capitalize">
                    {order.paymentStatus}
                  </dd>
                </div>
              </dl>
            </section>
          </BambooReveal>

          <Link
            href="/account/orders"
            className="bamboo-swipe self-start text-[0.95rem] text-[var(--bamboo-pine)]"
          >
            <span aria-hidden="true">← </span>Back to orders
          </Link>
        </div>
      </div>
    </BambooAccountLayout>
  );
}
