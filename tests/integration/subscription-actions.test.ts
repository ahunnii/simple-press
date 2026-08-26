import type { Prisma, Subscription } from "generated/prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  cancelSubscription,
  pauseSubscription,
  resumeSubscription,
  skipNextDelivery,
  SubscriptionActionError,
} from "~/lib/subscriptions/actions";
import {
  ensureStripeCustomer,
  upsertLocalCustomer,
} from "~/lib/subscriptions/customer";
import { createPaymentMethodUpdateUrl } from "~/lib/subscriptions/portal";

import { db, resetDb } from "../helpers/db";
import { createBusiness, createUser } from "../helpers/factories";

/**
 * RED (test-first) contract for the three server-side subscription modules
 * that talk to Stripe outside the webhook:
 *
 *  - `src/lib/subscriptions/actions.ts`  — cancel / pause / resume / skip
 *  - `src/lib/subscriptions/portal.ts`   — the "update payment method" deep link
 *  - `src/lib/subscriptions/customer.ts` — local Customer upsert + Stripe Customer
 *
 * These are shared by the storefront manage page (token-scoped), the account
 * page, and the admin, so every one of them takes `businessId` and must treat
 * a row from another tenant as if it did not exist. That is asserted per
 * action, not once.
 *
 * Stripe argument shapes are asserted EXACTLY, including the third
 * `{ stripeAccount }` option — omitting it silently operates on the platform
 * account instead of the store's, which is the failure mode that is hardest to
 * notice and worst to discover in production.
 */

const ACCOUNT_ID = "acct_test_subactions";

const stripeMocks = vi.hoisted(() => ({
  subscriptionsCancel: vi.fn(),
  subscriptionsUpdate: vi.fn(),
  customersCreate: vi.fn(),
  customersUpdate: vi.fn(),
  portalConfigurationsCreate: vi.fn(),
  portalSessionsCreate: vi.fn(),
}));
vi.mock("~/lib/stripe/client", () => ({
  stripeClient: {
    subscriptions: {
      cancel: (...args: unknown[]): unknown =>
        stripeMocks.subscriptionsCancel(...args),
      update: (...args: unknown[]): unknown =>
        stripeMocks.subscriptionsUpdate(...args),
    },
    customers: {
      create: (...args: unknown[]): unknown =>
        stripeMocks.customersCreate(...args),
      update: (...args: unknown[]): unknown =>
        stripeMocks.customersUpdate(...args),
    },
    billingPortal: {
      configurations: {
        create: (...args: unknown[]): unknown =>
          stripeMocks.portalConfigurationsCreate(...args),
      },
      sessions: {
        create: (...args: unknown[]): unknown =>
          stripeMocks.portalSessionsCreate(...args),
      },
    },
  },
}));

// Mocked at the single `sendEmail` chokepoint (not at `templates.ts`) so the
// real helpers still run and the Resend `category` tag each one attaches — the
// discriminator Sentry reads — can be asserted. Same pattern as
// tests/integration/stripe-webhook-one-time.test.ts.
const emailMocks = vi.hoisted(() => ({ sendEmail: vi.fn() }));
vi.mock("~/lib/email/send", () => ({
  sendEmail: (...args: unknown[]): unknown => emailMocks.sendEmail(...args),
  EMAIL_FROM: {
    NOREPLY: "noreply@test.dev",
    ORDERS: "orders@test.dev",
    SUPPORT: "support@test.dev",
  },
}));

// Same shape as tests/integration/subscription-sync.test.ts's Sentry mock —
// just `captureException`, since `bestEffort()` in `actions.ts` never
// escalates past a single tagged capture.
const sentryMocks = vi.hoisted(() => ({
  captureException: vi.fn(),
}));
vi.mock("@sentry/nextjs", () => ({
  captureException: (...args: unknown[]): unknown =>
    sentryMocks.captureException(...args),
}));

/* ------------------------------------------------------------------ *
 * Fixtures (inline — tests/helpers/factories.ts is deliberately untouched)
 * ------------------------------------------------------------------ */

type EmailCall = {
  to: string | string[];
  tags?: { name: string; value: string }[];
};

function emailCalls(): EmailCall[] {
  return emailMocks.sendEmail.mock.calls.map((call) => call[0] as EmailCall);
}

/** The `category` tag of every email sent so far, in order. */
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

async function createStore(
  opts: { subdomain?: string; stripeAccountId?: string | null } = {},
) {
  const created = await createBusiness({
    subdomain: opts.subdomain ?? "subact-biz",
  });
  return db.business.update({
    where: { id: created.id },
    data: {
      // Business.stripeAccountId is @unique, so a second store created with an
      // explicit subdomain gets its own derived account id.
      stripeAccountId:
        opts.stripeAccountId === undefined
          ? opts.subdomain
            ? `${ACCOUNT_ID}_${opts.subdomain}`
            : ACCOUNT_ID
          : opts.stripeAccountId,
      featureFlags: {
        subscriptions: true,
        products: true,
        payments: true,
      } as Prisma.InputJsonValue,
    },
  });
}

const PERIOD_END = new Date("2026-09-15T12:00:00.000Z");
/**
 * Skip pauses collection until `SKIP_RESUME_BUFFER_MS` (12h) past the current
 * period end — long enough to clear Stripe's ~1h draft→finalize window, so the
 * invoice generated at the boundary is definitely voided rather than
 * collected, and still far inside the shortest cadence (one week).
 */
const PERIOD_END_PLUS_BUFFER = new Date("2026-09-16T00:00:00.000Z");

function createSubscriptionRow(
  businessId: string,
  opts: {
    status?: string;
    stripeSubscriptionId?: string | null;
    stripeCustomerId?: string | null;
    intervalKey?: string;
    interval?: string;
    intervalCount?: number;
    currentPeriodEnd?: Date | null;
    pauseResumesAt?: Date | null;
    customerEmail?: string;
    customerId?: string | null;
  } = {},
) {
  return db.subscription.create({
    data: {
      businessId,
      customerEmail: opts.customerEmail ?? "shopper@example.com",
      customerName: "Ada Lovelace",
      customerId: opts.customerId ?? null,
      stripeSubscriptionId:
        opts.stripeSubscriptionId === undefined
          ? "sub_stripe_1"
          : opts.stripeSubscriptionId,
      stripeCustomerId:
        opts.stripeCustomerId === undefined
          ? "cus_test_1"
          : opts.stripeCustomerId,
      productName: "Ultra Soft 12-pack",
      variantName: "12-pack",
      sku: "TP-12",
      quantity: 2,
      intervalKey: opts.intervalKey ?? "month:1",
      interval: opts.interval ?? "month",
      intervalCount: opts.intervalCount ?? 1,
      listPriceCents: 1099,
      discountPercent: 10,
      unitAmountCents: 989,
      shippingCents: 800,
      deliveryMethod: "ship",
      status: opts.status ?? "active",
      currentPeriodStart: new Date("2026-08-15T12:00:00.000Z"),
      currentPeriodEnd:
        opts.currentPeriodEnd === undefined
          ? PERIOD_END
          : opts.currentPeriodEnd,
      nextBillingAt:
        opts.currentPeriodEnd === undefined
          ? PERIOD_END
          : opts.currentPeriodEnd,
      pauseResumesAt: opts.pauseResumesAt ?? null,
    },
  });
}

/** Runs `fn` and returns the SubscriptionActionError it threw (fails if it didn't). */
async function actionError(fn: () => Promise<unknown>): Promise<unknown> {
  try {
    await fn();
  } catch (err) {
    return err;
  }
  throw new Error("expected the action to throw a SubscriptionActionError");
}

function unix(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

beforeEach(async () => {
  await resetDb();
  for (const mock of Object.values(stripeMocks)) mock.mockReset();
  emailMocks.sendEmail.mockReset();
  emailMocks.sendEmail.mockResolvedValue({ success: true });
  sentryMocks.captureException.mockClear();

  stripeMocks.subscriptionsCancel.mockImplementation(async (id: string) => ({
    id,
    status: "canceled",
  }));
  stripeMocks.subscriptionsUpdate.mockImplementation(async (id: string) => ({
    id,
    status: "active",
  }));
  stripeMocks.customersCreate.mockResolvedValue({ id: "cus_created_1" });
  stripeMocks.customersUpdate.mockImplementation(async (id: string) => ({
    id,
  }));
  stripeMocks.portalConfigurationsCreate.mockResolvedValue({
    id: "bpc_test_1",
  });
  stripeMocks.portalSessionsCreate.mockResolvedValue({
    id: "bps_test_1",
    url: "https://billing.stripe.test/session/bps_test_1",
  });
});

/* ------------------------------------------------------------------ *
 * cancelSubscription
 * ------------------------------------------------------------------ */

describe("cancelSubscription", () => {
  it("cancels at Stripe on the connected account, marks the row, and emails customer + owner", async () => {
    const business = await createStore();
    const row = await createSubscriptionRow(business.id);

    const updated: Subscription = await cancelSubscription(db, {
      businessId: business.id,
      subscriptionId: row.id,
      reason: "customer",
    });

    expect(stripeMocks.subscriptionsCancel).toHaveBeenCalledTimes(1);
    expect(stripeMocks.subscriptionsCancel).toHaveBeenCalledWith(
      "sub_stripe_1",
      {},
      { stripeAccount: ACCOUNT_ID },
    );

    expect(updated).toMatchObject({
      id: row.id,
      status: "cancelled",
      cancelReason: "customer",
    });
    expect(updated.cancelledAt).toBeInstanceOf(Date);

    const stored = await db.subscription.findUniqueOrThrow({
      where: { id: row.id },
    });
    expect(stored.status).toBe("cancelled");
    expect(stored.cancelReason).toBe("customer");
    expect(stored.cancelledAt).toBeInstanceOf(Date);

    expect(emailCategories()).toEqual(
      expect.arrayContaining([
        "subscription_cancelled",
        "subscription_owner_cancelled",
      ]),
    );
    expect(emailWithCategory("subscription_cancelled")?.to).toBe(
      "shopper@example.com",
    );
    expect(emailWithCategory("subscription_owner_cancelled")?.to).toBe(
      business.ownerEmail,
    );
  });

  it("still cancels when the notification email throws — reports to Sentry instead of throwing", async () => {
    const business = await createStore();
    const row = await createSubscriptionRow(business.id);
    emailMocks.sendEmail.mockRejectedValueOnce(new Error("resend is down"));

    const updated = await cancelSubscription(db, {
      businessId: business.id,
      subscriptionId: row.id,
      reason: "customer",
    });

    // The state change and the Stripe call already committed by the time the
    // email is attempted — a Resend outage must not turn a successful
    // cancellation into a thrown error.
    expect(updated.status).toBe("cancelled");
    const stored = await db.subscription.findUniqueOrThrow({
      where: { id: row.id },
    });
    expect(stored.status).toBe("cancelled");

    expect(sentryMocks.captureException).toHaveBeenCalledTimes(1);
    expect(sentryMocks.captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        tags: expect.objectContaining({
          service: "stripe",
          "subscription.step": "cancel-email",
          businessId: business.id,
        }) as unknown,
      }),
    );
  });

  it("records reason 'owner' when the store cancels", async () => {
    const business = await createStore();
    const row = await createSubscriptionRow(business.id);

    await cancelSubscription(db, {
      businessId: business.id,
      subscriptionId: row.id,
      reason: "owner",
    });

    const stored = await db.subscription.findUniqueOrThrow({
      where: { id: row.id },
    });
    expect(stored.cancelReason).toBe("owner");
  });

  it("cancels a still-incomplete row locally, with no Stripe call", async () => {
    const business = await createStore();
    const row = await createSubscriptionRow(business.id, {
      status: "incomplete",
      stripeSubscriptionId: null,
    });

    await cancelSubscription(db, {
      businessId: business.id,
      subscriptionId: row.id,
      reason: "customer",
    });

    expect(stripeMocks.subscriptionsCancel).not.toHaveBeenCalled();
    const stored = await db.subscription.findUniqueOrThrow({
      where: { id: row.id },
    });
    expect(stored.status).toBe("cancelled");
  });

  it("invalid_state when it is already cancelled (no Stripe call, no email)", async () => {
    const business = await createStore();
    const row = await createSubscriptionRow(business.id, {
      status: "cancelled",
    });

    const err = await actionError(() =>
      cancelSubscription(db, {
        businessId: business.id,
        subscriptionId: row.id,
        reason: "customer",
      }),
    );

    expect(err).toBeInstanceOf(SubscriptionActionError);
    expect(err).toMatchObject({ code: "invalid_state" });
    expect(stripeMocks.subscriptionsCancel).not.toHaveBeenCalled();
    expect(emailMocks.sendEmail).not.toHaveBeenCalled();
  });

  it("not_found for an unknown subscription id", async () => {
    const business = await createStore();

    const err = await actionError(() =>
      cancelSubscription(db, {
        businessId: business.id,
        subscriptionId: "sub_does_not_exist",
        reason: "owner",
      }),
    );

    expect(err).toBeInstanceOf(SubscriptionActionError);
    expect(err).toMatchObject({ code: "not_found" });
    expect(stripeMocks.subscriptionsCancel).not.toHaveBeenCalled();
  });

  it("not_found for a real subscription id scoped to a DIFFERENT business", async () => {
    const storeA = await createStore({ subdomain: "store-a" });
    const storeB = await createStore({
      subdomain: "store-b",
      stripeAccountId: "acct_test_other",
    });
    const row = await createSubscriptionRow(storeA.id);

    const err = await actionError(() =>
      cancelSubscription(db, {
        businessId: storeB.id,
        subscriptionId: row.id,
        reason: "owner",
      }),
    );

    expect(err).toMatchObject({ code: "not_found" });
    expect(stripeMocks.subscriptionsCancel).not.toHaveBeenCalled();
    const stored = await db.subscription.findUniqueOrThrow({
      where: { id: row.id },
    });
    expect(stored.status).toBe("active");
  });
});

/* ------------------------------------------------------------------ *
 * pauseSubscription
 * ------------------------------------------------------------------ */

describe("pauseSubscription", () => {
  it("voids collection at Stripe and marks the row paused", async () => {
    const business = await createStore();
    const row = await createSubscriptionRow(business.id, {
      status: "active",
      pauseResumesAt: new Date("2026-12-01T00:00:00.000Z"),
    });

    const updated: Subscription = await pauseSubscription(db, {
      businessId: business.id,
      subscriptionId: row.id,
    });

    expect(stripeMocks.subscriptionsUpdate).toHaveBeenCalledTimes(1);
    expect(stripeMocks.subscriptionsUpdate).toHaveBeenCalledWith(
      "sub_stripe_1",
      { pause_collection: { behavior: "void" } },
      { stripeAccount: ACCOUNT_ID },
    );

    expect(updated).toMatchObject({ status: "paused", pauseResumesAt: null });
    const stored = await db.subscription.findUniqueOrThrow({
      where: { id: row.id },
    });
    expect(stored.status).toBe("paused");
    // An indefinite pause clears any leftover skip date.
    expect(stored.pauseResumesAt).toBeNull();

    expect(emailCategories()).toContain("subscription_updated");
    expect(emailWithCategory("subscription_updated")?.to).toBe(
      "shopper@example.com",
    );
  });

  it("is allowed from past_due", async () => {
    const business = await createStore();
    const row = await createSubscriptionRow(business.id, {
      status: "past_due",
    });

    await pauseSubscription(db, {
      businessId: business.id,
      subscriptionId: row.id,
    });

    const stored = await db.subscription.findUniqueOrThrow({
      where: { id: row.id },
    });
    expect(stored.status).toBe("paused");
  });

  it("still pauses when the notification email throws — reports to Sentry instead of throwing", async () => {
    const business = await createStore();
    const row = await createSubscriptionRow(business.id, { status: "active" });
    emailMocks.sendEmail.mockRejectedValueOnce(new Error("resend is down"));

    const updated = await pauseSubscription(db, {
      businessId: business.id,
      subscriptionId: row.id,
    });

    expect(updated.status).toBe("paused");
    expect(sentryMocks.captureException).toHaveBeenCalledTimes(1);
    expect(sentryMocks.captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        tags: expect.objectContaining({
          service: "stripe",
          "subscription.step": "pause-email",
          businessId: business.id,
        }) as unknown,
      }),
    );
  });

  it.each(["paused", "cancelled", "incomplete"])(
    "invalid_state from %s",
    async (status) => {
      const business = await createStore();
      const row = await createSubscriptionRow(business.id, { status });

      const err = await actionError(() =>
        pauseSubscription(db, {
          businessId: business.id,
          subscriptionId: row.id,
        }),
      );

      expect(err).toMatchObject({ code: "invalid_state" });
      expect(stripeMocks.subscriptionsUpdate).not.toHaveBeenCalled();
    },
  );

  it("not_connected when the store has no Stripe account (row untouched)", async () => {
    const business = await createStore({ stripeAccountId: null });
    const row = await createSubscriptionRow(business.id);

    const err = await actionError(() =>
      pauseSubscription(db, {
        businessId: business.id,
        subscriptionId: row.id,
      }),
    );

    expect(err).toBeInstanceOf(SubscriptionActionError);
    expect(err).toMatchObject({ code: "not_connected" });
    expect(stripeMocks.subscriptionsUpdate).not.toHaveBeenCalled();
    const stored = await db.subscription.findUniqueOrThrow({
      where: { id: row.id },
    });
    expect(stored.status).toBe("active");
  });

  it("not_found across tenants", async () => {
    const storeA = await createStore({ subdomain: "pause-a" });
    const storeB = await createStore({ subdomain: "pause-b" });
    const row = await createSubscriptionRow(storeA.id);

    const err = await actionError(() =>
      pauseSubscription(db, {
        businessId: storeB.id,
        subscriptionId: row.id,
      }),
    );

    expect(err).toMatchObject({ code: "not_found" });
  });
});

/* ------------------------------------------------------------------ *
 * resumeSubscription
 * ------------------------------------------------------------------ */

describe("resumeSubscription", () => {
  it("clears pause_collection with the empty string and reactivates the row", async () => {
    const business = await createStore();
    const row = await createSubscriptionRow(business.id, {
      status: "paused",
      pauseResumesAt: PERIOD_END_PLUS_BUFFER,
    });

    const updated: Subscription = await resumeSubscription(db, {
      businessId: business.id,
      subscriptionId: row.id,
    });

    // Stripe clears `pause_collection` with the EMPTY STRING, not null.
    expect(stripeMocks.subscriptionsUpdate).toHaveBeenCalledWith(
      "sub_stripe_1",
      { pause_collection: "" },
      { stripeAccount: ACCOUNT_ID },
    );

    expect(updated).toMatchObject({ status: "active", pauseResumesAt: null });
    const stored = await db.subscription.findUniqueOrThrow({
      where: { id: row.id },
    });
    expect(stored.status).toBe("active");
    expect(stored.pauseResumesAt).toBeNull();
    expect(emailCategories()).toContain("subscription_updated");
  });

  it("still resumes when the notification email throws — reports to Sentry instead of throwing", async () => {
    const business = await createStore();
    const row = await createSubscriptionRow(business.id, {
      status: "paused",
      pauseResumesAt: PERIOD_END_PLUS_BUFFER,
    });
    emailMocks.sendEmail.mockRejectedValueOnce(new Error("resend is down"));

    const updated = await resumeSubscription(db, {
      businessId: business.id,
      subscriptionId: row.id,
    });

    expect(updated.status).toBe("active");
    expect(sentryMocks.captureException).toHaveBeenCalledTimes(1);
    expect(sentryMocks.captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        tags: expect.objectContaining({
          service: "stripe",
          "subscription.step": "resume-email",
          businessId: business.id,
        }) as unknown,
      }),
    );
  });

  it.each(["active", "past_due", "cancelled", "incomplete"])(
    "invalid_state from %s",
    async (status) => {
      const business = await createStore();
      const row = await createSubscriptionRow(business.id, { status });

      const err = await actionError(() =>
        resumeSubscription(db, {
          businessId: business.id,
          subscriptionId: row.id,
        }),
      );

      expect(err).toMatchObject({ code: "invalid_state" });
      expect(stripeMocks.subscriptionsUpdate).not.toHaveBeenCalled();
    },
  );

  it("not_found across tenants", async () => {
    const storeA = await createStore({ subdomain: "resume-a" });
    const storeB = await createStore({ subdomain: "resume-b" });
    const row = await createSubscriptionRow(storeA.id, { status: "paused" });

    const err = await actionError(() =>
      resumeSubscription(db, {
        businessId: storeB.id,
        subscriptionId: row.id,
      }),
    );

    expect(err).toMatchObject({ code: "not_found" });
  });
});

/* ------------------------------------------------------------------ *
 * skipNextDelivery
 * ------------------------------------------------------------------ */

describe("skipNextDelivery", () => {
  it("pauses until the skip buffer past the period end and advances nextBillingAt by one interval (month:1)", async () => {
    const business = await createStore();
    const row = await createSubscriptionRow(business.id, { status: "active" });

    const updated: Subscription = await skipNextDelivery(db, {
      businessId: business.id,
      subscriptionId: row.id,
      now: new Date("2026-09-01T00:00:00.000Z"),
    });

    expect(stripeMocks.subscriptionsUpdate).toHaveBeenCalledWith(
      "sub_stripe_1",
      {
        pause_collection: {
          behavior: "void",
          resumes_at: unix(PERIOD_END_PLUS_BUFFER),
        },
      },
      { stripeAccount: ACCOUNT_ID },
    );

    // Stripe still generates the next invoice, but voids it — so no
    // `invoice.paid`, and therefore no Order and no delivery.
    expect(updated.status).toBe("paused");
    expect(updated.pauseResumesAt?.toISOString()).toBe(
      PERIOD_END_PLUS_BUFFER.toISOString(),
    );
    expect(updated.nextBillingAt?.toISOString()).toBe(
      "2026-10-15T12:00:00.000Z",
    );

    const stored = await db.subscription.findUniqueOrThrow({
      where: { id: row.id },
    });
    expect(stored.status).toBe("paused");
    expect(stored.pauseResumesAt?.toISOString()).toBe(
      PERIOD_END_PLUS_BUFFER.toISOString(),
    );
    expect(stored.nextBillingAt?.toISOString()).toBe(
      "2026-10-15T12:00:00.000Z",
    );

    expect(emailCategories()).toContain("subscription_updated");
  });

  it("still skips when the notification email throws — reports to Sentry instead of throwing", async () => {
    const business = await createStore();
    const row = await createSubscriptionRow(business.id, { status: "active" });
    emailMocks.sendEmail.mockRejectedValueOnce(new Error("resend is down"));

    const updated = await skipNextDelivery(db, {
      businessId: business.id,
      subscriptionId: row.id,
      now: new Date("2026-09-01T00:00:00.000Z"),
    });

    expect(updated.status).toBe("paused");
    expect(sentryMocks.captureException).toHaveBeenCalledTimes(1);
    expect(sentryMocks.captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        tags: expect.objectContaining({
          service: "stripe",
          "subscription.step": "skip-email",
          businessId: business.id,
        }) as unknown,
      }),
    );
  });

  it("advances nextBillingAt by 14 days for a week:2 cadence", async () => {
    const business = await createStore();
    const row = await createSubscriptionRow(business.id, {
      status: "active",
      intervalKey: "week:2",
      interval: "week",
      intervalCount: 2,
    });

    const updated: Subscription = await skipNextDelivery(db, {
      businessId: business.id,
      subscriptionId: row.id,
    });

    expect(updated.nextBillingAt?.toISOString()).toBe(
      "2026-09-29T12:00:00.000Z",
    );
    expect(updated.pauseResumesAt?.toISOString()).toBe(
      PERIOD_END_PLUS_BUFFER.toISOString(),
    );
  });

  it("invalid_state when the row has no currentPeriodEnd yet", async () => {
    const business = await createStore();
    const row = await createSubscriptionRow(business.id, {
      status: "active",
      currentPeriodEnd: null,
    });

    const err = await actionError(() =>
      skipNextDelivery(db, {
        businessId: business.id,
        subscriptionId: row.id,
      }),
    );

    expect(err).toMatchObject({ code: "invalid_state" });
    expect(stripeMocks.subscriptionsUpdate).not.toHaveBeenCalled();
  });

  it.each(["paused", "past_due", "cancelled", "incomplete"])(
    "invalid_state from %s",
    async (status) => {
      const business = await createStore();
      const row = await createSubscriptionRow(business.id, { status });

      const err = await actionError(() =>
        skipNextDelivery(db, {
          businessId: business.id,
          subscriptionId: row.id,
        }),
      );

      expect(err).toMatchObject({ code: "invalid_state" });
      expect(stripeMocks.subscriptionsUpdate).not.toHaveBeenCalled();
    },
  );

  it("not_found across tenants", async () => {
    const storeA = await createStore({ subdomain: "skip-a" });
    const storeB = await createStore({ subdomain: "skip-b" });
    const row = await createSubscriptionRow(storeA.id);

    const err = await actionError(() =>
      skipNextDelivery(db, {
        businessId: storeB.id,
        subscriptionId: row.id,
      }),
    );

    expect(err).toMatchObject({ code: "not_found" });
  });
});

/* ------------------------------------------------------------------ *
 * portal.ts
 * ------------------------------------------------------------------ */

describe("createPaymentMethodUpdateUrl", () => {
  const RETURN_URL = "https://shop.example.com/subscriptions/tok123";

  it("lazily creates a payment-method-only configuration, caches it, and returns the session URL", async () => {
    const business = await createStore();

    const url = await createPaymentMethodUpdateUrl(db, {
      business: {
        id: business.id,
        stripeAccountId: ACCOUNT_ID,
        stripePortalConfigurationId: null,
      },
      subscription: { stripeCustomerId: "cus_test_1" },
      returnUrl: RETURN_URL,
    });

    expect(stripeMocks.portalConfigurationsCreate).toHaveBeenCalledTimes(1);
    const [configParams, configOptions] = stripeMocks.portalConfigurationsCreate
      .mock.calls[0] as [{ features: unknown }, Record<string, unknown>];
    // Payment-method update ONLY: the portal must not become a back door to
    // cancelling or re-pricing a subscription outside SimplePress, which would
    // leave the local row lying about its own state.
    expect(configParams.features).toEqual({
      payment_method_update: { enabled: true },
      invoice_history: { enabled: false },
      customer_update: { enabled: false },
      subscription_cancel: { enabled: false },
      subscription_update: { enabled: false },
    });
    expect(configOptions).toEqual({ stripeAccount: ACCOUNT_ID });

    expect(stripeMocks.portalSessionsCreate).toHaveBeenCalledTimes(1);
    const [sessionParams, sessionOptions] = stripeMocks.portalSessionsCreate
      .mock.calls[0] as [unknown, Record<string, unknown>];
    expect(sessionParams).toEqual({
      customer: "cus_test_1",
      configuration: "bpc_test_1",
      return_url: RETURN_URL,
      flow_data: {
        type: "payment_method_update",
        after_completion: {
          type: "redirect",
          redirect: { return_url: RETURN_URL },
        },
      },
    });
    expect(sessionOptions).toEqual({ stripeAccount: ACCOUNT_ID });

    expect(url).toBe("https://billing.stripe.test/session/bps_test_1");

    const stored = await db.business.findUniqueOrThrow({
      where: { id: business.id },
    });
    expect(stored.stripePortalConfigurationId).toBe("bpc_test_1");
  });

  it("reuses the cached configuration on a second call", async () => {
    const business = await createStore();

    await createPaymentMethodUpdateUrl(db, {
      business: {
        id: business.id,
        stripeAccountId: ACCOUNT_ID,
        stripePortalConfigurationId: null,
      },
      subscription: { stripeCustomerId: "cus_test_1" },
      returnUrl: RETURN_URL,
    });

    const refreshed = await db.business.findUniqueOrThrow({
      where: { id: business.id },
    });
    await createPaymentMethodUpdateUrl(db, {
      business: {
        id: refreshed.id,
        stripeAccountId: ACCOUNT_ID,
        stripePortalConfigurationId: refreshed.stripePortalConfigurationId,
      },
      subscription: { stripeCustomerId: "cus_test_1" },
      returnUrl: RETURN_URL,
    });

    expect(stripeMocks.portalConfigurationsCreate).toHaveBeenCalledTimes(1);
    expect(stripeMocks.portalSessionsCreate).toHaveBeenCalledTimes(2);
    const [secondParams] = stripeMocks.portalSessionsCreate.mock.calls[1] as [
      { configuration: string },
    ];
    expect(secondParams.configuration).toBe("bpc_test_1");
  });

  it("re-creates the configuration when the cached id belongs to a PREVIOUS connected account, and retries the session once", async () => {
    // Mirrors `ensureStripeCustomer`'s reconnect recovery in `customer.ts`:
    // `Business.stripePortalConfigurationId` is scoped to the business, not
    // to the Stripe account, so a disconnect + reconnect of a DIFFERENT
    // account leaves the cached id pointing at a Configuration that no
    // longer exists there.
    const business = await createStore();
    stripeMocks.portalSessionsCreate
      .mockRejectedValueOnce(
        Object.assign(new Error("No such configuration: 'bpc_stale'"), {
          type: "StripeInvalidRequestError",
          code: "resource_missing",
          statusCode: 404,
        }),
      )
      .mockResolvedValueOnce({
        id: "bps_test_2",
        url: "https://billing.stripe.test/session/bps_test_2",
      });

    const url = await createPaymentMethodUpdateUrl(db, {
      business: {
        id: business.id,
        stripeAccountId: ACCOUNT_ID,
        stripePortalConfigurationId: "bpc_stale",
      },
      subscription: { stripeCustomerId: "cus_test_1" },
      returnUrl: RETURN_URL,
    });

    expect(stripeMocks.portalConfigurationsCreate).toHaveBeenCalledTimes(1);
    expect(stripeMocks.portalConfigurationsCreate).toHaveBeenCalledWith(
      { features: expect.any(Object) as unknown },
      { stripeAccount: ACCOUNT_ID },
    );
    expect(stripeMocks.portalSessionsCreate).toHaveBeenCalledTimes(2);
    const [firstParams] = stripeMocks.portalSessionsCreate.mock.calls[0] as [
      { configuration: string },
    ];
    expect(firstParams.configuration).toBe("bpc_stale");
    const [secondParams] = stripeMocks.portalSessionsCreate.mock.calls[1] as [
      { configuration: string },
    ];
    expect(secondParams.configuration).toBe("bpc_test_1");

    expect(url).toBe("https://billing.stripe.test/session/bps_test_2");

    const stored = await db.business.findUniqueOrThrow({
      where: { id: business.id },
    });
    expect(stored.stripePortalConfigurationId).toBe("bpc_test_1");
  });

  it("does NOT re-create the configuration on a non-missing Stripe failure", async () => {
    const business = await createStore();
    stripeMocks.portalSessionsCreate.mockRejectedValueOnce(
      Object.assign(new Error("Too many requests"), {
        type: "StripeRateLimitError",
        statusCode: 429,
      }),
    );

    await expect(
      createPaymentMethodUpdateUrl(db, {
        business: {
          id: business.id,
          stripeAccountId: ACCOUNT_ID,
          stripePortalConfigurationId: "bpc_existing",
        },
        subscription: { stripeCustomerId: "cus_test_1" },
        returnUrl: RETURN_URL,
      }),
    ).rejects.toThrow(/Too many requests/);

    expect(stripeMocks.portalConfigurationsCreate).not.toHaveBeenCalled();
    expect(stripeMocks.portalSessionsCreate).toHaveBeenCalledTimes(1);
    const stored = await db.business.findUniqueOrThrow({
      where: { id: business.id },
    });
    // Unchanged: no fresh configuration was created or persisted.
    expect(stored.stripePortalConfigurationId).toBeNull();
  });
});

/* ------------------------------------------------------------------ *
 * customer.ts
 * ------------------------------------------------------------------ */

describe("upsertLocalCustomer", () => {
  it("normalizes the email, splits the name, and links a VERIFIED user", async () => {
    const business = await createStore();
    const user = await createUser({ email: "shopper@example.com" });

    const customer = await upsertLocalCustomer(db, {
      businessId: business.id,
      email: "  Shopper@Example.COM  ",
      name: "Ada Lovelace",
    });

    expect(customer).toMatchObject({
      businessId: business.id,
      email: "shopper@example.com",
      firstName: "Ada",
      lastName: "Lovelace",
      userId: user.id,
    });
    expect(await db.customer.count()).toBe(1);
  });

  it("does not link an unverified user", async () => {
    const business = await createStore();
    const user = await createUser({ email: "unverified@example.com" });
    await db.user.update({
      where: { id: user.id },
      data: { emailVerified: false },
    });

    const customer = await upsertLocalCustomer(db, {
      businessId: business.id,
      email: "unverified@example.com",
      name: "Grace Hopper",
    });

    expect(customer.userId).toBeNull();
  });

  it("upserts on (businessId, email): fills a MISSING name, never overwrites an existing one", async () => {
    const business = await createStore();
    await db.customer.create({
      data: {
        businessId: business.id,
        email: "shopper@example.com",
        firstName: "Grace",
        lastName: null,
      },
    });

    const customer = await upsertLocalCustomer(db, {
      businessId: business.id,
      email: "shopper@example.com",
      name: "Ada Lovelace",
    });

    expect(await db.customer.count()).toBe(1);
    // A shopper may order on someone else's behalf — an existing name is the
    // primary record and is never clobbered (same rule as the webhook's upsert).
    expect(customer.firstName).toBe("Grace");
    expect(customer.lastName).toBe("Lovelace");
  });

  it("keeps customers separate per business", async () => {
    const storeA = await createStore({ subdomain: "cust-a" });
    const storeB = await createStore({ subdomain: "cust-b" });

    const a = await upsertLocalCustomer(db, {
      businessId: storeA.id,
      email: "shopper@example.com",
      name: "Ada Lovelace",
    });
    const b = await upsertLocalCustomer(db, {
      businessId: storeB.id,
      email: "shopper@example.com",
      name: "Ada Lovelace",
    });

    expect(a.id).not.toBe(b.id);
    expect(await db.customer.count()).toBe(2);
  });
});

describe("ensureStripeCustomer", () => {
  const ADDRESS = {
    line1: "12 Main St",
    line2: null,
    city: "Detroit",
    state: "MI",
    postalCode: "48226",
    country: "US",
  };

  it("creates a Stripe Customer on the connected account and persists the id", async () => {
    const business = await createStore();
    const customer = await db.customer.create({
      data: { businessId: business.id, email: "shopper@example.com" },
    });

    const id = await ensureStripeCustomer(db, {
      business: { id: business.id, stripeAccountId: ACCOUNT_ID },
      customer,
      email: "shopper@example.com",
      name: "Ada Lovelace",
      phone: "+13135550142",
      address: ADDRESS,
    });

    expect(id).toBe("cus_created_1");
    expect(stripeMocks.customersUpdate).not.toHaveBeenCalled();
    const [params, options] = stripeMocks.customersCreate.mock.calls[0] as [
      Record<string, unknown>,
      Record<string, unknown>,
    ];
    expect(params).toMatchObject({
      email: "shopper@example.com",
      name: "Ada Lovelace",
      phone: "+13135550142",
      shipping: {
        name: "Ada Lovelace",
        phone: "+13135550142",
        address: {
          line1: "12 Main St",
          city: "Detroit",
          state: "MI",
          postal_code: "48226",
          country: "US",
        },
      },
      address: {
        line1: "12 Main St",
        city: "Detroit",
        state: "MI",
        postal_code: "48226",
        country: "US",
      },
    });
    expect(options).toEqual({ stripeAccount: ACCOUNT_ID });

    const stored = await db.customer.findUniqueOrThrow({
      where: { id: customer.id },
    });
    expect(stored.stripeCustomerId).toBe("cus_created_1");
  });

  it("omits shipping/address entirely when there is no address (pickup)", async () => {
    const business = await createStore();
    const customer = await db.customer.create({
      data: { businessId: business.id, email: "shopper@example.com" },
    });

    await ensureStripeCustomer(db, {
      business: { id: business.id, stripeAccountId: ACCOUNT_ID },
      customer,
      email: "shopper@example.com",
      name: "Ada Lovelace",
      phone: null,
      address: null,
    });

    const [params] = stripeMocks.customersCreate.mock.calls[0] as [
      Record<string, unknown>,
    ];
    expect(params).not.toHaveProperty("shipping");
    expect(params).not.toHaveProperty("address");
  });

  it("re-creates the Stripe Customer when the cached id belongs to a PREVIOUS connected account", async () => {
    // `Customer.stripeCustomerId` is scoped to the business, not to the Stripe
    // ACCOUNT — so an owner who disconnects Stripe and reconnects a different
    // account leaves every returning shopper pointing at a customer that no
    // longer exists there. Without recovery the update 404s, the route deletes
    // its placeholder row and 500s, and that shopper can never subscribe again.
    const business = await createStore();
    const customer = await db.customer.create({
      data: {
        businessId: business.id,
        email: "shopper@example.com",
        stripeCustomerId: "cus_from_old_account",
      },
    });
    stripeMocks.customersUpdate.mockRejectedValueOnce(
      Object.assign(new Error("No such customer: 'cus_from_old_account'"), {
        type: "StripeInvalidRequestError",
        code: "resource_missing",
        statusCode: 404,
      }),
    );

    const id = await ensureStripeCustomer(db, {
      business: { id: business.id, stripeAccountId: ACCOUNT_ID },
      customer,
      email: "shopper@example.com",
      name: "Ada Lovelace",
      phone: "+13135550142",
      address: ADDRESS,
    });

    expect(id).toBe("cus_created_1");
    expect(stripeMocks.customersCreate).toHaveBeenCalledTimes(1);
    const [, createOptions] = stripeMocks.customersCreate.mock.calls[0] as [
      Record<string, unknown>,
      Record<string, unknown>,
    ];
    expect(createOptions).toEqual({ stripeAccount: ACCOUNT_ID });

    const stored = await db.customer.findUniqueOrThrow({
      where: { id: customer.id },
    });
    expect(stored.stripeCustomerId).toBe("cus_created_1");
  });

  it("does NOT re-create on a non-missing Stripe failure (a rate limit is not a dead customer)", async () => {
    const business = await createStore();
    const customer = await db.customer.create({
      data: {
        businessId: business.id,
        email: "shopper@example.com",
        stripeCustomerId: "cus_existing_9",
      },
    });
    stripeMocks.customersUpdate.mockRejectedValueOnce(
      Object.assign(new Error("Too many requests"), {
        type: "StripeRateLimitError",
        statusCode: 429,
      }),
    );

    await expect(
      ensureStripeCustomer(db, {
        business: { id: business.id, stripeAccountId: ACCOUNT_ID },
        customer,
        email: "shopper@example.com",
        name: "Ada Lovelace",
        phone: null,
        address: ADDRESS,
      }),
    ).rejects.toThrow(/Too many requests/);

    expect(stripeMocks.customersCreate).not.toHaveBeenCalled();
    const stored = await db.customer.findUniqueOrThrow({
      where: { id: customer.id },
    });
    expect(stored.stripeCustomerId).toBe("cus_existing_9");
  });

  it("updates (never re-creates) when the Customer already has a Stripe id", async () => {
    const business = await createStore();
    const customer = await db.customer.create({
      data: {
        businessId: business.id,
        email: "shopper@example.com",
        stripeCustomerId: "cus_existing_9",
      },
    });

    const id = await ensureStripeCustomer(db, {
      business: { id: business.id, stripeAccountId: ACCOUNT_ID },
      customer,
      email: "shopper@example.com",
      name: "Ada Lovelace",
      phone: "+13135550142",
      address: ADDRESS,
    });

    expect(id).toBe("cus_existing_9");
    expect(stripeMocks.customersCreate).not.toHaveBeenCalled();
    expect(stripeMocks.customersUpdate).toHaveBeenCalledTimes(1);
    const [updateId, updateParams, updateOptions] = stripeMocks.customersUpdate
      .mock.calls[0] as [
      string,
      Record<string, unknown>,
      Record<string, unknown>,
    ];
    expect(updateId).toBe("cus_existing_9");
    expect(updateParams).toMatchObject({
      email: "shopper@example.com",
      name: "Ada Lovelace",
      phone: "+13135550142",
    });
    expect(updateOptions).toEqual({ stripeAccount: ACCOUNT_ID });
  });
});
