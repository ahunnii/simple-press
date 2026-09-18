"use client";

import { useState } from "react";
import Image from "next/image";
import { CreditCard, Loader2, Tag } from "lucide-react";

import type { DefaultCheckoutPageTemplateProps } from "../../types";
import type { SupportedCountry } from "~/lib/geo/regions";
import { COUNTRY_LABELS, getRegionOptions } from "~/lib/geo/regions";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { SHIPPING_TYPES } from "~/lib/shipping-utils";
import { cn } from "~/lib/utils";
import { useCheckoutForm } from "~/hooks/use-checkout-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { PhoneInput } from "~/components/inputs/phone-form-field";
import { CheckoutTermsNotice } from "~/app/(storefront)/_components/checkout/checkout-terms-notice";
import {
  applySavedAddressToForm,
  SavedAddressPicker,
} from "~/app/(storefront)/_components/checkout/saved-address-picker";

import { UmscButton } from "../shared/umsc-button";
import {
  UmscFieldError,
  UmscInput,
  umscInputClass,
  UmscLabel,
  UmscTogglePills,
} from "../shared/umsc-form-fields";
import {
  hasCustomImage,
  UmscImageFallback,
} from "../shared/umsc-image-fallback";

const formatPrice = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100,
  );

type Props = {
  business: DefaultCheckoutPageTemplateProps["business"];
  merchantPolicies: DefaultCheckoutPageTemplateProps["merchantPolicies"];
  contactHeading: string;
  deliveryHeading: string;
  shippingHeading: string;
  summaryHeading: string;
  discountLabel: string;
  submitLabel: string;
  emptyHeading: string;
  emptyCta: string;
};

/** Thin card shell — white face, hairline border, header separated by a hairline. */
function CardShell({
  headingId,
  heading,
  headingFieldKey,
  children,
}: {
  headingId: string;
  heading: string;
  headingFieldKey: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset
      aria-labelledby={headingId}
      className="m-0 border border-[var(--umsc-line)] bg-[var(--umsc-white)] p-0"
    >
      <div className="border-b border-[var(--umsc-line)] px-6 py-5 sm:px-7">
        <h2
          id={headingId}
          {...fieldAttr(headingFieldKey)}
          className="umsc-serif text-[20px] font-normal text-[var(--umsc-ink)]"
        >
          {heading}
        </h2>
      </div>
      <div className="flex flex-col gap-6 px-6 py-6 sm:px-7">{children}</div>
    </fieldset>
  );
}

export function UmscCheckoutForm({
  business,
  merchantPolicies,
  contactHeading,
  deliveryHeading,
  shippingHeading,
  summaryHeading,
  discountLabel,
  submitLabel,
  emptyHeading,
  emptyCta,
}: Props) {
  const f = useCheckoutForm(business, merchantPolicies);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const shippingCalculating =
    f.deliveryMethod === "ship" &&
    f.state.trim().length > 0 &&
    f.shippingPending;

  const onSubmit = async (e: React.FormEvent) => {
    setSubmitAttempted(true);
    await f.handleSubmit(e);
  };

  // ── Empty bag ────────────────────────────────────────────────────────────────
  if (f.items.length === 0) {
    return (
      <div className="py-16 text-center">
        <p
          {...fieldAttr("umsc.checkout.empty-heading")}
          className="umsc-serif mb-8 text-[clamp(24px,3vw,32px)] font-normal text-[var(--umsc-ink)]"
        >
          {emptyHeading}
        </p>
        <UmscButton
          as="link"
          href="/shop"
          variant="gold"
          showArrow={false}
          fieldKey="umsc.checkout.empty-cta"
        >
          {emptyCta}
        </UmscButton>
      </div>
    );
  }

  // ── Form ─────────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={onSubmit} {...sectionGroupAttr("checkout", "main")}>
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[1fr_380px]">
        {/* ── Left: fieldsets ─────────────────────────────────────────────── */}
        <div className="flex flex-col gap-8">
          <CardShell
            headingId="umsc-co-contact"
            heading={contactHeading}
            headingFieldKey="umsc.checkout.contact-heading"
          >
            <div>
              <UmscLabel htmlFor="checkout-email">
                Email <span aria-hidden="true">*</span>
              </UmscLabel>
              <UmscInput
                shape="square"
                id="checkout-email"
                type="email"
                autoComplete="email"
                value={f.email}
                onChange={(e) => f.setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                aria-required="true"
                aria-invalid={submitAttempted && !f.email ? true : undefined}
              />
            </div>

            <div>
              <UmscLabel htmlFor="checkout-name">
                Full name <span aria-hidden="true">*</span>
              </UmscLabel>
              <UmscInput
                shape="square"
                id="checkout-name"
                type="text"
                autoComplete="name"
                value={f.name}
                onChange={(e) => f.setName(e.target.value)}
                placeholder="First & last name"
                required
                aria-required="true"
                aria-invalid={
                  submitAttempted && !f.name.trim() ? true : undefined
                }
              />
            </div>

            <div>
              <UmscLabel htmlFor="checkout-phone">
                Phone <span aria-hidden="true">*</span>
              </UmscLabel>
              <PhoneInput
                id="checkout-phone"
                autoComplete="tel"
                value={f.phone}
                onChange={(val) => f.setPhone(val)}
                placeholder="+1 555 123 4567"
                required
                aria-required="true"
                aria-invalid={
                  submitAttempted && !f.phone.trim() ? true : undefined
                }
              />
            </div>
          </CardShell>

          {/* Delivery method — only when the store offers in-store pickup */}
          {f.shippingConfig.offersInStorePickup && (
            <CardShell
              headingId="umsc-co-delivery"
              heading={deliveryHeading}
              headingFieldKey="umsc.checkout.delivery-heading"
            >
              <UmscTogglePills
                aria-label="Delivery method"
                value={f.deliveryMethod}
                onChange={f.setDeliveryMethod}
                pillClassName="flex-1 min-w-[140px] justify-start rounded-none px-5 py-4 text-left"
                options={[
                  {
                    value: "ship",
                    label: (active) => (
                      <span className="flex items-center gap-2">
                        {active && (
                          <span
                            aria-hidden="true"
                            className="size-3 shrink-0 rounded-full bg-[var(--umsc-gold-ink)]"
                          />
                        )}
                        Ship to address
                      </span>
                    ),
                  },
                  {
                    value: "pickup",
                    label: (active) => (
                      <span className="flex items-center gap-2">
                        {active && (
                          <span
                            aria-hidden="true"
                            className="size-3 shrink-0 rounded-full bg-[var(--umsc-gold-ink)]"
                          />
                        )}
                        In-store pickup
                      </span>
                    ),
                  },
                ]}
              />

              <p className="umsc-sans text-[13px] leading-[1.5] text-[var(--umsc-muted)]">
                {f.deliveryMethod === "pickup"
                  ? "No shipping charge. You'll pick up your order at the store."
                  : "Shipping cost is based on this store's shipping settings."}
              </p>

              {f.deliveryMethod === "pickup" && (
                <div className="flex flex-col gap-1 border border-[var(--umsc-line)] bg-[var(--umsc-cream)] px-4 py-3">
                  <p className="umsc-sans text-[11px] font-semibold tracking-[0.1em] text-[var(--umsc-ink)] uppercase">
                    Pickup location
                  </p>
                  <p className="umsc-sans text-[13px] leading-[1.5] text-[var(--umsc-muted)]">
                    {f.shippingConfig.pickupLocation ??
                      business.businessAddress ??
                      "Pickup details will be confirmed by the store."}
                  </p>
                  {f.shippingConfig.pickupInstructions && (
                    <p className="umsc-sans text-[13px] leading-[1.5] whitespace-pre-line text-[var(--umsc-muted)]">
                      {f.shippingConfig.pickupInstructions}
                    </p>
                  )}
                </div>
              )}
            </CardShell>
          )}

          {/* Shipping address — only when delivery method is ship */}
          {f.deliveryMethod === "ship" && (
            <CardShell
              headingId="umsc-co-shipping"
              heading={shippingHeading}
              headingFieldKey="umsc.checkout.shipping-heading"
            >
              <p className="umsc-sans -mt-2 text-[13px] leading-[1.5] text-[var(--umsc-muted)]">
                {f.shippingConfig.shippingType === SHIPPING_TYPES.ZONE_WEIGHT
                  ? "We price shipping from this address. Make changes here before continuing to payment."
                  : "This is sent to Stripe Checkout prefilled so you can confirm or edit your address before paying."}
              </p>

              <SavedAddressPicker
                className="umsc-sans text-[var(--umsc-ink)]"
                legendClassName="text-[11px] font-medium tracking-[0.1em] uppercase text-[var(--umsc-muted)]"
                optionClassName="border-[var(--umsc-line)]"
                accentColor="var(--umsc-purple)"
                onSelect={(address) => applySavedAddressToForm(f, address)}
              />

              <div>
                <UmscLabel htmlFor="checkout-address1">
                  Address line 1 <span aria-hidden="true">*</span>
                </UmscLabel>
                <UmscInput
                  shape="square"
                  id="checkout-address1"
                  type="text"
                  autoComplete="shipping address-line1"
                  value={f.addressLine1}
                  onChange={(e) => f.setAddressLine1(e.target.value)}
                  placeholder="Street address, P.O. box"
                  required={f.deliveryMethod === "ship"}
                  aria-required="true"
                  aria-invalid={
                    submitAttempted && !f.addressLine1.trim() ? true : undefined
                  }
                />
              </div>

              <div>
                <UmscLabel htmlFor="checkout-address2">
                  Address line 2
                </UmscLabel>
                <UmscInput
                  shape="square"
                  id="checkout-address2"
                  type="text"
                  autoComplete="shipping address-line2"
                  value={f.addressLine2}
                  onChange={(e) => f.setAddressLine2(e.target.value)}
                  placeholder="Apartment, suite, etc."
                />
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <UmscLabel htmlFor="checkout-city">
                    City <span aria-hidden="true">*</span>
                  </UmscLabel>
                  <UmscInput
                    shape="square"
                    id="checkout-city"
                    type="text"
                    autoComplete="shipping address-level2"
                    value={f.city}
                    onChange={(e) => f.setCity(e.target.value)}
                    required={f.deliveryMethod === "ship"}
                    aria-required="true"
                    aria-invalid={
                      submitAttempted && !f.city.trim() ? true : undefined
                    }
                  />
                </div>
                <div>
                  <UmscLabel htmlFor="checkout-state" id="checkout-state-label">
                    State / Province <span aria-hidden="true">*</span>
                  </UmscLabel>
                  <Select value={f.state} onValueChange={(v) => f.setState(v)}>
                    <SelectTrigger
                      id="checkout-state"
                      aria-labelledby="checkout-state-label"
                      aria-required="true"
                      aria-invalid={
                        submitAttempted && !f.state ? true : undefined
                      }
                      className={cn(
                        umscInputClass,
                        "w-full justify-between rounded-none",
                      )}
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

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <UmscLabel htmlFor="checkout-postal">
                    ZIP / Postal code <span aria-hidden="true">*</span>
                  </UmscLabel>
                  <UmscInput
                    shape="square"
                    id="checkout-postal"
                    type="text"
                    autoComplete="shipping postal-code"
                    value={f.postalCode}
                    onChange={(e) => f.setPostalCode(e.target.value)}
                    required={f.deliveryMethod === "ship"}
                    aria-required="true"
                    aria-invalid={
                      submitAttempted && !f.postalCode.trim() ? true : undefined
                    }
                  />
                </div>
                <div>
                  <UmscLabel
                    htmlFor="checkout-country"
                    id="checkout-country-label"
                  >
                    Country <span aria-hidden="true">*</span>
                  </UmscLabel>
                  <Select
                    value={f.country}
                    onValueChange={(v) => f.setCountry(v as SupportedCountry)}
                  >
                    <SelectTrigger
                      id="checkout-country"
                      aria-labelledby="checkout-country-label"
                      className={cn(
                        umscInputClass,
                        "w-full justify-between rounded-none",
                      )}
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
            </CardShell>
          )}
        </div>

        {/* ── Right: Order summary (sticky) ─────────────────────────────────── */}
        <div className="lg:sticky lg:top-6">
          <div className="border border-[var(--umsc-line)] bg-[var(--umsc-white)]">
            <div className="border-b border-[var(--umsc-line)] px-6 py-5">
              <h2
                {...fieldAttr("umsc.checkout.summary-heading")}
                className="umsc-serif text-[18px] font-normal text-[var(--umsc-ink)]"
              >
                {summaryHeading}
              </h2>
            </div>

            <div className="flex flex-col gap-6 px-6 py-6">
              {/* Item list */}
              <div className="flex max-h-[260px] flex-col gap-3.5 overflow-y-auto">
                {f.items.map((item) => (
                  <div
                    key={`${item.productId}-${item.variantId}`}
                    className="flex items-start gap-3"
                  >
                    <div className="relative size-14 shrink-0 overflow-hidden border border-[var(--umsc-line)] bg-[var(--umsc-cream)]">
                      {hasCustomImage(item.imageUrl ?? undefined) ? (
                        <Image
                          src={item.imageUrl!}
                          alt=""
                          fill
                          sizes="56px"
                          className="object-cover"
                        />
                      ) : (
                        <UmscImageFallback
                          aspect="1 / 1"
                          className="border-0"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="umsc-sans truncate text-[13px] font-medium text-[var(--umsc-ink)]">
                        {item.productName}
                      </p>
                      {item.variantName && (
                        <p className="umsc-sans text-[12px] text-[var(--umsc-muted)]">
                          {item.variantName}
                        </p>
                      )}
                      <p className="umsc-sans text-[12px] text-[var(--umsc-muted)]">
                        Qty: {item.quantity}
                      </p>
                    </div>
                    <p className="umsc-tabular umsc-sans shrink-0 text-[13px] font-medium text-[var(--umsc-ink)]">
                      {formatPrice(item.price * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Discount code */}
              {f.couponsEnabled && (
                <div className="flex flex-col gap-2.5 border-t border-[var(--umsc-line)] pt-5">
                  <UmscLabel htmlFor="umsc-discount-code" className="mb-0">
                    <span {...fieldAttr("umsc.checkout.discount-label")}>
                      {discountLabel}
                    </span>
                  </UmscLabel>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Tag
                        aria-hidden="true"
                        className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-[var(--umsc-muted)]"
                      />
                      <UmscInput
                        shape="square"
                        id="umsc-discount-code"
                        type="text"
                        placeholder="CODE"
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
                        aria-invalid={!!f.discountFieldError}
                        aria-describedby={
                          f.discountFieldError
                            ? "umsc-discount-error"
                            : undefined
                        }
                        autoComplete="off"
                        className="pl-9"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={f.handleApplyDiscount}
                      disabled={
                        f.isValidatingDiscount || !f.discountCodeInput.trim()
                      }
                      aria-label={
                        f.isValidatingDiscount
                          ? "Applying discount code"
                          : "Apply discount code"
                      }
                      className="umsc-sans h-11 shrink-0 border border-[var(--umsc-line)] px-4 text-[11px] font-semibold tracking-[0.1em] text-[var(--umsc-muted)] uppercase disabled:opacity-45"
                    >
                      {f.isValidatingDiscount ? (
                        <Loader2
                          className="size-3.5 animate-spin"
                          aria-hidden="true"
                        />
                      ) : (
                        "Apply"
                      )}
                    </button>
                  </div>

                  {f.discountFieldError && (
                    <UmscFieldError
                      id="umsc-discount-error"
                      className="border border-[var(--umsc-error)]/30 bg-[var(--umsc-error)]/10 px-3 py-2"
                    >
                      {f.discountFieldError}
                    </UmscFieldError>
                  )}

                  {f.discountCodeLabel && f.discountAmount > 0 && (
                    <p
                      role="status"
                      className="umsc-sans border border-[var(--umsc-success)]/30 bg-[var(--umsc-success)]/10 px-3 py-2 text-[12px] leading-[1.4] text-[var(--umsc-success)]"
                    >
                      Discount applied: <strong>{f.discountCodeLabel}</strong> —
                      you saved {formatPrice(f.discountAmount)}
                    </p>
                  )}
                </div>
              )}

              {/* Totals */}
              <div className="flex flex-col gap-2.5 border-t border-[var(--umsc-line)] pt-5">
                <div className="umsc-sans flex justify-between text-[13px]">
                  <span className="text-[var(--umsc-muted)]">Subtotal</span>
                  <span className="umsc-tabular text-[var(--umsc-ink)]">
                    {formatPrice(f.subtotal)}
                  </span>
                </div>

                {f.discountAmount > 0 && f.discountCodeLabel && (
                  <div className="umsc-sans flex justify-between text-[13px] text-[var(--umsc-success)]">
                    <span>Discount ({f.discountCodeLabel})</span>
                    <span className="umsc-tabular">
                      -{formatPrice(f.discountAmount)}
                    </span>
                  </div>
                )}

                <div className="umsc-sans flex justify-between text-[13px]">
                  <span className="text-[var(--umsc-muted)]">Shipping</span>
                  <span className="umsc-tabular text-[var(--umsc-ink)]">
                    {f.deliveryMethod === "pickup" ? (
                      "In-store pickup (free)"
                    ) : shippingCalculating ? (
                      <span
                        className="inline-flex items-center gap-1.5 text-[var(--umsc-muted)]"
                        aria-live="polite"
                      >
                        <Loader2
                          className="size-3.5 animate-spin"
                          aria-hidden="true"
                        />
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

                <div className="umsc-serif flex justify-between border-t border-[var(--umsc-line)] pt-3 text-[16px] font-normal text-[var(--umsc-ink)]">
                  <span>Estimated total</span>
                  <span className="umsc-tabular">
                    {formatPrice(f.finalTotal)}
                  </span>
                </div>

                <p className="umsc-sans text-[11px] leading-[1.5] text-[var(--umsc-muted)]">
                  Tax and final total are confirmed on Stripe Checkout.
                </p>
              </div>

              <div role="alert" aria-live="assertive" aria-atomic="true">
                {f.error && (
                  <p className="umsc-sans border border-[var(--umsc-error)]/30 bg-[var(--umsc-error)]/10 px-3.5 py-2.5 text-[13px] leading-[1.4] text-[var(--umsc-error)]">
                    {f.error}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={f.isProcessing || shippingCalculating}
                aria-busy={f.isProcessing || shippingCalculating}
                className="umsc-btn umsc-btn-gold w-full justify-center gap-2.5 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <span
                  {...fieldAttr("umsc.checkout.submit-label")}
                  className="inline-flex items-center gap-2.5"
                >
                  {f.isProcessing ? (
                    <>
                      <Loader2
                        className="size-4 animate-spin"
                        aria-hidden="true"
                      />
                      Processing…
                    </>
                  ) : shippingCalculating ? (
                    <>
                      <Loader2
                        className="size-4 animate-spin"
                        aria-hidden="true"
                      />
                      Calculating shipping…
                    </>
                  ) : (
                    <>
                      <CreditCard className="size-4" aria-hidden="true" />
                      {submitLabel}
                    </>
                  )}
                </span>
              </button>

              <CheckoutTermsNotice
                disclosure={f.termsDisclosure}
                className="umsc-sans text-center text-[11px] leading-[1.5] text-[var(--umsc-muted)]"
                linkClassName="underline"
              />

              <p className="umsc-sans text-center text-[11px] leading-[1.5] text-[var(--umsc-muted)]">
                Secure &amp; encrypted payment via Stripe
              </p>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
