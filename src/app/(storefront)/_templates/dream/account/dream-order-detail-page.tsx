import type { CSSProperties } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

import type { OrderDetailPageTemplateProps } from "../../types";
import { formatDate } from "~/lib/format-date";
import { formatPrice } from "~/lib/prices";

import { DreamLink } from "../shared/dream-link";
import { DreamReveal, DreamRevealGroup } from "../shared/dream-reveal";
import { DreamOrderStatusBadge } from "./dream-order-status-badge";

function CardHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="m-0 mb-4 [font-family:var(--font-dream-display)] text-[19px] text-[var(--dream-ink)]">
      {children}
    </h2>
  );
}

/**
 * OrderDetailPage renders its own hero (dynamic "Order #N" heading +
 * breadcrumb) rather than wrapping `DreamAccountLayout`'s shared nav — the
 * same exception the account playbook calls out and `wealth-order-detail-
 * page.tsx` takes.
 */
export function DreamOrderDetailPage({ order }: OrderDetailPageTemplateProps) {
  const addr = order.shippingAddress;

  return (
    <div className="dream-account">
      <section
        className="border-b border-[var(--dream-line)] py-10 sm:py-12"
        style={{
          background:
            "linear-gradient(180deg, var(--dream-sky) 0%, var(--dream-paper) 100%)",
        }}
      >
        <div className="mx-auto w-full [max-width:var(--dream-container)] px-[var(--dream-gutter)]">
          <DreamReveal>
            <h1 className="m-0 mb-4 [font-family:var(--font-dream-display)] text-[clamp(32px,4.4vw,48px)] leading-[1.05] text-[var(--dream-ink)]">
              Order #{order.orderNumber}
            </h1>

            <nav aria-label="Breadcrumb" className="mb-4">
              <ol className="m-0 flex list-none flex-wrap items-center gap-0 p-0 text-[13px] text-[var(--dream-soft)]">
                {[
                  { label: "Home", href: "/" },
                  { label: "Account", href: "/account/settings" },
                  { label: "Orders", href: "/account/orders" },
                  { label: `#${order.orderNumber}` },
                ].map((crumb, i) => (
                  <li key={crumb.label} className="flex items-center">
                    {i > 0 ? (
                      <span aria-hidden="true" className="mx-2">
                        /
                      </span>
                    ) : null}
                    {crumb.href ? (
                      <Link href={crumb.href} className="dream-link">
                        {crumb.label}
                      </Link>
                    ) : (
                      <span
                        aria-current="page"
                        className="text-[var(--dream-ink)]"
                      >
                        {crumb.label}
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </nav>

            <div className="flex flex-wrap items-center gap-2">
              <DreamOrderStatusBadge status={order.status} />
              <span className="rounded-[var(--dream-radius-pill)] border border-[var(--dream-line)] bg-[var(--dream-paper)] px-2.5 py-1 text-[12px] text-[var(--dream-soft)]">
                {formatDate(order.createdAt)}
              </span>
            </div>
          </DreamReveal>
        </div>
      </section>

      <section className="mx-auto w-full [max-width:var(--dream-container)] px-[var(--dream-gutter)] py-12 sm:py-16">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          <DreamRevealGroup className="flex flex-col gap-6">
            <div
              className="dream-reveal-item"
              style={{ "--i": 0 } as CSSProperties}
            >
              <div className="dream-card">
                <CardHeading>Items</CardHeading>
                {order.items.length > 0 ? (
                  <ul role="list" className="m-0 list-none p-0">
                    {order.items.map((item, idx) => (
                      <li
                        key={item.id}
                        className="flex items-start justify-between gap-4"
                        style={{
                          paddingTop: idx === 0 ? 0 : 16,
                          paddingBottom: 16,
                          borderBottom:
                            idx < order.items.length - 1
                              ? "1px solid var(--dream-line)"
                              : "none",
                        }}
                      >
                        <div
                          aria-hidden="true"
                          className="flex h-12 w-12 shrink-0 items-center justify-center border border-[var(--dream-line)] bg-[var(--dream-sky)] [font-family:var(--font-dream-display)] text-[18px] text-[var(--dream-gold-ink)]"
                        >
                          {item.productName.charAt(0).toUpperCase()}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="m-0 mb-0.5 text-[15px] font-medium text-[var(--dream-ink)]">
                            {item.productName}
                          </p>
                          {item.variantName ? (
                            <p className="m-0 mb-1 text-[13px] text-[var(--dream-soft)]">
                              {item.variantName}
                            </p>
                          ) : null}
                          <p className="m-0 text-[13px] text-[var(--dream-soft)] tabular-nums">
                            Qty {item.quantity} × {formatPrice(item.price)}
                          </p>
                        </div>

                        <p className="m-0 shrink-0 [font-family:var(--font-dream-display)] text-[16px] text-[var(--dream-ink)] tabular-nums">
                          {formatPrice(item.total)}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="m-0 text-[14px] text-[var(--dream-soft)]">
                    No item details recorded.
                  </p>
                )}

                <div className="mt-5 flex flex-col gap-2 border-t border-[var(--dream-line)] pt-5">
                  {(
                    [
                      { label: "Subtotal", value: formatPrice(order.subtotal) },
                      ...(order.discount > 0
                        ? [
                            {
                              label: "Discount",
                              value: `−${formatPrice(order.discount)}`,
                              highlight: true,
                            },
                          ]
                        : []),
                      { label: "Shipping", value: formatPrice(order.shipping) },
                      { label: "Tax", value: formatPrice(order.tax) },
                    ] as { label: string; value: string; highlight?: boolean }[]
                  ).map(({ label, value, highlight }) => (
                    <div
                      key={label}
                      className="flex justify-between text-[14px] tabular-nums"
                      style={{
                        color: highlight
                          ? "var(--dream-gold-ink)"
                          : "var(--dream-soft)",
                      }}
                    >
                      <span>{label}</span>
                      <span>{value}</span>
                    </div>
                  ))}
                  <div className="mt-1 flex justify-between border-t border-[var(--dream-line)] pt-3 [font-family:var(--font-dream-display)] text-[18px] text-[var(--dream-ink)] tabular-nums">
                    <span>Total</span>
                    <span>{formatPrice(order.total)}</span>
                  </div>
                </div>
              </div>
            </div>

            {order.shipments.length > 0 ? (
              <div
                className="dream-reveal-item"
                style={{ "--i": 1 } as CSSProperties}
              >
                <div className="dream-card">
                  <CardHeading>Tracking</CardHeading>
                  <div className="flex flex-col gap-4">
                    {order.shipments.map((shipment) => (
                      <div key={shipment.id}>
                        {shipment.carrier ? (
                          <p className="m-0 mb-1 text-[14px] font-medium text-[var(--dream-ink)]">
                            {shipment.carrier}
                          </p>
                        ) : null}
                        {shipment.trackingNumber ? (
                          <p className="m-0 mb-1 text-[13px] text-[var(--dream-soft)]">
                            Tracking: {shipment.trackingNumber}
                          </p>
                        ) : null}
                        {shipment.trackingUrl ? (
                          <a
                            href={shipment.trackingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="dream-link inline-flex items-center gap-1"
                          >
                            Track shipment
                            <ExternalLink
                              aria-hidden="true"
                              strokeWidth={1.5}
                              className="h-3 w-3"
                            />
                            <span className="sr-only"> (opens in new tab)</span>
                          </a>
                        ) : null}
                        <p className="m-0 mt-1.5 text-[12px] text-[var(--dream-soft)]">
                          Added {formatDate(shipment.createdAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </DreamRevealGroup>

          <DreamRevealGroup className="flex flex-col gap-6">
            {addr ? (
              <div
                className="dream-reveal-item"
                style={{ "--i": 0 } as CSSProperties}
              >
                <div className="dream-card">
                  <CardHeading>Shipping Address</CardHeading>
                  <address className="text-[14px] leading-[1.7] text-[var(--dream-soft)] not-italic">
                    {addr.firstName && addr.lastName ? (
                      <p className="m-0 font-medium text-[var(--dream-ink)]">
                        {addr.firstName} {addr.lastName}
                      </p>
                    ) : null}
                    <p className="m-0">{addr.address1}</p>
                    {addr.address2 ? (
                      <p className="m-0">{addr.address2}</p>
                    ) : null}
                    <p className="m-0">
                      {addr.city}, {addr.province} {addr.zip}
                    </p>
                    <p className="m-0">{addr.country}</p>
                  </address>
                </div>
              </div>
            ) : null}

            <div
              className="dream-reveal-item"
              style={{ "--i": 1 } as CSSProperties}
            >
              <div className="dream-card">
                <CardHeading>Order Info</CardHeading>
                <dl className="m-0 flex flex-col gap-3">
                  <div>
                    <dt className="mb-0.5 text-[11px] tracking-[0.06em] text-[var(--dream-gold-ink)]">
                      Email
                    </dt>
                    <dd className="m-0 text-[14px] text-[var(--dream-ink)]">
                      {order.customerEmail}
                    </dd>
                  </div>
                  {order.customerPhone ? (
                    <div>
                      <dt className="mb-0.5 text-[11px] tracking-[0.06em] text-[var(--dream-gold-ink)]">
                        Phone
                      </dt>
                      <dd className="m-0 text-[14px] text-[var(--dream-ink)]">
                        {order.customerPhone}
                      </dd>
                    </div>
                  ) : null}
                  <div>
                    <dt className="mb-0.5 text-[11px] tracking-[0.06em] text-[var(--dream-gold-ink)]">
                      Payment
                    </dt>
                    <dd className="m-0 text-[14px] text-[var(--dream-ink)] capitalize">
                      {order.paymentStatus}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            <DreamLink href="/account/orders">← Back to orders</DreamLink>
          </DreamRevealGroup>
        </div>
      </section>
    </div>
  );
}
