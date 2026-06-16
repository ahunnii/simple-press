"use client";

import { useState } from "react";

import type { DefaultCheckoutPageTemplateProps } from "~/app/(storefront)/_templates/types";
import {
  calculateShipping,
  shippingConfigFromBusiness,
} from "~/lib/shipping-utils";
import { ANALYTICS_EVENTS, track } from "~/lib/umami/track";
import { useCart } from "~/providers/cart-context";

import { useDiscountCode } from "./use-discount-code";

type CheckoutFormBusiness = DefaultCheckoutPageTemplateProps["business"];

type UseCheckoutFormReturn = {
  // Contact fields
  email: string;
  setEmail: (v: string) => void;
  name: string;
  setName: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  // Shipping address fields
  addressLine1: string;
  setAddressLine1: (v: string) => void;
  addressLine2: string;
  setAddressLine2: (v: string) => void;
  city: string;
  setCity: (v: string) => void;
  state: string;
  setState: (v: string) => void;
  postalCode: string;
  setPostalCode: (v: string) => void;
  country: "US" | "CA";
  setCountry: (v: "US" | "CA") => void;
  // Delivery method
  deliveryMethod: "ship" | "pickup";
  setDeliveryMethod: (v: "ship" | "pickup") => void;
  // Discount
  discountCodeInput: string;
  setDiscountCodeInput: (v: string) => void;
  discountCodeId: string | null;
  discountAmount: number;
  discountCodeLabel: string | null;
  discountFieldError: string | null;
  setDiscountFieldError: (v: string | null) => void;
  handleApplyDiscount: () => void;
  clearDiscount: () => void;
  isValidatingDiscount: boolean;
  // Submit
  isProcessing: boolean;
  error: string | null;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  // Helpers
  shippingConfig: ReturnType<typeof shippingConfigFromBusiness>;
  items: ReturnType<typeof useCart>["items"];
  // Computed totals
  subtotal: number;
  shipping: number;
  finalTotal: number;
};

export function useCheckoutForm(
  business: CheckoutFormBusiness,
): UseCheckoutFormReturn {
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

  const discount = useDiscountCode();

  const shipping =
    deliveryMethod === "pickup"
      ? 0
      : calculateShipping(subtotal, shippingConfig);
  const finalTotal = subtotal - discount.discountAmount + shipping;

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

      // Track begin-checkout with cart value in dollars (2 decimal places)
      track(ANALYTICS_EVENTS.BEGIN_CHECKOUT, {
        value: Math.round(finalTotal) / 100,
      });

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
          discountCodeId: discount.discountCodeId,
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

  return {
    email,
    setEmail,
    name,
    setName,
    phone,
    setPhone,
    addressLine1,
    setAddressLine1,
    addressLine2,
    setAddressLine2,
    city,
    setCity,
    state,
    setState,
    postalCode,
    setPostalCode,
    country,
    setCountry,
    deliveryMethod,
    setDeliveryMethod,
    discountCodeInput: discount.discountCodeInput,
    setDiscountCodeInput: discount.setDiscountCodeInput,
    discountCodeId: discount.discountCodeId,
    discountAmount: discount.discountAmount,
    discountCodeLabel: discount.discountCodeLabel,
    discountFieldError: discount.discountFieldError,
    setDiscountFieldError: discount.setDiscountFieldError,
    handleApplyDiscount: discount.handleApplyDiscount,
    clearDiscount: discount.clearDiscount,
    isValidatingDiscount: discount.isValidating,
    isProcessing,
    error,
    handleSubmit,
    shippingConfig,
    items,
    subtotal,
    shipping,
    finalTotal,
  };
}
