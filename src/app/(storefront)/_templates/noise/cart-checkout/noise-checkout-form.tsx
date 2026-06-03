"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";

import type { DefaultCheckoutPageTemplateProps } from "../../types";
import { cn } from "~/lib/utils";
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

import { NoiseOrderSummary } from "./noise-order-summary";

type CheckoutFormProps = {
  business: DefaultCheckoutPageTemplateProps["business"];
};

/* Shared label style */
const LBL = "font-mono text-[9.5px] tracking-[0.22em] uppercase";
const INP = "rounded-none border-border font-sans text-sm focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-foreground";

/* Section heading separator */
function SectionHead({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex items-center gap-4 border-b pb-3 mb-5"
      style={{ borderColor: "var(--vn-ink)" }}
    >
      <h4
        className="font-mono text-[10px] tracking-[0.28em] uppercase"
        style={{ color: "var(--vn-steel)" }}
      >
        {children}
      </h4>
    </div>
  );
}

export function NoiseCheckoutForm({ business }: CheckoutFormProps) {
  const {
    email, setEmail,
    name, setName,
    phone, setPhone,
    addressLine1, setAddressLine1,
    addressLine2, setAddressLine2,
    city, setCity,
    state, setState,
    postalCode, setPostalCode,
    country, setCountry,
    deliveryMethod, setDeliveryMethod,
    discountCodeInput, setDiscountCodeInput,
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
  } = useCheckoutForm(business);

  if (items.length === 0) {
    return (
      <div className="py-20 text-center flex flex-col items-center gap-6">
        <p
          className="font-serif italic text-2xl"
          style={{ color: "var(--vn-steel-mist)" }}
        >
          Nothing to checkout.
        </p>
        <Link
          href="/shop"
          className="vn-stamp vn-stamp-solid text-[10px]"
        >
          Shop the Collection →
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="vn-contact-form flex flex-col gap-0 lg:flex-row lg:gap-12"
    >
      {/* Left — fields */}
      <div className="flex-1 flex flex-col gap-10">

        {/* Contact */}
        <fieldset className="flex flex-col gap-5">
          <SectionHead>Contact information</SectionHead>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email" className={LBL} style={{ color: "var(--vn-steel)" }}>
                Email *
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@frequency.com"
                required
                className={INP}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name" className={LBL} style={{ color: "var(--vn-steel)" }}>
                Full Name *
              </Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="First & last"
                required
                className={INP}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="phone" className={LBL} style={{ color: "var(--vn-steel)" }}>
              Phone *
            </Label>
            <PhoneInput
              id="phone"
              autoComplete="tel"
              value={phone}
              onChange={(val) => setPhone(val)}
              placeholder="+1 313 555 0000"
              required
            />
          </div>
        </fieldset>

        {/* Discount code */}
        <fieldset className="flex flex-col gap-4">
          <SectionHead>Discount code</SectionHead>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="discount-code" className={LBL} style={{ color: "var(--vn-steel)" }}>
                Code
              </Label>
              <Input
                id="discount-code"
                type="text"
                value={discountCodeInput}
                onChange={(e) => {
                  setDiscountCodeInput(e.target.value.toUpperCase());
                  setDiscountFieldError(null);
                }}
                placeholder="VND-SUMMER-26"
                autoComplete="off"
                className={cn(INP, "font-mono tracking-[0.1em]")}
              />
            </div>
            <button
              type="button"
              onClick={handleApplyDiscount}
              disabled={isValidatingDiscount || items.length === 0}
              className="vn-stamp text-[10px] flex items-center gap-2 disabled:opacity-40 transition-all hover:bg-foreground hover:text-background flex-shrink-0"
              style={{ padding: "10px 16px" }}
            >
              {isValidatingDiscount ? (
                <><Loader2 className="size-3.5 animate-spin" />Checking…</>
              ) : (
                discountAmount > 0 ? "Applied ✓" : "Apply"
              )}
            </button>
          </div>
          {discountFieldError && (
            <p className="font-mono text-[9.5px] tracking-[0.14em] uppercase text-destructive">
              {discountFieldError}
            </p>
          )}
          {discountCodeLabel && discountAmount > 0 && (
            <p className="font-mono text-[9.5px] tracking-[0.14em] uppercase text-green-600">
              Code <span className="font-semibold">{discountCodeLabel}</span> applied.
            </p>
          )}
        </fieldset>

        {/* Delivery method */}
        {shippingConfig.offersInStorePickup && (
          <fieldset className="flex flex-col gap-4">
            <SectionHead>Delivery</SectionHead>
            <div className="flex flex-wrap gap-2">
              {(["ship", "pickup"] as const).map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setDeliveryMethod(method)}
                  className="vn-stamp text-[10px] transition-all"
                  style={
                    deliveryMethod === method
                      ? { background: "var(--vn-ink)", color: "var(--vn-bone)", borderColor: "var(--vn-ink)" }
                      : {}
                  }
                >
                  {method === "ship" ? "Ship to address" : "Studio pickup"}
                </button>
              ))}
            </div>
            <p
              className="font-mono text-[9.5px] tracking-[0.14em] uppercase"
              style={{ color: "var(--vn-steel-mist)" }}
            >
              {deliveryMethod === "pickup"
                ? "No shipping charge — contact us for pick-up details."
                : "Shipping cost based on your store's settings."}
            </p>
          </fieldset>
        )}

        {/* Shipping address */}
        {deliveryMethod === "ship" && (
          <fieldset className="flex flex-col gap-5">
            <SectionHead>Shipping address</SectionHead>
            <p
              className="font-mono text-[9.5px] tracking-[0.14em] uppercase -mt-2"
              style={{ color: "var(--vn-steel-mist)" }}
            >
              Pre-filled at Stripe — you can confirm or edit before paying.
            </p>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="address-line1" className={LBL} style={{ color: "var(--vn-steel)" }}>
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
                className={INP}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="address-line2" className={LBL} style={{ color: "var(--vn-steel)" }}>
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
                <Label htmlFor="city" className={LBL} style={{ color: "var(--vn-steel)" }}>
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
                  className={INP}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="state" className={LBL} style={{ color: "var(--vn-steel)" }}>
                  State / Province *
                </Label>
                <Input
                  id="state"
                  type="text"
                  autoComplete="shipping address-level1"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="e.g. MI"
                  required={deliveryMethod === "ship"}
                  className={INP}
                />
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="postal" className={LBL} style={{ color: "var(--vn-steel)" }}>
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
                  className={INP}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="country" className={LBL} style={{ color: "var(--vn-steel)" }}>
                  Country *
                </Label>
                <Select
                  value={country}
                  onValueChange={(v) => setCountry(v as "US" | "CA")}
                  required
                >
                  <SelectTrigger id="country" className={cn("w-full", INP)}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="US">United States</SelectItem>
                    <SelectItem value="CA">Canada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </fieldset>
        )}
      </div>

      {/* Right — order summary + submit */}
      <div className="w-full shrink-0 mt-10 lg:mt-0 lg:w-[360px]">
        <div className="sticky top-28 flex flex-col gap-5">
          <NoiseOrderSummary
            shippingConfig={shippingConfig}
            deliveryMethod={deliveryMethod}
            discountAmount={discountAmount}
          />

          {error && (
            <Alert variant="destructive" className="rounded-none">
              <AlertDescription className="font-mono text-[10px] tracking-[0.14em] uppercase">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isProcessing}
            className="flex items-center justify-between w-full px-5 py-4 font-mono text-[11px] tracking-[0.24em] uppercase transition-all disabled:opacity-50"
            style={{ background: "var(--vn-ink)", color: "var(--vn-bone)" }}
          >
            <span className="flex items-center gap-2">
              {isProcessing && <Loader2 className="size-3.5 animate-spin" />}
              {isProcessing ? "Processing…" : "Continue to payment"}
            </span>
            <span>→</span>
          </button>

          {/* Reassurance */}
          <div className="flex flex-col gap-2.5">
            {[
              { ic: "🔒", text: "Encrypted with TLS · Powered by Stripe" },
              { ic: "✦", text: "Ships within five working days" },
              { ic: "↺", text: "14-day exchange on stock pieces" },
            ].map((note) => (
              <div key={note.ic} className="flex gap-2.5 items-start">
                <span
                  className="flex-shrink-0 flex items-center justify-center border font-serif italic"
                  style={{
                    width: "22px",
                    height: "22px",
                    borderColor: "var(--vn-rule)",
                    fontSize: "12px",
                  }}
                >
                  {note.ic}
                </span>
                <p
                  className="font-mono text-[9.5px] tracking-[0.14em] uppercase leading-relaxed"
                  style={{ color: "var(--vn-steel-mist)" }}
                >
                  {note.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </form>
  );
}
