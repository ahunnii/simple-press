import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { api, HydrateClient } from "~/trpc/server";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

import { FulfillmentTracker } from "../_components/fulfillment-tracker";
import { OrderStatusUpdater } from "../_components/order-status-updater";
import { RefundHandler } from "../_components/refund-handler";
import { SiteHeader } from "../../_components/site-header";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function OrderDetailPage({ params }: PageProps) {
  const { id } = await params;

  // Get order
  const order = await api.order.getById(id);

  if (!order) {
    notFound();
  }

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(date));
  };

  const shippingAddress = order?.shippingAddress ?? null;

  return (
    <HydrateClient>
      <SiteHeader title={`Order #${order.id.slice(0, 8)}`} />
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" asChild className="mb-4">
            <Link href="/admin/orders">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Orders
            </Link>
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Order #{order.id.slice(0, 8)}
              </h1>
              <p className="mt-1 text-gray-600">
                {formatDate(order.createdAt)}
              </p>
            </div>
            <Badge variant={order.status === "paid" ? "default" : "secondary"}>
              {order.status}
            </Badge>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Order Items */}
          <div className="space-y-6 lg:col-span-2">
            {/* Status & Fulfillment */}
            <div className="grid gap-6 md:grid-cols-2">
              <OrderStatusUpdater order={order} />
              <FulfillmentTracker order={order} />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Order Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start justify-between border-b pb-4 last:border-0 last:pb-0"
                    >
                      <div>
                        <p className="font-medium text-gray-900">
                          {item.productName}
                        </p>
                        <p className="text-sm text-gray-500">
                          Quantity: {item.quantity}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatPrice(item.price)}</p>
                        <p className="text-sm text-gray-500">
                          Total: {formatPrice(item.total)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 space-y-2 border-t pt-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span>{formatPrice(order.subtotal)}</span>
                  </div>
                  {order.tax > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Tax</span>
                      <span>{formatPrice(order.tax)}</span>
                    </div>
                  )}
                  {order.shipping > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Shipping</span>
                      <span>{formatPrice(order.shipping)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-2 text-lg font-bold">
                    <span>Total</span>
                    <span>{formatPrice(order.total)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Customer & Shipping Info */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Customer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-sm text-gray-500">Name</p>
                  <p className="font-medium">{order.customerName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium">{order.customerEmail}</p>
                </div>
              </CardContent>
            </Card>

            {shippingAddress && (
              <Card>
                <CardHeader>
                  <CardTitle>Shipping Address</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm">
                    <p>
                      {shippingAddress.firstName} {shippingAddress.lastName}
                    </p>
                    <p>{shippingAddress.address1}</p>
                    {shippingAddress.address2 && (
                      <p>{shippingAddress.address2}</p>
                    )}
                    <p>
                      {shippingAddress.city}, {shippingAddress.province}{" "}
                      {shippingAddress.zip}
                    </p>
                    <p>{shippingAddress.country}</p>
                  </div>
                </CardContent>
              </Card>
            )}

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
                  <p className="font-medium">Card</p>
                </div>
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
    </HydrateClient>
  );
}

// import { headers } from "next/headers";
// import { notFound, redirect } from "next/navigation";
// import { formatDistanceToNow } from "date-fns";

// import { auth } from "~/server/better-auth";
// import { db } from "~/server/db";
// import { Badge } from "~/components/ui/badge";
// import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

// import { FulfillmentForm } from "../_components/fulfillment-form";

// export default async function OrderDetailPage({
//   params,
// }: {
//   params: { id: string };
// }) {
//   const session = await auth.api.getSession({
//     headers: await headers(),
//   });

//   if (!session?.user) {
//     redirect("/auth/sign-in");
//   }

//   const user = await db.user.findUnique({
//     where: { id: session.user.id },
//     include: {
//       business: {
//         select: { id: true, name: true },
//       },
//     },
//   });

//   if (!user?.business) {
//     redirect("/admin/welcome");
//   }

//   // Fetch order with all details
//   const order = await db.order.findUnique({
//     where: { id: params.id },
//     include: {
//       items: true,
//       shippingAddress: true,
//       customer: true,
//       discountCode: true,
//     },
//   });

//   if (!order || order.businessId !== user.business.id) {
//     notFound();
//   }

//   const formatPrice = (cents: number) => {
//     return new Intl.NumberFormat("en-US", {
//       style: "currency",
//       currency: "USD",
//     }).format(cents / 100);
//   };

//   const getStatusColor = (status: string) => {
//     switch (status) {
//       case "pending":
//         return "bg-yellow-100 text-yellow-800";
//       case "paid":
//         return "bg-blue-100 text-blue-800";
//       case "fulfilled":
//         return "bg-green-100 text-green-800";
//       case "cancelled":
//         return "bg-red-100 text-red-800";
//       case "refunded":
//         return "bg-gray-100 text-gray-800";
//       default:
//         return "bg-gray-100 text-gray-800";
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gray-50">
//       <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
//         {/* Header */}
//         <div className="mb-8">
//           <div className="flex items-center justify-between">
//             <div>
//               <h1 className="text-3xl font-bold text-gray-900">
//                 Order #{order.orderNumber}
//               </h1>
//               <p className="mt-2 text-gray-600">
//                 Placed{" "}
//                 {formatDistanceToNow(order.createdAt, { addSuffix: true })}
//               </p>
//             </div>
//             <Badge className={getStatusColor(order.status)}>
//               {order.status.toUpperCase()}
//             </Badge>
//           </div>
//         </div>

//         <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
//           {/* Left Column - Order Details */}
//           <div className="space-y-6 lg:col-span-2">
//             {/* Items */}
//             <Card>
//               <CardHeader>
//                 <CardTitle>Order Items</CardTitle>
//               </CardHeader>
//               <CardContent>
//                 <div className="space-y-4">
//                   {order.items.map((item) => (
//                     <div
//                       key={item.id}
//                       className="flex items-center justify-between border-b py-4 last:border-0"
//                     >
//                       <div>
//                         <p className="font-medium text-gray-900">
//                           {item.productName}
//                         </p>
//                         {item.variantName && (
//                           <p className="text-sm text-gray-600">
//                             {item.variantName}
//                           </p>
//                         )}
//                         {item.sku && (
//                           <p className="mt-1 text-xs text-gray-500">
//                             SKU: {item.sku}
//                           </p>
//                         )}
//                         <p className="mt-1 text-sm text-gray-600">
//                           Qty: {item.quantity} × {formatPrice(item.price)}
//                         </p>
//                       </div>
//                       <div className="text-right">
//                         <p className="font-semibold text-gray-900">
//                           {formatPrice(item.total)}
//                         </p>
//                       </div>
//                     </div>
//                   ))}
//                 </div>

//                 {/* Totals */}
//                 <div className="mt-6 space-y-2 border-t pt-6">
//                   <div className="flex justify-between text-sm">
//                     <span className="text-gray-600">Subtotal</span>
//                     <span className="text-gray-900">
//                       {formatPrice(order.subtotal)}
//                     </span>
//                   </div>

//                   {order.discount > 0 && (
//                     <div className="flex justify-between text-sm">
//                       <span className="text-gray-600">
//                         Discount
//                         {order.discountCode && (
//                           <span className="ml-2 rounded bg-gray-100 px-2 py-0.5 font-mono text-xs">
//                             {order.discountCode.code}
//                           </span>
//                         )}
//                       </span>
//                       <span className="text-green-600">
//                         -{formatPrice(order.discount)}
//                       </span>
//                     </div>
//                   )}

//                   <div className="flex justify-between text-sm">
//                     <span className="text-gray-600">Shipping</span>
//                     <span className="text-gray-900">
//                       {formatPrice(order.shipping)}
//                     </span>
//                   </div>

//                   <div className="flex justify-between text-sm">
//                     <span className="text-gray-600">Tax</span>
//                     <span className="text-gray-900">
//                       {formatPrice(order.tax)}
//                     </span>
//                   </div>

//                   <div className="flex justify-between border-t pt-2 text-lg font-bold">
//                     <span>Total</span>
//                     <span>{formatPrice(order.total)}</span>
//                   </div>
//                 </div>
//               </CardContent>
//             </Card>

//             {/* Customer Info */}
//             <Card>
//               <CardHeader>
//                 <CardTitle>Customer Information</CardTitle>
//               </CardHeader>
//               <CardContent className="space-y-4">
//                 <div>
//                   <p className="text-sm text-gray-600">Name</p>
//                   <p className="font-medium">{order.customerName}</p>
//                 </div>

//                 <div>
//                   <p className="text-sm text-gray-600">Email</p>
//                   <p className="font-medium">{order.customerEmail}</p>
//                 </div>

//                 {order.customerPhone && (
//                   <div>
//                     <p className="text-sm text-gray-600">Phone</p>
//                     <p className="font-medium">{order.customerPhone}</p>
//                   </div>
//                 )}
//               </CardContent>
//             </Card>

//             {/* Shipping Address */}
//             {order.shippingAddress && (
//               <Card>
//                 <CardHeader>
//                   <CardTitle>Shipping Address</CardTitle>
//                 </CardHeader>
//                 <CardContent>
//                   <address className="text-gray-900 not-italic">
//                     {order.shippingAddress.firstName}{" "}
//                     {order.shippingAddress.lastName}
//                     <br />
//                     {order.shippingAddress.address1}
//                     <br />
//                     {order.shippingAddress.address2 && (
//                       <>
//                         {order.shippingAddress.address2}
//                         <br />
//                       </>
//                     )}
//                     {order.shippingAddress.city},{" "}
//                     {order.shippingAddress.province} {order.shippingAddress.zip}
//                     <br />
//                     {order.shippingAddress.country}
//                   </address>
//                 </CardContent>
//               </Card>
//             )}
//           </div>

//           {/* Right Column - Actions */}
//           <div className="space-y-6">
//             {/* Order Status */}
//             <Card>
//               <CardHeader>
//                 <CardTitle>Order Status</CardTitle>
//               </CardHeader>
//               <CardContent>
//                 <Badge
//                   className={`${getStatusColor(order.status)} px-4 py-2 text-base`}
//                 >
//                   {order.status.toUpperCase()}
//                 </Badge>

//                 {order.status === "paid" && (
//                   <p className="mt-4 text-sm text-gray-600">
//                     Payment received. Ready to fulfill.
//                   </p>
//                 )}

//                 {order.status === "fulfilled" && order.shippedAt && (
//                   <div className="mt-4 space-y-2">
//                     <p className="text-sm text-gray-600">
//                       Shipped{" "}
//                       {formatDistanceToNow(order.shippedAt, {
//                         addSuffix: true,
//                       })}
//                     </p>
//                     {order.trackingNumber && (
//                       <div>
//                         <p className="text-sm text-gray-600">Tracking:</p>
//                         <p className="font-mono text-sm font-medium">
//                           {order.trackingNumber}
//                         </p>
//                         {order.trackingUrl && (
//                           <a
//                             href={order.trackingUrl}
//                             target="_blank"
//                             rel="noopener noreferrer"
//                             className="text-sm text-blue-600 hover:underline"
//                           >
//                             Track Package →
//                           </a>
//                         )}
//                       </div>
//                     )}
//                   </div>
//                 )}
//               </CardContent>
//             </Card>

//             {/* Fulfillment Form - Only show if paid */}
//             {order.status === "paid" && (
//               <FulfillmentForm
//                 orderId={order.id}
//                 orderNumber={order.orderNumber}
//                 customerEmail={order.customerEmail}
//                 customerName={order.customerName ?? ""}
//               />
//             )}

//             {/* Payment Info */}
//             <Card>
//               <CardHeader>
//                 <CardTitle>Payment Information</CardTitle>
//               </CardHeader>
//               <CardContent className="space-y-2">
//                 {order.stripePaymentIntentId && (
//                   <div>
//                     <p className="text-sm text-gray-600">Payment Intent</p>
//                     <p className="font-mono text-xs text-gray-900">
//                       {order.stripePaymentIntentId}
//                     </p>
//                   </div>
//                 )}

//                 {order.stripeSessionId && (
//                   <div>
//                     <p className="text-sm text-gray-600">Checkout Session</p>
//                     <p className="font-mono text-xs text-gray-900">
//                       {order.stripeSessionId}
//                     </p>
//                   </div>
//                 )}

//                 <div className="pt-2">
//                   <p className="text-sm text-gray-600">Created</p>
//                   <p className="text-sm text-gray-900">
//                     {new Date(order.createdAt).toLocaleString()}
//                   </p>
//                 </div>
//               </CardContent>
//             </Card>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }
