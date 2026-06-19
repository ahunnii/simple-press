"use client";

import type { Order } from "generated/prisma";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
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

type Props = {
  order: Pick<Order, "id" | "paymentStatus" | "fulfillmentStatus" | "status">;
};

const PAYMENT_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
  { value: "failed", label: "Failed" },
  { value: "refunded", label: "Refunded" },
] as const;

const FULFILLMENT_STATUSES = [
  { value: "unfulfilled", label: "Unfulfilled" },
  { value: "partially_fulfilled", label: "Partially Fulfilled" },
  { value: "fulfilled", label: "Fulfilled" },
] as const;

export function OrderStatusOverride({ order }: Props) {
  const router = useRouter();
  const utils = api.useUtils();

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

  const isPending =
    updatePaymentStatus.isPending || updateFulfillmentStatus.isPending;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isPending}>
          <MoreHorizontal className="h-4 w-4" />
          <span className="ml-2 hidden sm:inline">More options</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
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
