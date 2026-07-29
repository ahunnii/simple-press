"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CreditCard, Loader2, Tag } from "lucide-react";

import type { DefaultCheckoutPageTemplateProps } from "../../types";
import type { SupportedCountry } from "~/lib/geo/regions";
import { COUNTRY_LABELS, getRegionOptions } from "~/lib/geo/regions";
import { formatPrice } from "~/lib/prices";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";
import { SHIPPING_TYPES } from "~/lib/shipping-utils";
import { useCheckoutForm } from "~/hooks/use-checkout-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { PhoneInput } from "~/components/inputs/phone-form-field";
import {
  applySavedAddressToForm,
  SavedAddressPicker,
} from "~/app/(storefront)/_components/checkout/saved-address-picker";

import { resolveFields } from "..";
import { PinkEmptyState } from "../shared/pink-empty-state";

type Props = {
  business: DefaultCheckoutPageTemplateProps["business"];
};

const selectTriggerStyle: React.CSSProperties = {
  background: "var(--pink-white)",
  border: "1px solid var(--pink-line-strong)",
  boxShadow: "none",
  padding: "14px 16px",
  fontFamily: "inherit",
  fontSize: 15,
  color: "var(--pink-ink)",
  height: "auto",
  width: "100%",
};

function FieldLabel({
  htmlFor,
  id,
  children,
  required,
}: {
  htmlFor: string;
  id?: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label htmlFor={htmlFor} id={id} className="pink-label">
      {children} {required && <span aria-hidden="true">*</span>}
    </label>
  );
}

/**
 * The checkout form — design.md → "Per-page section concepts → Checkout".
 * Resolves its own fields internally (rather than taking them as props) so
 * this component's public shape stays `{ business }`, matching every other
 * template's checkout form in `tests/templates/checkout-render.test.tsx`.
 *
 * Layout: `1.15fr .85fr` on desktop, the ink basket panel (`checkout.summary`,
 * hideable) rendered ABOVE the paper form on mobile so shoppers see totals
 * first. The submit button lives in the paper column per design.md (not in
 * the aside), so hiding the summary panel never removes the ability to pay —
 * a compact fallback total appears above submit when the panel is hidden.
 */
export function PinkCheckoutForm({ business }: Props) {
  const customFields = business?.siteContent?.customFields as
    | Record<string, unknown>
    | undefined;

  const f = resolveFields(customFields, [
    "pink.checkout.heading",
    "pink.checkout.intro",
    "pink.checkout.contact-heading",
    "pink.checkout.shipping-heading",
    "pink.checkout.submit-label",
    "pink.checkout.back-link-label",
    "pink.checkout.note",
    "pink.checkout.empty-heading",
    "pink.checkout.empty-body",
    "pink.checkout.empty-cta",
    "pink.checkout.summary-heading",
    "pink.checkout.summary-discount-label",
    "pink.checkout.summary-apply-label",
    "pink.checkout.summary-note",
  ]);

  const showSummary = isSectionVisible(customFields, "pink", "checkout.summary");

  const form = useCheckoutForm(business);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const shippingCalculating =
    form.deliveryMethod === "ship" &&
    form.state.trim().length > 0 &&
    form.shippingPending;

  const onSubmit = async (e: React.FormEvent) => {
    setSubmitAttempted(true);
    await form.handleSubmit(e);
  };

  if (form.items.length === 0) {
    return (
      <PinkEmptyState
        heading={f["pink.checkout.empty-heading"] ?? ""}
        body={f["pink.checkout.empty-body"] ?? ""}
        ctaLabel={f["pink.checkout.empty-cta"] ?? ""}
        ctaHref="/shop"
      />
    );
  }

  const itemCount = form.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <form
      onSubmit={onSubmit}
      className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[1.15fr_.85fr] lg:gap-14"
    >
      {/* ── Basket panel (checkout.summary, hideable) — first on mobile ── */}
      {showSummary && (
        <aside
          aria-label="Basket summary"
          className="order-first lg:order-2 lg:sticky"
          style={{ top: "var(--pink-sticky-top)" }}
          {...sectionGroupAttr("checkout", "summary")}
        >
          <div
            className="pink-dark flex flex-col gap-6 p-7 md:p-8"
            style={{ background: "var(--pink-ink)", color: "var(--pink-paper)" }}
          >
            <div
              className="flex items-baseline justify-between pb-4"
              style={{ borderBottom: "1px solid var(--pink-ink-line)" }}
            >
              <span
                className="pink-display"
                style={{ fontSize: 18, fontWeight: 600 }}
                {...fieldAttr("pink.checkout.summary-heading")}
              >
                {f["pink.checkout.summary-heading"] ?? ""}
              </span>
              <span className="pink-label-dark">
                {itemCount} {itemCount === 1 ? "piece" : "pieces"}
              </span>
            </div>

            {/* Item rows */}
            <div className="flex max-h-[280px] flex-col gap-4 overflow-y-auto">
              {form.items.map((item) => (
                <div
                  key={`${item.productId}-${item.variantId ?? "no-variant"}`}
                  className="grid items-start gap-3"
                  style={{ gridTemplateColumns: "56px 1fr auto" }}
                >
                  <div
                    className="relative shrink-0 overflow-hidden"
                    style={{ width: 56, aspectRatio: "4 / 5", background: "var(--pink-ink-tint)" }}
                  >
                    <Image
                      src={item.imageUrl ?? "/placeholder.svg"}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="56px"
                    />
                  </div>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <p className="truncate text-[13px] font-medium">{item.productName}</p>
                    {item.variantName && (
                      <p className="text-[11px]" style={{ color: "var(--pink-ink-subtle)" }}>
                        {item.variantName}
                      </p>
                    )}
                    <p className="text-[11px]" style={{ color: "var(--pink-ink-subtle)" }}>
                      Qty: {item.quantity}
                    </p>
                  </div>
                  <span className="shrink-0 text-[13px] font-medium">
                    {formatPrice(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            {/* Discount code */}
            {form.couponsEnabled && (
              <div
                className="flex flex-col gap-2 pt-2"
                style={{ borderTop: "1px solid var(--pink-ink-line)" }}
              >
                <label
                  htmlFor="pink-discount-code"
                  className="pink-label-dark"
                  {...fieldAttr("pink.checkout.summary-discount-label")}
                >
                  {f["pink.checkout.summary-discount-label"] ?? ""}
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag
                      aria-hidden="true"
                      className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2"
                      style={{ color: "var(--pink-ink-subtle)" }}
                    />
                    <input
                      id="pink-discount-code"
                      type="text"
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
                      placeholder="CODE"
                      autoComplete="off"
                      aria-invalid={!!form.discountFieldError}
                      aria-describedby={
                        form.discountFieldError ? "pink-discount-error" : undefined
                      }
                      className="pink-input"
                      style={{ paddingLeft: 34 }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={form.handleApplyDiscount}
                    disabled={form.isValidatingDiscount || !form.discountCodeInput.trim()}
                    className="pink-btn pink-btn-ghost shrink-0"
                    aria-label={
                      form.isValidatingDiscount
                        ? "Applying discount code"
                        : "Apply discount code"
                    }
                  >
                    {form.isValidatingDiscount ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      (f["pink.checkout.summary-apply-label"] ?? "Apply")
                    )}
                  </button>
                </div>

                {form.discountFieldError && (
                  <p
                    id="pink-discount-error"
                    role="alert"
                    className="text-[12px]"
                    style={{ color: "var(--pink-error)" }}
                  >
                    {form.discountFieldError}
                  </p>
                )}

                {form.discountCodeLabel && form.discountAmount > 0 && (
                  <p role="status" className="text-[12px]" style={{ color: "var(--pink-success)" }}>
                    Code <strong>{form.discountCodeLabel}</strong> applied — you saved{" "}
                    {formatPrice(form.discountAmount)}
                  </p>
                )}
              </div>
            )}

            {/* Totals */}
            <div
              className="flex flex-col gap-2.5 pt-2"
              style={{ borderTop: "1px solid var(--pink-ink-line)" }}
            >
              <div className="flex items-baseline justify-between">
                <span className="pink-label-dark">Subtotal</span>
                <span className="text-[14px]">{formatPrice(form.subtotal)}</span>
              </div>

              {form.discountAmount > 0 && form.discountCodeLabel && (
                <div className="flex items-baseline justify-between">
                  <span className="pink-label-dark">Discount</span>
                  <span className="text-[14px]" style={{ color: "var(--pink-success)" }}>
                    -{formatPrice(form.discountAmount)}
                  </span>
                </div>
              )}

              <div className="flex items-baseline justify-between">
                <span className="pink-label-dark">Shipping</span>
                <span className="text-[14px]">
                  {form.deliveryMethod === "pickup" ? (
                    "Free — pickup"
                  ) : shippingCalculating ? (
                    <span className="inline-flex items-center gap-1.5" aria-live="polite">
                      <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                      Calculating…
                    </span>
                  ) : form.shippingPending ? (
                    "Calculated at checkout"
                  ) : form.shipping === 0 ? (
                    "Free"
                  ) : (
                    formatPrice(form.shipping)
                  )}
                </span>
              </div>

              <div
                className="flex items-baseline justify-between pt-2.5"
                style={{ borderTop: "1px solid var(--pink-ink-line)" }}
              >
                <span className="pink-display" style={{ fontSize: 20, fontWeight: 600 }}>
                  Total
                </span>
                <span className="pink-display" style={{ fontSize: 20, fontWeight: 600 }}>
                  {formatPrice(form.finalTotal)}
                </span>
              </div>
            </div>

            {f["pink.checkout.summary-note"] && (
              <p
                className="text-[12px] leading-[1.6]"
                style={{ color: "var(--pink-ink-subtle)" }}
                {...fieldAttr("pink.checkout.summary-note")}
              >
                {f["pink.checkout.summary-note"]}
              </p>
            )}
          </div>
        </aside>
      )}

      {/* ── Form column ── */}
      <div
        className="order-2 flex max-w-[760px] flex-col gap-10 lg:order-1"
        {...sectionGroupAttr("checkout", "main")}
      >
        <div className="flex flex-col gap-3">
          <h1
            className="pink-display text-[clamp(28px,3.2vw,42px)] leading-[1.05] tracking-[-0.03em]"
            {...fieldAttr("pink.checkout.heading")}
          >
            {f["pink.checkout.heading"] ?? ""}
          </h1>
          {f["pink.checkout.intro"] && (
            <p
              className="max-w-[52ch] text-[16px] leading-[1.7]"
              style={{ color: "var(--pink-muted)" }}
              {...fieldAttr("pink.checkout.intro")}
            >
              {f["pink.checkout.intro"]}
            </p>
          )}
        </div>

        {/* Who it's for */}
        <fieldset aria-labelledby="pink-co-contact-heading" className="flex flex-col gap-6">
          <h2
            id="pink-co-contact-heading"
            className="pink-display pb-3"
            style={{
              fontSize: 22,
              fontWeight: 600,
              borderBottom: "1px solid var(--pink-ink)",
            }}
            {...fieldAttr("pink.checkout.contact-heading")}
          >
            {f["pink.checkout.contact-heading"] ?? ""}
          </h2>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <FieldLabel htmlFor="pink-checkout-email" required>
                Email
              </FieldLabel>
              <input
                id="pink-checkout-email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(e) => form.setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                aria-required="true"
                aria-invalid={submitAttempted && !form.email ? true : undefined}
                className="pink-input"
              />
            </div>
            <div className="flex flex-col gap-2">
              <FieldLabel htmlFor="pink-checkout-name" required>
                Full name
              </FieldLabel>
              <input
                id="pink-checkout-name"
                type="text"
                autoComplete="name"
                value={form.name}
                onChange={(e) => form.setName(e.target.value)}
                placeholder="First & last name"
                required
                aria-required="true"
                aria-invalid={submitAttempted && !form.name.trim() ? true : undefined}
                className="pink-input"
              />
            </div>
            <div className="flex flex-col gap-2 sm:col-span-2">
              <FieldLabel htmlFor="pink-checkout-phone" required>
                Phone
              </FieldLabel>
              <PhoneInput
                id="pink-checkout-phone"
                autoComplete="tel"
                value={form.phone}
                onChange={(val) => form.setPhone(val)}
                placeholder="+1 313 555 0100"
                required
                aria-required="true"
                aria-invalid={submitAttempted && !form.phone.trim() ? true : undefined}
              />
            </div>
          </div>
        </fieldset>

        {/* Where it's going */}
        <fieldset aria-labelledby="pink-co-shipping-heading" className="flex flex-col gap-6">
          <h2
            id="pink-co-shipping-heading"
            className="pink-display pb-3"
            style={{
              fontSize: 22,
              fontWeight: 600,
              borderBottom: "1px solid var(--pink-ink)",
            }}
            {...fieldAttr("pink.checkout.shipping-heading")}
          >
            {f["pink.checkout.shipping-heading"] ?? ""}
          </h2>

          {form.shippingConfig.offersInStorePickup && (
            <div role="group" aria-label="Delivery method" className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-3">
                {(["ship", "pickup"] as const).map((method) => (
                  <button
                    key={method}
                    type="button"
                    aria-pressed={form.deliveryMethod === method}
                    onClick={() => form.setDeliveryMethod(method)}
                    className="pink-btn"
                    style={{
                      flex: "1 1 160px",
                      padding: "12px 18px",
                      border: `1px solid ${form.deliveryMethod === method ? "var(--pink-ink)" : "var(--pink-line-button)"}`,
                      background: form.deliveryMethod === method ? "var(--pink-ink)" : "transparent",
                      color: form.deliveryMethod === method ? "var(--pink-paper)" : "var(--pink-ink)",
                    }}
                  >
                    {method === "ship" ? "Ship to address" : "Pick up in Detroit"}
                  </button>
                ))}
              </div>
              <p className="text-[13px]" style={{ color: "var(--pink-subtle)" }}>
                {form.deliveryMethod === "pickup"
                  ? "No shipping charge. We'll confirm pickup details by email."
                  : "Shipping cost is based on your basket."}
              </p>
              {form.deliveryMethod === "pickup" && (
                <div
                  className="flex flex-col gap-1 p-4"
                  style={{ background: "var(--pink-panel)" }}
                >
                  <p className="pink-label">Pickup location</p>
                  <p className="text-[14px]" style={{ color: "var(--pink-body)" }}>
                    {form.shippingConfig.pickupLocation ??
                      business.businessAddress ??
                      "Pickup details will be confirmed by the studio."}
                  </p>
                  {form.shippingConfig.pickupInstructions && (
                    <p
                      className="text-[13px] whitespace-pre-line"
                      style={{ color: "var(--pink-subtle)" }}
                    >
                      {form.shippingConfig.pickupInstructions}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {form.deliveryMethod === "ship" && (
            <div className="flex flex-col gap-5">
              <p className="text-[13px]" style={{ color: "var(--pink-subtle)" }}>
                {form.shippingConfig.shippingType === SHIPPING_TYPES.ZONE_WEIGHT
                  ? "We price shipping from this address. Make changes here before continuing to payment."
                  : "This is sent to Stripe prefilled so you can confirm or edit it before you pay."}
              </p>

              <SavedAddressPicker
                accentColor="var(--pink-rose)"
                optionClassName="border-[color:var(--pink-line-strong,currentColor)]"
                onSelect={(address) => applySavedAddressToForm(form, address)}
              />

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-6">
                <div className="flex flex-col gap-2 sm:col-span-4">
                  <FieldLabel htmlFor="pink-checkout-address1" required>
                    Street address
                  </FieldLabel>
                  <input
                    id="pink-checkout-address1"
                    type="text"
                    autoComplete="shipping address-line1"
                    value={form.addressLine1}
                    onChange={(e) => form.setAddressLine1(e.target.value)}
                    placeholder="Street address, P.O. box"
                    required={form.deliveryMethod === "ship"}
                    aria-required="true"
                    aria-invalid={
                      submitAttempted && !form.addressLine1.trim() ? true : undefined
                    }
                    className="pink-input"
                  />
                </div>
                <div className="flex flex-col gap-2 sm:col-span-2">
                  <FieldLabel htmlFor="pink-checkout-address2">Apt / suite</FieldLabel>
                  <input
                    id="pink-checkout-address2"
                    type="text"
                    autoComplete="shipping address-line2"
                    value={form.addressLine2}
                    onChange={(e) => form.setAddressLine2(e.target.value)}
                    placeholder="Apartment, suite, etc."
                    className="pink-input"
                  />
                </div>

                <div className="flex flex-col gap-2 sm:col-span-3">
                  <FieldLabel htmlFor="pink-checkout-city" required>
                    City
                  </FieldLabel>
                  <input
                    id="pink-checkout-city"
                    type="text"
                    autoComplete="shipping address-level2"
                    value={form.city}
                    onChange={(e) => form.setCity(e.target.value)}
                    required={form.deliveryMethod === "ship"}
                    aria-required="true"
                    aria-invalid={submitAttempted && !form.city.trim() ? true : undefined}
                    className="pink-input"
                  />
                </div>
                <div className="flex flex-col gap-2 sm:col-span-1">
                  <FieldLabel htmlFor="pink-checkout-state" id="pink-checkout-state-label" required>
                    State
                  </FieldLabel>
                  <Select value={form.state} onValueChange={(v) => form.setState(v)}>
                    <SelectTrigger
                      id="pink-checkout-state"
                      aria-labelledby="pink-checkout-state-label"
                      aria-required="true"
                      aria-invalid={submitAttempted && !form.state ? true : undefined}
                      style={selectTriggerStyle}
                    >
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      {getRegionOptions(form.country).map((opt) => (
                        <SelectItem key={opt.code} value={opt.code}>
                          {opt.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2 sm:col-span-2">
                  <FieldLabel htmlFor="pink-checkout-postal" required>
                    ZIP code
                  </FieldLabel>
                  <input
                    id="pink-checkout-postal"
                    type="text"
                    autoComplete="shipping postal-code"
                    value={form.postalCode}
                    onChange={(e) => form.setPostalCode(e.target.value)}
                    required={form.deliveryMethod === "ship"}
                    aria-required="true"
                    aria-invalid={
                      submitAttempted && !form.postalCode.trim() ? true : undefined
                    }
                    className="pink-input"
                  />
                </div>

                <div className="flex flex-col gap-2 sm:col-span-3">
                  <FieldLabel htmlFor="pink-checkout-country" id="pink-checkout-country-label" required>
                    Country
                  </FieldLabel>
                  <Select
                    value={form.country}
                    onValueChange={(v) => form.setCountry(v as SupportedCountry)}
                  >
                    <SelectTrigger
                      id="pink-checkout-country"
                      aria-labelledby="pink-checkout-country-label"
                      style={selectTriggerStyle}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {form.allowedCountries.map((c) => (
                        <SelectItem key={c} value={c}>
                          {COUNTRY_LABELS[c]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </fieldset>

        {/* Fallback total — only shown when the basket panel is hidden, so the
            price is never invisible right above the submit button. */}
        {!showSummary && (
          <div
            className="flex items-baseline justify-between pt-4"
            style={{ borderTop: "1px solid var(--pink-line)" }}
          >
            <span className="pink-display" style={{ fontSize: 18, fontWeight: 600 }}>
              Total
            </span>
            <span className="pink-display" style={{ fontSize: 18, fontWeight: 600 }}>
              {formatPrice(form.finalTotal)}
            </span>
          </div>
        )}

        {/* Error region */}
        <div role="alert" aria-live="assertive" aria-atomic="true">
          {form.error && (
            <p
              className="text-[14px]"
              style={{
                color: "var(--pink-error)",
                background: "var(--pink-error-bg)",
                border: "1px solid var(--pink-error-border)",
                padding: "12px 16px",
              }}
            >
              {form.error}
            </p>
          )}
        </div>

        {/* Submit row */}
        <div className="flex flex-wrap items-center gap-6">
          <button
            type="submit"
            disabled={form.isProcessing || shippingCalculating}
            aria-busy={form.isProcessing || shippingCalculating}
            className="pink-btn pink-btn-solid"
            style={{ padding: "19px 36px", fontSize: 15 }}
          >
            {form.isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Processing…
              </>
            ) : shippingCalculating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Calculating shipping…
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4" aria-hidden="true" />
                <span {...fieldAttr("pink.checkout.submit-label")}>
                  {f["pink.checkout.submit-label"] ?? ""}
                </span>
              </>
            )}
          </button>
          <Link
            href="/cart"
            className="text-[14px] underline underline-offset-2 transition-opacity hover:opacity-70"
            style={{ color: "var(--pink-subtle)" }}
            {...fieldAttr("pink.checkout.back-link-label")}
          >
            {f["pink.checkout.back-link-label"] ?? ""}
          </Link>
        </div>

        {f["pink.checkout.note"] && (
          <p
            className="text-[13px]"
            style={{ color: "var(--pink-subtle)" }}
            {...fieldAttr("pink.checkout.note")}
          >
            {f["pink.checkout.note"]}
          </p>
        )}
      </div>
    </form>
  );
}
