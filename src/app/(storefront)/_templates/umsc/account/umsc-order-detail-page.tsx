import Link from "next/link";
import { ExternalLink } from "lucide-react";

import type { OrderDetailPageTemplateProps } from "../../types";
import { formatDate } from "~/lib/format-date";
import { formatPrice } from "~/lib/prices";

import { UmscOrderStatusBadge } from "./umsc-order-status-badge";

function UmscOrderCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="border border-[var(--umsc-line)] bg-[var(--umsc-white)] p-6">
      {children}
    </div>
  );
}

function CardHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="umsc-serif mb-4 text-[18px] font-normal text-[var(--umsc-ink)]">
      {children}
    </h2>
  );
}

/**
 * UmscOrderDetailPage — does NOT use `UmscAccountLayout`; it renders its own
 * black hero with a dynamic "Order #N" heading + breadcrumb, matching vii's
 * precedent (design.md: "own hero 'Order #N' + breadcrumb").
 */
export function UmscOrderDetailPage({ order }: OrderDetailPageTemplateProps) {
  const addr = order.shippingAddress;

  return (
    <>
      <section className="bg-[var(--umsc-black)] px-6 py-10 sm:px-8">
        <div className="mx-auto" style={{ maxWidth: "var(--umsc-container)" }}>
          <nav
            aria-label="Breadcrumb"
            className="umsc-sans mb-4 flex flex-wrap items-center gap-2 text-[13px] font-medium tracking-[0.06em] text-[var(--umsc-gold-soft)] uppercase"
          >
            {[
              { label: "Home", href: "/" },
              { label: "Account", href: "/account/settings" },
              { label: "Orders", href: "/account/orders" },
              { label: `#${order.orderNumber}` },
            ].map((crumb, i, all) => (
              <span key={crumb.label} className="flex items-center gap-2">
                {i > 0 && (
                  <span
                    aria-hidden="true"
                    className="text-[var(--umsc-line-gold)]"
                  >
                    /
                  </span>
                )}
                {crumb.href && i < all.length - 1 ? (
                  <Link
                    href={crumb.href}
                    className="text-[var(--umsc-gold-soft)] hover:text-[var(--umsc-cream-on-black)]"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span
                    aria-current="page"
                    className="text-[var(--umsc-cream-on-black)]"
                  >
                    {crumb.label}
                  </span>
                )}
              </span>
            ))}
          </nav>

          <h1 className="umsc-serif text-[clamp(28px,3.6vw,40px)] font-normal text-[var(--umsc-cream-on-black)]">
            Order #{order.orderNumber}
          </h1>

          <div className="mt-4 flex flex-wrap gap-2">
            <UmscOrderStatusBadge status={order.status} />
            <span className="umsc-sans border border-[var(--umsc-line-gold)] px-3 py-1 text-[12px] text-[var(--umsc-cream-on-black)]">
              {formatDate(order.createdAt)}
            </span>
          </div>
        </div>
      </section>

      <section className="px-6 py-10 sm:px-8 sm:py-14">
        <div className="mx-auto" style={{ maxWidth: "var(--umsc-container)" }}>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
            {/* Left column */}
            <div className="flex flex-col gap-6">
              <UmscOrderCard>
                <CardHeading>Items</CardHeading>
                {order.items.length > 0 ? (
                  <ul role="list" className="m-0 flex list-none flex-col p-0">
                    {order.items.map((item, idx) => (
                      <li
                        key={item.id}
                        className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0"
                        style={
                          idx < order.items.length - 1
                            ? { borderBottom: "1px solid var(--umsc-line)" }
                            : undefined
                        }
                      >
                        <div
                          aria-hidden="true"
                          className="umsc-serif flex size-12 shrink-0 items-center justify-center border border-[var(--umsc-line)] bg-[var(--umsc-cream)] text-[18px] font-normal text-[var(--umsc-gold-ink)]"
                        >
                          {item.productName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="umsc-sans text-[15px] font-medium text-[var(--umsc-ink)]">
                            {item.productName}
                          </p>
                          {item.variantName && (
                            <p className="umsc-sans mt-0.5 text-[13px] text-[var(--umsc-muted)]">
                              {item.variantName}
                            </p>
                          )}
                          <p className="umsc-tabular umsc-sans mt-0.5 text-[13px] text-[var(--umsc-muted)]">
                            Qty {item.quantity} × {formatPrice(item.price)}
                          </p>
                        </div>
                        <p className="umsc-tabular umsc-serif shrink-0 text-[16px] font-normal text-[var(--umsc-ink)]">
                          {formatPrice(item.total)}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="umsc-sans text-[14px] text-[var(--umsc-muted)]">
                    No item details recorded.
                  </p>
                )}

                <div className="mt-5 flex flex-col gap-2 border-t border-[var(--umsc-line)] pt-5">
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
                      className="umsc-tabular umsc-sans flex justify-between text-[14px]"
                      style={{
                        color: highlight
                          ? "var(--umsc-success)"
                          : "var(--umsc-muted)",
                      }}
                    >
                      <span>{label}</span>
                      <span>{value}</span>
                    </div>
                  ))}
                  <div className="umsc-tabular umsc-serif mt-1 flex justify-between border-t border-[var(--umsc-line)] pt-3 text-[18px] font-normal text-[var(--umsc-ink)]">
                    <span>Total</span>
                    <span>{formatPrice(order.total)}</span>
                  </div>
                </div>
              </UmscOrderCard>

              {order.shipments.length > 0 && (
                <UmscOrderCard>
                  <CardHeading>Tracking</CardHeading>
                  <div className="flex flex-col gap-4">
                    {order.shipments.map((shipment) => (
                      <div key={shipment.id}>
                        {shipment.carrier && (
                          <p className="umsc-sans text-[14px] font-medium text-[var(--umsc-ink)]">
                            {shipment.carrier}
                          </p>
                        )}
                        {shipment.trackingNumber && (
                          <p className="umsc-sans mt-0.5 text-[13px] text-[var(--umsc-muted)]">
                            Tracking: {shipment.trackingNumber}
                          </p>
                        )}
                        {shipment.trackingUrl && (
                          <a
                            href={shipment.trackingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="umsc-sans mt-1 inline-flex items-center gap-1 text-[13px] font-semibold text-[var(--umsc-gold-ink)] hover:text-[var(--umsc-ink)]"
                          >
                            Track shipment{" "}
                            <ExternalLink
                              aria-hidden="true"
                              className="size-3"
                            />
                          </a>
                        )}
                        <p className="umsc-sans mt-1.5 text-[12px] text-[var(--umsc-muted)]">
                          Added {formatDate(shipment.createdAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                </UmscOrderCard>
              )}
            </div>

            {/* Right column */}
            <div className="flex flex-col gap-6">
              {addr && (
                <UmscOrderCard>
                  <CardHeading>Shipping Address</CardHeading>
                  <address className="umsc-sans text-[14px] leading-[1.7] text-[var(--umsc-muted)] not-italic">
                    {addr.firstName && addr.lastName && (
                      <p className="font-medium text-[var(--umsc-ink)]">
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
                </UmscOrderCard>
              )}

              <UmscOrderCard>
                <CardHeading>Order Info</CardHeading>
                <dl className="m-0 flex flex-col gap-3">
                  <div>
                    <dt className="umsc-sans mb-0.5 text-[11px] font-semibold tracking-[0.1em] text-[var(--umsc-muted)] uppercase">
                      Email
                    </dt>
                    <dd className="umsc-sans m-0 text-[14px] text-[var(--umsc-ink)]">
                      {order.customerEmail}
                    </dd>
                  </div>
                  {order.customerPhone && (
                    <div>
                      <dt className="umsc-sans mb-0.5 text-[11px] font-semibold tracking-[0.1em] text-[var(--umsc-muted)] uppercase">
                        Phone
                      </dt>
                      <dd className="umsc-sans m-0 text-[14px] text-[var(--umsc-ink)]">
                        {order.customerPhone}
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt className="umsc-sans mb-0.5 text-[11px] font-semibold tracking-[0.1em] text-[var(--umsc-muted)] uppercase">
                      Payment
                    </dt>
                    <dd className="umsc-sans m-0 text-[14px] text-[var(--umsc-ink)] capitalize">
                      {order.paymentStatus}
                    </dd>
                  </div>
                </dl>
              </UmscOrderCard>

              <Link
                href="/account/orders"
                className="umsc-sans text-[13px] font-semibold text-[var(--umsc-gold-ink)] hover:text-[var(--umsc-ink)]"
              >
                ← Back to orders
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
