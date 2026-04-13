import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { formatDate } from "~/lib/format-date";
import { formatPrice } from "~/lib/prices";
import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/server";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

import { EditShippingAddressDialog } from "../_components/edit-shipping-address-dialog";
import { FulfillmentForm } from "../_components/fulfillment-form";
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

  const order = await api.order.getById(id).catch(rethrowTrpcForErrorBoundary);

  if (!order) {
    notFound();
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "paid":
        return "bg-blue-100 text-blue-800";
      case "processing":
        return "bg-indigo-100 text-indigo-800";
      case "fulfilled":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      case "refunded":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

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
                  : "secondary"
              }
            >
              Fulfillment: {order.fulfillmentStatus}
            </Badge>
          </div>
        </div>

        <div className="toolbar-actions">
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
                          <p className="font-medium text-gray-900">
                            {item.productName}
                          </p>
                          {item.variantName && (
                            <p className="text-sm text-gray-600">
                              {item.variantName}
                            </p>
                          )}
                          {item.sku && (
                            <p className="mt-1 text-xs text-gray-500">
                              SKU: {item.sku}
                            </p>
                          )}
                          <p className="mt-1 text-sm text-gray-600">
                            Qty: {item.quantity} × {formatPrice(item.price)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">
                            {formatPrice(item.total)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-2 text-sm text-gray-500">
                    No item breakdown was recorded for this order.
                  </p>
                )}

                {/* Totals */}
                <div className="mt-6 space-y-2 border-t pt-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="text-gray-900">
                      {formatPrice(order.subtotal)}
                    </span>
                  </div>

                  {order.discount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        Discount
                        {order.discountCode && (
                          <span className="ml-2 rounded bg-gray-100 px-2 py-0.5 font-mono text-xs">
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
                    <span className="text-gray-600">Shipping</span>
                    <span className="text-gray-900">
                      {formatPrice(order.shipping)}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tax</span>
                    <span className="text-gray-900">
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

            {/* Fulfillment Form — show when payment is confirmed and order not yet fulfilled.
                Keyed on paymentStatus rather than order.status so the form reappears
                if fulfillmentStatus is manually reset to unfulfilled via the override. */}
            {order.paymentStatus === "paid" &&
              order.fulfillmentStatus !== "fulfilled" && (
                <FulfillmentForm
                  orderId={order.id}
                  orderNumber={order.orderNumber}
                  customerEmail={order.customerEmail}
                  customerName={order.customerName ?? ""}
                />
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

                {order.status === "paid" && (
                  <p className="mt-4 text-sm text-gray-600">
                    Payment received. Ready to fulfill.
                  </p>
                )}

                {order.fulfillmentStatus === "fulfilled" && (
                  <ShipmentsPanel
                    orderId={order.id}
                    shipments={order.shipments}
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
                  <p className="text-sm text-gray-600">Name</p>
                  <p className="font-medium">{order.customerName}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-medium">{order.customerEmail}</p>
                </div>

                {order.customerPhone && (
                  <div>
                    <p className="text-sm text-gray-600">Phone</p>
                    <p className="font-medium">{order.customerPhone}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Shipping Address */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle>Shipping Address</CardTitle>
                <EditShippingAddressDialog
                  orderId={order.id}
                  address={order.shippingAddress ?? null}
                  canAdd={!!order.customerId}
                />
              </CardHeader>
              <CardContent>
                {order.shippingAddress ? (
                  <address className="text-gray-900 not-italic">
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
                    {order.shippingAddress.province} {order.shippingAddress.zip}
                    <br />
                    {order.shippingAddress.country}
                  </address>
                ) : (
                  <p className="text-sm text-gray-500">
                    No shipping address on file.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Notes — always visible and editable */}
            <OrderNotes
              orderId={order.id}
              internalNote={order.internalNote}
              customerNote={order.customerNote}
            />

            {/* Payment Info */}
            <Card>
              <CardHeader>
                <CardTitle>Payment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <p className="font-medium capitalize">
                    {order.paymentStatus}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Method</p>
                  <p className="font-medium">
                    {paymentMethodLabel(order.paymentMethod)}
                  </p>
                </div>
                {order.refundReason && (
                  <div>
                    <p className="text-sm text-gray-500">Refund Reason</p>
                    <p className="text-sm font-medium">{order.refundReason}</p>
                  </div>
                )}
                {order.stripePaymentIntentId && (
                  <div>
                    <p className="text-sm text-gray-500">Payment ID</p>
                    <p className="font-mono text-xs">
                      {order.stripePaymentIntentId}
                    </p>
                  </div>
                )}

                <div className="border-t pt-2">
                  <RefundHandler order={order} />
                </div>
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
