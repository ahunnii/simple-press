"use client";

import { useState } from "react";
import { Check, Loader2, Tag, X } from "lucide-react";

import { api } from "~/trpc/react";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

type Props = {
  businessId: string;
  cartTotal: number;
  onDiscountApplied: (
    discount: {
      id: string;
      code: string;
      discountAmount: number;
    } | null,
  ) => void;
};

export function DarkTrendDiscountInput({
  cartTotal,
  onDiscountApplied,
}: Props) {
  const [code, setCode] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appliedDiscount, setAppliedDiscount] = useState<{
    id: string;
    code: string;
    discountAmount: number;
  } | null>(null);

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  const validateDiscountMutation = api.discount.validate.useMutation({
    onSuccess: ({ discount }) => {
      setAppliedDiscount(discount);
      onDiscountApplied(discount);
    },
    onError: (error) => {
      setError(error.message ?? "Failed to validate discount code");
    },
    onSettled: () => {
      setIsValidating(false);
    },
  });

  const handleApply = async () => {
    if (!code.trim()) {
      setError("Please enter a discount code");
      return;
    }

    setError(null);
    setIsValidating(true);
    validateDiscountMutation.mutate({
      code: code.trim().toUpperCase(),

      cartTotal,
    });
  };

  const handleRemove = () => {
    setAppliedDiscount(null);
    onDiscountApplied(null);
    setError(null);
  };

  // S-9: role="status" on the applied-discount panel so it's announced
  if (appliedDiscount) {
    return (
      <div
        role="status"
        className="rounded-md border border-green-500/50 bg-green-500/10 p-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/20">
              {/* N-1 + S-9: decorative icon */}
              <Check aria-hidden="true" className="h-4 w-4 text-green-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-green-400">
                Discount Applied: {appliedDiscount.code}
              </p>
              <p className="text-sm text-green-500">
                You saved {formatPrice(appliedDiscount.discountAmount)}
              </p>
            </div>
          </div>
          {/* S-9: named remove button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            aria-label={`Remove discount ${appliedDiscount.code}`}
            className="text-green-400 hover:bg-green-500/10 hover:text-green-300"
          >
            {/* N-1 + S-9: decorative icon */}
            <X aria-hidden="true" className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          {/* N-1 + S-9: decorative icon */}
          <Tag aria-hidden="true" className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-white/40" />
          {/* S-9: aria-label on input */}
          <Input
            type="text"
            placeholder="Discount code"
            aria-label="Discount code"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                void handleApply();
              }
            }}
            className="border-white/20 bg-zinc-900/50 pl-10 text-white placeholder:text-white/40"
          />
        </div>
        {/* N-7: show "Applying…" text while validating */}
        <Button
          onClick={handleApply}
          disabled={isValidating || !code.trim()}
          aria-label="Apply discount code"
          className="border border-white/60 bg-transparent font-medium text-white hover:bg-white/10"
        >
          {isValidating ? (
            <>
              <Loader2 aria-hidden="true" className="mr-1 h-4 w-4 animate-spin" />
              Applying…
            </>
          ) : (
            "Apply"
          )}
        </Button>
      </div>

      {error && (
        <Alert
          variant="destructive"
          className="border-red-500/50 bg-red-500/10"
        >
          <AlertDescription className="text-sm text-red-400">
            {error}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
