"use client";

import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";

import type {
  CheckoutMerchantPolicies,
  DefaultProductPageTemplateProps,
} from "../../_templates/types";
import type { CheckoutTermsDisclosure } from "~/app/(storefront)/_components/checkout/checkout-terms-notice";
import type { CheckoutAddressFormApi } from "~/app/(storefront)/_components/checkout/saved-address-picker";
import type { SupportedCountry } from "~/lib/geo/regions";
import type { SubscriptionIntervalKey } from "~/lib/subscriptions/intervals";
import type { RouterOutputs } from "~/trpc/react";
import {
  COUNTRY_LABELS,
  getAllowedCountries,
  getRegionOptions,
} from "~/lib/geo/regions";
import { formatPrice } from "~/lib/prices";
import { SHIPPING_TYPES } from "~/lib/shipping-utils";
import { getInterval } from "~/lib/subscriptions/intervals";
import {
  computeSubscriptionQuote,
  getSubscriptionOffer,
} from "~/lib/subscriptions/pricing";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { CheckoutTermsNotice } from "~/app/(storefront)/_components/checkout/checkout-terms-notice";
import {
  applySavedAddressToForm,
  SavedAddressPicker,
} from "~/app/(storefront)/_components/checkout/saved-address-picker";

const QUOTE_DEBOUNCE_MS = 400;

const NON_JSON_RESPONSE_MESSAGE =
  "We couldn't reach the payment service. Please try again in a moment.";

type CreateSubscriptionSessionResponse = {
  error?: string;
  sessionUrl?: string;
  sessionId?: string;
};

/**
 * Parses `POST /api/stripe/subscriptions/create-session`'s response body,
 * guarding a non-JSON body (a WAF/502 page, a truncated stream) the same way
 * `readSessionResponse` does in `use-checkout-form.ts` — that hook is on the
 * plan's do-not-edit list, so this is a small, deliberate parallel rather than
 * an import.
 */
async function readSubscriptionSessionResponse(
  response: Response,
): Promise<CreateSubscriptionSessionResponse> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error(NON_JSON_RESPONSE_MESSAGE);
  }
  try {
    return (await response.json()) as CreateSubscriptionSessionResponse;
  } catch {
    throw new Error(NON_JSON_RESPONSE_MESSAGE);
  }
}

function cadenceWords(entry: {
  interval: string;
  intervalCount: number;
}): string {
  return entry.intervalCount === 1
    ? entry.interval
    : `${entry.intervalCount} ${entry.interval}s`;
}

type Props = {
  business: NonNullable<RouterOutputs["business"]["simplifiedGet"]>;
  product: DefaultProductPageTemplateProps["product"];
  variantId: string | null;
  intervalKey: SubscriptionIntervalKey;
  quantity: number;
  merchantPolicies: CheckoutMerchantPolicies;
};

/**
 * The Subscribe checkout-prep form. Collects contact + (frozen) delivery
 * address, previews the store's real shipping rate for that address, and
 * posts to `/api/stripe/subscriptions/create-session` — the money endpoint
 * that creates the `Subscription` row and the Stripe Checkout Session. This
 * component never computes a price that reaches Stripe; every cent shown here
 * is a preview the server recomputes and is free to reject.
 */
export function SubscribeForm({
  business,
  product,
  variantId,
  intervalKey,
  quantity,
  merchantPolicies,
}: Props) {
  const variant = variantId
    ? product.variants.find((v) => v.id === variantId)
    : undefined;
  const variantName = variant?.name ?? null;
  const offer = getSubscriptionOffer(product, variantId);
  const cadence = getInterval(intervalKey);

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
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ──────────────────────────────────────────────────────────────────────────
  // Shipping quote — same debounce pattern as `useCheckoutForm` (lines
  // ~344-419), simplified to a single product/quantity instead of a cart.
  // Only zone+weight stores need to wait on an address; every other shipping
  // type is destination-independent, so it's quoted once immediately.
  // ──────────────────────────────────────────────────────────────────────────
  const isZoneWeight = business.shippingType === SHIPPING_TYPES.ZONE_WEIGHT;

  const [debouncedDestination, setDebouncedDestination] = useState<{
    state: string;
    country: string;
  } | null>(null);
  const [quoteInputPending, setQuoteInputPending] = useState(isZoneWeight);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isZoneWeight) return;
    setQuoteInputPending(true);
    if (debounceTimerRef.current !== null)
      clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedDestination({ state, country });
      setQuoteInputPending(false);
    }, QUOTE_DEBOUNCE_MS);
    return () => {
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [isZoneWeight, state, country, deliveryMethod]);

  const quoteDestination = isZoneWeight
    ? debouncedDestination
    : { state: "", country };

  const quoteEnabled =
    deliveryMethod === "ship" &&
    (!isZoneWeight ||
      (!quoteInputPending &&
        debouncedDestination !== null &&
        debouncedDestination.state.trim().length > 0));

  const quoteQuery = api.shipping.quote.useQuery(
    {
      items: [{ productId: product.id, variantId, quantity }],
      destinationState: quoteDestination?.state ?? "",
      destinationCountry: quoteDestination?.country ?? country,
      deliveryMethod: "ship",
    },
    {
      enabled: quoteEnabled,
      placeholderData: (prev) => prev,
    },
  );

  const shippingCents =
    deliveryMethod === "pickup" ? 0 : (quoteQuery.data?.shippingCents ?? 0);
  const shippingPending =
    deliveryMethod === "ship" &&
    (quoteQuery.isLoading ||
      (isZoneWeight && (quoteInputPending || state.trim().length === 0)));

  let quote: ReturnType<typeof computeSubscriptionQuote> | null;
  try {
    quote = computeSubscriptionQuote({
      listPriceCents: offer.listPriceCents,
      discountPercent: offer.discountPercent,
      quantity,
      shippingCents,
    });
  } catch {
    quote = null;
  }

  const addressFormApi: CheckoutAddressFormApi = {
    setName,
    setPhone,
    setAddressLine1,
    setAddressLine2,
    setCity,
    setState,
    setPostalCode,
    setCountry,
    allowedCountries,
  };

  const disclosure: CheckoutTermsDisclosure = {
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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const missingContact = [
      email.trim() ? null : "email",
      name.trim() ? null : "name",
      phone.trim() ? null : "phone",
    ].filter((f): f is string => f !== null);
    if (missingContact.length > 0) {
      setError("Please fill in all required contact fields.");
      return;
    }

    if (deliveryMethod === "ship") {
      const missingShipping = [
        addressLine1.trim() ? null : "addressLine1",
        city.trim() ? null : "city",
        state.trim() ? null : "state",
        postalCode.trim() ? null : "postalCode",
      ].filter((f): f is string => f !== null);
      if (missingShipping.length > 0) {
        setError("Please fill in all required shipping fields.");
        return;
      }
    }

    setIsProcessing(true);

    try {
      const response = await fetch("/api/stripe/subscriptions/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          variantId,
          intervalKey,
          quantity,
          deliveryMethod,
          customerInfo: {
            email: email.trim(),
            name: name.trim(),
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
        }),
      });

      const data = await readSubscriptionSessionResponse(response);

      if (!response.ok) {
        setError(
          data.error ??
            "Failed to start subscription checkout. Please try again.",
        );
        setIsProcessing(false);
        return;
      }

      if (!data.sessionUrl) {
        setError("Failed to start subscription checkout. Please try again.");
        setIsProcessing(false);
        return;
      }

      window.location.href = data.sessionUrl;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to start subscription checkout. Please try again.",
      );
      setIsProcessing(false);
    }
  }

  const shippingDisplay = shippingPending
    ? "Calculating…"
    : formatPrice(shippingCents);
  const intervalLabel = cadence?.label ?? intervalKey;
  const cadenceText = cadence ? cadenceWords(cadence) : intervalKey;

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-12 sm:py-16">
      <header className="mb-8">
        <p className="text-muted-foreground mb-2 text-[11px] font-medium tracking-[0.14em] uppercase">
          Subscribe
        </p>
        <h1 className="text-2xl font-medium tracking-tight sm:text-3xl">
          {product.name}
          {variantName ? ` — ${variantName}` : ""}
        </h1>
      </header>

      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="grid grid-cols-1 gap-8 lg:grid-cols-3"
      >
        <div className="flex flex-col gap-6 lg:col-span-2">
          <div className="border-border rounded-[var(--radius)] border p-5">
            <h2 className="text-muted-foreground mb-4 text-[11px] font-medium tracking-[0.14em] uppercase">
              Contact
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="subscribe-email">Email *</Label>
                <Input
                  id="subscribe-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="subscribe-name">Full name *</Label>
                <Input
                  id="subscribe-name"
                  required
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="subscribe-phone">Phone *</Label>
                <Input
                  id="subscribe-phone"
                  type="tel"
                  required
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1.5"
                />
              </div>
            </div>
          </div>

          {business.offersInStorePickup && (
            <fieldset className="border-border m-0 rounded-[var(--radius)] border p-5">
              <legend className="text-muted-foreground px-1 text-[11px] font-medium tracking-[0.14em] uppercase">
                Delivery method
              </legend>
              <div className="mt-2 flex flex-wrap gap-3">
                <label
                  className={cn(
                    "border-border flex cursor-pointer items-center gap-2 rounded-[var(--radius)] border px-3 py-2 text-sm",
                    deliveryMethod === "ship" && "border-primary bg-primary/5",
                  )}
                >
                  <input
                    type="radio"
                    name="subscribe-delivery-method"
                    value="ship"
                    checked={deliveryMethod === "ship"}
                    onChange={() => setDeliveryMethod("ship")}
                    className="size-4"
                  />
                  Ship to address
                </label>
                <label
                  className={cn(
                    "border-border flex cursor-pointer items-center gap-2 rounded-[var(--radius)] border px-3 py-2 text-sm",
                    deliveryMethod === "pickup" &&
                      "border-primary bg-primary/5",
                  )}
                >
                  <input
                    type="radio"
                    name="subscribe-delivery-method"
                    value="pickup"
                    checked={deliveryMethod === "pickup"}
                    onChange={() => setDeliveryMethod("pickup")}
                    className="size-4"
                  />
                  In-store pickup
                </label>
              </div>
            </fieldset>
          )}

          {deliveryMethod === "pickup" ? (
            <div className="border-border bg-muted/30 rounded-[var(--radius)] border p-4 text-sm">
              <p className="font-medium">Pickup location</p>
              <p className="text-muted-foreground mt-0.5">
                {business.pickupLocation ??
                  business.businessAddress ??
                  "Pickup details will be confirmed by the store."}
              </p>
              {business.pickupInstructions && (
                <p className="text-muted-foreground mt-1 whitespace-pre-line">
                  {business.pickupInstructions}
                </p>
              )}
            </div>
          ) : (
            <div className="border-border flex flex-col gap-4 rounded-[var(--radius)] border p-5">
              <h2 className="text-muted-foreground text-[11px] font-medium tracking-[0.14em] uppercase">
                Shipping address
              </h2>
              <SavedAddressPicker
                onSelect={(address) =>
                  applySavedAddressToForm(addressFormApi, address)
                }
              />
              <div>
                <Label htmlFor="subscribe-address1">Address line 1 *</Label>
                <Input
                  id="subscribe-address1"
                  required
                  autoComplete="address-line1"
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="subscribe-address2">Address line 2</Label>
                <Input
                  id="subscribe-address2"
                  autoComplete="address-line2"
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="subscribe-city">City *</Label>
                  <Input
                    id="subscribe-city"
                    required
                    autoComplete="address-level2"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="subscribe-state">State / Province *</Label>
                  <select
                    id="subscribe-state"
                    required
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="border-input mt-1.5 h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                  >
                    <option value="">Select…</option>
                    {getRegionOptions(country).map((opt) => (
                      <option key={opt.code} value={opt.code}>
                        {opt.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="subscribe-postal">ZIP / Postal code *</Label>
                  <Input
                    id="subscribe-postal"
                    required
                    autoComplete="postal-code"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="subscribe-country">Country *</Label>
                  <select
                    id="subscribe-country"
                    required
                    value={country}
                    onChange={(e) =>
                      setCountry(e.target.value as SupportedCountry)
                    }
                    className="border-input mt-1.5 h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                  >
                    {allowedCountries.map((c) => (
                      <option key={c} value={c}>
                        {COUNTRY_LABELS[c]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-5 lg:col-span-1">
          <div className="border-border bg-card sticky top-4 rounded-[var(--radius)] border p-5">
            <h2 className="text-card-foreground text-sm font-semibold">
              Subscription summary
            </h2>
            <div className="border-border mt-3 flex items-start justify-between gap-4 border-b pb-3">
              <div>
                <p className="text-sm font-medium">{product.name}</p>
                {variantName && (
                  <p className="text-muted-foreground text-xs">{variantName}</p>
                )}
                <p className="text-muted-foreground text-xs">Qty {quantity}</p>
              </div>
              {quote && (
                <p className="text-sm font-semibold">
                  {formatPrice(quote.unitAmountCents)}
                  <span className="text-muted-foreground text-xs font-normal">
                    {" "}
                    / unit
                  </span>
                </p>
              )}
            </div>

            {quote && (
              <dl className="mt-3 flex flex-col gap-1.5 text-sm">
                {offer.discountPercent > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">
                      Subscribe & save {offer.discountPercent}%
                    </dt>
                    <dd>-{formatPrice(quote.savingsCents)}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">
                    Shipping (per delivery)
                  </dt>
                  <dd>
                    {deliveryMethod === "pickup"
                      ? "In-store pickup — free"
                      : shippingDisplay}
                  </dd>
                </div>
                <div className="border-border flex justify-between border-t pt-1.5 font-medium">
                  <dt>Per-delivery total</dt>
                  <dd>{formatPrice(quote.perDeliveryCents)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Delivery frequency</dt>
                  <dd>{intervalLabel}</dd>
                </div>
              </dl>
            )}

            {quote && (
              <p className="text-muted-foreground mt-3 text-xs">
                First charge today, then {formatPrice(quote.perDeliveryCents)}{" "}
                every {cadenceText} until you cancel.
              </p>
            )}
          </div>

          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}

          <CheckoutTermsNotice
            disclosure={disclosure}
            leadText="By subscribing you agree to recurring charges as described above, and to"
            className="text-muted-foreground text-xs leading-relaxed"
            linkClassName="underline underline-offset-2"
          />

          <Button type="submit" size="lg" disabled={isProcessing || !quote}>
            {isProcessing
              ? "Starting checkout…"
              : "Continue to secure checkout"}
          </Button>
        </div>
      </form>
    </main>
  );
}
