// app/(storefront)/checkout/_components/checkout-form.tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CreditCard, Loader2 } from "lucide-react";

import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { useCart } from "~/providers/cart-context";

import { DarkTrendDiscountInput } from "./dark-trend-discount-input";

type Business = {
  id: string;
  stripeAccountId: string | null;
  siteContent: {
    primaryColor: string | null;
  } | null;
};

type CheckoutFormProps = {
  business: Business;
};

export function DarkTrendCheckoutForm({ business }: CheckoutFormProps) {
  const { items, total } = useCart();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  // Discount state
  const [appliedDiscount, setAppliedDiscount] = useState<{
    id: string;
    code: string;
    discountAmount: number;
  } | null>(null);

  const subtotal = total;
  const discountAmount = appliedDiscount?.discountAmount ?? 0;
  const finalTotal = subtotal - discountAmount;

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsProcessing(true);

    try {
      // Validation
      if (!email || !name) {
        throw new Error("Please fill in all required fields");
      }

      if (items.length === 0) {
        throw new Error("Your cart is empty");
      }

      const response = await fetch("/api/stripe/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // businessId: business.id, ← REMOVED!
          items,
          customerInfo: {
            email,
            name,
          },
          discountCodeId: appliedDiscount?.id ?? null,
          discountAmount: appliedDiscount?.discountAmount ?? 0,
        }),
      });

      const data = (await response.json()) as {
        error?: string;
        unavailableItems?: string[];
        sessionUrl?: string;
      };

      if (!response.ok) {
        if (data.unavailableItems && data.unavailableItems.length > 0) {
          setError(
            `${data.error ?? "Some items are unavailable."} Remove or update: ${data.unavailableItems.join(", ")}`,
          );
        } else {
          setError(data.error ?? "Failed to create checkout session");
        }
        setIsProcessing(false);
        return;
      }

      const sessionUrl = data.sessionUrl;
      if (!sessionUrl) {
        setError("Failed to create checkout session");
        setIsProcessing(false);
        return;
      }

      // Redirect to Stripe Checkout
      window.location.href = sessionUrl;
    } catch (err: unknown) {
      setError((err as Error).message ?? "Failed to create checkout session");
      setIsProcessing(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="mb-4 text-white/70">Your cart is empty</p>
        <Button asChild className="bg-violet-500 text-white hover:bg-violet-600">
          <Link href="/shop">Continue Shopping</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Customer Information */}
        <div className="space-y-6 lg:col-span-2">
          {/* Contact Info */}
          <Card className="border-white/20 bg-zinc-900/30">
            <CardHeader>
              <CardTitle className="text-white">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-white">
                  Email *
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="border-white/20 bg-zinc-900/50 text-white placeholder:text-white/40"
                  required
                />
              </div>

              <div>
                <Label htmlFor="name" className="text-white">
                  Full Name *
                </Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="border-white/20 bg-zinc-900/50 text-white placeholder:text-white/40"
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Note about shipping */}
          <Card className="border-white/20 bg-zinc-900/30">
            <CardHeader>
              <CardTitle className="text-white">Shipping Address</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-white/70">
                You&apos;ll enter your shipping address on the next page (Stripe
                Checkout)
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4 border-white/20 bg-zinc-900/30">
            <CardHeader>
              <CardTitle className="text-white">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Items */}
              <div className="max-h-64 space-y-3 overflow-y-auto">
                {items.map((item) => (
                  <div
                    key={`${item.productId}-${item.variantId}`}
                    className="flex gap-3"
                  >
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-sm bg-zinc-900">
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.productName}
                          width={64}
                          height={64}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-white/40">
                          No img
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">
                        {item.productName}
                      </p>
                      {item.variantName && (
                        <p className="text-xs text-white/60">
                          {item.variantName}
                        </p>
                      )}
                      <p className="text-xs text-white/60">
                        Qty: {item.quantity}
                      </p>
                    </div>
                    <p className="text-sm font-medium text-white">
                      {formatPrice(item.price * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Discount Code Input */}
              <div className="pt-4">
                <DarkTrendDiscountInput
                  businessId={business.id}
                  cartTotal={subtotal}
                  onDiscountApplied={setAppliedDiscount}
                />
              </div>

              <div className="space-y-2 border-t border-white/20 pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Subtotal</span>
                  <span className="text-white">{formatPrice(subtotal)}</span>
                </div>
                {appliedDiscount && (
                  <div className="flex justify-between text-sm text-green-400">
                    <span>Discount ({appliedDiscount.code})</span>
                    <span>-{formatPrice(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Shipping</span>
                  <span className="text-white">Calculated at checkout</span>
                </div>
                <div className="flex justify-between border-t border-white/20 pt-2 font-bold text-white">
                  <span>Total</span>
                  <span>{formatPrice(finalTotal)}</span>
                </div>
              </div>

              {error && (
                <Alert variant="destructive" className="border-red-500/50 bg-red-500/10">
                  <AlertDescription className="text-red-400">{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                disabled={isProcessing || !business.stripeAccountId}
                className="w-full bg-violet-500 py-6 text-base font-semibold text-white hover:bg-violet-600"
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-5 w-5" />
                    Continue to Payment
                  </>
                )}
              </Button>

              {!business.stripeAccountId && (
                <Alert className="border-amber-500/50 bg-amber-500/10">
                  <AlertDescription className="text-amber-400">
                    Payment processing is not yet configured for this store.
                  </AlertDescription>
                </Alert>
              )}

              <p className="text-center text-xs text-white/60">
                Secure checkout powered by Stripe
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
