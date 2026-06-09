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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { PhoneInput } from "~/components/inputs/phone-form-field";
import { useCart } from "~/providers/cart-context";

const inputClass =
  "w-full rounded-md border border-gray-300 bg-white text-gray-900 placeholder:text-gray-500 focus:border-[#215935] focus:ring-2 focus:ring-[#215935]/20 focus:outline-none px-3 py-2 text-sm";
const labelClass = "block text-sm font-medium text-gray-900 mb-1";
const sectionHeadingClass =
  "mb-4 text-sm font-medium tracking-wider text-[#2a351f] uppercase";

type Props = {
  business: DefaultCheckoutPageTemplateProps["business"];
};

export function PollenCheckoutForm({ business }: Props) {
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

  if (items.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="mb-6 text-gray-600">Your cart is empty</p>
        <Link
          href="/shop"
          className="rounded-md bg-[#215935] px-6 py-2.5 font-semibold text-white hover:bg-[#1a4729]"
        >
          Continue Shopping
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-10 lg:flex-row">
      {/* Left column — form fields */}
      <div className="flex-1 space-y-10">
        <p className="text-sm text-gray-600">Fields marked * are required.</p>
        {/* Contact Information */}
        <section>
          <h2 className={sectionHeadingClass}>Contact Information</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className={labelClass}>
                Email *
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={inputClass}
                required
              />
            </div>
            <div>
              <label htmlFor="name" className={labelClass}>
                Full Name *
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                className={inputClass}
                required
              />
            </div>
            <div>
              <label htmlFor="phone" className={labelClass}>
                Phone *
              </label>
              <PhoneInput
                id="phone"
                autoComplete="tel"
                value={phone}
                onChange={(val) => setPhone(val)}
                placeholder="+1 555 123 4567"
                className={inputClass}
                required
              />
            </div>
          </div>
        </section>

        {/* Discount Code */}
        <section>
          <h2 className={sectionHeadingClass}>Discount Code</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={discountCodeInput}
              onChange={(e) =>
                setDiscountCodeInput(e.target.value.toUpperCase())
              }
              placeholder="SAVE20"
              autoComplete="off"
              aria-label="Discount code"
              aria-invalid={!!discountFieldError}
              aria-describedby={discountFieldError ? "discount-error" : undefined}
              className={`${inputClass} flex-1`}
            />
            <button
              type="button"
              onClick={handleApplyDiscount}
              disabled={
                validateDiscountMutation.isPending || items.length === 0
              }
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {validateDiscountMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                "Apply"
              )}
            </button>
          </div>
          {discountFieldError && (
            <p id="discount-error" role="alert" className="mt-2 text-sm text-red-600">
              {discountFieldError}
            </p>
          )}
          {discountCodeLabel && discountAmount > 0 && (
            <p role="status" className="mt-2 text-sm text-green-700">
              Code{" "}
              <span className="font-mono font-semibold">
                {discountCodeLabel}
              </span>{" "}
              applied.
            </p>
          )}
        </section>

        {/* Delivery Method */}
        {shippingConfig.offersInStorePickup && (
          <section>
            <h2 className={sectionHeadingClass}>Delivery</h2>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setDeliveryMethod("ship")}
                aria-pressed={deliveryMethod === "ship"}
                className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  deliveryMethod === "ship"
                    ? "bg-[#215935] text-white"
                    : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                Ship to address
              </button>
              <button
                type="button"
                onClick={() => setDeliveryMethod("pickup")}
                aria-pressed={deliveryMethod === "pickup"}
                className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  deliveryMethod === "pickup"
                    ? "bg-[#215935] text-white"
                    : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                In-store pickup
              </button>
            </div>
            <p className="mt-2 text-sm text-gray-600">
              {deliveryMethod === "pickup"
                ? "No shipping charge. You'll pick up your order at the store."
                : "Shipping cost is based on your store's shipping settings."}
            </p>
          </section>
        )}

        {/* Shipping Address */}
        {deliveryMethod === "ship" && (
          <section>
            <h2 className={sectionHeadingClass}>Shipping Address</h2>
            <p className="mb-4 text-sm text-gray-600">
              This is sent to Stripe Checkout prefilled so you can confirm or
              edit your name, phone, and address before paying.
            </p>
            <div className="space-y-4">
              <div>
                <label htmlFor="address-line1" className={labelClass}>
                  Address line 1 *
                </label>
                <input
                  id="address-line1"
                  type="text"
                  autoComplete="shipping address-line1"
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  placeholder="Street address, P.O. box"
                  className={inputClass}
                  required={deliveryMethod === "ship"}
                />
              </div>
              <div>
                <label htmlFor="address-line2" className={labelClass}>
                  Address line 2
                </label>
                <input
                  id="address-line2"
                  type="text"
                  autoComplete="shipping address-line2"
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                  placeholder="Apartment, suite, etc."
                  className={inputClass}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="city" className={labelClass}>
                    City *
                  </label>
                  <input
                    id="city"
                    type="text"
                    autoComplete="shipping address-level2"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className={inputClass}
                    required={deliveryMethod === "ship"}
                  />
                </div>
                <div>
                  <label htmlFor="state" className={labelClass}>
                    State / Province *
                  </label>
                  <input
                    id="state"
                    type="text"
                    autoComplete="shipping address-level1"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="e.g. CA or ON"
                    className={inputClass}
                    required={deliveryMethod === "ship"}
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="postal" className={labelClass}>
                    ZIP / Postal code *
                  </label>
                  <input
                    id="postal"
                    type="text"
                    autoComplete="shipping postal-code"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    className={inputClass}
                    required={deliveryMethod === "ship"}
                  />
                </div>
                <div>
                  <label htmlFor="country" className={labelClass}>
                    Country *
                  </label>
                  <Select
                    value={country}
                    onValueChange={(v) => setCountry(v as "US" | "CA")}
                  >
                    <SelectTrigger
                      id="country"
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#215935] focus:ring-2 focus:ring-[#215935]/20 focus:outline-none"
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
            </div>
          </section>
        )}
      </div>

      {/* Right column — Order Summary */}
      <div className="w-full shrink-0 lg:w-96">
        <div className="sticky top-24 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-base font-bold text-gray-900">
            Order Summary
          </h2>

          {/* Items */}
          <div className="max-h-64 space-y-4 overflow-y-auto">
            {items.map((item) => (
              <div
                key={`${item.productId}-${item.variantId}`}
                className="flex items-center gap-3"
              >
                <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.productName}
                      fill
                      className="object-cover"
                      sizes="56px"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center text-xs text-gray-400">
                      No img
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {item.productName}
                  </p>
                  {item.variantName && (
                    <p className="text-xs text-gray-500">{item.variantName}</p>
                  )}
                  <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {formatPrice(item.price * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="mt-5 space-y-2 border-t border-gray-200 pt-5">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span className="text-gray-900">{formatPrice(subtotal)}</span>
            </div>
            {discountAmount > 0 && discountCodeLabel && (
              <div className="flex justify-between text-sm text-green-700">
                <span>Discount ({discountCodeLabel})</span>
                <span>-{formatPrice(discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Shipping</span>
              <span className="text-gray-900">
                {deliveryMethod === "pickup"
                  ? "In-store pickup (free)"
                  : shipping === 0
                    ? "Free"
                    : formatPrice(shipping)}
              </span>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-3">
              <span className="font-semibold text-gray-900">
                Estimated total
              </span>
              <span className="text-lg font-bold text-gray-900">
                {formatPrice(finalTotal)}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              Tax and final total are confirmed on Stripe Checkout.
            </p>
          </div>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <button
            type="submit"
            disabled={isProcessing}
            className="mt-5 w-full rounded-md bg-[#215935] px-6 py-3 font-semibold text-white transition-colors hover:bg-[#1a4729] disabled:opacity-50"
          >
            {isProcessing ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Processing...
              </span>
            ) : (
              "Continue to Payment"
            )}
          </button>

          <p className="mt-3 text-center text-xs text-gray-500">
            All transactions are secure and encrypted via Stripe. 100% Secure
            and Encrypted Payments.
          </p>
        </div>
      </div>
    </form>
  );
}
