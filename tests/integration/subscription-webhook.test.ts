import type Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  applyStripeSubscriptionState,
  handleInvoicePaid,
  handleInvoicePaymentFailed,
  handleInvoiceVoided,
  handleSubscriptionCheckoutCompleted,
  handleSubscriptionCheckoutExpired,
  handleSubscriptionDeleted,
  handleSubscriptionUpdated,
  resolveSubscriptionTenant,
} from "~/lib/subscriptions/webhook";

import { db, resetDb } from "../helpers/db";
import {
  createBusiness,
  createCustomer,
  createProduct,
} from "../helpers/factories";

/**
 * RED spec for `src/lib/subscriptions/webhook.ts` — the seven subscription
 * event handlers the Stripe webhook route dispatches to, plus the two helpers
 * they share.
 *
 * Contract for EVERY handler:
 *   `(event: Stripe.Event) => Promise<NextResponse>`
 *   — always resolves 200 with `{ received: true }`. Failures are captured to
 *     Sentry and swallowed; a subscription handler must never throw, because a
 *     thrown handler makes Stripe retry forever against a store that will keep
 *     failing the same way.
 *
 * Tenant rule (the security spine, mirroring the one-time path at route
 * l.134–158): resolve `businessId` from event metadata → load the Business →
 * REJECT unless `event.account === business.stripeAccountId` → load the
 * Subscription row by `{ id: metadata.subscriptionId, businessId }`. A reject
 * writes NOTHING and still answers 200.
 *
 * Metadata source differs per event and is deliberately NOT unified:
 *   - session events    → `session.metadata`  ({ businessId, subscriptionId, kind })
 *   - subscription events → `subscription.metadata` (full `subscriptionMetadataSchema`)
 *   - invoice events    → `invoice.parent.subscription_details.metadata`
 */

/* ------------------------------------------------------------------ *
 * Mocks
 * ------------------------------------------------------------------ */

const stripeMocks = vi.hoisted(() => ({
  subscriptionsRetrieve: vi.fn(),
  invoicesRetrieve: vi.fn(),
  sessionsRetrieve: vi.fn(),
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

const emailMocks = vi.hoisted(() => ({ sendEmail: vi.fn() }));
vi.mock("~/lib/email/send", () => ({
  sendEmail: (...args: unknown[]): unknown => emailMocks.sendEmail(...args),
  EMAIL_FROM: {
    NOREPLY: "noreply@test.dev",
    ORDERS: "orders@test.dev",
    SUPPORT: "support@test.dev",
  },
}));

/** Records captures with the tags in force, inline or scope-set. See file A. */
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

function sentryEventsTagged(name: string, value: string) {
  return sentryMocks.events.filter((event) => event.tags[name] === value);
}

/* ------------------------------------------------------------------ *
 * Assertion helpers
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

function emailsWithCategory(category: string): EmailCall[] {
  return emailCalls().filter((opts) =>
    opts.tags?.some((t) => t.name === "category" && t.value === category),
  );
}

/** Every handler answers 200 `{ received: true }`, success or failure. */
async function expectReceived(res: Response) {
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ received: true });
}

/**
 * Every Stripe read must be scoped to the connected account. The SDK accepts
 * `RequestOptions` in either the 2nd or 3rd position, so this only asserts
 * that SOME argument carries `stripeAccount` — the invariant, not the arity.
 */
function expectScopedToAccount(callArgs: unknown[], accountId: string) {
  const scoped = callArgs.some(
    (arg) =>
      typeof arg === "object" &&
      arg !== null &&
      (arg as { stripeAccount?: string }).stripeAccount === accountId,
  );
  expect(scoped).toBe(true);
}

/* ------------------------------------------------------------------ *
 * Fixtures
 * ------------------------------------------------------------------ */

const ACCOUNT_ID = "acct_test_subs";
const OTHER_ACCOUNT_ID = "acct_test_attacker";

const PERIOD_START = Math.floor(
  new Date("2026-08-01T00:00:00.000Z").getTime() / 1000,
);
const PERIOD_END = Math.floor(
  new Date("2026-09-01T00:00:00.000Z").getTime() / 1000,
);

async function setupStore() {
  const created = await createBusiness({ subdomain: "subs-webhook-biz" });
  await db.business.update({
    where: { id: created.id },
    data: {
      stripeAccountId: ACCOUNT_ID,
      // Proves the abandoned-cart opt-in never leaks into the subscription lane.
      sendAbandonedCheckoutEmails: true,
    },
  });
  return db.business.findUniqueOrThrow({
    where: { id: created.id },
    include: { siteContent: { select: { logoUrl: true } } },
  });
}

type Store = Awaited<ReturnType<typeof setupStore>>;

async function createSubscriptionRow(
  store: Store,
  opts: {
    customerId?: string | null;
    productId?: string | null;
    status?: string;
    stripeSubscriptionId?: string | null;
    stripeCustomerId?: string | null;
    cancelReason?: string | null;
    cancelledAt?: Date | null;
    lastPaymentFailedAt?: Date | null;
    currentPeriodEnd?: Date | null;
    quantity?: number;
  } = {},
) {
  return db.subscription.create({
    data: {
      businessId: store.id,
      customerId: opts.customerId ?? null,
      customerEmail: "ada@shopper.test",
      customerName: "Ada Lovelace",
      customerPhone: "+15555550188",

      stripeSubscriptionId:
        opts.stripeSubscriptionId === undefined
          ? "sub_test_1"
          : opts.stripeSubscriptionId,
      stripeCustomerId:
        opts.stripeCustomerId === undefined
          ? "cus_test_1"
          : opts.stripeCustomerId,

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

      status: opts.status ?? "active",
      cancelReason: opts.cancelReason ?? null,
      cancelledAt: opts.cancelledAt ?? null,
      lastPaymentFailedAt: opts.lastPaymentFailedAt ?? null,
      currentPeriodEnd: opts.currentPeriodEnd ?? null,

      termsAcceptedAt: new Date("2026-08-01T00:00:00.000Z"),
      termsVersion: "2026-07-01",
    },
  });
}

/** Full `subscription_data.metadata` — satisfies `subscriptionMetadataSchema`. */
function subMetadata(
  store: Store,
  subscriptionId: string,
  productId: string | null,
): Record<string, string> {
  return {
    businessId: store.id,
    subscriptionId,
    productId: productId ?? "prod_unknown",
    variantId: "",
    intervalKey: "month:1",
    quantity: "2",
    deliveryMethod: "pickup",
  };
}

/** The three keys a subscription Checkout Session carries (plan §3). */
function sessionMetadata(
  store: Store,
  subscriptionId: string,
): Record<string, string> {
  return {
    businessId: store.id,
    subscriptionId,
    kind: "subscription",
  };
}

function makeStripeEvent(opts: {
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

function makeStripeSubscription(
  opts: {
    id?: string;
    customer?: string;
    status?: Stripe.Subscription.Status;
    pauseCollection?: {
      behavior: "void" | "keep_as_draft" | "mark_uncollectible";
      resumes_at?: number | null;
    } | null;
    metadata?: Record<string, string>;
    periodStart?: number;
    periodEnd?: number;
    cancelAtPeriodEnd?: boolean;
    canceledAt?: number | null;
  } = {},
): Stripe.Subscription {
  return {
    id: opts.id ?? "sub_test_1",
    object: "subscription",
    customer: opts.customer ?? "cus_test_1",
    status: opts.status ?? "active",
    pause_collection: opts.pauseCollection ?? null,
    metadata: opts.metadata ?? {},
    cancel_at_period_end: opts.cancelAtPeriodEnd ?? false,
    canceled_at: opts.canceledAt ?? null,
    currency: "usd",
    items: {
      object: "list",
      has_more: false,
      url: "",
      data: [
        {
          id: "si_test_1",
          object: "subscription_item",
          current_period_start: opts.periodStart ?? PERIOD_START,
          current_period_end: opts.periodEnd ?? PERIOD_END,
          quantity: 2,
        },
      ],
    },
  } as unknown as Stripe.Subscription;
}

function makeStripeInvoice(
  opts: {
    id?: string;
    subscriptionId?: string;
    metadata?: Record<string, string> | null;
    subtotal?: number;
    taxCents?: number;
    amountPaid?: number;
    total?: number;
    paymentIntentId?: string | null;
    attemptCount?: number;
    /** `true` renders `parent: null` — a one-off invoice, not ours. */
    standalone?: boolean;
    /** `false` omits the expanded `payments` list (the un-retrieved event copy). */
    withPayments?: boolean;
  } = {},
): Stripe.Invoice {
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
    created: Math.floor(new Date("2026-09-01T12:00:00.000Z").getTime() / 1000),
    number: "SP-0001",
    hosted_invoice_url: "https://invoice.stripe.test/in_test_1",
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
    ...(opts.withPayments === false
      ? {}
      : {
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
        }),
  } as unknown as Stripe.Invoice;
}

function makeSubscriptionSession(opts: {
  id?: string;
  metadata: Record<string, string>;
  subscription?: string | null;
  customer?: string | null;
  customerEmail?: string;
}): Stripe.Checkout.Session {
  return {
    id: opts.id ?? "cs_test_sub_1",
    object: "checkout.session",
    mode: "subscription",
    metadata: opts.metadata,
    subscription:
      opts.subscription === undefined ? "sub_test_1" : opts.subscription,
    customer: opts.customer === undefined ? "cus_test_1" : opts.customer,
    customer_email: null,
    customer_details: {
      name: "Ada Lovelace",
      email: opts.customerEmail ?? "ada@shopper.test",
      phone: "+15555550188",
      address: null,
      tax_ids: null,
      tax_exempt: "none",
    },
    payment_status: "paid",
    status: "complete",
    currency: "usd",
  } as unknown as Stripe.Checkout.Session;
}

/* ------------------------------------------------------------------ *
 * Tests
 * ------------------------------------------------------------------ */

describe("subscription webhook handlers", () => {
  beforeEach(async () => {
    await resetDb();
    stripeMocks.subscriptionsRetrieve.mockReset();
    stripeMocks.invoicesRetrieve.mockReset();
    stripeMocks.sessionsRetrieve.mockReset();
    stripeMocks.constructEvent.mockReset();
    emailMocks.sendEmail.mockReset();
    emailMocks.sendEmail.mockResolvedValue({ success: true, id: "test" });
    sentryMocks.reset();
  });

  describe("resolveSubscriptionTenant", () => {
    it("returns the business and row when the connected account owns them", async () => {
      const store = await setupStore();
      const row = await createSubscriptionRow(store);
      const event = makeStripeEvent({
        type: "customer.subscription.updated",
        object: makeStripeSubscription(),
        account: ACCOUNT_ID,
      });

      const resolved = await resolveSubscriptionTenant(db, event, {
        businessId: store.id,
        subscriptionId: row.id,
      });

      expect(resolved).not.toBeNull();
      expect(resolved!.business.id).toBe(store.id);
      expect(resolved!.subscription.id).toBe(row.id);
    });

    it("refuses a spoofed event.account and writes nothing", async () => {
      const store = await setupStore();
      const row = await createSubscriptionRow(store);
      const event = makeStripeEvent({
        type: "customer.subscription.updated",
        object: makeStripeSubscription(),
        account: OTHER_ACCOUNT_ID,
      });

      const resolved = await resolveSubscriptionTenant(db, event, {
        businessId: store.id,
        subscriptionId: row.id,
      });

      expect(resolved).toBeNull();
      expect(
        sentryEventsTagged("subscription.step", "account-mismatch"),
      ).toHaveLength(1);

      const after = await db.subscription.findUniqueOrThrow({
        where: { id: row.id },
      });
      expect(after.updatedAt.getTime()).toBe(row.updatedAt.getTime());
    });

    it("returns null (and reports) when the subscription row is missing", async () => {
      const store = await setupStore();
      const event = makeStripeEvent({
        type: "customer.subscription.updated",
        object: makeStripeSubscription(),
        account: ACCOUNT_ID,
      });

      const resolved = await resolveSubscriptionTenant(db, event, {
        businessId: store.id,
        subscriptionId: "sub_row_that_never_existed",
      });

      expect(resolved).toBeNull();
      expect(
        sentryEventsTagged("subscription.step", "row-not-found"),
      ).toHaveLength(1);
    });

    it("returns null for an unknown business without throwing", async () => {
      const event = makeStripeEvent({
        type: "customer.subscription.updated",
        object: makeStripeSubscription(),
        account: ACCOUNT_ID,
      });

      await expect(
        resolveSubscriptionTenant(db, event, {
          businessId: "biz_that_never_existed",
          subscriptionId: "sub_row_x",
        }),
      ).resolves.toBeNull();
    });

    it("scopes the row lookup to the business — a foreign row is not found", async () => {
      const storeA = await setupStore();
      const createdB = await createBusiness({ subdomain: "other-biz" });
      const storeB = await db.business.findUniqueOrThrow({
        where: { id: createdB.id },
        include: { siteContent: { select: { logoUrl: true } } },
      });
      const foreignRow = await createSubscriptionRow(storeB);

      const event = makeStripeEvent({
        type: "customer.subscription.updated",
        object: makeStripeSubscription(),
        account: ACCOUNT_ID,
      });

      await expect(
        resolveSubscriptionTenant(db, event, {
          businessId: storeA.id,
          subscriptionId: foreignRow.id,
        }),
      ).resolves.toBeNull();
    });
  });

  describe("applyStripeSubscriptionState", () => {
    const MAPPINGS: Array<{
      stripeStatus: Stripe.Subscription.Status;
      paused: boolean;
      expected: string;
    }> = [
      { stripeStatus: "active", paused: false, expected: "active" },
      { stripeStatus: "trialing", paused: false, expected: "active" },
      { stripeStatus: "active", paused: true, expected: "paused" },
      { stripeStatus: "trialing", paused: true, expected: "paused" },
      { stripeStatus: "paused", paused: false, expected: "paused" },
      { stripeStatus: "past_due", paused: false, expected: "past_due" },
      { stripeStatus: "unpaid", paused: false, expected: "past_due" },
      { stripeStatus: "incomplete", paused: false, expected: "incomplete" },
      { stripeStatus: "canceled", paused: false, expected: "cancelled" },
      {
        stripeStatus: "incomplete_expired",
        paused: false,
        expected: "cancelled",
      },
    ];

    for (const mapping of MAPPINGS) {
      it(`maps Stripe ${mapping.stripeStatus}${mapping.paused ? " + pause_collection" : ""} to ${mapping.expected}`, async () => {
        const store = await setupStore();
        const row = await createSubscriptionRow(store, {
          status: "incomplete",
          stripeSubscriptionId: null,
        });

        await applyStripeSubscriptionState(
          db,
          row,
          makeStripeSubscription({
            status: mapping.stripeStatus,
            pauseCollection: mapping.paused
              ? { behavior: "void", resumes_at: null }
              : null,
          }),
        );

        const after = await db.subscription.findUniqueOrThrow({
          where: { id: row.id },
        });
        expect(after.status).toBe(mapping.expected);
      });
    }

    it("persists the Stripe ids, periods and lastSyncedAt", async () => {
      const store = await setupStore();
      const row = await createSubscriptionRow(store, {
        status: "incomplete",
        stripeSubscriptionId: null,
        stripeCustomerId: null,
      });

      await applyStripeSubscriptionState(
        db,
        row,
        makeStripeSubscription({
          id: "sub_live_9",
          customer: "cus_live_9",
        }),
      );

      const after = await db.subscription.findUniqueOrThrow({
        where: { id: row.id },
      });
      expect(after.stripeSubscriptionId).toBe("sub_live_9");
      expect(after.stripeCustomerId).toBe("cus_live_9");
      expect(after.status).toBe("active");
      expect(after.currentPeriodStart).toEqual(new Date(PERIOD_START * 1000));
      expect(after.currentPeriodEnd).toEqual(new Date(PERIOD_END * 1000));
      expect(after.nextBillingAt).toEqual(new Date(PERIOD_END * 1000));
      expect(after.pauseResumesAt).toBeNull();
      expect(after.lastSyncedAt).toBeInstanceOf(Date);
    });

    it("pushes nextBillingAt out to pause_collection.resumes_at on a skip", async () => {
      const store = await setupStore();
      const row = await createSubscriptionRow(store);
      const resumesAt = PERIOD_END + 3600;

      await applyStripeSubscriptionState(
        db,
        row,
        makeStripeSubscription({
          pauseCollection: { behavior: "void", resumes_at: resumesAt },
        }),
      );

      const after = await db.subscription.findUniqueOrThrow({
        where: { id: row.id },
      });
      expect(after.status).toBe("paused");
      expect(after.pauseResumesAt).toEqual(new Date(resumesAt * 1000));
      expect(after.nextBillingAt).toEqual(new Date(resumesAt * 1000));
    });

    it("clears pauseResumesAt when the pause is lifted", async () => {
      const store = await setupStore();
      const row = await createSubscriptionRow(store);
      await db.subscription.update({
        where: { id: row.id },
        data: {
          status: "paused",
          pauseResumesAt: new Date((PERIOD_END + 3600) * 1000),
        },
      });

      await applyStripeSubscriptionState(db, row, makeStripeSubscription());

      const after = await db.subscription.findUniqueOrThrow({
        where: { id: row.id },
      });
      expect(after.status).toBe("active");
      expect(after.pauseResumesAt).toBeNull();
      expect(after.nextBillingAt).toEqual(new Date(PERIOD_END * 1000));
    });
  });

  describe("handleSubscriptionCheckoutCompleted", () => {
    async function complete(
      store: Store,
      row: { id: string },
      opts: {
        account?: string | null;
        stripeSub?: Stripe.Subscription;
        sessionId?: string;
      } = {},
    ) {
      stripeMocks.subscriptionsRetrieve.mockResolvedValue(
        opts.stripeSub ??
          // NOTE the customer id differs from the session's `customer` below —
          // the row must take it from the RETRIEVED subscription.
          makeStripeSubscription({ id: "sub_live_1", customer: "cus_sub_1" }),
      );
      const session = makeSubscriptionSession({
        id: opts.sessionId ?? "cs_test_sub_1",
        metadata: sessionMetadata(store, row.id),
        subscription: "sub_live_1",
        customer: "cus_live_1",
      });
      const event = makeStripeEvent({
        type: "checkout.session.completed",
        object: session,
        account: opts.account === undefined ? ACCOUNT_ID : opts.account,
      });
      return handleSubscriptionCheckoutCompleted(event);
    }

    it("activates the row from the connected account's subscription and emails both parties", async () => {
      const store = await setupStore();
      const customer = await createCustomer(store.id, {
        email: "ada@shopper.test",
      });
      const row = await createSubscriptionRow(store, {
        customerId: customer.id,
        status: "incomplete",
        stripeSubscriptionId: null,
        stripeCustomerId: null,
      });

      await expectReceived(await complete(store, row));

      expect(stripeMocks.subscriptionsRetrieve).toHaveBeenCalledTimes(1);
      const args = stripeMocks.subscriptionsRetrieve.mock.calls[0]!;
      expect(args[0]).toBe("sub_live_1");
      expectScopedToAccount(args, ACCOUNT_ID);

      const after = await db.subscription.findUniqueOrThrow({
        where: { id: row.id },
      });
      expect(after.status).toBe("active");
      expect(after.stripeSubscriptionId).toBe("sub_live_1");
      expect(after.stripeCustomerId).toBe("cus_sub_1");
      expect(after.currentPeriodEnd).toEqual(new Date(PERIOD_END * 1000));
      expect(after.nextBillingAt).toEqual(new Date(PERIOD_END * 1000));
      expect(after.lastSyncedAt).toBeInstanceOf(Date);

      // The Stripe Customer is mirrored onto the local Customer for the
      // billing-portal deep link.
      const customerAfter = await db.customer.findUniqueOrThrow({
        where: { id: customer.id },
      });
      expect(customerAfter.stripeCustomerId).toBe("cus_sub_1");

      expect(emailCategories().sort()).toEqual([
        "subscription_owner_new",
        "subscription_started",
      ]);
      const started = emailsWithCategory("subscription_started")[0]!;
      expect(started.to).toBe("ada@shopper.test");
      expect(started.idempotencyKey).toBe(`sub-started-${row.id}`);
      const ownerNew = emailsWithCategory("subscription_owner_new")[0]!;
      expect(ownerNew.to).toBe(store.ownerEmail);

      // A subscription checkout NEVER produces an Order — the first Order
      // comes from `invoice.paid`.
      expect(await db.order.count()).toBe(0);
    });

    it("does not re-send the started emails on a redelivered event", async () => {
      const store = await setupStore();
      const row = await createSubscriptionRow(store, {
        status: "incomplete",
        stripeSubscriptionId: null,
      });

      await complete(store, row);
      emailMocks.sendEmail.mockClear();

      await expectReceived(await complete(store, row));

      expect(emailMocks.sendEmail).not.toHaveBeenCalled();
      expect(
        await db.subscription.count({ where: { businessId: store.id } }),
      ).toBe(1);
    });

    it("writes nothing when the event came from a different connected account", async () => {
      const store = await setupStore();
      const row = await createSubscriptionRow(store, {
        status: "incomplete",
        stripeSubscriptionId: null,
      });

      await expectReceived(
        await complete(store, row, { account: OTHER_ACCOUNT_ID }),
      );

      expect(stripeMocks.subscriptionsRetrieve).not.toHaveBeenCalled();
      expect(emailMocks.sendEmail).not.toHaveBeenCalled();
      const after = await db.subscription.findUniqueOrThrow({
        where: { id: row.id },
      });
      expect(after.status).toBe("incomplete");
      expect(after.stripeSubscriptionId).toBeNull();
    });

    it("still answers 200 when the row is gone", async () => {
      const store = await setupStore();
      stripeMocks.subscriptionsRetrieve.mockResolvedValue(
        makeStripeSubscription(),
      );
      const event = makeStripeEvent({
        type: "checkout.session.completed",
        object: makeSubscriptionSession({
          metadata: sessionMetadata(store, "sub_row_gone"),
        }),
        account: ACCOUNT_ID,
      });

      await expectReceived(await handleSubscriptionCheckoutCompleted(event));
      expect(emailMocks.sendEmail).not.toHaveBeenCalled();
    });

    it("still answers 200 when the Stripe retrieve throws", async () => {
      const store = await setupStore();
      const row = await createSubscriptionRow(store, {
        status: "incomplete",
        stripeSubscriptionId: null,
      });
      stripeMocks.subscriptionsRetrieve.mockRejectedValue(
        new Error("Stripe is down"),
      );
      const event = makeStripeEvent({
        type: "checkout.session.completed",
        object: makeSubscriptionSession({
          metadata: sessionMetadata(store, row.id),
        }),
        account: ACCOUNT_ID,
      });

      await expectReceived(await handleSubscriptionCheckoutCompleted(event));
      expect(sentryMocks.events.length).toBeGreaterThan(0);
      const after = await db.subscription.findUniqueOrThrow({
        where: { id: row.id },
      });
      expect(after.status).toBe("incomplete");
    });
  });

  describe("handleSubscriptionCheckoutExpired", () => {
    function expiredEvent(
      store: Store,
      rowId: string,
      account: string | null = ACCOUNT_ID,
    ) {
      return makeStripeEvent({
        type: "checkout.session.expired",
        object: makeSubscriptionSession({
          id: "cs_test_sub_expired",
          metadata: sessionMetadata(store, rowId),
          subscription: null,
        }),
        account,
      });
    }

    it("deletes an abandoned incomplete row", async () => {
      const store = await setupStore();
      const row = await createSubscriptionRow(store, {
        status: "incomplete",
        stripeSubscriptionId: null,
      });

      await expectReceived(
        await handleSubscriptionCheckoutExpired(expiredEvent(store, row.id)),
      );

      expect(
        await db.subscription.findUnique({ where: { id: row.id } }),
      ).toBeNull();
    });

    it("never sends the abandoned-checkout email, even for an opted-in store", async () => {
      const store = await setupStore();
      expect(store.sendAbandonedCheckoutEmails).toBe(true);
      const row = await createSubscriptionRow(store, {
        status: "incomplete",
        stripeSubscriptionId: null,
      });

      await handleSubscriptionCheckoutExpired(expiredEvent(store, row.id));

      expect(emailMocks.sendEmail).not.toHaveBeenCalled();
    });

    it("leaves a row alone once Stripe has attached a subscription to it", async () => {
      const store = await setupStore();
      const row = await createSubscriptionRow(store, {
        status: "active",
        stripeSubscriptionId: "sub_live_1",
      });

      await expectReceived(
        await handleSubscriptionCheckoutExpired(expiredEvent(store, row.id)),
      );

      const after = await db.subscription.findUniqueOrThrow({
        where: { id: row.id },
      });
      expect(after.status).toBe("active");
    });

    it("writes nothing for a spoofed account", async () => {
      const store = await setupStore();
      const row = await createSubscriptionRow(store, {
        status: "incomplete",
        stripeSubscriptionId: null,
      });

      await expectReceived(
        await handleSubscriptionCheckoutExpired(
          expiredEvent(store, row.id, OTHER_ACCOUNT_ID),
        ),
      );

      expect(
        await db.subscription.findUnique({ where: { id: row.id } }),
      ).not.toBeNull();
    });
  });

  describe("handleInvoicePaid", () => {
    async function paid(
      store: Store,
      row: { id: string },
      opts: {
        account?: string | null;
        invoiceId?: string;
        eventInvoice?: Stripe.Invoice;
        productId?: string | null;
        stripeSub?: Stripe.Subscription;
      } = {},
    ) {
      const invoiceId = opts.invoiceId ?? "in_test_paid_1";
      const metadata = subMetadata(store, row.id, opts.productId ?? null);
      // The event copy has no `payments`; the handler must re-retrieve with
      // `expand: ["payments"]` to reach the PaymentIntent.
      const eventInvoice =
        opts.eventInvoice ??
        makeStripeInvoice({ id: invoiceId, metadata, withPayments: false });
      stripeMocks.invoicesRetrieve.mockResolvedValue(
        makeStripeInvoice({ id: invoiceId, metadata }),
      );
      stripeMocks.subscriptionsRetrieve.mockResolvedValue(
        opts.stripeSub ?? makeStripeSubscription({ metadata }),
      );

      const event = makeStripeEvent({
        type: "invoice.paid",
        object: eventInvoice,
        account: opts.account === undefined ? ACCOUNT_ID : opts.account,
      });
      return handleInvoicePaid(event);
    }

    it("is a no-op for an invoice that is not a subscription invoice", async () => {
      await setupStore();
      const event = makeStripeEvent({
        type: "invoice.paid",
        object: makeStripeInvoice({ id: "in_oneoff", standalone: true }),
        account: ACCOUNT_ID,
      });

      await expectReceived(await handleInvoicePaid(event));

      expect(await db.order.count()).toBe(0);
      expect(stripeMocks.invoicesRetrieve).not.toHaveBeenCalled();
      expect(stripeMocks.subscriptionsRetrieve).not.toHaveBeenCalled();
      expect(emailMocks.sendEmail).not.toHaveBeenCalled();
    });

    it("creates the order and refreshes the row", async () => {
      const store = await setupStore();
      const customer = await createCustomer(store.id, {
        email: "ada@shopper.test",
      });
      const product = await createProduct(store.id, {
        name: "Twelve-Pack",
        price: 2400,
        inventoryQty: 40,
      });
      const row = await createSubscriptionRow(store, {
        customerId: customer.id,
        productId: product.id,
        status: "past_due",
        lastPaymentFailedAt: new Date("2026-08-20T00:00:00.000Z"),
      });

      await expectReceived(await paid(store, row, { productId: product.id }));

      const retrieveArgs = stripeMocks.invoicesRetrieve.mock.calls[0]!;
      expect(retrieveArgs[0]).toBe("in_test_paid_1");
      expect(retrieveArgs[1]).toEqual({ expand: ["payments"] });
      expectScopedToAccount(retrieveArgs, ACCOUNT_ID);

      const orders = await db.order.findMany({
        where: { businessId: store.id },
        include: { items: true },
      });
      expect(orders).toHaveLength(1);
      expect(orders[0]!.stripeInvoiceId).toBe("in_test_paid_1");
      expect(orders[0]!.stripePaymentIntentId).toBe("pi_test_inv_1");
      expect(orders[0]!.stripeSessionId).toBeNull();
      expect(orders[0]!.subscriptionId).toBe(row.id);
      expect(orders[0]!.items).toHaveLength(1);

      const after = await db.subscription.findUniqueOrThrow({
        where: { id: row.id },
      });
      expect(after.lastInvoiceId).toBe("in_test_paid_1");
      expect(after.status).toBe("active");
      expect(after.lastPaymentFailedAt).toBeNull();
      expect(after.currentPeriodEnd).toEqual(new Date(PERIOD_END * 1000));

      expect(emailCategories()).toContain("order_confirmation");
      expect(emailCategories()).toContain("new_order_owner");
    });

    it("creates exactly one order for a redelivered invoice.paid", async () => {
      const store = await setupStore();
      const product = await createProduct(store.id, {
        name: "Twelve-Pack",
        price: 2400,
        inventoryQty: 40,
      });
      const row = await createSubscriptionRow(store, {
        productId: product.id,
      });

      await paid(store, row, { productId: product.id });
      emailMocks.sendEmail.mockClear();
      await expectReceived(await paid(store, row, { productId: product.id }));

      expect(await db.order.count({ where: { businessId: store.id } })).toBe(1);
      expect(emailsWithCategory("order_confirmation")).toHaveLength(0);
      const productAfter = await db.product.findUniqueOrThrow({
        where: { id: product.id },
      });
      expect(productAfter.inventoryQty).toBe(38);
    });

    it("self-heals when invoice.paid lands before checkout.session.completed", async () => {
      const store = await setupStore();
      const customer = await createCustomer(store.id, {
        email: "ada@shopper.test",
      });
      const product = await createProduct(store.id, {
        name: "Twelve-Pack",
        price: 2400,
        inventoryQty: 40,
      });
      // Stripe does not guarantee ordering: the row can still be `incomplete`
      // with no `stripeSubscriptionId` when the first invoice is already paid.
      const row = await createSubscriptionRow(store, {
        customerId: customer.id,
        productId: product.id,
        status: "incomplete",
        stripeSubscriptionId: null,
        stripeCustomerId: null,
      });

      await expectReceived(await paid(store, row, { productId: product.id }));

      const after = await db.subscription.findUniqueOrThrow({
        where: { id: row.id },
      });
      expect(after.stripeSubscriptionId).toBe("sub_test_1");
      expect(after.status).toBe("active");
      expect(await db.order.count({ where: { businessId: store.id } })).toBe(1);

      // The "welcome" emails are owed exactly once, and this handler is the
      // one that discovered the activation, so it sends them.
      expect(emailsWithCategory("subscription_started")).toHaveLength(1);
      expect(
        emailsWithCategory("subscription_started")[0]!.idempotencyKey,
      ).toBe(`sub-started-${row.id}`);
      expect(emailsWithCategory("subscription_owner_new")).toHaveLength(1);

      // …and the late `checkout.session.completed` must not send them again.
      emailMocks.sendEmail.mockClear();
      stripeMocks.subscriptionsRetrieve.mockResolvedValue(
        makeStripeSubscription(),
      );
      await expectReceived(
        await handleSubscriptionCheckoutCompleted(
          makeStripeEvent({
            type: "checkout.session.completed",
            object: makeSubscriptionSession({
              metadata: sessionMetadata(store, row.id),
            }),
            account: ACCOUNT_ID,
          }),
        ),
      );
      expect(emailsWithCategory("subscription_started")).toHaveLength(0);
      expect(emailsWithCategory("subscription_owner_new")).toHaveLength(0);
    });

    it("creates no order for a spoofed connected account", async () => {
      const store = await setupStore();
      const product = await createProduct(store.id, { inventoryQty: 40 });
      const row = await createSubscriptionRow(store, {
        productId: product.id,
      });

      await expectReceived(
        await paid(store, row, {
          productId: product.id,
          account: OTHER_ACCOUNT_ID,
        }),
      );

      expect(await db.order.count()).toBe(0);
      expect(stripeMocks.invoicesRetrieve).not.toHaveBeenCalled();
      expect(emailMocks.sendEmail).not.toHaveBeenCalled();
    });

    it("answers 200 and creates nothing when the metadata snapshot is missing", async () => {
      const store = await setupStore();
      await createSubscriptionRow(store);
      const event = makeStripeEvent({
        type: "invoice.paid",
        object: makeStripeInvoice({ id: "in_nometa", metadata: null }),
        account: ACCOUNT_ID,
      });

      await expectReceived(await handleInvoicePaid(event));
      expect(await db.order.count()).toBe(0);
    });
  });

  describe("handleInvoicePaymentFailed", () => {
    function failedEvent(
      store: Store,
      rowId: string,
      attemptCount: number,
      invoiceId = "in_test_failed_1",
    ) {
      return makeStripeEvent({
        type: "invoice.payment_failed",
        object: makeStripeInvoice({
          id: invoiceId,
          metadata: subMetadata(store, rowId, null),
          attemptCount,
          amountPaid: 0,
        }),
        account: ACCOUNT_ID,
      });
    }

    it("marks the row past_due and emails the customer once per attempt", async () => {
      const store = await setupStore();
      const row = await createSubscriptionRow(store);

      await expectReceived(
        await handleInvoicePaymentFailed(failedEvent(store, row.id, 1)),
      );

      const after = await db.subscription.findUniqueOrThrow({
        where: { id: row.id },
      });
      expect(after.status).toBe("past_due");
      expect(after.lastPaymentFailedAt).toBeInstanceOf(Date);

      expect(emailCategories()).toEqual(["subscription_payment_failed"]);
      expect(
        emailsWithCategory("subscription_payment_failed")[0]!.idempotencyKey,
      ).toBe("sub-pay-failed-in_test_failed_1-1");

      // Stripe's second dunning attempt is a NEW notification, so it needs a
      // new idempotency key — otherwise Resend silently swallows it.
      await handleInvoicePaymentFailed(failedEvent(store, row.id, 2));
      const keys = emailsWithCategory("subscription_payment_failed").map(
        (call) => call.idempotencyKey,
      );
      expect(keys).toEqual([
        "sub-pay-failed-in_test_failed_1-1",
        "sub-pay-failed-in_test_failed_1-2",
      ]);
    });

    it("creates no order and writes nothing for a spoofed account", async () => {
      const store = await setupStore();
      const row = await createSubscriptionRow(store);
      const event = makeStripeEvent({
        type: "invoice.payment_failed",
        object: makeStripeInvoice({
          id: "in_spoof",
          metadata: subMetadata(store, row.id, null),
          amountPaid: 0,
        }),
        account: OTHER_ACCOUNT_ID,
      });

      await expectReceived(await handleInvoicePaymentFailed(event));

      const after = await db.subscription.findUniqueOrThrow({
        where: { id: row.id },
      });
      expect(after.status).toBe("active");
      expect(after.lastPaymentFailedAt).toBeNull();
      expect(emailMocks.sendEmail).not.toHaveBeenCalled();
      expect(await db.order.count()).toBe(0);
    });
  });

  describe("handleSubscriptionUpdated", () => {
    function updatedEvent(
      store: Store,
      rowId: string,
      sub: Stripe.Subscription,
      account: string | null = ACCOUNT_ID,
    ) {
      return makeStripeEvent({
        type: "customer.subscription.updated",
        object: {
          ...sub,
          metadata: subMetadata(store, rowId, null),
        } as unknown as Stripe.Subscription,
        account,
      });
    }

    it("applies state without emailing when the derived status is unchanged", async () => {
      const store = await setupStore();
      const row = await createSubscriptionRow(store, { status: "active" });

      await expectReceived(
        await handleSubscriptionUpdated(
          updatedEvent(store, row.id, makeStripeSubscription()),
        ),
      );

      const after = await db.subscription.findUniqueOrThrow({
        where: { id: row.id },
      });
      expect(after.status).toBe("active");
      expect(after.currentPeriodEnd).toEqual(new Date(PERIOD_END * 1000));
      expect(after.lastSyncedAt).toBeInstanceOf(Date);
      expect(emailMocks.sendEmail).not.toHaveBeenCalled();
    });

    it("emails on active → paused", async () => {
      const store = await setupStore();
      const row = await createSubscriptionRow(store, { status: "active" });

      await expectReceived(
        await handleSubscriptionUpdated(
          updatedEvent(
            store,
            row.id,
            makeStripeSubscription({
              pauseCollection: { behavior: "void", resumes_at: null },
            }),
          ),
        ),
      );

      const after = await db.subscription.findUniqueOrThrow({
        where: { id: row.id },
      });
      expect(after.status).toBe("paused");
      expect(emailCategories()).toEqual(["subscription_updated"]);
      expect(emailsWithCategory("subscription_updated")[0]!.to).toBe(
        "ada@shopper.test",
      );
    });

    it("emails on paused → active", async () => {
      const store = await setupStore();
      const row = await createSubscriptionRow(store, { status: "paused" });

      await expectReceived(
        await handleSubscriptionUpdated(
          updatedEvent(store, row.id, makeStripeSubscription()),
        ),
      );

      const after = await db.subscription.findUniqueOrThrow({
        where: { id: row.id },
      });
      expect(after.status).toBe("active");
      expect(emailCategories()).toEqual(["subscription_updated"]);
    });

    it("does NOT email on past_due → active (invoice.paid owns recovery)", async () => {
      const store = await setupStore();
      const row = await createSubscriptionRow(store, { status: "past_due" });

      await expectReceived(
        await handleSubscriptionUpdated(
          updatedEvent(store, row.id, makeStripeSubscription()),
        ),
      );

      const after = await db.subscription.findUniqueOrThrow({
        where: { id: row.id },
      });
      expect(after.status).toBe("active");
      expect(emailMocks.sendEmail).not.toHaveBeenCalled();
    });

    it("writes nothing for a spoofed account", async () => {
      const store = await setupStore();
      const row = await createSubscriptionRow(store, { status: "active" });

      await expectReceived(
        await handleSubscriptionUpdated(
          updatedEvent(
            store,
            row.id,
            makeStripeSubscription({
              pauseCollection: { behavior: "void", resumes_at: null },
            }),
            OTHER_ACCOUNT_ID,
          ),
        ),
      );

      const after = await db.subscription.findUniqueOrThrow({
        where: { id: row.id },
      });
      expect(after.status).toBe("active");
      expect(emailMocks.sendEmail).not.toHaveBeenCalled();
    });
  });

  describe("handleSubscriptionDeleted", () => {
    function deletedEvent(
      store: Store,
      rowId: string,
      account: string | null = ACCOUNT_ID,
    ) {
      return makeStripeEvent({
        type: "customer.subscription.deleted",
        object: makeStripeSubscription({
          status: "canceled",
          canceledAt: Math.floor(
            new Date("2026-09-02T00:00:00.000Z").getTime() / 1000,
          ),
          metadata: subMetadata(store, rowId, null),
        }),
        account,
      });
    }

    it("cancels the row, stamps 'stripe' as the reason and emails both parties", async () => {
      const store = await setupStore();
      const row = await createSubscriptionRow(store, { status: "active" });

      await expectReceived(
        await handleSubscriptionDeleted(deletedEvent(store, row.id)),
      );

      const after = await db.subscription.findUniqueOrThrow({
        where: { id: row.id },
      });
      expect(after.status).toBe("cancelled");
      expect(after.cancelledAt).toBeInstanceOf(Date);
      expect(after.cancelReason).toBe("stripe");

      expect(emailCategories().sort()).toEqual([
        "subscription_cancelled",
        "subscription_owner_cancelled",
      ]);
      expect(
        emailsWithCategory("subscription_cancelled")[0]!.idempotencyKey,
      ).toBe(`sub-cancelled-${row.id}`);
      expect(emailsWithCategory("subscription_owner_cancelled")[0]!.to).toBe(
        store.ownerEmail,
      );
    });

    it("keeps a cancelReason that SimplePress already recorded", async () => {
      const store = await setupStore();
      const row = await createSubscriptionRow(store, {
        status: "active",
        cancelReason: "customer",
      });

      await handleSubscriptionDeleted(deletedEvent(store, row.id));

      const after = await db.subscription.findUniqueOrThrow({
        where: { id: row.id },
      });
      expect(after.cancelReason).toBe("customer");
    });

    it("does not re-email an already-cancelled row", async () => {
      const store = await setupStore();
      const row = await createSubscriptionRow(store, {
        status: "cancelled",
        cancelReason: "customer",
        cancelledAt: new Date("2026-09-01T00:00:00.000Z"),
      });

      await expectReceived(
        await handleSubscriptionDeleted(deletedEvent(store, row.id)),
      );

      expect(emailMocks.sendEmail).not.toHaveBeenCalled();
      const after = await db.subscription.findUniqueOrThrow({
        where: { id: row.id },
      });
      expect(after.cancelledAt).toEqual(new Date("2026-09-01T00:00:00.000Z"));
    });

    it("writes nothing for a spoofed account", async () => {
      const store = await setupStore();
      const row = await createSubscriptionRow(store, { status: "active" });

      await expectReceived(
        await handleSubscriptionDeleted(
          deletedEvent(store, row.id, OTHER_ACCOUNT_ID),
        ),
      );

      const after = await db.subscription.findUniqueOrThrow({
        where: { id: row.id },
      });
      expect(after.status).toBe("active");
      expect(emailMocks.sendEmail).not.toHaveBeenCalled();
    });
  });

  describe("handleInvoiceVoided", () => {
    it("acknowledges without writing or emailing (a skipped delivery)", async () => {
      const store = await setupStore();
      const row = await createSubscriptionRow(store, { status: "paused" });

      const event = makeStripeEvent({
        type: "invoice.voided",
        object: makeStripeInvoice({
          id: "in_test_voided",
          metadata: subMetadata(store, row.id, null),
          amountPaid: 0,
        }),
        account: ACCOUNT_ID,
      });

      await expectReceived(await handleInvoiceVoided(event));

      const after = await db.subscription.findUniqueOrThrow({
        where: { id: row.id },
      });
      expect(after.status).toBe("paused");
      expect(after.lastInvoiceId).toBeNull();
      expect(after.updatedAt.getTime()).toBe(row.updatedAt.getTime());
      expect(await db.order.count()).toBe(0);
      expect(emailMocks.sendEmail).not.toHaveBeenCalled();
    });
  });
});
