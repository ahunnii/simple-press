import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { formatDate } from "~/lib/format-date";
import { formatPrice } from "~/lib/prices";
import { requireAdminAccess } from "~/lib/require-admin-access";
import { perDeliveryCentsFor } from "~/lib/subscriptions/mrr";
import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/server";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

import { SubscriptionStatusBadge } from "../_components/subscription-status-badge";
import { intervalLabel } from "../_lib/interval-label";
import {
  TABLE_CARD,
  TABLE_CELL,
  TABLE_HEAD,
} from "../../_components/admin-table-style";
import { TrailHeader } from "../../_components/trail-header";
import { SubscriptionActions } from "./_components/subscription-actions";

type Props = {
  params: Promise<{ id: string }>;
};

const TH = TABLE_HEAD;
const TD = TABLE_CELL;

function Field({ label, value }: { label: string; value: ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div>
      <p className="text-muted-foreground text-sm">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

const FULFILLMENT_STATUS_LABELS: Record<string, string> = {
  fulfilled: "Fulfilled",
  partially_fulfilled: "Partially fulfilled",
  unfulfilled: "Unfulfilled",
};

/**
 * `Subscription.cancelReason` is a raw column value written from four
 * different places (`CancelReason` in `~/lib/subscriptions/actions`). Shown
 * verbatim it reads as debug output — worse, "stripe" and "payment_failed" are
 * the two an owner most needs to understand, and neither explains itself.
 */
const CANCEL_REASON_LABELS: Record<string, string> = {
  customer: "Cancelled by customer",
  owner: "Cancelled by store",
  stripe: "Ended by Stripe (payment failed or removed in Stripe)",
  payment_failed: "Payment failed",
  checkout_expired: "Checkout was never completed",
};

export default async function SubscriptionDetailPage({ params }: Props) {
  const { id } = await params;

  // Same guard `/admin/layout.tsx` already ran — re-asserted here to match
  // the Orders-detail convention of every detail page re-checking access.
  await requireAdminAccess();

  const [subscription, flags, business] = await Promise.all([
    api.subscription.get({ id }).catch(rethrowTrpcForErrorBoundary),
    getBusinessFlags(),
    // `stripeAccountId` (for a Connect-correct dashboard deep link) +
    // `stripeAutoTaxEnabled` (whether the per-delivery figure is pre-tax).
    api.business.getWithIntegrations().catch(() => null),
  ]);

  if (!subscription) notFound();

  const featureEnabled = flags.isEnabled("subscriptions");
  const cadence = intervalLabel(subscription);
  const perDeliveryCents = perDeliveryCentsFor(subscription);
  const isPickup = subscription.deliveryMethod === "pickup";
  const hasAddress = !isPickup && Boolean(subscription.shipAddress1);

  // A skip leaves the row ACTIVE (Stripe voids one invoice and resumes
  // collecting by itself — see `deriveSubscriptionStatus`), so `status` alone
  // never shows it. A future `pauseResumesAt` does; an indefinite pause never
  // sets one.
  const skippedUntil =
    subscription.status === "active" &&
    subscription.pauseResumesAt &&
    subscription.pauseResumesAt.getTime() > Date.now()
      ? subscription.pauseResumesAt
      : null;

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Subscriptions", href: "/admin/subscriptions" },
          { label: subscription.customerEmail },
        ]}
      />

      <div className={cn("admin-form-toolbar")}>
        <div className="toolbar-info">
          <Button variant="ghost" size="sm" asChild className="shrink-0">
            <Link href="/admin/subscriptions">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          <div className="bg-border hidden h-6 w-px shrink-0 sm:block" />
          <div className="hidden min-w-0 items-center gap-2 sm:flex">
            <h1 className="text-base font-medium">
              {subscription.productName}
            </h1>
            <SubscriptionStatusBadge status={subscription.status} />
          </div>
        </div>

        <div className="toolbar-actions">
          <SubscriptionActions
            subscriptionId={subscription.id}
            status={subscription.status}
            pauseResumesAt={subscription.pauseResumesAt}
            featureEnabled={featureEnabled}
          />
        </div>
      </div>

      <div className="admin-container">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left column */}
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Subscription</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Product" value={subscription.productName} />
                <Field label="Variant" value={subscription.variantName} />
                <Field label="Quantity" value={subscription.quantity} />
                <Field label="Cadence" value={cadence} />
                <Field
                  label="List price"
                  value={formatPrice(subscription.listPriceCents)}
                />
                <Field
                  label="Subscribe & save"
                  value={
                    subscription.discountPercent > 0
                      ? `${subscription.discountPercent}%`
                      : "None"
                  }
                />
                <Field
                  label="Price per unit"
                  value={formatPrice(subscription.unitAmountCents)}
                />
                <Field
                  label="Shipping per delivery"
                  value={
                    isPickup
                      ? "In-store pickup — no shipping charge"
                      : formatPrice(subscription.shippingCents)
                  }
                />
                <Field
                  label={
                    business?.stripeAutoTaxEnabled
                      ? "Per-delivery total (before tax)"
                      : "Per-delivery total"
                  }
                  value={formatPrice(perDeliveryCents)}
                />
                <Field
                  label="Delivery method"
                  value={isPickup ? "In-store pickup" : "Ship"}
                />
                <Field
                  label="Created"
                  value={formatDate(subscription.createdAt)}
                />
                {subscription.status === "active" && (
                  <Field
                    label={
                      skippedUntil
                        ? "Next billing · one skipped"
                        : "Next billing"
                    }
                    value={
                      subscription.nextBillingAt
                        ? formatDate(subscription.nextBillingAt)
                        : "—"
                    }
                  />
                )}
                {skippedUntil && (
                  <Field
                    label="Delivery skipped"
                    value={`Collection resumes ${formatDate(skippedUntil)}`}
                  />
                )}
                {subscription.currentPeriodStart &&
                  subscription.currentPeriodEnd && (
                    <Field
                      label="Current period"
                      value={`${formatDate(subscription.currentPeriodStart)} – ${formatDate(subscription.currentPeriodEnd)}`}
                    />
                  )}
                {subscription.status === "paused" && (
                  <Field
                    label="Pause resumes at"
                    value={
                      subscription.pauseResumesAt
                        ? formatDate(subscription.pauseResumesAt)
                        : "Indefinitely — the owner must resume it manually"
                    }
                  />
                )}
                {subscription.status === "cancelled" && (
                  <>
                    <Field
                      label="Cancelled at"
                      value={
                        subscription.cancelledAt
                          ? formatDate(subscription.cancelledAt)
                          : "—"
                      }
                    />
                    <Field
                      label="Cancel reason"
                      value={
                        subscription.cancelReason
                          ? (CANCEL_REASON_LABELS[subscription.cancelReason] ??
                            subscription.cancelReason)
                          : null
                      }
                    />
                  </>
                )}
                {subscription.stripeSubscriptionId && (
                  <div className="sm:col-span-2">
                    <p className="text-muted-foreground text-sm">
                      Stripe subscription
                    </p>
                    <a
                      // Connect-scoped path. `dashboard.stripe.com/subscriptions/:id`
                      // resolves against the PLATFORM account, where this id does
                      // not exist — the owner lands on a "no such subscription"
                      // page and concludes their billing is broken.
                      href={
                        business?.stripeAccountId
                          ? `https://dashboard.stripe.com/${business.stripeAccountId}/subscriptions/${subscription.stripeSubscriptionId}`
                          : `https://dashboard.stripe.com/subscriptions/${subscription.stripeSubscriptionId}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-mono text-xs font-medium hover:underline"
                    >
                      {subscription.stripeSubscriptionId}
                      <ExternalLink aria-hidden="true" className="h-3 w-3" />
                      <span className="sr-only">(opens in Stripe)</span>
                    </a>
                    <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
                      Edits made directly in Stripe (quantity, price, address)
                      are not synced back and will produce mismatched renewal
                      orders. Use Cancel/Pause here instead.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Orders</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {subscription.orders.length === 0 ? (
                  <p className="text-muted-foreground p-6 text-sm">
                    No orders yet — an order is created here the moment the
                    first invoice is paid.
                  </p>
                ) : (
                  <div className={cn(TABLE_CARD, "border-0 shadow-none")}>
                    <Table>
                      <TableCaption className="sr-only">
                        Orders billed from this subscription
                      </TableCaption>
                      <TableHeader>
                        <TableRow>
                          <TableHead scope="col" className={TH}>
                            Order
                          </TableHead>
                          <TableHead scope="col" className={TH}>
                            Date
                          </TableHead>
                          <TableHead scope="col" className={`${TH} text-right`}>
                            Total
                          </TableHead>
                          <TableHead scope="col" className={TH}>
                            Payment
                          </TableHead>
                          <TableHead scope="col" className={TH}>
                            Fulfillment
                          </TableHead>
                          <TableHead scope="col" className={`${TH} text-right`}>
                            <span className="sr-only">Actions</span>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {subscription.orders.map((order) => (
                          <TableRow key={order.id}>
                            <TableCell className={`${TD} font-medium`}>
                              <Link
                                href={`/admin/orders/${order.id}`}
                                className="hover:underline"
                              >
                                #{order.orderNumber}
                              </Link>
                            </TableCell>
                            <TableCell className={TD}>
                              {formatDate(order.createdAt)}
                            </TableCell>
                            <TableCell
                              className={`${TD} text-right tabular-nums`}
                            >
                              {formatPrice(order.total)}
                            </TableCell>
                            <TableCell className={`${TD} capitalize`}>
                              {order.paymentStatus}
                            </TableCell>
                            <TableCell className={TD}>
                              {FULFILLMENT_STATUS_LABELS[
                                order.fulfillmentStatus
                              ] ?? order.fulfillmentStatus}
                            </TableCell>
                            <TableCell className={`${TD} text-right`}>
                              <Button variant="ghost" size="sm" asChild>
                                <Link href={`/admin/orders/${order.id}`}>
                                  View
                                  <span className="sr-only">
                                    {" "}
                                    order #{order.orderNumber}
                                  </span>
                                </Link>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Customer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Field label="Name" value={subscription.customerName} />
                <Field label="Email" value={subscription.customerEmail} />
                <Field label="Phone" value={subscription.customerPhone} />
                {subscription.customerId && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/admin/customers/${subscription.customerId}`}>
                      View customer
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  {isPickup ? "Pickup" : "Locked shipping address"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isPickup ? (
                  <p className="text-muted-foreground text-sm">
                    This customer picks up their order in store — no shipping
                    address is on file.
                  </p>
                ) : hasAddress ? (
                  <address className="text-foreground text-sm not-italic">
                    {subscription.shipFirstName} {subscription.shipLastName}
                    <br />
                    {subscription.shipAddress1}
                    <br />
                    {subscription.shipAddress2 && (
                      <>
                        {subscription.shipAddress2}
                        <br />
                      </>
                    )}
                    {subscription.shipCity}, {subscription.shipProvince}{" "}
                    {subscription.shipZip}
                    <br />
                    {subscription.shipCountry}
                  </address>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    No shipping address on file.
                  </p>
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
  const subscription = await api.subscription
    .get({ id })
    .catch(rethrowTrpcForErrorBoundary);
  if (!subscription) notFound();
  return {
    title: `Subscription — ${subscription.productName}`,
  };
}
