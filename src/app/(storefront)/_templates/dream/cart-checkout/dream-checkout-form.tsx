"use client";

import { useState } from "react";
import { Loader2, Lock, Tag } from "lucide-react";

import type { DefaultCheckoutPageTemplateProps } from "../../types";
import type { SupportedCountry } from "~/lib/geo/regions";
import { COUNTRY_LABELS, getRegionOptions } from "~/lib/geo/regions";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { formatPrice } from "~/lib/prices";
import { cn } from "~/lib/utils";
import { useCheckoutForm } from "~/hooks/use-checkout-form";
import { PhoneInput } from "~/components/inputs/phone-form-field";
import { useCart } from "~/providers/cart-context";
import { CheckoutTermsNotice } from "~/app/(storefront)/_components/checkout/checkout-terms-notice";
import {
  applySavedAddressToForm,
  SavedAddressPicker,
} from "~/app/(storefront)/_components/checkout/saved-address-picker";

import { DreamButton } from "../shared/dream-button";
import { DreamInput, DreamSelect } from "../shared/dream-input";
import { DreamEmptyPanel } from "../shop/dream-empty-panel";
import { resolveDreamCheckoutCopy } from "./dream-checkout-copy";
import { DreamLineThumb } from "./dream-line-thumb";

type Props = {
  business: DefaultCheckoutPageTemplateProps["business"];
  merchantPolicies: DefaultCheckoutPageTemplateProps["merchantPolicies"];
};

const LEGEND_HEADING =
  "[font-family:var(--font-dream-display)] text-[clamp(26px,2.6vw,32px)] leading-[1.1] text-[var(--dream-ink)]";
const LABEL =
  "flex flex-col gap-2 text-[14px] font-semibold text-[var(--dream-ink)]";
const NOTE = "text-[15px] leading-[1.6] text-[var(--dream-soft)]";

function Required() {
  return (
    <span className="font-normal text-[var(--dream-soft)]"> (required)</span>
  );
}

/**
 * Dream's checkout form. Every behaviour comes from the shared
 * `useCheckoutForm` hook (contact fields, ship vs pickup, address + saved
 * addresses, live zone/weight quote, discount codes, Stripe submit, terms
 * disclosure) — this file only lays it out in dream's language: Italiana
 * section legends over hairline-separated fieldsets, paper `DreamInput`s,
 * pill toggles for delivery, and a white summary card with the ink pay
 * pill. The pay button is dream's ink pill, never the owner's
 * `primaryColor` (no Default blue).
 *
 * Copy resolves from `business.siteContent.customFields` so the form keeps
 * Default's `{ business, merchantPolicies }` signature (the shared
 * checkout-render test mounts every template's form that way).
 */
export function DreamCheckoutForm({ business, merchantPolicies }: Props) {
  const f = useCheckoutForm(business, merchantPolicies);
  const { isHydrated } = useCart();
  const copy = resolveDreamCheckoutCopy(business.siteContent?.customFields);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  // Stable, namespaced ids (one checkout form per page): e2e's shared
  // `fillCheckout` finds the state control by `[id$="-state"]`.
  const ids = {
    email: "dream-checkout-email",
    name: "dream-checkout-name",
    phone: "dream-checkout-phone",
    line1: "dream-checkout-address-line1",
    line2: "dream-checkout-address-line2",
    city: "dream-checkout-city",
    state: "dream-checkout-state",
    postal: "dream-checkout-postal",
    country: "dream-checkout-country",
    discount: "dream-checkout-discount",
    discountError: "dream-checkout-discount-error",
    summary: "dream-checkout-summary-heading",
  };

  // A live shipping rate is loading once a destination is entered but the
  // amount isn't known yet — show it and block submit until it lands.
  const shippingCalculating =
    f.deliveryMethod === "ship" &&
    f.state.trim().length > 0 &&
    f.shippingPending;

  const invalid = (missing: boolean) =>
    submitAttempted && missing ? true : undefined;

  const onSubmit = async (e: React.FormEvent) => {
    setSubmitAttempted(true);
    await f.handleSubmit(e);
  };

  if (!isHydrated) {
    return (
      <div aria-busy="true" className="min-h-[420px]">
        <span className="sr-only" role="status">
          Loading your order…
        </span>
      </div>
    );
  }

  if (f.items.length === 0) {
    return (
      <DreamEmptyPanel
        heading={copy.emptyHeading}
        body={copy.emptyBody}
        ctaLabel={copy.emptyCtaLabel}
        ctaHref="/shop"
        headingFieldKey="dream.checkout.empty-heading"
        bodyFieldKey="dream.checkout.empty-body"
        ctaLabelFieldKey="dream.checkout.empty-cta-label"
        sectionAttrs={sectionGroupAttr("checkout", "empty")}
      />
    );
  }

  const pickupLocation =
    f.shippingConfig.pickupLocation ?? business.businessAddress ?? null;

  const shippingValue =
    f.deliveryMethod === "pickup" ? (
      "Pickup (free)"
    ) : shippingCalculating ? (
      <span className="inline-flex items-center gap-1.5 text-[var(--dream-soft)]">
        <Loader2
          className="size-3.5 animate-spin motion-reduce:animate-none"
          strokeWidth={1.5}
          aria-hidden="true"
        />
        Calculating…
      </span>
    ) : f.shippingPending ? (
      <span className="text-[var(--dream-soft)]">
        Added once you pick a state
      </span>
    ) : f.shipping === 0 ? (
      "Free"
    ) : (
      formatPrice(f.shipping)
    );

  return (
    <form
      onSubmit={onSubmit}
      {...sectionGroupAttr("checkout", "details")}
      className="grid grid-cols-1 items-start gap-12 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-16"
    >
      <div className="flex min-w-0 flex-col gap-10">
        {/* Contact */}
        <fieldset className="m-0 min-w-0 border-0 p-0">
          <legend className="mb-6 p-0">
            <h2
              className={LEGEND_HEADING}
              {...fieldAttr("dream.checkout.contact-heading")}
            >
              {copy.contactHeading}
            </h2>
          </legend>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <label htmlFor={ids.email} className={cn(LABEL, "sm:col-span-2")}>
              <span>
                Email
                <Required />
              </span>
              <DreamInput
                id={ids.email}
                type="email"
                autoComplete="email"
                value={f.email}
                onChange={(e) => f.setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                aria-invalid={invalid(!f.email.trim())}
              />
            </label>
            <label htmlFor={ids.name} className={LABEL}>
              <span>
                Full name
                <Required />
              </span>
              <DreamInput
                id={ids.name}
                type="text"
                autoComplete="name"
                value={f.name}
                onChange={(e) => f.setName(e.target.value)}
                required
                aria-invalid={invalid(!f.name.trim())}
              />
            </label>
            <div className={LABEL}>
              <label htmlFor={ids.phone}>
                Phone
                <Required />
              </label>
              <div className="dream-embed">
                <PhoneInput
                  id={ids.phone}
                  autoComplete="tel"
                  value={f.phone}
                  onChange={(val) => f.setPhone(val)}
                  placeholder="+1 555 123 4567"
                  required
                  aria-required="true"
                  aria-invalid={invalid(!f.phone.trim())}
                  className="[&_button]:h-[50px] [&_button]:rounded-s-[var(--dream-radius-input)] [&_button]:border-[var(--dream-line)] [&_button]:bg-[var(--dream-paper)] [&_input]:h-[50px] [&_input]:rounded-e-[var(--dream-radius-input)] [&_input]:border-[var(--dream-line)] [&_input]:bg-[var(--dream-paper)] [&_input]:text-[16px] [&_input]:font-normal"
                />
              </div>
            </div>
          </div>
        </fieldset>

        {/* Delivery vs pickup — only when the store offers pickup */}
        {f.shippingConfig.offersInStorePickup ? (
          <fieldset className="m-0 min-w-0 border-0 border-t border-[var(--dream-line)] p-0 pt-10">
            <legend className="float-left mb-6 w-full p-0">
              <h2
                className={LEGEND_HEADING}
                {...fieldAttr("dream.checkout.delivery-heading")}
              >
                {copy.deliveryHeading}
              </h2>
            </legend>
            <div className="clear-both flex flex-col gap-4">
              <div className="flex flex-wrap gap-2">
                <label className="dream-radio-pill">
                  <input
                    type="radio"
                    name="dream-delivery-method"
                    value="ship"
                    checked={f.deliveryMethod === "ship"}
                    onChange={() => f.setDeliveryMethod("ship")}
                    className="sr-only"
                  />
                  <span>Ship to my address</span>
                </label>
                <label className="dream-radio-pill">
                  <input
                    type="radio"
                    name="dream-delivery-method"
                    value="pickup"
                    checked={f.deliveryMethod === "pickup"}
                    onChange={() => f.setDeliveryMethod("pickup")}
                    className="sr-only"
                  />
                  <span>Pick up in store</span>
                </label>
              </div>
              {f.deliveryMethod === "pickup" ? (
                <>
                  {copy.pickupBody ? (
                    <p
                      className={NOTE}
                      {...fieldAttr("dream.checkout.pickup-body")}
                    >
                      {copy.pickupBody}
                    </p>
                  ) : null}
                  {pickupLocation ? (
                    <div className="rounded-[var(--dream-radius-input)] border border-[var(--dream-line)] bg-[linear-gradient(180deg,var(--dream-sky)_0%,var(--dream-paper)_100%)] p-5 text-[15px] leading-[1.6]">
                      <p className="font-semibold text-[var(--dream-ink)]">
                        Pickup location
                      </p>
                      <p className="mt-1 whitespace-pre-line text-[var(--dream-soft)]">
                        {pickupLocation}
                      </p>
                      {f.shippingConfig.pickupInstructions ? (
                        <p className="mt-2 whitespace-pre-line text-[var(--dream-soft)]">
                          {f.shippingConfig.pickupInstructions}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </>
              ) : copy.shipBody ? (
                <p className={NOTE} {...fieldAttr("dream.checkout.ship-body")}>
                  {copy.shipBody}
                </p>
              ) : null}
            </div>
          </fieldset>
        ) : null}

        {/* Shipping address */}
        {f.deliveryMethod === "ship" ? (
          <fieldset className="m-0 min-w-0 border-0 border-t border-[var(--dream-line)] p-0 pt-10">
            <legend className="float-left mb-3 w-full p-0">
              <h2
                className={LEGEND_HEADING}
                {...fieldAttr("dream.checkout.address-heading")}
              >
                {copy.addressHeading}
              </h2>
            </legend>
            <div className="clear-both flex flex-col gap-5">
              {copy.addressNote ? (
                <p
                  className={NOTE}
                  {...fieldAttr("dream.checkout.address-note")}
                >
                  {copy.addressNote}
                </p>
              ) : null}
              <SavedAddressPicker
                accentColor="var(--dream-ink)"
                className="text-[var(--dream-ink)]"
                legendClassName="text-[14px] font-semibold"
                optionClassName="rounded-[var(--dream-radius-input)] border-[var(--dream-line)] bg-[var(--dream-paper)] p-4 has-[:checked]:border-[var(--dream-ink)]"
                onSelect={(address) => applySavedAddressToForm(f, address)}
              />
              <label htmlFor={ids.line1} className={LABEL}>
                <span>
                  Address line 1
                  <Required />
                </span>
                <DreamInput
                  id={ids.line1}
                  type="text"
                  autoComplete="shipping address-line1"
                  value={f.addressLine1}
                  onChange={(e) => f.setAddressLine1(e.target.value)}
                  placeholder="Street address, P.O. box"
                  required
                  aria-invalid={invalid(!f.addressLine1.trim())}
                />
              </label>
              <label htmlFor={ids.line2} className={LABEL}>
                <span>Address line 2</span>
                <DreamInput
                  id={ids.line2}
                  type="text"
                  autoComplete="shipping address-line2"
                  value={f.addressLine2}
                  onChange={(e) => f.setAddressLine2(e.target.value)}
                  placeholder="Apartment, suite, etc."
                />
              </label>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <label htmlFor={ids.city} className={LABEL}>
                  <span>
                    City
                    <Required />
                  </span>
                  <DreamInput
                    id={ids.city}
                    type="text"
                    autoComplete="shipping address-level2"
                    value={f.city}
                    onChange={(e) => f.setCity(e.target.value)}
                    required
                    aria-invalid={invalid(!f.city.trim())}
                  />
                </label>
                <label htmlFor={ids.state} className={LABEL}>
                  <span>
                    State / Province
                    <Required />
                  </span>
                  <DreamSelect
                    id={ids.state}
                    autoComplete="shipping address-level1"
                    value={f.state}
                    onChange={(e) => f.setState(e.target.value)}
                    required
                    aria-invalid={invalid(!f.state)}
                  >
                    <option value="" disabled>
                      Select a state
                    </option>
                    {getRegionOptions(f.country).map((opt) => (
                      <option key={opt.code} value={opt.code}>
                        {opt.name}
                      </option>
                    ))}
                  </DreamSelect>
                </label>
                <label htmlFor={ids.postal} className={LABEL}>
                  <span>
                    ZIP / Postal code
                    <Required />
                  </span>
                  <DreamInput
                    id={ids.postal}
                    type="text"
                    autoComplete="shipping postal-code"
                    value={f.postalCode}
                    onChange={(e) => f.setPostalCode(e.target.value)}
                    required
                    aria-invalid={invalid(!f.postalCode.trim())}
                  />
                </label>
                <label htmlFor={ids.country} className={LABEL}>
                  <span>
                    Country
                    <Required />
                  </span>
                  <DreamSelect
                    id={ids.country}
                    autoComplete="shipping country"
                    value={f.country}
                    onChange={(e) =>
                      f.setCountry(e.target.value as SupportedCountry)
                    }
                  >
                    {f.allowedCountries.map((c) => (
                      <option key={c} value={c}>
                        {COUNTRY_LABELS[c]}
                      </option>
                    ))}
                  </DreamSelect>
                </label>
              </div>
            </div>
          </fieldset>
        ) : null}
      </div>

      {/* Summary + pay */}
      <aside
        aria-labelledby={ids.summary}
        className="dream-card flex flex-col gap-6 lg:sticky lg:top-[calc(var(--dream-header-h)+24px)]"
      >
        <h2
          id={ids.summary}
          className="[font-family:var(--font-dream-display)] text-[28px] leading-[1.1] text-[var(--dream-ink)]"
          {...fieldAttr("dream.checkout.summary-heading")}
        >
          {copy.summaryHeading}
        </h2>

        <ul className="m-0 flex max-h-72 list-none flex-col gap-4 overflow-y-auto p-0">
          {f.items.map((item) => (
            <li
              key={`${item.productId}-${item.variantId ?? "base"}`}
              className="flex items-center gap-3"
            >
              <DreamLineThumb
                src={item.imageUrl}
                className="size-14 rounded-[var(--dream-radius-input)]"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold text-[var(--dream-ink)]">
                  {item.productName}
                </p>
                <p className="text-[13px] text-[var(--dream-soft)]">
                  {item.variantName ? `${item.variantName} · ` : ""}
                  Qty {item.quantity}
                </p>
              </div>
              <p className="shrink-0 text-[15px] text-[var(--dream-ink)] tabular-nums">
                {formatPrice(item.price * item.quantity)}
              </p>
            </li>
          ))}
        </ul>

        {f.couponsEnabled ? (
          <div className="flex flex-col gap-2 border-t border-[var(--dream-line)] pt-5">
            <label
              htmlFor={ids.discount}
              className="text-[14px] font-semibold text-[var(--dream-ink)]"
            >
              Discount code
            </label>
            <div className="flex gap-2">
              <div className="relative min-w-0 flex-1">
                <Tag
                  className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-[var(--dream-soft)]"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                <DreamInput
                  id={ids.discount}
                  type="text"
                  value={f.discountCodeInput}
                  onChange={(e) => {
                    f.setDiscountCodeInput(e.target.value.toUpperCase());
                    f.setDiscountFieldError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      f.handleApplyDiscount();
                    }
                  }}
                  aria-invalid={f.discountFieldError ? true : undefined}
                  aria-describedby={
                    f.discountFieldError ? ids.discountError : undefined
                  }
                  autoComplete="off"
                  className="!pl-11"
                />
              </div>
              <DreamButton
                type="button"
                variant="secondary"
                onClick={f.handleApplyDiscount}
                disabled={f.isValidatingDiscount || !f.discountCodeInput.trim()}
              >
                {f.isValidatingDiscount ? (
                  <>
                    <Loader2
                      className="size-4 animate-spin motion-reduce:animate-none"
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                    <span className="sr-only">Applying discount code</span>
                  </>
                ) : (
                  "Apply"
                )}
              </DreamButton>
            </div>
            {f.discountFieldError ? (
              <p
                id={ids.discountError}
                role="alert"
                className="text-[14px] text-[var(--dream-error)]"
              >
                {f.discountFieldError}
              </p>
            ) : null}
            {f.discountCodeLabel && f.discountAmount > 0 ? (
              <p
                role="status"
                className="text-[14px] text-[var(--dream-success)]"
              >
                {f.discountCodeLabel} applied — you save{" "}
                {formatPrice(f.discountAmount)}
              </p>
            ) : null}
          </div>
        ) : null}

        <dl className="m-0 flex flex-col gap-3 border-t border-[var(--dream-line)] pt-5 text-[15px]">
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-[var(--dream-soft)]">Subtotal</dt>
            <dd className="m-0 text-[var(--dream-ink)] tabular-nums">
              {formatPrice(f.subtotal)}
            </dd>
          </div>
          {f.discountAmount > 0 && f.discountCodeLabel ? (
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-[var(--dream-soft)]">
                Discount ({f.discountCodeLabel})
              </dt>
              <dd className="m-0 text-[var(--dream-success)] tabular-nums">
                −{formatPrice(f.discountAmount)}
              </dd>
            </div>
          ) : null}
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-[var(--dream-soft)]">Shipping</dt>
            <dd
              className="m-0 text-right text-[var(--dream-ink)] tabular-nums"
              aria-live="polite"
            >
              {shippingValue}
            </dd>
          </div>
          <div className="mt-1 flex items-baseline justify-between gap-4 border-t border-[var(--dream-line)] pt-4">
            <dt className="font-semibold text-[var(--dream-ink)]">
              Estimated total
            </dt>
            <dd className="m-0 text-[22px] font-semibold text-[var(--dream-ink)] tabular-nums">
              {formatPrice(f.finalTotal)}
            </dd>
          </div>
        </dl>

        <p
          className="-mt-3 text-[14px] leading-[1.6] text-[var(--dream-soft)]"
          {...fieldAttr("dream.checkout.tax-note")}
        >
          {copy.taxNote}
        </p>

        <div role="alert" aria-live="assertive" aria-atomic="true">
          {f.error ? (
            <p className="rounded-[var(--dream-radius-input)] border border-[var(--dream-error)] bg-[var(--dream-paper)] p-4 text-[14px] leading-[1.6] text-[var(--dream-error)]">
              {f.error}
            </p>
          ) : null}
        </div>

        <DreamButton
          type="submit"
          disabled={f.isProcessing || shippingCalculating}
          className="w-full"
        >
          {f.isProcessing || shippingCalculating ? (
            <Loader2
              className="size-4 animate-spin motion-reduce:animate-none"
              strokeWidth={1.5}
              aria-hidden="true"
            />
          ) : (
            <Lock className="size-4" strokeWidth={1.5} aria-hidden="true" />
          )}
          {f.isProcessing ? (
            "Processing…"
          ) : shippingCalculating ? (
            "Calculating shipping…"
          ) : (
            <span {...fieldAttr("dream.checkout.submit-label")}>
              {copy.submitLabel}
            </span>
          )}
        </DreamButton>

        <CheckoutTermsNotice
          disclosure={f.termsDisclosure}
          className="text-center text-[13px] leading-[1.6] text-[var(--dream-soft)]"
          linkClassName="dream-link"
        />
      </aside>
    </form>
  );
}
