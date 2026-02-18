"use client";

import type { Order } from "generated/prisma";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";

import { api } from "~/trpc/react";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
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

export function RefundHandler({ order }: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refundType, setRefundType] = useState<"full" | "partial">("full");
  const [partialAmount, setPartialAmount] = useState("");
  const [reason, setReason] = useState("");

  const canRefund =
    (order.status === "paid" || order.status === "fulfilled") &&
    !!order.stripePaymentIntentId;

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  const refundMutation = api.order.refund.useMutation({
    onSuccess: () => {
      setIsOpen(false);
    },
    onError: (error) => {
      setError(error.message ?? "Failed to process refund");
    },
    onSettled: () => {
      setIsProcessing(false);
      router.refresh();
    },
  });

  const handleRefund = async () => {
    setError(null);
    setIsProcessing(true);

    let amountToRefund = order.total;

    if (refundType === "partial") {
      if (!partialAmount || parseFloat(partialAmount) <= 0) {
        throw new Error("Please enter a valid refund amount");
      }
      amountToRefund = Math.round(parseFloat(partialAmount) * 100);

      if (amountToRefund > order.total) {
        throw new Error("Refund amount cannot exceed order total");
      }
    }

    refundMutation.mutate({
      orderId: order.id,
      amount: amountToRefund,
      reason: reason || undefined,
    });
  };

  if (!canRefund) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          Issue Refund
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Issue Refund</DialogTitle>
          <DialogDescription>
            Process a refund for this order via Stripe
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {/* Refund Type */}
          <div>
            <Label>Refund Type</Label>
            <div className="mt-2 flex gap-4">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="refundType"
                  value="full"
                  checked={refundType === "full"}
                  onChange={() => setRefundType("full")}
                  className="h-4 w-4"
                />
                <span>Full Refund ({formatPrice(order.total)})</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="refundType"
                  value="partial"
                  checked={refundType === "partial"}
                  onChange={() => setRefundType("partial")}
                  className="h-4 w-4"
                  disabled
                />
                <span>Partial Refund</span>
              </label>
            </div>
          </div>
          {/* Partial Amount */}
          {refundType === "partial" && (
            <div>
              <Label htmlFor="partialAmount">Refund Amount (USD)</Label>
              <div className="relative">
                <span className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-500">
                  $
                </span>
                <Input
                  id="partialAmount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={(order.total / 100).toFixed(2)}
                  value={partialAmount}
                  onChange={(e) => setPartialAmount(e.target.value)}
                  placeholder="0.00"
                  className="pl-7"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Maximum: {formatPrice(order.total)}
              </p>
            </div>
          )}

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason (Optional)</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="w-full bg-white">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="requested_by_customer">
                  Customer requested refund
                </SelectItem>
                <SelectItem value="duplicate">Duplicate order</SelectItem>
                <SelectItem value="fraudulent">Fraudulent order</SelectItem>
              </SelectContent>
            </Select>
            {/* <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Customer requested refund..."
              rows={3}
            /> */}
          </div>
          {/* Warning */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This will process a refund through Stripe. This action cannot be
              undone. Also, this will not update inventory. Be sure to update
              inventory manually.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleRefund}
            disabled={isProcessing}
            variant="destructive"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Issue Refund
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
