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

const LBL =
  "text-xs font-medium uppercase tracking-[0.2em] text-[var(--sl-ink)]";
const INP =
  "rounded-sm border-[var(--sl-border-input)] font-sans text-sm focus-visible:border-[var(--sl-coral)] focus-visible:ring-0 focus-visible:ring-offset-0";

function SectionHead({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="sl-tab-heading mb-5 border-b border-[var(--sl-border)] pb-3 uppercase text-[var(--sl-coral)] tracking-[0.04em] leading-none">
      {children}
    </h4>
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
      <div className="flex flex-col items-center gap-6 py-20 text-center">
        <p className="sl-tab-heading uppercase text-[var(--sl-coral)] tracking-[0.04em] leading-none">
          Nothing to checkout
        </p>
        <Link href="/shop" className="sl-btn text-xs">
          Browse Shop →
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-0 lg:flex-row lg:gap-12"
    >
      <div className="flex flex-1 flex-col gap-10">
        <fieldset className="flex flex-col gap-5">
          <SectionHead>Contact Information</SectionHead>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email" className={LBL}>
                Email *
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className={INP}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name" className={LBL}>
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
            <Label htmlFor="phone" className={LBL}>
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

        <fieldset className="flex flex-col gap-4">
          <SectionHead>Discount Code</SectionHead>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="discount-code" className={LBL}>
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
                placeholder="SUMMER-2026"
                autoComplete="off"
                className={cn(INP, "tracking-[0.1em] uppercase")}
              />
            </div>
            <button
              type="button"
              onClick={handleApplyDiscount}
              disabled={isValidatingDiscount || items.length === 0}
              className="sl-btn flex flex-shrink-0 items-center gap-2 text-xs disabled:opacity-40"
            >
              {isValidatingDiscount ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Checking…
                </>
              ) : discountAmount > 0 ? (
                "Applied ✓"
              ) : (
                "Apply"
              )}
            </button>
          </div>
          {discountFieldError && (
            <p className="font-sans text-xs tracking-[0.12em] uppercase text-destructive">
              {discountFieldError}
            </p>
          )}
          {discountCodeLabel && discountAmount > 0 && (
            <p className="font-sans text-xs tracking-[0.12em] uppercase text-green-600">
              Code <span className="font-semibold">{discountCodeLabel}</span>{" "}
              applied.
            </p>
          )}
        </fieldset>

        {shippingConfig.offersInStorePickup && (
          <fieldset className="flex flex-col gap-4">
            <SectionHead>Delivery</SectionHead>
            <div className="flex flex-wrap gap-2">
              {(["ship", "pickup"] as const).map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setDeliveryMethod(method)}
                  className={cn(
                    "cursor-pointer px-4 py-2 font-sans text-xs tracking-[0.16em] uppercase transition-all",
                    deliveryMethod === method
                      ? "sl-btn"
                      : "sl-account-tab-inactive",
                  )}
                >
                  {method === "ship" ? "Ship to address" : "Studio pickup"}
                </button>
              ))}
            </div>
            <p className="font-sans text-xs tracking-[0.12em] text-[var(--sl-ink-soft)] uppercase">
              {deliveryMethod === "pickup"
                ? "No shipping charge — contact us for pick-up details."
                : "Shipping cost based on your store's settings."}
            </p>
          </fieldset>
        )}

        {deliveryMethod === "ship" && (
          <fieldset className="flex flex-col gap-5">
            <SectionHead>Shipping Address</SectionHead>
            <p className="-mt-2 font-sans text-xs tracking-[0.12em] text-[var(--sl-ink-soft)] uppercase">
              Pre-filled at Stripe — you can confirm or edit before paying.
            </p>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="address-line1" className={LBL}>
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
              <Label htmlFor="address-line2" className={LBL}>
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
                <Label htmlFor="city" className={LBL}>
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
                <Label htmlFor="state" className={LBL}>
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
                <Label htmlFor="postal" className={LBL}>
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
                <Label htmlFor="country" className={LBL}>
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

      <div className="mt-10 w-full shrink-0 lg:mt-0 lg:w-[360px]">
        <div className="sticky top-28 flex flex-col gap-5">
          <NoiseOrderSummary
            shippingConfig={shippingConfig}
            deliveryMethod={deliveryMethod}
            discountAmount={discountAmount}
          />

          {error && (
            <Alert variant="destructive" className="rounded-sm">
              <AlertDescription className="font-sans text-xs tracking-[0.12em] uppercase">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <button
            type="submit"
            disabled={isProcessing}
            className="sl-btn flex w-full items-center justify-between disabled:opacity-50"
          >
            <span className="flex items-center gap-2">
              {isProcessing && <Loader2 className="size-3.5 animate-spin" />}
              {isProcessing ? "Processing…" : "Continue to Payment"}
            </span>
            <span>→</span>
          </button>

          <div className="flex flex-col gap-2.5">
            {[
              { ic: "🔒", text: "Encrypted with TLS · Powered by Stripe" },
              { ic: "✱", text: "Each piece handcrafted with care" },
              { ic: "↺", text: "All sales final — order what you love" },
            ].map((note) => (
              <div key={note.ic} className="flex items-start gap-2.5">
                <span className="flex size-[22px] flex-shrink-0 items-center justify-center rounded-sm bg-[var(--sl-cream)] font-sans text-xs text-[var(--sl-coral)]">
                  {note.ic}
                </span>
                <p className="font-sans text-xs leading-relaxed tracking-[0.08em] text-[var(--sl-ink-soft)] uppercase">
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
