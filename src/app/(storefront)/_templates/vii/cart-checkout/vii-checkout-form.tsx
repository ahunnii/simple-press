"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CreditCard, Loader2, Tag } from "lucide-react";

import type { DefaultCheckoutPageTemplateProps } from "../../types";
import type { SupportedCountry } from "~/lib/geo/regions";
import { COUNTRY_LABELS, getRegionOptions } from "~/lib/geo/regions";
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

import { useViiReveal } from "../hooks/use-vii-reveal";
import { ViiOverline } from "../shared/vii-overline";

const formatPrice = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100,
  );

type Props = {
  business: DefaultCheckoutPageTemplateProps["business"];
  contactOverline: string;
  contactHeading: string;
  deliveryOverline: string;
  deliveryHeading: string;
  shippingOverline: string;
  shippingHeading: string;
  summaryOverline: string;
  summaryHeading: string;
  submitLabel: string;
  emptyHeading: string;
  emptyCta: string;
};

export function ViiCheckoutForm({
  business,
  contactOverline,
  contactHeading,
  deliveryOverline,
  deliveryHeading,
  shippingOverline,
  shippingHeading,
  summaryOverline,
  summaryHeading,
  submitLabel,
  emptyHeading,
  emptyCta,
}: Props) {
  const f = useCheckoutForm(business);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const { ref, visible } = useViiReveal(0.05);

  // A live shipping rate is actively loading once a destination is entered but
  // the amount isn't known yet — show a spinner and block submit until it lands.
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
      <div
        style={{
          textAlign: "center",
          padding: "clamp(64px, 10vw, 96px) clamp(24px, 6vw, 96px)",
        }}
      >
        <p
          style={{
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            fontSize: "clamp(22px, 3vw, 30px)",
            fontWeight: 500,
            color: "var(--vii-navy)",
            marginBottom: 32,
          }}
        >
          {emptyHeading}
        </p>
        <Link
          href="/shop"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "14px 32px",
            background: "var(--vii-copper-deep)",
            color: "var(--vii-paper)",
            fontFamily: "var(--font-sans)",
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            borderRadius: "var(--radius)",
            textDecoration: "none",
          }}
        >
          {emptyCta}
        </Link>
      </div>
    );
  }

  // ── Form ─────────────────────────────────────────────────────────────────────
  return (
    // vii-contact-form class applies underline-input CSS from globals.css
    <form className="vii-contact-form" onSubmit={onSubmit}>
      <div
        ref={ref}
        style={{
          display: "grid",
          gap: "clamp(32px, 4vw, 48px)",
          gridTemplateColumns: "1fr",
          alignItems: "start",
        }}
        className={`lg:grid-cols-[1fr_360px] vii-reveal-group${visible ? "is-visible" : ""}`}
      >
        {/* ── Left: fieldsets ─────────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
          {/* Contact Information */}
          <fieldset
            aria-labelledby="vii-co-contact-heading"
            className="vii-reveal-item"
            style={
              {
                border: 0,
                padding: 0,
                margin: 0,
                background: "var(--vii-paper)",
                borderRadius: "var(--radius)",
                "--i": 0,
              } as React.CSSProperties
            }
          >
            <div
              style={{
                padding: "clamp(24px, 3vw, 36px)",
                borderBottom: "1px solid var(--vii-hairline)",
              }}
            >
              <ViiOverline style={{ marginBottom: 10 }}>
                {contactOverline}
              </ViiOverline>
              <h2
                id="vii-co-contact-heading"
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: 22,
                  fontWeight: 500,
                  color: "var(--vii-navy)",
                  margin: 0,
                }}
              >
                {contactHeading}
              </h2>
            </div>

            <div
              style={{
                padding: "clamp(24px, 3vw, 36px)",
                display: "flex",
                flexDirection: "column",
                gap: 28,
              }}
            >
              {/* Email */}
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                <label htmlFor="checkout-email" className="vii-field-label">
                  Email <span aria-hidden="true">*</span>
                </label>
                <input
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

              {/* Full Name */}
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                <label htmlFor="checkout-name" className="vii-field-label">
                  Full Name <span aria-hidden="true">*</span>
                </label>
                <input
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

              {/* Phone — intentionally uses PhoneInput component; [type="tel"]
                  is excluded from underline CSS so the component keeps its own
                  styling. */}
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                <label htmlFor="checkout-phone" className="vii-field-label">
                  Phone <span aria-hidden="true">*</span>
                </label>
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
            </div>
          </fieldset>

          {/* Delivery Method — only when store offers in-store pickup */}
          {f.shippingConfig.offersInStorePickup && (
            <div
              role="group"
              aria-labelledby="vii-co-delivery-heading"
              className="vii-reveal-item"
              style={
                {
                  background: "var(--vii-paper)",
                  borderRadius: "var(--radius)",
                  "--i": 1,
                } as React.CSSProperties
              }
            >
              <div
                style={{
                  padding: "clamp(24px, 3vw, 36px)",
                  borderBottom: "1px solid var(--vii-hairline)",
                }}
              >
                <ViiOverline style={{ marginBottom: 10 }}>
                  {deliveryOverline}
                </ViiOverline>
                <h2
                  id="vii-co-delivery-heading"
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: 22,
                    fontWeight: 500,
                    color: "var(--vii-navy)",
                    margin: 0,
                  }}
                >
                  {deliveryHeading}
                </h2>
              </div>

              <div style={{ padding: "clamp(24px, 3vw, 36px)" }}>
                <div
                  role="group"
                  aria-label="Delivery method"
                  style={{ display: "flex", flexWrap: "wrap", gap: 12 }}
                >
                  {/* Ship tile */}
                  <button
                    type="button"
                    aria-pressed={f.deliveryMethod === "ship"}
                    onClick={() => f.setDeliveryMethod("ship")}
                    style={{
                      flex: 1,
                      minWidth: 140,
                      padding: "16px 20px",
                      border: `1.5px solid ${f.deliveryMethod === "ship" ? "var(--vii-navy)" : "var(--vii-hairline)"}`,
                      borderRadius: "var(--radius)",
                      background:
                        f.deliveryMethod === "ship"
                          ? "color-mix(in srgb, var(--vii-navy) 5%, transparent)"
                          : "transparent",
                      cursor: "pointer",
                      textAlign: "left",
                      transition:
                        "border-color 0.15s ease, background 0.15s ease",
                    }}
                  >
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      {f.deliveryMethod === "ship" && (
                        <span
                          aria-hidden="true"
                          className="vii-fade-up"
                          style={{
                            width: 14,
                            height: 14,
                            borderRadius: "50%",
                            background: "var(--vii-copper-deep)",
                            flex: "none",
                          }}
                        />
                      )}
                      <span
                        style={{
                          fontFamily: "var(--font-sans)",
                          fontSize: 13,
                          fontWeight: 500,
                          letterSpacing: "0.04em",
                          color: "var(--vii-navy)",
                        }}
                      >
                        Ship to address
                      </span>
                    </span>
                  </button>

                  {/* Pickup tile */}
                  <button
                    type="button"
                    aria-pressed={f.deliveryMethod === "pickup"}
                    onClick={() => f.setDeliveryMethod("pickup")}
                    style={{
                      flex: 1,
                      minWidth: 140,
                      padding: "16px 20px",
                      border: `1.5px solid ${f.deliveryMethod === "pickup" ? "var(--vii-navy)" : "var(--vii-hairline)"}`,
                      borderRadius: "var(--radius)",
                      background:
                        f.deliveryMethod === "pickup"
                          ? "color-mix(in srgb, var(--vii-navy) 5%, transparent)"
                          : "transparent",
                      cursor: "pointer",
                      textAlign: "left",
                      transition:
                        "border-color 0.15s ease, background 0.15s ease",
                    }}
                  >
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      {f.deliveryMethod === "pickup" && (
                        <span
                          aria-hidden="true"
                          className="vii-fade-up"
                          style={{
                            width: 14,
                            height: 14,
                            borderRadius: "50%",
                            background: "var(--vii-copper-deep)",
                            flex: "none",
                          }}
                        />
                      )}
                      <span
                        style={{
                          fontFamily: "var(--font-sans)",
                          fontSize: 13,
                          fontWeight: 500,
                          letterSpacing: "0.04em",
                          color: "var(--vii-navy)",
                        }}
                      >
                        In-store pickup
                      </span>
                    </span>
                  </button>
                </div>

                <p
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 13,
                    color: "var(--vii-ink-soft)",
                    marginTop: 16,
                    lineHeight: 1.5,
                  }}
                >
                  {f.deliveryMethod === "pickup"
                    ? "No shipping charge. You'll pick up your order at the store."
                    : "Shipping cost is based on your store's shipping settings."}
                </p>
                {f.deliveryMethod === "pickup" && (
                  <div
                    className="vii-fade-up"
                    style={{
                      marginTop: 12,
                      padding: "12px 14px",
                      border: "1px solid var(--vii-hairline)",
                      borderRadius: "var(--radius)",
                      background: "var(--vii-cream)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                    }}
                  >
                    <p
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: 11,
                        fontWeight: 500,
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                        color: "var(--vii-navy)",
                        margin: 0,
                      }}
                    >
                      Pickup location
                    </p>
                    <p
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: 13,
                        color: "var(--vii-ink-soft)",
                        lineHeight: 1.5,
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
                          fontFamily: "var(--font-sans)",
                          fontSize: 13,
                          color: "var(--vii-ink-soft)",
                          lineHeight: 1.5,
                          whiteSpace: "pre-line",
                          margin: 0,
                        }}
                      >
                        {f.shippingConfig.pickupInstructions}
                      </p>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Shipping Address — only when delivery method is ship */}
          {f.deliveryMethod === "ship" && (
            <fieldset
              aria-labelledby="vii-co-shipping-heading"
              className="vii-fade-up"
              style={{
                border: 0,
                padding: 0,
                margin: 0,
                background: "var(--vii-paper)",
                borderRadius: "var(--radius)",
              }}
            >
              <div
                style={{
                  padding: "clamp(24px, 3vw, 36px)",
                  borderBottom: "1px solid var(--vii-hairline)",
                }}
              >
                <ViiOverline style={{ marginBottom: 10 }}>
                  {shippingOverline}
                </ViiOverline>
                <h2
                  id="vii-co-shipping-heading"
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: 22,
                    fontWeight: 500,
                    color: "var(--vii-navy)",
                    margin: 0,
                  }}
                >
                  {shippingHeading}
                </h2>
              </div>

              <div
                style={{
                  padding: "clamp(24px, 3vw, 36px)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 28,
                }}
              >
                <p
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 13,
                    color: "var(--vii-ink-soft)",
                    lineHeight: 1.5,
                    marginTop: -8,
                  }}
                >
                  {f.shippingConfig.shippingType === SHIPPING_TYPES.ZONE_WEIGHT
                    ? "We price shipping from this address. Make changes here before continuing to payment."
                    : "This is sent to Stripe Checkout prefilled so you can confirm or edit your address before paying."}
                </p>

                {/* Address line 1 */}
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 0 }}
                >
                  <label
                    htmlFor="checkout-address1"
                    className="vii-field-label"
                  >
                    Address line 1 <span aria-hidden="true">*</span>
                  </label>
                  <input
                    id="checkout-address1"
                    type="text"
                    autoComplete="shipping address-line1"
                    value={f.addressLine1}
                    onChange={(e) => f.setAddressLine1(e.target.value)}
                    placeholder="Street address, P.O. box"
                    required={f.deliveryMethod === "ship"}
                    aria-required="true"
                    aria-invalid={
                      submitAttempted && !f.addressLine1.trim()
                        ? true
                        : undefined
                    }
                  />
                </div>

                {/* Address line 2 */}
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 0 }}
                >
                  <label
                    htmlFor="checkout-address2"
                    className="vii-field-label"
                  >
                    Address line 2
                  </label>
                  <input
                    id="checkout-address2"
                    type="text"
                    autoComplete="shipping address-line2"
                    value={f.addressLine2}
                    onChange={(e) => f.setAddressLine2(e.target.value)}
                    placeholder="Apartment, suite, etc."
                  />
                </div>

                {/* City + State grid */}
                <div
                  style={{ display: "grid", gap: 28 }}
                  className="sm:grid-cols-2"
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 0,
                    }}
                  >
                    <label htmlFor="checkout-city" className="vii-field-label">
                      City <span aria-hidden="true">*</span>
                    </label>
                    <input
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
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 0,
                    }}
                  >
                    <label
                      htmlFor="checkout-state"
                      id="checkout-state-label"
                      className="vii-field-label"
                    >
                      State / Province <span aria-hidden="true">*</span>
                    </label>
                    <Select
                      value={f.state}
                      onValueChange={(v) => f.setState(v)}
                    >
                      <SelectTrigger
                        id="checkout-state"
                        aria-labelledby="checkout-state-label"
                        aria-required="true"
                        aria-invalid={
                          submitAttempted && !f.state ? true : undefined
                        }
                        style={{
                          background: "transparent",
                          border: "none",
                          borderBottom: "1.5px solid var(--vii-tan)",
                          borderRadius: 0,
                          boxShadow: "none",
                          padding: "10px 0",
                          fontFamily: "var(--font-sans)",
                          fontSize: 15,
                          color: "var(--vii-navy)",
                          height: "auto",
                          width: "100%",
                        }}
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

                {/* Postal + Country grid */}
                <div
                  style={{ display: "grid", gap: 28 }}
                  className="sm:grid-cols-2"
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 0,
                    }}
                  >
                    <label
                      htmlFor="checkout-postal"
                      className="vii-field-label"
                    >
                      ZIP / Postal code <span aria-hidden="true">*</span>
                    </label>
                    <input
                      id="checkout-postal"
                      type="text"
                      autoComplete="shipping postal-code"
                      value={f.postalCode}
                      onChange={(e) => f.setPostalCode(e.target.value)}
                      required={f.deliveryMethod === "ship"}
                      aria-required="true"
                      aria-invalid={
                        submitAttempted && !f.postalCode.trim()
                          ? true
                          : undefined
                      }
                    />
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 0,
                    }}
                  >
                    <label
                      htmlFor="checkout-country"
                      id="checkout-country-label"
                      className="vii-field-label"
                    >
                      Country <span aria-hidden="true">*</span>
                    </label>
                    {/*
                     * Country select: styled inline to match the underline/hairline
                     * aesthetic. Transparent bg, 1.5px bottom-only border in --vii-tan,
                     * zero radius, navy text. No global CSS added.
                     */}
                    <Select
                      value={f.country}
                      onValueChange={(v) => f.setCountry(v as SupportedCountry)}
                    >
                      <SelectTrigger
                        id="checkout-country"
                        aria-labelledby="checkout-country-label"
                        style={{
                          background: "transparent",
                          border: "none",
                          borderBottom: "1.5px solid var(--vii-tan)",
                          borderRadius: 0,
                          boxShadow: "none",
                          padding: "10px 0",
                          fontFamily: "var(--font-sans)",
                          fontSize: 15,
                          color: "var(--vii-navy)",
                          height: "auto",
                          width: "100%",
                        }}
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
            </fieldset>
          )}
        </div>

        {/* ── Right: Order Summary (sticky paper card) ─────────────────────── */}
        <div style={{ position: "sticky", top: 24 }}>
          <div
            className="vii-reveal-item"
            style={
              {
                background: "var(--vii-paper)",
                borderRadius: "var(--radius)",
                border: "1px solid var(--vii-hairline)",
                "--i": 2,
              } as React.CSSProperties
            }
          >
            {/* Summary header */}
            <div
              style={{
                padding:
                  "clamp(20px, 2.5vw, 28px) clamp(20px, 2.5vw, 28px) 16px",
                borderBottom: "1px solid var(--vii-hairline)",
              }}
            >
              <ViiOverline style={{ marginBottom: 8 }}>
                {summaryOverline}
              </ViiOverline>
              <h2
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: 20,
                  fontWeight: 500,
                  color: "var(--vii-navy)",
                  margin: 0,
                }}
              >
                {summaryHeading}
              </h2>
            </div>

            <div
              style={{
                padding: "clamp(20px, 2.5vw, 28px)",
                display: "flex",
                flexDirection: "column",
                gap: 24,
              }}
            >
              {/* Item list */}
              <div
                style={{
                  maxHeight: 260,
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                }}
              >
                {f.items.map((item) => (
                  <div
                    key={`${item.productId}-${item.variantId}`}
                    style={{
                      display: "flex",
                      gap: 12,
                      alignItems: "flex-start",
                    }}
                  >
                    {/* Product image */}
                    <div
                      style={{
                        width: 56,
                        height: 56,
                        flexShrink: 0,
                        borderRadius: "var(--radius)",
                        background: "var(--vii-cream)",
                        overflow: "hidden",
                        border: "1px solid var(--vii-hairline)",
                      }}
                    >
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.productName}
                          width={56}
                          height={56}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        <div
                          aria-hidden="true"
                          style={{
                            width: "100%",
                            height: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontFamily: "var(--font-serif)",
                            fontStyle: "italic",
                            fontSize: 18,
                            color: "var(--vii-tan)",
                          }}
                        >
                          —
                        </div>
                      )}
                    </div>

                    {/* Product meta */}
                    <div
                      style={{
                        flex: 1,
                        minWidth: 0,
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                      }}
                    >
                      <p
                        style={{
                          fontFamily: "var(--font-sans)",
                          fontSize: 13,
                          fontWeight: 500,
                          color: "var(--vii-navy)",
                          margin: 0,
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
                            fontFamily: "var(--font-sans)",
                            fontSize: 12,
                            color: "var(--vii-ink-soft)",
                            margin: 0,
                          }}
                        >
                          {item.variantName}
                        </p>
                      )}
                      <p
                        style={{
                          fontFamily: "var(--font-sans)",
                          fontSize: 12,
                          color: "var(--vii-ink-soft)",
                          margin: 0,
                        }}
                      >
                        Qty: {item.quantity}
                      </p>
                    </div>

                    {/* Line total */}
                    <p
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: 13,
                        fontWeight: 500,
                        color: "var(--vii-navy)",
                        flexShrink: 0,
                        margin: 0,
                      }}
                    >
                      {formatPrice(item.price * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Discount code input */}
              <div
                style={{
                  paddingTop: 8,
                  borderTop: "1px solid var(--vii-hairline)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <label
                  htmlFor="vii-discount-code"
                  className="vii-field-label"
                  style={{ marginBottom: 0 }}
                >
                  Discount code
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ position: "relative", flex: 1 }}>
                    <Tag
                      aria-hidden="true"
                      style={{
                        position: "absolute",
                        top: "50%",
                        left: 0,
                        transform: "translateY(-50%)",
                        width: 14,
                        height: 14,
                        color: "var(--vii-ink-soft)",
                      }}
                    />
                    <input
                      id="vii-discount-code"
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
                        f.discountFieldError ? "vii-discount-error" : undefined
                      }
                      autoComplete="off"
                      style={{ paddingLeft: 22 }}
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
                    style={{
                      flexShrink: 0,
                      padding: "0 16px",
                      background: "transparent",
                      border: "1.5px solid var(--vii-tan)",
                      borderRadius: "var(--radius)",
                      fontFamily: "var(--font-sans)",
                      fontSize: 11,
                      fontWeight: 500,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      color: "var(--vii-ink-soft)",
                      cursor: "pointer",
                      transition: "border-color 0.15s ease, color 0.15s ease",
                      opacity:
                        f.isValidatingDiscount || !f.discountCodeInput.trim()
                          ? 0.45
                          : 1,
                      minHeight: 44,
                    }}
                  >
                    {f.isValidatingDiscount ? (
                      <Loader2
                        className="h-3.5 w-3.5 animate-spin"
                        aria-hidden="true"
                      />
                    ) : (
                      "Apply"
                    )}
                  </button>
                </div>

                {/* Discount error — accessible red, not copper */}
                {f.discountFieldError && (
                  <p
                    id="vii-discount-error"
                    role="alert"
                    className="vii-fade-up"
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 12,
                      lineHeight: 1.4,
                      color: "var(--vii-error)",
                      background: "var(--vii-error-bg)",
                      border: "1px solid var(--vii-error-border)",
                      borderRadius: "var(--radius)",
                      padding: "8px 12px",
                      margin: 0,
                    }}
                  >
                    {f.discountFieldError}
                  </p>
                )}

                {/* Applied discount success */}
                {f.discountCodeLabel && f.discountAmount > 0 && (
                  <p
                    role="status"
                    className="vii-fade-up"
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 12,
                      lineHeight: 1.4,
                      color: "var(--vii-success)",
                      background: "var(--vii-success-bg)",
                      border: "1px solid var(--vii-success-border)",
                      borderRadius: "var(--radius)",
                      padding: "8px 12px",
                      margin: 0,
                    }}
                  >
                    Discount applied: <strong>{f.discountCodeLabel}</strong> —
                    you saved {formatPrice(f.discountAmount)}
                  </p>
                )}
              </div>

              {/* Totals */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  paddingTop: 8,
                  borderTop: "1px solid var(--vii-hairline)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 13,
                      color: "var(--vii-ink-soft)",
                    }}
                  >
                    Subtotal
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 13,
                      color: "var(--vii-navy)",
                    }}
                  >
                    {formatPrice(f.subtotal)}
                  </span>
                </div>

                {f.discountAmount > 0 && f.discountCodeLabel && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: 13,
                        color: "var(--vii-success)",
                      }}
                    >
                      Discount ({f.discountCodeLabel})
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: 13,
                        color: "var(--vii-success)",
                      }}
                    >
                      -{formatPrice(f.discountAmount)}
                    </span>
                  </div>
                )}

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 13,
                      color: "var(--vii-ink-soft)",
                    }}
                  >
                    Shipping
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 13,
                      color: "var(--vii-navy)",
                    }}
                  >
                    {f.deliveryMethod === "pickup" ? (
                      "In-store pickup (free)"
                    ) : shippingCalculating ? (
                      <span
                        className="inline-flex items-center gap-1.5"
                        style={{ color: "var(--vii-ink-soft)" }}
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

                {/* Divider before total */}
                <div
                  style={{
                    borderTop: "1px solid var(--vii-hairline)",
                    paddingTop: 10,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontSize: 16,
                      fontWeight: 500,
                      color: "var(--vii-navy)",
                    }}
                  >
                    Estimated total
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontSize: 18,
                      fontWeight: 500,
                      color: "var(--vii-navy)",
                    }}
                  >
                    {formatPrice(f.finalTotal)}
                  </span>
                </div>

                <p
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 11,
                    color: "var(--vii-ink-soft)",
                    lineHeight: 1.5,
                    margin: 0,
                  }}
                >
                  Tax and final total are confirmed on Stripe Checkout.
                </p>
              </div>

              {/* Error region */}
              <div role="alert" aria-live="assertive" aria-atomic="true">
                {f.error && (
                  <p
                    className="vii-fade-up"
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 13,
                      lineHeight: 1.4,
                      color: "var(--vii-error)",
                      background: "var(--vii-error-bg)",
                      border: "1px solid var(--vii-error-border)",
                      borderRadius: "var(--radius)",
                      padding: "10px 14px",
                      margin: 0,
                    }}
                  >
                    {f.error}
                  </p>
                )}
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={f.isProcessing || shippingCalculating}
                aria-busy={f.isProcessing || shippingCalculating}
                className="vii-cta-btn"
                style={{
                  position: "relative",
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  width: "100%",
                  padding: "14px 24px",
                  background: "var(--vii-copper-deep)",
                  color: "var(--vii-paper)",
                  fontFamily: "var(--font-sans)",
                  fontSize: 11,
                  fontWeight: 500,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  borderRadius: "var(--radius)",
                  border: "none",
                  cursor:
                    f.isProcessing || shippingCalculating
                      ? "not-allowed"
                      : "pointer",
                  transition: "background 0.2s ease, opacity 0.2s ease",
                  opacity: f.isProcessing || shippingCalculating ? 0.7 : 1,
                }}
              >
                {f.isProcessing ? (
                  <>
                    <Loader2
                      className="h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                    Processing…
                  </>
                ) : shippingCalculating ? (
                  <>
                    <Loader2
                      className="h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                    Calculating shipping…
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4" aria-hidden="true" />
                    {submitLabel}
                  </>
                )}
              </button>

              {/* Security note */}
              <p
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 11,
                  color: "var(--vii-ink-soft)",
                  textAlign: "center",
                  letterSpacing: "0.04em",
                  lineHeight: 1.5,
                  margin: 0,
                }}
              >
                Secure & encrypted payment via Stripe
              </p>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
