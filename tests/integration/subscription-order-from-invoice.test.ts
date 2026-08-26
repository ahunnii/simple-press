import type Stripe from "stripe";
import { Prisma } from "generated/prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DbClient } from "~/server/db";
import {
  deductInventoryForOrderItems,
  sendLowInventoryAlerts,
} from "~/lib/inventory/order-deduction";
import {
  createOrderFromSubscriptionInvoice,
  processPaidInvoice,
} from "~/lib/subscriptions/order-from-invoice";

import { db, resetDb } from "../helpers/db";
import {
  createBaseInventoryUnit,
  createBusiness,
  createCustomer,
  createOrder,
  createProduct,
  createVariant,
} from "../helpers/factories";

/**
 * RED spec for the two modules that turn a PAID Stripe subscription invoice
 * into a normal SimplePress Order:
 *
 *   - `src/lib/subscriptions/order-from-invoice.ts`
 *   - `src/lib/inventory/order-deduction.ts`
 *
 * Both are FRESH code that MIRRORS the existing one-time webhook path
 * (`src/app/api/webhooks/stripe/route.ts`, inventory block ~392–736, low-stock
 * alerts ~738–870). The webhook's own inline copy is NOT changed by this work
 * — `tests/integration/stripe-webhook-one-time.test.ts` is the proof of that.
 * Where this spec and the plan's prose disagree, the WEBHOOK'S ACTUAL CODE
 * wins; every such call is flagged in a comment.
 *
 * Everything that would do network I/O is mocked: Stripe (order creation from
 * an invoice must make NO Stripe calls at all — that is asserted), the single
 * `sendEmail` chokepoint, and Sentry (so tag assertions are possible).
 */

/* ------------------------------------------------------------------ *
 * Mocks
 * ------------------------------------------------------------------ */

// Stripe: creating an order from an already-retrieved invoice must never call
// Stripe. Every method here is a spy that fails the intent of the test if hit.
const stripeMocks = vi.hoisted(() => ({
  sessionsRetrieve: vi.fn(),
  subscriptionsRetrieve: vi.fn(),
  invoicesRetrieve: vi.fn(),
  constructEvent: vi.fn(),
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

// Email: mocked at `sendEmail`, not at `templates.ts`, so the real template
// helpers still run and the Resend `category` tag each one attaches can be
// asserted — same convention as stripe-webhook-one-time.test.ts.
const emailMocks = vi.hoisted(() => ({ sendEmail: vi.fn() }));
vi.mock("~/lib/email/send", () => ({
  sendEmail: (...args: unknown[]): unknown => emailMocks.sendEmail(...args),
  EMAIL_FROM: {
    NOREPLY: "noreply@test.dev",
    ORDERS: "orders@test.dev",
    SUPPORT: "support@test.dev",
  },
}));

/**
 * Sentry: records every capture with the tags in force, whether they were
 * passed inline (`captureMessage(msg, { tags })`) or set on a scope
 * (`withScope((s) => { s.setTag(...); captureMessage(...) })`). Both spellings
 * are used across this codebase, so the assertions must not care which the
 * implementer picks.
 */
const sentryMocks = vi.hoisted(() => {
  type Tags = Record<string, string | undefined>;
  const scopeStack: Tags[] = [];
  const events: Array<{
    kind: "message" | "exception";
    payload: unknown;
    tags: Tags;
  }> = [];

  const mergedTags = (inline?: Tags): Tags =>
    Object.assign({}, ...scopeStack, inline ?? {}) as Tags;

  const readTags = (ctx: unknown): Tags | undefined =>
    (ctx as { tags?: Tags } | undefined)?.tags;

  const captureMessage = vi.fn((message: unknown, ctx?: unknown) => {
    events.push({
      kind: "message",
      payload: message,
      tags: mergedTags(readTags(ctx)),
    });
    return "evt_test";
  });
  const captureException = vi.fn((error: unknown, ctx?: unknown) => {
    events.push({
      kind: "exception",
      payload: error,
      tags: mergedTags(readTags(ctx)),
    });
    return "evt_test";
  });
  const withScope = vi.fn((cb: (scope: unknown) => unknown) => {
    const tags: Tags = {};
    scopeStack.push(tags);
    try {
      return cb({
        setTag: (key: string, value: string) => {
          tags[key] = value;
        },
        setExtra: () => undefined,
        setExtras: () => undefined,
        setContext: () => undefined,
        setLevel: () => undefined,
        setUser: () => undefined,
        setTags: (next: Tags) => Object.assign(tags, next),
      });
    } finally {
      scopeStack.pop();
    }
  });

  return {
    events,
    captureMessage,
    captureException,
    withScope,
    reset: () => {
      events.length = 0;
      scopeStack.length = 0;
      captureMessage.mockClear();
      captureException.mockClear();
      withScope.mockClear();
    },
  };
});
vi.mock("@sentry/nextjs", () => ({
  captureMessage: sentryMocks.captureMessage,
  captureException: sentryMocks.captureException,
  withScope: sentryMocks.withScope,
  addBreadcrumb: vi.fn(),
  captureCheckIn: vi.fn(),
  setTag: vi.fn(),
  setContext: vi.fn(),
  setExtra: vi.fn(),
  flush: vi.fn(async () => true),
}));

/** Every Sentry capture whose effective tags include `name: value`. */
function sentryEventsTagged(name: string, value: string) {
  return sentryMocks.events.filter((event) => event.tags[name] === value);
}

/* ------------------------------------------------------------------ *
 * Email assertion helpers (same shape as the one-time characterization test)
 * ------------------------------------------------------------------ */

type EmailCall = {
  to: string | string[];
  tags?: Array<{ name: string; value: string }>;
  idempotencyKey?: string;
};

function emailCalls(): EmailCall[] {
  return emailMocks.sendEmail.mock.calls.map((call) => call[0] as EmailCall);
}

function emailCategories(): string[] {
  return emailCalls().map(
    (opts) =>
      opts.tags?.find((t) => t.name === "category")?.value ?? "untagged",
  );
}

function emailWithCategory(category: string): EmailCall | undefined {
  return emailCalls().find((opts) =>
    opts.tags?.some((t) => t.name === "category" && t.value === category),
  );
}

/* ------------------------------------------------------------------ *
 * Fixtures
 * ------------------------------------------------------------------ */

const ACCOUNT_ID = "acct_test_subs";

/** The business shape `order-from-invoice` needs: identity + email chrome + pickup copy. */
async function setupStore() {
  const created = await createBusiness({ subdomain: "subs-biz" });
  await db.business.update({
    where: { id: created.id },
    data: { stripeAccountId: ACCOUNT_ID },
  });
  return db.business.findUniqueOrThrow({
    where: { id: created.id },
    include: { siteContent: { select: { logoUrl: true } } },
  });
}

type Store = Awaited<ReturnType<typeof setupStore>>;

type SubscriptionFixtureOpts = {
  customerId?: string | null;
  customerEmail?: string;
  customerName?: string | null;
  customerPhone?: string | null;
  productId?: string | null;
  productVariantId?: string | null;
  productName?: string;
  variantName?: string | null;
  sku?: string | null;
  quantity?: number;
  listPriceCents?: number;
  discountPercent?: number;
  unitAmountCents?: number;
  shippingCents?: number;
  deliveryMethod?: "ship" | "pickup";
  shippingAddressId?: string | null;
  /** Encrypted ship* snapshot. Pass `null` to leave the whole snapshot empty. */
  shipSnapshot?: {
    firstName: string;
    lastName: string;
    address1: string;
    address2?: string | null;
    city: string;
    province: string;
    zip: string;
    country: string;
  } | null;
  status?: string;
  stripeSubscriptionId?: string | null;
  stripeCustomerId?: string | null;
  termsAcceptedAt?: Date | null;
  termsVersion?: string | null;
  merchantTermsUpdatedAt?: Date | null;
};

const DEFAULT_SHIP_SNAPSHOT = {
  firstName: "Ada",
  lastName: "Lovelace",
  address1: "12 Analytical Way",
  address2: "Suite 1843",
  city: "Detroit",
  province: "MI",
  zip: "48201",
  country: "US",
};

async function createSubscriptionRow(
  store: Store,
  opts: SubscriptionFixtureOpts = {},
) {
  const ship =
    opts.shipSnapshot === undefined ? DEFAULT_SHIP_SNAPSHOT : opts.shipSnapshot;

  return db.subscription.create({
    data: {
      businessId: store.id,
      customerId: opts.customerId ?? null,
      customerEmail: opts.customerEmail ?? "ada@shopper.test",
      customerName:
        opts.customerName === undefined ? "Ada Lovelace" : opts.customerName,
      customerPhone:
        opts.customerPhone === undefined ? "+15555550188" : opts.customerPhone,

      stripeSubscriptionId: opts.stripeSubscriptionId ?? "sub_test_1",
      stripeCustomerId: opts.stripeCustomerId ?? "cus_test_1",

      productId: opts.productId ?? null,
      productVariantId: opts.productVariantId ?? null,
      productName: opts.productName ?? "Twelve-Pack",
      variantName: opts.variantName ?? null,
      sku: opts.sku ?? null,
      quantity: opts.quantity ?? 1,

      intervalKey: "month:1",
      interval: "month",
      intervalCount: 1,
      listPriceCents: opts.listPriceCents ?? 2400,
      discountPercent: opts.discountPercent ?? 10,
      unitAmountCents: opts.unitAmountCents ?? 2160,
      shippingCents: opts.shippingCents ?? 495,
      deliveryMethod: opts.deliveryMethod ?? "ship",

      shippingAddressId: opts.shippingAddressId ?? null,
      shipFirstName: ship?.firstName ?? null,
      shipLastName: ship?.lastName ?? null,
      shipAddress1: ship?.address1 ?? null,
      shipAddress2: ship?.address2 ?? null,
      shipCity: ship?.city ?? null,
      shipProvince: ship?.province ?? null,
      shipZip: ship?.zip ?? null,
      shipCountry: ship?.country ?? null,

      status: opts.status ?? "active",
      termsAcceptedAt:
        opts.termsAcceptedAt === undefined
          ? new Date("2026-08-01T00:00:00.000Z")
          : opts.termsAcceptedAt,
      termsVersion:
        opts.termsVersion === undefined ? "2026-07-01" : opts.termsVersion,
      merchantTermsUpdatedAt:
        opts.merchantTermsUpdatedAt === undefined
          ? new Date("2026-06-15T00:00:00.000Z")
          : opts.merchantTermsUpdatedAt,
    },
  });
}

type InvoiceFixtureOpts = {
  id?: string;
  subscriptionId?: string;
  metadata?: Record<string, string> | null;
  subtotal?: number;
  taxCents?: number;
  amountPaid?: number;
  total?: number;
  paymentIntentId?: string | null;
  attemptCount?: number;
  number?: string;
  hostedInvoiceUrl?: string;
  /** `true` renders `parent: null` — a non-subscription invoice. */
  standalone?: boolean;
};

/**
 * A paid `Stripe.Invoice` shaped for API `2026-01-28.clover`:
 * `parent.subscription_details.{subscription,metadata}`, `total_taxes[]`, and
 * an expanded `payments` list carrying the PaymentIntent.
 */
function makeInvoice(opts: InvoiceFixtureOpts = {}): Stripe.Invoice {
  const subtotal = opts.subtotal ?? 4320;
  const taxCents = opts.taxCents ?? 0;
  const total = opts.total ?? subtotal + taxCents;
  const amountPaid = opts.amountPaid ?? total;
  const paymentIntentId =
    opts.paymentIntentId === undefined ? "pi_test_inv_1" : opts.paymentIntentId;

  return {
    id: opts.id ?? "in_test_1",
    object: "invoice",
    currency: "usd",
    status: "paid",
    created: Math.floor(new Date("2026-08-25T12:00:00.000Z").getTime() / 1000),
    number: opts.number ?? "SP-0001",
    hosted_invoice_url:
      opts.hostedInvoiceUrl ?? "https://invoice.stripe.test/in_test_1",
    attempt_count: opts.attemptCount ?? 1,
    subtotal,
    total,
    amount_due: total,
    amount_paid: amountPaid,
    amount_remaining: total - amountPaid,
    total_taxes:
      taxCents > 0
        ? [
            {
              amount: taxCents,
              type: "tax_rate_details",
              taxability_reason: "standard_rated",
              taxable_amount: subtotal,
            },
          ]
        : [],
    parent: opts.standalone
      ? null
      : {
          type: "subscription_details",
          subscription_details: {
            subscription: opts.subscriptionId ?? "sub_test_1",
            metadata: opts.metadata ?? null,
          },
        },
    payments: {
      object: "list",
      has_more: false,
      url: "",
      data: paymentIntentId
        ? [
            {
              id: "inpay_test_1",
              object: "invoice_payment",
              payment: {
                type: "payment_intent",
                payment_intent: paymentIntentId,
              },
            },
          ]
        : [],
    },
  } as unknown as Stripe.Invoice;
}

/** A Prisma P2002 shaped like a real `(businessId, orderNumber)` conflict. */
function makeOrderNumberConflictError(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError(
    "Unique constraint failed on the fields: (`businessId`,`orderNumber`)",
    { code: "P2002", clientVersion: "test", meta: { target: ["orderNumber"] } },
  );
}

/**
 * A db client whose `order.create` throws a P2002 orderNumber conflict for the
 * first `failCount` calls, then delegates to the real client. Everything else
 * (including `$transaction`) forwards to the real client with `this` intact —
 * the implementer is free to use any delegate.
 */
function withFlakyOrderCreate(failCount: number): {
  client: DbClient;
  createCalls: () => number;
} {
  let calls = 0;

  const forward = (target: object, prop: string | symbol): unknown => {
    const value = Reflect.get(target, prop) as unknown;
    return typeof value === "function"
      ? (...args: unknown[]) =>
          (value as (...a: unknown[]) => unknown).apply(target, args)
      : value;
  };

  const realOrder = db.order as unknown as object;
  const orderDelegate = new Proxy(realOrder, {
    get(target, prop) {
      if (prop === "create") {
        return (...args: unknown[]) => {
          calls++;
          if (calls <= failCount) throw makeOrderNumberConflictError();
          return (
            Reflect.get(target, "create") as (...a: unknown[]) => unknown
          ).apply(target, args);
        };
      }
      return forward(target, prop);
    },
  });

  const client = new Proxy(db as unknown as object, {
    get(target, prop) {
      if (prop === "order") return orderDelegate;
      return forward(target, prop);
    },
  });

  return { client: client as unknown as DbClient, createCalls: () => calls };
}

/* ------------------------------------------------------------------ *
 * Tests
 * ------------------------------------------------------------------ */

describe("subscription order-from-invoice", () => {
  beforeEach(async () => {
    await resetDb();
    stripeMocks.sessionsRetrieve.mockReset();
    stripeMocks.subscriptionsRetrieve.mockReset();
    stripeMocks.invoicesRetrieve.mockReset();
    stripeMocks.constructEvent.mockReset();
    emailMocks.sendEmail.mockReset();
    emailMocks.sendEmail.mockResolvedValue({ success: true, id: "test" });
    sentryMocks.reset();
  });

  /** No Stripe method may be touched while turning an invoice into an order. */
  function expectNoStripeCalls() {
    expect(stripeMocks.sessionsRetrieve).not.toHaveBeenCalled();
    expect(stripeMocks.subscriptionsRetrieve).not.toHaveBeenCalled();
    expect(stripeMocks.invoicesRetrieve).not.toHaveBeenCalled();
  }

  describe("createOrderFromSubscriptionInvoice", () => {
    it("creates a paid, unfulfilled order from the locked subscription snapshot", async () => {
      const store = await setupStore();
      const customer = await createCustomer(store.id, {
        email: "ada@shopper.test",
      });
      const product = await createProduct(store.id, {
        name: "Twelve-Pack",
        price: 2400,
        inventoryQty: 40,
      });
      const variant = await createVariant(product.id, {
        name: "Unscented",
        sku: "TP-12-UNS",
        price: 2400,
      });
      const address = await db.shippingAddress.create({
        data: { ...DEFAULT_SHIP_SNAPSHOT, customerId: customer.id },
      });

      const subscription = await createSubscriptionRow(store, {
        customerId: customer.id,
        productId: product.id,
        productVariantId: variant.id,
        productName: "Twelve-Pack",
        variantName: "Unscented",
        sku: "TP-12-UNS",
        quantity: 2,
        unitAmountCents: 2160,
        shippingCents: 495,
        shippingAddressId: address.id,
      });

      // subtotal 4320 + shipping 495 + tax 289 = 5104
      const invoice = makeInvoice({
        id: "in_test_snapshot",
        subtotal: 4320,
        taxCents: 289,
        total: 5104,
        amountPaid: 5104,
      });

      const order = await createOrderFromSubscriptionInvoice(db, {
        business: store,
        subscription,
        invoice,
        paymentIntentId: "pi_test_inv_1",
      });

      expectNoStripeCalls();

      expect(order.businessId).toBe(store.id);
      expect(order.orderNumber).toBe(1);
      expect(order.customerId).toBe(customer.id);
      expect(order.shippingAddressId).toBe(address.id);

      expect(order.customerEmail).toBe("ada@shopper.test");
      expect(order.customerName).toBe("Ada Lovelace");
      expect(order.customerFirstName).toBe("Ada");
      expect(order.customerLastName).toBe("Lovelace");
      expect(order.customerPhone).toBe("+15555550188");

      expect(order.subtotal).toBe(4320);
      expect(order.shipping).toBe(495);
      expect(order.tax).toBe(289);
      expect(order.discount).toBe(0);
      expect(order.total).toBe(5104);

      expect(order.status).toBe("open");
      expect(order.paymentStatus).toBe("paid");
      expect(order.fulfillmentStatus).toBe("unfulfilled");
      expect(order.paymentMethod).toBe("card");
      expect(order.deliveryMethod).toBe("ship");

      // Terms are COPIED off the subscription snapshot — no Page lookup here.
      expect(order.termsAcceptedAt).toEqual(subscription.termsAcceptedAt);
      expect(order.termsVersion).toBe(subscription.termsVersion);
      expect(order.merchantTermsUpdatedAt).toEqual(
        subscription.merchantTermsUpdatedAt,
      );

      // A subscription order is billed by invoice, never by a Checkout Session.
      expect(order.stripeSessionId).toBeNull();
      expect(order.stripeInvoiceId).toBe("in_test_snapshot");
      expect(order.stripePaymentIntentId).toBe("pi_test_inv_1");
      expect(order.subscriptionId).toBe(subscription.id);

      expect(order.items).toHaveLength(1);
      const item = order.items[0]!;
      expect(item.productName).toBe("Twelve-Pack");
      expect(item.variantName).toBe("Unscented");
      expect(item.sku).toBe("TP-12-UNS");
      expect(item.productId).toBe(product.id);
      expect(item.productVariantId).toBe(variant.id);
      expect(item.quantity).toBe(2);
      expect(item.price).toBe(2160);
      expect(item.total).toBe(4320);
    });

    it("continues the business's order-number sequence", async () => {
      const store = await setupStore();
      await createOrder(store.id, { orderNumber: 6 });
      await createOrder(store.id, { orderNumber: 7 });
      const subscription = await createSubscriptionRow(store, {
        shippingAddressId: null,
        shipSnapshot: null,
        deliveryMethod: "pickup",
        shippingCents: 0,
      });

      const order = await createOrderFromSubscriptionInvoice(db, {
        business: store,
        subscription,
        invoice: makeInvoice({
          id: "in_test_seq",
          subtotal: 2160,
          total: 2160,
        }),
        paymentIntentId: null,
      });

      expect(order.orderNumber).toBe(8);
    });

    it("retries the order number on a P2002 conflict and succeeds", async () => {
      const store = await setupStore();
      const subscription = await createSubscriptionRow(store, {
        shippingAddressId: null,
        shipSnapshot: null,
        deliveryMethod: "pickup",
        shippingCents: 0,
      });
      const flaky = withFlakyOrderCreate(1);

      const order = await createOrderFromSubscriptionInvoice(flaky.client, {
        business: store,
        subscription,
        invoice: makeInvoice({
          id: "in_test_retry",
          subtotal: 2160,
          total: 2160,
        }),
        paymentIntentId: null,
      });

      expect(flaky.createCalls()).toBe(2);
      expect(order.orderNumber).toBe(1);
      expect(await db.order.count({ where: { businessId: store.id } })).toBe(1);
    });

    it("bills 0 shipping and links no address for a pickup subscription", async () => {
      const store = await setupStore();
      const customer = await createCustomer(store.id, {
        email: "ada@shopper.test",
      });
      const subscription = await createSubscriptionRow(store, {
        customerId: customer.id,
        deliveryMethod: "pickup",
        shippingCents: 0,
        shippingAddressId: null,
        shipSnapshot: null,
      });

      const order = await createOrderFromSubscriptionInvoice(db, {
        business: store,
        subscription,
        invoice: makeInvoice({
          id: "in_test_pickup",
          subtotal: 2160,
          total: 2160,
        }),
        paymentIntentId: null,
      });

      expect(order.deliveryMethod).toBe("pickup");
      expect(order.shipping).toBe(0);
      expect(order.shippingAddressId).toBeNull();
      expect(await db.shippingAddress.count()).toBe(0);
    });

    it("re-creates and links the shipping address when the FK was cleared but the snapshot survives", async () => {
      const store = await setupStore();
      const customer = await createCustomer(store.id, {
        email: "ada@shopper.test",
      });
      // `ShippingAddress` is SetNull on delete, so a customer editing their
      // address book can strand a live subscription with a null FK and an
      // intact encrypted snapshot. The snapshot is the source of truth.
      const subscription = await createSubscriptionRow(store, {
        customerId: customer.id,
        shippingAddressId: null,
      });

      const order = await createOrderFromSubscriptionInvoice(db, {
        business: store,
        subscription,
        invoice: makeInvoice({ id: "in_test_readdr" }),
        paymentIntentId: null,
      });

      expect(order.shippingAddressId).not.toBeNull();
      const address = await db.shippingAddress.findUniqueOrThrow({
        where: { id: order.shippingAddressId! },
      });
      expect(address.customerId).toBe(customer.id);
      expect(address.firstName).toBe("Ada");
      expect(address.lastName).toBe("Lovelace");
      expect(address.address1).toBe("12 Analytical Way");
      expect(address.address2).toBe("Suite 1843");
      expect(address.city).toBe("Detroit");
      expect(address.province).toBe("MI");
      expect(address.zip).toBe("48201");
      expect(address.country).toBe("US");

      // PINNED DECISION: the recreated address is written back onto the
      // subscription row, so the next renewal reuses the FK instead of
      // re-deriving it (and `findOrCreateShippingAddress` dedupe is not the
      // only thing standing between us and a duplicate per renewal).
      const after = await db.subscription.findUniqueOrThrow({
        where: { id: subscription.id },
      });
      expect(after.shippingAddressId).toBe(order.shippingAddressId);
    });

    it("records amount_paid as the total and reports an amount mismatch to Sentry", async () => {
      const store = await setupStore();
      const subscription = await createSubscriptionRow(store, {
        quantity: 1,
        unitAmountCents: 2160,
        shippingCents: 495,
        shippingAddressId: null,
        shipSnapshot: null,
        deliveryMethod: "pickup",
      });

      // Locked snapshot says 2160 + 0 + 0 = 2160, Stripe actually collected
      // 9999 (e.g. an owner edited the price in the Stripe dashboard). Stripe
      // is the authority on what the customer was charged.
      const invoice = makeInvoice({
        id: "in_test_mismatch",
        subtotal: 2160,
        taxCents: 0,
        total: 9999,
        amountPaid: 9999,
      });

      const order = await createOrderFromSubscriptionInvoice(db, {
        business: store,
        subscription,
        invoice,
        paymentIntentId: null,
      });

      expect(order.total).toBe(9999);
      expect(order.subtotal).toBe(2160);

      const mismatches = sentryEventsTagged(
        "subscription.step",
        "invoice-amount-mismatch",
      );
      expect(mismatches).toHaveLength(1);
      expect(mismatches[0]!.kind).toBe("message");
      expect(mismatches[0]!.tags.businessId).toBe(store.id);
    });

    it("does not report a mismatch when the locked amounts reconcile", async () => {
      const store = await setupStore();
      const subscription = await createSubscriptionRow(store, {
        quantity: 2,
        unitAmountCents: 2160,
        shippingCents: 495,
        shippingAddressId: null,
        shipSnapshot: null,
        deliveryMethod: "ship",
      });

      await createOrderFromSubscriptionInvoice(db, {
        business: store,
        subscription,
        invoice: makeInvoice({
          id: "in_test_reconciles",
          subtotal: 4320,
          taxCents: 289,
          total: 5104,
          amountPaid: 5104,
        }),
        paymentIntentId: null,
      });

      expect(
        sentryEventsTagged("subscription.step", "invoice-amount-mismatch"),
      ).toHaveLength(0);
    });
  });

  describe("processPaidInvoice", () => {
    it("creates the order, bumps customer metrics, deducts inventory and emails both parties", async () => {
      const store = await setupStore();
      const customer = await createCustomer(store.id, {
        email: "ada@shopper.test",
      });
      const product = await createProduct(store.id, {
        name: "Twelve-Pack",
        price: 2400,
        inventoryQty: 40,
      });
      const subscription = await createSubscriptionRow(store, {
        customerId: customer.id,
        productId: product.id,
        quantity: 2,
      });
      const invoice = makeInvoice({
        id: "in_test_process",
        subtotal: 4320,
        taxCents: 289,
        total: 5104,
        amountPaid: 5104,
      });

      const result = await processPaidInvoice(db, {
        business: store,
        subscription,
        invoice,
        paymentIntentId: "pi_test_inv_1",
      });

      expect(result.created).toBe(true);
      expect(result.order.stripeInvoiceId).toBe("in_test_process");
      expectNoStripeCalls();

      // Customer metrics mirror the one-time webhook's "customer metrics" step.
      const customerAfter = await db.customer.findUniqueOrThrow({
        where: { id: customer.id },
      });
      expect(customerAfter.orderCount).toBe(1);
      expect(customerAfter.totalSpent).toBe(5104);

      const productAfter = await db.product.findUniqueOrThrow({
        where: { id: product.id },
      });
      expect(productAfter.inventoryQty).toBe(38);

      const history = await db.inventoryHistory.findMany({
        where: { orderId: result.order.id },
      });
      expect(history).toHaveLength(1);
      expect(history[0]!.reason).toBe("sale");
      expect(history[0]!.changeQty).toBe(-2);
      expect(history[0]!.note).toBe(`Order #${result.order.orderNumber}`);

      expect(emailCategories()).toEqual([
        "order_confirmation",
        "new_order_owner",
      ]);
      const confirmation = emailWithCategory("order_confirmation")!;
      expect(confirmation.to).toBe("ada@shopper.test");
      expect(confirmation.idempotencyKey).toBe(
        "sub-order-confirmation-in_test_process",
      );
      const ownerEmail = emailWithCategory("new_order_owner")!;
      expect(ownerEmail.to).toBe(store.ownerEmail);
      expect(ownerEmail.idempotencyKey).toBe(
        "sub-owner-notification-in_test_process",
      );
    });

    it("is idempotent on Order.stripeInvoiceId — second call has no side effects", async () => {
      const store = await setupStore();
      const customer = await createCustomer(store.id, {
        email: "ada@shopper.test",
      });
      const product = await createProduct(store.id, {
        name: "Twelve-Pack",
        price: 2400,
        inventoryQty: 40,
      });
      const subscription = await createSubscriptionRow(store, {
        customerId: customer.id,
        productId: product.id,
        quantity: 2,
      });
      const invoice = makeInvoice({ id: "in_test_dupe" });

      const first = await processPaidInvoice(db, {
        business: store,
        subscription,
        invoice,
        paymentIntentId: "pi_test_inv_1",
      });
      expect(first.created).toBe(true);

      emailMocks.sendEmail.mockClear();

      const second = await processPaidInvoice(db, {
        business: store,
        subscription,
        invoice,
        paymentIntentId: "pi_test_inv_1",
      });

      expect(second.created).toBe(false);
      expect(second.order.id).toBe(first.order.id);
      expect(await db.order.count({ where: { businessId: store.id } })).toBe(1);
      expect(emailMocks.sendEmail).not.toHaveBeenCalled();

      const productAfter = await db.product.findUniqueOrThrow({
        where: { id: product.id },
      });
      expect(productAfter.inventoryQty).toBe(38);
      const customerAfter = await db.customer.findUniqueOrThrow({
        where: { id: customer.id },
      });
      expect(customerAfter.orderCount).toBe(1);
      expect(customerAfter.totalSpent).toBe(4320);
      expect(
        await db.inventoryHistory.count({
          where: { orderId: first.order.id },
        }),
      ).toBe(1);
    });

    it("decrements variant inventory when the subscription is for a variant", async () => {
      const store = await setupStore();
      const product = await createProduct(store.id, {
        name: "Twelve-Pack",
        price: 2400,
        inventoryQty: 0,
      });
      const variant = await createVariant(product.id, {
        name: "Unscented",
        sku: "TP-12-UNS",
        price: 2400,
        inventoryQty: 9,
      });
      const subscription = await createSubscriptionRow(store, {
        productId: product.id,
        productVariantId: variant.id,
        variantName: "Unscented",
        sku: "TP-12-UNS",
        quantity: 3,
      });

      await processPaidInvoice(db, {
        business: store,
        subscription,
        invoice: makeInvoice({ id: "in_test_variant" }),
        paymentIntentId: null,
      });

      const variantAfter = await db.productVariant.findUniqueOrThrow({
        where: { id: variant.id },
      });
      expect(variantAfter.inventoryQty).toBe(6);
      const productAfter = await db.product.findUniqueOrThrow({
        where: { id: product.id },
      });
      expect(productAfter.inventoryQty).toBe(0);
    });

    it("draws from the shared pool when the product is pool-backed", async () => {
      const store = await setupStore();
      const pool = await createBaseInventoryUnit(store.id, {
        name: "Jumbo Roll",
        inventoryQty: 100,
      });
      const product = await createProduct(store.id, {
        name: "Twelve-Pack",
        price: 2400,
        inventoryQty: 40,
      });
      await db.product.update({
        where: { id: product.id },
        data: { baseInventoryUnitId: pool.id, baseUnitsConsumed: 12 },
      });
      const subscription = await createSubscriptionRow(store, {
        productId: product.id,
        quantity: 2,
      });

      await processPaidInvoice(db, {
        business: store,
        subscription,
        invoice: makeInvoice({ id: "in_test_pool" }),
        paymentIntentId: null,
      });

      const poolAfter = await db.baseInventoryUnit.findUniqueOrThrow({
        where: { id: pool.id },
      });
      expect(poolAfter.inventoryQty).toBe(76); // 100 − (2 × 12)

      // The pool-backed product's own inventoryQty is never touched.
      const productAfter = await db.product.findUniqueOrThrow({
        where: { id: product.id },
      });
      expect(productAfter.inventoryQty).toBe(40);
    });

    it("still creates the order on an oversell, leaving stock unchanged and logging it", async () => {
      const store = await setupStore();
      const product = await createProduct(store.id, {
        name: "Twelve-Pack",
        price: 2400,
        inventoryQty: 1,
        trackInventory: true,
        allowBackorders: false,
      });
      const subscription = await createSubscriptionRow(store, {
        productId: product.id,
        quantity: 2,
      });

      const result = await processPaidInvoice(db, {
        business: store,
        subscription,
        invoice: makeInvoice({ id: "in_test_oversell" }),
        paymentIntentId: null,
      });

      expect(result.created).toBe(true);

      // DEVIATION FROM THE PLAN'S PROSE, MATCHING THE WEBHOOK'S CODE: the
      // conditional `WHERE inventoryQty >= qty` update matches nothing, so
      // stock is left EXACTLY as it was (1) rather than clamped to 0 — the
      // owner is told the truth about what is physically on the shelf. See
      // webhook route ~l.617.
      const productAfter = await db.product.findUniqueOrThrow({
        where: { id: product.id },
      });
      expect(productAfter.inventoryQty).toBe(1);

      const history = await db.inventoryHistory.findMany({
        where: { orderId: result.order.id },
      });
      expect(history).toHaveLength(1);
      expect(history[0]!.reason).toBe("oversell");
      expect(history[0]!.changeQty).toBe(0);
      expect(history[0]!.previousQty).toBe(1);
      expect(history[0]!.newQty).toBe(1);
    });

    it("sends the low-inventory alert when a renewal crosses the threshold", async () => {
      const store = await setupStore();
      const product = await createProduct(store.id, {
        name: "Twelve-Pack",
        price: 2400,
        inventoryQty: 6,
      });
      await db.product.update({
        where: { id: product.id },
        data: { lowInventoryThreshold: 5 },
      });
      const subscription = await createSubscriptionRow(store, {
        productId: product.id,
        quantity: 2,
      });

      await processPaidInvoice(db, {
        business: store,
        subscription,
        invoice: makeInvoice({ id: "in_test_lowstock" }),
        paymentIntentId: null,
      });

      expect(emailCategories()).toContain("low_inventory_alert");
      const alert = emailWithCategory("low_inventory_alert")!;
      expect(alert.to).toBe(store.ownerEmail);

      const productAfter = await db.product.findUniqueOrThrow({
        where: { id: product.id },
      });
      expect(productAfter.inventoryQty).toBe(4);
      expect(productAfter.lowInventoryAlertSent).toBe(true);
    });

    it("does not throw or roll back when an email fails", async () => {
      const store = await setupStore();
      const customer = await createCustomer(store.id, {
        email: "ada@shopper.test",
      });
      const product = await createProduct(store.id, {
        name: "Twelve-Pack",
        price: 2400,
        inventoryQty: 40,
      });
      const subscription = await createSubscriptionRow(store, {
        customerId: customer.id,
        productId: product.id,
        quantity: 2,
      });

      // `sendEmail()` never throws — it RESOLVES with `{ success: false }`.
      // Nothing downstream of the order may depend on delivery.
      emailMocks.sendEmail.mockResolvedValue({
        success: false,
        error: "resend down",
      });

      const result = await processPaidInvoice(db, {
        business: store,
        subscription,
        invoice: makeInvoice({ id: "in_test_emailfail" }),
        paymentIntentId: null,
      });

      expect(result.created).toBe(true);
      expect(await db.order.count({ where: { businessId: store.id } })).toBe(1);
      const productAfter = await db.product.findUniqueOrThrow({
        where: { id: product.id },
      });
      expect(productAfter.inventoryQty).toBe(38);
    });

    it("survives a thrown email helper without losing the order", async () => {
      const store = await setupStore();
      const product = await createProduct(store.id, {
        name: "Twelve-Pack",
        price: 2400,
        inventoryQty: 40,
      });
      const subscription = await createSubscriptionRow(store, {
        productId: product.id,
        quantity: 2,
      });

      emailMocks.sendEmail.mockRejectedValue(new Error("network exploded"));

      const result = await processPaidInvoice(db, {
        business: store,
        subscription,
        invoice: makeInvoice({ id: "in_test_emailthrow" }),
        paymentIntentId: null,
      });

      expect(result.created).toBe(true);
      expect(await db.order.count({ where: { businessId: store.id } })).toBe(1);
    });
  });

  describe("deductInventoryForOrderItems", () => {
    /**
     * Runs the helper inside a real transaction, exactly the way
     * `processPaidInvoice` (and the webhook) does.
     */
    async function deduct(
      store: Store,
      orderId: string,
      orderNumber: number,
      items: Array<{
        productId: string | null;
        productVariantId: string | null;
        quantity: number;
        productName: string;
      }>,
    ) {
      return db.$transaction(async (tx) =>
        deductInventoryForOrderItems(tx, {
          businessId: store.id,
          orderId,
          orderNumber,
          items,
        }),
      );
    }

    it("decrements a variant and returns a low-stock candidate for it", async () => {
      const store = await setupStore();
      const product = await createProduct(store.id, {
        name: "Twelve-Pack",
        price: 2400,
        inventoryQty: 0,
      });
      await db.product.update({
        where: { id: product.id },
        data: { lowInventoryThreshold: 4 },
      });
      const variant = await createVariant(product.id, {
        name: "Unscented",
        inventoryQty: 5,
      });
      const order = await createOrder(store.id, { orderNumber: 11 });

      const result = await deduct(store, order.id, 11, [
        {
          productId: product.id,
          productVariantId: variant.id,
          quantity: 2,
          productName: "Twelve-Pack",
        },
      ]);

      expect(result.poolCandidates).toEqual([]);
      expect(result.candidates).toHaveLength(1);
      expect(result.candidates[0]).toMatchObject({
        productId: product.id,
        productName: "Twelve-Pack",
        variantId: variant.id,
        variantName: "Unscented",
        previousQty: 5,
        newQty: 3,
        allowBackorders: false,
        lowInventoryThreshold: 4,
      });

      const variantAfter = await db.productVariant.findUniqueOrThrow({
        where: { id: variant.id },
      });
      expect(variantAfter.inventoryQty).toBe(3);
    });

    it("decrements a plain product and records InventoryHistory", async () => {
      const store = await setupStore();
      const product = await createProduct(store.id, {
        name: "Twelve-Pack",
        inventoryQty: 10,
      });
      const order = await createOrder(store.id, { orderNumber: 12 });

      const result = await deduct(store, order.id, 12, [
        {
          productId: product.id,
          productVariantId: null,
          quantity: 4,
          productName: "Twelve-Pack",
        },
      ]);

      expect(result.candidates).toHaveLength(1);
      expect(result.candidates[0]).toMatchObject({
        productId: product.id,
        previousQty: 10,
        newQty: 6,
      });
      expect(result.candidates[0]!.variantId).toBeUndefined();

      const productAfter = await db.product.findUniqueOrThrow({
        where: { id: product.id },
      });
      expect(productAfter.inventoryQty).toBe(6);

      const history = await db.inventoryHistory.findMany({
        where: { orderId: order.id },
      });
      expect(history).toHaveLength(1);
      expect(history[0]!.productId).toBe(product.id);
      expect(history[0]!.variantId).toBeNull();
      expect(history[0]!.businessId).toBe(store.id);
      expect(history[0]!.changeQty).toBe(-4);
      expect(history[0]!.reason).toBe("sale");
      expect(history[0]!.note).toBe("Order #12");
    });

    it("decrements past zero for a backordered product", async () => {
      const store = await setupStore();
      const product = await createProduct(store.id, {
        name: "Preorder Pack",
        inventoryQty: 1,
        allowBackorders: true,
      });
      const order = await createOrder(store.id, { orderNumber: 13 });

      const result = await deduct(store, order.id, 13, [
        {
          productId: product.id,
          productVariantId: null,
          quantity: 3,
          productName: "Preorder Pack",
        },
      ]);

      const productAfter = await db.product.findUniqueOrThrow({
        where: { id: product.id },
      });
      expect(productAfter.inventoryQty).toBe(-2);
      expect(result.candidates[0]).toMatchObject({
        previousQty: 1,
        newQty: -2,
        allowBackorders: true,
      });
    });

    it("leaves an untracked product alone and returns no candidate", async () => {
      const store = await setupStore();
      const product = await createProduct(store.id, {
        name: "Made To Order",
        inventoryQty: 3,
        trackInventory: false,
      });
      const order = await createOrder(store.id, { orderNumber: 14 });

      const result = await deduct(store, order.id, 14, [
        {
          productId: product.id,
          productVariantId: null,
          quantity: 9,
          productName: "Made To Order",
        },
      ]);

      expect(result.candidates).toEqual([]);
      const productAfter = await db.product.findUniqueOrThrow({
        where: { id: product.id },
      });
      expect(productAfter.inventoryQty).toBe(3);
      expect(
        await db.inventoryHistory.count({ where: { orderId: order.id } }),
      ).toBe(0);
    });

    it("routes a pool-backed product through deductPoolInventory", async () => {
      const store = await setupStore();
      const pool = await createBaseInventoryUnit(store.id, {
        name: "Jumbo Roll",
        inventoryQty: 50,
        lowInventoryThreshold: 30,
      });
      const product = await createProduct(store.id, {
        name: "Twelve-Pack",
        inventoryQty: 40,
      });
      await db.product.update({
        where: { id: product.id },
        data: { baseInventoryUnitId: pool.id, baseUnitsConsumed: 12 },
      });
      const order = await createOrder(store.id, { orderNumber: 15 });

      const result = await deduct(store, order.id, 15, [
        {
          productId: product.id,
          productVariantId: null,
          quantity: 2,
          productName: "Twelve-Pack",
        },
      ]);

      expect(result.candidates).toEqual([]);
      expect(result.poolCandidates).toHaveLength(1);
      expect(result.poolCandidates[0]).toMatchObject({
        poolId: pool.id,
        poolName: "Jumbo Roll",
        previousQty: 50,
        newQty: 26,
        totalBaseUnitsDeducted: 24,
        wasOversell: false,
        lowInventoryThreshold: 30,
      });

      const poolAfter = await db.baseInventoryUnit.findUniqueOrThrow({
        where: { id: pool.id },
      });
      expect(poolAfter.inventoryQty).toBe(26);
    });

    it("records an oversell without changing stock, and reports it to Sentry", async () => {
      const store = await setupStore();
      const product = await createProduct(store.id, {
        name: "Twelve-Pack",
        inventoryQty: 1,
      });
      const order = await createOrder(store.id, { orderNumber: 16 });

      const result = await deduct(store, order.id, 16, [
        {
          productId: product.id,
          productVariantId: null,
          quantity: 5,
          productName: "Twelve-Pack",
        },
      ]);

      // No candidate: nothing moved, so there is no threshold crossing to
      // alert on (the oversell itself is the signal, and it goes to Sentry).
      expect(result.candidates).toEqual([]);

      const productAfter = await db.product.findUniqueOrThrow({
        where: { id: product.id },
      });
      expect(productAfter.inventoryQty).toBe(1);

      const history = await db.inventoryHistory.findMany({
        where: { orderId: order.id },
      });
      expect(history).toHaveLength(1);
      expect(history[0]!.reason).toBe("oversell");
      expect(history[0]!.changeQty).toBe(0);

      expect(
        sentryEventsTagged("subscription.step", "inventory-oversell").length +
          sentryEventsTagged("inventory.step", "oversell").length,
      ).toBeGreaterThan(0);
    });

    it("skips a deleted product/variant instead of throwing", async () => {
      const store = await setupStore();
      const order = await createOrder(store.id, { orderNumber: 17 });

      const result = await deduct(store, order.id, 17, [
        {
          productId: "prod_gone",
          productVariantId: null,
          quantity: 1,
          productName: "Deleted Product",
        },
        {
          productId: "prod_gone",
          productVariantId: "var_gone",
          quantity: 1,
          productName: "Deleted Variant",
        },
      ]);

      expect(result.candidates).toEqual([]);
      expect(result.poolCandidates).toEqual([]);
    });
  });

  describe("sendLowInventoryAlerts", () => {
    it("sends the out-of-stock alert once and latches the flags", async () => {
      const store = await setupStore();
      const product = await createProduct(store.id, {
        name: "Twelve-Pack",
        inventoryQty: 0,
      });

      const candidates = [
        {
          productId: product.id,
          productName: "Twelve-Pack",
          newQty: 0,
          previousQty: 2,
          allowBackorders: false,
          lowInventoryThreshold: null,
        },
      ];

      await sendLowInventoryAlerts(db, {
        business: store,
        candidates,
        poolCandidates: [],
      });

      expect(emailCategories()).toEqual(["out_of_stock_alert"]);
      const productAfter = await db.product.findUniqueOrThrow({
        where: { id: product.id },
      });
      expect(productAfter.outOfStockAlertSent).toBe(true);
      expect(productAfter.lowInventoryAlertSent).toBe(true);

      // Second pass over the same candidate: the latch blocks a repeat.
      emailMocks.sendEmail.mockClear();
      await sendLowInventoryAlerts(db, {
        business: store,
        candidates,
        poolCandidates: [],
      });
      expect(emailMocks.sendEmail).not.toHaveBeenCalled();
    });

    it("sends the backorder alert instead when backorders are enabled", async () => {
      const store = await setupStore();
      const product = await createProduct(store.id, {
        name: "Preorder Pack",
        allowBackorders: true,
        inventoryQty: -2,
      });

      await sendLowInventoryAlerts(db, {
        business: store,
        candidates: [
          {
            productId: product.id,
            productName: "Preorder Pack",
            newQty: -2,
            previousQty: 1,
            allowBackorders: true,
            lowInventoryThreshold: null,
          },
        ],
        poolCandidates: [],
      });

      expect(emailCategories()).toEqual(["backorder_alert"]);
    });

    it("sends the low-inventory alert only on the crossing", async () => {
      const store = await setupStore();
      const product = await createProduct(store.id, {
        name: "Twelve-Pack",
        inventoryQty: 4,
      });
      await db.product.update({
        where: { id: product.id },
        data: { lowInventoryThreshold: 5 },
      });

      // previousQty already at/below the threshold ⇒ not a crossing.
      await sendLowInventoryAlerts(db, {
        business: store,
        candidates: [
          {
            productId: product.id,
            productName: "Twelve-Pack",
            newQty: 4,
            previousQty: 5,
            allowBackorders: false,
            lowInventoryThreshold: 5,
          },
        ],
        poolCandidates: [],
      });
      expect(emailMocks.sendEmail).not.toHaveBeenCalled();

      await sendLowInventoryAlerts(db, {
        business: store,
        candidates: [
          {
            productId: product.id,
            productName: "Twelve-Pack",
            newQty: 4,
            previousQty: 6,
            allowBackorders: false,
            lowInventoryThreshold: 5,
          },
        ],
        poolCandidates: [],
      });
      expect(emailCategories()).toEqual(["low_inventory_alert"]);
    });

    it("alerts once per product even with several variant candidates", async () => {
      const store = await setupStore();
      const product = await createProduct(store.id, {
        name: "Twelve-Pack",
        inventoryQty: 0,
      });
      const a = await createVariant(product.id, { name: "Unscented" });
      const b = await createVariant(product.id, { name: "Lavender" });

      await sendLowInventoryAlerts(db, {
        business: store,
        candidates: [
          {
            productId: product.id,
            productName: "Twelve-Pack",
            variantId: a.id,
            variantName: "Unscented",
            newQty: 0,
            previousQty: 1,
            allowBackorders: false,
            lowInventoryThreshold: null,
          },
          {
            productId: product.id,
            productName: "Twelve-Pack",
            variantId: b.id,
            variantName: "Lavender",
            newQty: 0,
            previousQty: 1,
            allowBackorders: false,
            lowInventoryThreshold: null,
          },
        ],
        poolCandidates: [],
      });

      expect(emailCategories()).toEqual(["out_of_stock_alert"]);
    });

    it("sends pool alerts and skips pool oversells", async () => {
      const store = await setupStore();
      const empty = await createBaseInventoryUnit(store.id, {
        name: "Jumbo Roll",
        inventoryQty: 0,
      });
      const low = await createBaseInventoryUnit(store.id, {
        name: "Kraft Core",
        inventoryQty: 8,
        lowInventoryThreshold: 10,
      });
      const oversold = await createBaseInventoryUnit(store.id, {
        name: "Ribbon",
        inventoryQty: 1,
      });

      await sendLowInventoryAlerts(db, {
        business: store,
        candidates: [],
        poolCandidates: [
          {
            poolId: empty.id,
            poolName: "Jumbo Roll",
            previousQty: 12,
            newQty: 0,
            totalBaseUnitsDeducted: 12,
            wasOversell: false,
            allowBackorders: false,
            lowInventoryThreshold: null,
          },
          {
            poolId: low.id,
            poolName: "Kraft Core",
            previousQty: 20,
            newQty: 8,
            totalBaseUnitsDeducted: 12,
            wasOversell: false,
            allowBackorders: false,
            lowInventoryThreshold: 10,
          },
          {
            poolId: oversold.id,
            poolName: "Ribbon",
            previousQty: 1,
            newQty: 1,
            totalBaseUnitsDeducted: 0,
            wasOversell: true,
            allowBackorders: false,
            lowInventoryThreshold: 10,
          },
        ],
      });

      expect(emailCategories().sort()).toEqual([
        "pool_low_inventory_alert",
        "pool_out_of_stock_alert",
      ]);
      const oversoldAfter = await db.baseInventoryUnit.findUniqueOrThrow({
        where: { id: oversold.id },
      });
      expect(oversoldAfter.outOfStockAlertSent).toBe(false);
      expect(oversoldAfter.lowInventoryAlertSent).toBe(false);
    });

    it("never throws when the alert email fails", async () => {
      const store = await setupStore();
      const product = await createProduct(store.id, { inventoryQty: 0 });
      emailMocks.sendEmail.mockRejectedValue(new Error("resend exploded"));

      await expect(
        sendLowInventoryAlerts(db, {
          business: store,
          candidates: [
            {
              productId: product.id,
              productName: "Twelve-Pack",
              newQty: 0,
              previousQty: 1,
              allowBackorders: false,
              lowInventoryThreshold: null,
            },
          ],
          poolCandidates: [],
        }),
      ).resolves.toBeUndefined();
    });
  });
});
