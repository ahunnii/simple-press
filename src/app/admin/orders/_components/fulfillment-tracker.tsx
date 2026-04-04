"use client";

import type { Order } from "generated/prisma";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Package, Truck } from "lucide-react";
import { toast } from "sonner";

import { api } from "~/trpc/react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

type Props = {
  order: Order;
};

export function FulfillmentTracker({ order }: Props) {
  const router = useRouter();
  const utils = api.useUtils();
  const [trackingNumber, setTrackingNumber] = useState(
    order.trackingNumber ?? "",
  );

  const updateFulfillmentMutation = api.order.updateFulfillment.useMutation({
    onSuccess: () => {
      toast.dismiss();
      toast.success("Fulfillment updated successfully");
      void utils.order.invalidate();
      router.refresh();
    },
    onError: (error) => {
      toast.dismiss();
      console.error("Update fulfillment error:", error);
      toast.error(error.message ?? "Failed to update fulfillment");
    },
    onMutate: () => {
      toast.loading("Updating fulfillment...");
    },
  });
  const handleMarkFulfilled = async () => {
    updateFulfillmentMutation.mutate({
      orderId: order.id,
      fulfillmentStatus: "fulfilled",
      trackingNumber: trackingNumber ?? null,
    });
  };

  const handleMarkUnfulfilled = async () => {
    updateFulfillmentMutation.mutate({
      orderId: order.id,
      fulfillmentStatus: "unfulfilled",
      trackingNumber: undefined,
    });
  };

  const isFulfilled = order.fulfillmentStatus === "fulfilled";
  const isUpdating = updateFulfillmentMutation.isPending;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Fulfillment</CardTitle>
          {isFulfilled ? (
            <Badge variant="default" className="gap-1">
              <Package className="h-3 w-3" />
              Fulfilled
            </Badge>
          ) : (
            <Badge variant="secondary">Unfulfilled</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isFulfilled ? (
          <>
            {order.trackingNumber && (
              <div>
                <Label className="text-xs text-gray-500">Tracking Number</Label>
                <div className="mt-1 flex items-center gap-2">
                  <Truck className="h-4 w-4 text-gray-400" />
                  <span className="font-mono text-sm">
                    {order.trackingNumber}
                  </span>
                </div>
              </div>
            )}
            <Button
              onClick={handleMarkUnfulfilled}
              disabled={isUpdating}
              variant="outline"
              size="sm"
              className="w-full"
            >
              {isUpdating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                "Mark as Unfulfilled"
              )}
            </Button>
          </>
        ) : (
          <>
            <div>
              <Label htmlFor="tracking" className="text-sm">
                Tracking Number
              </Label>
              <Input
                id="tracking"
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="1Z999AA10123456784"
                className="mt-1"
              />
            </div>
            <Button
              onClick={handleMarkFulfilled}
              disabled={isUpdating}
              size="sm"
              className="w-full"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Package className="mr-2 h-4 w-4" />
                  Mark as Fulfilled
                </>
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
