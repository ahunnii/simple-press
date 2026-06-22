"use client";

import { useRouter } from "next/navigation";
import { MoreHorizontal, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
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

  const isPending =
    resendEmail.isPending ||
    updatePaymentStatus.isPending ||
    updateFulfillmentStatus.isPending;

  return (
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

        <DropdownMenuLabel>Override Status</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <span>Payment Status</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {PAYMENT_STATUSES.map(({ value, label }) => (
              <DropdownMenuItem
                key={value}
                disabled={order.paymentStatus === value}
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
              </DropdownMenuItem>
            ))}
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
