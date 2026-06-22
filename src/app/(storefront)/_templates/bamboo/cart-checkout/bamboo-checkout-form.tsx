"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import type { DefaultCheckoutPageTemplateProps } from "../../types";
import { formatPrice } from "~/lib/prices";
import { useCheckoutForm } from "~/hooks/use-checkout-form";
import { SHIPPING_TYPES } from "~/lib/shipping-utils";
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
import { COUNTRY_LABELS, type SupportedCountry, getRegionOptions } from "~/lib/geo/regions";

type CheckoutFormProps = {
  business: DefaultCheckoutPageTemplateProps["business"];
};

export function CheckoutForm({ business }: CheckoutFormProps) {
  const {
    email,
    setEmail,
    name,
    setName,
    phone,
    setPhone,
    addressLine1,
    setAddressLine1,
    addressLine2,
    setAddressLine2,
    city,
    setCity,
    state,
    setState,
    postalCode,
    setPostalCode,
    country,
    setCountry,
    allowedCountries,
    deliveryMethod,
    setDeliveryMethod,
    discountCodeInput,
    setDiscountCodeInput,
    discountAmount,
    discountCodeLabel,
    discountFieldError,
    handleApplyDiscount,
    isValidatingDiscount,
    isProcessing,
    error,
    handleSubmit,
    shippingConfig,
    items,
    subtotal,
    shipping,
    shippingPending,
    finalTotal,
  } = useCheckoutForm(business);

  // A live shipping rate is actively loading once a destination is entered but
  // the amount isn't known yet — show a spinner and block submit until it lands.
  const shippingCalculating =
    deliveryMethod === "ship" && state.trim().length > 0 && shippingPending;

  // Tracks whether the user has attempted to submit — used to derive aria-invalid on required fields.
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const wrappedHandleSubmit = async (e: React.FormEvent) => {
    setSubmitAttempted(true);
    await handleSubmit(e);
  };

  // primaryColor is used only for the delivery method toggle indicator and
  // the submit button; falls back to the CSS --primary token when absent.
  const primaryColor = business.siteContent?.primaryColor ?? undefined;

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
    <form
      onSubmit={wrappedHandleSubmit}
      className="flex flex-col gap-8 lg:flex-row"
    >
      <div className="flex-1 space-y-8">
        {/* M-7: required field explanation */}
        <p className="text-muted-foreground text-sm">
          Fields marked with * are required.
        </p>
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
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                aria-required="true"
                aria-invalid={submitAttempted && !email ? true : undefined}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Full Name *</Label>
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
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone">Phone *</Label>
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
                aria-invalid={!!discountFieldError}
                aria-describedby={
                  discountFieldError ? "discount-error" : undefined
                }
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handleApplyDiscount}
              disabled={isValidatingDiscount || items.length === 0}
            >
              {isValidatingDiscount ? (
                <>
                  <Loader2
                    className="mr-2 size-4 animate-spin"
                    aria-hidden="true"
                  />
                  Checking…
                </>
              ) : (
                "Apply"
              )}
            </Button>
          </div>
          {discountFieldError && (
            <p
              id="discount-error"
              className="text-destructive text-sm"
              role="alert"
            >
              {discountFieldError}
            </p>
          )}
          {discountCodeLabel && discountAmount > 0 && (
            <p className="text-sm text-green-700" role="status">
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
                variant={deliveryMethod === "pickup" ? "default" : "outline"}
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
              {shippingConfig.shippingType === SHIPPING_TYPES.ZONE_WEIGHT
                ? "We price shipping from this address. Make changes here before continuing to payment."
                : "This is sent to Stripe Checkout prefilled so you can confirm or edit your name, phone, and address before paying."}
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
                  aria-required="true"
                  aria-invalid={
                    submitAttempted && !addressLine1.trim() ? true : undefined
                  }
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
                    aria-required="true"
                    aria-invalid={
                      submitAttempted && !city.trim() ? true : undefined
                    }
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label id="state-label" htmlFor="state">
                    State / Province *
                  </Label>
                  <Select
                    value={state}
                    onValueChange={(v) => setState(v)}
                    required
                  >
                    <SelectTrigger
                      id="state"
                      className="w-full"
                      aria-labelledby="state-label"
                      aria-required="true"
                      aria-invalid={
                        submitAttempted && !state ? true : undefined
                      }
                    >
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {getRegionOptions(country).map((opt) => (
                        <SelectItem key={opt.code} value={opt.code}>
                          {opt.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                    aria-required="true"
                    aria-invalid={
                      submitAttempted && !postalCode.trim() ? true : undefined
                    }
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label id="country-label" htmlFor="country">
                    Country *
                  </Label>
                  <Select
                    value={country}
                    onValueChange={(v) => setCountry(v as SupportedCountry)}
                    required
                  >
                    <SelectTrigger
                      id="country"
                      className="w-full"
                      aria-labelledby="country-label"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {allowedCountries.map((c: SupportedCountry) => (
                        <SelectItem key={c} value={c}>
                          {COUNTRY_LABELS[c]}
                        </SelectItem>
                      ))}
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
                <div className="flex justify-between text-sm text-green-700">
                  <span>Discount ({discountCodeLabel})</span>
                  <span>-{formatPrice(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shipping</span>
                <span>
                  {deliveryMethod === "pickup" ? (
                    "In-store pickup (free)"
                  ) : shippingCalculating ? (
                    <span
                      className="text-muted-foreground inline-flex items-center gap-1.5"
                      aria-live="polite"
                    >
                      <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                      Calculating…
                    </span>
                  ) : shippingPending ? (
                    "Calculated at checkout"
                  ) : shipping === 0 ? (
                    "Free"
                  ) : (
                    formatPrice(shipping)
                  )}
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
              disabled={isProcessing || shippingCalculating}
              aria-busy={isProcessing || shippingCalculating}
              className="w-full"
              size="lg"
              style={
                primaryColor ? { backgroundColor: primaryColor } : undefined
              }
            >
              {isProcessing ? (
                <>
                  <Loader2
                    className="mr-2 size-4 animate-spin"
                    aria-hidden="true"
                  />
                  Processing...
                </>
              ) : shippingCalculating ? (
                <>
                  <Loader2
                    className="mr-2 size-4 animate-spin"
                    aria-hidden="true"
                  />
                  Calculating shipping…
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
