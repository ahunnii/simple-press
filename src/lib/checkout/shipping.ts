import type Stripe from "stripe";

export interface ResolvedCheckoutShipping {
  addressLine1: string | null;
  addressLine2: string | null;
  city: string;
  province: string;
  zip: string;
  country: string;
  phone: string | null;
  nameForAddress: string | null;
}

/**
 * Resolve the destination shipping address from a completed Checkout Session.
 *
 * Precedence is deliberately "shipping-first": a shipping field must never fall
 * back to the billing address (`customer_details.address`) ahead of a real
 * shipping address. For locked zone_weight orders we don't collect a shipping
 * address on Stripe, so the authoritative address comes from the PaymentIntent
 * shipping (set at session creation) or the session metadata (our form values).
 *
 *   1. collected_information.shipping_details  (editable/legacy Checkout flow)
 *   2. payment_intent.shipping                 (locked flow: address we bound)
 *   3. metadata.shipping*                       (our pre-filled form address)
 *   4. customer_details.address                 (billing — last resort only)
 *
 * Pure resolver over a Stripe Checkout Session — extracted from the webhook so
 * it can be unit-tested.
 */
export function resolveCheckoutShipping(
  fullSession: Stripe.Checkout.Session,
): ResolvedCheckoutShipping {
  const collected = fullSession.collected_information?.shipping_details;
  if (collected?.address?.line1) {
    const a = collected.address;
    return {
      addressLine1: a.line1 ?? null,
      addressLine2: a.line2 ?? null,
      city: a.city ?? "",
      province: a.state ?? "",
      zip: a.postal_code ?? "",
      country: a.country ?? "",
      phone: fullSession.customer_details?.phone ?? null,
      nameForAddress:
        collected.name ?? fullSession.customer_details?.name ?? null,
    };
  }

  const pi = fullSession.payment_intent;
  if (typeof pi === "object" && pi?.shipping?.address?.line1) {
    const a = pi.shipping.address;
    return {
      addressLine1: a.line1 ?? null,
      addressLine2: a.line2 ?? null,
      city: a.city ?? "",
      province: a.state ?? "",
      zip: a.postal_code ?? "",
      country: a.country ?? "",
      phone: pi.shipping.phone ?? fullSession.customer_details?.phone ?? null,
      nameForAddress: pi.shipping.name ?? null,
    };
  }

  const m = fullSession.metadata;
  if (m?.shippingLine1) {
    return {
      addressLine1: m.shippingLine1,
      addressLine2: m.shippingLine2 ?? null,
      city: m.shippingCity ?? "",
      province: m.shippingState ?? "",
      zip: m.shippingPostalCode ?? "",
      country: m.shippingCountry ?? "",
      phone: m.shippingPhone ?? null,
      nameForAddress:
        m.customerName ?? fullSession.customer_details?.name ?? null,
    };
  }

  const cd = fullSession.customer_details?.address;
  if (cd?.line1) {
    return {
      addressLine1: cd.line1 ?? null,
      addressLine2: cd.line2 ?? null,
      city: cd.city ?? "",
      province: cd.state ?? "",
      zip: cd.postal_code ?? "",
      country: cd.country ?? "",
      phone: fullSession.customer_details?.phone ?? null,
      nameForAddress: fullSession.customer_details?.name ?? null,
    };
  }

  return {
    addressLine1: null,
    addressLine2: null,
    city: "",
    province: "",
    zip: "",
    country: "",
    phone: null,
    nameForAddress: null,
  };
}

/**
 * Decide whether to pin the destination on the PaymentIntent (`payment_intent_data.shipping`).
 *
 * We pin it to lock the destination for zone_weight orders so a shopper can't switch to a
 * cheaper shipping zone on Stripe's page. BUT Stripe rejects `payment_intent_data[shipping]`
 * when `automatic_tax` is enabled ("You cannot enable automatic tax calculation with
 * payment_intent_data[shipping] set"). When auto tax is on we therefore do NOT pin it — the
 * locked address still reaches the webhook via `metadata.shipping*` (resolver tier 3), and
 * Stripe Tax derives the destination from the attached Customer's shipping address. The address
 * stays locked because `shipping_address_collection` remains omitted either way.
 */
export function shouldPinPaymentIntentShipping(opts: {
  lockShippingAddress: boolean;
  hasShippingAddress: boolean;
  autoTaxEnabled: boolean;
}): boolean {
  return (
    opts.lockShippingAddress && opts.hasShippingAddress && !opts.autoTaxEnabled
  );
}
