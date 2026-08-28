import type { NextRequest } from "next/server";
import type Stripe from "stripe";

import { POST } from "~/app/api/webhooks/stripe/route";

/**
 * Harness for driving the real Stripe webhook route handler
 * (`src/app/api/webhooks/stripe/route.ts`) from an integration test.
 *
 * The route verifies the signature through `stripeClient.webhooks.constructEvent`
 * and re-reads the session through `stripeClient.checkout.sessions.retrieve`, so
 * every test using this harness must mock `~/lib/stripe/client` itself (vi.mock
 * is hoisted per test file and cannot live here). The typical setup is:
 *
 * ```ts
 * const stripeMocks = vi.hoisted(() => ({
 *   constructEvent: vi.fn(),
 *   sessionsRetrieve: vi.fn(),
 * }));
 * vi.mock("~/lib/stripe/client", () => ({
 *   stripeClient: {
 *     webhooks: { constructEvent: (...a: unknown[]) => stripeMocks.constructEvent(...a) },
 *     checkout: { sessions: { retrieve: (...a: unknown[]) => stripeMocks.sessionsRetrieve(...a) } },
 *   },
 * }));
 * ```
 *
 * The body posted here is the raw JSON of the event, exactly as Stripe sends it;
 * `constructEvent` is mocked, so the signature header only needs to be present.
 */
export async function postWebhookEvent(
  event: Stripe.Event,
  opts: { signature?: string | null; url?: string } = {},
): Promise<Response> {
  const headers = new Headers({ "content-type": "application/json" });
  const signature =
    opts.signature === undefined ? "t=1,v1=testsig" : opts.signature;
  if (signature !== null) headers.set("stripe-signature", signature);

  const req = new Request(
    opts.url ?? "https://simplepress.test/api/webhooks/stripe",
    {
      method: "POST",
      headers,
      body: JSON.stringify(event),
    },
  );

  return POST(req as unknown as NextRequest);
}

/* ------------------------------------------------------------------ *
 * Fixture builders — minimal but realistically shaped Stripe objects.
 * Only the fields the route + `create-order.ts` actually read are
 * populated; everything else is omitted and the object is cast.
 * ------------------------------------------------------------------ */

export type LineItemFixture = {
  /** Becomes `OrderItem.productName` (route reads `item.description`). */
  description?: string;
  quantity?: number;
  unitAmount?: number;
  amountTotal?: number;
  /** Product metadata — the only place the route learns our own ids. */
  productId?: string;
  productVariantId?: string;
  variantName?: string;
  sku?: string;
};

export type AddressFixture = {
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
};

export type CheckoutSessionFixtureOpts = {
  id?: string;
  mode?: "payment" | "subscription" | "setup";
  metadata?: Record<string, string>;
  customerEmail?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  paymentStatus?: "paid" | "unpaid" | "no_payment_required";
  paymentIntentId?: string | null;
  amountSubtotal?: number;
  amountTotal?: number;
  amountTax?: number;
  amountShipping?: number;
  amountDiscount?: number;
  lineItems?: LineItemFixture[];
  /** Rendered as `collected_information.shipping_details` on the full session. */
  shippingAddress?: AddressFixture | null;
  shippingName?: string | null;
};

export type CheckoutSessionFixture = {
  /** The (unexpanded) session as it arrives on the event. */
  session: Stripe.Checkout.Session;
  /** What `checkout.sessions.retrieve` should resolve to. */
  fullSession: Stripe.Checkout.Session;
};

/**
 * Builds the pair of session objects the webhook works with: the unexpanded one
 * carried on the event, and the expanded one returned by
 * `checkout.sessions.retrieve` (line items, total details, shipping).
 */
export function makeCheckoutSession(
  opts: CheckoutSessionFixtureOpts = {},
): CheckoutSessionFixture {
  const id = opts.id ?? `cs_test_${Math.random().toString(36).slice(2, 12)}`;
  const amountSubtotal = opts.amountSubtotal ?? 1000;
  const amountTax = opts.amountTax ?? 0;
  const amountShipping = opts.amountShipping ?? 0;
  const amountDiscount = opts.amountDiscount ?? 0;
  const amountTotal =
    opts.amountTotal ??
    amountSubtotal - amountDiscount + amountShipping + amountTax;

  const customerDetails = {
    name: opts.customerName ?? "Jane Doe",
    email: opts.customerEmail ?? "jane@shopper.test",
    phone: opts.customerPhone ?? "+15555550123",
    address: null,
    tax_ids: null,
    tax_exempt: "none",
  };

  const totalDetails = {
    amount_discount: amountDiscount,
    amount_shipping: amountShipping,
    amount_tax: amountTax,
    breakdown: null,
  };

  const base = {
    id,
    object: "checkout.session",
    mode: opts.mode ?? "payment",
    metadata: opts.metadata ?? {},
    customer_email: null,
    customer_details: customerDetails,
    amount_subtotal: amountSubtotal,
    amount_total: amountTotal,
    payment_status: opts.paymentStatus ?? "paid",
    payment_intent:
      opts.paymentIntentId === undefined
        ? `pi_test_${Math.random().toString(36).slice(2, 10)}`
        : opts.paymentIntentId,
    total_details: totalDetails,
    currency: "usd",
  };

  const lineItems = (opts.lineItems ?? []).map((li, i) => ({
    id: `li_${i}`,
    object: "item",
    description: li.description ?? "Test Product",
    quantity: li.quantity ?? 1,
    amount_total:
      li.amountTotal ?? (li.unitAmount ?? 1000) * (li.quantity ?? 1),
    price: {
      id: `price_${i}`,
      object: "price",
      unit_amount: li.unitAmount ?? 1000,
      product: {
        id: `prod_stripe_${i}`,
        object: "product",
        metadata: {
          ...(li.productId ? { productId: li.productId } : {}),
          ...(li.productVariantId
            ? { productVariantId: li.productVariantId }
            : {}),
          ...(li.variantName ? { variantName: li.variantName } : {}),
          ...(li.sku ? { sku: li.sku } : {}),
        },
      },
    },
  }));

  const full = {
    ...base,
    line_items: {
      object: "list",
      data: lineItems,
      has_more: false,
      url: "",
    },
    ...(opts.shippingAddress
      ? {
          collected_information: {
            shipping_details: {
              name: opts.shippingName ?? customerDetails.name,
              address: {
                line1: opts.shippingAddress.line1,
                line2: opts.shippingAddress.line2 ?? null,
                city: opts.shippingAddress.city,
                state: opts.shippingAddress.state,
                postal_code: opts.shippingAddress.postal_code,
                country: opts.shippingAddress.country,
              },
            },
          },
        }
      : {}),
  };

  return {
    session: base as unknown as Stripe.Checkout.Session,
    fullSession: full as unknown as Stripe.Checkout.Session,
  };
}

/** Wraps any object in a Stripe event envelope (with the Connect `account`). */
export function makeEvent(opts: {
  type: string;
  object: unknown;
  account?: string | null;
  id?: string;
}): Stripe.Event {
  return {
    id: opts.id ?? `evt_test_${Math.random().toString(36).slice(2, 12)}`,
    object: "event",
    api_version: "2026-01-28.clover",
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    pending_webhooks: 0,
    request: { id: null, idempotency_key: null },
    type: opts.type,
    ...(opts.account ? { account: opts.account } : {}),
    data: { object: opts.object },
  } as unknown as Stripe.Event;
}

export function makeCheckoutCompletedEvent(
  session: Stripe.Checkout.Session,
  account: string | null,
): Stripe.Event {
  return makeEvent({
    type: "checkout.session.completed",
    object: session,
    account,
  });
}

export function makeCheckoutExpiredEvent(
  session: Stripe.Checkout.Session,
  account: string | null,
): Stripe.Event {
  return makeEvent({
    type: "checkout.session.expired",
    object: session,
    account,
  });
}
