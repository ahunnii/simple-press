"use client";

import { Check, Loader2, Tag, X } from "lucide-react";
import { useState } from "react";
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

export function DiscountInput({
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

  const handleApply = async () => {
    if (!code.trim()) {
      setError("Please enter a discount code");
      return;
    }

    setError(null);
    setIsValidating(true);

    try {
      const response = await fetch("/api/discounts/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          businessId,
          cartTotal,
        }),
      });

      const data = await response.json();

      if (!data.valid) {
        setError(data.error || "Invalid discount code");
        return;
      }

      // Apply discount
      const discount = {
        id: data.discount.id,
        code: data.discount.code,
        discountAmount: data.discount.discountAmount,
      };

      setAppliedDiscount(discount);
      onDiscountApplied(discount);
      setCode("");
    } catch (err: any) {
      setError("Failed to validate discount code");
    } finally {
      setIsValidating(false);
    }
  };

  const handleRemove = () => {
    setAppliedDiscount(null);
    onDiscountApplied(null);
    setError(null);
  };

  if (appliedDiscount) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
              <Check className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-green-900">
                Discount Applied: {appliedDiscount.code}
              </p>
              <p className="text-sm text-green-700">
                You saved {formatPrice(appliedDiscount.discountAmount)}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            className="text-green-700 hover:text-green-900"
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
          <Tag className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
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
                handleApply();
              }
            }}
            className="pl-10"
          />
        </div>
        <Button
          onClick={handleApply}
          disabled={isValidating || !code.trim()}
          variant="outline"
        >
          {isValidating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Apply"
          )}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription className="text-sm">{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
