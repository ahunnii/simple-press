"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CreditCard, Loader2, Tag } from "lucide-react";

import type { DefaultCheckoutPageTemplateProps } from "../../types";
import type { SupportedCountry } from "~/lib/geo/regions";
import { COUNTRY_LABELS, getRegionOptions } from "~/lib/geo/regions";
import { SHIPPING_TYPES } from "~/lib/shipping-utils";
import { useCheckoutForm } from "~/hooks/use-checkout-form";
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

const formatPrice = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100,
  );

type CheckoutFormProps = {
  business: DefaultCheckoutPageTemplateProps["business"];
};

export function DefaultCheckoutForm({ business }: CheckoutFormProps) {
  const f = useCheckoutForm(business);

  // A live shipping rate is actively loading once a destination is entered but
  // the amount isn't known yet — show a spinner and block submit until it lands.
  const shippingCalculating =
    f.deliveryMethod === "ship" &&
    f.state.trim().length > 0 &&
    f.shippingPending;

  // Tracks whether the user has attempted to submit — used to derive aria-invalid on required fields.
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const primaryColor = business.siteContent?.primaryColor ?? "#2563eb";

  const onSubmit = async (e: React.FormEvent) => {
    setSubmitAttempted(true);
    await f.handleSubmit(e);
  };

  if (f.items.length === 0) {
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
    <form onSubmit={onSubmit}>
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
                    value={f.email}
                    onChange={(e) => f.setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    aria-required="true"
                    aria-invalid={
                      submitAttempted && !f.email ? true : undefined
                    }
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
                    value={f.name}
                    onChange={(e) => f.setName(e.target.value)}
                    placeholder="John Doe"
                    required
                    aria-required="true"
                    aria-invalid={
                      submitAttempted && !f.name.trim() ? true : undefined
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
                    value={f.phone}
                    onChange={(val) => f.setPhone(val)}
                    placeholder="+1 555 123 4567"
                    required
                    aria-required="true"
                    aria-invalid={
                      submitAttempted && !f.phone.trim() ? true : undefined
                    }
                  />
                </div>
              </fieldset>
            </CardContent>
          </Card>

          {/* Delivery Method */}
          {f.shippingConfig.offersInStorePickup && (
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
                    variant={
                      f.deliveryMethod === "ship" ? "default" : "outline"
                    }
                    aria-pressed={f.deliveryMethod === "ship"}
                    onClick={() => f.setDeliveryMethod("ship")}
                    style={
                      f.deliveryMethod === "ship"
                        ? { backgroundColor: primaryColor }
                        : undefined
                    }
                  >
                    Ship to address
                  </Button>
                  <Button
                    type="button"
                    variant={
                      f.deliveryMethod === "pickup" ? "default" : "outline"
                    }
                    aria-pressed={f.deliveryMethod === "pickup"}
                    onClick={() => f.setDeliveryMethod("pickup")}
                    style={
                      f.deliveryMethod === "pickup"
                        ? { backgroundColor: primaryColor }
                        : undefined
                    }
                  >
                    In-store pickup
                  </Button>
                </div>
                <p className="text-sm text-[#6b6b6b]">
                  {f.deliveryMethod === "pickup"
                    ? "No shipping charge. You'll pick up your order at the store."
                    : "Shipping cost is based on your store's shipping settings."}
                </p>
                {f.deliveryMethod === "pickup" && (
                  <div className="rounded-[var(--radius)] border border-gray-200 bg-[#f6f6f6] p-3 text-sm">
                    <p className="font-medium text-[#0a0a0a]">
                      Pickup location
                    </p>
                    <p className="mt-0.5 text-[#6b6b6b]">
                      {f.shippingConfig.pickupLocation ??
                        business.businessAddress ??
                        "Pickup details will be confirmed by the store."}
                    </p>
                    {f.shippingConfig.pickupInstructions ? (
                      <p className="mt-1 whitespace-pre-line text-[#6b6b6b]">
                        {f.shippingConfig.pickupInstructions}
                      </p>
                    ) : null}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Shipping Address */}
          {f.deliveryMethod === "ship" && (
            <Card>
              <CardContent className="space-y-4 pt-6">
                <fieldset className="space-y-4 border-0 p-0">
                  <legend className="pb-2 text-xl leading-none font-semibold tracking-tight">
                    Shipping Address
                  </legend>
                  <p className="text-sm text-[#6b6b6b]">
                    {f.shippingConfig.shippingType ===
                    SHIPPING_TYPES.ZONE_WEIGHT
                      ? "We price shipping from this address. Make changes here before continuing to payment."
                      : "This is sent to Stripe Checkout prefilled so you can confirm or edit your name, phone, and address before paying."}
                  </p>
                  <div>
                    <Label htmlFor="address-line1">
                      Address line 1 <span aria-hidden="true">*</span>
                    </Label>
                    <Input
                      id="address-line1"
                      type="text"
                      autoComplete="shipping address-line1"
                      value={f.addressLine1}
                      onChange={(e) => f.setAddressLine1(e.target.value)}
                      placeholder="Street address, P.O. box"
                      required={f.deliveryMethod === "ship"}
                      aria-required="true"
                      aria-invalid={
                        submitAttempted && !f.addressLine1.trim()
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
                      value={f.addressLine2}
                      onChange={(e) => f.setAddressLine2(e.target.value)}
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
                        value={f.city}
                        onChange={(e) => f.setCity(e.target.value)}
                        required={f.deliveryMethod === "ship"}
                        aria-required="true"
                        aria-invalid={
                          submitAttempted && !f.city.trim() ? true : undefined
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="state" id="state-label">
                        State / Province <span aria-hidden="true">*</span>
                      </Label>
                      <Select
                        value={f.state}
                        onValueChange={(v) => f.setState(v)}
                      >
                        <SelectTrigger
                          id="state"
                          aria-labelledby="state-label"
                          aria-required="true"
                          aria-invalid={
                            submitAttempted && !f.state ? true : undefined
                          }
                          className="w-full"
                        >
                          <SelectValue placeholder="Select state" />
                        </SelectTrigger>
                        <SelectContent>
                          {getRegionOptions(f.country).map((opt) => (
                            <SelectItem key={opt.code} value={opt.code}>
                              {opt.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                        value={f.postalCode}
                        onChange={(e) => f.setPostalCode(e.target.value)}
                        required={f.deliveryMethod === "ship"}
                        aria-required="true"
                        aria-invalid={
                          submitAttempted && !f.postalCode.trim()
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
                        value={f.country}
                        onValueChange={(v) =>
                          f.setCountry(v as SupportedCountry)
                        }
                      >
                        <SelectTrigger
                          id="country"
                          aria-labelledby="country-label"
                          className="w-full"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {f.allowedCountries.map((c) => (
                            <SelectItem key={c} value={c}>
                              {COUNTRY_LABELS[c]}
                            </SelectItem>
                          ))}
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
                {f.items.map((item) => (
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

              {/* Discount Code Input — inline */}
              <div className="space-y-3 pt-4">
                <label htmlFor="discount-code" className="sr-only">
                  Discount code
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag
                      className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400"
                      aria-hidden="true"
                    />
                    <Input
                      id="discount-code"
                      type="text"
                      placeholder="Discount code"
                      value={f.discountCodeInput}
                      onChange={(e) => {
                        f.setDiscountCodeInput(e.target.value.toUpperCase());
                        f.setDiscountFieldError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          f.handleApplyDiscount();
                        }
                      }}
                      aria-invalid={!!f.discountFieldError}
                      aria-describedby={
                        f.discountFieldError ? "discount-code-error" : undefined
                      }
                      autoComplete="off"
                      className="pl-10"
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={f.handleApplyDiscount}
                    disabled={
                      f.isValidatingDiscount || !f.discountCodeInput.trim()
                    }
                    variant="outline"
                    aria-label={
                      f.isValidatingDiscount
                        ? "Applying discount code"
                        : "Apply discount code"
                    }
                  >
                    {f.isValidatingDiscount ? (
                      <Loader2
                        className="h-4 w-4 animate-spin"
                        aria-hidden="true"
                      />
                    ) : (
                      "Apply"
                    )}
                  </Button>
                </div>
                {f.discountFieldError && (
                  <Alert variant="destructive">
                    <AlertDescription
                      id="discount-code-error"
                      className="text-sm"
                    >
                      {f.discountFieldError}
                    </AlertDescription>
                  </Alert>
                )}
                {f.discountCodeLabel && f.discountAmount > 0 && (
                  <p
                    role="status"
                    className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm font-medium text-green-900"
                  >
                    Discount Applied: {f.discountCodeLabel} — you saved{" "}
                    {formatPrice(f.discountAmount)}
                  </p>
                )}
              </div>

              <div className="space-y-2 border-t pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-[#6b6b6b]">Subtotal</span>
                  <span>{formatPrice(f.subtotal)}</span>
                </div>
                {f.discountAmount > 0 && f.discountCodeLabel && (
                  <div className="flex justify-between text-sm text-green-700">
                    <span>Discount ({f.discountCodeLabel})</span>
                    <span>-{formatPrice(f.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-[#6b6b6b]">Shipping</span>
                  <span>
                    {f.deliveryMethod === "pickup" ? (
                      "In-store pickup (free)"
                    ) : shippingCalculating ? (
                      <span
                        className="inline-flex items-center gap-1.5 text-[#6b6b6b]"
                        aria-live="polite"
                      >
                        <Loader2
                          className="size-3.5 animate-spin"
                          aria-hidden="true"
                        />
                        Calculating…
                      </span>
                    ) : f.shippingPending ? (
                      "Calculated at checkout"
                    ) : f.shipping === 0 ? (
                      "Free"
                    ) : (
                      formatPrice(f.shipping)
                    )}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2 font-bold">
                  <span>Estimated total</span>
                  <span>{formatPrice(f.finalTotal)}</span>
                </div>
                <p className="text-muted-foreground text-xs">
                  Tax and final total are confirmed on Stripe Checkout.
                </p>
              </div>

              <div role="alert" aria-live="assertive" aria-atomic="true">
                {f.error && (
                  <Alert variant="destructive">
                    <AlertDescription>{f.error}</AlertDescription>
                  </Alert>
                )}
              </div>

              <Button
                type="submit"
                disabled={f.isProcessing || shippingCalculating}
                aria-busy={f.isProcessing || shippingCalculating}
                className="w-full text-white"
                size="lg"
                style={{ backgroundColor: primaryColor }}
              >
                {f.isProcessing ? (
                  <>
                    <Loader2
                      className="mr-2 h-5 w-5 animate-spin"
                      aria-hidden="true"
                    />
                    Processing...
                  </>
                ) : shippingCalculating ? (
                  <>
                    <Loader2
                      className="mr-2 h-5 w-5 animate-spin"
                      aria-hidden="true"
                    />
                    Calculating shipping…
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
