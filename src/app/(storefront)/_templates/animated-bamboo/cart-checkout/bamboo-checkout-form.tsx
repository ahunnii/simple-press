"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import type { DefaultCheckoutPageTemplateProps } from "../../types";
import type { SupportedCountry } from "~/lib/geo/regions";
import { COUNTRY_LABELS, getRegionOptions } from "~/lib/geo/regions";
import { formatPrice } from "~/lib/prices";
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
import { CartLineOptions } from "~/components/customizer/cart-line-options";
import { cartItemId } from "~/providers/cart-context";
import { CheckoutMarketingOptIn } from "~/app/(storefront)/_components/checkout/checkout-marketing-opt-in";
import { CheckoutTermsNotice } from "~/app/(storefront)/_components/checkout/checkout-terms-notice";
import {
  applySavedAddressToForm,
  SavedAddressPicker,
} from "~/app/(storefront)/_components/checkout/saved-address-picker";

import { BambooGlyph } from "../shared/bamboo-glyph";

type CheckoutFormProps = {
  business: DefaultCheckoutPageTemplateProps["business"];
  merchantPolicies: DefaultCheckoutPageTemplateProps["merchantPolicies"];
};

/* ─────────────────────────────────────────────────────────────────────────
   Bamboo styling constants. These are passed to the shadcn primitives via
   `className` (never `style`), so the components' own `focus-visible:` and
   `aria-invalid:` rules — which carry higher specificity — still win when a
   field is focused or invalid. Error/focus affordances are untouched.
   ───────────────────────────────────────────────────────────────────────── */

/** Warm paper fill + sage-deep 2px rule, the mockup's form language. */
const FIELD_CLASS =
  "h-11 rounded-xl border-2 border-[var(--bamboo-sage-deep)] bg-[var(--bamboo-paper)] px-4 text-[var(--bamboo-ink)] shadow-none";

/** Same, for the Radix Select triggers (their height is a `data-size` variant). */
const TRIGGER_CLASS = cn(
  FIELD_CLASS,
  "w-full justify-between data-[size=default]:h-11",
);

/**
 * `PhoneInput` forwards `className` to its wrapper `<div>`, not the inner
 * control, so the country button + number input are reached with child
 * selectors. `border-r-0` is restored on the button so the two halves keep
 * sharing one seam.
 */
const PHONE_CLASS = cn(
  "[&>button]:h-11 [&>button]:rounded-s-xl [&>button]:rounded-e-none [&>button]:border-2 [&>button]:border-r-0 [&>button]:border-[var(--bamboo-sage-deep)] [&>button]:bg-[var(--bamboo-paper)]",
  "[&_input]:h-11 [&_input]:rounded-s-none [&_input]:rounded-e-xl [&_input]:border-2 [&_input]:border-[var(--bamboo-sage-deep)] [&_input]:bg-[var(--bamboo-paper)] [&_input]:px-4 [&_input]:shadow-none",
);

const LABEL_CLASS = "text-[0.92rem] font-medium text-[var(--bamboo-ink-soft)]";

const LEGEND_CLASS =
  "font-heading pb-4 text-xl font-semibold text-[var(--bamboo-pine)]";

const HELP_CLASS = "text-sm text-[var(--bamboo-muted)]";

/**
 * Perforated tear rule, same dash rhythm as `.bamboo-torn-card::before`.
 * Inline rather than a Tailwind arbitrary value because `color-mix()` must
 * never appear inside one (F1 build-report convention).
 */
const PERFORATION_RULE: React.CSSProperties = {
  backgroundImage:
    "repeating-linear-gradient(90deg, color-mix(in srgb, var(--bamboo-core-tan) 55%, transparent) 0 7px, transparent 7px 15px)",
};

export function CheckoutForm({
  business,
  merchantPolicies,
}: CheckoutFormProps) {
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
    deliveryOptions,
    needsAddress,
    addressLocked,
    localDelivery,
    couponsEnabled,
    discountCodeInput,
    setDiscountCodeInput,
    discountAmount,
    discountFreeShipping,
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
    termsDisclosure,
    marketingOptInEnabled,
    acceptsMarketing,
    setAcceptsMarketing,
  } = useCheckoutForm(business, merchantPolicies);

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
      <div className="py-16 text-center">
        <p className="mb-6 text-[1.05rem] text-[var(--bamboo-ink-soft)]">
          Your cart is empty
        </p>
        <Link href="/shop" className={cn("bamboo-btn", "bamboo-btn-primary")}>
          Continue Shopping
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={wrappedHandleSubmit}
      className="flex flex-col gap-8 lg:flex-row"
    >
      <div className="flex flex-1 flex-col gap-6">
        {/* M-7: required field explanation */}
        <p className={HELP_CLASS}>Fields marked with * are required.</p>

        <div className="bamboo-torn-card">
          <fieldset className="flex flex-col gap-4">
            <legend className={LEGEND_CLASS}>Contact Information</legend>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email" className={LABEL_CLASS}>
                  Email *
                </Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  className={FIELD_CLASS}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  aria-required="true"
                  aria-invalid={submitAttempted && !email ? true : undefined}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name" className={LABEL_CLASS}>
                  Full Name *
                </Label>
                <Input
                  id="name"
                  type="text"
                  autoComplete="name"
                  className={FIELD_CLASS}
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
                <Label htmlFor="phone" className={LABEL_CLASS}>
                  Phone *
                </Label>
                <PhoneInput
                  id="phone"
                  autoComplete="tel"
                  className={PHONE_CLASS}
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
        </div>

        {couponsEnabled && (
          <div className="bamboo-torn-card">
            <fieldset className="flex flex-col gap-3">
              <legend className={cn(LEGEND_CLASS, "pb-2")}>
                Discount code
              </legend>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="flex flex-1 flex-col gap-1.5">
                  <Label htmlFor="discount-code" className={LABEL_CLASS}>
                    Code
                  </Label>
                  <Input
                    id="discount-code"
                    type="text"
                    className={FIELD_CLASS}
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
                <button
                  type="button"
                  className={cn(
                    "bamboo-chip",
                    "min-h-11 justify-center disabled:opacity-50",
                  )}
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
                </button>
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
                <p className="text-sm text-[var(--bamboo-pine)]" role="status">
                  Code{" "}
                  <span className="font-mono font-semibold">
                    {discountCodeLabel}
                  </span>{" "}
                  applied.
                </p>
              )}
              {discountCodeLabel && discountFreeShipping && (
                <p className="text-sm text-[var(--bamboo-pine)]" role="status">
                  Free shipping applied:{" "}
                  <span className="font-mono font-semibold">
                    {discountCodeLabel}
                  </span>
                </p>
              )}
            </fieldset>
          </div>
        )}

        {deliveryOptions.length > 1 && (
          <div className="bamboo-torn-card">
            <fieldset className="flex flex-col gap-3">
              <legend className={cn(LEGEND_CLASS, "pb-2")}>Delivery</legend>
              <div className="flex flex-wrap gap-2">
                {deliveryOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={cn("bamboo-chip", "min-h-11")}
                    aria-pressed={deliveryMethod === option.id}
                    onClick={() => setDeliveryMethod(option.id)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <p className={HELP_CLASS}>
                {deliveryOptions.find((o) => o.id === deliveryMethod)
                  ?.description ?? ""}
              </p>
              {deliveryMethod === "pickup" && (
                <div className="rounded-2xl bg-[var(--bamboo-sage)] p-4 text-sm">
                  <p className="font-medium text-[var(--bamboo-pine)]">
                    Pickup location
                  </p>
                  <p className="mt-0.5 text-[var(--bamboo-ink-soft)]">
                    {shippingConfig.pickupLocation ??
                      business.businessAddress ??
                      "Pickup details will be confirmed by the store."}
                  </p>
                  {shippingConfig.pickupInstructions ? (
                    <p className="mt-1 whitespace-pre-line text-[var(--bamboo-ink-soft)]">
                      {shippingConfig.pickupInstructions}
                    </p>
                  ) : null}
                </div>
              )}
              {deliveryMethod === "delivery" && (
                <>
                  <div aria-live="polite">
                    {localDelivery.status === "checking" ? (
                      <p className={HELP_CLASS}>Checking your ZIP…</p>
                    ) : localDelivery.status === "ineligible" &&
                      localDelivery.message ? (
                      <p className="text-destructive text-sm">
                        {localDelivery.message}
                      </p>
                    ) : localDelivery.status === "eligible" ? (
                      <p className="text-sm text-[var(--bamboo-pine)]">
                        Great — we deliver to you.
                      </p>
                    ) : null}
                  </div>
                  {localDelivery.instructions ? (
                    <div className="rounded-2xl bg-[var(--bamboo-sage)] p-4 text-sm">
                      <p className="font-medium text-[var(--bamboo-pine)]">
                        Delivery details
                      </p>
                      <p className="mt-1 whitespace-pre-line text-[var(--bamboo-ink-soft)]">
                        {localDelivery.instructions}
                      </p>
                    </div>
                  ) : null}
                </>
              )}
            </fieldset>
          </div>
        )}

        {needsAddress && (
          <div className="bamboo-torn-card">
            <fieldset className="flex flex-col gap-4">
              <legend className={LEGEND_CLASS}>
                {deliveryMethod === "delivery"
                  ? "Delivery address"
                  : "Shipping Address"}
              </legend>
              <p className={HELP_CLASS}>
                {addressLocked
                  ? deliveryMethod === "delivery"
                    ? "We check delivery from this address. Make changes here before continuing to payment."
                    : "We price shipping from this address. Make changes here before continuing to payment."
                  : "This is sent to Stripe Checkout prefilled so you can confirm or edit your name, phone, and address before paying."}
              </p>
              <SavedAddressPicker
                className="text-[var(--bamboo-ink)]"
                accentColor="var(--bamboo-pine)"
                onSelect={(address) =>
                  applySavedAddressToForm(
                    {
                      setName,
                      setPhone,
                      setAddressLine1,
                      setAddressLine2,
                      setCity,
                      setState,
                      setPostalCode,
                      setCountry,
                      allowedCountries,
                    },
                    address,
                  )
                }
              />
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="address-line1" className={LABEL_CLASS}>
                    Address line 1 *
                  </Label>
                  <Input
                    id="address-line1"
                    type="text"
                    autoComplete="shipping address-line1"
                    className={FIELD_CLASS}
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                    placeholder="Street address, P.O. box"
                    required={needsAddress}
                    aria-required="true"
                    aria-invalid={
                      submitAttempted && !addressLine1.trim() ? true : undefined
                    }
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="address-line2" className={LABEL_CLASS}>
                    Address line 2
                  </Label>
                  <Input
                    id="address-line2"
                    type="text"
                    autoComplete="shipping address-line2"
                    className={FIELD_CLASS}
                    value={addressLine2}
                    onChange={(e) => setAddressLine2(e.target.value)}
                    placeholder="Apartment, suite, etc."
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="city" className={LABEL_CLASS}>
                      City *
                    </Label>
                    <Input
                      id="city"
                      type="text"
                      autoComplete="shipping address-level2"
                      className={FIELD_CLASS}
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      required={needsAddress}
                      aria-required="true"
                      aria-invalid={
                        submitAttempted && !city.trim() ? true : undefined
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label
                      id="state-label"
                      htmlFor="state"
                      className={LABEL_CLASS}
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
                        className={TRIGGER_CLASS}
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
                    <Label htmlFor="postal" className={LABEL_CLASS}>
                      ZIP / Postal code *
                    </Label>
                    <Input
                      id="postal"
                      type="text"
                      autoComplete="shipping postal-code"
                      className={FIELD_CLASS}
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      required={needsAddress}
                      aria-required="true"
                      aria-invalid={
                        submitAttempted && !postalCode.trim() ? true : undefined
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label
                      id="country-label"
                      htmlFor="country"
                      className={LABEL_CLASS}
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
                        className={TRIGGER_CLASS}
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
          </div>
        )}
      </div>

      {/* Order Summary */}
      <div className="w-full shrink-0 lg:w-80">
        <div className="bamboo-torn-card sticky top-24">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-heading text-xl font-semibold text-[var(--bamboo-pine)]">
              Order Summary
            </h2>
            <BambooGlyph
              id="s-wreath"
              className="w-[40px] shrink-0 opacity-80"
            />
          </div>
          <div className="mt-5 flex flex-col gap-4">
            <div className="max-h-64 space-y-3 overflow-y-auto">
              {items.map((item) => (
                <div key={cartItemId(item)} className="flex items-center gap-3">
                  <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-[var(--bamboo-paper)] ring-2 ring-[var(--bamboo-outline)]">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.productName}
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center text-xs text-[var(--bamboo-muted)]">
                        No img
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[var(--bamboo-ink)]">
                      {item.productName}
                    </p>
                    {item.variantName && (
                      <p className="text-xs text-[var(--bamboo-ink-soft)]">
                        {item.variantName}
                      </p>
                    )}
                    <CartLineOptions
                      item={item}
                      showPrices={false}
                      className="text-[var(--bamboo-ink-soft)]"
                    />
                    <p className="text-xs text-[var(--bamboo-muted)]">
                      Qty: {item.quantity}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-[var(--bamboo-ink)]">
                    {formatPrice(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <div
                aria-hidden="true"
                className="mb-4 h-[3px] rounded-sm"
                style={PERFORATION_RULE}
              />
              <div className="flex justify-between text-sm">
                <span className="text-[var(--bamboo-ink-soft)]">Subtotal</span>
                <span className="text-[var(--bamboo-ink)]">
                  {formatPrice(subtotal)}
                </span>
              </div>
              {discountAmount > 0 && discountCodeLabel && (
                <div className="flex justify-between text-sm text-[var(--bamboo-pine)]">
                  <span>Discount ({discountCodeLabel})</span>
                  <span>-{formatPrice(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-[var(--bamboo-ink-soft)]">
                  {deliveryMethod === "delivery" ? "Delivery" : "Shipping"}
                </span>
                <span className="text-[var(--bamboo-ink)]">
                  {deliveryMethod === "pickup" ? (
                    "In-store pickup (free)"
                  ) : shippingCalculating ? (
                    <span
                      className="inline-flex items-center gap-1.5 text-[var(--bamboo-muted)]"
                      aria-live="polite"
                    >
                      <Loader2
                        className="size-3.5 animate-spin"
                        aria-hidden="true"
                      />
                      Calculating…
                    </span>
                  ) : deliveryMethod === "delivery" && shippingPending ? (
                    localDelivery.status === "checking" ? (
                      "Calculating…"
                    ) : (
                      "Enter your ZIP"
                    )
                  ) : deliveryMethod === "delivery" &&
                    localDelivery.status === "ineligible" ? (
                    "Not available"
                  ) : shippingPending ? (
                    "Calculated at checkout"
                  ) : shipping === 0 ? (
                    "Free"
                  ) : (
                    formatPrice(shipping)
                  )}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-3 border-t border-[var(--bamboo-outline)] pt-3">
                <span className="font-heading font-semibold text-[var(--bamboo-pine)]">
                  Estimated total
                </span>
                <span className="bamboo-price">{formatPrice(finalTotal)}</span>
              </div>
              <p className="text-xs text-[var(--bamboo-muted)]">
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

            <CheckoutMarketingOptIn
              enabled={marketingOptInEnabled}
              checked={acceptsMarketing}
              onCheckedChange={setAcceptsMarketing}
              businessName={business.name}
              className="flex items-start gap-2 text-left text-xs text-[var(--bamboo-muted)]"
              inputClassName="mt-0.5 size-4 shrink-0 accent-[var(--bamboo-pine)]"
            />

            <Button
              type="submit"
              disabled={isProcessing || shippingCalculating}
              aria-busy={isProcessing || shippingCalculating}
              className={cn(
                "bamboo-btn",
                "bamboo-btn-primary",
                "h-auto w-full justify-center",
              )}
              size="lg"
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

            <CheckoutTermsNotice
              disclosure={termsDisclosure}
              className="text-center text-xs text-[var(--bamboo-muted)]"
              linkClassName="underline hover:text-[var(--bamboo-pine)]"
            />

            <p className="text-center text-xs text-[var(--bamboo-muted)]">
              All transactions are secure and encrypted via Stripe. 100% Secure
              and Encrypted Payments.
            </p>
          </div>
        </div>
      </div>
    </form>
  );
}
