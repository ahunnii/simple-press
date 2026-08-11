"use client";

import { useEffect, useRef, useState } from "react";

import type { CheckoutTermsDisclosure } from "~/app/(storefront)/_components/checkout/checkout-terms-notice";
import type {
  CheckoutMerchantPolicies,
  DefaultCheckoutPageTemplateProps,
} from "~/app/(storefront)/_templates/types";
import type { SupportedCountry } from "~/lib/geo/regions";
import {
  getAllowedCountries, // used at runtime inside useCheckoutForm
} from "~/lib/geo/regions";
import {
  calculateShipping,
  SHIPPING_TYPES,
  shippingConfigFromBusiness,
} from "~/lib/shipping-utils";
import { ANALYTICS_EVENTS, track } from "~/lib/umami/track";
import { api } from "~/trpc/react";
import { useCart } from "~/providers/cart-context";
import { useStorefrontFlags } from "~/providers/feature-flags-context";

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
  country: SupportedCountry;
  setCountry: (v: SupportedCountry) => void;
  allowedCountries: SupportedCountry[];
  // Delivery method
  deliveryMethod: "ship" | "pickup";
  setDeliveryMethod: (v: "ship" | "pickup") => void;
  // Discount
  couponsEnabled: boolean;
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
  // Zone+weight quote state (only populated when shippingType === "zone_weight")
  isQuotingShipping: boolean;
  shippingPending: boolean;
  // The passive terms-of-service / refund-policy disclosure line rendered
  // above the place-order button — see `CheckoutTermsNotice`.
  termsDisclosure: CheckoutTermsDisclosure;
};

// Debounce delay (ms) for the zone+weight shipping quote.
const QUOTE_DEBOUNCE_MS = 500;

// Stands in for the apply-discount handler when the coupons flag is off.
const noopApplyDiscount = () => {
  // Intentionally empty — coupons are disabled for this business.
};

export function useCheckoutForm(
  business: CheckoutFormBusiness,
  merchantPolicies: CheckoutMerchantPolicies,
): UseCheckoutFormReturn {
  const { isEnabled } = useStorefrontFlags();
  const couponsEnabled = isEnabled("coupons");
  const { items, removeItem, subtotal } = useCart();
  const shippingConfig = shippingConfigFromBusiness(business);
  const isZoneWeight = business.shippingType === SHIPPING_TYPES.ZONE_WEIGHT;

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
  const allowedCountries = getAllowedCountries(business.salesCountries);

  const [country, setCountryRaw] = useState<SupportedCountry>("US");

  const setCountry = (v: SupportedCountry) => {
    setCountryRaw(v);
    setState("");
  };

  const [deliveryMethod, setDeliveryMethod] = useState<"ship" | "pickup">(
    "ship",
  );

  const discount = useDiscountCode();
  // When coupons are disabled, never let an applied/stale discount affect
  // totals or the checkout payload — treat it as if none was applied.
  const effectiveDiscountAmount = couponsEnabled ? discount.discountAmount : 0;
  const effectiveDiscountCodeId = couponsEnabled
    ? discount.discountCodeId
    : null;
  const handleApplyDiscount = couponsEnabled
    ? discount.handleApplyDiscount
    : noopApplyDiscount;

  // ──────────────────────────────────────────────────────────────────────────
  // Zone+weight shipping quote (debounced server call)
  // ──────────────────────────────────────────────────────────────────────────

  // Stable quote input that updates only after the debounce delay.
  const [debouncedQuoteInput, setDebouncedQuoteInput] = useState<{
    items: { productId: string; variantId: string | null; quantity: number }[];
    destinationState: string;
    destinationCountry: string;
    deliveryMethod: "ship" | "pickup";
  } | null>(null);

  // Whether the debounce timer is pending (input changed but not yet sent).
  const [quoteInputPending, setQuoteInputPending] = useState(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Build the serialisable quote key from current state.
  const quoteItems = items.map((i) => ({
    productId: i.productId,
    variantId: i.variantId,
    quantity: i.quantity,
  }));
  // Stable string key so the debounce effect re-runs only on real cart changes.
  const quoteItemsKey = JSON.stringify(quoteItems);

  // Debounce the quote input whenever cart/address/method changes (zone_weight only).
  useEffect(() => {
    if (!isZoneWeight) return;

    setQuoteInputPending(true);

    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setDebouncedQuoteInput({
        items: quoteItems,
        destinationState: state,
        destinationCountry: country,
        deliveryMethod,
      });
      setQuoteInputPending(false);
    }, QUOTE_DEBOUNCE_MS);

    return () => {
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
      }
    };
    // quoteItems is captured via the stable quoteItemsKey below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isZoneWeight, quoteItemsKey, state, country, deliveryMethod]);

  // Only fire the tRPC query when we have a destination state and items.
  const quoteEnabled =
    isZoneWeight &&
    !quoteInputPending &&
    debouncedQuoteInput !== null &&
    debouncedQuoteInput.items.length > 0 &&
    (debouncedQuoteInput.deliveryMethod === "pickup" ||
      debouncedQuoteInput.destinationState.trim().length > 0);

  const quoteQuery = api.shipping.quote.useQuery(
    debouncedQuoteInput ?? {
      items: [{ productId: "", variantId: null, quantity: 1 }],
      destinationState: "",
      destinationCountry: "US",
      deliveryMethod: "ship",
    },
    {
      enabled: quoteEnabled,
      // Keep the previous value while re-fetching so the UI doesn't flicker.
      placeholderData: (prev) => prev,
    },
  );

  // ──────────────────────────────────────────────────────────────────────────
  // Unified shipping value
  // ──────────────────────────────────────────────────────────────────────────

  let shipping: number;
  let isQuotingShipping: boolean;
  let shippingPending: boolean;

  if (isZoneWeight) {
    // Before the user has entered a state (and before any quote resolves),
    // use 0 as a placeholder so finalTotal renders. The UI should show
    // "Calculated at checkout" in place of the shipping dollar amount
    // when shippingPending is true or isQuotingShipping is true.
    shipping = quoteQuery.data?.shippingCents ?? 0;
    isQuotingShipping = quoteQuery.isFetching;
    shippingPending =
      quoteInputPending ||
      (deliveryMethod === "ship" && state.trim().length === 0) ||
      quoteQuery.isFetching;
  } else {
    shipping =
      deliveryMethod === "pickup"
        ? 0
        : calculateShipping(subtotal, shippingConfig);
    isQuotingShipping = false;
    shippingPending = false;
  }

  const finalTotal = subtotal - effectiveDiscountAmount + shipping;

  // Only reference merchant policies that actually exist (a Page row is only
  // ever created once the owner saves non-empty content, so most stores have
  // none) — never assemble a link to a slug with no published Page.
  const termsDisclosure: CheckoutTermsDisclosure = {
    merchantName: business.name,
    merchantLinks: [
      ...(merchantPolicies.hasTermsOfService
        ? [{ label: "Terms of Service", href: "/terms-of-service" }]
        : []),
      ...(merchantPolicies.hasRefundPolicy
        ? [{ label: "Refund Policy", href: "/refund-policy" }]
        : []),
    ],
    platformHref: "/platform/policies/terms-of-service",
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
          discountCodeId: effectiveDiscountCodeId,
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
    allowedCountries,
    deliveryMethod,
    setDeliveryMethod,
    couponsEnabled,
    discountCodeInput: discount.discountCodeInput,
    setDiscountCodeInput: discount.setDiscountCodeInput,
    discountCodeId: effectiveDiscountCodeId,
    discountAmount: effectiveDiscountAmount,
    discountCodeLabel: discount.discountCodeLabel,
    discountFieldError: discount.discountFieldError,
    setDiscountFieldError: discount.setDiscountFieldError,
    handleApplyDiscount,
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
    isQuotingShipping,
    shippingPending,
    termsDisclosure,
  };
}
