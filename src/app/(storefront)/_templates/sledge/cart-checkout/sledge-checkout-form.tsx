"use client";

import { useState } from "react";
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

import { SledgeOrderSummary } from "./sledge-order-summary";

type CheckoutFormProps = {
  business: DefaultCheckoutPageTemplateProps["business"];
};

const LBL =
  "text-xs font-medium uppercase tracking-[0.2em] text-[var(--sl-ink)]";
const INP =
  "rounded-sm border-[var(--sl-border-input)] font-sans text-sm focus-visible:border-[var(--sl-coral)] focus-visible:ring-0 focus-visible:ring-offset-0";

// M-5: use <legend> inside fieldset so AT announces field group name
function SectionHead({ children }: { children: React.ReactNode }) {
  return (
    <legend className="sl-rail-heading font-heading mb-5 w-full border-b border-[var(--sl-border)] pb-3 text-[var(--sl-orange)] uppercase">
      {children}
    </legend>
  );
}

export function SledgeCheckoutForm({ business }: CheckoutFormProps) {
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

  return (
    <form
      onSubmit={wrappedHandleSubmit}
      className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-12"
    >
      <div className="flex min-w-0 flex-col gap-10">
        {/* M-5: required fields notice */}
        <p className="sl-eyebrow font-sans text-xs tracking-[0.12em] uppercase">
          Fields marked * are required
        </p>
        <fieldset className="flex flex-col gap-5">
          <SectionHead>Contact Information</SectionHead>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email" className={LBL}>
                Email *
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
                className={INP}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name" className={LBL}>
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
            <Label htmlFor="phone" className={LBL}>
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

        <fieldset className="flex flex-col gap-4">
          <SectionHead>Discount Code</SectionHead>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="discount-code" className={LBL}>
                Code
              </Label>
              {/* S-6: link input to its error message */}
              <Input
                id="discount-code"
                type="text"
                value={discountCodeInput}
                onChange={(e) => {
                  setDiscountCodeInput(e.target.value.toUpperCase());
                  setDiscountFieldError(null);
                }}
                placeholder="SUMMER-2026"
                autoComplete="off"
                aria-invalid={!!discountFieldError}
                aria-describedby={
                  discountFieldError ? "discount-error" : undefined
                }
                className={cn(INP, "tracking-[0.1em] uppercase")}
              />
            </div>
            <button
              type="button"
              onClick={handleApplyDiscount}
              disabled={isValidatingDiscount || items.length === 0}
              className="sl-btn flex flex-shrink-0 items-center gap-2 text-xs disabled:opacity-40"
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
          {/* S-6: error with id + role="alert"; success with role="status" + green-700 */}
          {discountFieldError ? (
            <p
              id="discount-error"
              role="alert"
              className="text-destructive font-sans text-xs tracking-[0.12em] uppercase"
            >
              {discountFieldError}
            </p>
          ) : null}
          {discountCodeLabel && discountAmount > 0 ? (
            <p
              role="status"
              className="font-sans text-xs tracking-[0.12em] text-green-700 uppercase"
            >
              Code <span className="font-semibold">{discountCodeLabel}</span>{" "}
              applied.
            </p>
          ) : null}
        </fieldset>

        {shippingConfig.offersInStorePickup ? (
          <fieldset className="flex flex-col gap-4">
            <SectionHead>Delivery</SectionHead>
            <div className="flex flex-wrap gap-2">
              {/* S-7: aria-pressed communicates toggle state to AT */}
              {(["ship", "pickup"] as const).map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setDeliveryMethod(method)}
                  aria-pressed={deliveryMethod === method}
                  className={cn(
                    "cursor-pointer px-4 py-2 font-sans text-xs tracking-[0.16em] uppercase transition-all",
                    deliveryMethod === method
                      ? "sl-btn"
                      : "sl-account-tab-inactive",
                  )}
                >
                  {method === "ship" ? "Ship to address" : "Studio pickup"}
                </button>
              ))}
            </div>
            <p className="font-sans text-xs tracking-[0.12em] text-[var(--sl-ink-soft)] uppercase">
              {deliveryMethod === "pickup"
                ? "No shipping charge — contact us for pick-up details."
                : "Shipping cost based on your store's settings."}
            </p>
            {deliveryMethod === "pickup" && (
              <div className="flex flex-col gap-1 border border-[var(--sl-border)] bg-[var(--sl-cream)] p-3">
                <p className="font-sans text-xs font-medium tracking-[0.16em] text-[var(--sl-ink)] uppercase">
                  Pickup location
                </p>
                <p className="font-sans text-sm text-[var(--sl-ink-soft)]">
                  {shippingConfig.pickupLocation ?? business.businessAddress ?? "Pickup details will be confirmed by the store."}
                </p>
                {shippingConfig.pickupInstructions ? (
                  <p className="font-sans text-sm whitespace-pre-line text-[var(--sl-ink-soft)]">{shippingConfig.pickupInstructions}</p>
                ) : null}
              </div>
            )}
          </fieldset>
        ) : null}

        {deliveryMethod === "ship" ? (
          <fieldset className="flex flex-col gap-5">
            <SectionHead>Shipping Address</SectionHead>
            <p className="-mt-2 font-sans text-xs tracking-[0.12em] text-[var(--sl-ink-soft)] uppercase">
              {shippingConfig.shippingType === SHIPPING_TYPES.ZONE_WEIGHT
                ? "We price shipping from this address. Make changes here before continuing to payment."
                : "Pre-filled at Stripe — you can confirm or edit before paying."}
            </p>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="address-line1" className={LBL}>
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
              <Label htmlFor="address-line2" className={LBL}>
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
                <Label htmlFor="city" className={LBL}>
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
                <Label id="state-label" htmlFor="state" className={LBL}>
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
                <Label htmlFor="postal" className={LBL}>
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
                <Label id="country-label" htmlFor="country" className={LBL}>
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
        ) : null}
      </div>

      <aside className="min-w-0">
        <div className="flex flex-col gap-5 lg:sticky lg:top-28">
          <SledgeOrderSummary
            deliveryMethod={deliveryMethod}
            discountAmount={discountAmount}
            shipping={shipping}
            shippingPending={shippingPending}
            shippingCalculating={shippingCalculating}
          />

          <div role="alert" aria-live="assertive" aria-atomic="true">
            {error ? (
              <Alert variant="destructive" className="rounded-sm">
                <AlertDescription className="font-sans text-xs tracking-[0.12em] uppercase">
                  {error}
                </AlertDescription>
              </Alert>
            ) : null}
          </div>

          <button
            type="submit"
            disabled={isProcessing || shippingCalculating}
            aria-busy={isProcessing || shippingCalculating}
            className="sl-btn flex w-full items-center justify-between disabled:opacity-50"
          >
            <span className="flex items-center gap-2">
              {isProcessing || shippingCalculating ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : null}
              {isProcessing
                ? "Processing…"
                : shippingCalculating
                  ? "Calculating shipping…"
                  : "Continue to Payment"}
            </span>
            <span>→</span>
          </button>

          <div className="flex flex-col gap-2.5">
            {[
              { ic: "🔒", text: "Encrypted with TLS · Powered by Stripe" },
              { ic: "✱", text: "Each piece handcrafted with care" },
              { ic: "↺", text: "All sales final — order what you love" },
            ].map((note) => (
              <div key={note.ic} className="flex items-start gap-2.5">
                {/* N-1: decorative glyph */}
                <span
                  aria-hidden="true"
                  className="flex size-[22px] flex-shrink-0 items-center justify-center rounded-sm bg-[var(--sl-cream)] font-sans text-xs text-[var(--sl-coral)]"
                >
                  {note.ic}
                </span>
                <p className="font-sans text-xs leading-relaxed tracking-[0.08em] text-[var(--sl-ink-soft)] uppercase">
                  {note.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </form>
  );
}
