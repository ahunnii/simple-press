"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Ban,
  Loader2,
  MoreHorizontal,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "~/trpc/react";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Label } from "~/components/ui/label";

type Shipment = {
  id: string;
  trackingNumber: string | null;
  carrier: string | null;
};

type Order = {
  id: string;
  orderNumber: number;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  refundAmountCents: number | null;
  shipments: Shipment[];
};

type Props = {
  order: Order;
};

// "Refunded" is intentionally excluded — use the Refund button in the Payment
// panel which properly moves money and handles restock/notification.
// "Failed" is intentionally excluded — it is set by Stripe webhooks and should
// not be overridden manually; doing so can mislead downstream processes.
const PAYMENT_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
] as const;

const FULFILLMENT_STATUSES = [
  { value: "unfulfilled", label: "Unfulfilled" },
  { value: "partially_fulfilled", label: "Partially Fulfilled" },
  { value: "fulfilled", label: "Fulfilled" },
] as const;

export function OrderMoreOptions({ order }: Props) {
  const router = useRouter();
  const utils = api.useUtils();
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [restockItems, setRestockItems] = useState(true);
  const [sendEmail, setSendEmail] = useState(true);

  const resendEmail = api.order.resendEmail.useMutation({
    onSuccess: () => {
      toast.dismiss();
      toast.success("Email resent successfully");
    },
    onError: (error) => {
      toast.dismiss();
      toast.error(error.message || "Failed to resend email");
    },
    onMutate: () => toast.loading("Resending email..."),
  });

  const updatePaymentStatus = api.order.updatePaymentStatus.useMutation({
    onSuccess: () => {
      toast.dismiss();
      toast.success("Payment status updated");
      void utils.order.invalidate();
      router.refresh();
    },
    onError: (error) => {
      toast.dismiss();
      toast.error(error.message ?? "Failed to update payment status");
    },
    onMutate: () => {
      toast.loading("Updating payment status...");
    },
  });

  const updateFulfillmentStatus = api.order.updateFulfillment.useMutation({
    onSuccess: () => {
      toast.dismiss();
      toast.success("Fulfillment status updated");
      void utils.order.invalidate();
      router.refresh();
    },
    onError: (error) => {
      toast.dismiss();
      toast.error(error.message ?? "Failed to update fulfillment status");
    },
    onMutate: () => {
      toast.loading("Updating fulfillment status...");
    },
  });

  const cancelOrder = api.order.updateStatus.useMutation({
    onSuccess: () => {
      toast.dismiss();
      toast.success("Order cancelled");
      setShowCancelDialog(false);
      void utils.order.invalidate();
      router.refresh();
    },
    onError: (error) => {
      toast.dismiss();
      toast.error(error.message ?? "Failed to cancel order");
    },
    onMutate: () => {
      toast.loading("Cancelling order...");
    },
  });

  const handleConfirmCancel = () => {
    cancelOrder.mutate({
      orderId: order.id,
      status: "cancelled",
      // Never restock if a refund already restored inventory (would double it).
      restockItems: canRestock && restockItems,
      sendEmail,
    });
  };

  const send = (
    type: "confirmation" | "shipped" | "fulfilled" | "refunded",
    shipmentId?: string,
  ) => {
    resendEmail.mutate({ orderId: order.id, type, shipmentId });
  };

  const isPaid = order.paymentStatus === "paid";
  const isFulfilled = order.fulfillmentStatus === "fulfilled";
  const isRefunded = order.status === "refunded";
  const shipmentsWithTracking = order.shipments.filter((s) => s.trackingNumber);
  const hasTrackingShipments = shipmentsWithTracking.length > 0;
  const hasNoTrackingShipments = isFulfilled && !hasTrackingShipments;

  const hasEmailOptions =
    isPaid || hasTrackingShipments || hasNoTrackingShipments || isRefunded;

  // Cancellation doesn't make sense once the order is already
  // cancelled/refunded, or once fulfillment has started — the backend
  // `updateStatus` mutation has no transition guard, so this must be
  // enforced client-side.
  const canCancel =
    order.status !== "cancelled" &&
    order.status !== "refunded" &&
    order.fulfillmentStatus !== "fulfilled" &&
    order.fulfillmentStatus !== "partially_fulfilled";

  // Inventory was only deducted for orders that reached "open" or
  // "completed" — mirrors the server's hadInventoryDeducted check.
  const hadInventoryDeducted =
    order.status === "open" || order.status === "completed";

  // If a refund already ran with restock, the inventory was restored then, so
  // cancelling must NOT restock again (would double-count). We can't tell
  // whether that refund chose to restock, so we conservatively disable restock
  // on cancel once any refund has been recorded.
  const hasPriorRefund = (order.refundAmountCents ?? 0) > 0;
  const canRestock = hadInventoryDeducted && !hasPriorRefund;

  const isPending =
    resendEmail.isPending ||
    updatePaymentStatus.isPending ||
    updateFulfillmentStatus.isPending ||
    cancelOrder.isPending;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={isPending}>
            <MoreHorizontal className="h-4 w-4" />
            <span className="ml-2 hidden sm:inline">More Options</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {hasEmailOptions && (
            <>
              <DropdownMenuLabel>Resend Emails</DropdownMenuLabel>
              <DropdownMenuSeparator />

              {isPaid && (
                <DropdownMenuItem onClick={() => send("confirmation")}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Resend Order Confirmation
                </DropdownMenuItem>
              )}

              {hasTrackingShipments &&
                shipmentsWithTracking.map((shipment, index) => (
                  <DropdownMenuItem
                    key={shipment.id}
                    onClick={() => send("shipped", shipment.id)}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Resend Shipped Email
                    {shipmentsWithTracking.length > 1 &&
                      ` (Package ${index + 1})`}
                  </DropdownMenuItem>
                ))}

              {hasNoTrackingShipments && (
                <DropdownMenuItem onClick={() => send("fulfilled")}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Resend Fulfilled Email
                </DropdownMenuItem>
              )}

              {isRefunded && (
                <DropdownMenuItem onClick={() => send("refunded")}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Resend Refund Email
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />
            </>
          )}

          {/* Overriding a cancelled order's status back to open/paid would
              re-enable "Cancel Order" and allow a second restock — so hide the
              status overrides once the order is cancelled. */}
          {order.status !== "cancelled" && (
            <>
              <DropdownMenuLabel>Override Status</DropdownMenuLabel>
              <DropdownMenuSeparator />

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <span>Payment Status</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {PAYMENT_STATUSES.map(({ value, label }) => {
                    // Flipping a refunded order back to "paid" would leave
                    // refundAmountCents > 0 while the order reads as paid,
                    // corrupting net-revenue math (revenue = total − refunds).
                    // Block that transition; use the Refund panel for money.
                    const blockedByRefund =
                      value === "paid" && (isRefunded || hasPriorRefund);
                    return (
                      <DropdownMenuItem
                        key={value}
                        disabled={
                          order.paymentStatus === value || blockedByRefund
                        }
                        onSelect={() =>
                          updatePaymentStatus.mutate({
                            orderId: order.id,
                            paymentStatus: value,
                          })
                        }
                      >
                        {label}
                        {order.paymentStatus === value && (
                          <span className="text-muted-foreground ml-auto text-xs">
                            current
                          </span>
                        )}
                        {blockedByRefund && order.paymentStatus !== value && (
                          <span className="text-muted-foreground ml-auto text-xs">
                            refunded
                          </span>
                        )}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <span>Fulfillment Status</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {FULFILLMENT_STATUSES.map(({ value, label }) => (
                    <DropdownMenuItem
                      key={value}
                      disabled={order.fulfillmentStatus === value}
                      onSelect={() =>
                        updateFulfillmentStatus.mutate({
                          orderId: order.id,
                          fulfillmentStatus: value,
                        })
                      }
                    >
                      {label}
                      {order.fulfillmentStatus === value && (
                        <span className="text-muted-foreground ml-auto text-xs">
                          current
                        </span>
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </>
          )}

          {canCancel && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onSelect={(e) => {
                  e.preventDefault();
                  queueMicrotask(() => setShowCancelDialog(true));
                }}
              >
                <Ban className="mr-2 h-4 w-4" />
                Cancel Order
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel Order #{order.orderNumber}</DialogTitle>
            <DialogDescription>
              Choose what happens when this order is cancelled.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {canRestock && (
              <div className="flex items-center gap-3">
                <Checkbox
                  id="cancel-restock-items"
                  checked={restockItems}
                  onCheckedChange={(v) => setRestockItems(!!v)}
                />
                <Label
                  htmlFor="cancel-restock-items"
                  className="cursor-pointer font-normal"
                >
                  Return items to inventory
                </Label>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Checkbox
                id="cancel-send-email"
                checked={sendEmail}
                onCheckedChange={(v) => setSendEmail(!!v)}
              />
              <Label
                htmlFor="cancel-send-email"
                className="cursor-pointer font-normal"
              >
                Notify customer by email
              </Label>
            </div>

            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This will mark the order as cancelled. This action cannot be
                undone.
                {isPaid &&
                  " Cancelling does not refund the customer — issue a refund separately if payment was taken."}
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCancelDialog(false)}
              disabled={cancelOrder.isPending}
            >
              Go back
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmCancel}
              disabled={cancelOrder.isPending}
            >
              {cancelOrder.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cancelling...
                </>
              ) : (
                "Cancel Order"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
