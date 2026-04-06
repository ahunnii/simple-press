"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import type { DefaultCheckoutPageTemplateProps } from "../types";
import { formatPrice } from "~/lib/prices";
import {
  calculateShipping,
  shippingConfigFromBusiness,
} from "~/lib/shipping-utils";
import { api } from "~/trpc/react";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
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

type CheckoutFormProps = {
  business: DefaultCheckoutPageTemplateProps["business"];
};

export function CheckoutForm({ business }: CheckoutFormProps) {
  const { items, removeItem, subtotal } = useCart();
  const shippingConfig = shippingConfigFromBusiness(business);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [discountCodeInput, setDiscountCodeInput] = useState("");
  const [discountCodeId, setDiscountCodeId] = useState<string | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountCodeLabel, setDiscountCodeLabel] = useState<string | null>(
    null,
  );
  const [discountFieldError, setDiscountFieldError] = useState<string | null>(
    null,
  );

  const validateDiscountMutation = api.discount.validate.useMutation({
    onSuccess: (data) => {
      setDiscountCodeId(data.discount.id);
      setDiscountAmount(data.discount.discountAmount);
      setDiscountCodeLabel(data.discount.code);
      setDiscountFieldError(null);
    },
    onError: (err) => {
      setDiscountCodeId(null);
      setDiscountAmount(0);
      setDiscountCodeLabel(null);
      setDiscountFieldError(err.message ?? "Invalid code");
    },
  });

  // Cart changed — discount must be re-applied
  useEffect(() => {
    setDiscountCodeId(null);
    setDiscountAmount(0);
    setDiscountCodeLabel(null);
    setDiscountFieldError(null);
  }, [subtotal]);

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

  const primaryColor = business.siteContent?.primaryColor ?? "#3b82f6";

  const shipping =
    deliveryMethod === "pickup"
      ? 0
      : calculateShipping(subtotal, shippingConfig);
  const finalTotal = subtotal - discountAmount + shipping;

  const handleApplyDiscount = () => {
    const code = discountCodeInput.trim();
    if (!code) {
      setDiscountFieldError("Enter a discount code");
      return;
    }
    if (subtotal <= 0) {
      setDiscountFieldError("Your cart is empty");
      return;
    }
    setDiscountFieldError(null);
    validateDiscountMutation.mutate({ code, cartTotal: subtotal });
  };

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
          discountCodeId: discountCodeId,
          discountAmount: discountCodeId != null ? discountAmount : 0,
        }),
      });

      const data = (await response.json()) as {
        error?: string;
        unavailableItems?: string[];
        unavailableItemIds?: { productId: string; variantId: string | null }[];
        sessionUrl?: string;
        sessionId?: string;
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

      if (data.sessionId) {
        document.cookie = `pending_session=${data.sessionId}; path=/; SameSite=Strict; Secure; max-age=3600`;
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
        <p className="text-muted-foreground mb-4">Your cart is empty</p>
        <Button asChild>
          <Link href="/products">Continue Shopping</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8 lg:flex-row">
      <div className="flex-1 space-y-8">
        <fieldset className="flex flex-col gap-4">
          <legend className="text-foreground font-heading pb-4 text-lg font-semibold">
            Contact Information
          </legend>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone">Phone *</Label>
              <PhoneInput
                id="phone"
                autoComplete="tel"
                value={phone}
                onChange={(val) => setPhone(val)}
                placeholder="+1 555 123 4567"
                required
              />
            </div>
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className="text-foreground font-heading pb-2 text-lg font-semibold">
            Discount code
          </legend>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="discount-code">Code</Label>
              <Input
                id="discount-code"
                type="text"
                value={discountCodeInput}
                onChange={(e) =>
                  setDiscountCodeInput(e.target.value.toUpperCase())
                }
                placeholder="SAVE20"
                autoComplete="off"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handleApplyDiscount}
              disabled={
                validateDiscountMutation.isPending || items.length === 0
              }
            >
              {validateDiscountMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Checking…
                </>
              ) : (
                "Apply"
              )}
            </Button>
          </div>
          {discountFieldError && (
            <p className="text-destructive text-sm">{discountFieldError}</p>
          )}
          {discountCodeLabel && discountAmount > 0 && (
            <p className="text-sm text-green-600">
              Code{" "}
              <span className="font-mono font-semibold">
                {discountCodeLabel}
              </span>{" "}
              applied.
            </p>
          )}
        </fieldset>

        {shippingConfig.offersInStorePickup && (
          <fieldset className="flex flex-col gap-3">
            <legend className="text-foreground font-heading pb-2 text-lg font-semibold">
              Delivery
            </legend>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={deliveryMethod === "ship" ? "default" : "outline"}
                onClick={() => setDeliveryMethod("ship")}
                style={
                  deliveryMethod === "ship"
                    ? { backgroundColor: primaryColor }
                    : undefined
                }
              >
                Ship to address
              </Button>
              <Button
                type="button"
                variant={deliveryMethod === "pickup" ? "default" : "outline"}
                onClick={() => setDeliveryMethod("pickup")}
                style={
                  deliveryMethod === "pickup"
                    ? { backgroundColor: primaryColor }
                    : undefined
                }
              >
                In-store pickup
              </Button>
            </div>
            <p className="text-muted-foreground text-sm">
              {deliveryMethod === "pickup"
                ? "No shipping charge. You'll pick up your order at the store."
                : "Shipping cost is based on your store's shipping settings."}
            </p>
          </fieldset>
        )}

        {deliveryMethod === "ship" && (
          <fieldset className="flex flex-col gap-4">
            <legend className="text-foreground font-heading pb-4 text-lg font-semibold">
              Shipping Address
            </legend>
            <p className="text-muted-foreground text-sm">
              This is sent to Stripe Checkout prefilled so you can confirm or
              edit your name, phone, and address before paying.
            </p>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="address-line1">Address line 1 *</Label>
                <Input
                  id="address-line1"
                  type="text"
                  autoComplete="shipping address-line1"
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  placeholder="Street address, P.O. box"
                  required={deliveryMethod === "ship"}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="address-line2">Address line 2</Label>
                <Input
                  id="address-line2"
                  type="text"
                  autoComplete="shipping address-line2"
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                  placeholder="Apartment, suite, etc."
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    type="text"
                    autoComplete="shipping address-level2"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    required={deliveryMethod === "ship"}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="state">State / Province *</Label>
                  <Input
                    id="state"
                    type="text"
                    autoComplete="shipping address-level1"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="e.g. CA or ON"
                    required={deliveryMethod === "ship"}
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="postal">ZIP / Postal code *</Label>
                  <Input
                    id="postal"
                    type="text"
                    autoComplete="shipping postal-code"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    required={deliveryMethod === "ship"}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="country">Country *</Label>
                  <Select
                    value={country}
                    onValueChange={(v) => setCountry(v as "US" | "CA")}
                    required
                  >
                    <SelectTrigger id="country" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="US">United States</SelectItem>
                      <SelectItem value="CA">Canada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </fieldset>
        )}
      </div>

      {/* Order Summary */}
      <div className="w-full shrink-0 lg:w-80">
        <div className="border-border bg-card sticky top-20 rounded-xl border p-6">
          <h2 className="text-card-foreground font-heading text-lg font-semibold">
            Order Summary
          </h2>
          <div className="mt-4 flex flex-col gap-4">
            <div className="max-h-64 space-y-3 overflow-y-auto">
              {items.map((item) => (
                <div
                  key={`${item.productId}-${item.variantId}`}
                  className="flex items-center gap-3"
                >
                  <div className="bg-secondary relative size-12 shrink-0 overflow-hidden rounded-md">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.productName}
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    ) : (
                      <div className="text-muted-foreground flex size-full items-center justify-center text-xs">
                        No img
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-card-foreground truncate text-sm font-medium">
                      {item.productName}
                    </p>
                    {item.variantName && (
                      <p className="text-muted-foreground text-xs">
                        {item.variantName}
                      </p>
                    )}
                    <p className="text-muted-foreground text-xs">
                      Qty: {item.quantity}
                    </p>
                  </div>
                  <span className="text-foreground text-sm font-medium">
                    {formatPrice(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            <div className="space-y-2 border-t pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              {discountAmount > 0 && discountCodeLabel && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount ({discountCodeLabel})</span>
                  <span>-{formatPrice(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shipping</span>
                <span>
                  {deliveryMethod === "pickup"
                    ? "In-store pickup (free)"
                    : shipping === 0
                      ? "Free"
                      : formatPrice(shipping)}
                </span>
              </div>
              <div className="flex justify-between border-t pt-2 font-bold">
                <span>Estimated total</span>
                <span>{formatPrice(finalTotal)}</span>
              </div>
              <p className="text-muted-foreground text-xs">
                Tax and final total are confirmed on Stripe Checkout.
              </p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              disabled={isProcessing}
              className="w-full text-white"
              size="lg"
              style={{ backgroundColor: primaryColor }}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Continue to Payment"
              )}
            </Button>

            <p className="text-muted-foreground text-center text-xs">
              All transactions are secure and encrypted via Stripe. 100% Secure
              and Encrypted Payments.
            </p>
          </div>
        </div>
      </div>
    </form>
  );
}
