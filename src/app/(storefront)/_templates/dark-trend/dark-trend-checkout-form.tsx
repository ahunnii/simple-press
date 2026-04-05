"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CreditCard, Loader2 } from "lucide-react";

import type { DefaultCheckoutPageTemplateProps } from "../types";
import { formatPrice } from "~/lib/prices";
import {
  calculateShipping,
  shippingConfigFromBusiness,
} from "~/lib/shipping-utils";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { PhoneInput } from "~/components/inputs/phone-form-field";
import { useCart } from "~/providers/cart-context";

import { DarkTrendDiscountInput } from "./dark-trend-discount-input";

type Props = {
  business: DefaultCheckoutPageTemplateProps["business"];
};

export function DarkTrendCheckoutForm({ business }: Props) {
  const { items, removeItem, total } = useCart();
  const shippingConfig = shippingConfigFromBusiness(business);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState<"US" | "CA">("US");

  const [deliveryMethod, setDeliveryMethod] = useState<"ship" | "pickup">(
    "ship",
  );

  const [appliedDiscount, setAppliedDiscount] = useState<{
    id: string;
    code: string;
    discountAmount: number;
  } | null>(null);

  const subtotal = total;
  const discountAmount = appliedDiscount?.discountAmount ?? 0;
  const shipping =
    deliveryMethod === "pickup"
      ? 0
      : calculateShipping(subtotal, shippingConfig);
  const finalTotal = subtotal - discountAmount + shipping;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsProcessing(true);

    try {
      if (!email || !name || !phone.trim()) {
        throw new Error("Please fill in all required contact fields");
      }

      if (
        deliveryMethod === "ship" &&
        (!addressLine1.trim() ||
          !city.trim() ||
          !state.trim() ||
          !postalCode.trim())
      ) {
        throw new Error("Please fill in all required shipping fields");
      }

      if (items.length === 0) {
        throw new Error("Your cart is empty");
      }

      const response = await fetch("/api/stripe/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          deliveryMethod,
          customerInfo: {
            email,
            name,
            phone: phone.trim(),
            shippingAddress:
              deliveryMethod === "ship"
                ? {
                    line1: addressLine1.trim(),
                    line2: addressLine2.trim() || null,
                    city: city.trim(),
                    state: state.trim(),
                    postalCode: postalCode.trim(),
                    country,
                    phone: phone.trim(),
                  }
                : null,
          },
          discountCodeId: appliedDiscount?.id ?? null,
          discountAmount: appliedDiscount?.discountAmount ?? 0,
        }),
      });

      const data = (await response.json()) as {
        error?: string;
        unavailableItems?: string[];
        unavailableItemIds?: { productId: string; variantId: string | null }[];
        sessionUrl?: string;
      };

      if (!response.ok) {
        if (data.unavailableItemIds && data.unavailableItemIds.length > 0) {
          for (const row of data.unavailableItemIds) {
            removeItem(row.productId, row.variantId);
          }
        }
        if (data.unavailableItems && data.unavailableItems.length > 0) {
          const removedMsg =
            data.unavailableItemIds && data.unavailableItemIds.length > 0
              ? `The following items were out of stock or no longer available and have been removed from your cart: ${data.unavailableItems.join(", ")}.`
              : `${data.error ?? "Some items are unavailable."} Remove or update: ${data.unavailableItems.join(", ")}`;
          setError(removedMsg);
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
        <Button
          asChild
          className="bg-violet-500 text-white hover:bg-violet-600"
        >
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
              <div>
                <Label htmlFor="phone" className="text-white">
                  Phone *
                </Label>
                <PhoneInput
                  id="phone"
                  autoComplete="tel"
                  value={phone}
                  onChange={(val) => setPhone(val)}
                  placeholder="+1 555 123 4567"
                  className="border-white/20 bg-zinc-900/50 text-white placeholder:text-white/40"
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Delivery Method */}
          {shippingConfig.offersInStorePickup && (
            <Card className="border-white/20 bg-zinc-900/30">
              <CardHeader>
                <CardTitle className="text-white">Delivery</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    onClick={() => setDeliveryMethod("ship")}
                    className={
                      deliveryMethod === "ship"
                        ? "bg-violet-500 text-white hover:bg-violet-600"
                        : "border border-white/20 bg-transparent text-white hover:bg-white/10"
                    }
                  >
                    Ship to address
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setDeliveryMethod("pickup")}
                    className={
                      deliveryMethod === "pickup"
                        ? "bg-violet-500 text-white hover:bg-violet-600"
                        : "border border-white/20 bg-transparent text-white hover:bg-white/10"
                    }
                  >
                    In-store pickup
                  </Button>
                </div>
                <p className="text-sm text-white/70">
                  {deliveryMethod === "pickup"
                    ? "No shipping charge. You'll pick up your order at the store."
                    : "Shipping cost is based on your store's shipping settings."}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Shipping Address */}
          {deliveryMethod === "ship" && (
            <Card className="border-white/20 bg-zinc-900/30">
              <CardHeader>
                <CardTitle className="text-white">Shipping Address</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-white/70">
                  This is sent to Stripe Checkout prefilled so you can confirm
                  or edit your name, phone, and address before paying.
                </p>
                <div>
                  <Label htmlFor="address-line1" className="text-white">
                    Address line 1 *
                  </Label>
                  <Input
                    id="address-line1"
                    type="text"
                    autoComplete="shipping address-line1"
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                    placeholder="Street address, P.O. box"
                    className="border-white/20 bg-zinc-900/50 text-white placeholder:text-white/40"
                    required={deliveryMethod === "ship"}
                  />
                </div>
                <div>
                  <Label htmlFor="address-line2" className="text-white">
                    Address line 2
                  </Label>
                  <Input
                    id="address-line2"
                    type="text"
                    autoComplete="shipping address-line2"
                    value={addressLine2}
                    onChange={(e) => setAddressLine2(e.target.value)}
                    placeholder="Apartment, suite, etc."
                    className="border-white/20 bg-zinc-900/50 text-white placeholder:text-white/40"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="city" className="text-white">
                      City *
                    </Label>
                    <Input
                      id="city"
                      type="text"
                      autoComplete="shipping address-level2"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="border-white/20 bg-zinc-900/50 text-white placeholder:text-white/40"
                      required={deliveryMethod === "ship"}
                    />
                  </div>
                  <div>
                    <Label htmlFor="state" className="text-white">
                      State / Province *
                    </Label>
                    <Input
                      id="state"
                      type="text"
                      autoComplete="shipping address-level1"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      placeholder="e.g. CA or ON"
                      className="border-white/20 bg-zinc-900/50 text-white placeholder:text-white/40"
                      required={deliveryMethod === "ship"}
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="postal" className="text-white">
                      ZIP / Postal code *
                    </Label>
                    <Input
                      id="postal"
                      type="text"
                      autoComplete="shipping postal-code"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      className="border-white/20 bg-zinc-900/50 text-white placeholder:text-white/40"
                      required={deliveryMethod === "ship"}
                    />
                  </div>
                  <div>
                    <Label htmlFor="country" className="text-white">
                      Country *
                    </Label>
                    <Select
                      value={country}
                      onValueChange={(v) => setCountry(v as "US" | "CA")}
                    >
                      <SelectTrigger
                        id="country"
                        className="w-full border-white/20 bg-zinc-900/50 text-white"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="US">United States</SelectItem>
                        <SelectItem value="CA">Canada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
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
                  <span className="text-white">
                    {deliveryMethod === "pickup"
                      ? "In-store pickup (free)"
                      : shipping === 0
                        ? "Free"
                        : formatPrice(shipping)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-white/20 pt-2 font-bold text-white">
                  <span>Estimated total</span>
                  <span>{formatPrice(finalTotal)}</span>
                </div>
                <p className="text-xs text-white/60">
                  Tax and final total are confirmed on Stripe Checkout.
                </p>
              </div>

              {error && (
                <Alert
                  variant="destructive"
                  className="border-red-500/50 bg-red-500/10"
                >
                  <AlertDescription className="text-red-400">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                disabled={isProcessing}
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

              <p className="text-center text-xs text-white/60">
                All transactions are secure and encrypted via Stripe. 100%
                Secure and Encrypted Payments.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
