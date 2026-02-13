"use client";

import { useState } from "react";
import { Check, Loader2, Tag, X } from "lucide-react";

import { api } from "~/trpc/react";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

type DiscountInputProps = {
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
  businessId,
  cartTotal,
  onDiscountApplied,
}: DiscountInputProps) {
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
      businessId,
      cartTotal,
    });

    // try {
    //   const response = await fetch("/api/discounts/validate", {
    //     method: "POST",
    //     headers: { "Content-Type": "application/json" },
    //     body: JSON.stringify({
    //       code: code.trim().toUpperCase(),
    //       businessId,
    //       cartTotal,
    //     }),
    //   });

    //   const data = await response.json();

    //   if (!data.valid) {
    //     setError(data.error || "Invalid discount code");
    //     return;
    //   }

    //   // Apply discount
    //   const discount = {
    //     id: data.discount.id,
    //     code: data.discount.code,
    //     discountAmount: data.discount.discountAmount,
    //   };

    //   setAppliedDiscount(discount);
    //   onDiscountApplied(discount);
    //   setCode("");
    // } catch (err: any) {
    //   setError("Failed to validate discount code");
    // } finally {
    //   setIsValidating(false);
    // }
  };

  const handleRemove = () => {
    setAppliedDiscount(null);
    onDiscountApplied(null);
    setError(null);
  };

  if (appliedDiscount) {
    return (
      <div className="rounded-md border border-green-500/50 bg-green-500/10 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/20">
              <Check className="h-4 w-4 text-green-400" />
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
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            className="text-green-400 hover:bg-green-500/10 hover:text-green-300"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Tag className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-white/40" />
          <Input
            type="text"
            placeholder="Discount code"
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
        <Button
          onClick={handleApply}
          disabled={isValidating || !code.trim()}
          className="border border-white/60 bg-transparent font-medium text-white hover:bg-white/10"
        >
          {isValidating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Apply"
          )}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="border-red-500/50 bg-red-500/10">
          <AlertDescription className="text-sm text-red-400">{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
