import type Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { db, resetDb } from "../helpers/db";
import { createBusiness, createProduct } from "../helpers/factories";
import {
  makeCheckoutCompletedEvent,
  makeCheckoutExpiredEvent,
  makeCheckoutSession,
  makeEvent,
  postWebhookEvent,
} from "../helpers/stripe-webhook";

/**
 * §12 NEGATIVE TEST + DISPATCH PROOF — drives the REAL webhook route
 * (`src/app/api/webhooks/stripe/route.ts`) and asserts that:
 *
 *   1. a `mode: "subscription"` session NEVER enters the one-time payment path
 *      (no `checkout.sessions.retrieve`, no Order, no abandoned-cart email) —
 *      it is short-circuited by the two guard lines the plan allows in §4;
 *   2. the new `invoice.paid` branch is actually wired into the route;
 *   3. a `mode: "payment"` session still behaves exactly as before.
 *
 * Point 3 is the whole reason this file exists as a ROUTE-level test rather
 * than a handler-level one: the guard lines are the only edit ever made to a
 * live payment path, and nothing short of posting a real event through the
 * real route proves they landed in the right place.
 *
 * Until Phase 3a wires the route, tests 1–3 fail on ASSERTIONS (not module
 * resolution) — this file imports nothing that does not exist yet, by design.
 */

const stripeMocks = vi.hoisted(() => ({
  constructEvent: vi.fn(),
  sessionsRetrieve: vi.fn(),
  subscriptionsRetrieve: vi.fn(),
  invoicesRetrieve: vi.fn(),
}));
vi.mock("~/lib/stripe/client", () => ({
  stripeClient: {
    webhooks: {
      constructEvent: (...args: unknown[]): unknown =>
        stripeMocks.constructEvent(...args),
    },
    checkout: {
      sessions: {
        retrieve: (...args: unknown[]): unknown =>
          stripeMocks.sessionsRetrieve(...args),
      },
    },
    subscriptions: {
      retrieve: (...args: unknown[]): unknown =>
        stripeMocks.subscriptionsRetrieve(...args),
    },
    invoices: {
      retrieve: (...args: unknown[]): unknown =>
        stripeMocks.invoicesRetrieve(...args),
    },
  },
}));

const emailMocks = vi.hoisted(() => ({ sendEmail: vi.fn() }));
vi.mock("~/lib/email/send", () => ({
  sendEmail: (...args: unknown[]): unknown => emailMocks.sendEmail(...args),
  EMAIL_FROM: {
    NOREPLY: "noreply@test.dev",
    ORDERS: "orders@test.dev",
    SUPPORT: "support@test.dev",
  },
}));

const ACCOUNT_ID = "acct_test_dispatch";

const PERIOD_START = Math.floor(
  new Date("2026-08-01T00:00:00.000Z").getTime() / 1000,
);
const PERIOD_END = Math.floor(
  new Date("2026-09-01T00:00:00.000Z").getTime() / 1000,
);

type EmailCall = { tags?: Array<{ name: string; value: string }> };

function emailCategories(): string[] {
  return emailMocks.sendEmail.mock.calls.map((call) => {
    const opts = call[0] as EmailCall;
    return opts.tags?.find((t) => t.name === "category")?.value ?? "untagged";
  });
}

async function setupStore() {
  const created = await createBusiness({ subdomain: "dispatch-biz" });
  await db.business.update({
    where: { id: created.id },
    data: {
      stripeAccountId: ACCOUNT_ID,
      // Deliberately opted IN, so "no abandoned-cart email" below is a real
      // assertion about the subscription guard, not about the store setting.
      sendAbandonedCheckoutEmails: true,
    },
  });
  return db.business.findUniqueOrThrow({ where: { id: created.id } });
}

type Store = Awaited<ReturnType<typeof setupStore>>;

async function createSubscriptionRow(
  store: Store,
  opts: {
    productId?: string | null;
    status?: string;
    stripeSubscriptionId?: string | null;
    quantity?: number;
  } = {},
) {
  return db.subscription.create({
    data: {
      businessId: store.id,
      customerEmail: "ada@shopper.test",
      customerName: "Ada Lovelace",
      productId: opts.productId ?? null,
      productName: "Twelve-Pack",
      quantity: opts.quantity ?? 2,
      intervalKey: "month:1",
      interval: "month",
      intervalCount: 1,
      listPriceCents: 2400,
      discountPercent: 10,
      unitAmountCents: 2160,
      shippingCents: 0,
      deliveryMethod: "pickup",
      status: opts.status ?? "incomplete",
      stripeSubscriptionId:
        opts.stripeSubscriptionId === undefined
          ? null
          : opts.stripeSubscriptionId,
      stripeCustomerId: "cus_test_1",
    },
  });
}

function makeStripeSubscription(id = "sub_live_1"): Stripe.Subscription {
  return {
    id,
    object: "subscription",
    customer: "cus_test_1",
    status: "active",
    pause_collection: null,
    metadata: {},
    cancel_at_period_end: false,
    canceled_at: null,
    currency: "usd",
    items: {
      object: "list",
      has_more: false,
      url: "",
      data: [
        {
          id: "si_test_1",
          object: "subscription_item",
          current_period_start: PERIOD_START,
          current_period_end: PERIOD_END,
          quantity: 2,
        },
      ],
    },
  } as unknown as Stripe.Subscription;
}

function makeStripeInvoice(opts: {
  id: string;
  metadata: Record<string, string>;
  withPayments?: boolean;
}): Stripe.Invoice {
  return {
    id: opts.id,
    object: "invoice",
    currency: "usd",
    status: "paid",
    created: Math.floor(new Date("2026-09-01T12:00:00.000Z").getTime() / 1000),
    number: "SP-0001",
    hosted_invoice_url: "https://invoice.stripe.test/x",
    attempt_count: 1,
    subtotal: 4320,
    total: 4320,
    amount_due: 4320,
    amount_paid: 4320,
    amount_remaining: 0,
    total_taxes: [],
    parent: {
      type: "subscription_details",
      subscription_details: {
        subscription: "sub_live_1",
        metadata: opts.metadata,
      },
    },
    ...(opts.withPayments === false
      ? {}
      : {
          payments: {
            object: "list",
            has_more: false,
            url: "",
            data: [
              {
                id: "inpay_test_1",
                object: "invoice_payment",
                payment: {
                  type: "payment_intent",
                  payment_intent: "pi_test_inv_1",
                },
              },
            ],
          },
        }),
  } as unknown as Stripe.Invoice;
}

/** The full `subscription_data.metadata` snapshot Stripe copies onto invoices. */
function subMetadata(
  store: Store,
  rowId: string,
  productId: string,
): Record<string, string> {
  return {
    businessId: store.id,
    subscriptionId: rowId,
    productId,
    variantId: "",
    intervalKey: "month:1",
    quantity: "2",
    deliveryMethod: "pickup",
  };
}

describe("stripe webhook route — subscription dispatch", () => {
  beforeEach(async () => {
    await resetDb();
    stripeMocks.constructEvent.mockReset();
    stripeMocks.sessionsRetrieve.mockReset();
    stripeMocks.subscriptionsRetrieve.mockReset();
    stripeMocks.invoicesRetrieve.mockReset();
    emailMocks.sendEmail.mockReset();
    emailMocks.sendEmail.mockResolvedValue({ success: true, id: "test" });
  });

  it("never runs the one-time path for a mode:'subscription' checkout.session.completed", async () => {
    const store = await setupStore();
    const row = await createSubscriptionRow(store, { status: "incomplete" });

    const { session, fullSession } = makeCheckoutSession({
      id: "cs_test_submode_1",
      mode: "subscription",
      metadata: {
        businessId: store.id,
        subscriptionId: row.id,
        kind: "subscription",
      },
      customerEmail: "ada@shopper.test",
      amountSubtotal: 4320,
      amountTotal: 4320,
    });
    const subSession = {
      ...session,
      subscription: "sub_live_1",
      customer: "cus_test_1",
    } as unknown as Stripe.Checkout.Session;

    const event = makeCheckoutCompletedEvent(subSession, ACCOUNT_ID);
    stripeMocks.constructEvent.mockReturnValue(event);
    stripeMocks.sessionsRetrieve.mockResolvedValue(fullSession);
    stripeMocks.subscriptionsRetrieve.mockResolvedValue(
      makeStripeSubscription(),
    );

    const res = await postWebhookEvent(event);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });

    // The FIRST Stripe call of the one-time path. If this fired, the guard
    // line is missing or in the wrong place.
    expect(stripeMocks.sessionsRetrieve).not.toHaveBeenCalled();
    expect(await db.order.count()).toBe(0);

    // …and the subscription lane did run.
    const after = await db.subscription.findUniqueOrThrow({
      where: { id: row.id },
    });
    expect(after.stripeSubscriptionId).toBe("sub_live_1");
    expect(after.status).toBe("active");
  });

  it("never sends the abandoned-checkout email for a mode:'subscription' checkout.session.expired", async () => {
    const store = await setupStore();
    const row = await createSubscriptionRow(store, { status: "incomplete" });

    const { session } = makeCheckoutSession({
      id: "cs_test_submode_expired",
      mode: "subscription",
      metadata: {
        businessId: store.id,
        subscriptionId: row.id,
        kind: "subscription",
      },
      customerEmail: "ada@shopper.test",
    });

    const event = makeCheckoutExpiredEvent(session, ACCOUNT_ID);
    stripeMocks.constructEvent.mockReturnValue(event);

    const res = await postWebhookEvent(event);
    expect(res.status).toBe(200);

    expect(emailCategories()).not.toContain("abandoned_checkout");
    expect(emailMocks.sendEmail).not.toHaveBeenCalled();

    // The stillborn `incomplete` row is cleaned up rather than left to rot in
    // the owner's subscription list.
    expect(
      await db.subscription.findUnique({ where: { id: row.id } }),
    ).toBeNull();
  });

  it("creates an Order from an invoice.paid posted through the route", async () => {
    const store = await setupStore();
    const product = await createProduct(store.id, {
      name: "Twelve-Pack",
      price: 2400,
      inventoryQty: 40,
    });
    const row = await createSubscriptionRow(store, {
      productId: product.id,
      status: "active",
      stripeSubscriptionId: "sub_live_1",
    });

    const metadata = subMetadata(store, row.id, product.id);
    const eventInvoice = makeStripeInvoice({
      id: "in_test_route_1",
      metadata,
      withPayments: false,
    });
    stripeMocks.invoicesRetrieve.mockResolvedValue(
      makeStripeInvoice({ id: "in_test_route_1", metadata }),
    );
    stripeMocks.subscriptionsRetrieve.mockResolvedValue(
      makeStripeSubscription(),
    );

    const event = makeEvent({
      type: "invoice.paid",
      object: eventInvoice,
      account: ACCOUNT_ID,
    });
    stripeMocks.constructEvent.mockReturnValue(event);

    const res = await postWebhookEvent(event);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });

    const orders = await db.order.findMany({
      where: { businessId: store.id },
      include: { items: true },
    });
    expect(orders).toHaveLength(1);
    expect(orders[0]!.stripeInvoiceId).toBe("in_test_route_1");
    expect(orders[0]!.stripeSessionId).toBeNull();
    expect(orders[0]!.subscriptionId).toBe(row.id);
    expect(orders[0]!.items).toHaveLength(1);

    const after = await db.subscription.findUniqueOrThrow({
      where: { id: row.id },
    });
    expect(after.lastInvoiceId).toBe("in_test_route_1");
  });

  it("still creates the order for a mode:'payment' checkout.session.completed", async () => {
    const store = await setupStore();
    const product = await createProduct(store.id, {
      name: "Cotton Tee",
      price: 1500,
      inventoryQty: 10,
    });

    const { session, fullSession } = makeCheckoutSession({
      id: "cs_test_paymode_1",
      mode: "payment",
      metadata: { businessId: store.id, deliveryMethod: "ship" },
      customerEmail: "jane@shopper.test",
      paymentIntentId: "pi_test_paymode_1",
      amountSubtotal: 3000,
      amountTotal: 3000,
      lineItems: [
        {
          description: "Cotton Tee",
          quantity: 2,
          unitAmount: 1500,
          amountTotal: 3000,
          productId: product.id,
        },
      ],
    });

    const event = makeCheckoutCompletedEvent(session, ACCOUNT_ID);
    stripeMocks.constructEvent.mockReturnValue(event);
    stripeMocks.sessionsRetrieve.mockResolvedValue(fullSession);

    const res = await postWebhookEvent(event);
    expect(res.status).toBe(200);

    expect(stripeMocks.sessionsRetrieve).toHaveBeenCalledTimes(1);
    const orders = await db.order.findMany({
      where: { businessId: store.id },
      include: { items: true },
    });
    expect(orders).toHaveLength(1);
    expect(orders[0]!.stripeSessionId).toBe("cs_test_paymode_1");
    expect(orders[0]!.stripeInvoiceId).toBeNull();
    expect(orders[0]!.subscriptionId).toBeNull();
    expect(orders[0]!.total).toBe(3000);
    const productAfter = await db.product.findUniqueOrThrow({
      where: { id: product.id },
    });
    expect(productAfter.inventoryQty).toBe(8);
  });
});
