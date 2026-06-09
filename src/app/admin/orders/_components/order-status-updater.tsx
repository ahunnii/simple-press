"use client";

import type { Order } from "generated/prisma";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Label } from "~/components/ui/label";
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
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [restockItems, setRestockItems] = useState(false);
  const [sendEmail, setSendEmail] = useState(false);

  const hadInventoryDeducted =
    order.status === "open" || order.status === "completed";

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

  const handleUpdate = () => {
    if (status === order.status) return;

    if (status === "cancelled") {
      setShowCancelDialog(true);
      return;
    }

    updateStatusMutation.mutate({ orderId: order.id, status });
  };

  const handleConfirmCancel = () => {
    setShowCancelDialog(false);
    updateStatusMutation.mutate({
      orderId: order.id,
      status: "cancelled",
      restockItems,
      sendEmail,
    });
  };

  const isUpdating = updateStatusMutation.isPending;

  return (
    <>
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
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
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

      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel Order #{order.orderNumber}</DialogTitle>
            <DialogDescription>
              Choose what happens when this order is cancelled.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {hadInventoryDeducted && (
              <div className="flex items-center gap-3">
                <Checkbox
                  id="cancel-restock"
                  checked={restockItems}
                  onCheckedChange={(v) => setRestockItems(!!v)}
                />
                <Label
                  htmlFor="cancel-restock"
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
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCancelDialog(false);
                setStatus(order.status);
              }}
            >
              Go back
            </Button>
            <Button variant="destructive" onClick={handleConfirmCancel}>
              Cancel Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
