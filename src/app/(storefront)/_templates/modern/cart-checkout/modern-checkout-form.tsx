"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Loader2, ShoppingBag } from "lucide-react";

import type { DefaultCheckoutPageTemplateProps } from "../../types";
import { formatPrice } from "~/lib/prices";
import {
  calculateShipping,
  shippingConfigFromBusiness,
} from "~/lib/shipping-utils";
import { api } from "~/trpc/react";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { PhoneInput } from "~/components/inputs/phone-form-field";
import { useCart } from "~/providers/cart-context";

type Props = {
  business: DefaultCheckoutPageTemplateProps["business"];
};

export function ModernCheckoutForm({ business }: Props) {
  const { items, removeItem, subtotal } = useCart();
  const shippingConfig = shippingConfigFromBusiness(business);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
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
      const name = `${firstName.trim()} ${lastName.trim()}`.trim();
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

  const inputClass =
    "border-border bg-card text-foreground placeholder:text-muted-foreground/70 focus:border-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 mt-1 w-full border px-4 py-3 text-sm";
  const labelClass = "text-muted-foreground block text-sm";

  if (items.length === 0) {
    return (
      <div className="py-20 text-center">
        <ShoppingBag aria-hidden="true" className="text-muted-foreground/40 mx-auto h-12 w-12" />
        <h2 className="text-foreground mt-4 font-serif text-2xl">
          Nothing to check out
        </h2>
        <p className="text-muted-foreground mt-2 text-sm">
          Add some items to your cart first.
        </p>
        <Link
          href="/shop"
          className="bg-primary text-primary-foreground mt-8 inline-flex items-center gap-2 px-8 py-3 text-sm font-medium tracking-wide transition-opacity hover:opacity-90"
        >
          Browse Products
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
      {/* Form */}
      <div className="lg:col-span-2">
        <form onSubmit={handleSubmit} id="checkout-form">
          {/* Contact */}
          <div>
            <h2 className="text-foreground text-xs font-semibold tracking-widest uppercase">
              Contact Information
            </h2>
            <p className="text-muted-foreground mt-2 text-xs">
              Fields marked with * are required.
            </p>
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="firstName" className={labelClass}>
                  First Name *
                </label>
                <input
                  id="firstName"
                  type="text"
                  required
                  autoComplete="given-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className={inputClass}
                  placeholder="Jane"
                />
              </div>
              <div>
                <label htmlFor="lastName" className={labelClass}>
                  Last Name *
                </label>
                <input
                  id="lastName"
                  type="text"
                  required
                  autoComplete="family-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className={inputClass}
                  placeholder="Doe"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="email" className={labelClass}>
                  Email *
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  placeholder="jane@example.com"
                />
              </div>
              <div className="sm:col-span-2">
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
          </div>

          {/* Discount Code */}
          <div className="border-border mt-10 border-t pt-10">
            <h2
              id="discount-code-heading"
              className="text-foreground text-xs font-semibold tracking-widest uppercase"
            >
              Discount Code
            </h2>
            <div className="mt-6 flex gap-2">
              <div className="flex-1">
                <label htmlFor="discount-code" className="sr-only">
                  Discount code
                </label>
                <input
                  id="discount-code"
                  type="text"
                  value={discountCodeInput}
                  onChange={(e) =>
                    setDiscountCodeInput(e.target.value.toUpperCase())
                  }
                  placeholder="SAVE20"
                  autoComplete="off"
                  autoCapitalize="characters"
                  aria-invalid={!!discountFieldError}
                  aria-describedby={
                    discountFieldError ? "discount-error" : undefined
                  }
                  className={`${inputClass} w-full`}
                />
              </div>
              <button
                type="button"
                onClick={handleApplyDiscount}
                disabled={
                  validateDiscountMutation.isPending || items.length === 0
                }
                aria-label="Apply"
                className="border-border bg-card text-foreground hover:bg-muted mt-1 inline-flex items-center gap-2 border px-6 py-3 text-sm font-medium tracking-wide transition-opacity disabled:opacity-50"
              >
                {validateDiscountMutation.isPending && (
                  <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                )}
                Apply
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
          </div>

          {/* Delivery Method */}
          {shippingConfig.offersInStorePickup && (
            <div className="border-border mt-10 border-t pt-10">
              <h2 className="text-foreground text-xs font-semibold tracking-widest uppercase">
                Delivery
              </h2>
              <div
                role="group"
                aria-label="Delivery method"
                aria-describedby="delivery-method-hint"
                className="mt-6 flex flex-wrap gap-2"
              >
                <button
                  type="button"
                  onClick={() => setDeliveryMethod("ship")}
                  aria-pressed={deliveryMethod === "ship"}
                  className={`border px-6 py-3 text-sm font-medium tracking-wide transition-opacity ${
                    deliveryMethod === "ship"
                      ? "bg-primary text-primary-foreground border-transparent"
                      : "border-border text-foreground hover:bg-muted bg-transparent"
                  }`}
                >
                  Ship to address
                </button>
                <button
                  type="button"
                  onClick={() => setDeliveryMethod("pickup")}
                  aria-pressed={deliveryMethod === "pickup"}
                  className={`border px-6 py-3 text-sm font-medium tracking-wide transition-opacity ${
                    deliveryMethod === "pickup"
                      ? "bg-primary text-primary-foreground border-transparent"
                      : "border-border text-foreground hover:bg-muted bg-transparent"
                  }`}
                >
                  In-store pickup
                </button>
              </div>
              <p
                id="delivery-method-hint"
                role="status"
                className="text-muted-foreground mt-3 text-sm"
              >
                {deliveryMethod === "pickup"
                  ? "No shipping charge. You'll pick up your order at the store."
                  : "Shipping cost is based on your store's shipping settings."}
              </p>
            </div>
          )}

          {/* Shipping Address */}
          {deliveryMethod === "ship" && (
            <div className="border-border mt-10 border-t pt-10">
              <h2 className="text-foreground text-xs font-semibold tracking-widest uppercase">
                Shipping Address
              </h2>
              <p className="text-muted-foreground mt-2 text-sm">
                This is sent to Stripe Checkout prefilled so you can confirm or
                edit before paying.
              </p>
              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="address" className={labelClass}>
                    Address line 1 *
                  </label>
                  <input
                    id="address"
                    type="text"
                    autoComplete="shipping address-line1"
                    required={deliveryMethod === "ship"}
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                    className={inputClass}
                    placeholder="123 Main Street"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="address2" className={labelClass}>
                    Address line 2
                  </label>
                  <input
                    id="address2"
                    type="text"
                    autoComplete="shipping address-line2"
                    value={addressLine2}
                    onChange={(e) => setAddressLine2(e.target.value)}
                    className={inputClass}
                    placeholder="Apartment, suite, etc."
                  />
                </div>
                <div>
                  <label htmlFor="city" className={labelClass}>
                    City *
                  </label>
                  <input
                    id="city"
                    type="text"
                    autoComplete="shipping address-level2"
                    required={deliveryMethod === "ship"}
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className={inputClass}
                    placeholder="San Francisco"
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
                    required={deliveryMethod === "ship"}
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className={inputClass}
                    placeholder="CA"
                  />
                </div>
                <div>
                  <label htmlFor="zip" className={labelClass}>
                    ZIP / Postal code *
                  </label>
                  <input
                    id="zip"
                    type="text"
                    autoComplete="shipping postal-code"
                    required={deliveryMethod === "ship"}
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    className={inputClass}
                    placeholder="94102"
                  />
                </div>
                <div>
                  <label htmlFor="country" className={labelClass}>
                    Country *
                  </label>
                  <select
                    id="country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value as "US" | "CA")}
                    className={inputClass}
                  >
                    <option value="US">United States</option>
                    <option value="CA">Canada</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Order Summary Sidebar */}
      <div>
        <div className="border-border bg-card rounded-sm border p-8">
          <h2 className="text-foreground text-xs font-semibold tracking-widest uppercase">
            Order Summary
          </h2>

          <div className="mt-6 flex flex-col gap-4">
            {items.map((item) => (
              <div
                key={`${item.productId}-${item.variantId}`}
                className="flex gap-4"
              >
                <div className="bg-muted relative h-16 w-16 shrink-0 overflow-hidden rounded-sm">
                  <Image
                    src={item.imageUrl ?? "/placeholder.svg"}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                </div>
                <div className="flex flex-1 items-center justify-between">
                  <div>
                    <p className="text-foreground text-sm font-medium">
                      {item.productName}
                    </p>
                    {item.variantName && (
                      <p className="text-muted-foreground text-xs">
                        {item.variantName}
                      </p>
                    )}
                    <p className="text-muted-foreground text-xs">
                      Qty: {item.quantity}
                    </p>
                  </div>
                  <p className="text-foreground text-sm">
                    {formatPrice(item.price * item.quantity)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="border-border mt-6 border-t pt-6">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-foreground">{formatPrice(subtotal)}</span>
              </div>
              {discountAmount > 0 && discountCodeLabel && (
                <div className="flex items-center justify-between text-sm text-green-700">
                  <span>Discount ({discountCodeLabel})</span>
                  <span>-{formatPrice(discountAmount)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Shipping</span>
                <span className="text-foreground">
                  {deliveryMethod === "pickup"
                    ? "In-store pickup (free)"
                    : shipping === 0
                      ? "Free"
                      : formatPrice(shipping)}
                </span>
              </div>
            </div>
          </div>

          <div className="border-border mt-4 border-t pt-4">
            <div className="flex items-center justify-between">
              <span className="text-foreground font-medium">
                Estimated total
              </span>
              <span className="text-foreground text-lg font-medium">
                {formatPrice(finalTotal)}
              </span>
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
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
            form="checkout-form"
            disabled={isProcessing}
            className="bg-primary text-primary-foreground mt-8 flex w-full items-center justify-center gap-2 px-8 py-3 text-sm font-medium tracking-wide transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Continue to Payment
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </>
            )}
          </button>

          <p className="text-muted-foreground mt-3 text-center text-xs">
            All transactions are secure and encrypted via Stripe. 100% Secure
            and Encrypted Payments.
          </p>
        </div>
      </div>
    </div>
  );
}
