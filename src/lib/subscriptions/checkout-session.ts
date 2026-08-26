import type Stripe from "stripe";

import type {
  SubscriptionIntervalKey,
  SubscriptionStripeInterval,
} from "./intervals";
import { stripeClient } from "~/lib/stripe/client";
import { formatCurrency } from "~/lib/utils";

import { getInterval } from "./intervals";

/**
 * Builder for the `mode: "subscription"` Stripe Checkout Session.
 *
 * Split in two on purpose: `buildSubscriptionCheckoutParams` is pure (so the
 * exact parameter object can be pinned by a unit test — this is a money
 * surface and a silent shape change here is a silent pricing change), and
 * `createSubscriptionCheckoutSession` is the thin I/O wrapper that hands
 * those params to Stripe **on the connected account**.
 *
 * The keys this builder deliberately never emits, and why:
 *
 *  - `shipping_options` — payment-mode only. Subscription shipping is billed
 *    as a second recurring line item ("Shipping (per delivery)") on the same
 *    cadence as the product.
 *  - `customer_creation` — Stripe rejects it outright in subscription mode.
 *  - `customer_update` — omitting it leaves every sub-field defaulted to
 *    `"never"`, which is what preserves the Customer `shipping`/`address` the
 *    route set server-side. That address is the one shipping was priced
 *    against; letting Checkout overwrite it would let a shopper pay a nearby
 *    zone's rate and ship across the country.
 *  - `shipping_address_collection` — same reason: the destination is frozen
 *    at signup.
 *  - `expires_at`, `discounts`, `payment_intent_data`, `customer_email` —
 *    one-time-checkout concerns that are meaningless or rejected here. The
 *    subscribe-and-save discount is already baked into `unitAmountCents`, so
 *    there is no coupon to attach; passing `customer` prefills and locks the
 *    email, so `customer_email` would conflict with it.
 */

/** Stripe's tax code for shipping/delivery. Only sent when the store has auto-tax on. */
const SHIPPING_TAX_CODE = "txcd_92010001";

/** Display name of the recurring shipping line item. */
const SHIPPING_LINE_NAME = "Shipping (per delivery)";

/** The subscription snapshot the builder reads — a structural subset of the `Subscription` row. */
export interface SubscriptionCheckoutSnapshot {
  /** `Subscription.id` — stamped into metadata so the webhook can find the row. */
  id: string;
  productId: string;
  productVariantId: string | null;
  productName: string;
  variantName: string | null;
  sku: string | null;
  quantity: number;
  intervalKey: SubscriptionIntervalKey;
  interval: SubscriptionStripeInterval;
  intervalCount: number;
  /** Locked per-unit price in cents, discount already applied. Never recomputed here. */
  unitAmountCents: number;
  /** Frozen per-delivery shipping in cents (0 for pickup or free shipping). */
  shippingCents: number;
  deliveryMethod: "ship" | "pickup";
}

export interface SubscriptionCheckoutParamsInput {
  business: {
    id: string;
    stripeAccountId: string;
    stripeAutoTaxEnabled: boolean;
  };
  /** Storefront origin, no trailing slash (e.g. `https://shop.example.com`). */
  baseUrl: string;
  /** Product slug, used to rebuild the `/subscribe` form when the shopper backs out. */
  productSlug: string;
  /** Absolute product image URL, or null. Anything not `http(s)` is dropped — Stripe rejects it. */
  imageUrl: string | null;
  /** Stripe Customer id on the CONNECTED account. Prefills and locks the email. */
  stripeCustomerId: string;
  subscription: SubscriptionCheckoutSnapshot;
}

/**
 * "every month", "every 2 weeks" — the catalog label, lower-cased, used in
 * both the subscription description and the Checkout submit message so the
 * two can never disagree. Falls back to a derived phrase if the key is ever
 * outside the catalog (it cannot be today: the key is zod-validated against
 * the catalog before it reaches the DB).
 */
function cadencePhrase(snapshot: SubscriptionCheckoutSnapshot): string {
  const entry = getInterval(snapshot.intervalKey);
  if (entry) return entry.label.toLowerCase();
  return snapshot.intervalCount === 1
    ? `every ${snapshot.interval}`
    : `every ${snapshot.intervalCount} ${snapshot.interval}s`;
}

/** Stripe rejects relative paths and data URIs ("Not a valid URL"). Parity with the one-time route. */
function isForwardableImage(url: string | null): url is string {
  return !!url && /^https?:\/\//.test(url);
}

/**
 * Build the complete `checkout.sessions.create` parameter object for a
 * subscription signup. Pure: no I/O, no clock, no mutation of the input.
 */
export function buildSubscriptionCheckoutParams(
  input: SubscriptionCheckoutParamsInput,
): Stripe.Checkout.SessionCreateParams {
  const { business, productSlug, imageUrl, stripeCustomerId } = input;
  const sub = input.subscription;
  const baseUrl = input.baseUrl.replace(/\/+$/, "");

  const recurring: Stripe.Checkout.SessionCreateParams.LineItem.PriceData.Recurring =
    { interval: sub.interval, interval_count: sub.intervalCount };

  // Shipping is a line item, so it only exists when there is shipping to bill:
  // pickup never ships, and a $0 quote (free shipping, threshold met) would be
  // a $0 recurring price, which Stripe has no reason to carry.
  const billsShipping = sub.deliveryMethod === "ship" && sub.shippingCents > 0;

  const productLine: Stripe.Checkout.SessionCreateParams.LineItem = {
    price_data: {
      currency: "usd",
      unit_amount: sub.unitAmountCents,
      recurring,
      product_data: {
        name: sub.productName,
        // Absent, not `undefined`: Stripe's form encoder and our own tests
        // both treat a present-but-undefined key differently from an absent one.
        ...(sub.variantName ? { description: sub.variantName } : {}),
        ...(isForwardableImage(imageUrl) ? { images: [imageUrl] } : {}),
        // Stripe metadata is string-only — an empty string is how "no variant"
        // round-trips back through the webhook.
        metadata: {
          productId: sub.productId,
          productVariantId: sub.productVariantId ?? "",
          variantName: sub.variantName ?? "",
          sku: sub.sku ?? "",
          kind: "product",
        },
      },
    },
    quantity: sub.quantity,
  };

  const shippingLine: Stripe.Checkout.SessionCreateParams.LineItem = {
    price_data: {
      currency: "usd",
      unit_amount: sub.shippingCents,
      // Same cadence as the product: one shipping charge per delivery.
      recurring,
      product_data: {
        name: SHIPPING_LINE_NAME,
        metadata: { kind: "shipping" },
        // Only meaningful with automatic tax on; without it Stripe has no tax
        // engine to hand the code to. The product line carries no code — the
        // store's own product tax settings / account default govern it.
        ...(business.stripeAutoTaxEnabled
          ? { tax_code: SHIPPING_TAX_CODE }
          : {}),
      },
    },
    // Once per delivery regardless of item quantity: quantity is already
    // priced into `shippingCents` via total weight.
    quantity: 1,
  };

  const cadence = cadencePhrase(sub);
  const perDeliveryCents =
    sub.unitAmountCents * sub.quantity +
    (billsShipping ? sub.shippingCents : 0);

  const cancelParams = new URLSearchParams({
    product: productSlug,
    variant: sub.productVariantId ?? "",
    interval: sub.intervalKey,
    qty: String(sub.quantity),
  });

  return {
    mode: "subscription",
    customer: stripeCustomerId,
    line_items: billsShipping ? [productLine, shippingLine] : [productLine],
    subscription_data: {
      description: `${sub.productName}${
        sub.variantName ? ` — ${sub.variantName}` : ""
      } × ${sub.quantity}, ${cadence}`,
      // Snapshotted onto every invoice event by Stripe
      // (`invoice.parent.subscription_details.metadata`), which is how the
      // webhook resolves the tenant for a renewal months from now.
      metadata: {
        businessId: business.id,
        subscriptionId: sub.id,
        productId: sub.productId,
        variantId: sub.productVariantId ?? "",
        intervalKey: sub.intervalKey,
        quantity: String(sub.quantity),
        deliveryMethod: sub.deliveryMethod,
      },
    },
    metadata: {
      businessId: business.id,
      subscriptionId: sub.id,
      kind: "subscription",
    },
    success_url: `${baseUrl}/subscribe/success?session_id={CHECKOUT_SESSION_ID}`,
    // Back to the same form, pre-filled with the same choices.
    cancel_url: `${baseUrl}/subscribe?${cancelParams.toString()}`,
    submit_type: "subscribe",
    custom_text: {
      submit: {
        message: `You'll be charged ${formatCurrency(
          perDeliveryCents,
        )} ${cadence} until you cancel. Cancel anytime from the link in your emails.`,
      },
    },
    payment_method_collection: "always",
    ...(business.stripeAutoTaxEnabled
      ? { automatic_tax: { enabled: true } }
      : {}),
  };
}

/**
 * Create the Checkout Session on the store's connected account.
 *
 * Passes exactly what the pure builder produced — nothing is bolted on at the
 * call site, which is the only way the builder's unit test can stay a true
 * description of what Stripe receives. Rejections propagate: the route deletes
 * its `incomplete` row and 500s rather than stranding a subscription that
 * never reached Stripe.
 */
export async function createSubscriptionCheckoutSession(
  input: SubscriptionCheckoutParamsInput,
): Promise<Stripe.Checkout.Session> {
  return stripeClient.checkout.sessions.create(
    buildSubscriptionCheckoutParams(input),
    { stripeAccount: input.business.stripeAccountId },
  );
}
