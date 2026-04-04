"use client";

import type { Order } from "generated/prisma";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

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

const formatPrice = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100,
  );

const REFUND_REASONS = [
  { value: "requested_by_customer", label: "Customer requested refund" },
  { value: "duplicate", label: "Duplicate order" },
  { value: "fraudulent", label: "Fraudulent order" },
];

// ─── Stripe refund dialog ────────────────────────────────────────────────────

function StripeRefundDialog({ order }: { order: Order }) {
  const router = useRouter();
  const utils = api.useUtils();
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refundType, setRefundType] = useState<"full" | "partial">("full");
  const [partialAmount, setPartialAmount] = useState("");
  const [reason, setReason] = useState("");

  const refundMutation = api.order.refund.useMutation({
    onSuccess: () => {
      toast.dismiss();
      setIsOpen(false);
      toast.success("Refund processed successfully");
      void utils.order.invalidate();
      router.refresh();
    },
    onError: (err) => {
      toast.dismiss();
      const msg = err.message ?? "Failed to process refund";
      toast.error(msg);
      setError(msg);
    },
    onMutate: () => {
      setError(null);
      toast.loading("Processing refund...");
    },
  });

  const handleRefund = () => {
    let amountToRefund = order.total;

    if (refundType === "partial") {
      if (!partialAmount || parseFloat(partialAmount) <= 0) {
        setError("Please enter a valid refund amount");
        return;
      }
      amountToRefund = Math.round(parseFloat(partialAmount) * 100);
      if (amountToRefund > order.total) {
        setError("Refund amount cannot exceed order total");
        return;
      }
    }

    refundMutation.mutate({
      orderId: order.id,
      amount: amountToRefund,
      reason: reason || undefined,
    });
  };

  const isProcessing = refundMutation.isPending;

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
            <Label>Reason (Optional)</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="w-full bg-white">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {REFUND_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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

// ─── Manual mark-as-refunded dialog ─────────────────────────────────────────

function ManualRefundDialog({ order }: { order: Order }) {
  const router = useRouter();
  const utils = api.useUtils();
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState("");

  const markRefundedMutation = api.order.markAsRefunded.useMutation({
    onSuccess: () => {
      toast.dismiss();
      setIsOpen(false);
      toast.success("Order marked as refunded");
      void utils.order.invalidate();
      router.refresh();
    },
    onError: (err) => {
      toast.dismiss();
      toast.error(err.message ?? "Failed to mark order as refunded");
    },
    onMutate: () => {
      toast.loading("Updating order...");
    },
  });

  const isProcessing = markRefundedMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          Mark as Refunded
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mark as Refunded</DialogTitle>
          <DialogDescription>
            Record that this order has been refunded outside of Stripe.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-md border px-4 py-3 text-sm">
            <span className="text-gray-500">Order total: </span>
            <span className="font-medium">{formatPrice(order.total)}</span>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label>Reason (Optional)</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="w-full bg-white">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {REFUND_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This only updates the order status — no money movement occurs.
              Make sure any payment has already been returned to the customer
              through your payment method.
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
            onClick={() =>
              markRefundedMutation.mutate({
                orderId: order.id,
                reason: reason || undefined,
              })
            }
            disabled={isProcessing}
            variant="destructive"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Mark as Refunded
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Public export ────────────────────────────────────────────────────────────

export function RefundHandler({ order }: Props) {
  const canStripeRefund =
    (order.status === "paid" || order.status === "fulfilled") &&
    !!order.stripePaymentIntentId;

  const canManualRefund =
    (order.status === "paid" ||
      order.status === "fulfilled" ||
      order.paymentStatus === "paid") &&
    !order.stripePaymentIntentId &&
    order.status !== "refunded";

  if (canStripeRefund) return <StripeRefundDialog order={order} />;
  if (canManualRefund) return <ManualRefundDialog order={order} />;
  return null;
}
