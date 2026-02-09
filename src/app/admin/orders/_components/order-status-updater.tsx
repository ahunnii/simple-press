"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

type Order = {
  id: string;
  status: string;
};

type OrderStatusUpdaterProps = {
  order: Order;
};

export function OrderStatusUpdater({ order }: OrderStatusUpdaterProps) {
  const router = useRouter();
  const [status, setStatus] = useState(order.status);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdate = async () => {
    if (status === order.status) return;

    setIsUpdating(true);

    try {
      const response = await fetch(`/api/orders/${order.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error("Failed to update status");
      }

      router.refresh();
    } catch (error) {
      console.error("Update status error:", error);
      alert("Failed to update order status");
      setStatus(order.status); // Reset
    } finally {
      setIsUpdating(false);
    }
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
