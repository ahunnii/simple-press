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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { PhoneInput } from "~/components/inputs/phone-form-field";
import { COUNTRY_LABELS, type SupportedCountry, getRegionOptions } from "~/lib/geo/regions";

const inputClass =
  "w-full rounded-md border border-gray-300 bg-white text-gray-900 placeholder:text-gray-500 focus:border-[#215935] focus:ring-2 focus:ring-[#215935]/20 focus:outline-none px-3 py-2 text-sm";
const labelClass = "block text-sm font-medium text-gray-900 mb-1";
const sectionHeadingClass =
  "mb-4 text-sm font-medium tracking-wider text-[#2a351f] uppercase";

type Props = {
  business: DefaultCheckoutPageTemplateProps["business"];
};

export function PollenCheckoutForm({ business }: Props) {
  const f = useCheckoutForm(business);

  // Tracks whether the user has attempted to submit — used to derive aria-invalid on required fields.
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // A live shipping rate is actively loading once a destination is entered but
  // the amount isn't known yet — show a spinner and block submit until it lands.
  const shippingCalculating =
    f.deliveryMethod === "ship" && f.state.trim().length > 0 && f.shippingPending;

  const onSubmit = async (e: React.FormEvent) => {
    setSubmitAttempted(true);
    await f.handleSubmit(e);
  };

  if (f.items.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="mb-6 text-gray-600">Your cart is empty</p>
        <Link
          href="/shop"
          className="rounded-md bg-[#215935] px-6 py-2.5 font-semibold text-white hover:bg-[#1a4729]"
        >
          Continue Shopping
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-10 lg:flex-row">
      {/* Left column — form fields */}
      <div className="flex-1 space-y-10">
        <p className="text-sm text-gray-600">Fields marked * are required.</p>
        {/* Contact Information */}
        <section>
          <h2 className={sectionHeadingClass}>Contact Information</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className={labelClass}>
                Email *
              </label>
              <input
                id="email"
                type="email"
                value={f.email}
                onChange={(e) => f.setEmail(e.target.value)}
                placeholder="you@example.com"
                className={inputClass}
                required
                aria-required="true"
                aria-invalid={submitAttempted && !f.email ? true : undefined}
              />
            </div>
            <div>
              <label htmlFor="name" className={labelClass}>
                Full Name *
              </label>
              <input
                id="name"
                type="text"
                value={f.name}
                onChange={(e) => f.setName(e.target.value)}
                placeholder="Jane Doe"
                className={inputClass}
                required
                aria-required="true"
                aria-invalid={
                  submitAttempted && !f.name.trim() ? true : undefined
                }
              />
            </div>
            <div>
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
        </section>

        {/* Discount Code */}
        <section>
          <h2 className={sectionHeadingClass}>Discount Code</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={f.discountCodeInput}
              onChange={(e) =>
                f.setDiscountCodeInput(e.target.value.toUpperCase())
              }
              placeholder="SAVE20"
              autoComplete="off"
              aria-label="Discount code"
              aria-invalid={!!f.discountFieldError}
              aria-describedby={
                f.discountFieldError ? "discount-error" : undefined
              }
              className={`${inputClass} flex-1`}
            />
            <button
              type="button"
              onClick={f.handleApplyDiscount}
              disabled={f.isValidatingDiscount || f.items.length === 0}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {f.isValidatingDiscount ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                "Apply"
              )}
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
        </section>

        {/* Delivery Method */}
        {f.shippingConfig.offersInStorePickup && (
          <section>
            <h2 className={sectionHeadingClass}>Delivery</h2>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => f.setDeliveryMethod("ship")}
                aria-pressed={f.deliveryMethod === "ship"}
                className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  f.deliveryMethod === "ship"
                    ? "bg-[#215935] text-white"
                    : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                Ship to address
              </button>
              <button
                type="button"
                onClick={() => f.setDeliveryMethod("pickup")}
                aria-pressed={f.deliveryMethod === "pickup"}
                className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  f.deliveryMethod === "pickup"
                    ? "bg-[#215935] text-white"
                    : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                In-store pickup
              </button>
            </div>
            <p className="mt-2 text-sm text-gray-600">
              {f.deliveryMethod === "pickup"
                ? "No shipping charge. You'll pick up your order at the store."
                : "Shipping cost is based on your store's shipping settings."}
            </p>
          </section>
        )}

        {/* Shipping Address */}
        {f.deliveryMethod === "ship" && (
          <section>
            <h2 className={sectionHeadingClass}>Shipping Address</h2>
            <p className="mb-4 text-sm text-gray-600">
              {f.shippingConfig.shippingType === SHIPPING_TYPES.ZONE_WEIGHT
                ? "We price shipping from this address. Make changes here before continuing to payment."
                : "This is sent to Stripe Checkout prefilled so you can confirm or edit your name, phone, and address before paying."}
            </p>
            <div className="space-y-4">
              <div>
                <label htmlFor="address-line1" className={labelClass}>
                  Address line 1 *
                </label>
                <input
                  id="address-line1"
                  type="text"
                  autoComplete="shipping address-line1"
                  value={f.addressLine1}
                  onChange={(e) => f.setAddressLine1(e.target.value)}
                  placeholder="Street address, P.O. box"
                  className={inputClass}
                  required={f.deliveryMethod === "ship"}
                  aria-required="true"
                  aria-invalid={
                    submitAttempted && !f.addressLine1.trim() ? true : undefined
                  }
                />
              </div>
              <div>
                <label htmlFor="address-line2" className={labelClass}>
                  Address line 2
                </label>
                <input
                  id="address-line2"
                  type="text"
                  autoComplete="shipping address-line2"
                  value={f.addressLine2}
                  onChange={(e) => f.setAddressLine2(e.target.value)}
                  placeholder="Apartment, suite, etc."
                  className={inputClass}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="city" className={labelClass}>
                    City *
                  </label>
                  <input
                    id="city"
                    type="text"
                    autoComplete="shipping address-level2"
                    value={f.city}
                    onChange={(e) => f.setCity(e.target.value)}
                    className={inputClass}
                    required={f.deliveryMethod === "ship"}
                    aria-required="true"
                    aria-invalid={
                      submitAttempted && !f.city.trim() ? true : undefined
                    }
                  />
                </div>
                <div>
                  <label
                    id="state-label"
                    htmlFor="state"
                    className={labelClass}
                  >
                    State / Province *
                  </label>
                  <Select
                    value={f.state}
                    onValueChange={(v) => f.setState(v)}
                  >
                    <SelectTrigger
                      id="state"
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#215935] focus:ring-2 focus:ring-[#215935]/20 focus:outline-none"
                      aria-labelledby="state-label"
                      aria-required="true"
                      aria-invalid={
                        submitAttempted && !f.state ? true : undefined
                      }
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
                  <label htmlFor="postal" className={labelClass}>
                    ZIP / Postal code *
                  </label>
                  <input
                    id="postal"
                    type="text"
                    autoComplete="shipping postal-code"
                    value={f.postalCode}
                    onChange={(e) => f.setPostalCode(e.target.value)}
                    className={inputClass}
                    required={f.deliveryMethod === "ship"}
                    aria-required="true"
                    aria-invalid={
                      submitAttempted && !f.postalCode.trim() ? true : undefined
                    }
                  />
                </div>
                <div>
                  <label
                    id="country-label"
                    htmlFor="country"
                    className={labelClass}
                  >
                    Country *
                  </label>
                  <Select
                    value={f.country}
                    onValueChange={(v) => f.setCountry(v as SupportedCountry)}
                  >
                    <SelectTrigger
                      id="country"
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#215935] focus:ring-2 focus:ring-[#215935]/20 focus:outline-none"
                      aria-labelledby="country-label"
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
            </div>
          </section>
        )}
      </div>

      {/* Right column — Order Summary */}
      <div className="w-full shrink-0 lg:w-96">
        <div className="sticky top-24 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-base font-bold text-gray-900">
            Order Summary
          </h2>

          {/* Items */}
          <div className="max-h-64 space-y-4 overflow-y-auto">
            {f.items.map((item) => (
              <div
                key={`${item.productId}-${item.variantId}`}
                className="flex items-center gap-3"
              >
                <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.productName}
                      fill
                      className="object-cover"
                      sizes="56px"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center text-xs text-gray-400">
                      No img
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {item.productName}
                  </p>
                  {item.variantName && (
                    <p className="text-xs text-gray-500">{item.variantName}</p>
                  )}
                  <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {formatPrice(item.price * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="mt-5 space-y-2 border-t border-gray-200 pt-5">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span className="text-gray-900">{formatPrice(f.subtotal)}</span>
            </div>
            {f.discountAmount > 0 && f.discountCodeLabel && (
              <div className="flex justify-between text-sm text-green-700">
                <span>Discount ({f.discountCodeLabel})</span>
                <span>-{formatPrice(f.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Shipping</span>
              <span className="text-gray-900">
                {f.deliveryMethod === "pickup" ? (
                  "In-store pickup (free)"
                ) : shippingCalculating ? (
                  <span
                    className="inline-flex items-center gap-1.5 text-gray-500"
                    aria-live="polite"
                  >
                    <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
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
            <div className="flex justify-between border-t border-gray-200 pt-3">
              <span className="font-semibold text-gray-900">
                Estimated total
              </span>
              <span className="text-lg font-bold text-gray-900">
                {formatPrice(f.finalTotal)}
              </span>
            </div>
            <p className="text-xs text-gray-500">
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
            disabled={f.isProcessing || shippingCalculating}
            aria-busy={f.isProcessing || shippingCalculating}
            className="mt-5 w-full rounded-md bg-[#215935] px-6 py-3 font-semibold text-white transition-colors hover:bg-[#1a4729] disabled:opacity-50"
          >
            {f.isProcessing ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Processing...
              </span>
            ) : shippingCalculating ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Calculating shipping…
              </span>
            ) : (
              "Continue to Payment"
            )}
          </button>

          <p className="mt-3 text-center text-xs text-gray-500">
            All transactions are secure and encrypted via Stripe. 100% Secure
            and Encrypted Payments.
          </p>
        </div>
      </div>
    </form>
  );
}
