"use client";

import type { Order } from "generated/prisma";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { api } from "~/trpc/react";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
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
  const [amountError, setAmountError] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [restockItems, setRestockItems] = useState(false);
  const [sendEmail, setSendEmail] = useState(true);
  // Remaining refundable = order total minus what has already been refunded.
  // On a partially-refunded order the remainder is the true ceiling — defaulting
  // to order.total would over-request and the server (which caps at the
  // remaining refundable) would reject it.
  const alreadyRefunded = order.refundAmountCents ?? 0;
  const remainingRefundable = order.total - alreadyRefunded;

  const [amountDollars, setAmountDollars] = useState(
    (remainingRefundable / 100).toFixed(2),
  );

  const maxDollars = remainingRefundable / 100;
  const amountCents = Math.round(parseFloat(amountDollars) * 100);
  const isValidAmount =
    !isNaN(amountCents) &&
    amountCents > 0 &&
    amountCents <= remainingRefundable;
  const isPartial = isValidAmount && amountCents < remainingRefundable;

  const validateAmount = (value: string): string | null => {
    if (!value.trim()) return "Amount is required";
    const cents = Math.round(parseFloat(value) * 100);
    if (isNaN(cents) || cents <= 0 || cents > remainingRefundable) {
      return `Amount must be between $0.01 and ${formatPrice(remainingRefundable)}`;
    }
    return null;
  };

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
    const validationError = validateAmount(amountDollars);
    if (validationError) {
      setAmountError(validationError);
      return;
    }
    setAmountError(null);
    refundMutation.mutate({
      orderId: order.id,
      amount: amountCents,
      reason: reason || undefined,
      restockItems,
      sendEmail,
    });
  };

  const isProcessing = refundMutation.isPending;

  const handleOpenChange = (nextOpen: boolean) => {
    setIsOpen(nextOpen);
    if (!nextOpen) {
      setError(null);
      setAmountError(null);
      setAmountDollars((remainingRefundable / 100).toFixed(2));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
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

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="refund-amount">
              Refund amount{" "}
              <span className="text-muted-foreground text-xs font-normal">
                (max {formatPrice(remainingRefundable)})
              </span>
            </Label>
            <div className="relative">
              <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2 text-sm">
                $
              </span>
              <Input
                id="refund-amount"
                type="number"
                min="0.01"
                max={maxDollars}
                step="0.01"
                className="pl-7"
                value={amountDollars}
                onChange={(e) => {
                  setAmountDollars(e.target.value);
                  setAmountError(validateAmount(e.target.value));
                }}
                onBlur={(e) => setAmountError(validateAmount(e.target.value))}
                aria-invalid={!!amountError}
              />
            </div>
            {isPartial && !amountError && (
              <p className="text-muted-foreground text-xs">
                Partial refund — customer keeps the difference
              </p>
            )}
            {amountError && (
              <p className="text-destructive text-sm" role="alert">
                {amountError}
              </p>
            )}
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label>Reason (Optional)</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="bg-card w-full">
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

          {/* Options */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Checkbox
                id="restock-items"
                checked={restockItems}
                onCheckedChange={(v) => setRestockItems(!!v)}
              />
              <Label
                htmlFor="restock-items"
                className="cursor-pointer font-normal"
              >
                Return items to inventory
              </Label>
            </div>
            <div className="flex items-center gap-3">
              <Checkbox
                id="send-refund-email"
                checked={sendEmail}
                onCheckedChange={(v) => setSendEmail(!!v)}
              />
              <Label
                htmlFor="send-refund-email"
                className="cursor-pointer font-normal"
              >
                Notify customer by email
              </Label>
            </div>
          </div>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This will process a refund through Stripe. This action cannot be
              undone.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleRefund}
            disabled={isProcessing || !isValidAmount}
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
                {isPartial
                  ? `Refund ${formatPrice(amountCents)}`
                  : "Issue Full Refund"}
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
  const [restockItems, setRestockItems] = useState(false);
  const [sendEmail, setSendEmail] = useState(true);

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
            <span className="text-muted-foreground">Order total: </span>
            <span className="font-medium">{formatPrice(order.total)}</span>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label>Reason (Optional)</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="bg-card w-full">
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

          {/* Options */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Checkbox
                id="manual-restock-items"
                checked={restockItems}
                onCheckedChange={(v) => setRestockItems(!!v)}
              />
              <Label
                htmlFor="manual-restock-items"
                className="cursor-pointer font-normal"
              >
                Return items to inventory
              </Label>
            </div>
            <div className="flex items-center gap-3">
              <Checkbox
                id="manual-send-email"
                checked={sendEmail}
                onCheckedChange={(v) => setSendEmail(!!v)}
              />
              <Label
                htmlFor="manual-send-email"
                className="cursor-pointer font-normal"
              >
                Notify customer by email
              </Label>
            </div>
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
                restockItems,
                sendEmail,
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
  // Gate on paymentStatus "paid" — that's the only state where refundable
  // money is held. This includes partially-refunded orders (they stay
  // "paid"; the server supports refunding the remainder) and excludes
  // fully-refunded/disputed/unpaid orders. Deliberately does NOT exclude
  // cancelled orders — a paid-then-cancelled order must remain refundable,
  // and the server mutations allow it.
  const canStripeRefund =
    order.paymentStatus === "paid" && !!order.stripePaymentIntentId;

  const canManualRefund =
    order.paymentStatus === "paid" && !order.stripePaymentIntentId;

  if (canStripeRefund) return <StripeRefundDialog order={order} />;
  if (canManualRefund) return <ManualRefundDialog order={order} />;
  return null;
}
