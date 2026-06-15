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
 * Prefer shipping collected on Checkout; fall back to PaymentIntent shipping or
 * session metadata (the storefront's pre-filled address). Pure resolver over a
 * Stripe Checkout Session — extracted from the webhook so it can be unit-tested.
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
      phone: pi.shipping.phone ?? null,
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
