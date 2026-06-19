"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CreditCard, Loader2, Tag, X } from "lucide-react";

import type { DefaultCheckoutPageTemplateProps } from "../../types";
import { formatPrice } from "~/lib/prices";
import { useCheckoutForm } from "~/hooks/use-checkout-form";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
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
import { getRegionOptions } from "~/lib/geo/regions";

type Props = {
  business: DefaultCheckoutPageTemplateProps["business"];
};

export function DarkTrendCheckoutForm({ business }: Props) {
  const f = useCheckoutForm(business);

  // A live shipping rate is actively loading once a destination is entered but
  // the amount isn't known yet — show a spinner and block submit until it lands.
  const shippingCalculating =
    f.deliveryMethod === "ship" && f.state.trim().length > 0 && f.shippingPending;

  // Tracks whether the user has attempted to submit — used to derive aria-invalid on required fields.
  const [submitAttempted, setSubmitAttempted] = useState(false);
  // M-11: ref to focus error alert when set
  const errorAlertRef = useRef<HTMLDivElement>(null);

  const onSubmit = async (e: React.FormEvent) => {
    setSubmitAttempted(true);
    await f.handleSubmit(e);
    // M-11: focus error alert if an error was set
    if (f.error) {
      setTimeout(() => errorAlertRef.current?.focus(), 50);
    }
  };

  if (f.items.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="mb-4 text-white/70">Your cart is empty</p>
        <Button
          asChild
          className="bg-violet-600 text-white hover:bg-violet-700"
        >
          <Link href="/shop">Continue Shopping</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit}>
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Customer Information */}
        <div className="space-y-6 lg:col-span-2">
          {/* M-11: required field note */}
          <p className="text-sm text-white/70">* indicates a required field</p>

          {/* Contact Info */}
          <Card className="border-white/20 bg-zinc-900/30">
            <CardHeader>
              <CardTitle className="text-white">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-white">
                  Email *
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={f.email}
                  onChange={(e) => f.setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="border-white/20 bg-zinc-900/50 text-white placeholder:text-white/40"
                  required
                  aria-required="true"
                  aria-invalid={submitAttempted && !f.email ? true : undefined}
                />
              </div>
              <div>
                <Label htmlFor="name" className="text-white">
                  Full Name *
                </Label>
                <Input
                  id="name"
                  type="text"
                  value={f.name}
                  onChange={(e) => f.setName(e.target.value)}
                  placeholder="John Doe"
                  className="border-white/20 bg-zinc-900/50 text-white placeholder:text-white/40"
                  required
                  aria-required="true"
                  aria-invalid={
                    submitAttempted && !f.name.trim() ? true : undefined
                  }
                />
              </div>
              <div>
                <Label htmlFor="phone" className="text-white">
                  Phone *
                </Label>
                <PhoneInput
                  id="phone"
                  autoComplete="tel"
                  value={f.phone}
                  onChange={(val) => f.setPhone(val)}
                  placeholder="+1 555 123 4567"
                  className="border-white/20 bg-zinc-900/50 text-white placeholder:text-white/40"
                  required
                  aria-required="true"
                  aria-invalid={
                    submitAttempted && !f.phone.trim() ? true : undefined
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Delivery Method */}
          {f.shippingConfig.offersInStorePickup && (
            <Card className="border-white/20 bg-zinc-900/30">
              <CardHeader>
                <CardTitle className="text-white">Delivery</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* S-8: aria-pressed on delivery toggle buttons */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    onClick={() => f.setDeliveryMethod("ship")}
                    aria-pressed={f.deliveryMethod === "ship"}
                    className={
                      f.deliveryMethod === "ship"
                        ? "bg-violet-600 text-white hover:bg-violet-700"
                        : "border border-white/20 bg-transparent text-white hover:bg-white/10"
                    }
                  >
                    Ship to address
                  </Button>
                  <Button
                    type="button"
                    onClick={() => f.setDeliveryMethod("pickup")}
                    aria-pressed={f.deliveryMethod === "pickup"}
                    className={
                      f.deliveryMethod === "pickup"
                        ? "bg-violet-600 text-white hover:bg-violet-700"
                        : "border border-white/20 bg-transparent text-white hover:bg-white/10"
                    }
                  >
                    In-store pickup
                  </Button>
                </div>
                <p className="text-sm text-white/70">
                  {f.deliveryMethod === "pickup"
                    ? "No shipping charge. You'll pick up your order at the store."
                    : "Shipping cost is based on your store's shipping settings."}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Shipping Address */}
          {f.deliveryMethod === "ship" && (
            <Card className="border-white/20 bg-zinc-900/30">
              <CardHeader>
                <CardTitle className="text-white">Shipping Address</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-white/70">
                  This is sent to Stripe Checkout prefilled so you can confirm
                  or edit your name, phone, and address before paying.
                </p>
                <div>
                  <Label htmlFor="address-line1" className="text-white">
                    Address line 1 *
                  </Label>
                  <Input
                    id="address-line1"
                    type="text"
                    autoComplete="shipping address-line1"
                    value={f.addressLine1}
                    onChange={(e) => f.setAddressLine1(e.target.value)}
                    placeholder="Street address, P.O. box"
                    className="border-white/20 bg-zinc-900/50 text-white placeholder:text-white/40"
                    required={f.deliveryMethod === "ship"}
                    aria-required="true"
                    aria-invalid={
                      submitAttempted && !f.addressLine1.trim()
                        ? true
                        : undefined
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="address-line2" className="text-white">
                    Address line 2
                  </Label>
                  <Input
                    id="address-line2"
                    type="text"
                    autoComplete="shipping address-line2"
                    value={f.addressLine2}
                    onChange={(e) => f.setAddressLine2(e.target.value)}
                    placeholder="Apartment, suite, etc."
                    className="border-white/20 bg-zinc-900/50 text-white placeholder:text-white/40"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="city" className="text-white">
                      City *
                    </Label>
                    <Input
                      id="city"
                      type="text"
                      autoComplete="shipping address-level2"
                      value={f.city}
                      onChange={(e) => f.setCity(e.target.value)}
                      className="border-white/20 bg-zinc-900/50 text-white placeholder:text-white/40"
                      required={f.deliveryMethod === "ship"}
                      aria-required="true"
                      aria-invalid={
                        submitAttempted && !f.city.trim() ? true : undefined
                      }
                    />
                  </div>
                  <div>
                    <Label
                      id="state-label"
                      htmlFor="state"
                      className="text-white"
                    >
                      State / Province *
                    </Label>
                    <Select
                      value={f.state}
                      onValueChange={(v) => f.setState(v)}
                    >
                      <SelectTrigger
                        id="state"
                        className="w-full border-white/20 bg-zinc-900/50 text-white"
                        aria-labelledby="state-label"
                        aria-required="true"
                        aria-invalid={
                          submitAttempted && !f.state ? true : undefined
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
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="postal" className="text-white">
                      ZIP / Postal code *
                    </Label>
                    <Input
                      id="postal"
                      type="text"
                      autoComplete="shipping postal-code"
                      value={f.postalCode}
                      onChange={(e) => f.setPostalCode(e.target.value)}
                      className="border-white/20 bg-zinc-900/50 text-white placeholder:text-white/40"
                      required={f.deliveryMethod === "ship"}
                      aria-required="true"
                      aria-invalid={
                        submitAttempted && !f.postalCode.trim()
                          ? true
                          : undefined
                      }
                    />
                  </div>
                  <div>
                    <Label
                      id="country-label"
                      htmlFor="country"
                      className="text-white"
                    >
                      Country *
                    </Label>
                    <Select
                      value={f.country}
                      onValueChange={(v) => f.setCountry(v as "US" | "CA")}
                    >
                      <SelectTrigger
                        id="country"
                        className="w-full border-white/20 bg-zinc-900/50 text-white"
                        aria-labelledby="country-label"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="US">United States</SelectItem>
                        <SelectItem value="CA">Canada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4 border-white/20 bg-zinc-900/30">
            <CardHeader>
              <CardTitle className="text-white">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Items */}
              <div className="max-h-64 space-y-3 overflow-y-auto">
                {f.items.map((item) => (
                  <div
                    key={`${item.productId}-${item.variantId}`}
                    className="flex gap-3"
                  >
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-sm bg-zinc-900">
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.productName}
                          width={64}
                          height={64}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-white/40">
                          No img
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">
                        {item.productName}
                      </p>
                      {item.variantName && (
                        <p className="text-xs text-white/60">
                          {item.variantName}
                        </p>
                      )}
                      <p className="text-xs text-white/60">
                        Qty: {item.quantity}
                      </p>
                    </div>
                    <p className="text-sm font-medium text-white">
                      {formatPrice(item.price * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Discount Code Input — inline, dark-trend style */}
              <div className="space-y-3 pt-4">
                {f.discountCodeLabel && f.discountAmount > 0 ? (
                  <div
                    role="status"
                    className="rounded-md border border-green-500/50 bg-green-500/10 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/20">
                          <span
                            aria-hidden="true"
                            className="text-xs font-bold text-green-400"
                          >
                            ✓
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-green-400">
                            Discount Applied: {f.discountCodeLabel}
                          </p>
                          <p className="text-sm text-green-500">
                            You saved {formatPrice(f.discountAmount)}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={f.clearDiscount}
                        aria-label={`Remove discount ${f.discountCodeLabel}`}
                        className="text-green-400 hover:bg-green-500/10 hover:text-green-300"
                      >
                        <X aria-hidden="true" className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Tag
                        aria-hidden="true"
                        className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-white/40"
                      />
                      <Input
                        type="text"
                        placeholder="Discount code"
                        aria-label="Discount code"
                        value={f.discountCodeInput}
                        onChange={(e) => {
                          f.setDiscountCodeInput(e.target.value.toUpperCase());
                          f.setDiscountFieldError(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            f.handleApplyDiscount();
                          }
                        }}
                        aria-invalid={!!f.discountFieldError}
                        aria-describedby={
                          f.discountFieldError
                            ? "discount-code-error"
                            : undefined
                        }
                        className="border-white/20 bg-zinc-900/50 pl-10 text-white placeholder:text-white/40"
                      />
                    </div>
                    <Button
                      type="button"
                      onClick={f.handleApplyDiscount}
                      disabled={
                        f.isValidatingDiscount || !f.discountCodeInput.trim()
                      }
                      aria-label="Apply discount code"
                      className="border border-white/60 bg-transparent font-medium text-white hover:bg-white/10"
                    >
                      {f.isValidatingDiscount ? (
                        <>
                          <Loader2
                            aria-hidden="true"
                            className="mr-1 h-4 w-4 animate-spin"
                          />
                          Applying…
                        </>
                      ) : (
                        "Apply"
                      )}
                    </Button>
                  </div>
                )}
                {f.discountFieldError && (
                  <Alert
                    variant="destructive"
                    className="border-red-500/50 bg-red-500/10"
                  >
                    <AlertDescription
                      id="discount-code-error"
                      className="text-sm text-red-400"
                    >
                      {f.discountFieldError}
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <div className="space-y-2 border-t border-white/20 pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Subtotal</span>
                  <span className="text-white">{formatPrice(f.subtotal)}</span>
                </div>
                {f.discountAmount > 0 && f.discountCodeLabel && (
                  <div className="flex justify-between text-sm text-green-400">
                    <span>Discount ({f.discountCodeLabel})</span>
                    <span>-{formatPrice(f.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Shipping</span>
                  <span className="text-white">
                    {f.deliveryMethod === "pickup" ? (
                      "In-store pickup (free)"
                    ) : shippingCalculating ? (
                      <span
                        className="inline-flex items-center gap-1.5 text-white/70"
                        aria-live="polite"
                      >
                        <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
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
                <div className="flex justify-between border-t border-white/20 pt-2 font-bold text-white">
                  <span>Estimated total</span>
                  <span>{formatPrice(f.finalTotal)}</span>
                </div>
                <p className="text-xs text-white/60">
                  Tax and final total are confirmed on Stripe Checkout.
                </p>
              </div>

              {/* M-11: error alert with persistent live region and focus wrapper */}
              <div role="alert" aria-live="assertive" aria-atomic="true">
                {f.error && (
                  <div ref={errorAlertRef} tabIndex={-1}>
                    <Alert
                      variant="destructive"
                      className="border-red-500/50 bg-red-500/10"
                    >
                      <AlertDescription className="text-red-400">
                        {f.error}
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
              </div>

              {/* S-11 + N-1: violet-600, aria-hidden icons */}
              <Button
                type="submit"
                disabled={f.isProcessing || shippingCalculating}
                aria-busy={f.isProcessing || shippingCalculating}
                className="w-full bg-violet-600 py-6 text-base font-semibold text-white hover:bg-violet-700"
                size="lg"
              >
                {f.isProcessing ? (
                  <>
                    <Loader2
                      aria-hidden="true"
                      className="mr-2 h-5 w-5 animate-spin"
                    />
                    Processing...
                  </>
                ) : shippingCalculating ? (
                  <>
                    <Loader2
                      aria-hidden="true"
                      className="mr-2 h-5 w-5 animate-spin"
                    />
                    Calculating shipping…
                  </>
                ) : (
                  <>
                    <CreditCard aria-hidden="true" className="mr-2 h-5 w-5" />
                    Continue to Payment
                  </>
                )}
              </Button>

              <p className="text-center text-xs text-white/60">
                All transactions are secure and encrypted via Stripe. 100%
                Secure and Encrypted Payments.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
