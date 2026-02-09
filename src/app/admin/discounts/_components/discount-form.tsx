"use client";

import { Loader2, Save, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import { api } from "~/trpc/react";

type DiscountFormProps = {
  businessId: string;
};

export function DiscountForm({ businessId }: DiscountFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [code, setCode] = useState("");
  const [type, setType] = useState<"percentage" | "fixed">("percentage");
  const [value, setValue] = useState("");
  const [active, setActive] = useState(true);
  const [usageLimit, setUsageLimit] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  const createDiscountMutation = api.discount.create.useMutation({
    onSuccess: () => {
      router.push("/admin/discounts");
      router.refresh();
    },
    onError: (error) => {
      setError(error.message ?? "Failed to create discount");
    },
    onSettled: () => {
      setIsSubmitting(false);
      router.refresh();
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    // try {
    // Validation
    if (!code.trim()) {
      throw new Error("Discount code is required");
    }

    if (!value || parseFloat(value) <= 0) {
      throw new Error("Valid discount value is required");
    }

    if (type === "percentage" && parseFloat(value) > 100) {
      throw new Error("Percentage discount cannot exceed 100%");
    }

    // Convert value based on type
    let discountValue: number;
    if (type === "percentage") {
      discountValue = parseFloat(value);
    } else {
      // Convert dollars to cents
      discountValue = Math.round(parseFloat(value) * 100);
    }

    createDiscountMutation.mutate({
      businessId,
      code: code.toUpperCase().trim(),
      type,
      value: discountValue,
      active,
      usageLimit: usageLimit ? parseInt(usageLimit) : undefined,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
    });
    //   const response = await fetch("/api/discounts/create", {
    //     method: "POST",
    //     headers: { "Content-Type": "application/json" },
    //     body: JSON.stringify({
    //       businessId,
    //       code: code.toUpperCase().trim(),
    //       type,
    //       value: discountValue,
    //       active,
    //       usageLimit: usageLimit ? parseInt(usageLimit) : null,
    //       expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
    //     }),
    //   });

    //   if (!response.ok) {
    //     const data = await response.json();
    //     throw new Error(data.error || "Failed to create discount");
    //   }

    //   router.push("/admin/discounts");
    //   router.refresh();
    // } catch (err: any) {
    //   setError(err.message);
    // } finally {
    //   setIsSubmitting(false);
    // }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Code */}
      <Card>
        <CardHeader>
          <CardTitle>Discount Code</CardTitle>
          <CardDescription>
            The code customers will enter at checkout
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="code">Code *</Label>
            <Input
              id="code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="SUMMER20"
              required
              autoFocus
            />
            <p className="mt-1 text-sm text-gray-500">
              Use uppercase letters and numbers (e.g., SAVE20, WINTER2024)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Discount Value */}
      <Card>
        <CardHeader>
          <CardTitle>Discount Amount</CardTitle>
          <CardDescription>
            Choose between percentage or fixed amount
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Type</Label>
            <div className="mt-2 flex gap-4">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="type"
                  value="percentage"
                  checked={type === "percentage"}
                  onChange={(e) => setType("percentage")}
                  className="h-4 w-4"
                />
                <span>Percentage (%)</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="type"
                  value="fixed"
                  checked={type === "fixed"}
                  onChange={(e) => setType("fixed")}
                  className="h-4 w-4"
                />
                <span>Fixed Amount ($)</span>
              </label>
            </div>
          </div>

          <div>
            <Label htmlFor="value">
              {type === "percentage" ? "Percentage" : "Amount (USD)"} *
            </Label>
            <div className="relative">
              {type === "fixed" && (
                <span className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-500">
                  $
                </span>
              )}
              <Input
                id="value"
                type="number"
                step={type === "percentage" ? "1" : "0.01"}
                min="0"
                max={type === "percentage" ? "100" : undefined}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={type === "percentage" ? "20" : "10.00"}
                className={type === "fixed" ? "pl-7" : ""}
                required
              />
              {type === "percentage" && (
                <span className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-500">
                  %
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage & Expiry */}
      <Card>
        <CardHeader>
          <CardTitle>Restrictions</CardTitle>
          <CardDescription>
            Set limits on how the discount can be used
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="usageLimit">Usage Limit</Label>
            <Input
              id="usageLimit"
              type="number"
              min="1"
              value={usageLimit}
              onChange={(e) => setUsageLimit(e.target.value)}
              placeholder="Unlimited"
            />
            <p className="mt-1 text-sm text-gray-500">
              Leave blank for unlimited uses
            </p>
          </div>

          <div>
            <Label htmlFor="expiresAt">Expiration Date</Label>
            <Input
              id="expiresAt"
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
            <p className="mt-1 text-sm text-gray-500">
              Leave blank for no expiration
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Active Status */}
      <Card>
        <CardHeader>
          <CardTitle>Status</CardTitle>
          <CardDescription>
            Control whether this discount is currently active
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="active">Active</Label>
              <p className="text-sm text-gray-500">
                Customers can use this discount code
              </p>
            </div>
            <Switch id="active" checked={active} onCheckedChange={setActive} />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Create Discount
            </>
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          <X className="mr-2 h-4 w-4" />
          Cancel
        </Button>
      </div>
    </form>
  );
}
