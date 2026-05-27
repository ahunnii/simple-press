"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import type { DefaultCheckoutPageTemplateProps } from "../../types";
import { formatPrice } from "~/lib/prices";
import {
  calculateShipping,
  shippingConfigFromBusiness,
} from "~/lib/shipping-utils";
import { api } from "~/trpc/react";
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
import { useCart } from "~/providers/cart-context";

type Props = {
  business: DefaultCheckoutPageTemplateProps["business"];
};

export function ElegantCheckoutForm({ business }: Props) {
  const { items, removeItem, subtotal } = useCart();
  const shippingConfig = shippingConfigFromBusiness(business);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState<"US" | "CA">("US");

  const [deliveryMethod, setDeliveryMethod] = useState<"ship" | "pickup">(
    "ship",
  );

  const [discountCodeInput, setDiscountCodeInput] = useState("");
  const [discountCodeId, setDiscountCodeId] = useState<string | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountCodeLabel, setDiscountCodeLabel] = useState<string | null>(
    null,
  );
  const [discountFieldError, setDiscountFieldError] = useState<string | null>(
    null,
  );

  const validateDiscountMutation = api.discount.validate.useMutation({
    onSuccess: (data) => {
      setDiscountCodeId(data.discount.id);
      setDiscountAmount(data.discount.discountAmount);
      setDiscountCodeLabel(data.discount.code);
      setDiscountFieldError(null);
    },
    onError: (err) => {
      setDiscountCodeId(null);
      setDiscountAmount(0);
      setDiscountCodeLabel(null);
      setDiscountFieldError(err.message ?? "Invalid code");
    },
  });

  // Reset discount when cart changes
  useEffect(() => {
    setDiscountCodeId(null);
    setDiscountAmount(0);
    setDiscountCodeLabel(null);
    setDiscountFieldError(null);
  }, [subtotal]);

  const shipping =
    deliveryMethod === "pickup"
      ? 0
      : calculateShipping(subtotal, shippingConfig);
  const finalTotal = subtotal - discountAmount + shipping;

  const handleApplyDiscount = () => {
    const code = discountCodeInput.trim();
    if (!code) {
      setDiscountFieldError("Enter a discount code");
      return;
    }
    if (subtotal <= 0) {
      setDiscountFieldError("Your cart is empty");
      return;
    }
    setDiscountFieldError(null);
    validateDiscountMutation.mutate({ code, cartTotal: subtotal });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsProcessing(true);

    try {
      if (!email || !name || !phone.trim()) {
        throw new Error("Please fill in all required contact fields");
      }

      if (
        deliveryMethod === "ship" &&
        (!addressLine1.trim() ||
          !city.trim() ||
          !state.trim() ||
          !postalCode.trim())
      ) {
        throw new Error("Please fill in all required shipping fields");
      }

      if (items.length === 0) {
        throw new Error("Your cart is empty");
      }

      const response = await fetch("/api/stripe/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          deliveryMethod,
          customerInfo: {
            email,
            name,
            phone: phone.trim(),
            shippingAddress:
              deliveryMethod === "ship"
                ? {
                    line1: addressLine1.trim(),
                    line2: addressLine2.trim() || null,
                    city: city.trim(),
                    state: state.trim(),
                    postalCode: postalCode.trim(),
                    country,
                    phone: phone.trim(),
                  }
                : null,
          },
          discountCodeId: discountCodeId,
          discountAmount: discountCodeId != null ? discountAmount : 0,
        }),
      });

      const data = (await response.json()) as {
        error?: string;
        unavailableItems?: string[];
        unavailableItemIds?: { productId: string; variantId: string | null }[];
        sessionUrl?: string;
        sessionId?: string;
      };

      if (!response.ok) {
        if (data.unavailableItemIds && data.unavailableItemIds.length > 0) {
          for (const row of data.unavailableItemIds) {
            removeItem(row.productId, row.variantId);
          }
        }
        if (data.unavailableItems && data.unavailableItems.length > 0) {
          const removedMsg =
            data.unavailableItemIds && data.unavailableItemIds.length > 0
              ? `The following items were out of stock or no longer available and have been removed from your cart: ${data.unavailableItems.join(", ")}.`
              : `${data.error ?? "Some items are unavailable."} Remove or update: ${data.unavailableItems.join(", ")}`;
          setError(removedMsg);
        } else {
          setError(data.error ?? "Failed to create checkout session");
        }
        setIsProcessing(false);
        return;
      }

      const sessionUrl = data.sessionUrl;
      if (!sessionUrl) {
        setError("Failed to create checkout session");
        setIsProcessing(false);
        return;
      }

      window.location.href = sessionUrl;
    } catch (err: unknown) {
      setError((err as Error).message ?? "Failed to create checkout session");
      setIsProcessing(false);
    }
  };

  const ease = "cubic-bezier(0.22, 1, 0.36, 1)";

  const eyebrow = (label: string) => (
    <span style={{
      fontFamily: "var(--font-mono, ui-monospace)",
      fontSize: 11,
      letterSpacing: "0.22em",
      textTransform: "uppercase" as const,
      color: "var(--el-ink-soft, #6b6659)",
      display: "block",
      marginBottom: 20,
    }}>
      {label}
    </span>
  );

  if (items.length === 0) {
    return (
      <div style={{ padding: "60px 0", textAlign: "center" }}>
        <p style={{
          fontFamily: "var(--font-serif, serif)",
          fontSize: 22,
          color: "var(--el-ink-soft, #6b6659)",
          marginBottom: 24,
        }}>
          Your bag is empty.
        </p>
        <Link href="/shop" style={{
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
        }}>
          Browse shop
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="el-checkout-form" style={{ display: "flex", gap: 60, flexWrap: "wrap" }}>
      {/* ── Left: fields ── */}
      <div style={{ flex: 1, minWidth: 280, display: "flex", flexDirection: "column", gap: 40 }}>
        {/* Contact */}
        <section>
          {eyebrow("Contact information")}
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <ElegantField label="Email *" htmlFor="email">
              <Input
                id="email" type="email" value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com" required
                className="el-co-input"
              />
            </ElegantField>
            <ElegantField label="Full Name *" htmlFor="name">
              <Input
                id="name" type="text" value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe" required
                className="el-co-input"
              />
            </ElegantField>
            <ElegantField label="Phone *" htmlFor="phone">
              <PhoneInput
                id="phone" autoComplete="tel" value={phone}
                onChange={(val) => setPhone(val)}
                placeholder="+1 555 123 4567" required
                className="el-co-input"
              />
            </ElegantField>
          </div>
        </section>

        {/* Discount */}
        <section>
          {eyebrow("Discount code")}
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
            <ElegantField label="Code" htmlFor="discount-code" style={{ flex: 1 }}>
              <Input
                id="discount-code" type="text" value={discountCodeInput}
                onChange={(e) => setDiscountCodeInput(e.target.value.toUpperCase())}
                placeholder="SAVE20" autoComplete="off"
                className="el-co-input"
              />
            </ElegantField>
            <button
              type="button"
              onClick={handleApplyDiscount}
              disabled={validateDiscountMutation.isPending || items.length === 0}
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
                opacity: validateDiscountMutation.isPending || items.length === 0 ? 0.5 : 1,
                whiteSpace: "nowrap",
              }}
            >
              {validateDiscountMutation.isPending
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : "Apply"}
            </button>
          </div>
          {discountFieldError && (
            <p style={{ marginTop: 8, fontSize: 12, color: "#c0392b", fontFamily: "var(--font-sans, sans-serif)" }}>
              {discountFieldError}
            </p>
          )}
          {discountCodeLabel && discountAmount > 0 && (
            <p style={{ marginTop: 8, fontSize: 12, color: "var(--el-sage, #4a5240)", fontFamily: "var(--font-mono, ui-monospace)", letterSpacing: "0.1em" }}>
              Code {discountCodeLabel} applied.
            </p>
          )}
        </section>

        {/* Delivery method */}
        {shippingConfig.offersInStorePickup && (
          <section>
            {eyebrow("Delivery")}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {(["ship", "pickup"] as const).map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setDeliveryMethod(method)}
                  style={{
                    padding: "10px 22px",
                    borderRadius: 999,
                    fontSize: 12,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    fontWeight: 500,
                    border: deliveryMethod === method
                      ? "1px solid var(--el-ink, #1c1a17)"
                      : "1px solid var(--el-line, rgba(28,26,23,0.12))",
                    background: deliveryMethod === method ? "var(--el-ink, #1c1a17)" : "transparent",
                    color: deliveryMethod === method ? "var(--el-paper, #fbf8f2)" : "var(--el-ink, #1c1a17)",
                    cursor: "pointer",
                    fontFamily: "var(--font-sans, sans-serif)",
                    transition: `all 0.3s ${ease}`,
                  }}
                >
                  {method === "ship" ? "Ship to address" : "In-store pickup"}
                </button>
              ))}
            </div>
            <p style={{ marginTop: 12, fontSize: 13, color: "var(--el-ink-soft, #6b6659)", fontFamily: "var(--font-sans, sans-serif)" }}>
              {deliveryMethod === "pickup"
                ? "No shipping charge. Pick up at the store."
                : "Shipping calculated at checkout."}
            </p>
          </section>
        )}

        {/* Shipping address */}
        {deliveryMethod === "ship" && (
          <section>
            {eyebrow("Shipping address")}
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <ElegantField label="Address line 1 *" htmlFor="address-line1">
                <Input
                  id="address-line1" type="text" autoComplete="shipping address-line1"
                  value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)}
                  placeholder="Street address, P.O. box"
                  required={deliveryMethod === "ship"}
                  className="el-co-input"
                />
              </ElegantField>
              <ElegantField label="Address line 2" htmlFor="address-line2">
                <Input
                  id="address-line2" type="text" autoComplete="shipping address-line2"
                  value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)}
                  placeholder="Apartment, suite, etc."
                  className="el-co-input"
                />
              </ElegantField>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                <ElegantField label="City *" htmlFor="city">
                  <Input
                    id="city" type="text" autoComplete="shipping address-level2"
                    value={city} onChange={(e) => setCity(e.target.value)}
                    required={deliveryMethod === "ship"}
                    className="el-co-input"
                  />
                </ElegantField>
                <ElegantField label="State / Province *" htmlFor="state">
                  <Input
                    id="state" type="text" autoComplete="shipping address-level1"
                    value={state} onChange={(e) => setState(e.target.value)}
                    placeholder="CA or ON"
                    required={deliveryMethod === "ship"}
                    className="el-co-input"
                  />
                </ElegantField>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                <ElegantField label="ZIP / Postal code *" htmlFor="postal">
                  <Input
                    id="postal" type="text" autoComplete="shipping postal-code"
                    value={postalCode} onChange={(e) => setPostalCode(e.target.value)}
                    required={deliveryMethod === "ship"}
                    className="el-co-input"
                  />
                </ElegantField>
                <ElegantField label="Country *" htmlFor="country">
                  <Select value={country} onValueChange={(v) => setCountry(v as "US" | "CA")}>
                    <SelectTrigger id="country" className="el-co-input w-full border-x-0 border-t-0 rounded-none px-0 shadow-none focus:ring-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="US">United States</SelectItem>
                      <SelectItem value="CA">Canada</SelectItem>
                    </SelectContent>
                  </Select>
                </ElegantField>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* ── Right: order summary ── */}
      <div style={{ width: "100%", maxWidth: 380, flexShrink: 0 }}>
        <div style={{
          position: "sticky",
          top: 120,
          background: "var(--el-paper, #fbf8f2)",
          border: "1px solid var(--el-line, rgba(28,26,23,0.12))",
          borderRadius: 8,
          padding: "28px 28px",
        }}>
          <h2 style={{
            fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)",
            fontSize: 22,
            fontWeight: 500,
            color: "var(--el-ink, #1c1a17)",
            marginBottom: 20,
          }}>
            Order summary
          </h2>

          {/* Item list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20, maxHeight: 240, overflowY: "auto" }}>
            {items.map((item) => (
              <div key={`${item.productId}-${item.variantId}`} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 48, aspectRatio: "4/5",
                  borderRadius: 4, position: "relative", overflow: "hidden", flexShrink: 0,
                  background: "var(--el-cream-2, #ebe6dc)",
                }}>
                  {item.imageUrl && (
                    <Image src={item.imageUrl} alt={item.productName} fill className="object-cover" sizes="48px" />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontFamily: "var(--font-serif, serif)",
                    fontSize: 14,
                    color: "var(--el-ink, #1c1a17)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}>
                    {item.productName}
                  </p>
                  {item.variantName && (
                    <p style={{ fontFamily: "var(--font-mono, ui-monospace)", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--el-ink-soft, #6b6659)" }}>
                      {item.variantName}
                    </p>
                  )}
                  <p style={{ fontFamily: "var(--font-mono, ui-monospace)", fontSize: 10, letterSpacing: "0.1em", color: "var(--el-ink-soft, #6b6659)" }}>
                    Qty: {item.quantity}
                  </p>
                </div>
                <span style={{ fontFamily: "var(--font-sans, sans-serif)", fontSize: 13, color: "var(--el-ink, #1c1a17)", flexShrink: 0 }}>
                  {formatPrice(item.price * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div style={{
            borderTop: "1px solid var(--el-line, rgba(28,26,23,0.12))",
            paddingTop: 16,
            display: "flex",
            flexDirection: "column",
            gap: 10,
            marginBottom: 16,
          }}>
            {[
              { label: "Subtotal", value: formatPrice(subtotal) },
              ...(discountAmount > 0 && discountCodeLabel
                ? [{ label: `Discount (${discountCodeLabel})`, value: `−${formatPrice(discountAmount)}`, green: true }]
                : []),
              {
                label: "Shipping",
                value: deliveryMethod === "pickup" ? "Pickup (free)" : shipping === 0 ? "Free" : formatPrice(shipping),
              },
            ].map(({ label, value, green }) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontFamily: "var(--font-mono, ui-monospace)", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: green ? "var(--el-sage, #4a5240)" : "var(--el-ink-soft, #6b6659)" }}>
                  {label}
                </span>
                <span style={{ fontFamily: "var(--font-sans, sans-serif)", fontSize: 13, color: green ? "var(--el-sage, #4a5240)" : "var(--el-ink, #1c1a17)" }}>
                  {value}
                </span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", paddingTop: 12, borderTop: "1px solid var(--el-line, rgba(28,26,23,0.12))" }}>
              <span style={{ fontFamily: "var(--font-mono, ui-monospace)", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--el-ink, #1c1a17)" }}>
                Estimated total
              </span>
              <span style={{ fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)", fontSize: 24, color: "var(--el-ink, #1c1a17)" }}>
                {formatPrice(finalTotal)}
              </span>
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <button
            type="submit"
            disabled={isProcessing}
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
              cursor: isProcessing ? "not-allowed" : "pointer",
              opacity: isProcessing ? 0.7 : 1,
              fontFamily: "var(--font-sans, sans-serif)",
              transition: `background 0.4s ${ease}`,
            }}
            className="el-pay-btn"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing…
              </>
            ) : (
              "Continue to payment"
            )}
          </button>
          <p style={{ marginTop: 12, textAlign: "center", fontSize: 11, color: "var(--el-ink-soft, #6b6659)", fontFamily: "var(--font-mono, ui-monospace)", letterSpacing: "0.1em" }}>
            Secure & encrypted via Stripe
          </p>
        </div>
      </div>

      <style>{`
        .el-co-input {
          background: transparent !important;
          border: 0 !important;
          border-bottom: 1px solid var(--el-line, rgba(28,26,23,0.12)) !important;
          border-radius: 0 !important;
          padding: 10px 0 !important;
          font-size: 15px !important;
          box-shadow: none !important;
          outline: none !important;
        }
        .el-co-input:focus {
          border-bottom-color: var(--el-ink, #1c1a17) !important;
          ring: none !important;
        }
        .el-pay-btn:hover:not(:disabled) { background: var(--el-sage, #4a5240) !important; }
      `}</style>
    </form>
  );
}

function ElegantField({
  label,
  htmlFor,
  children,
  style,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
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
    </div>
  );
}
