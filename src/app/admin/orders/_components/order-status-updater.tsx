"use client";

import type { Order } from "generated/prisma";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

type Props = {
  order: Order;
};

export function OrderStatusUpdater({ order }: Props) {
  const router = useRouter();
  const utils = api.useUtils();
  const [status, setStatus] = useState(order.status);

  const updateStatusMutation = api.order.updateStatus.useMutation({
    onSuccess: () => {
      toast.dismiss();
      toast.success("Order status updated successfully");
      void utils.order.invalidate();
      router.refresh();
    },
    onError: (error) => {
      toast.dismiss();
      toast.error(error.message ?? "Failed to update order status");
      setStatus(order.status);
    },
    onMutate: () => {
      toast.loading("Updating order status...");
    },
  });

  const handleUpdate = async () => {
    if (status === order.status) return;

    updateStatusMutation.mutate({
      orderId: order.id,
      status,
    });
  };

  const isUpdating = updateStatusMutation.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Order Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
          </SelectContent>
        </Select>

        {status !== order.status && (
          <Button
            onClick={handleUpdate}
            disabled={isUpdating}
            className="w-full"
            size="sm"
          >
            {isUpdating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              "Update Status"
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
