"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import type { DefaultCheckoutPageTemplateProps } from "../../types";
import type { SupportedCountry } from "~/lib/geo/regions";
import { COUNTRY_LABELS, getRegionOptions } from "~/lib/geo/regions";
import { formatPrice } from "~/lib/prices";
import { useCheckoutForm } from "~/hooks/use-checkout-form";
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
import {
  applySavedAddressToForm,
  SavedAddressPicker,
} from "~/app/(storefront)/_components/checkout/saved-address-picker";

type Props = {
  business: DefaultCheckoutPageTemplateProps["business"];
};

export function ElegantCheckoutForm({ business }: Props) {
  const f = useCheckoutForm(business);

  const ease = "cubic-bezier(0.22, 1, 0.36, 1)";
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // A live shipping rate is actively loading once a destination is entered but
  // the amount isn't known yet — show a spinner and block submit until it lands.
  const shippingCalculating =
    f.deliveryMethod === "ship" &&
    f.state.trim().length > 0 &&
    f.shippingPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    // Per-field client-side validation
    const errors: Record<string, string> = {};
    if (!f.email.trim()) errors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(f.email))
      errors.email = "Enter a valid email address";
    if (!f.name.trim()) errors.name = "Full name is required";
    if (!f.phone.trim()) errors.phone = "Phone number is required";
    if (f.deliveryMethod === "ship") {
      if (!f.addressLine1.trim())
        errors["address-line1"] = "Street address is required";
      if (!f.city.trim()) errors.city = "City is required";
      if (!f.state.trim()) errors.state = "State or province is required";
      if (!f.postalCode.trim())
        errors.postal = "ZIP or postal code is required";
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      document.getElementById(Object.keys(errors)[0]!)?.focus();
      return;
    }

    await f.handleSubmit(e);
  };

  const eyebrow = (label: string) => (
    <legend className="el-fieldset-legend">{label}</legend>
  );

  const handleDeliveryKeyDown = (
    e: React.KeyboardEvent,
    current: "ship" | "pickup",
  ) => {
    const methods = ["ship", "pickup"] as const;
    const idx = methods.indexOf(current);
    let next: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      next = (idx + 1) % methods.length;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      next = (idx - 1 + methods.length) % methods.length;
    }
    if (next !== null) {
      e.preventDefault();
      f.setDeliveryMethod(methods[next]!);
      const group = e.currentTarget.closest('[role="radiogroup"]');
      const btns = group?.querySelectorAll<HTMLButtonElement>('[role="radio"]');
      btns?.[next]?.focus();
    }
  };

  if (f.items.length === 0) {
    return (
      <div style={{ padding: "60px 0", textAlign: "center" }}>
        <p
          style={{
            fontFamily: "var(--font-serif, serif)",
            fontSize: 22,
            color: "var(--el-ink-soft, #6b6659)",
            marginBottom: 24,
          }}
        >
          Your bag is empty.
        </p>
        <Link
          href="/shop"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            padding: "14px 26px",
            borderRadius: 999,
            fontSize: 13,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            fontWeight: 500,
            background: "var(--el-sage, #4a5240)",
            color: "var(--el-paper, #fbf8f2)",
            textDecoration: "none",
            fontFamily: "var(--font-sans, sans-serif)",
          }}
        >
          Browse shop
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="el-checkout-form"
      style={{ display: "flex", gap: 60, flexWrap: "wrap" }}
    >
      <span className="sr-only">
        Fields marked with an asterisk (*) are required.
      </span>
      {/* ── Left: fields ── */}
      <div
        style={{
          flex: 1,
          minWidth: 280,
          display: "flex",
          flexDirection: "column",
          gap: 40,
        }}
      >
        {/* Contact */}
        <fieldset style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
          {eyebrow("Contact information")}
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <ElegantField
              label="Email *"
              htmlFor="email"
              error={fieldErrors.email}
            >
              <Input
                id="email"
                type="email"
                value={f.email}
                onChange={(e) => {
                  f.setEmail(e.target.value);
                  if (fieldErrors.email)
                    setFieldErrors((prev) => ({ ...prev, email: "" }));
                }}
                placeholder="you@example.com"
                required
                className="el-co-input"
                aria-required="true"
                aria-invalid={fieldErrors.email ? true : undefined}
                aria-describedby={fieldErrors.email ? "email-error" : undefined}
              />
            </ElegantField>
            <ElegantField
              label="Full Name *"
              htmlFor="name"
              error={fieldErrors.name}
            >
              <Input
                id="name"
                type="text"
                value={f.name}
                onChange={(e) => {
                  f.setName(e.target.value);
                  if (fieldErrors.name)
                    setFieldErrors((prev) => ({ ...prev, name: "" }));
                }}
                placeholder="Jane Doe"
                required
                className="el-co-input"
                aria-required="true"
                aria-invalid={fieldErrors.name ? true : undefined}
                aria-describedby={fieldErrors.name ? "name-error" : undefined}
              />
            </ElegantField>
            <ElegantField
              label="Phone *"
              htmlFor="phone"
              error={fieldErrors.phone}
            >
              <PhoneInput
                id="phone"
                autoComplete="tel"
                value={f.phone}
                onChange={(val) => {
                  f.setPhone(val);
                  if (fieldErrors.phone)
                    setFieldErrors((prev) => ({ ...prev, phone: "" }));
                }}
                placeholder="+1 555 123 4567"
                required
                className="el-co-input"
                aria-required="true"
                aria-invalid={fieldErrors.phone ? true : undefined}
                aria-describedby={fieldErrors.phone ? "phone-error" : undefined}
              />
            </ElegantField>
          </div>
        </fieldset>

        {/* Discount */}
        {f.couponsEnabled && (
          <fieldset style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
            {eyebrow("Discount code")}
            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "flex-end",
                flexWrap: "wrap",
              }}
            >
              <ElegantField
                label="Code"
                htmlFor="discount-code"
                style={{ flex: 1 }}
              >
                <Input
                  id="discount-code"
                  type="text"
                  value={f.discountCodeInput}
                  onChange={(e) =>
                    f.setDiscountCodeInput(e.target.value.toUpperCase())
                  }
                  placeholder="SAVE20"
                  autoComplete="off"
                  className="el-co-input"
                />
              </ElegantField>
              <button
                type="button"
                onClick={f.handleApplyDiscount}
                disabled={f.isValidatingDiscount || f.items.length === 0}
                style={{
                  padding: "10px 20px",
                  borderRadius: 999,
                  fontSize: 12,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  fontWeight: 500,
                  border: "1px solid var(--el-line, rgba(28,26,23,0.12))",
                  background: "transparent",
                  color: "var(--el-ink, #1c1a17)",
                  cursor: "pointer",
                  fontFamily: "var(--font-sans, sans-serif)",
                  opacity:
                    f.isValidatingDiscount || f.items.length === 0 ? 0.5 : 1,
                  whiteSpace: "nowrap",
                }}
              >
                {f.isValidatingDiscount ? (
                  <Loader2
                    aria-hidden={true}
                    className="h-4 w-4 animate-spin"
                  />
                ) : (
                  "Apply"
                )}
              </button>
            </div>
            <div aria-live="polite" aria-atomic="true">
              {f.discountFieldError && (
                <p
                  style={{
                    marginTop: 8,
                    fontSize: 12,
                    color: "#c0392b",
                    fontFamily: "var(--font-sans, sans-serif)",
                  }}
                >
                  {f.discountFieldError}
                </p>
              )}
              {f.discountCodeLabel && f.discountAmount > 0 && (
                <p
                  style={{
                    marginTop: 8,
                    fontSize: 12,
                    color: "var(--el-sage, #4a5240)",
                    fontFamily: "var(--font-mono, ui-monospace)",
                    letterSpacing: "0.1em",
                  }}
                >
                  Code {f.discountCodeLabel} applied.
                </p>
              )}
            </div>
          </fieldset>
        )}

        {/* Delivery method */}
        {f.shippingConfig.offersInStorePickup && (
          <fieldset style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
            {eyebrow("Delivery")}
            <div
              role="radiogroup"
              aria-label="Delivery method"
              style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
            >
              {(["ship", "pickup"] as const).map((method) => (
                <button
                  key={method}
                  type="button"
                  role="radio"
                  aria-checked={f.deliveryMethod === method}
                  tabIndex={f.deliveryMethod === method ? 0 : -1}
                  onClick={() => f.setDeliveryMethod(method)}
                  onKeyDown={(e) => handleDeliveryKeyDown(e, method)}
                  className="el-delivery-btn"
                >
                  {method === "ship" ? "Ship to address" : "In-store pickup"}
                </button>
              ))}
            </div>
            <p
              style={{
                marginTop: 12,
                fontSize: 13,
                color: "var(--el-ink-soft, #6b6659)",
                fontFamily: "var(--font-sans, sans-serif)",
              }}
            >
              {f.deliveryMethod === "pickup"
                ? "No shipping charge. Pick up at the store."
                : "Shipping calculated at checkout."}
            </p>
            {f.deliveryMethod === "pickup" && (
              <div
                style={{
                  marginTop: 12,
                  padding: "12px 14px",
                  border: "1px solid var(--el-line, rgba(28,26,23,0.12))",
                  borderRadius: 6,
                  background: "var(--el-cream-2, #ebe6dc)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                <p
                  style={{
                    fontFamily: "var(--font-mono, ui-monospace)",
                    fontSize: 11,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "var(--el-ink, #1c1a17)",
                    margin: 0,
                  }}
                >
                  Pickup location
                </p>
                <p
                  style={{
                    fontFamily: "var(--font-sans, sans-serif)",
                    fontSize: 13,
                    color: "var(--el-ink-soft, #6b6659)",
                    margin: 0,
                  }}
                >
                  {f.shippingConfig.pickupLocation ??
                    business.businessAddress ??
                    "Pickup details will be confirmed by the store."}
                </p>
                {f.shippingConfig.pickupInstructions ? (
                  <p
                    style={{
                      fontFamily: "var(--font-sans, sans-serif)",
                      fontSize: 13,
                      color: "var(--el-ink-soft, #6b6659)",
                      whiteSpace: "pre-line",
                      margin: 0,
                    }}
                  >
                    {f.shippingConfig.pickupInstructions}
                  </p>
                ) : null}
              </div>
            )}
          </fieldset>
        )}

        {/* Shipping address */}
        {f.deliveryMethod === "ship" && (
          <fieldset style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
            {eyebrow("Shipping address")}
            <SavedAddressPicker
              className="mb-5"
              onSelect={(address) => applySavedAddressToForm(f, address)}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <ElegantField
                label="Address line 1 *"
                htmlFor="address-line1"
                error={fieldErrors["address-line1"]}
              >
                <Input
                  id="address-line1"
                  type="text"
                  autoComplete="shipping address-line1"
                  value={f.addressLine1}
                  onChange={(e) => {
                    f.setAddressLine1(e.target.value);
                    if (fieldErrors["address-line1"])
                      setFieldErrors((prev) => ({
                        ...prev,
                        "address-line1": "",
                      }));
                  }}
                  placeholder="Street address, P.O. box"
                  required={f.deliveryMethod === "ship"}
                  className="el-co-input"
                  aria-required="true"
                  aria-invalid={fieldErrors["address-line1"] ? true : undefined}
                  aria-describedby={
                    fieldErrors["address-line1"]
                      ? "address-line1-error"
                      : undefined
                  }
                />
              </ElegantField>
              <ElegantField label="Address line 2" htmlFor="address-line2">
                <Input
                  id="address-line2"
                  type="text"
                  autoComplete="shipping address-line2"
                  value={f.addressLine2}
                  onChange={(e) => f.setAddressLine2(e.target.value)}
                  placeholder="Apartment, suite, etc."
                  className="el-co-input"
                />
              </ElegantField>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 18,
                }}
              >
                <ElegantField
                  label="City *"
                  htmlFor="city"
                  error={fieldErrors.city}
                >
                  <Input
                    id="city"
                    type="text"
                    autoComplete="shipping address-level2"
                    value={f.city}
                    onChange={(e) => {
                      f.setCity(e.target.value);
                      if (fieldErrors.city)
                        setFieldErrors((prev) => ({ ...prev, city: "" }));
                    }}
                    required={f.deliveryMethod === "ship"}
                    className="el-co-input"
                    aria-required="true"
                    aria-invalid={fieldErrors.city ? true : undefined}
                    aria-describedby={
                      fieldErrors.city ? "city-error" : undefined
                    }
                  />
                </ElegantField>
                <ElegantField
                  label="State / Province *"
                  htmlFor="state"
                  error={fieldErrors.state}
                >
                  <Select
                    value={f.state}
                    onValueChange={(v) => {
                      f.setState(v);
                      if (fieldErrors.state)
                        setFieldErrors((prev) => ({ ...prev, state: "" }));
                    }}
                  >
                    <SelectTrigger
                      id="state"
                      className="el-co-input w-full rounded-none border-x-0 border-t-0 px-0 shadow-none focus:ring-0"
                      aria-required="true"
                      aria-invalid={fieldErrors.state ? true : undefined}
                      aria-describedby={
                        fieldErrors.state ? "state-error" : undefined
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
                </ElegantField>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 18,
                }}
              >
                <ElegantField
                  label="ZIP / Postal code *"
                  htmlFor="postal"
                  error={fieldErrors.postal}
                >
                  <Input
                    id="postal"
                    type="text"
                    autoComplete="shipping postal-code"
                    value={f.postalCode}
                    onChange={(e) => {
                      f.setPostalCode(e.target.value);
                      if (fieldErrors.postal)
                        setFieldErrors((prev) => ({ ...prev, postal: "" }));
                    }}
                    required={f.deliveryMethod === "ship"}
                    className="el-co-input"
                    aria-required="true"
                    aria-invalid={fieldErrors.postal ? true : undefined}
                    aria-describedby={
                      fieldErrors.postal ? "postal-error" : undefined
                    }
                  />
                </ElegantField>
                <ElegantField label="Country *" htmlFor="country">
                  <Select
                    value={f.country}
                    onValueChange={(v) => f.setCountry(v as SupportedCountry)}
                  >
                    <SelectTrigger
                      id="country"
                      className="el-co-input w-full rounded-none border-x-0 border-t-0 px-0 shadow-none focus:ring-0"
                      aria-required="true"
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
                </ElegantField>
              </div>
            </div>
          </fieldset>
        )}
      </div>

      {/* ── Right: order summary ── */}
      <div style={{ width: "100%", maxWidth: 380, flexShrink: 0 }}>
        <div
          style={{
            position: "sticky",
            top: 120,
            background: "var(--el-paper, #fbf8f2)",
            border: "1px solid var(--el-line, rgba(28,26,23,0.12))",
            borderRadius: 8,
            padding: "28px 28px",
          }}
        >
          <h2
            style={{
              fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)",
              fontSize: 22,
              fontWeight: 500,
              color: "var(--el-ink, #1c1a17)",
              marginBottom: 20,
            }}
          >
            Order summary
          </h2>

          {/* Item list */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 14,
              marginBottom: 20,
              maxHeight: 240,
              overflowY: "auto",
            }}
          >
            {f.items.map((item) => (
              <div
                key={`${item.productId}-${item.variantId}`}
                style={{ display: "flex", alignItems: "center", gap: 12 }}
              >
                <div
                  style={{
                    width: 48,
                    aspectRatio: "4/5",
                    borderRadius: 4,
                    position: "relative",
                    overflow: "hidden",
                    flexShrink: 0,
                    background: "var(--el-cream-2, #ebe6dc)",
                  }}
                >
                  {item.imageUrl && (
                    <Image
                      src={item.imageUrl}
                      alt={item.productName}
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontFamily: "var(--font-serif, serif)",
                      fontSize: 14,
                      color: "var(--el-ink, #1c1a17)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.productName}
                  </p>
                  {item.variantName && (
                    <p
                      style={{
                        fontFamily: "var(--font-mono, ui-monospace)",
                        fontSize: 10,
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        color: "var(--el-ink-soft, #6b6659)",
                      }}
                    >
                      {item.variantName}
                    </p>
                  )}
                  <p
                    style={{
                      fontFamily: "var(--font-mono, ui-monospace)",
                      fontSize: 10,
                      letterSpacing: "0.1em",
                      color: "var(--el-ink-soft, #6b6659)",
                    }}
                  >
                    Qty: {item.quantity}
                  </p>
                </div>
                <span
                  style={{
                    fontFamily: "var(--font-sans, sans-serif)",
                    fontSize: 13,
                    color: "var(--el-ink, #1c1a17)",
                    flexShrink: 0,
                  }}
                >
                  {formatPrice(item.price * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div
            style={{
              borderTop: "1px solid var(--el-line, rgba(28,26,23,0.12))",
              paddingTop: 16,
              display: "flex",
              flexDirection: "column",
              gap: 10,
              marginBottom: 16,
            }}
          >
            {/* Subtotal */}
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span
                style={{
                  fontFamily: "var(--font-mono, ui-monospace)",
                  fontSize: 11,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "var(--el-ink-soft, #6b6659)",
                }}
              >
                Subtotal
              </span>
              <span
                style={{
                  fontFamily: "var(--font-sans, sans-serif)",
                  fontSize: 13,
                  color: "var(--el-ink, #1c1a17)",
                }}
              >
                {formatPrice(f.subtotal)}
              </span>
            </div>

            {/* Discount */}
            {f.discountAmount > 0 && f.discountCodeLabel && (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span
                  style={{
                    fontFamily: "var(--font-mono, ui-monospace)",
                    fontSize: 11,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "var(--el-sage, #4a5240)",
                  }}
                >
                  Discount ({f.discountCodeLabel})
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-sans, sans-serif)",
                    fontSize: 13,
                    color: "var(--el-sage, #4a5240)",
                  }}
                >
                  −{formatPrice(f.discountAmount)}
                </span>
              </div>
            )}

            {/* Shipping */}
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span
                style={{
                  fontFamily: "var(--font-mono, ui-monospace)",
                  fontSize: 11,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "var(--el-ink-soft, #6b6659)",
                }}
              >
                Shipping
              </span>
              <span
                style={{
                  fontFamily: "var(--font-sans, sans-serif)",
                  fontSize: 13,
                  color: "var(--el-ink, #1c1a17)",
                }}
              >
                {f.deliveryMethod === "pickup" ? (
                  "Pickup (free)"
                ) : shippingCalculating ? (
                  <span
                    className="inline-flex items-center gap-1.5"
                    style={{ color: "var(--el-ink-soft, #6b6659)" }}
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
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                paddingTop: 12,
                borderTop: "1px solid var(--el-line, rgba(28,26,23,0.12))",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono, ui-monospace)",
                  fontSize: 11,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "var(--el-ink, #1c1a17)",
                }}
              >
                Estimated total
              </span>
              <span
                style={{
                  fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)",
                  fontSize: 24,
                  color: "var(--el-ink, #1c1a17)",
                }}
              >
                {formatPrice(f.finalTotal)}
              </span>
            </div>
          </div>

          <div role="alert" aria-live="assertive" aria-atomic="true">
            {f.error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{f.error}</AlertDescription>
              </Alert>
            )}
          </div>

          <button
            type="submit"
            disabled={f.isProcessing || shippingCalculating}
            aria-busy={f.isProcessing || shippingCalculating}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              width: "100%",
              padding: "15px 24px",
              borderRadius: 999,
              fontSize: 13,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              fontWeight: 500,
              background: "var(--el-ink, #1c1a17)",
              color: "var(--el-paper, #fbf8f2)",
              border: "none",
              cursor:
                f.isProcessing || shippingCalculating
                  ? "not-allowed"
                  : "pointer",
              opacity: f.isProcessing || shippingCalculating ? 0.7 : 1,
              fontFamily: "var(--font-sans, sans-serif)",
              transition: `background 0.4s ${ease}`,
            }}
            className="el-pay-btn"
          >
            {f.isProcessing ? (
              <>
                <Loader2 aria-hidden={true} className="h-4 w-4 animate-spin" />
                Processing…
              </>
            ) : shippingCalculating ? (
              <>
                <Loader2 aria-hidden={true} className="h-4 w-4 animate-spin" />
                Calculating shipping…
              </>
            ) : (
              "Continue to payment"
            )}
          </button>
          <p
            style={{
              marginTop: 12,
              textAlign: "center",
              fontSize: 11,
              color: "var(--el-ink-soft, #6b6659)",
              fontFamily: "var(--font-mono, ui-monospace)",
              letterSpacing: "0.1em",
            }}
          >
            Secure & encrypted via Stripe
          </p>
        </div>
      </div>
    </form>
  );
}

function ElegantField({
  label,
  htmlFor,
  children,
  style,
  error,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
  error?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, ...style }}>
      <Label
        htmlFor={htmlFor}
        style={{
          fontFamily: "var(--font-mono, ui-monospace)",
          fontSize: 11,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--el-ink-soft, #6b6659)",
        }}
      >
        {label}
      </Label>
      {children}
      {error && (
        <span id={`${htmlFor}-error`} className="el-field-error">
          {error}
        </span>
      )}
    </div>
  );
}
