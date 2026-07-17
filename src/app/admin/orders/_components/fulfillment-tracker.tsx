"use client";

import type { Order } from "generated/prisma";
import { useRouter } from "next/navigation";
import { Loader2, Package } from "lucide-react";
import { toast } from "sonner";

import { api } from "~/trpc/react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

type Props = {
  order: Order;
};

export function FulfillmentTracker({ order }: Props) {
  const router = useRouter();
  const utils = api.useUtils();

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

  const handleMarkFulfilled = () => {
    updateFulfillmentMutation.mutate({
      orderId: order.id,
      fulfillmentStatus: "fulfilled",
    });
  };

  const handleMarkUnfulfilled = () => {
    updateFulfillmentMutation.mutate({
      orderId: order.id,
      fulfillmentStatus: "unfulfilled",
    });
  };

  const isFulfilled = order.fulfillmentStatus === "fulfilled";
  const isPartiallyFulfilled =
    order.fulfillmentStatus === "partially_fulfilled";
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
          ) : isPartiallyFulfilled ? (
            <Badge
              variant="outline"
              className="gap-1 border-amber-300 bg-amber-50 text-amber-700"
            >
              <Package className="h-3 w-3" />
              Partially fulfilled
            </Badge>
          ) : (
            <Badge variant="secondary">Unfulfilled</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isFulfilled ? (
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
        ) : (
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
        )}
      </CardContent>
    </Card>
  );
}
