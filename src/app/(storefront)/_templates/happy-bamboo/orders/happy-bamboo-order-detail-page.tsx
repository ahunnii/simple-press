import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { formatDate } from "~/lib/format-date";
import { formatPrice } from "~/lib/prices";
import { Card, CardContent } from "~/components/ui/card";
import { FadeIn, PageTransition } from "~/components/page-animations";

import type { OrderDetailPageTemplateProps } from "../../types";

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

export function HappyBambooOrderDetailPage({
  order,
}: OrderDetailPageTemplateProps) {
  const addr = order.shippingAddress;

  return (
    <PageTransition>
      <section className="bg-secondary/40 py-16">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <FadeIn direction="up">
            <p className="text-primary mb-2 text-sm font-semibold tracking-wider uppercase">
              Account
            </p>
            <h1 className="font-heading text-foreground text-4xl font-bold">
              Order #{order.orderNumber}
            </h1>
            <div className="text-muted-foreground mt-2 flex items-center text-sm">
              <Link href="/" className="hover:text-primary">
                Home
              </Link>
              <span className="mx-2">/</span>
              <Link href="/account/profile" className="hover:text-primary">
                Account
              </Link>
              <span className="mx-2">/</span>
              <Link href="/account/orders" className="hover:text-primary">
                Orders
              </Link>
              <span className="mx-2">/</span>
              <span>#{order.orderNumber}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${statusClass(order.status)}`}
              >
                {order.status}
              </span>
              <span className="bg-secondary text-muted-foreground rounded-full px-3 py-1 text-xs">
                {formatDate(order.createdAt)}
              </span>
            </div>
          </FadeIn>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <FadeIn direction="up">
              <Card className="border-border/60">
                <CardContent className="p-6">
                  <h2 className="font-heading text-foreground mb-4 font-semibold">
                    Items
                  </h2>
                  {order.items.length > 0 ? (
                    <div className="divide-y">
                      {order.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-start justify-between py-4"
                        >
                          <div>
                            <p className="text-foreground font-medium">
                              {item.productName}
                            </p>
                            {item.variantName && (
                              <p className="text-muted-foreground text-sm">
                                {item.variantName}
                              </p>
                            )}
                            <p className="text-muted-foreground mt-1 text-sm">
                              Qty: {item.quantity} × {formatPrice(item.price)}
                            </p>
                          </div>
                          <p className="text-foreground font-semibold">
                            {formatPrice(item.total)}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      No item details recorded.
                    </p>
                  )}

                  <div className="mt-4 space-y-2 border-t pt-4 text-sm">
                    <div className="text-muted-foreground flex justify-between">
                      <span>Subtotal</span>
                      <span>{formatPrice(order.subtotal)}</span>
                    </div>
                    {order.discount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Discount</span>
                        <span className="text-green-600">
                          -{formatPrice(order.discount)}
                        </span>
                      </div>
                    )}
                    <div className="text-muted-foreground flex justify-between">
                      <span>Shipping</span>
                      <span>{formatPrice(order.shipping)}</span>
                    </div>
                    <div className="text-muted-foreground flex justify-between">
                      <span>Tax</span>
                      <span>{formatPrice(order.tax)}</span>
                    </div>
                    <div className="text-foreground flex justify-between border-t pt-2 text-base font-bold">
                      <span>Total</span>
                      <span>{formatPrice(order.total)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </FadeIn>

            {order.shipments.length > 0 && (
              <FadeIn direction="up" delay={0.1}>
                <Card className="border-border/60">
                  <CardContent className="p-6">
                    <h2 className="font-heading text-foreground mb-4 font-semibold">
                      Tracking
                    </h2>
                    <div className="space-y-3">
                      {order.shipments.map((shipment) => (
                        <div key={shipment.id} className="text-sm">
                          {shipment.carrier && (
                            <p className="text-foreground font-medium">
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
                              className="text-primary inline-flex items-center gap-1 hover:underline"
                            >
                              Track shipment{" "}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                          <p className="text-muted-foreground mt-1 text-xs">
                            Added {formatDate(shipment.createdAt)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </FadeIn>
            )}
          </div>

          <div className="space-y-6">
            {addr && (
              <FadeIn direction="up" delay={0.05}>
                <Card className="border-border/60">
                  <CardContent className="p-6">
                    <h2 className="font-heading text-foreground mb-4 font-semibold">
                      Shipping Address
                    </h2>
                    <address className="text-muted-foreground not-italic text-sm leading-relaxed">
                      {addr.firstName && addr.lastName && (
                        <p className="text-foreground font-medium">
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
                  </CardContent>
                </Card>
              </FadeIn>
            )}

            <FadeIn direction="up" delay={0.1}>
              <Card className="border-border/60">
                <CardContent className="p-6">
                  <h2 className="font-heading text-foreground mb-4 font-semibold">
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
                        <dd className="text-foreground">
                          {order.customerPhone}
                        </dd>
                      </div>
                    )}
                    <div>
                      <dt className="text-muted-foreground">Payment</dt>
                      <dd className="text-foreground capitalize">
                        {order.paymentStatus}
                      </dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>
            </FadeIn>

            <Link
              href="/account/orders"
              className="text-primary block text-sm font-semibold hover:underline"
            >
              ← Back to orders
            </Link>
          </div>
        </div>
      </section>
    </PageTransition>
  );
}
