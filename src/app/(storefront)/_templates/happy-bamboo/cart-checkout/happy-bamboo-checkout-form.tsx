"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import type { DefaultCheckoutPageTemplateProps } from "../../types";
import { cn } from "~/lib/utils";
import { useCheckoutForm } from "~/hooks/use-checkout-form";
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
import { getRegionOptions } from "~/lib/geo/regions";

import { HappyBambooOrderSummary } from "./happy-bamboo-order-summary";

type CheckoutFormProps = {
  business: DefaultCheckoutPageTemplateProps["business"];
};

export function HappyBambooCheckoutForm({ business }: CheckoutFormProps) {
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
    deliveryMethod,
    setDeliveryMethod,
    discountCodeInput,
    setDiscountCodeInput,

    discountAmount,
    discountCodeLabel,
    discountFieldError,
    setDiscountFieldError,
    handleApplyDiscount,
    isValidatingDiscount,
    isProcessing,
    error,
    handleSubmit,
    shippingConfig,
    items,
    shippingPending,
  } = useCheckoutForm(business);

  // Tracks whether the user has attempted to submit — used to derive aria-invalid on required fields.
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const handleSubmitWithAttempt = async (e: React.FormEvent) => {
    setSubmitAttempted(true);
    await handleSubmit(e);
  };

  const primaryColor = business.siteContent?.primaryColor ?? "#3b82f6";

  if (items.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted-foreground mb-4">Your cart is empty</p>
        <Button asChild>
          <Link href="/shop">Continue Shopping</Link>
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmitWithAttempt}
      className="flex flex-col gap-8 lg:flex-row"
    >
      <div className="flex-1 space-y-8">
        <fieldset className="flex flex-col gap-4">
          <legend className="text-foreground font-heading pb-4 text-lg font-semibold">
            Contact Information
          </legend>
          <p className="text-muted-foreground text-sm">
            Fields marked with <span aria-hidden="true">*</span> are required.
          </p>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">
                Email <span aria-hidden="true">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                aria-required="true"
                aria-invalid={submitAttempted && !email ? true : undefined}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">
                Full Name <span aria-hidden="true">*</span>
              </Label>
              <Input
                id="name"
                type="text"
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
                onChange={(e) => {
                  setDiscountCodeInput(e.target.value.toUpperCase());
                  setDiscountFieldError(null);
                }}
                placeholder="Discount Code"
                autoComplete="off"
                aria-invalid={!!discountFieldError}
                aria-describedby={
                  discountFieldError ? "discount-code-error" : undefined
                }
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={handleApplyDiscount}
              className={cn(
                discountCodeInput.trim() &&
                  "bg-primary text-primary-foreground hover:bg-primary/90",
              )}
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
              id="discount-code-error"
              role="alert"
              className="text-destructive text-sm"
            >
              {discountFieldError}
            </p>
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
                aria-pressed={deliveryMethod === "ship"}
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
                aria-pressed={deliveryMethod === "pickup"}
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
                ? "No shipping charge. You’ll pick up your order at the store."
                : "Shipping cost is based on your store’s shipping settings."}
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
                    placeholder="e.g. San Francisco"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="state" id="state-label">
                    State / Province <span aria-hidden="true">*</span>
                  </Label>
                  <Select
                    value={state}
                    onValueChange={(v) => setState(v)}
                    required
                  >
                    <SelectTrigger
                      id="state"
                      aria-labelledby="state-label"
                      aria-required="true"
                      aria-invalid={
                        submitAttempted && !state ? true : undefined
                      }
                      className="w-full"
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
                  <Label htmlFor="postal">
                    ZIP / Postal code <span aria-hidden="true">*</span>
                  </Label>
                  <Input
                    id="postal"
                    type="text"
                    autoComplete="shipping postal-code"
                    placeholder="e.g. 94102"
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
                  <Label htmlFor="country" id="country-label">
                    Country <span aria-hidden="true">*</span>
                  </Label>
                  <Select
                    value={country}
                    onValueChange={(v) => setCountry(v as "US" | "CA")}
                    required
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
            </div>
          </fieldset>
        )}
      </div>

      <div className="w-full shrink-0 lg:w-80">
        <div className="sticky top-20 space-y-4">
          <HappyBambooOrderSummary
            shippingConfig={shippingConfig}
            deliveryMethod={deliveryMethod}
            discountAmount={discountAmount}
            shippingPending={shippingPending}
          />

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
                  className="mr-2 size-4 animate-spin"
                  aria-hidden="true"
                />
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
    </form>
  );
}
