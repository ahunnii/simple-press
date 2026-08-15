"use client";

import { useEffect, useRef, useState } from "react";
import * as Sentry from "@sentry/nextjs";

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

// The JSON body `/api/stripe/create-session` returns on both success and
// failure. Parsed defensively — see `readSessionResponse` below.
type CreateSessionResponse = {
  error?: string;
  unavailableItems?: string[];
  unavailableItemIds?: { productId: string; variantId: string | null }[];
  sessionUrl?: string;
  sessionId?: string;
};

// Shown to the shopper when the checkout endpoint answers with something that
// is not JSON (a 502 HTML page, a WAF challenge, a proxy interstitial). Before
// this existed the raw parser output — "Unexpected token '<'..." — was rendered
// into the checkout error banner.
const NON_JSON_RESPONSE_MESSAGE =
  "We couldn't reach the payment service. Please try again in a moment.";

/**
 * Thrown when the create-session response body could not be read as JSON.
 * Carries the transport details so the outer catch can report them to Sentry
 * while the shopper only ever sees `NON_JSON_RESPONSE_MESSAGE`.
 */
class CheckoutResponseFormatError extends Error {
  readonly status: number;
  readonly contentType: string;

  constructor(status: number, contentType: string) {
    super(NON_JSON_RESPONSE_MESSAGE);
    this.name = "CheckoutResponseFormatError";
    this.status = status;
    this.contentType = contentType;
  }
}

/**
 * Reads the create-session body as JSON, defensively.
 *
 * `create-session` always answers with JSON, but a 502 HTML error page, a WAF
 * challenge or a proxy interstitial never reaches the route at all — and a bare
 * `response.json()` would throw a SyntaxError whose raw text ("Unexpected token
 * '<'...") was rendered straight into the shopper's checkout error banner.
 */
async function readSessionResponse(
  response: Response,
): Promise<CreateSessionResponse> {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.toLowerCase().includes("application/json")) {
    throw new CheckoutResponseFormatError(response.status, contentType);
  }

  try {
    return (await response.json()) as CreateSessionResponse;
  } catch {
    // Correct content-type but an unreadable body (truncated/aborted stream).
    throw new CheckoutResponseFormatError(response.status, contentType);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Silent-submit diagnostics
//
// Every template renders its checkout `<form>` WITHOUT `noValidate` and marks
// its contact/shipping inputs `required`. If a template ever hides a control
// that still carries `required` — `display:none`, a collapsed section, a
// reveal animation that never fired and left `opacity:0` — the browser's
// constraint-validation pass cancels the submit before React's `onSubmit` runs.
// `handleSubmit` is never called, so no state flips, no banner renders, no
// request is made, and nothing is reported. Chrome logs "An invalid form
// control with name='' is not focusable" to the console; other browsers say
// nothing at all.
//
// The only hook into that pass is the `invalid` event, which fires on each
// failing control. It does NOT bubble, so it can only be observed from an
// ancestor during the CAPTURE phase — hence the capture-phase listener on
// `document` below.
// ────────────────────────────────────────────────────────────────────────────

/**
 * Controls that only ever appear on a checkout form. Used to tell the checkout
 * form apart from any other form on the page (a footer newsletter box, a search
 * field) without requiring a single template file to pass a ref down — the hook
 * has no DOM handle of its own, and adding one would mean editing all 14
 * template checkout forms.
 *
 * Verified present across every template's checkout form: `type="email"` on the
 * email input, `type="tel"` + `autocomplete="tel"` from `PhoneInput`, and the
 * `autocomplete="shipping ..."` tokens on the address block.
 */
const CHECKOUT_CONTROL_SELECTOR = [
  'input[type="email"]',
  'input[type="tel"]',
  "[autocomplete~='tel']",
  "[autocomplete~='name']",
  "[autocomplete~='given-name']",
  "[autocomplete~='family-name']",
  "[autocomplete~='address-line1']",
  "[autocomplete~='address-level2']",
  "[autocomplete~='postal-code']",
].join(", ");

// Two distinct matches, so a single-field newsletter/sign-in form can never
// qualify. Even a pickup-only checkout (no shipping block) still has an email
// input plus a phone input.
const CHECKOUT_FORM_MIN_CONTROLS = 2;

/** Controls that participate in native constraint validation and matter here. */
type ValidatableControl =
  | HTMLInputElement
  | HTMLSelectElement
  | HTMLTextAreaElement;

function asValidatableControl(
  target: EventTarget | null,
): ValidatableControl | null {
  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLSelectElement ||
    target instanceof HTMLTextAreaElement
  ) {
    return target;
  }
  return null;
}

/** True when this form looks like the checkout form (see selector comment). */
function isCheckoutForm(form: HTMLFormElement): boolean {
  return (
    form.querySelectorAll(CHECKOUT_CONTROL_SELECTOR).length >=
    CHECKOUT_FORM_MIN_CONTROLS
  );
}

// Anything at or under this computed opacity is treated as invisible — covers
// a reveal animation whose starting frame is 0 and never advanced.
const MIN_VISIBLE_OPACITY = 0.05;

function computedOpacity(style: CSSStyleDeclaration): number {
  const parsed = Number.parseFloat(style.opacity);
  return Number.isNaN(parsed) ? 1 : parsed;
}

/**
 * Returns the NAME of the first visibility test the control fails, or `null`
 * when it is genuinely on screen.
 *
 * Order matters: the most specific/explanatory causes come first so the Sentry
 * event names the actual CSS problem, and the vaguest test (`offsetParent`)
 * comes last. `visibility` is inherited so the element's own computed value
 * already reflects a hidden ancestor; `display` and `opacity` are not, which is
 * why the ancestor walk exists — a hidden PARENT is the common real-world case.
 */
function findHiddenReason(el: HTMLElement): string | null {
  const style = window.getComputedStyle(el);

  if (style.display === "none") return "display-none";
  if (style.visibility === "hidden" || style.visibility === "collapse") {
    return "visibility-hidden";
  }
  if (computedOpacity(style) <= MIN_VISIBLE_OPACITY) return "opacity-0";
  if (style.getPropertyValue("content-visibility") === "hidden") {
    return "content-visibility-hidden";
  }

  for (
    let parent = el.parentElement;
    parent !== null;
    parent = parent.parentElement
  ) {
    const parentStyle = window.getComputedStyle(parent);
    if (parentStyle.display === "none") return "parent-display-none";
    if (computedOpacity(parentStyle) <= MIN_VISIBLE_OPACITY) {
      return "parent-opacity-0";
    }
    if (parentStyle.getPropertyValue("content-visibility") === "hidden") {
      return "parent-content-visibility-hidden";
    }
    if (parent.hasAttribute("hidden")) return "parent-hidden-attr";
  }

  const rect = el.getBoundingClientRect();
  if (rect.height === 0) return "zero-height";
  if (rect.width === 0) return "zero-width";

  // Last resort, and deliberately guarded: `offsetParent` is also null for a
  // `position: fixed` element that is perfectly visible, so only trust it when
  // the control isn't fixed.
  if (el.offsetParent === null && style.position !== "fixed") {
    return "offsetParent-null";
  }

  return null;
}

/**
 * Chrome embeds the typed value in some constraint messages ("Please include
 * an '@' in the email address. 'jane' is missing an '@'."), and the shopper's
 * email is PII we must never send (`sendDefaultPii: false`). Every value Chrome
 * interpolates is quoted, so redacting quoted runs keeps the diagnostic half of
 * the message and drops the shopper's half.
 */
function redactValidationMessage(message: string): string {
  return message.replace(/'[^']*'/g, "'…'").replace(/"[^"]*"/g, '"…"');
}

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

  // ──────────────────────────────────────────────────────────────────────────
  // Silent-submit watchdog — see the block comment above `isCheckoutForm`.
  // ──────────────────────────────────────────────────────────────────────────

  const templateId = business.templateId;

  useEffect(() => {
    // The hook is only ever mounted by a template's checkout form, so the
    // listener's lifetime is already the checkout page. `document` is guarded
    // anyway because client components are also rendered on the server —
    // effects don't run there, but the guard costs nothing and documents it.
    if (typeof document === "undefined") return;

    // A template bug is deterministic and fires on every submit attempt; one
    // event per (field, cause) per mount is plenty.
    const reported = new Set<string>();

    const handleInvalid = (event: Event) => {
      const control = asValidatableControl(event.target);
      if (control === null) return;

      const form = control.form;
      if (form === null || !isCheckoutForm(form)) return;

      // Most templates give their inputs an `id` but no `name` — which is
      // exactly why Chrome's console warning reads `name=''`.
      const field = control.name || control.id || "<unnamed>";
      const validationMessage = redactValidationMessage(
        control.validationMessage,
      );
      const hiddenBy = findHiddenReason(control);

      if (hiddenBy === null) {
        // A visible field the shopper simply hasn't filled in. The browser
        // focuses it and shows its own bubble — normal, not a bug. Leave a
        // trail only, so a later captured event carries the context.
        Sentry.addBreadcrumb({
          category: "checkout",
          level: "info",
          message: `Checkout blocked by a visible invalid field: ${field}`,
          data: { field, type: control.type, validationMessage, templateId },
        });
        return;
      }

      // Invalid AND invisible: the shopper cannot possibly fix this, the
      // browser cannot focus it, and the submit is cancelled before any of our
      // code runs. Always a template bug.
      const key = `${field}:${hiddenBy}`;
      if (reported.has(key)) return;
      reported.add(key);

      Sentry.captureMessage(
        `Checkout blocked by a hidden required field: ${field}`,
        {
          level: "error",
          tags: {
            route: "checkout",
            "checkout.step": "hidden-required-field",
            templateId,
          },
          // Never `control.value` — that is the shopper's PII.
          extra: { field, type: control.type, validationMessage, hiddenBy },
        },
      );
    };

    const handleSubmitEvent = (event: Event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement) || !isCheckoutForm(form)) return;

      // The browser only fires `submit` AFTER constraint validation passes, so
      // the presence of this crumb proves the handler was reached and its
      // absence (next to an `invalid` crumb) proves it never was.
      Sentry.addBreadcrumb({
        category: "checkout",
        level: "info",
        message: "Checkout form submit event fired",
        data: { templateId },
      });
    };

    // `invalid` does not bubble, so a capture-phase listener on `document` is
    // the only way to observe it without touching template files. Capture-phase
    // listeners on ancestors still run for non-bubbling events.
    document.addEventListener("invalid", handleInvalid, true);
    document.addEventListener("submit", handleSubmitEvent, true);

    return () => {
      document.removeEventListener("invalid", handleInvalid, true);
      document.removeEventListener("submit", handleSubmitEvent, true);
    };
  }, [templateId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsProcessing(true);

    // Only failures from the request itself are worth a Sentry event — the
    // local pre-checks below are shopper mistakes and leave breadcrumbs only.
    let requestAttempted = false;

    try {
      const missingContactFields = [
        email ? null : "email",
        name ? null : "name",
        phone.trim() ? null : "phone",
      ].filter((f): f is string => f !== null);

      if (missingContactFields.length > 0) {
        Sentry.addBreadcrumb({
          category: "checkout",
          level: "info",
          message: "Checkout pre-check failed: required contact fields",
          // Field NAMES only — never the values the shopper typed.
          data: {
            rule: "required-contact-fields",
            missingFields: missingContactFields,
            templateId,
          },
        });
        throw new Error("Please fill in all required contact fields");
      }

      if (deliveryMethod === "ship") {
        const missingShippingFields = [
          addressLine1.trim() ? null : "addressLine1",
          city.trim() ? null : "city",
          state.trim() ? null : "state",
          postalCode.trim() ? null : "postalCode",
        ].filter((f): f is string => f !== null);

        if (missingShippingFields.length > 0) {
          Sentry.addBreadcrumb({
            category: "checkout",
            level: "info",
            message: "Checkout pre-check failed: required shipping fields",
            data: {
              rule: "required-shipping-fields",
              missingFields: missingShippingFields,
              templateId,
            },
          });
          throw new Error("Please fill in all required shipping fields");
        }
      }

      if (items.length === 0) {
        Sentry.addBreadcrumb({
          category: "checkout",
          level: "info",
          message: "Checkout pre-check failed: empty cart",
          data: { rule: "empty-cart", templateId },
        });
        throw new Error("Your cart is empty");
      }

      // Track begin-checkout with cart value in dollars (2 decimal places)
      track(ANALYTICS_EVENTS.BEGIN_CHECKOUT, {
        value: Math.round(finalTotal) / 100,
      });

      requestAttempted = true;

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

      // Parsed BEFORE the `response.ok` check, as it always was — but now
      // guarded, so a non-JSON body raises a shopper-readable error instead of
      // a raw SyntaxError. See `readSessionResponse`.
      const data = await readSessionResponse(response);

      if (!response.ok) {
        // Breadcrumb only. Every 4xx/5xx rejection is captured server-side in
        // `create-session` with far more context (businessId, feature flags,
        // Stripe config) — capturing here too would only double-count.
        Sentry.addBreadcrumb({
          category: "checkout",
          level: "warning",
          message: `create-session rejected the checkout (${response.status})`,
          data: {
            status: response.status,
            // Server-authored copy, never shopper input.
            serverError: data.error ?? null,
            unavailableItemCount: data.unavailableItems?.length ?? 0,
            templateId,
          },
        });

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
        // A 2xx with no URL means the server believes it succeeded, so nothing
        // is reported on its side — this is the one success-path failure only
        // the client can see.
        Sentry.captureMessage("Checkout succeeded but returned no sessionUrl", {
          level: "error",
          tags: {
            route: "checkout",
            "checkout.step": "missing-session-url",
            templateId,
          },
          extra: {
            status: response.status,
            hasSessionId: Boolean(data.sessionId),
            itemCount: items.length,
            deliveryMethod,
          },
        });
        setError("Failed to create checkout session");
        setIsProcessing(false);
        return;
      }

      window.location.href = sessionUrl;
    } catch (err: unknown) {
      // Only report once the request was actually attempted: a network failure
      // ("Failed to fetch") or a non-JSON response. The pre-check throws above
      // are shopper mistakes and already left breadcrumbs. Fetches aborted by
      // navigation are filtered by `ignoreErrors` in instrumentation-client.ts.
      if (requestAttempted) {
        Sentry.captureException(err, {
          tags: {
            route: "checkout",
            "checkout.step": "request-failed",
            templateId,
          },
          extra: {
            itemCount: items.length,
            deliveryMethod,
            ...(err instanceof CheckoutResponseFormatError
              ? {
                  responseStatus: err.status,
                  responseContentType: err.contentType,
                }
              : {}),
          },
        });
      }
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
