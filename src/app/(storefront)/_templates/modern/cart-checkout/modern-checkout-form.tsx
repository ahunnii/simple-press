"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Loader2, ShoppingBag } from "lucide-react";

import type { DefaultCheckoutPageTemplateProps } from "../../types";
import { formatPrice } from "~/lib/prices";
import { useCheckoutForm } from "~/hooks/use-checkout-form";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { PhoneInput } from "~/components/inputs/phone-form-field";

type Props = {
  business: DefaultCheckoutPageTemplateProps["business"];
};

export function ModernCheckoutForm({ business }: Props) {
  const f = useCheckoutForm(business);

  // Tracks whether the user has attempted to submit — used to derive aria-invalid on required fields.
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // Modern template shows first/last name separately; compose into f.name
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const handleFirstNameChange = (v: string) => {
    setFirstName(v);
    f.setName(`${v.trim()} ${lastName.trim()}`.trim());
  };
  const handleLastNameChange = (v: string) => {
    setLastName(v);
    f.setName(`${firstName.trim()} ${v.trim()}`.trim());
  };

  const onSubmit = async (e: React.FormEvent) => {
    setSubmitAttempted(true);
    await f.handleSubmit(e);
  };

  const inputClass =
    "border-border bg-card text-foreground placeholder:text-muted-foreground/70 focus:border-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 mt-1 w-full border px-4 py-3 text-sm";
  const labelClass = "text-muted-foreground block text-sm";

  if (f.items.length === 0) {
    return (
      <div className="py-20 text-center">
        <ShoppingBag
          aria-hidden="true"
          className="text-muted-foreground/40 mx-auto h-12 w-12"
        />
        <h2 className="text-foreground mt-4 font-serif text-2xl">
          Nothing to check out
        </h2>
        <p className="text-muted-foreground mt-2 text-sm">
          Add some items to your cart first.
        </p>
        <Link
          href="/shop"
          className="bg-primary text-primary-foreground mt-8 inline-flex items-center gap-2 px-8 py-3 text-sm font-medium tracking-wide transition-opacity hover:opacity-90"
        >
          Browse Products
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
      {/* Form */}
      <div className="lg:col-span-2">
        <form onSubmit={onSubmit} id="checkout-form">
          {/* Contact */}
          <fieldset>
            <legend className="text-foreground text-xs font-semibold tracking-widest uppercase">
              Contact Information
            </legend>
            <p className="text-muted-foreground mt-2 text-xs">
              Fields marked with * are required.
            </p>
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="firstName" className={labelClass}>
                  First Name *
                </label>
                <input
                  id="firstName"
                  type="text"
                  required
                  aria-required="true"
                  aria-invalid={
                    submitAttempted && !firstName.trim() ? true : undefined
                  }
                  autoComplete="given-name"
                  value={firstName}
                  onChange={(e) => handleFirstNameChange(e.target.value)}
                  className={inputClass}
                  placeholder="Jane"
                />
              </div>
              <div>
                <label htmlFor="lastName" className={labelClass}>
                  Last Name *
                </label>
                <input
                  id="lastName"
                  type="text"
                  required
                  aria-required="true"
                  aria-invalid={
                    submitAttempted && !lastName.trim() ? true : undefined
                  }
                  autoComplete="family-name"
                  value={lastName}
                  onChange={(e) => handleLastNameChange(e.target.value)}
                  className={inputClass}
                  placeholder="Doe"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="email" className={labelClass}>
                  Email *
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  aria-required="true"
                  aria-invalid={submitAttempted && !f.email ? true : undefined}
                  autoComplete="email"
                  value={f.email}
                  onChange={(e) => f.setEmail(e.target.value)}
                  className={inputClass}
                  placeholder="jane@example.com"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="phone" className={labelClass}>
                  Phone *
                </label>
                <PhoneInput
                  id="phone"
                  autoComplete="tel"
                  value={f.phone}
                  onChange={(val) => f.setPhone(val)}
                  placeholder="+1 555 123 4567"
                  className={inputClass}
                  required
                  aria-required="true"
                  aria-invalid={
                    submitAttempted && !f.phone.trim() ? true : undefined
                  }
                />
              </div>
            </div>
          </fieldset>

          {/* Discount Code */}
          <div className="border-border mt-10 border-t pt-10">
            <h2
              id="discount-code-heading"
              className="text-foreground text-xs font-semibold tracking-widest uppercase"
            >
              Discount Code
            </h2>
            <div className="mt-6 flex gap-2">
              <div className="flex-1">
                <label htmlFor="discount-code" className="sr-only">
                  Discount code
                </label>
                <input
                  id="discount-code"
                  type="text"
                  value={f.discountCodeInput}
                  onChange={(e) =>
                    f.setDiscountCodeInput(e.target.value.toUpperCase())
                  }
                  placeholder="SAVE20"
                  autoComplete="off"
                  autoCapitalize="characters"
                  aria-invalid={!!f.discountFieldError}
                  aria-describedby={
                    f.discountFieldError ? "discount-error" : undefined
                  }
                  className={`${inputClass} w-full`}
                />
              </div>
              <button
                type="button"
                onClick={f.handleApplyDiscount}
                disabled={f.isValidatingDiscount || f.items.length === 0}
                aria-label="Apply"
                className="border-border bg-card text-foreground hover:bg-muted mt-1 inline-flex items-center gap-2 border px-6 py-3 text-sm font-medium tracking-wide transition-opacity disabled:opacity-50"
              >
                {f.isValidatingDiscount && (
                  <Loader2
                    aria-hidden="true"
                    className="h-4 w-4 animate-spin"
                  />
                )}
                Apply
              </button>
            </div>
            {f.discountFieldError && (
              <p
                id="discount-error"
                role="alert"
                className="mt-2 text-sm text-red-600"
              >
                {f.discountFieldError}
              </p>
            )}
            {f.discountCodeLabel && f.discountAmount > 0 && (
              <p role="status" className="mt-2 text-sm text-green-700">
                Code{" "}
                <span className="font-mono font-semibold">
                  {f.discountCodeLabel}
                </span>{" "}
                applied.
              </p>
            )}
          </div>

          {/* Delivery Method */}
          {f.shippingConfig.offersInStorePickup && (
            <fieldset className="border-border mt-10 border-t pt-10">
              <legend className="text-foreground text-xs font-semibold tracking-widest uppercase">
                Delivery
              </legend>
              <div
                role="group"
                aria-label="Delivery method"
                aria-describedby="delivery-method-hint"
                className="mt-6 flex flex-wrap gap-2"
              >
                <button
                  type="button"
                  onClick={() => f.setDeliveryMethod("ship")}
                  aria-pressed={f.deliveryMethod === "ship"}
                  className={`border px-6 py-3 text-sm font-medium tracking-wide transition-opacity ${
                    f.deliveryMethod === "ship"
                      ? "bg-primary text-primary-foreground border-transparent"
                      : "border-border text-foreground hover:bg-muted bg-transparent"
                  }`}
                >
                  Ship to address
                </button>
                <button
                  type="button"
                  onClick={() => f.setDeliveryMethod("pickup")}
                  aria-pressed={f.deliveryMethod === "pickup"}
                  className={`border px-6 py-3 text-sm font-medium tracking-wide transition-opacity ${
                    f.deliveryMethod === "pickup"
                      ? "bg-primary text-primary-foreground border-transparent"
                      : "border-border text-foreground hover:bg-muted bg-transparent"
                  }`}
                >
                  In-store pickup
                </button>
              </div>
              <p
                id="delivery-method-hint"
                role="status"
                className="text-muted-foreground mt-3 text-sm"
              >
                {f.deliveryMethod === "pickup"
                  ? "No shipping charge. You'll pick up your order at the store."
                  : "Shipping cost is based on your store's shipping settings."}
              </p>
            </fieldset>
          )}

          {/* Shipping Address */}
          {f.deliveryMethod === "ship" && (
            <fieldset className="border-border mt-10 border-t pt-10">
              <legend className="text-foreground text-xs font-semibold tracking-widest uppercase">
                Shipping Address
              </legend>
              <p className="text-muted-foreground mt-2 text-sm">
                This is sent to Stripe Checkout prefilled so you can confirm or
                edit before paying.
              </p>
              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="address" className={labelClass}>
                    Address line 1 *
                  </label>
                  <input
                    id="address"
                    type="text"
                    autoComplete="shipping address-line1"
                    required={f.deliveryMethod === "ship"}
                    aria-required="true"
                    aria-invalid={
                      submitAttempted && !f.addressLine1.trim() ? true : undefined
                    }
                    value={f.addressLine1}
                    onChange={(e) => f.setAddressLine1(e.target.value)}
                    className={inputClass}
                    placeholder="123 Main Street"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="address2" className={labelClass}>
                    Address line 2
                  </label>
                  <input
                    id="address2"
                    type="text"
                    autoComplete="shipping address-line2"
                    value={f.addressLine2}
                    onChange={(e) => f.setAddressLine2(e.target.value)}
                    className={inputClass}
                    placeholder="Apartment, suite, etc."
                  />
                </div>
                <div>
                  <label htmlFor="city" className={labelClass}>
                    City *
                  </label>
                  <input
                    id="city"
                    type="text"
                    autoComplete="shipping address-level2"
                    required={f.deliveryMethod === "ship"}
                    aria-required="true"
                    aria-invalid={
                      submitAttempted && !f.city.trim() ? true : undefined
                    }
                    value={f.city}
                    onChange={(e) => f.setCity(e.target.value)}
                    className={inputClass}
                    placeholder="San Francisco"
                  />
                </div>
                <div>
                  <label htmlFor="state" className={labelClass}>
                    State / Province *
                  </label>
                  <input
                    id="state"
                    type="text"
                    autoComplete="shipping address-level1"
                    required={f.deliveryMethod === "ship"}
                    aria-required="true"
                    aria-invalid={
                      submitAttempted && !f.state.trim() ? true : undefined
                    }
                    value={f.state}
                    onChange={(e) => f.setState(e.target.value)}
                    className={inputClass}
                    placeholder="CA"
                  />
                </div>
                <div>
                  <label htmlFor="zip" className={labelClass}>
                    ZIP / Postal code *
                  </label>
                  <input
                    id="zip"
                    type="text"
                    autoComplete="shipping postal-code"
                    required={f.deliveryMethod === "ship"}
                    aria-required="true"
                    aria-invalid={
                      submitAttempted && !f.postalCode.trim() ? true : undefined
                    }
                    value={f.postalCode}
                    onChange={(e) => f.setPostalCode(e.target.value)}
                    className={inputClass}
                    placeholder="94102"
                  />
                </div>
                <div>
                  <label htmlFor="country" className={labelClass}>
                    Country *
                  </label>
                  <select
                    id="country"
                    value={f.country}
                    onChange={(e) => f.setCountry(e.target.value as "US" | "CA")}
                    aria-required="true"
                    className={inputClass}
                  >
                    <option value="US">United States</option>
                    <option value="CA">Canada</option>
                  </select>
                </div>
              </div>
            </fieldset>
          )}
        </form>
      </div>

      {/* Order Summary Sidebar */}
      <div>
        <div className="border-border bg-card rounded-sm border p-8">
          <h2 className="text-foreground text-xs font-semibold tracking-widest uppercase">
            Order Summary
          </h2>

          <div className="mt-6 flex flex-col gap-4">
            {f.items.map((item) => (
              <div
                key={`${item.productId}-${item.variantId}`}
                className="flex gap-4"
              >
                <div className="bg-muted relative h-16 w-16 shrink-0 overflow-hidden rounded-sm">
                  <Image
                    src={item.imageUrl ?? "/placeholder.svg"}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                </div>
                <div className="flex flex-1 items-center justify-between">
                  <div>
                    <p className="text-foreground text-sm font-medium">
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
                  <p className="text-foreground text-sm">
                    {formatPrice(item.price * item.quantity)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="border-border mt-6 border-t pt-6">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-foreground">
                  {formatPrice(f.subtotal)}
                </span>
              </div>
              {f.discountAmount > 0 && f.discountCodeLabel && (
                <div className="flex items-center justify-between text-sm text-green-700">
                  <span>Discount ({f.discountCodeLabel})</span>
                  <span>-{formatPrice(f.discountAmount)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Shipping</span>
                <span className="text-foreground">
                  {f.deliveryMethod === "pickup"
                    ? "In-store pickup (free)"
                    : f.shipping === 0
                      ? "Free"
                      : formatPrice(f.shipping)}
                </span>
              </div>
            </div>
          </div>

          <div className="border-border mt-4 border-t pt-4">
            <div className="flex items-center justify-between">
              <span className="text-foreground font-medium">
                Estimated total
              </span>
              <span className="text-foreground text-lg font-medium">
                {formatPrice(f.finalTotal)}
              </span>
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              Tax and final total are confirmed on Stripe Checkout.
            </p>
          </div>

          <div role="alert" aria-live="assertive" aria-atomic="true">
            {f.error && (
              <Alert variant="destructive" className="mt-4">
                <AlertDescription>{f.error}</AlertDescription>
              </Alert>
            )}
          </div>

          <button
            type="submit"
            form="checkout-form"
            disabled={f.isProcessing}
            aria-busy={f.isProcessing}
            className="bg-primary text-primary-foreground mt-8 flex w-full items-center justify-center gap-2 px-8 py-3 text-sm font-medium tracking-wide transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {f.isProcessing ? (
              <>
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Continue to Payment
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </>
            )}
          </button>

          <p className="text-muted-foreground mt-3 text-center text-xs">
            All transactions are secure and encrypted via Stripe. 100% Secure
            and Encrypted Payments.
          </p>
        </div>
      </div>
    </div>
  );
}
