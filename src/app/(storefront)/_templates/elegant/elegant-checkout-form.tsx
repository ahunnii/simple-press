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

type Props = {
  business: DefaultCheckoutPageTemplateProps["business"];
};

export function ElegantCheckoutForm({ business }: Props) {
  const { items, removeItem, subtotal } = useCart();
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

  // Reset discount when cart changes
  useEffect(() => {
    setDiscountCodeId(null);
    setDiscountAmount(0);
    setDiscountCodeLabel(null);
    setDiscountFieldError(null);
  }, [subtotal]);

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
      <div className="py-20 text-center">
        <p className="text-muted-foreground mb-6">Your cart is empty</p>
        <Link
          href="/shop"
          className="bg-primary text-primary-foreground boty-transition hover:bg-primary/90 boty-shadow inline-flex items-center justify-center rounded-full px-8 py-3 text-sm tracking-wide"
        >
          Continue Shopping
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-10 lg:flex-row">
      {/* Left column — form fields */}
      <div className="flex-1 space-y-10">
        {/* Contact Information */}
        <section>
          <span className="text-primary mb-5 block text-sm tracking-[0.3em] uppercase">
            Contact Information
          </span>
          <div className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email" className="text-muted-foreground text-sm">
                Email *
              </Label>
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
              <Label htmlFor="name" className="text-muted-foreground text-sm">
                Full Name *
              </Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone" className="text-muted-foreground text-sm">
                Phone *
              </Label>
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
        </section>

        {/* Discount Code */}
        <section>
          <span className="text-primary mb-5 block text-sm tracking-[0.3em] uppercase">
            Discount Code
          </span>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label
                htmlFor="discount-code"
                className="text-muted-foreground text-sm"
              >
                Code
              </Label>
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
            <button
              type="button"
              onClick={handleApplyDiscount}
              disabled={
                validateDiscountMutation.isPending || items.length === 0
              }
              className="border-border boty-transition hover:bg-muted inline-flex items-center justify-center rounded-full border px-6 py-2.5 text-sm font-medium disabled:opacity-50"
            >
              {validateDiscountMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Apply"
              )}
            </button>
          </div>
          {discountFieldError && (
            <p className="mt-2 text-sm text-red-600">{discountFieldError}</p>
          )}
          {discountCodeLabel && discountAmount > 0 && (
            <p className="mt-2 text-sm text-green-600">
              Code{" "}
              <span className="font-mono font-semibold">
                {discountCodeLabel}
              </span>{" "}
              applied.
            </p>
          )}
        </section>

        {/* Delivery Method */}
        {shippingConfig.offersInStorePickup && (
          <section>
            <span className="text-primary mb-5 block text-sm tracking-[0.3em] uppercase">
              Delivery
            </span>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setDeliveryMethod("ship")}
                className={`boty-transition rounded-full border px-6 py-2.5 text-sm font-medium ${
                  deliveryMethod === "ship"
                    ? "bg-primary text-primary-foreground border-transparent"
                    : "border-border text-foreground hover:bg-muted bg-transparent"
                }`}
              >
                Ship to address
              </button>
              <button
                type="button"
                onClick={() => setDeliveryMethod("pickup")}
                className={`boty-transition rounded-full border px-6 py-2.5 text-sm font-medium ${
                  deliveryMethod === "pickup"
                    ? "bg-primary text-primary-foreground border-transparent"
                    : "border-border text-foreground hover:bg-muted bg-transparent"
                }`}
              >
                In-store pickup
              </button>
            </div>
            <p className="text-muted-foreground mt-3 text-sm">
              {deliveryMethod === "pickup"
                ? "No shipping charge. You'll pick up your order at the store."
                : "Shipping cost is based on your store's shipping settings."}
            </p>
          </section>
        )}

        {/* Shipping Address */}
        {deliveryMethod === "ship" && (
          <section>
            <span className="text-primary mb-5 block text-sm tracking-[0.3em] uppercase">
              Shipping Address
            </span>
            <p className="text-muted-foreground mb-4 text-sm">
              This is sent to Stripe Checkout prefilled so you can confirm or
              edit your name, phone, and address before paying.
            </p>
            <div className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor="address-line1"
                  className="text-muted-foreground text-sm"
                >
                  Address line 1 *
                </Label>
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
                <Label
                  htmlFor="address-line2"
                  className="text-muted-foreground text-sm"
                >
                  Address line 2
                </Label>
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
                  <Label
                    htmlFor="city"
                    className="text-muted-foreground text-sm"
                  >
                    City *
                  </Label>
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
                  <Label
                    htmlFor="state"
                    className="text-muted-foreground text-sm"
                  >
                    State / Province *
                  </Label>
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
                  <Label
                    htmlFor="postal"
                    className="text-muted-foreground text-sm"
                  >
                    ZIP / Postal code *
                  </Label>
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
                  <Label
                    htmlFor="country"
                    className="text-muted-foreground text-sm"
                  >
                    Country *
                  </Label>
                  <Select
                    value={country}
                    onValueChange={(v) => setCountry(v as "US" | "CA")}
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
          </section>
        )}
      </div>

      {/* Right column — Order Summary */}
      <div className="w-full shrink-0 lg:w-96">
        <div className="boty-shadow bg-card sticky top-24 rounded-3xl p-8">
          <h2 className="text-foreground mb-6 font-serif text-xl font-semibold">
            Order Summary
          </h2>

          {/* Items */}
          <div className="max-h-64 space-y-4 overflow-y-auto">
            {items.map((item) => (
              <div
                key={`${item.productId}-${item.variantId}`}
                className="flex items-center gap-4"
              >
                <div className="bg-muted relative size-14 shrink-0 overflow-hidden rounded-2xl">
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.productName}
                      fill
                      className="object-cover"
                      sizes="56px"
                    />
                  ) : (
                    <div className="text-muted-foreground flex size-full items-center justify-center text-xs">
                      No img
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-foreground truncate font-serif text-sm font-medium">
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

          {/* Totals */}
          <div className="border-border/50 mt-6 space-y-3 border-t pt-6">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="text-foreground">{formatPrice(subtotal)}</span>
            </div>
            {discountAmount > 0 && discountCodeLabel && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Discount ({discountCodeLabel})</span>
                <span>-{formatPrice(discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Shipping</span>
              <span className="text-foreground">
                {deliveryMethod === "pickup"
                  ? "In-store pickup (free)"
                  : shipping === 0
                    ? "Free"
                    : formatPrice(shipping)}
              </span>
            </div>
            <div className="border-border/50 flex justify-between border-t pt-3">
              <span className="text-foreground font-serif font-semibold">
                Estimated total
              </span>
              <span className="text-foreground text-lg font-semibold">
                {formatPrice(finalTotal)}
              </span>
            </div>
            <p className="text-muted-foreground text-xs">
              Tax and final total are confirmed on Stripe Checkout.
            </p>
          </div>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <button
            type="submit"
            disabled={isProcessing}
            className="bg-primary text-primary-foreground boty-transition hover:bg-primary/90 boty-shadow mt-6 flex w-full items-center justify-center gap-2 rounded-full py-4 font-medium disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Continue to Payment"
            )}
          </button>

          <p className="text-muted-foreground mt-4 text-center text-xs">
            All transactions are secure and encrypted via Stripe. 100% Secure
            and Encrypted Payments.
          </p>
        </div>
      </div>
    </form>
  );
}
