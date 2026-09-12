"use client";

import { useState } from "react";
import Image from "next/image";

import type { DefaultCheckoutPageTemplateProps } from "../../types";
import type { SupportedCountry } from "~/lib/geo/regions";
import { COUNTRY_LABELS, getRegionOptions } from "~/lib/geo/regions";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { formatPrice } from "~/lib/prices";
import { SHIPPING_TYPES } from "~/lib/shipping-utils";
import { cn } from "~/lib/utils";
import { useCheckoutForm } from "~/hooks/use-checkout-form";
import { useReducedMotion } from "~/hooks/use-reduced-motion";
import { PhoneInput } from "~/components/inputs/phone-form-field";
import { CheckoutTermsNotice } from "~/app/(storefront)/_components/checkout/checkout-terms-notice";
import {
  applySavedAddressToForm,
  SavedAddressPicker,
} from "~/app/(storefront)/_components/checkout/saved-address-picker";

import { resolveFields } from "..";
import {
  hasOliveImage,
  OliveBreadcrumb,
  OliveButton,
  OliveEmptyState,
  OliveField,
  OliveFieldRow,
  OliveImageFallback,
  OliveInput,
  OliveSection,
  OliveSelect,
} from "../shared";

type Props = {
  business: DefaultCheckoutPageTemplateProps["business"];
  merchantPolicies: DefaultCheckoutPageTemplateProps["merchantPolicies"];
};

/** Matches the olive input face and height onto `PhoneInput`'s two children. */
const PHONE_INPUT_CLASS =
  "[&>button]:h-auto [&>button]:self-stretch [&>input]:h-auto [&>input]:bg-[var(--olive-paper)] [&>input]:py-[0.6875rem] [&>input]:text-[0.9375rem]";

const CARD_CLASS = "olive-card flex min-w-0 flex-col gap-5 p-5 sm:p-6";

const ROW_CLASS = "flex items-baseline justify-between gap-4";

/**
 * The two delivery methods. Native radios inside labelled option rows, so
 * arrow-key selection, the required-group semantics and the sage accent
 * colour all come from the browser rather than from re-implemented
 * `aria-checked` buttons. These are option rows, not cards — a card inside
 * the delivery card would be a nested card.
 */
const DELIVERY_OPTIONS = [
  {
    value: "ship",
    label: "Ship it to me",
    hint: "Priced from the address below.",
  },
  {
    value: "pickup",
    label: "Pick it up in store",
    hint: "No shipping charge. We hold it for you.",
  },
] as const;

/**
 * Checkout form — design.md → "Per-page section concepts → CheckoutPage".
 *
 * `useCheckoutForm` owns everything that moves: contact, delivery method,
 * saved addresses, country/region, the discount code, the live shipping
 * quote and the Stripe hand-off. This file owns the specimen-card layout and
 * the copy, nothing else.
 *
 * Two hotspots live here rather than on the page shell so the bag card is a
 * sibling of the form column, not a child of it: `checkout.main` on the left
 * column, `checkout.summary` on the aside.
 *
 * Deliberately no scroll reveals: the reveal system starts content at
 * `opacity: 0` until an IntersectionObserver fires, and a `required` control
 * that never becomes visible makes the browser cancel the submit before
 * React sees it (see the silent-submit watchdog in `use-checkout-form.ts`).
 * Only the title block, which holds no controls, is revealed.
 */
export function OliveCheckoutForm({ business, merchantPolicies }: Props) {
  const form = useCheckoutForm(business, merchantPolicies);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  // The delivery rows are the one surface here that moves. Everything else in
  // the template gets its reduced-motion kill from the scoped CSS block; an
  // inline transition is out of that block's reach, so it is gated here.
  const reducedMotion = useReducedMotion();

  const customFields = business?.siteContent?.customFields as
    | Record<string, unknown>
    | undefined;

  const f = resolveFields(customFields, [
    "olive.checkout.heading",
    "olive.checkout.intro",
    "olive.checkout.details-heading",
    "olive.checkout.delivery-heading",
    "olive.checkout.shipping-heading",
    "olive.checkout.payment-heading",
    "olive.checkout.payment-note",
    "olive.checkout.submit-label",
    "olive.checkout.back-label",
    "olive.checkout.empty-heading",
    "olive.checkout.empty-body",
    "olive.checkout.empty-cta",
    "olive.checkout.summary-heading",
    "olive.checkout.summary-discount-label",
    "olive.checkout.summary-apply-label",
    "olive.checkout.summary-note",
  ]);

  const heading = f["olive.checkout.heading"] ?? "";
  const intro = f["olive.checkout.intro"] ?? "";
  const paymentNote = f["olive.checkout.payment-note"] ?? "";
  const summaryNote = f["olive.checkout.summary-note"] ?? "";

  const shipping = form.deliveryMethod === "ship";

  // A live rate is genuinely in flight once a destination exists but the
  // amount does not — show it and block submit until it lands.
  const shippingCalculating =
    shipping && form.state.trim().length > 0 && form.shippingPending;

  // Errors name the problem and the fix, and only after a submit attempt —
  // nobody should be told a field is wrong before they have reached it.
  const errorFor = (empty: boolean, message: string) =>
    submitAttempted && empty ? message : undefined;

  const onSubmit = async (e: React.FormEvent) => {
    setSubmitAttempted(true);
    await form.handleSubmit(e);
  };

  // ── Empty bag ─────────────────────────────────────────────────────────────
  if (form.items.length === 0) {
    return (
      <OliveSection
        bleed
        tone="paper"
        aria-labelledby="olive-checkout-heading"
        {...sectionGroupAttr("checkout", "main")}
      >
        <div className="mx-auto flex w-full max-w-[36rem] flex-col gap-6">
          <h1
            id="olive-checkout-heading"
            className="olive-h1 text-center"
            {...fieldAttr("olive.checkout.heading")}
          >
            {heading}
          </h1>
          <OliveEmptyState
            numeral="0"
            headingAs="h2"
            heading={f["olive.checkout.empty-heading"] ?? ""}
            body={f["olive.checkout.empty-body"] ?? ""}
            cta={{ label: f["olive.checkout.empty-cta"] ?? "", href: "/shop" }}
          />
        </div>
      </OliveSection>
    );
  }

  // ── The form ──────────────────────────────────────────────────────────────
  return (
    <form onSubmit={onSubmit}>
      <OliveSection bleed tone="paper" as="div">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-8">
          {/* ── Left: the form column ───────────────────────────────────── */}
          <div
            className="flex min-w-0 flex-col gap-5"
            {...sectionGroupAttr("checkout", "main")}
          >
            <div className="flex flex-col gap-3">
              <OliveBreadcrumb
                items={[
                  { label: "Home", href: "/" },
                  { label: "Bag", href: "/cart" },
                  { label: "Checkout" },
                ]}
              />
              <h1
                id="olive-checkout-heading"
                className="olive-h1"
                {...fieldAttr("olive.checkout.heading")}
              >
                {heading}
              </h1>
              {intro ? (
                <p
                  className="max-w-[58ch] text-[0.9375rem] leading-relaxed"
                  style={{ color: "var(--olive-ink-soft)" }}
                  {...fieldAttr("olive.checkout.intro")}
                >
                  {intro}
                </p>
              ) : null}
            </div>

            {/* ── Your details ──────────────────────────────────────────── */}
            {/* `olive-shadcn-bridge` remaps the shadcn variables the shared
                `PhoneInput` reads onto olive tokens; `.olive` only does that
                inside `.olive-account`, so without it the one borrowed control
                in the form would ship the stock palette. */}
            <fieldset
              className={cn(CARD_CLASS, "olive-shadcn-bridge")}
              aria-labelledby="olive-co-details-heading"
            >
              <h2
                id="olive-co-details-heading"
                className="olive-h3"
                {...fieldAttr("olive.checkout.details-heading")}
              >
                {f["olive.checkout.details-heading"] ?? ""}
              </h2>

              <OliveField
                id="olive-co-email"
                label="Email"
                required
                hint="Your receipt and tracking link go here."
                error={errorFor(
                  !form.email.trim(),
                  "Add the email where we should send your confirmation.",
                )}
              >
                <OliveInput
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={(e) => form.setEmail(e.target.value)}
                  required
                />
              </OliveField>

              <OliveFieldRow>
                <OliveField
                  id="olive-co-name"
                  label="Full name"
                  required
                  error={errorFor(
                    !form.name.trim(),
                    "Add the name that should appear on the order.",
                  )}
                >
                  <OliveInput
                    type="text"
                    autoComplete="name"
                    placeholder="First and last name"
                    value={form.name}
                    onChange={(e) => form.setName(e.target.value)}
                    required
                  />
                </OliveField>

                <OliveField
                  id="olive-co-phone"
                  label="Phone"
                  required
                  error={errorFor(
                    !form.phone.trim(),
                    "Add a number we can reach you on about the delivery.",
                  )}
                >
                  <PhoneInput
                    className={PHONE_INPUT_CLASS}
                    autoComplete="tel"
                    placeholder="+1 313 555 0100"
                    value={form.phone}
                    onChange={(value) => form.setPhone(value)}
                    required
                  />
                </OliveField>
              </OliveFieldRow>
            </fieldset>

            {/* ── Delivery — only when the store offers pickup ───────────── */}
            {form.shippingConfig.offersInStorePickup ? (
              <div
                className={CARD_CLASS}
                role="radiogroup"
                aria-labelledby="olive-co-delivery-heading"
              >
                <h2
                  id="olive-co-delivery-heading"
                  className="olive-h3"
                  {...fieldAttr("olive.checkout.delivery-heading")}
                >
                  {f["olive.checkout.delivery-heading"] ?? ""}
                </h2>

                <div className="flex flex-col gap-3 sm:flex-row">
                  {DELIVERY_OPTIONS.map((option) => {
                    const selected = form.deliveryMethod === option.value;
                    return (
                      <label
                        key={option.value}
                        className="flex flex-1 cursor-pointer items-start gap-3 p-4"
                        style={{
                          borderRadius: "var(--radius)",
                          border: `1px solid ${
                            selected
                              ? "var(--olive-leaf)"
                              : "var(--olive-hairline-strong)"
                          }`,
                          backgroundColor: selected
                            ? "var(--olive-sage-tint)"
                            : "var(--olive-paper)",
                          transition: reducedMotion
                            ? undefined
                            : "background-color var(--olive-dur-hover) var(--olive-ease), border-color var(--olive-dur-hover) var(--olive-ease)",
                        }}
                      >
                        <input
                          type="radio"
                          name="olive-delivery-method"
                          value={option.value}
                          checked={selected}
                          onChange={() => form.setDeliveryMethod(option.value)}
                          className="mt-1 size-4 shrink-0"
                        />
                        <span className="flex flex-col gap-1">
                          <span
                            className="text-[0.9375rem] font-medium"
                            style={{ color: "var(--olive-ink)" }}
                          >
                            {option.label}
                          </span>
                          <span className="olive-caption">{option.hint}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>

                {form.deliveryMethod === "pickup" ? (
                  <div
                    className="flex flex-col gap-1 pt-4"
                    style={{ borderTop: "1px solid var(--olive-hairline)" }}
                  >
                    <p className="olive-label">Pickup location</p>
                    <p className="olive-caption">
                      {form.shippingConfig.pickupLocation ??
                        business.businessAddress ??
                        "The store will confirm the pickup details with you."}
                    </p>
                    {form.shippingConfig.pickupInstructions ? (
                      <p className="olive-caption whitespace-pre-line">
                        {form.shippingConfig.pickupInstructions}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}

            {/* ── Where it ships ────────────────────────────────────────── */}
            {shipping ? (
              <fieldset
                className={CARD_CLASS}
                aria-labelledby="olive-co-shipping-heading"
              >
                <h2
                  id="olive-co-shipping-heading"
                  className="olive-h3"
                  {...fieldAttr("olive.checkout.shipping-heading")}
                >
                  {f["olive.checkout.shipping-heading"] ?? ""}
                </h2>

                <p className="olive-caption -mt-2">
                  {form.shippingConfig.shippingType ===
                  SHIPPING_TYPES.ZONE_WEIGHT
                    ? "We price shipping from this address. Change it here before you continue."
                    : "This is passed to the payment page, where you can still confirm or edit it."}
                </p>

                <SavedAddressPicker
                  className="text-[color:var(--olive-ink)]"
                  legendClassName="olive-label"
                  optionClassName="rounded-[var(--radius)] border-[color:var(--olive-hairline-strong)]"
                  accentColor="var(--olive-sage)"
                  onSelect={(address) => applySavedAddressToForm(form, address)}
                />

                <OliveField
                  id="olive-co-address1"
                  label="Address line 1"
                  required
                  error={errorFor(
                    !form.addressLine1.trim(),
                    "Add the street address.",
                  )}
                >
                  <OliveInput
                    type="text"
                    autoComplete="shipping address-line1"
                    placeholder="Street address, PO box"
                    value={form.addressLine1}
                    onChange={(e) => form.setAddressLine1(e.target.value)}
                    required
                  />
                </OliveField>

                <OliveField id="olive-co-address2" label="Address line 2">
                  <OliveInput
                    type="text"
                    autoComplete="shipping address-line2"
                    placeholder="Apartment, suite, floor"
                    value={form.addressLine2}
                    onChange={(e) => form.setAddressLine2(e.target.value)}
                  />
                </OliveField>

                <OliveFieldRow>
                  <OliveField
                    id="olive-co-city"
                    label="City"
                    required
                    error={errorFor(!form.city.trim(), "Add the city.")}
                  >
                    <OliveInput
                      type="text"
                      autoComplete="shipping address-level2"
                      value={form.city}
                      onChange={(e) => form.setCity(e.target.value)}
                      required
                    />
                  </OliveField>

                  <OliveField
                    id="olive-co-state"
                    label="State / Province"
                    required
                    error={errorFor(
                      !form.state.trim(),
                      "Choose a state or province.",
                    )}
                  >
                    <OliveSelect
                      autoComplete="shipping address-level1"
                      value={form.state}
                      onChange={(e) => form.setState(e.target.value)}
                      required
                    >
                      <option value="">Select one</option>
                      {getRegionOptions(form.country).map((option) => (
                        <option key={option.code} value={option.code}>
                          {option.name}
                        </option>
                      ))}
                    </OliveSelect>
                  </OliveField>
                </OliveFieldRow>

                <OliveFieldRow>
                  <OliveField
                    id="olive-co-postal"
                    label="ZIP / Postal code"
                    required
                    error={errorFor(
                      !form.postalCode.trim(),
                      "Add the ZIP or postal code.",
                    )}
                  >
                    <OliveInput
                      type="text"
                      autoComplete="shipping postal-code"
                      value={form.postalCode}
                      onChange={(e) => form.setPostalCode(e.target.value)}
                      required
                    />
                  </OliveField>

                  <OliveField id="olive-co-country" label="Country" required>
                    <OliveSelect
                      autoComplete="shipping country"
                      value={form.country}
                      onChange={(e) =>
                        form.setCountry(e.target.value as SupportedCountry)
                      }
                      required
                    >
                      {form.allowedCountries.map((code) => (
                        <option key={code} value={code}>
                          {COUNTRY_LABELS[code]}
                        </option>
                      ))}
                    </OliveSelect>
                  </OliveField>
                </OliveFieldRow>
              </fieldset>
            ) : null}

            {/* ── Payment ───────────────────────────────────────────────── */}
            <section
              className={CARD_CLASS}
              aria-labelledby="olive-co-payment-heading"
            >
              <h2
                id="olive-co-payment-heading"
                className="olive-h3"
                {...fieldAttr("olive.checkout.payment-heading")}
              >
                {f["olive.checkout.payment-heading"] ?? ""}
              </h2>

              {paymentNote ? (
                <p
                  className="olive-caption -mt-2"
                  {...fieldAttr("olive.checkout.payment-note")}
                >
                  {paymentNote}
                </p>
              ) : null}

              {/* Always mounted so the live region is registered before an
                  error arrives; the negative margin cancels the flex gap it
                  would otherwise contribute while empty. */}
              <div
                role="alert"
                aria-live="assertive"
                aria-atomic="true"
                className="empty:-my-2.5"
              >
                {form.error ? (
                  <p
                    className="text-[0.875rem] leading-snug"
                    style={{
                      color: "var(--olive-error)",
                      backgroundColor: "var(--olive-error-bg)",
                      border: "1px solid var(--olive-error-border)",
                      borderRadius: "var(--radius)",
                      padding: "0.75rem 0.875rem",
                    }}
                  >
                    {form.error}
                  </p>
                ) : null}
              </div>

              {/* Below the lg breakpoint the bag card sits under the form,
                  so the figure the shopper is committing to is repeated here
                  where the decision actually happens. */}
              <div className={cn(ROW_CLASS, "lg:hidden")}>
                <span className="olive-h3">Total</span>
                <span className="olive-price" style={{ fontSize: "1.25rem" }}>
                  {formatPrice(form.finalTotal)}
                </span>
              </div>

              <CheckoutTermsNotice
                disclosure={form.termsDisclosure}
                className="olive-caption"
                linkStyle={{
                  color: "var(--olive-leaf)",
                  textDecoration: "underline",
                  textUnderlineOffset: "3px",
                }}
              />

              <OliveButton
                variant="primary"
                size="lg"
                type="submit"
                className="w-full"
                disabled={form.isProcessing || shippingCalculating}
                loading={form.isProcessing || shippingCalculating}
              >
                {form.isProcessing ? (
                  "Opening the payment page…"
                ) : shippingCalculating ? (
                  "Working out shipping…"
                ) : (
                  <span {...fieldAttr("olive.checkout.submit-label")}>
                    {f["olive.checkout.submit-label"] ?? ""}
                  </span>
                )}
              </OliveButton>

              <div className={ROW_CLASS}>
                <OliveButton
                  variant="ghost"
                  href="/cart"
                  data-sp-field="olive.checkout.back-label"
                >
                  {f["olive.checkout.back-label"] ?? ""}
                </OliveButton>
                <span className="olive-caption">Secured by Stripe</span>
              </div>
            </section>
          </div>

          {/* ── Right: the bag ──────────────────────────────────────────── */}
          <aside
            className="lg:sticky"
            style={{ top: "calc(var(--olive-header-h) + 1.5rem)" }}
            aria-labelledby="olive-co-summary-heading"
            {...sectionGroupAttr("checkout", "summary")}
          >
            <div
              className="olive-card flex flex-col gap-5 p-5 sm:p-6"
              style={{ backgroundColor: "var(--olive-slate-tint)" }}
            >
              <h2
                id="olive-co-summary-heading"
                className="olive-h3"
                {...fieldAttr("olive.checkout.summary-heading")}
              >
                {f["olive.checkout.summary-heading"] ?? ""}
              </h2>

              {/* Scrollable regions need a keyboard route in (WCAG 2.1.1),
                  so the list itself takes focus rather than only its links. */}
              <ul
                aria-label="Items in your bag"
                tabIndex={0}
                className="flex max-h-[19rem] flex-col gap-4 overflow-y-auto pr-1"
              >
                {form.items.map((item) => (
                  <li
                    key={`${item.productId}-${item.variantId ?? "base"}`}
                    className="flex items-start gap-3"
                  >
                    <div
                      className="relative size-14 shrink-0 overflow-hidden"
                      style={{
                        borderRadius: "var(--radius)",
                        border: "1px solid var(--olive-hairline)",
                      }}
                    >
                      {hasOliveImage(item.imageUrl) ? (
                        <Image
                          src={item.imageUrl ?? ""}
                          alt=""
                          fill
                          sizes="56px"
                          className="object-cover"
                        />
                      ) : (
                        <OliveImageFallback size={18} />
                      )}
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col">
                      <p className="olive-card-title truncate">
                        {item.productName}
                      </p>
                      {item.variantName ? (
                        <p className="olive-caption truncate">
                          {item.variantName}
                        </p>
                      ) : null}
                      <p className="olive-caption">Qty {item.quantity}</p>
                    </div>

                    <p className="olive-price shrink-0">
                      {formatPrice(item.price * item.quantity)}
                    </p>
                  </li>
                ))}
              </ul>

              {/* ── Discount code ─────────────────────────────────────── */}
              {form.couponsEnabled ? (
                <div
                  className="flex flex-col gap-2 pt-5"
                  style={{ borderTop: "1px solid var(--olive-hairline)" }}
                >
                  <label
                    htmlFor="olive-co-discount"
                    className="olive-label"
                    {...fieldAttr("olive.checkout.summary-discount-label")}
                  >
                    {f["olive.checkout.summary-discount-label"] ?? ""}
                  </label>

                  <div className="flex gap-2">
                    <OliveInput
                      id="olive-co-discount"
                      type="text"
                      placeholder="CODE"
                      autoComplete="off"
                      value={form.discountCodeInput}
                      onChange={(e) => {
                        form.setDiscountCodeInput(e.target.value.toUpperCase());
                        form.setDiscountFieldError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          form.handleApplyDiscount();
                        }
                      }}
                      aria-invalid={form.discountFieldError ? true : undefined}
                      aria-describedby={
                        form.discountFieldError
                          ? "olive-co-discount-error"
                          : undefined
                      }
                      className="flex-1"
                    />
                    <OliveButton
                      variant="secondary"
                      onClick={form.handleApplyDiscount}
                      disabled={!form.discountCodeInput.trim()}
                      loading={form.isValidatingDiscount}
                      data-sp-field="olive.checkout.summary-apply-label"
                    >
                      {f["olive.checkout.summary-apply-label"] ?? ""}
                    </OliveButton>
                  </div>

                  {form.discountFieldError ? (
                    <p
                      id="olive-co-discount-error"
                      role="alert"
                      className="text-[0.8125rem] leading-snug"
                      style={{ color: "var(--olive-error)" }}
                    >
                      {form.discountFieldError}
                    </p>
                  ) : null}

                  {form.discountCodeLabel && form.discountAmount > 0 ? (
                    <p
                      role="status"
                      className="text-[0.8125rem] leading-snug"
                      style={{ color: "var(--olive-success)" }}
                    >
                      {form.discountCodeLabel} applied — you save{" "}
                      {formatPrice(form.discountAmount)}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {/* ── Totals ────────────────────────────────────────────── */}
              <dl
                className="flex flex-col gap-2 pt-5"
                style={{ borderTop: "1px solid var(--olive-hairline)" }}
              >
                <div className={ROW_CLASS}>
                  <dt className="olive-caption">Subtotal</dt>
                  <dd className="olive-price">{formatPrice(form.subtotal)}</dd>
                </div>

                {form.discountAmount > 0 && form.discountCodeLabel ? (
                  <div className={ROW_CLASS}>
                    <dt
                      className="olive-caption"
                      style={{ color: "var(--olive-leaf)" }}
                    >
                      Discount
                    </dt>
                    <dd
                      className="olive-price"
                      style={{ color: "var(--olive-leaf)" }}
                    >
                      −{formatPrice(form.discountAmount)}
                    </dd>
                  </div>
                ) : null}

                <div className={ROW_CLASS}>
                  <dt className="olive-caption">Shipping</dt>
                  <dd className="olive-price" aria-live="polite">
                    {!shipping
                      ? "Free — in store"
                      : shippingCalculating
                        ? "Working it out…"
                        : form.shippingPending
                          ? "Set at payment"
                          : form.shipping === 0
                            ? "Free"
                            : formatPrice(form.shipping)}
                  </dd>
                </div>

                <div
                  className={cn(ROW_CLASS, "pt-3")}
                  style={{ borderTop: "1px solid var(--olive-hairline)" }}
                >
                  <dt className="olive-h3">Total</dt>
                  {/* Josefin for the word, Figtree 500 for the figure — the
                      two faces, doing the two jobs design.md gives them. */}
                  <dd className="olive-price" style={{ fontSize: "1.25rem" }}>
                    {formatPrice(form.finalTotal)}
                  </dd>
                </div>
              </dl>

              {summaryNote ? (
                <p
                  className="olive-caption"
                  {...fieldAttr("olive.checkout.summary-note")}
                >
                  {summaryNote}
                </p>
              ) : null}
            </div>
          </aside>
        </div>
      </OliveSection>
    </form>
  );
}
