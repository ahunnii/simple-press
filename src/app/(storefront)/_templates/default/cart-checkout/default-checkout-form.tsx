"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CreditCard, Loader2 } from "lucide-react";

import type { DefaultCheckoutPageTemplateProps } from "../../types";
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

import { DiscountDiscountInput } from "./default-discount-input";

const formatPrice = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100,
  );

type CheckoutFormProps = {
  business: DefaultCheckoutPageTemplateProps["business"];
};

export function DefaultCheckoutForm({ business }: CheckoutFormProps) {
  const { items, removeItem, total } = useCart();
  const shippingConfig = shippingConfigFromBusiness(business);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Tracks whether the user has attempted to submit — used to derive aria-invalid on required fields.
  const [submitAttempted, setSubmitAttempted] = useState(false);

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

  const primaryColor = business.siteContent?.primaryColor ?? "#2563eb";

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
    setSubmitAttempted(true);
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

      window.location.href = sessionUrl;
    } catch (err: unknown) {
      setError((err as Error).message ?? "Failed to create checkout session");
      setIsProcessing(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="mb-4 text-[#6b6b6b]">Your cart is empty</p>
        <Button asChild>
          <Link href="/shop">Continue shopping</Link>
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
          <Card>
            <CardContent className="space-y-4 pt-6">
              <fieldset className="space-y-4 border-0 p-0">
                <legend className="pb-2 text-xl leading-none font-semibold tracking-tight">
                  Contact Information
                </legend>
                <p className="text-sm text-[#6b6b6b]">
                  Fields marked with <span aria-hidden="true">*</span> are
                  required.
                </p>
                <div>
                  <Label htmlFor="email">
                    Email <span aria-hidden="true">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    aria-required="true"
                    aria-invalid={submitAttempted && !email ? true : undefined}
                  />
                </div>
                <div>
                  <Label htmlFor="name">
                    Full Name <span aria-hidden="true">*</span>
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    required
                    aria-required="true"
                    aria-invalid={
                      submitAttempted && !name.trim() ? true : undefined
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="phone">
                    Phone <span aria-hidden="true">*</span>
                  </Label>
                  <PhoneInput
                    id="phone"
                    autoComplete="tel"
                    value={phone}
                    onChange={(val) => setPhone(val)}
                    placeholder="+1 555 123 4567"
                    required
                    aria-required="true"
                    aria-invalid={
                      submitAttempted && !phone.trim() ? true : undefined
                    }
                  />
                </div>
              </fieldset>
            </CardContent>
          </Card>

          {/* Delivery Method */}
          {shippingConfig.offersInStorePickup && (
            <Card>
              <CardHeader>
                <CardTitle>Delivery</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  role="group"
                  aria-label="Delivery method"
                  className="flex flex-wrap gap-2"
                >
                  <Button
                    type="button"
                    variant={deliveryMethod === "ship" ? "default" : "outline"}
                    aria-pressed={deliveryMethod === "ship"}
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
                    variant={
                      deliveryMethod === "pickup" ? "default" : "outline"
                    }
                    aria-pressed={deliveryMethod === "pickup"}
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
                <p className="text-sm text-[#6b6b6b]">
                  {deliveryMethod === "pickup"
                    ? "No shipping charge. You'll pick up your order at the store."
                    : "Shipping cost is based on your store's shipping settings."}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Shipping Address */}
          {deliveryMethod === "ship" && (
            <Card>
              <CardContent className="space-y-4 pt-6">
                <fieldset className="space-y-4 border-0 p-0">
                  <legend className="pb-2 text-xl leading-none font-semibold tracking-tight">
                    Shipping Address
                  </legend>
                  <p className="text-sm text-[#6b6b6b]">
                    This is sent to Stripe Checkout prefilled so you can confirm
                    or edit your name, phone, and address before paying.
                  </p>
                  <div>
                    <Label htmlFor="address-line1">
                      Address line 1 <span aria-hidden="true">*</span>
                    </Label>
                    <Input
                      id="address-line1"
                      type="text"
                      autoComplete="shipping address-line1"
                      value={addressLine1}
                      onChange={(e) => setAddressLine1(e.target.value)}
                      placeholder="Street address, P.O. box"
                      required={deliveryMethod === "ship"}
                      aria-required="true"
                      aria-invalid={
                        submitAttempted && !addressLine1.trim()
                          ? true
                          : undefined
                      }
                    />
                  </div>
                  <div>
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
                    <div>
                      <Label htmlFor="city">
                        City <span aria-hidden="true">*</span>
                      </Label>
                      <Input
                        id="city"
                        type="text"
                        autoComplete="shipping address-level2"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        required={deliveryMethod === "ship"}
                        aria-required="true"
                        aria-invalid={
                          submitAttempted && !city.trim() ? true : undefined
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="state">
                        State / Province <span aria-hidden="true">*</span>
                      </Label>
                      <Input
                        id="state"
                        type="text"
                        autoComplete="shipping address-level1"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        placeholder="e.g. CA or ON"
                        required={deliveryMethod === "ship"}
                        aria-required="true"
                        aria-invalid={
                          submitAttempted && !state.trim() ? true : undefined
                        }
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="postal">
                        ZIP / Postal code <span aria-hidden="true">*</span>
                      </Label>
                      <Input
                        id="postal"
                        type="text"
                        autoComplete="shipping postal-code"
                        value={postalCode}
                        onChange={(e) => setPostalCode(e.target.value)}
                        required={deliveryMethod === "ship"}
                        aria-required="true"
                        aria-invalid={
                          submitAttempted && !postalCode.trim()
                            ? true
                            : undefined
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="country" id="country-label">
                        Country <span aria-hidden="true">*</span>
                      </Label>
                      <Select
                        value={country}
                        onValueChange={(v) => setCountry(v as "US" | "CA")}
                      >
                        <SelectTrigger
                          id="country"
                          aria-labelledby="country-label"
                          className="w-full"
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
                </fieldset>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Items */}
              <div className="max-h-64 space-y-3 overflow-y-auto">
                {items.map((item) => (
                  <div
                    key={`${item.productId}-${item.variantId}`}
                    className="flex gap-3"
                  >
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-[var(--radius)] bg-[#f6f6f6]">
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.productName}
                          width={64}
                          height={64}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div
                          className="flex h-full w-full items-center justify-center text-xs text-[#6b6b6b]"
                          aria-hidden="true"
                        >
                          No img
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[#0a0a0a]">
                        {item.productName}
                      </p>
                      {item.variantName && (
                        <p className="text-xs text-[#6b6b6b]">
                          {item.variantName}
                        </p>
                      )}
                      <p className="text-xs text-[#6b6b6b]">
                        Qty: {item.quantity}
                      </p>
                    </div>
                    <p className="text-sm font-medium">
                      {formatPrice(item.price * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Discount Code Input */}
              <div className="pt-4">
                <DiscountDiscountInput
                  businessId={business.id}
                  cartTotal={subtotal}
                  onDiscountApplied={setAppliedDiscount}
                />
              </div>

              <div className="space-y-2 border-t pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-[#6b6b6b]">Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                {appliedDiscount && (
                  <div className="flex justify-between text-sm text-green-700">
                    <span>Discount ({appliedDiscount.code})</span>
                    <span>-{formatPrice(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-[#6b6b6b]">Shipping</span>
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

              <div role="alert" aria-live="assertive" aria-atomic="true">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </div>

              <Button
                type="submit"
                disabled={isProcessing}
                aria-busy={isProcessing}
                className="w-full text-white"
                size="lg"
                style={{ backgroundColor: primaryColor }}
              >
                {isProcessing ? (
                  <>
                    <Loader2
                      className="mr-2 h-5 w-5 animate-spin"
                      aria-hidden="true"
                    />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-5 w-5" aria-hidden="true" />
                    Continue to Payment
                  </>
                )}
              </Button>

              <p className="text-center text-xs text-[#6b6b6b]">
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
