"use client";

import { ExternalLink } from "lucide-react";

import type { OrderDetailPageTemplateProps } from "../../types";
import { formatDate } from "~/lib/format-date";
import { formatPrice } from "~/lib/prices";

import { GloveButton } from "../shared/glove-button";
import { GloveRevealGroup } from "../shared/glove-reveal";
import { gloveRevealItemStyle } from "../shared/glove-reveal-style";
import { GloveAccountLayout } from "./glove-account-layout";
import {
  GloveAccountCard,
  GloveCardHeading,
  GloveOrderStatus,
} from "./glove-account-ui";

const SUMMARY_ROW = "flex items-baseline justify-between gap-4 text-[15px]";
const DT = "text-[var(--glove-text)]";
const DD = "glove-body m-0 font-bold text-[var(--glove-ink)]";
const INFO_LABEL =
  "glove-display text-[11px] font-semibold tracking-[0.06em] text-[var(--glove-muted)] uppercase";

/**
 * Order detail: items with totals, tracking, shipping address and order info,
 * all inside the shared account layout (the heading is "Order #N" and the
 * status pill sits beside it).
 */
export function GloveOrderDetailPage({ order }: OrderDetailPageTemplateProps) {
  const addr = order.shippingAddress;

  return (
    <GloveAccountLayout
      heading={`Order #${order.orderNumber}`}
      headingAside={
        <span className="flex flex-wrap items-center gap-3">
          <GloveOrderStatus status={order.status} />
          <span className="text-[14px] text-[var(--glove-muted)]">
            {formatDate(order.createdAt)}
          </span>
        </span>
      }
      breadcrumb={[
        { label: "Home", href: "/" },
        { label: "My Account", href: "/account/settings" },
        { label: "Orders", href: "/account/orders" },
        { label: `#${order.orderNumber}` },
      ]}
    >
      <GloveRevealGroup
        threshold={0}
        className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]"
      >
        <div className="flex min-w-0 flex-col gap-6">
          <GloveAccountCard
            className="glove-reveal-item"
            style={gloveRevealItemStyle(0)}
          >
            <GloveCardHeading>Items</GloveCardHeading>
            {order.items.length > 0 ? (
              <ul className="m-0 mt-4 flex list-none flex-col p-0">
                {order.items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start justify-between gap-4 border-b border-[var(--glove-line)] py-4 first:pt-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="glove-display text-[15px] leading-snug font-medium text-[var(--glove-ink)]">
                        {item.productName}
                      </p>
                      {item.variantName ? (
                        <p className="text-[13px] text-[var(--glove-muted)]">
                          {item.variantName}
                        </p>
                      ) : null}
                      <p className="mt-0.5 text-[13px] text-[var(--glove-muted)]">
                        Qty {item.quantity} × {formatPrice(item.price)}
                      </p>
                    </div>
                    <p className="glove-body shrink-0 text-[15px] font-bold text-[var(--glove-ink)]">
                      {formatPrice(item.total)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-[14px] text-[var(--glove-muted)]">
                No item details recorded.
              </p>
            )}

            <dl className="m-0 mt-5 flex flex-col gap-2">
              <div className={SUMMARY_ROW}>
                <dt className={DT}>Subtotal</dt>
                <dd className={DD}>{formatPrice(order.subtotal)}</dd>
              </div>
              {order.discount > 0 ? (
                <div className={SUMMARY_ROW}>
                  <dt className={DT}>Discount</dt>
                  <dd className="glove-body m-0 font-bold text-[var(--glove-success)]">
                    -{formatPrice(order.discount)}
                  </dd>
                </div>
              ) : null}
              <div className={SUMMARY_ROW}>
                <dt className={DT}>Shipping</dt>
                <dd className={DD}>{formatPrice(order.shipping)}</dd>
              </div>
              <div className={SUMMARY_ROW}>
                <dt className={DT}>Tax</dt>
                <dd className={DD}>{formatPrice(order.tax)}</dd>
              </div>
              <div className="mt-2 flex items-baseline justify-between gap-4 border-t border-[var(--glove-line)] pt-4">
                <dt className="glove-display text-[13px] font-semibold tracking-[0.05em] text-[var(--glove-ink)] uppercase">
                  Total
                </dt>
                <dd className="glove-body m-0 text-[22px] font-bold text-[var(--glove-primary)]">
                  {formatPrice(order.total)}
                </dd>
              </div>
            </dl>
          </GloveAccountCard>

          {order.shipments.length > 0 ? (
            <GloveAccountCard
              className="glove-reveal-item"
              style={gloveRevealItemStyle(1)}
            >
              <GloveCardHeading>Tracking</GloveCardHeading>
              <div className="mt-4 flex flex-col gap-5">
                {order.shipments.map((shipment) => (
                  <div key={shipment.id} className="text-[14px]">
                    {shipment.carrier ? (
                      <p className="font-bold text-[var(--glove-ink)]">
                        {shipment.carrier}
                      </p>
                    ) : null}
                    {shipment.trackingNumber ? (
                      <p className="text-[var(--glove-text)]">
                        Tracking: {shipment.trackingNumber}
                      </p>
                    ) : null}
                    {shipment.trackingUrl ? (
                      <a
                        href={shipment.trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1.5 text-[var(--glove-primary)] underline underline-offset-4 hover:text-[var(--glove-primary-hover)]"
                      >
                        Track shipment
                        <ExternalLink className="size-3.5" aria-hidden="true" />
                        <span className="sr-only"> (opens in new tab)</span>
                      </a>
                    ) : null}
                    <p className="mt-1 text-[13px] text-[var(--glove-muted)]">
                      Added {formatDate(shipment.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            </GloveAccountCard>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          {addr ? (
            <GloveAccountCard
              className="glove-reveal-item"
              style={gloveRevealItemStyle(1)}
            >
              <GloveCardHeading>Shipping address</GloveCardHeading>
              <address className="mt-3 text-[14px] leading-relaxed text-[var(--glove-text)] not-italic">
                {addr.firstName && addr.lastName ? (
                  <p className="font-bold text-[var(--glove-ink)]">
                    {addr.firstName} {addr.lastName}
                  </p>
                ) : null}
                <p>{addr.address1}</p>
                {addr.address2 ? <p>{addr.address2}</p> : null}
                <p>
                  {addr.city}, {addr.province} {addr.zip}
                </p>
                <p>{addr.country}</p>
              </address>
            </GloveAccountCard>
          ) : null}

          <GloveAccountCard
            className="glove-reveal-item"
            style={gloveRevealItemStyle(2)}
          >
            <GloveCardHeading>Order info</GloveCardHeading>
            <dl className="m-0 mt-3 flex flex-col gap-3">
              <div>
                <dt className={INFO_LABEL}>Email</dt>
                <dd className="m-0 text-[14px] break-all text-[var(--glove-ink)]">
                  {order.customerEmail}
                </dd>
              </div>
              {order.customerPhone ? (
                <div>
                  <dt className={INFO_LABEL}>Phone</dt>
                  <dd className="m-0 text-[14px] text-[var(--glove-ink)]">
                    {order.customerPhone}
                  </dd>
                </div>
              ) : null}
              <div>
                <dt className={INFO_LABEL}>Payment</dt>
                <dd className="m-0 text-[14px] text-[var(--glove-ink)] capitalize">
                  {order.paymentStatus}
                </dd>
              </div>
            </dl>
          </GloveAccountCard>

          <GloveButton
            href="/account/orders"
            variant="wooOutline"
            size="sm"
            className="self-start"
          >
            Back to orders
          </GloveButton>
        </div>
      </GloveRevealGroup>
    </GloveAccountLayout>
  );
}
