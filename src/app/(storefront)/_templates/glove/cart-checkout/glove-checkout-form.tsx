"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import type { DefaultCheckoutPageTemplateProps } from "../../types";
import type { SupportedCountry } from "~/lib/geo/regions";
import { COUNTRY_LABELS, getRegionOptions } from "~/lib/geo/regions";
import { fieldAttr } from "~/lib/preview/section-attrs";
import { SHIPPING_TYPES } from "~/lib/shipping-utils";
import { cn } from "~/lib/utils";
import { useCheckoutForm } from "~/hooks/use-checkout-form";
import { PhoneInput } from "~/components/inputs/phone-form-field";
import { useCart } from "~/providers/cart-context";
import { useStorefrontFlags } from "~/providers/feature-flags-context";
import { CheckoutTermsNotice } from "~/app/(storefront)/_components/checkout/checkout-terms-notice";
import {
  applySavedAddressToForm,
  SavedAddressPicker,
} from "~/app/(storefront)/_components/checkout/saved-address-picker";

import { GloveButton } from "../shared/glove-button";
import { GloveHandIcon } from "../shared/glove-hand-icon";
import { GloveInput, GloveSelect } from "../shared/glove-input";
import { GloveMistPanel } from "../shared/glove-mist-panel";
import { GloveField } from "./glove-field";
import { GloveOrderSummary } from "./glove-order-summary";

type GloveCheckoutFormProps = {
  business: DefaultCheckoutPageTemplateProps["business"];
  merchantPolicies: DefaultCheckoutPageTemplateProps["merchantPolicies"];
  detailsHeading: string;
  deliveryHeading: string;
  shippingHeading: string;
  discountHeading: string;
  summaryHeading: string;
  submitLabel: string;
  taxNote: string;
  secureNote: string;
  emptyHeading: string;
  emptyCta: string;
};

/** Sizes `PhoneInput`'s country button and input to match `glove-input`. */
const PHONE_CLASS =
  "[&>button]:h-auto [&>button]:min-h-11 [&>button]:self-stretch [&>input]:h-11 [&>input]:text-[15px]";

const SECTION_HEADING =
  "glove-display text-[22px] leading-tight font-medium text-[var(--glove-ink)] md:text-[24px]";

/**
 * Checkout form on `useCheckoutForm` (contact, delivery method, saved
 * addresses, discount code, shipping quote, Stripe hand-off): a two-column
 * billing form beside the "Your order" mist card. The form is never inside a
 * reveal.
 */
export function GloveCheckoutForm({
  business,
  merchantPolicies,
  detailsHeading,
  deliveryHeading,
  shippingHeading,
  discountHeading,
  summaryHeading,
  submitLabel,
  taxNote,
  secureNote,
  emptyHeading,
  emptyCta,
}: GloveCheckoutFormProps) {
  const { isHydrated } = useCart();
  const { isEnabled } = useStorefrontFlags();
  const form = useCheckoutForm(business, merchantPolicies);
  const {
    deliveryMethod,
    shippingConfig,
    state,
    shippingPending,
    discountFieldError,
    discountCodeLabel,
    discountAmount,
  } = form;

  // Tracks whether the shopper has tried to submit, to derive aria-invalid.
  const [submitAttempted, setSubmitAttempted] = useState(false);

  if (!isHydrated) {
    return (
      <div
        aria-hidden="true"
        className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_440px]"
      >
        <div className="flex flex-col gap-4">
          {[0, 1, 2, 3].map((n) => (
            <div key={n} className="h-11 bg-[var(--glove-cloud)]" />
          ))}
        </div>
        <div className="h-[360px] rounded-[var(--glove-radius-panel)] bg-[var(--glove-mist)]" />
      </div>
    );
  }

  if (form.items.length === 0) {
    return (
      <GloveMistPanel className="mx-auto flex max-w-2xl flex-col items-center gap-4 px-6 py-14 text-center md:py-20">
        <GloveHandIcon className="size-20 text-[var(--glove-primary)]" />
        <h2
          className="glove-display text-[24px] leading-tight font-medium text-[var(--glove-ink)] md:text-[30px]"
          {...fieldAttr("glove.checkout.empty-heading")}
        >
          {emptyHeading}
        </h2>
        {isEnabled("products") && emptyCta ? (
          <GloveButton href="/shop" variant="woo" className="mt-2">
            <span {...fieldAttr("glove.checkout.empty-cta")}>{emptyCta}</span>
          </GloveButton>
        ) : null}
      </GloveMistPanel>
    );
  }

  // A live rate is loading once a destination is entered but unquoted.
  const shippingCalculating =
    deliveryMethod === "ship" && state.trim().length > 0 && shippingPending;
  // Zone + weight stores lock the address into the payment step (it prices
  // shipping), so the helper copy has to say so.
  const isZoneWeightShipping =
    shippingConfig.shippingType === SHIPPING_TYPES.ZONE_WEIGHT;

  const invalid = (isEmpty: boolean) =>
    submitAttempted && isEmpty ? true : undefined;

  const handleSubmitWithAttempt = async (e: React.FormEvent) => {
    setSubmitAttempted(true);
    await form.handleSubmit(e);
  };

  return (
    <form
      onSubmit={handleSubmitWithAttempt}
      className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_440px] lg:items-start lg:gap-14"
    >
      <div className="flex min-w-0 flex-col gap-10">
        {/* ── Contact details ───────────────────────────────────────── */}
        <section aria-labelledby="glove-co-details-heading">
          <h2
            id="glove-co-details-heading"
            className={SECTION_HEADING}
            {...fieldAttr("glove.checkout.details-heading")}
          >
            {detailsHeading}
          </h2>
          <p className="mt-2 text-[14px] text-[var(--glove-muted)]">
            Fields marked with <span aria-hidden="true">*</span>
            <span className="sr-only">an asterisk</span> are required.
          </p>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <GloveField id="glove-co-name" label="Full name" required>
              <GloveInput
                id="glove-co-name"
                type="text"
                autoComplete="name"
                value={form.name}
                onChange={(e) => form.setName(e.target.value)}
                required
                aria-required="true"
                aria-invalid={invalid(!form.name.trim())}
              />
            </GloveField>
            <GloveField id="glove-co-phone" label="Phone" required>
              {/* `.glove-account` maps the shadcn variables PhoneInput reads onto glove tokens. */}
              <div className="glove-account">
                <PhoneInput
                  id="glove-co-phone"
                  className={PHONE_CLASS}
                  autoComplete="tel"
                  placeholder="+1 555 123 4567"
                  value={form.phone}
                  onChange={(value) => form.setPhone(value)}
                  required
                  aria-required="true"
                  aria-invalid={invalid(!form.phone.trim())}
                />
              </div>
            </GloveField>
            <GloveField
              id="glove-co-email"
              label="Email"
              required
              className="sm:col-span-2"
            >
              <GloveInput
                id="glove-co-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => form.setEmail(e.target.value)}
                required
                aria-required="true"
                aria-invalid={invalid(!form.email.trim())}
              />
            </GloveField>
          </div>
        </section>

        {/* ── Discount code ─────────────────────────────────────────── */}
        {form.couponsEnabled ? (
          <section aria-labelledby="glove-co-discount-heading">
            <h2
              id="glove-co-discount-heading"
              className={SECTION_HEADING}
              {...fieldAttr("glove.checkout.discount-heading")}
            >
              {discountHeading}
            </h2>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start">
              <div className="flex-1">
                <label htmlFor="glove-co-discount" className="sr-only">
                  Discount code
                </label>
                <GloveInput
                  id="glove-co-discount"
                  type="text"
                  autoComplete="off"
                  placeholder="Discount code"
                  value={form.discountCodeInput}
                  onChange={(e) => {
                    form.setDiscountCodeInput(e.target.value.toUpperCase());
                    form.setDiscountFieldError(null);
                  }}
                  onKeyDown={(e) => {
                    // Enter applies the code; it must not submit the order form.
                    if (e.key === "Enter") {
                      e.preventDefault();
                      form.handleApplyDiscount();
                    }
                  }}
                  aria-invalid={discountFieldError ? true : undefined}
                  aria-describedby={
                    discountFieldError ? "glove-co-discount-error" : undefined
                  }
                />
              </div>
              <GloveButton
                variant="wooOutline"
                onClick={form.handleApplyDiscount}
                disabled={
                  form.isValidatingDiscount ||
                  form.items.length === 0 ||
                  !form.discountCodeInput.trim()
                }
                className="sm:min-h-11"
              >
                {form.isValidatingDiscount ? (
                  <>
                    <Loader2
                      className="size-4 animate-spin motion-reduce:animate-none"
                      aria-hidden="true"
                    />
                    Checking…
                  </>
                ) : (
                  "Apply coupon"
                )}
              </GloveButton>
            </div>
            {discountFieldError ? (
              <p
                id="glove-co-discount-error"
                role="alert"
                className="glove-error mt-2"
              >
                {discountFieldError}
              </p>
            ) : null}
            {discountCodeLabel && discountAmount > 0 ? (
              <p role="status" className="glove-success mt-2 text-[14px]">
                Code <strong>{discountCodeLabel}</strong> applied.
              </p>
            ) : null}
          </section>
        ) : null}

        {/* ── Delivery method (only when the store offers pickup) ───── */}
        {shippingConfig.offersInStorePickup ? (
          <section>
            <h2
              id="glove-co-delivery-heading"
              className={SECTION_HEADING}
              {...fieldAttr("glove.checkout.delivery-heading")}
            >
              {deliveryHeading}
            </h2>
            <div
              role="radiogroup"
              aria-labelledby="glove-co-delivery-heading"
              className="mt-4 grid gap-3 sm:grid-cols-2"
            >
              {(
                [
                  { value: "ship", label: "Ship to address" },
                  { value: "pickup", label: "In-store pickup" },
                ] as const
              ).map((option) => (
                <label
                  key={option.value}
                  className={cn(
                    "glove-body flex min-h-11 cursor-pointer items-center gap-3 rounded-[var(--glove-radius-card)] border px-4 py-3 text-[15px] font-bold text-[var(--glove-ink)] transition-colors",
                    deliveryMethod === option.value
                      ? "border-[var(--glove-primary)] bg-[var(--glove-mist)]"
                      : "border-[var(--glove-line)] hover:border-[var(--glove-muted)]",
                  )}
                >
                  <input
                    type="radio"
                    name="glove-co-delivery"
                    value={option.value}
                    checked={deliveryMethod === option.value}
                    onChange={() => form.setDeliveryMethod(option.value)}
                    className="size-4 accent-[var(--glove-primary)]"
                  />
                  {option.label}
                </label>
              ))}
            </div>
            <p className="mt-3 text-[14px] text-[var(--glove-muted)]">
              {deliveryMethod === "pickup"
                ? "No shipping charge. You'll pick up your order at the store."
                : "Shipping cost is based on the store's shipping settings."}
            </p>
            {deliveryMethod === "pickup" ? (
              <div className="mt-3 rounded-[var(--glove-radius-card)] border border-[var(--glove-mist-line)] bg-[var(--glove-mist)] p-4 text-[14px]">
                <p className="font-bold text-[var(--glove-ink)]">
                  Pickup location
                </p>
                <p className="mt-0.5 whitespace-pre-line text-[var(--glove-text)]">
                  {shippingConfig.pickupLocation ??
                    business.businessAddress ??
                    "Pickup details will be confirmed by the store."}
                </p>
                {shippingConfig.pickupInstructions ? (
                  <p className="mt-1 whitespace-pre-line text-[var(--glove-text)]">
                    {shippingConfig.pickupInstructions}
                  </p>
                ) : null}
              </div>
            ) : null}
          </section>
        ) : null}

        {/* ── Shipping address ──────────────────────────────────────── */}
        {deliveryMethod === "ship" ? (
          <section aria-labelledby="glove-co-shipping-heading">
            <h2
              id="glove-co-shipping-heading"
              className={SECTION_HEADING}
              {...fieldAttr("glove.checkout.shipping-heading")}
            >
              {shippingHeading}
            </h2>
            <p className="mt-2 text-[14px] text-[var(--glove-muted)]">
              {isZoneWeightShipping
                ? "We price shipping from this address. Make changes here before continuing to payment."
                : "You can confirm or edit your name, phone and address again on the payment page."}
            </p>
            <SavedAddressPicker
              className="mt-4 text-[var(--glove-ink)]"
              accentColor="var(--glove-primary)"
              onSelect={(address) =>
                applySavedAddressToForm(
                  {
                    setName: form.setName,
                    setPhone: form.setPhone,
                    setAddressLine1: form.setAddressLine1,
                    setAddressLine2: form.setAddressLine2,
                    setCity: form.setCity,
                    setState: form.setState,
                    setPostalCode: form.setPostalCode,
                    setCountry: form.setCountry,
                    allowedCountries: form.allowedCountries,
                  },
                  address,
                )
              }
            />
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <GloveField
                id="glove-co-line1"
                label="Address line 1"
                required
                className="sm:col-span-2"
              >
                <GloveInput
                  id="glove-co-line1"
                  type="text"
                  autoComplete="shipping address-line1"
                  placeholder="Street address, P.O. box"
                  value={form.addressLine1}
                  onChange={(e) => form.setAddressLine1(e.target.value)}
                  required
                  aria-required="true"
                  aria-invalid={invalid(!form.addressLine1.trim())}
                />
              </GloveField>
              <GloveField
                id="glove-co-line2"
                label="Address line 2"
                className="sm:col-span-2"
              >
                <GloveInput
                  id="glove-co-line2"
                  type="text"
                  autoComplete="shipping address-line2"
                  placeholder="Apartment, suite, etc."
                  value={form.addressLine2}
                  onChange={(e) => form.setAddressLine2(e.target.value)}
                />
              </GloveField>
              <GloveField id="glove-co-city" label="City" required>
                <GloveInput
                  id="glove-co-city"
                  type="text"
                  autoComplete="shipping address-level2"
                  value={form.city}
                  onChange={(e) => form.setCity(e.target.value)}
                  required
                  aria-required="true"
                  aria-invalid={invalid(!form.city.trim())}
                />
              </GloveField>
              <GloveField id="glove-co-state" label="State / Province" required>
                <GloveSelect
                  id="glove-co-state"
                  autoComplete="shipping address-level1"
                  value={state}
                  onChange={(e) => form.setState(e.target.value)}
                  required
                  aria-required="true"
                  aria-invalid={invalid(!state)}
                >
                  <option value="">Select state</option>
                  {getRegionOptions(form.country).map((option) => (
                    <option key={option.code} value={option.code}>
                      {option.name}
                    </option>
                  ))}
                </GloveSelect>
              </GloveField>
              <GloveField id="glove-co-zip" label="ZIP / Postal code" required>
                <GloveInput
                  id="glove-co-zip"
                  type="text"
                  autoComplete="shipping postal-code"
                  value={form.postalCode}
                  onChange={(e) => form.setPostalCode(e.target.value)}
                  required
                  aria-required="true"
                  aria-invalid={invalid(!form.postalCode.trim())}
                />
              </GloveField>
              <GloveField id="glove-co-country" label="Country" required>
                <GloveSelect
                  id="glove-co-country"
                  autoComplete="shipping country"
                  value={form.country}
                  onChange={(e) =>
                    form.setCountry(e.target.value as SupportedCountry)
                  }
                  required
                  aria-required="true"
                >
                  {form.allowedCountries.map((code) => (
                    <option key={code} value={code}>
                      {COUNTRY_LABELS[code]}
                    </option>
                  ))}
                </GloveSelect>
              </GloveField>
            </div>
          </section>
        ) : null}
      </div>

      {/* ── Your order ──────────────────────────────────────────────── */}
      <GloveMistPanel className="p-6 md:p-8 lg:sticky lg:top-6">
        <GloveOrderSummary
          heading={summaryHeading}
          taxNote={taxNote}
          deliveryMethod={deliveryMethod}
          discountAmount={discountAmount}
          shipping={form.shipping}
          shippingPending={shippingPending}
          shippingCalculating={shippingCalculating}
        />

        <div role="alert" aria-live="assertive" aria-atomic="true">
          {form.error ? (
            <p className="mt-4 rounded-[var(--glove-radius-card)] border border-[var(--glove-alert)] bg-[var(--glove-paper)] p-3 text-[14px] text-[var(--glove-alert)]">
              {form.error}
            </p>
          ) : null}
        </div>

        <GloveButton
          type="submit"
          variant="woo"
          fullWidth
          className="mt-5"
          disabled={form.isProcessing || shippingCalculating}
          aria-busy={form.isProcessing || shippingCalculating}
        >
          {form.isProcessing ? (
            <>
              <Loader2
                className="size-4 animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
              Processing…
            </>
          ) : shippingCalculating ? (
            <>
              <Loader2
                className="size-4 animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
              Calculating shipping…
            </>
          ) : (
            <span {...fieldAttr("glove.checkout.submit-label")}>
              {submitLabel}
            </span>
          )}
        </GloveButton>

        <CheckoutTermsNotice
          disclosure={form.termsDisclosure}
          className="mt-4 text-center text-[13px] text-[var(--glove-muted)]"
          linkClassName="text-[var(--glove-primary)] underline underline-offset-2 hover:text-[var(--glove-primary-hover)]"
        />
        {secureNote ? (
          <p
            className="mt-2 text-center text-[13px] text-[var(--glove-muted)]"
            {...fieldAttr("glove.checkout.secure-note")}
          >
            {secureNote}
          </p>
        ) : null}
      </GloveMistPanel>
    </form>
  );
}
