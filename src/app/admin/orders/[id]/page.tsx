import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, Package, ReceiptText } from "lucide-react";

import { formatDate } from "~/lib/format-date";
import { getAllowedCountries } from "~/lib/geo/regions";
import { formatPrice } from "~/lib/prices";
import { requireAdminAccess } from "~/lib/require-admin-access";
import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/server";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

import { CopyAddressButton } from "../_components/copy-address-button";
import { EditShippingAddressDialog } from "../_components/edit-shipping-address-dialog";
import { FulfillmentForm } from "../_components/fulfillment-form";
import { MarkReadyForPickup } from "../_components/mark-ready-for-pickup";
import { OrderMoreOptions } from "../_components/order-more-options";
import { OrderNotes } from "../_components/order-notes";
import { RefundHandler } from "../_components/refund-handler";
import { ShipmentsPanel } from "../_components/shipments-panel";
import { TrailHeader } from "../../_components/trail-header";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params;

  // Same guard `/admin/layout.tsx` already ran, called again for its resolved
  // `membershipRole` — which is what decides whether this page may show the
  // internal note and the refund controls at all. Matches
  // /admin/products/page.tsx's use of it.
  const [order, business, { membershipRole }] = await Promise.all([
    api.order.getById(id).catch(rethrowTrpcForErrorBoundary),
    api.business.simplifiedGet(),
    requireAdminAccess(),
  ]);

  if (!order) {
    notFound();
  }

  const isStaffViewer = membershipRole === "STAFF";

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      case "refunded":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const fulfillmentLabel = (status: string) => {
    switch (status) {
      case "fulfilled":
        return "fulfilled";
      case "partially_fulfilled":
        return "partially fulfilled";
      default:
        return "unfulfilled";
    }
  };

  const isPartiallyFulfilled =
    order.fulfillmentStatus === "partially_fulfilled";

  const paymentMethodLabel = (method: string) => {
    switch (method) {
      case "card":
        return "Card";
      case "cash":
        return "Cash";
      case "check":
        return "Check";
      default:
        return "Manual";
    }
  };

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Orders", href: "/admin/orders" },
          { label: `Order #${order.id.slice(0, 8)}` },
        ]}
      />

      <div className={cn("admin-form-toolbar")}>
        <div className="toolbar-info">
          <Button variant="ghost" size="sm" asChild className="shrink-0">
            <Link href="/admin/orders">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          <div className="bg-border hidden h-6 w-px shrink-0 sm:block" />
          <div className="hidden min-w-0 items-center gap-2 sm:flex">
            <h1 className="text-base font-medium">
              Order #{order.id.slice(0, 8)}
            </h1>

            <Badge variant="outline">{formatDate(order.createdAt)}</Badge>

            {/* <Badge variant={order.status === "paid" ? "default" : "secondary"}>
              Status: {order.status}
            </Badge> */}

            <Badge
              variant={order.paymentStatus === "paid" ? "default" : "secondary"}
            >
              Payment: {order.paymentStatus}
            </Badge>

            <Badge
              variant={
                order.fulfillmentStatus === "fulfilled"
                  ? "default"
                  : isPartiallyFulfilled
                    ? "warning"
                    : "secondary"
              }
            >
              Fulfillment: {fulfillmentLabel(order.fulfillmentStatus)}
            </Badge>

            {order.deliveryMethod === "pickup" && (
              <Badge variant="warning">Pickup</Badge>
            )}

            {order.hasOversell && <Badge variant="destructive">Oversold</Badge>}

            {order.subscription && (
              <Badge variant="outline" asChild>
                <Link href={`/admin/subscriptions/${order.subscription.id}`}>
                  Subscription
                </Link>
              </Badge>
            )}
          </div>
        </div>

        <div className="toolbar-actions">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/admin/orders/${order.id}/packing-slip`}>
              <Package className="h-4 w-4" />
              <span className="ml-2 hidden sm:inline">Packing Slip</span>
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/admin/orders/${order.id}/invoice`}>
              <ReceiptText className="h-4 w-4" />
              <span className="ml-2 hidden sm:inline">Invoice</span>
            </Link>
          </Button>
          <OrderMoreOptions order={order} />
        </div>
      </div>

      <div className="admin-container">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left Column - Order Details */}
          <div className="space-y-6 lg:col-span-2">
            {/* Items */}
            <Card>
              <CardHeader>
                <CardTitle>Order Items</CardTitle>
              </CardHeader>
              <CardContent>
                {order.items.length > 0 ? (
                  <div className="space-y-4">
                    {order.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between border-b py-4 last:border-0"
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
                          {item.sku && (
                            <p className="text-muted-foreground mt-1 text-xs">
                              SKU: {item.sku}
                            </p>
                          )}
                          <p className="text-muted-foreground mt-1 text-sm">
                            Qty: {item.quantity} × {formatPrice(item.price)}
                          </p>
                          {isPartiallyFulfilled &&
                            (item.fulfilledQuantity >= item.quantity ? (
                              <Badge variant="success" className="mt-2">
                                Shipped
                              </Badge>
                            ) : item.fulfilledQuantity > 0 ? (
                              <Badge variant="warning" className="mt-2">
                                {item.fulfilledQuantity} of {item.quantity}{" "}
                                shipped
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="mt-2">
                                Not shipped
                              </Badge>
                            ))}
                        </div>
                        <div className="text-right">
                          <p className="text-foreground font-semibold">
                            {formatPrice(item.total)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground py-2 text-sm">
                    No item breakdown was recorded for this order.
                  </p>
                )}

                {/* Totals */}
                <div className="mt-6 space-y-2 border-t pt-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="text-foreground">
                      {formatPrice(order.subtotal)}
                    </span>
                  </div>

                  {order.discount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Discount
                        {order.discountCode && (
                          <span className="bg-muted ml-2 rounded px-2 py-0.5 font-mono text-xs">
                            {order.discountCode.code}
                          </span>
                        )}
                      </span>
                      <span className="text-green-600">
                        -{formatPrice(order.discount)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Shipping</span>
                    <span className="text-foreground">
                      {formatPrice(order.shipping)}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax</span>
                    <span className="text-foreground">
                      {formatPrice(order.tax)}
                    </span>
                  </div>

                  <div className="flex justify-between border-t pt-2 text-lg font-bold">
                    <span>Total</span>
                    <span>{formatPrice(order.total)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Oversell Warning */}
            {order.hasOversell && order.oversellItems.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Oversold items in this order</AlertTitle>
                <AlertDescription>
                  <p className="mb-2 text-sm">
                    The following items were sold beyond available stock.
                    Consider contacting the customer or restocking.
                  </p>
                  <ul className="list-inside list-disc space-y-1 text-sm">
                    {order.oversellItems.map((item, i) => (
                      <li key={i}>
                        <span className="font-medium">
                          {item.productName ?? "Unknown product"}
                        </span>
                        {item.variantName && <span> — {item.variantName}</span>}
                        <span className="ml-1 text-xs opacity-80">
                          ({item.previousQty} in stock at time of purchase)
                        </span>
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Fulfillment controls — branched by delivery method.
                Keyed on paymentStatus rather than order.status so controls reappear
                if fulfillmentStatus is manually reset to unfulfilled via the override. */}
            {order.deliveryMethod === "pickup" ? (
              order.paymentStatus === "paid" &&
              order.fulfillmentStatus !== "fulfilled" ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Ready for Pickup</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4 text-sm">
                      Notify the customer that their order is ready to collect
                      in store. This will send them a pickup confirmation email.
                    </p>
                    <MarkReadyForPickup orderId={order.id} />
                  </CardContent>
                </Card>
              ) : order.fulfillmentStatus === "fulfilled" ? null : null
            ) : (
              order.paymentStatus === "paid" &&
              order.fulfillmentStatus !== "fulfilled" && (
                <FulfillmentForm
                  // Remount when per-item progress changes so the form's
                  // default quantities reflect the latest remaining counts.
                  key={order.items
                    .map((item) => `${item.id}:${item.fulfilledQuantity}`)
                    .join("|")}
                  orderId={order.id}
                  orderNumber={order.orderNumber}
                  customerEmail={order.customerEmail}
                  customerName={order.customerName ?? ""}
                  items={order.items.map((item) => ({
                    id: item.id,
                    productName: item.productName,
                    variantName: item.variantName,
                    quantity: item.quantity,
                    fulfilledQuantity: item.fulfilledQuantity,
                  }))}
                />
              )
            )}
          </div>

          {/* Right Column - Actions */}
          <div className="space-y-6">
            {/* Order Status */}
            <Card>
              <CardHeader>
                <CardTitle>Order Status</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge
                  className={`${getStatusColor(order.status)} px-4 py-2 text-base`}
                >
                  {order.status.toUpperCase()}
                </Badge>

                {order.paymentStatus === "paid" &&
                  order.fulfillmentStatus !== "fulfilled" && (
                    <p className="text-muted-foreground mt-4 text-sm">
                      {isPartiallyFulfilled
                        ? "Partially fulfilled — some items still need to ship."
                        : "Payment received. Ready to fulfill."}
                    </p>
                  )}

                {order.fulfillmentStatus === "fulfilled" &&
                  order.deliveryMethod === "pickup" && (
                    <p className="text-muted-foreground mt-4 text-sm">
                      Customer notified — ready for pickup.
                    </p>
                  )}

                {order.deliveryMethod !== "pickup" &&
                  (order.fulfillmentStatus === "fulfilled" ||
                    order.shipments.length > 0) && (
                    <ShipmentsPanel
                      orderId={order.id}
                      shipments={order.shipments}
                      orderItems={order.items.map((item) => ({
                        id: item.id,
                        productName: item.productName,
                        variantName: item.variantName,
                      }))}
                      canAddTracking={order.fulfillmentStatus === "fulfilled"}
                    />
                  )}
              </CardContent>
            </Card>

            {/* Customer Info */}
            <Card>
              <CardHeader>
                <CardTitle>Customer Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-muted-foreground text-sm">Name</p>
                  <p className="font-medium">{order.customerName}</p>
                </div>

                <div>
                  <p className="text-muted-foreground text-sm">Email</p>
                  <p className="font-medium">{order.customerEmail}</p>
                </div>

                {order.customerPhone && (
                  <div>
                    <p className="text-muted-foreground text-sm">Phone</p>
                    <p className="font-medium">{order.customerPhone}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Shipping Address / Pickup Location */}
            {order.deliveryMethod === "pickup" ? (
              <Card>
                <CardHeader>
                  <CardTitle>Pickup Location</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(business?.pickupLocation ?? business?.businessAddress) ? (
                    <p className="text-foreground text-sm font-medium">
                      {business?.pickupLocation ?? business?.businessAddress}
                    </p>
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      No pickup location configured.
                    </p>
                  )}
                  {business?.pickupInstructions && (
                    <p className="text-muted-foreground text-sm whitespace-pre-line">
                      {business.pickupInstructions}
                    </p>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <CardTitle>Shipping Address</CardTitle>
                  <div className="flex items-center gap-2">
                    {order.shippingAddress && (
                      <CopyAddressButton address={order.shippingAddress} />
                    )}
                    <EditShippingAddressDialog
                      orderId={order.id}
                      address={order.shippingAddress ?? null}
                      canAdd={!!order.customerId}
                      allowedCountries={getAllowedCountries(
                        business?.salesCountries ?? [],
                      )}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  {order.shippingAddress ? (
                    <address className="text-foreground not-italic">
                      {order.shippingAddress.firstName}{" "}
                      {order.shippingAddress.lastName}
                      <br />
                      {order.shippingAddress.address1}
                      <br />
                      {order.shippingAddress.address2 && (
                        <>
                          {order.shippingAddress.address2}
                          <br />
                        </>
                      )}
                      {order.shippingAddress.city},{" "}
                      {order.shippingAddress.province}{" "}
                      {order.shippingAddress.zip}
                      <br />
                      {order.shippingAddress.country}
                    </address>
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      No shipping address on file.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Notes — the customer's note is always visible; the internal
                note is owner/manager-only (D2), matching the server-side
                redaction in `order.getById` and the `ownerAdminProcedure` tier
                on `order.updateNote`. */}
            <OrderNotes
              orderId={order.id}
              internalNote={order.internalNote}
              customerNote={order.customerNote}
              canViewInternalNote={!isStaffViewer}
            />

            {/* Payment Info */}
            <Card>
              <CardHeader>
                <CardTitle>Payment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-muted-foreground text-sm">Status</p>
                  <p className="font-medium capitalize">
                    {order.paymentStatus}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Method</p>
                  <p className="font-medium">
                    {paymentMethodLabel(order.paymentMethod)}
                  </p>
                </div>
                {order.refundReason && (
                  <div>
                    <p className="text-muted-foreground text-sm">
                      Refund Reason
                    </p>
                    <p className="text-sm font-medium">{order.refundReason}</p>
                  </div>
                )}
                {order.stripePaymentIntentId && (
                  <div>
                    <p className="text-muted-foreground text-sm">Payment ID</p>
                    <p className="font-mono text-xs">
                      {order.stripePaymentIntentId}
                    </p>
                  </div>
                )}

                {/* Refunds are ownerAdmin-only server-side. This gate is
                    REQUIRED, not cosmetic: RefundHandler picks the manual-refund
                    dialog when `stripePaymentIntentId` is falsy, and D2 nulls
                    that field for STAFF — so without it a staff member would be
                    offered a refund button whose mutation throws FORBIDDEN. */}
                {!isStaffViewer && (
                  <div className="border-t pt-2">
                    <RefundHandler order={order} />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const order = await api.order.getById(id);
  return {
    title: `Order #${order?.id.slice(0, 8)}`,
  };
}
