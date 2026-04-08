"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import type { DefaultCheckoutPageTemplateProps } from "../../types";
import { shippingConfigFromBusiness } from "~/lib/shipping-utils";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
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

import { NoiseOrderSummary } from "./noise-order-summary";

type CheckoutFormProps = {
  business: DefaultCheckoutPageTemplateProps["business"];
};

export function NoiseCheckoutForm({ business }: CheckoutFormProps) {
  const { items, removeItem, subtotal } = useCart();
  const shippingConfig = shippingConfigFromBusiness(business);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [discountCodeInput, setDiscountCodeInput] = useState("");
  const [discountCodeId, setDiscountCodeId] = useState<string | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountCodeLabel, setDiscountCodeLabel] = useState<string | null>(null);
  const [discountFieldError, setDiscountFieldError] = useState<string | null>(null);

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

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState<"US" | "CA">("US");
  const [phone, setPhone] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<"ship" | "pickup">("ship");

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
        (!addressLine1.trim() || !city.trim() || !state.trim() || !postalCode.trim())
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
          discountCodeId,
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
              ? `The following items were removed from your cart: ${data.unavailableItems.join(", ")}.`
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

      if (data.sessionId) {
        document.cookie = `pending_session=${data.sessionId}; path=/; SameSite=Strict; Secure; max-age=3600`;
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
        <p className="font-sans text-sm text-muted-foreground mb-4">Your cart is empty</p>
        <Button asChild className="rounded-none font-sans text-[10px] tracking-[0.25em] uppercase">
          <Link href="/shop">Shop the Collection</Link>
        </Button>
      </div>
    );
  }

  const labelClass = "font-sans text-[9px] tracking-[0.25em] uppercase text-foreground";
  const inputClass = "rounded-none border-border font-sans text-sm";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8 lg:flex-row">
      <div className="flex-1 space-y-8">
        {/* Contact Information */}
        <fieldset className="flex flex-col gap-4">
          <legend className="border-b border-border pb-3 font-sans text-[10px] tracking-[0.3em] uppercase text-foreground w-full">
            Contact Information
          </legend>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email" className={labelClass}>Email *</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name" className={labelClass}>Full Name *</Label>
            <Input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="phone" className={labelClass}>Phone *</Label>
            <PhoneInput id="phone" autoComplete="tel" value={phone} onChange={(val) => setPhone(val)} placeholder="+1 555 123 4567" required />
          </div>
        </fieldset>

        {/* Discount Code */}
        <fieldset className="flex flex-col gap-3">
          <legend className="border-b border-border pb-3 font-sans text-[10px] tracking-[0.3em] uppercase text-foreground w-full">
            Discount Code
          </legend>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="discount-code" className={labelClass}>Code</Label>
              <Input
                id="discount-code"
                type="text"
                value={discountCodeInput}
                onChange={(e) => {
                  setDiscountCodeInput(e.target.value.toUpperCase());
                  setDiscountFieldError(null);
                }}
                placeholder="DISCOUNT CODE"
                autoComplete="off"
                className={inputClass}
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={handleApplyDiscount}
              className={cn(
                "rounded-none font-sans text-[10px] tracking-[0.2em] uppercase",
                discountCodeInput.trim() && "bg-primary text-primary-foreground hover:bg-primary/90",
              )}
              disabled={validateDiscountMutation.isPending || items.length === 0}
            >
              {validateDiscountMutation.isPending ? (
                <><Loader2 className="mr-2 size-3.5 animate-spin" />Checking…</>
              ) : (
                "Apply"
              )}
            </Button>
          </div>
          {discountFieldError && (
            <p className="font-sans text-xs text-destructive">{discountFieldError}</p>
          )}
          {discountCodeLabel && discountAmount > 0 && (
            <p className="font-sans text-xs text-green-600">
              Code <span className="font-mono font-semibold">{discountCodeLabel}</span> applied.
            </p>
          )}
        </fieldset>

        {/* Delivery Method */}
        {shippingConfig.offersInStorePickup && (
          <fieldset className="flex flex-col gap-3">
            <legend className="border-b border-border pb-3 font-sans text-[10px] tracking-[0.3em] uppercase text-foreground w-full">
              Delivery
            </legend>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={deliveryMethod === "ship" ? "default" : "outline"}
                onClick={() => setDeliveryMethod("ship")}
                className="rounded-none font-sans text-[10px] tracking-[0.2em] uppercase"
              >
                Ship to address
              </Button>
              <Button
                type="button"
                variant={deliveryMethod === "pickup" ? "default" : "outline"}
                onClick={() => setDeliveryMethod("pickup")}
                className="rounded-none font-sans text-[10px] tracking-[0.2em] uppercase"
              >
                In-store pickup
              </Button>
            </div>
            <p className="font-sans text-xs text-muted-foreground">
              {deliveryMethod === "pickup"
                ? "No shipping charge. Pick up at the store."
                : "Shipping cost based on your store's settings."}
            </p>
          </fieldset>
        )}

        {/* Shipping Address */}
        {deliveryMethod === "ship" && (
          <fieldset className="flex flex-col gap-4">
            <legend className="border-b border-border pb-3 font-sans text-[10px] tracking-[0.3em] uppercase text-foreground w-full">
              Shipping Address
            </legend>
            <p className="font-sans text-xs text-muted-foreground">
              Pre-filled at Stripe Checkout — you can confirm or edit before paying.
            </p>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="address-line1" className={labelClass}>Address Line 1 *</Label>
              <Input id="address-line1" type="text" autoComplete="shipping address-line1" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} placeholder="Street address, P.O. box" required={deliveryMethod === "ship"} className={inputClass} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="address-line2" className={labelClass}>Address Line 2</Label>
              <Input id="address-line2" type="text" autoComplete="shipping address-line2" value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} placeholder="Apartment, suite, etc." className={inputClass} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="city" className={labelClass}>City *</Label>
                <Input id="city" type="text" autoComplete="shipping address-level2" value={city} onChange={(e) => setCity(e.target.value)} required={deliveryMethod === "ship"} placeholder="e.g. Detroit" className={inputClass} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="state" className={labelClass}>State / Province *</Label>
                <Input id="state" type="text" autoComplete="shipping address-level1" value={state} onChange={(e) => setState(e.target.value)} placeholder="e.g. MI" required={deliveryMethod === "ship"} className={inputClass} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="postal" className={labelClass}>ZIP / Postal Code *</Label>
                <Input id="postal" type="text" autoComplete="shipping postal-code" placeholder="e.g. 48201" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} required={deliveryMethod === "ship"} className={inputClass} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="country" className={labelClass}>Country *</Label>
                <Select value={country} onValueChange={(v) => setCountry(v as "US" | "CA")} required>
                  <SelectTrigger id="country" className={cn("w-full", inputClass)}>
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

      {/* Order Summary + Submit */}
      <div className="w-full shrink-0 lg:w-80">
        <div className="sticky top-20 space-y-4">
          <NoiseOrderSummary
            shippingConfig={shippingConfig}
            deliveryMethod={deliveryMethod}
            discountAmount={discountAmount}
          />

          {error && (
            <Alert variant="destructive">
              <AlertDescription className="font-sans text-sm">{error}</AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            disabled={isProcessing}
            className="w-full rounded-none font-sans text-[10px] tracking-[0.25em] uppercase"
            size="lg"
          >
            {isProcessing ? (
              <><Loader2 className="mr-2 size-3.5 animate-spin" />Processing...</>
            ) : (
              "Continue to Payment"
            )}
          </Button>

          <p className="text-center font-sans text-[10px] tracking-wide text-muted-foreground">
            All transactions are secure and encrypted via Stripe.
          </p>
        </div>
      </div>
    </form>
  );
}
