"use client";

import { Loader2, Package, Truck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

type Order = {
  id: string;
  fulfillmentStatus: string | null;
  trackingNumber: string | null;
};

type FulfillmentTrackerProps = {
  order: Order;
};

export function FulfillmentTracker({ order }: FulfillmentTrackerProps) {
  const router = useRouter();
  const [trackingNumber, setTrackingNumber] = useState(
    order.trackingNumber || "",
  );
  const [isUpdating, setIsUpdating] = useState(false);

  const handleMarkFulfilled = async () => {
    setIsUpdating(true);

    try {
      const response = await fetch(`/api/orders/${order.id}/fulfillment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fulfillmentStatus: "fulfilled",
          trackingNumber: trackingNumber || null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update fulfillment");
      }

      router.refresh();
    } catch (error) {
      console.error("Update fulfillment error:", error);
      alert("Failed to update fulfillment");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleMarkUnfulfilled = async () => {
    setIsUpdating(true);

    try {
      const response = await fetch(`/api/orders/${order.id}/fulfillment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fulfillmentStatus: "unfulfilled",
          trackingNumber: null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update fulfillment");
      }

      router.refresh();
    } catch (error) {
      console.error("Update fulfillment error:", error);
      alert("Failed to update fulfillment");
    } finally {
      setIsUpdating(false);
    }
  };

  const isFulfilled = order.fulfillmentStatus === "fulfilled";

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
                Tracking Number (Optional)
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
