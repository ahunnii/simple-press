"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import type { DefaultCheckoutPageTemplateProps } from "../../types";
import { cn } from "~/lib/utils";
import { useCheckoutForm } from "~/hooks/use-checkout-form";
import { SHIPPING_TYPES } from "~/lib/shipping-utils";
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
import { COUNTRY_LABELS, type SupportedCountry, getRegionOptions } from "~/lib/geo/regions";

import { NoiseOrderSummary } from "./noise-order-summary";

type CheckoutFormProps = {
  business: DefaultCheckoutPageTemplateProps["business"];
};

/* Shared label style */
const LBL = "font-mono text-[9.5px] tracking-[0.22em] uppercase";
const INP =
  "rounded-none border-border font-sans text-sm focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-foreground";

/* Section heading separator — renders as a <legend> for fieldset grouping */
function SectionHead({ children }: { children: React.ReactNode }) {
  return (
    <legend
      className="float-none mb-5 flex w-full items-center gap-4 border-b pb-3"
      style={{ borderColor: "var(--vn-ink)" }}
    >
      <span
        className="font-mono text-[10px] tracking-[0.28em] uppercase"
        style={{ color: "var(--vn-steel)" }}
      >
        {children}
      </span>
    </legend>
  );
}

export function NoiseCheckoutForm({ business }: CheckoutFormProps) {
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
    setDiscountFieldError,
    handleApplyDiscount,
    isValidatingDiscount,
    isProcessing,
    error,
    handleSubmit,
    shippingConfig,
    items,
    shipping,
    shippingPending,
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

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-6 py-20 text-center">
        <p
          className="font-serif text-2xl italic"
          style={{ color: "var(--vn-steel-mist)" }}
        >
          Nothing to checkout.
        </p>
        <Link href="/shop" className="vn-stamp vn-stamp-solid text-[10px]">
          Shop the Collection →
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={wrappedHandleSubmit}
      className="vn-contact-form flex flex-col gap-0 lg:flex-row lg:gap-12"
    >
      {/* Left — fields */}
      <div className="flex flex-1 flex-col gap-10">
        <p
          className="font-mono text-[9.5px] tracking-[0.14em] uppercase"
          style={{ color: "var(--vn-steel-mist)" }}
        >
          Fields marked * are required
        </p>

        {/* Contact */}
        <fieldset className="flex flex-col gap-5">
          <SectionHead>Contact information</SectionHead>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="email"
                className={LBL}
                style={{ color: "var(--vn-steel)" }}
              >
                Email *
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@frequency.com"
                required
                aria-required="true"
                aria-invalid={submitAttempted && !email ? true : undefined}
                className={INP}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="name"
                className={LBL}
                style={{ color: "var(--vn-steel)" }}
              >
                Full Name *
              </Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="First & last"
                required
                aria-required="true"
                aria-invalid={
                  submitAttempted && !name.trim() ? true : undefined
                }
                className={INP}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor="phone"
              className={LBL}
              style={{ color: "var(--vn-steel)" }}
            >
              Phone *
            </Label>
            <PhoneInput
              id="phone"
              autoComplete="tel"
              value={phone}
              onChange={(val) => setPhone(val)}
              placeholder="+1 313 555 0000"
              required
              aria-required="true"
              aria-invalid={submitAttempted && !phone.trim() ? true : undefined}
            />
          </div>
        </fieldset>

        {/* Discount code */}
        <fieldset className="flex flex-col gap-4">
          <SectionHead>Discount code</SectionHead>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label
                htmlFor="discount-code"
                className={LBL}
                style={{ color: "var(--vn-steel)" }}
              >
                Code
              </Label>
              <Input
                id="discount-code"
                type="text"
                value={discountCodeInput}
                onChange={(e) => {
                  setDiscountCodeInput(e.target.value.toUpperCase());
                  setDiscountFieldError(null);
                }}
                placeholder="VND-SUMMER-26"
                autoComplete="off"
                aria-invalid={!!discountFieldError}
                aria-describedby={
                  discountFieldError ? "discount-code-error" : undefined
                }
                className={cn(INP, "font-mono tracking-[0.1em]")}
              />
            </div>
            <button
              type="button"
              onClick={handleApplyDiscount}
              disabled={isValidatingDiscount || items.length === 0}
              className="vn-stamp hover:bg-foreground hover:text-background flex flex-shrink-0 items-center gap-2 text-[10px] transition-all disabled:opacity-40"
              style={{ padding: "10px 16px" }}
            >
              {isValidatingDiscount ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Checking…
                </>
              ) : discountAmount > 0 ? (
                "Applied ✓"
              ) : (
                "Apply"
              )}
            </button>
          </div>
          {discountFieldError && (
            <p
              id="discount-code-error"
              role="alert"
              className="text-destructive font-mono text-[9.5px] tracking-[0.14em] uppercase"
            >
              {discountFieldError}
            </p>
          )}
          {discountCodeLabel && discountAmount > 0 && (
            <p
              role="status"
              className="font-mono text-[9.5px] tracking-[0.14em] text-green-600 uppercase"
            >
              Code <span className="font-semibold">{discountCodeLabel}</span>{" "}
              applied.
            </p>
          )}
        </fieldset>

        {/* Delivery method */}
        {shippingConfig.offersInStorePickup && (
          <fieldset className="flex flex-col gap-4">
            <SectionHead>Delivery</SectionHead>
            <div className="flex flex-wrap gap-2">
              {(["ship", "pickup"] as const).map((method) => (
                <button
                  key={method}
                  type="button"
                  aria-pressed={deliveryMethod === method}
                  onClick={() => setDeliveryMethod(method)}
                  className="vn-stamp text-[10px] transition-all"
                  style={
                    deliveryMethod === method
                      ? {
                          background: "var(--vn-ink)",
                          color: "var(--vn-bone)",
                          borderColor: "var(--vn-ink)",
                        }
                      : {}
                  }
                >
                  {method === "ship" ? "Ship to address" : "Studio pickup"}
                </button>
              ))}
            </div>
            <p
              className="font-mono text-[9.5px] tracking-[0.14em] uppercase"
              style={{ color: "var(--vn-steel-mist)" }}
            >
              {deliveryMethod === "pickup"
                ? "No shipping charge — contact us for pick-up details."
                : "Shipping cost based on your store's settings."}
            </p>
            {deliveryMethod === "pickup" && (
              <div
                className="flex flex-col gap-1 border p-3"
                style={{ borderColor: "var(--vn-rule)" }}
              >
                <p
                  className="font-mono text-[9.5px] tracking-[0.22em] uppercase"
                  style={{ color: "var(--vn-steel)" }}
                >
                  Pickup location
                </p>
                <p
                  className="font-sans text-sm"
                  style={{ color: "var(--vn-steel)" }}
                >
                  {shippingConfig.pickupLocation ?? business.businessAddress ?? "Pickup details will be confirmed by the store."}
                </p>
                {shippingConfig.pickupInstructions ? (
                  <p
                    className="font-sans text-sm whitespace-pre-line"
                    style={{ color: "var(--vn-steel-mist)" }}
                  >
                    {shippingConfig.pickupInstructions}
                  </p>
                ) : null}
              </div>
            )}
          </fieldset>
        )}

        {/* Shipping address */}
        {deliveryMethod === "ship" && (
          <fieldset className="flex flex-col gap-5">
            <SectionHead>Shipping address</SectionHead>
            <p
              className="-mt-2 font-mono text-[9.5px] tracking-[0.14em] uppercase"
              style={{ color: "var(--vn-steel-mist)" }}
            >
              {shippingConfig.shippingType === SHIPPING_TYPES.ZONE_WEIGHT
                ? "We price shipping from this address. Make changes here before continuing to payment."
                : "Pre-filled at Stripe — you can confirm or edit before paying."}
            </p>

            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="address-line1"
                className={LBL}
                style={{ color: "var(--vn-steel)" }}
              >
                Street address *
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
                className={INP}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="address-line2"
                className={LBL}
                style={{ color: "var(--vn-steel)" }}
              >
                Apt / Suite / Floor
              </Label>
              <Input
                id="address-line2"
                type="text"
                autoComplete="shipping address-line2"
                value={addressLine2}
                onChange={(e) => setAddressLine2(e.target.value)}
                placeholder="Apartment, suite, etc."
                className={INP}
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor="city"
                  className={LBL}
                  style={{ color: "var(--vn-steel)" }}
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
                  placeholder="e.g. Detroit"
                  aria-required="true"
                  aria-invalid={
                    submitAttempted && !city.trim() ? true : undefined
                  }
                  className={INP}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label
                  id="state-label"
                  htmlFor="state"
                  className={LBL}
                  style={{ color: "var(--vn-steel)" }}
                >
                  State / Province *
                </Label>
                <Select
                  value={state}
                  onValueChange={(v) => setState(v)}
                  required
                >
                  <SelectTrigger
                    id="state"
                    className={cn("w-full", INP)}
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

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor="postal"
                  className={LBL}
                  style={{ color: "var(--vn-steel)" }}
                >
                  ZIP / Postal code *
                </Label>
                <Input
                  id="postal"
                  type="text"
                  autoComplete="shipping postal-code"
                  placeholder="e.g. 48207"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  required={deliveryMethod === "ship"}
                  aria-required="true"
                  aria-invalid={
                    submitAttempted && !postalCode.trim() ? true : undefined
                  }
                  className={INP}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label
                  id="country-label"
                  htmlFor="country"
                  className={LBL}
                  style={{ color: "var(--vn-steel)" }}
                >
                  Country *
                </Label>
                <Select
                  value={country}
                  onValueChange={(v) => setCountry(v as SupportedCountry)}
                  required
                >
                  <SelectTrigger
                    id="country"
                    className={cn("w-full", INP)}
                    aria-labelledby="country-label"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allowedCountries.map((c) => (
                      <SelectItem key={c} value={c}>
                        {COUNTRY_LABELS[c]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </fieldset>
        )}
      </div>

      {/* Right — order summary + submit */}
      <div className="mt-10 w-full shrink-0 lg:mt-0 lg:w-[360px]">
        <div className="sticky top-28 flex flex-col gap-5">
          <NoiseOrderSummary
            deliveryMethod={deliveryMethod}
            discountAmount={discountAmount}
            shipping={shipping}
            shippingPending={shippingPending}
            shippingCalculating={shippingCalculating}
          />

          <div role="alert" aria-live="assertive" aria-atomic="true">
            {error && (
              <Alert variant="destructive" className="rounded-none">
                <AlertDescription className="font-mono text-[10px] tracking-[0.14em] uppercase">
                  {error}
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isProcessing || shippingCalculating}
            aria-busy={isProcessing || shippingCalculating}
            className="flex w-full items-center justify-between px-5 py-4 font-mono text-[11px] tracking-[0.24em] uppercase transition-all disabled:opacity-50"
            style={{ background: "var(--vn-ink)", color: "var(--vn-bone)" }}
          >
            <span className="flex items-center gap-2">
              {(isProcessing || shippingCalculating) && (
                <Loader2 className="size-3.5 animate-spin" />
              )}
              {isProcessing
                ? "Processing…"
                : shippingCalculating
                  ? "Calculating shipping…"
                  : "Continue to payment"}
            </span>
            <span>→</span>
          </button>

          {/* Reassurance */}
          <div className="flex flex-col gap-2.5">
            {[
              { ic: "🔒", text: "Encrypted with TLS · Powered by Stripe" },
              { ic: "✦", text: "Ships within five working days" },
              { ic: "↺", text: "14-day exchange on stock pieces" },
            ].map((note) => (
              <div key={note.ic} className="flex items-start gap-2.5">
                <span
                  aria-hidden="true"
                  className="flex flex-shrink-0 items-center justify-center border font-serif italic"
                  style={{
                    width: "22px",
                    height: "22px",
                    borderColor: "var(--vn-rule)",
                    fontSize: "12px",
                  }}
                >
                  {note.ic}
                </span>
                <p
                  className="font-mono text-[9.5px] leading-relaxed tracking-[0.14em] uppercase"
                  style={{ color: "var(--vn-steel-mist)" }}
                >
                  {note.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </form>
  );
}
