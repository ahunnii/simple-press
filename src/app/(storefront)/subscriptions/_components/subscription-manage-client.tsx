"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import type { RouterOutputs } from "~/trpc/react";
import { formatDate } from "~/lib/format-date";
import { formatPrice } from "~/lib/prices";
import { cn } from "~/lib/utils";
import { SUBSCRIPTION_STATUS_LABELS } from "~/lib/validators/subscription";
import { api } from "~/trpc/react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";

type SubscriptionData = RouterOutputs["subscription"]["getByToken"];

type Props = {
  token: string;
  subscription: SubscriptionData;
  actionsEnabled: boolean;
  businessName: string;
};

const STATUS_TONE: Record<string, string> = {
  active: "border-green-700 text-green-700",
  paused: "border-amber-700 text-amber-700",
  past_due: "border-destructive text-destructive",
  cancelled: "border-muted-foreground text-muted-foreground",
  incomplete: "border-muted-foreground text-muted-foreground",
};

const ORDER_STATUS_LABELS: Record<string, string> = {
  open: "Open",
  completed: "Completed",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

/**
 * What a subscriber actually wants to know about a past delivery: has it
 * shipped. `Order.status` (open/completed/refunded) answers a different
 * question, so both are shown — fulfillment first while the order is still
 * live, and the order status alone once it is cancelled or refunded, where
 * "Unfulfilled" would read as a promise the store is no longer keeping.
 */
const ORDER_FULFILLMENT_LABELS: Record<string, string> = {
  unfulfilled: "Not shipped yet",
  partially_fulfilled: "Partially shipped",
  fulfilled: "Shipped",
  shipped: "Shipped",
  delivered: "Delivered",
  ready_for_pickup: "Ready for pickup",
  picked_up: "Picked up",
};

function orderProgressLine(order: {
  status: string;
  fulfillmentStatus: string;
}): string {
  const statusLabel = ORDER_STATUS_LABELS[order.status] ?? order.status;
  if (order.status === "cancelled" || order.status === "refunded") {
    return statusLabel;
  }
  const fulfillmentLabel = ORDER_FULFILLMENT_LABELS[order.fulfillmentStatus];
  return fulfillmentLabel ?? statusLabel;
}

function StatusPill({ status }: { status: string }) {
  const label =
    SUBSCRIPTION_STATUS_LABELS[
      status as keyof typeof SUBSCRIPTION_STATUS_LABELS
    ] ?? status;
  const tone = STATUS_TONE[status] ?? "border-foreground text-foreground";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[2px] border px-2 py-0.5 text-[10px] font-medium tracking-[0.1em] uppercase",
        tone,
      )}
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
    <div className="border-border rounded-[var(--radius)] border p-6">
      <h2 className="text-muted-foreground mb-4 text-[11px] font-medium tracking-[0.14em] uppercase">
        {title}
      </h2>
      {children}
    </div>
  );
}

/** What to show for "next delivery" given the subscription's current status. */
function nextDateLine(subscription: SubscriptionData): string | null {
  if (subscription.status === "cancelled") {
    return subscription.cancelledAt
      ? `Cancelled ${formatDate(subscription.cancelledAt)}`
      : "Cancelled";
  }
  if (subscription.status === "paused") {
    return subscription.pauseResumesAt
      ? `Resumes ${formatDate(subscription.pauseResumesAt)}`
      : "Paused until you resume it";
  }
  if (subscription.nextBillingAt) {
    return `Next delivery ${formatDate(subscription.nextBillingAt)}`;
  }
  if (subscription.currentPeriodEnd) {
    return `Renews ${formatDate(subscription.currentPeriodEnd)}`;
  }
  return null;
}

/**
 * The `/subscriptions/[token]` manage page's client half — status, pricing,
 * delivery details, recent orders, and every self-service action (skip,
 * pause/resume, update payment method, cancel). Every mutation is a
 * `*ByToken` procedure scoped to the token + tenant already verified by the
 * server page; this component never sees or needs the subscription's real
 * id.
 *
 * Action visibility follows the router's gating exactly: `cancelByToken` is
 * always available (a flag must never trap someone in recurring charges);
 * everything else only renders when `actionsEnabled` is true, since those
 * mutations are feature-gated server-side and would otherwise just fail.
 */
export function SubscriptionManageClient({
  token,
  subscription,
  actionsEnabled,
  businessName,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paymentUpdated = searchParams.get("updated") === "payment";

  const [cancelOpen, setCancelOpen] = useState(false);

  const skipMutation = api.subscription.skipNextByToken.useMutation({
    onSuccess: () => {
      toast.success("Next delivery skipped.");
      router.refresh();
    },
    onError: (err) => {
      toast.error(err.message || "Something went wrong. Please try again.");
    },
  });

  const pauseMutation = api.subscription.pauseByToken.useMutation({
    onSuccess: () => {
      toast.success("Subscription paused.");
      router.refresh();
    },
    onError: (err) => {
      toast.error(err.message || "Something went wrong. Please try again.");
    },
  });

  const resumeMutation = api.subscription.resumeByToken.useMutation({
    onSuccess: () => {
      toast.success("Subscription resumed.");
      router.refresh();
    },
    onError: (err) => {
      toast.error(err.message || "Something went wrong. Please try again.");
    },
  });

  const cancelMutation = api.subscription.cancelByToken.useMutation({
    onSuccess: () => {
      toast.success("Subscription cancelled.");
      setCancelOpen(false);
      router.refresh();
    },
    onError: (err) => {
      toast.error(err.message || "Something went wrong. Please try again.");
      setCancelOpen(false);
    },
  });

  const portalMutation =
    api.subscription.createPortalSessionByToken.useMutation({
      onSuccess: (data) => {
        window.location.href = data.url;
      },
      onError: (err) => {
        toast.error(err.message || "Something went wrong. Please try again.");
      },
    });

  const isBusy =
    skipMutation.isPending ||
    pauseMutation.isPending ||
    resumeMutation.isPending ||
    cancelMutation.isPending ||
    portalMutation.isPending;

  function handleUpdatePayment() {
    const returnUrl = new URL(window.location.href);
    returnUrl.searchParams.set("updated", "payment");
    portalMutation.mutate({ token, returnUrl: returnUrl.toString() });
  }

  const status = subscription.status;
  const isActive = status === "active";
  const isPaused = status === "paused";
  const isPastDue = status === "past_due";
  const isCancelled = status === "cancelled";

  const canSkip = actionsEnabled && isActive;
  const canPause = actionsEnabled && (isActive || isPastDue);
  const canResume = actionsEnabled && isPaused;
  const canUpdatePayment =
    actionsEnabled && subscription.canUpdatePaymentMethod;
  const canCancel = !isCancelled;
  const hasAnyAction =
    canSkip || canPause || canResume || canUpdatePayment || canCancel;

  const itemsCents = subscription.unitAmountCents * subscription.quantity;
  const shippingCents =
    subscription.deliveryMethod === "pickup" ? 0 : subscription.shippingCents;

  const address = subscription.shippingAddress;

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12 sm:py-16">
      <header className="mb-8 text-center">
        <p className="text-muted-foreground mb-2 text-[11px] font-medium tracking-[0.14em] uppercase">
          {businessName}
        </p>
        <h1 className="text-2xl font-medium tracking-tight sm:text-3xl">
          Manage your subscription
        </h1>
      </header>

      {paymentUpdated && (
        <div
          role="status"
          className="border-border mb-6 rounded-[var(--radius)] border p-4 text-center text-sm"
        >
          Payment method updated.
        </div>
      )}

      <div className="flex flex-col gap-5">
        <Section title="Subscription">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-base font-semibold">
                {subscription.productName}
                {subscription.variantName
                  ? ` — ${subscription.variantName}`
                  : ""}
              </p>
              <p className="text-muted-foreground mt-1 text-sm">
                Qty {subscription.quantity} &middot;{" "}
                {subscription.intervalLabel}
              </p>
            </div>
            <StatusPill status={status} />
          </div>

          {isPastDue && (
            <p role="alert" className="text-destructive mt-3 text-sm">
              Payment needed — update your card to keep this subscription
              active.
            </p>
          )}

          {nextDateLine(subscription) && (
            <p className="text-muted-foreground mt-3 text-sm">
              {nextDateLine(subscription)}
            </p>
          )}

          <dl className="border-border mt-4 flex flex-col gap-1.5 border-t pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">
                {subscription.quantity} ×{" "}
                {formatPrice(subscription.unitAmountCents)}
              </dt>
              <dd>{formatPrice(itemsCents)}</dd>
            </div>
            {subscription.deliveryMethod === "ship" && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">
                  Shipping (per delivery)
                </dt>
                <dd>
                  {shippingCents === 0 ? "Free" : formatPrice(shippingCents)}
                </dd>
              </div>
            )}
            <div className="border-border flex justify-between border-t pt-1.5 font-medium">
              <dt>Per-delivery total</dt>
              <dd>{formatPrice(subscription.perDeliveryCents)}</dd>
            </div>
          </dl>
        </Section>

        <Section title="Delivery">
          {subscription.deliveryMethod === "pickup" ? (
            <p className="text-sm">In-store pickup</p>
          ) : address ? (
            <address className="flex flex-col gap-0.5 text-sm leading-relaxed not-italic">
              <p>{address.line1}</p>
              {address.line2 && <p>{address.line2}</p>}
              <p>
                {address.city}, {address.state} {address.postalCode}
              </p>
              <p>{address.country}</p>
            </address>
          ) : (
            <p className="text-muted-foreground text-sm">
              No delivery address on file.
            </p>
          )}
        </Section>

        {subscription.recentOrders.length > 0 && (
          <Section title="Recent orders">
            <div className="divide-border flex flex-col divide-y">
              {subscription.recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                >
                  <div>
                    <p className="text-sm font-medium">
                      Order #{order.orderNumber}
                    </p>
                    <p className="text-muted-foreground text-[13px]">
                      {formatDate(order.createdAt)} &middot;{" "}
                      {orderProgressLine(order)}
                    </p>
                  </div>
                  <p className="text-sm font-medium">
                    {formatPrice(order.total)}
                  </p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {hasAnyAction && (
          <Section title="Actions">
            {!actionsEnabled && (
              <p className="text-muted-foreground mb-4 text-sm">
                Some options are temporarily unavailable — you can still cancel.
              </p>
            )}

            <div className="flex flex-wrap gap-3">
              {canSkip && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={isBusy}
                  onClick={() => skipMutation.mutate({ token })}
                >
                  Skip next delivery
                </Button>
              )}

              {canPause && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={isBusy}
                  onClick={() => pauseMutation.mutate({ token })}
                >
                  Pause
                </Button>
              )}

              {canResume && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={isBusy}
                  onClick={() => resumeMutation.mutate({ token })}
                >
                  Resume
                </Button>
              )}

              {canUpdatePayment && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={isBusy}
                  onClick={handleUpdatePayment}
                >
                  Update payment method
                </Button>
              )}

              {canCancel && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={isBusy}
                  onClick={() => setCancelOpen(true)}
                >
                  Cancel subscription
                </Button>
              )}
            </div>
          </Section>
        )}

        {isCancelled && (
          <p className="text-muted-foreground text-center text-sm">
            Changed your mind?{" "}
            <Link
              // Straight back to the product they were subscribed to when it
              // still exists; the shop index is the fallback for a product the
              // owner has since deleted.
              href={
                subscription.productSlug
                  ? `/shop/${subscription.productSlug}`
                  : "/shop"
              }
              className="border-b border-current pb-0.5 font-medium transition-opacity hover:opacity-70"
            >
              Subscribe again
            </Link>
          </p>
        )}
      </div>

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              You won&apos;t be charged again. Your most recent paid delivery
              will still ship.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelMutation.isPending}>
              Keep subscription
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={cancelMutation.isPending}
              onClick={() => cancelMutation.mutate({ token })}
            >
              {cancelMutation.isPending ? "Cancelling…" : "Yes, cancel"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
