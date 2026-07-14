import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";

import { checkBusiness } from "~/lib/check-business";
import { formatDate } from "~/lib/format-date";
import { verifyOrderStatusToken } from "~/lib/order-status-token";
import { formatPrice } from "~/lib/prices";
import { db } from "~/server/db";

export const metadata = {
  title: "Order Status",
  robots: { index: false, follow: false },
};

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  completed: "Completed",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

const PAYMENT_LABELS: Record<string, string> = {
  pending: "Payment pending",
  paid: "Paid",
  failed: "Payment failed",
  refunded: "Refunded",
};

const FULFILLMENT_LABELS: Record<string, string> = {
  unfulfilled: "Unfulfilled",
  fulfilled: "Fulfilled",
  partially_fulfilled: "Partially fulfilled",
};

function humanize(value: string): string {
  const spaced = value.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function StatusBadge({ label, tone }: { label: string; tone: string }) {
  const styles: Record<string, string> = {
    open: "border-foreground text-foreground",
    completed: "border-green-700 text-green-700",
    fulfilled: "border-green-700 text-green-700",
    paid: "border-green-700 text-green-700",
    cancelled: "border-destructive text-destructive",
    failed: "border-destructive text-destructive",
    refunded: "border-muted-foreground text-muted-foreground",
  };
  const style = styles[tone] ?? "border-amber-700 text-amber-700";
  return (
    <span
      className={`inline-flex items-center rounded-[2px] border px-2 py-0.5 text-[10px] font-medium tracking-[0.1em] uppercase ${style}`}
    >
      {label}
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
    <div className="rounded-[var(--radius)] border border-border p-6">
      <h2 className="mb-4 text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
        {title}
      </h2>
      {children}
    </div>
  );
}

function ExpiredState() {
  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-16 sm:py-24">
      <div className="rounded-[var(--radius)] border border-border p-8 text-center sm:p-12">
        <h1 className="mb-3 text-2xl font-medium tracking-tight">
          This link has expired
        </h1>
        <p className="mx-auto mb-8 max-w-md text-sm leading-relaxed text-muted-foreground">
          Order status links are valid for 90 days. This one is no longer
          valid, but you can request a fresh link — we&apos;ll email it to the
          address used on your order.
        </p>
        <Link
          href="/order-status"
          className="inline-flex items-center gap-2 border-b border-current pb-0.5 text-sm font-medium transition-[gap] hover:gap-3"
        >
          Request a new link <span aria-hidden="true">→</span>
        </Link>
      </div>
    </main>
  );
}

type Props = {
  params: Promise<{ token: string }>;
};

export default async function OrderStatusTokenPage({ params }: Props) {
  const { token } = await params;

  const business = await checkBusiness();
  if (!business) notFound();

  const payload = verifyOrderStatusToken(decodeURIComponent(token));
  if (!payload) {
    // Invalid or expired token — friendly recovery state, not a 404.
    return <ExpiredState />;
  }

  const order = await db.order.findFirst({
    where: { id: payload.orderId, businessId: business.id },
    include: {
      items: true,
      shippingAddress: true,
      shipments: { orderBy: { shippedAt: "asc" } },
    },
  });

  // Order missing or belonging to another business — cross-tenant tokens 404.
  if (!order) notFound();

  const addr = order.shippingAddress;

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-12 sm:py-16">
      <header className="mb-8">
        <p className="mb-2 text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
          Order status
        </p>
        <h1 className="text-2xl font-medium tracking-tight sm:text-3xl">
          Order #{order.orderNumber}
        </h1>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <StatusBadge
            label={STATUS_LABELS[order.status] ?? humanize(order.status)}
            tone={order.status}
          />
          <StatusBadge
            label={
              PAYMENT_LABELS[order.paymentStatus] ??
              humanize(order.paymentStatus)
            }
            tone={order.paymentStatus}
          />
          <StatusBadge
            label={
              FULFILLMENT_LABELS[order.fulfillmentStatus] ??
              humanize(order.fulfillmentStatus)
            }
            tone={order.fulfillmentStatus}
          />
          <span className="text-[13px] text-muted-foreground">
            Placed {formatDate(order.createdAt)}
          </span>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Left — items + totals + tracking */}
        <div className="flex flex-col gap-5 lg:col-span-2">
          <Section title="Items">
            {order.items.length > 0 ? (
              <div className="flex flex-col divide-y divide-border">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between py-4 first:pt-0 last:pb-0"
                  >
                    <div className="flex flex-col gap-0.5">
                      <p className="text-sm font-medium">{item.productName}</p>
                      {item.variantName && (
                        <p className="text-[13px] text-muted-foreground">
                          {item.variantName}
                        </p>
                      )}
                      <p className="text-[13px] text-muted-foreground">
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
              <p className="text-sm text-muted-foreground">
                No item details recorded.
              </p>
            )}

            {/* Totals */}
            <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatPrice(order.subtotal)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="text-green-700">
                    -{formatPrice(order.discount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span>
                  {order.shipping === 0 ? "Free" : formatPrice(order.shipping)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span>{formatPrice(order.tax)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-2 font-medium">
                <span>Total</span>
                <span>{formatPrice(order.total)}</span>
              </div>
            </div>
          </Section>

          {order.shipments.length > 0 && (
            <Section title="Tracking">
              <div className="flex flex-col gap-4">
                {order.shipments.map((shipment) => (
                  <div
                    key={shipment.id}
                    className="flex flex-col gap-1 text-sm"
                  >
                    {shipment.carrier && (
                      <p className="font-medium">{shipment.carrier}</p>
                    )}
                    {shipment.trackingNumber && (
                      <p className="text-muted-foreground">
                        {shipment.trackingNumber}
                      </p>
                    )}
                    {shipment.trackingUrl && (
                      <a
                        href={shipment.trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 self-start border-b border-current pb-0.5 text-sm font-medium transition-opacity hover:opacity-70"
                      >
                        Track shipment{" "}
                        <ExternalLink
                          className="h-3.5 w-3.5"
                          aria-hidden="true"
                        />
                        <span className="sr-only">(opens in new tab)</span>
                      </a>
                    )}
                    <p className="text-[12px] text-muted-foreground">
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
              <address className="flex flex-col gap-0.5 text-sm leading-relaxed not-italic">
                {addr.firstName && addr.lastName && (
                  <p className="font-medium">
                    {addr.firstName} {addr.lastName}
                  </p>
                )}
                <p className="text-muted-foreground">{addr.address1}</p>
                {addr.address2 && (
                  <p className="text-muted-foreground">{addr.address2}</p>
                )}
                <p className="text-muted-foreground">
                  {addr.city}, {addr.province} {addr.zip}
                </p>
                <p className="text-muted-foreground">{addr.country}</p>
              </address>
            </Section>
          )}

          <Section title="Order Info">
            <dl className="flex flex-col gap-3 text-sm">
              <div>
                <dt className="mb-0.5 text-[11px] font-medium tracking-[0.1em] text-muted-foreground uppercase">
                  Email
                </dt>
                <dd>{order.customerEmail}</dd>
              </div>
              {order.customerPhone && (
                <div>
                  <dt className="mb-0.5 text-[11px] font-medium tracking-[0.1em] text-muted-foreground uppercase">
                    Phone
                  </dt>
                  <dd>{order.customerPhone}</dd>
                </div>
              )}
              <div>
                <dt className="mb-0.5 text-[11px] font-medium tracking-[0.1em] text-muted-foreground uppercase">
                  Delivery
                </dt>
                <dd className="capitalize">
                  {order.deliveryMethod === "pickup"
                    ? "In-store pickup"
                    : "Shipping"}
                </dd>
              </div>
            </dl>
          </Section>

          <Link
            href="/"
            className="inline-flex items-center gap-2 self-start border-b border-current pb-0.5 text-sm font-medium transition-[gap] hover:gap-3"
          >
            <span aria-hidden="true">←</span> Back to store
          </Link>
        </div>
      </div>
    </main>
  );
}
