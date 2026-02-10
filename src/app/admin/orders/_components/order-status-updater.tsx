"use client";

import type { Order } from "generated/prisma";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

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
  const [status, setStatus] = useState(order.status);
  const [isUpdating, setIsUpdating] = useState(false);

  const updateStatusMutation = api.order.updateStatus.useMutation({
    onSuccess: () => {
      router.refresh();
    },
    onError: (error) => {
      console.error("Update status error:", error);
      alert("Failed to update order status");
      setStatus(order.status);
    },
    onSettled: () => {
      setIsUpdating(false);
      router.refresh();
    },
  });

  const handleUpdate = async () => {
    if (status === order.status) return;

    setIsUpdating(true);

    updateStatusMutation.mutate({
      orderId: order.id,
      status,
    });
  };

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
