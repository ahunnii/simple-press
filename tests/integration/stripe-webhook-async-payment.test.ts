import * as Sentry from "@sentry/nextjs";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ASYNC_PAYMENT_HOLD_MS,
  sweepStaleReservations,
} from "~/lib/inventory/reservation";

import { db, resetDb } from "../helpers/db";
import {
  createBusiness,
  createPage,
  createProduct,
  createVariant,
} from "../helpers/factories";
import { fakeListLineItems } from "../helpers/stripe-line-items";
import {
  makeCheckoutAsyncPaymentFailedEvent,
  makeCheckoutAsyncPaymentSucceededEvent,
  makeCheckoutCompletedEvent,
  makeCheckoutExpiredEvent,
  makeCheckoutSession,
  postWebhookEvent,
} from "../helpers/stripe-webhook";

/**
 * Delayed ("async") payment methods on the cart lane — ACH bank debit, bank
 * transfers, vouchers. Such a checkout completes as `payment_status: "unpaid"`
 * and settles days later with `checkout.session.async_payment_succeeded` or
 * `checkout.session.async_payment_failed`.
 *
 * Decided design: no "awaiting payment" Order. The completed+unpaid event only
 * stretches the stock hold and emails the shopper; the Order exists once the
 * money clears; a failure releases the hold and emails shopper + owner.
 *
 * Same harness as `stripe-webhook-one-time.test.ts`: real route + real test
 * Postgres, Stripe and the `sendEmail` chokepoint mocked.
 */

const stripeMocks = vi.hoisted(() => ({
  constructEvent: vi.fn(),
  sessionsRetrieve: vi.fn(),
  listLineItems: vi.fn(),
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
        listLineItems: (...args: unknown[]): unknown =>
          stripeMocks.listLineItems(...args),
      },
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

vi.mock("@sentry/nextjs", async (importOriginal) => {
  const actual = await importOriginal<typeof Sentry>();
  const captureMessage = vi.fn(actual.captureMessage);
  return new Proxy(actual, {
    get: (target, prop, receiver) =>
      prop === "captureMessage"
        ? captureMessage
        : (Reflect.get(target, prop, receiver) as unknown),
  });
});

const ACCOUNT_ID = "acct_test_async";
const OTHER_ACCOUNT_ID = "acct_test_attacker";
const SESSION_ID = "cs_test_async_1";
const DAY_MS = 24 * 60 * 60 * 1000;

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

function findSentryMessage(step: string) {
  return vi
    .mocked(Sentry.captureMessage)
    .mock.calls.find(
      ([, hint]) =>
        (hint as { tags?: Record<string, string> } | undefined)?.tags?.[
          "webhook.step"
        ] === step,
    );
}

async function setupStore(opts: { subdomain?: string } = {}) {
  const created = await createBusiness({
    subdomain: opts.subdomain ?? "async-biz",
  });
  const business = await db.business.update({
    where: { id: created.id },
    data: { stripeAccountId: ACCOUNT_ID },
  });
  const product = await createProduct(business.id, {
    name: "Cotton Tee",
    price: 1500,
    inventoryQty: 10,
  });
  const variantProduct = await createProduct(business.id, {
    name: "Stoneware Mug",
    price: 2500,
    inventoryQty: 0,
  });
  const variant = await createVariant(variantProduct.id, {
    name: "Large",
    sku: "MUG-L",
    price: 2500,
    inventoryQty: 5,
  });
  return { business, product, variantProduct, variant };
}

type Store = Awaited<ReturnType<typeof setupStore>>;

/** 2 × tee + 1 × mug (variant), as an ACH checkout would carry it. */
function buildSession(
  store: Store,
  opts: {
    paymentStatus: "paid" | "unpaid";
    mode?: "payment" | "subscription";
    metadata?: Record<string, string>;
    /** `session.created` (Unix seconds) — when checkout started. */
    created?: number;
  },
) {
  return makeCheckoutSession({
    id: SESSION_ID,
    created: opts.created,
    mode: opts.mode ?? "payment",
    metadata: opts.metadata ?? {
      businessId: store.business.id,
      deliveryMethod: "ship",
    },
    customerName: "Jane Doe",
    customerEmail: "Jane@Shopper.Test",
    paymentStatus: opts.paymentStatus,
    paymentIntentId: "pi_test_async_1",
    amountSubtotal: 5500,
    lineItems: [
      {
        description: "Cotton Tee",
        quantity: 2,
        unitAmount: 1500,
        amountTotal: 3000,
        productId: store.product.id,
      },
      {
        description: "Stoneware Mug",
        quantity: 1,
        unitAmount: 2500,
        amountTotal: 2500,
        productId: store.variantProduct.id,
        productVariantId: store.variant.id,
        variantName: "Large",
        sku: "MUG-L",
      },
    ],
    shippingAddress: {
      line1: "123 Main St",
      city: "Detroit",
      state: "MI",
      postal_code: "48201",
      country: "US",
    },
  });
}

/** Reserves stock for the session, the way `create-session` does at checkout. */
async function reserveFor(store: Store, sessionId: string | null) {
  const reservation = await db.inventoryReservation.create({
    data: {
      businessId: store.business.id,
      stripeSessionId: sessionId,
      status: "active",
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      items: [
        { productId: store.product.id, qty: 2 },
        { variantId: store.variant.id, qty: 1 },
      ],
    },
  });
  await db.product.update({
    where: { id: store.product.id },
    data: { reservedQty: 2 },
  });
  await db.productVariant.update({
    where: { id: store.variant.id },
    data: { reservedQty: 1 },
  });
  return reservation;
}

const LINE_ITEMS = {
  data: [
    {
      id: "li_1",
      description: "Cotton Tee",
      quantity: 2,
      amount_subtotal: 3000,
      price: {
        unit_amount: 1500,
        product: {
          id: "prod_1",
          name: "Cotton Tee",
          images: [],
          metadata: {},
        },
      },
    },
  ],
};

async function post(event: ReturnType<typeof makeCheckoutCompletedEvent>) {
  stripeMocks.constructEvent.mockReturnValue(event);
  return postWebhookEvent(event);
}

/** Drives the completed+unpaid step (start of every async scenario). */
async function completeUnpaid(store: Store) {
  const { session } = buildSession(store, { paymentStatus: "unpaid" });
  const res = await post(makeCheckoutCompletedEvent(session, ACCOUNT_ID));
  expect(res.status).toBe(200);
  return session;
}

async function stockOf(store: Store) {
  const product = await db.product.findUniqueOrThrow({
    where: { id: store.product.id },
  });
  const variant = await db.productVariant.findUniqueOrThrow({
    where: { id: store.variant.id },
  });
  return { product, variant };
}

describe("stripe webhook — delayed (async) payment methods, cart lane", () => {
  beforeEach(async () => {
    await resetDb();
    stripeMocks.constructEvent.mockReset();
    stripeMocks.sessionsRetrieve.mockReset();
    stripeMocks.listLineItems.mockReset();
    stripeMocks.listLineItems.mockImplementation((...args: unknown[]) =>
      fakeListLineItems(...args),
    );
    vi.mocked(Sentry.captureMessage).mockClear();
    emailMocks.sendEmail.mockReset();
    emailMocks.sendEmail.mockResolvedValue({ success: true, id: "test" });
  });

  describe("checkout.session.completed with payment_status unpaid", () => {
    it("acks 200, creates nothing, extends the hold ~14 days and emails 'processing' once", async () => {
      const store = await setupStore();
      const reservation = await reserveFor(store, SESSION_ID);

      const before = Date.now();
      const { session } = buildSession(store, { paymentStatus: "unpaid" });
      const res = await post(makeCheckoutCompletedEvent(session, ACCOUNT_ID));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ received: true });

      // Nothing materialised: no order, no customer, no address, and the
      // full session was never re-read.
      expect(await db.order.count()).toBe(0);
      expect(await db.customer.count()).toBe(0);
      expect(await db.shippingAddress.count()).toBe(0);
      expect(stripeMocks.sessionsRetrieve).not.toHaveBeenCalled();

      // Stock stays held, now for the async window.
      const held = await db.inventoryReservation.findUniqueOrThrow({
        where: { id: reservation.id },
      });
      expect(held.status).toBe("active");
      expect(held.expiresAt.getTime()).toBeGreaterThanOrEqual(
        before + ASYNC_PAYMENT_HOLD_MS - 1000,
      );
      expect(held.expiresAt.getTime()).toBeLessThanOrEqual(
        Date.now() + ASYNC_PAYMENT_HOLD_MS + 1000,
      );
      expect(ASYNC_PAYMENT_HOLD_MS).toBe(14 * DAY_MS);
      const { product, variant } = await stockOf(store);
      expect(product.inventoryQty).toBe(10);
      expect(product.reservedQty).toBe(2);
      expect(variant.inventoryQty).toBe(5);
      expect(variant.reservedQty).toBe(1);

      // Exactly one email: the shopper's "payment processing" notice, with
      // items listed on the connected account.
      expect(emailCategories()).toEqual(["order_payment_processing"]);
      const [processing] = emailCalls();
      expect(processing!.to).toBe("jane@shopper.test");
      expect(processing!.idempotencyKey).toBe(
        `order-payment-processing-${SESSION_ID}`,
      );
      expect(stripeMocks.listLineItems).toHaveBeenCalledWith(
        SESSION_ID,
        expect.objectContaining({ expand: ["data.price.product"] }),
        { stripeAccount: ACCOUNT_ID },
      );
    });

    it("still sends the processing email when listing line items fails", async () => {
      const store = await setupStore();
      await reserveFor(store, SESSION_ID);
      stripeMocks.listLineItems.mockRejectedValue(new Error("stripe down"));

      await completeUnpaid(store);
      expect(emailCategories()).toEqual(["order_payment_processing"]);
    });

    it("does not touch the hold or email when the event account does not own the business", async () => {
      const store = await setupStore();
      const reservation = await reserveFor(store, SESSION_ID);
      const { session } = buildSession(store, { paymentStatus: "unpaid" });

      const res = await post(
        makeCheckoutCompletedEvent(session, OTHER_ACCOUNT_ID),
      );
      expect(res.status).toBe(200);
      const after = await db.inventoryReservation.findUniqueOrThrow({
        where: { id: reservation.id },
      });
      expect(after.expiresAt.getTime()).toBe(reservation.expiresAt.getTime());
      expect(emailMocks.sendEmail).not.toHaveBeenCalled();
    });

    it("sends no 'processing' email if the success was already processed (out-of-order delivery)", async () => {
      const store = await setupStore();
      await reserveFor(store, SESSION_ID);
      const paid = buildSession(store, { paymentStatus: "paid" });
      stripeMocks.sessionsRetrieve.mockResolvedValue(paid.fullSession);
      await post(
        makeCheckoutAsyncPaymentSucceededEvent(paid.session, ACCOUNT_ID),
      );
      expect(await db.order.count()).toBe(1);
      emailMocks.sendEmail.mockClear();

      await completeUnpaid(store);
      expect(emailMocks.sendEmail).not.toHaveBeenCalled();
      expect(await db.order.count()).toBe(1);
    });

    it("answers 500 with no email when the hold extension throws; the retry extends the hold and emails once", async () => {
      const store = await setupStore();
      const reservation = await reserveFor(store, SESSION_ID);
      const { session } = buildSession(store, { paymentStatus: "unpaid" });
      const event = makeCheckoutCompletedEvent(session, ACCOUNT_ID);

      const spy = vi
        .spyOn(db.inventoryReservation, "updateMany")
        .mockRejectedValueOnce(new Error("db blip"));
      try {
        const res = await post(event);
        expect(res.status).toBe(500);
      } finally {
        spy.mockRestore();
      }
      expect(emailMocks.sendEmail).not.toHaveBeenCalled();
      const untouched = await db.inventoryReservation.findUniqueOrThrow({
        where: { id: reservation.id },
      });
      expect(untouched.expiresAt.getTime()).toBe(
        reservation.expiresAt.getTime(),
      );

      // Stripe retries the same event.
      const before = Date.now();
      const retry = await post(event);
      expect(retry.status).toBe(200);
      const held = await db.inventoryReservation.findUniqueOrThrow({
        where: { id: reservation.id },
      });
      expect(held.status).toBe("active");
      expect(held.expiresAt.getTime()).toBeGreaterThanOrEqual(
        before + ASYNC_PAYMENT_HOLD_MS - 1000,
      );
      expect(emailCategories()).toEqual(["order_payment_processing"]);
    });

    it("sends no 'processing' email when the failure was already processed (completed arrives after async_payment_failed)", async () => {
      const store = await setupStore();
      const reservation = await reserveFor(store, SESSION_ID);
      const { session } = buildSession(store, { paymentStatus: "unpaid" });
      const failed = await post(
        makeCheckoutAsyncPaymentFailedEvent(session, ACCOUNT_ID),
      );
      expect(failed.status).toBe(200);
      const releasedBefore = await db.inventoryReservation.findUniqueOrThrow({
        where: { id: reservation.id },
      });
      expect(releasedBefore.status).toBe("released");
      const stockBefore = await stockOf(store);
      emailMocks.sendEmail.mockClear();

      const res = await post(makeCheckoutCompletedEvent(session, ACCOUNT_ID));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ received: true });
      expect(emailMocks.sendEmail).not.toHaveBeenCalled();
      expect(await db.order.count()).toBe(0);

      const after = await db.inventoryReservation.findUniqueOrThrow({
        where: { id: reservation.id },
      });
      expect(after.status).toBe("released");
      expect(after.expiresAt.getTime()).toBe(
        releasedBefore.expiresAt.getTime(),
      );
      const stockAfter = await stockOf(store);
      expect(stockAfter.product.reservedQty).toBe(
        stockBefore.product.reservedQty,
      );
      expect(stockAfter.variant.reservedQty).toBe(
        stockBefore.variant.reservedQty,
      );
      expect(
        findSentryMessage("async-payment-completed-after-release"),
      ).toBeDefined();
    });

    it("residual edge: a cart with no reservation still gets the 'processing' email after a failure", async () => {
      const store = await setupStore();
      const { session } = buildSession(store, { paymentStatus: "unpaid" });
      await post(makeCheckoutAsyncPaymentFailedEvent(session, ACCOUNT_ID));
      emailMocks.sendEmail.mockClear();

      const res = await post(makeCheckoutCompletedEvent(session, ACCOUNT_ID));
      expect(res.status).toBe(200);
      expect(emailCategories()).toEqual(["order_payment_processing"]);
    });

    it("emails the session's customer_email over customer_details.email (same precedence as the order path)", async () => {
      const store = await setupStore();
      await reserveFor(store, SESSION_ID);
      const built = buildSession(store, { paymentStatus: "unpaid" });
      const session = {
        ...built.session,
        customer_email: "Prefilled@Shopper.Test",
        customer_details: {
          ...built.session.customer_details!,
          email: "typed@other.test",
        },
      } as typeof built.session;

      await post(makeCheckoutCompletedEvent(session, ACCOUNT_ID));
      await post(makeCheckoutAsyncPaymentFailedEvent(session, ACCOUNT_ID));

      const processing = emailsWithCategory("order_payment_processing");
      expect(processing).toHaveLength(1);
      expect(processing[0]!.to).toBe("prefilled@shopper.test");
      const failed = emailsWithCategory("order_payment_failed");
      expect(failed).toHaveLength(1);
      expect(failed[0]!.to).toBe("prefilled@shopper.test");
    });

    it("the stale sweeper leaves an extended hold alone", async () => {
      const store = await setupStore();
      const reservation = await reserveFor(store, SESSION_ID);
      await completeUnpaid(store);

      // Past the original 30-minute window, the sweeper would have released
      // the un-extended hold; the extended one is not stale.
      const released = await sweepStaleReservations(db, {
        businessId: store.business.id,
      });
      expect(released).toBe(0);
      const after = await db.inventoryReservation.findUniqueOrThrow({
        where: { id: reservation.id },
      });
      expect(after.status).toBe("active");
      expect((await stockOf(store)).product.reservedQty).toBe(2);

      // Control: a hold that is past its expiry IS swept.
      await db.inventoryReservation.update({
        where: { id: reservation.id },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });
      expect(
        await sweepStaleReservations(db, { businessId: store.business.id }),
      ).toBe(1);
    });
  });

  describe("checkout.session.async_payment_succeeded", () => {
    it("creates exactly one paid order, deducts stock, consumes the hold and emails both parties; a duplicate is a no-op", async () => {
      const store = await setupStore();
      const reservation = await reserveFor(store, SESSION_ID);
      await completeUnpaid(store);
      emailMocks.sendEmail.mockClear();

      const paid = buildSession(store, { paymentStatus: "paid" });
      stripeMocks.sessionsRetrieve.mockResolvedValue(paid.fullSession);
      const event = makeCheckoutAsyncPaymentSucceededEvent(
        paid.session,
        ACCOUNT_ID,
      );

      const res = await post(event);
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ received: true });

      const orders = await db.order.findMany({
        where: { businessId: store.business.id },
      });
      expect(orders).toHaveLength(1);
      expect(orders[0]!.paymentStatus).toBe("paid");
      expect(orders[0]!.stripeSessionId).toBe(SESSION_ID);
      expect(orders[0]!.customerEmail).toBe("jane@shopper.test");

      const { product, variant } = await stockOf(store);
      expect(product.inventoryQty).toBe(8);
      expect(product.reservedQty).toBe(0);
      expect(variant.inventoryQty).toBe(4);
      expect(variant.reservedQty).toBe(0);
      const consumed = await db.inventoryReservation.findUniqueOrThrow({
        where: { id: reservation.id },
      });
      expect(consumed.status).toBe("consumed");

      const customer = await db.customer.findFirstOrThrow({
        where: { businessId: store.business.id },
      });
      expect(customer.orderCount).toBe(1);

      expect(emailCategories()).toEqual(
        expect.arrayContaining(["order_confirmation", "new_order_owner"]),
      );
      const keys = emailCalls().map((c) => c.idempotencyKey);
      expect(keys).toContain(`order-confirmation-${SESSION_ID}`);
      expect(keys).toContain(`owner-notification-${SESSION_ID}`);

      // Duplicate delivery (staging double-processes events): still one
      // order, no further deduction, no extra emails.
      emailMocks.sendEmail.mockClear();
      stripeMocks.sessionsRetrieve.mockClear();
      const replay = await post(event);
      expect(replay.status).toBe(200);
      expect(await db.order.count()).toBe(1);
      expect(stripeMocks.sessionsRetrieve).not.toHaveBeenCalled();
      expect(emailMocks.sendEmail).not.toHaveBeenCalled();
      const again = await stockOf(store);
      expect(again.product.inventoryQty).toBe(8);
      expect(again.variant.inventoryQty).toBe(4);
      expect(
        (
          await db.customer.findFirstOrThrow({
            where: { businessId: store.business.id },
          })
        ).orderCount,
      ).toBe(1);
    });

    it("creates no order when the event account does not own the business", async () => {
      const store = await setupStore();
      await reserveFor(store, SESSION_ID);
      const paid = buildSession(store, { paymentStatus: "paid" });
      stripeMocks.sessionsRetrieve.mockResolvedValue(paid.fullSession);

      const res = await post(
        makeCheckoutAsyncPaymentSucceededEvent(paid.session, OTHER_ACCOUNT_ID),
      );
      expect(res.status).toBe(200);
      expect(await db.order.count()).toBe(0);
      expect(findSentryMessage("account-mismatch")).toBeDefined();
    });
  });

  describe("checkout.session.async_payment_failed", () => {
    it("releases the hold, creates no order and emails shopper + owner; a duplicate never double-releases", async () => {
      const store = await setupStore();
      const reservation = await reserveFor(store, SESSION_ID);
      // Another shopper's hold on the same product, so a double release
      // would be visible (GREATEST(..., 0) would otherwise hide it at 0).
      await db.inventoryReservation.create({
        data: {
          businessId: store.business.id,
          stripeSessionId: "cs_test_someone_else",
          status: "active",
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
          items: [{ productId: store.product.id, qty: 3 }],
        },
      });
      await db.product.update({
        where: { id: store.product.id },
        data: { reservedQty: 5 },
      });

      const session = await completeUnpaid(store);
      emailMocks.sendEmail.mockClear();

      const event = makeCheckoutAsyncPaymentFailedEvent(session, ACCOUNT_ID);
      const res = await post(event);
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ received: true });

      expect(await db.order.count()).toBe(0);
      expect(await db.customer.count()).toBe(0);
      const released = await db.inventoryReservation.findUniqueOrThrow({
        where: { id: reservation.id },
      });
      expect(released.status).toBe("released");
      const { product, variant } = await stockOf(store);
      expect(product.reservedQty).toBe(3);
      expect(product.inventoryQty).toBe(10);
      expect(variant.reservedQty).toBe(0);
      expect(variant.inventoryQty).toBe(5);

      const shopper = emailsWithCategory("order_payment_failed");
      expect(shopper).toHaveLength(1);
      expect(shopper[0]!.to).toBe("jane@shopper.test");
      expect(shopper[0]!.idempotencyKey).toBe(
        `order-payment-failed-${SESSION_ID}`,
      );
      const owner = emailsWithCategory("order_payment_failed_owner");
      expect(owner.length).toBeGreaterThanOrEqual(1);
      expect(owner.map((c) => c.to)).toContain(store.business.ownerEmail);
      for (const call of owner) {
        expect(call.idempotencyKey).toBe(
          `order-payment-failed-owner-${SESSION_ID}-${String(call.to).toLowerCase()}`,
        );
      }

      // Duplicate delivery: nothing is released twice.
      const replay = await post(event);
      expect(replay.status).toBe(200);
      const again = await stockOf(store);
      expect(again.product.reservedQty).toBe(3);
      expect(again.variant.reservedQty).toBe(0);
      expect(await db.order.count()).toBe(0);
    });

    it("touches nothing when the event account does not own the business", async () => {
      const store = await setupStore();
      const reservation = await reserveFor(store, SESSION_ID);
      const { session } = buildSession(store, { paymentStatus: "unpaid" });

      const res = await post(
        makeCheckoutAsyncPaymentFailedEvent(session, OTHER_ACCOUNT_ID),
      );
      expect(res.status).toBe(200);
      const after = await db.inventoryReservation.findUniqueOrThrow({
        where: { id: reservation.id },
      });
      expect(after.status).toBe("active");
      expect((await stockOf(store)).product.reservedQty).toBe(2);
      expect(emailMocks.sendEmail).not.toHaveBeenCalled();
      expect(
        findSentryMessage("async-payment-failed-account-mismatch"),
      ).toBeDefined();
    });

    it("does not release another tenant's hold via metadata.reservationId", async () => {
      const store = await setupStore();
      const otherBiz = await createBusiness({ subdomain: "victim-store" });
      const victimRes = await db.inventoryReservation.create({
        data: {
          businessId: otherBiz.id,
          stripeSessionId: "cs_test_victim",
          status: "active",
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
          items: [{ productId: store.product.id, qty: 1 }],
        },
      });
      const { session } = buildSession(store, {
        paymentStatus: "unpaid",
        metadata: {
          businessId: store.business.id,
          reservationId: victimRes.id,
        },
      });

      const res = await post(
        makeCheckoutAsyncPaymentFailedEvent(session, ACCOUNT_ID),
      );
      expect(res.status).toBe(200);
      const after = await db.inventoryReservation.findUniqueOrThrow({
        where: { id: victimRes.id },
      });
      expect(after.status).toBe("active");
      expect(
        findSentryMessage("async-payment-failed-business-mismatch"),
      ).toBeDefined();
    });

    it("leaves an existing order alone and sends no emails", async () => {
      const store = await setupStore();
      await reserveFor(store, SESSION_ID);
      const paid = buildSession(store, { paymentStatus: "paid" });
      stripeMocks.sessionsRetrieve.mockResolvedValue(paid.fullSession);
      await post(
        makeCheckoutAsyncPaymentSucceededEvent(paid.session, ACCOUNT_ID),
      );
      emailMocks.sendEmail.mockClear();

      const { session } = buildSession(store, { paymentStatus: "unpaid" });
      const res = await post(
        makeCheckoutAsyncPaymentFailedEvent(session, ACCOUNT_ID),
      );
      expect(res.status).toBe(200);
      const order = await db.order.findFirstOrThrow();
      expect(order.paymentStatus).toBe("paid");
      expect(emailMocks.sendEmail).not.toHaveBeenCalled();
      expect(
        findSentryMessage("async-payment-failed-order-exists"),
      ).toBeDefined();
    });
  });

  describe("reservation release races", () => {
    /** Another shopper's hold on the tee, so a double release is visible
     *  (GREATEST(..., 0) would otherwise hide it at 0). */
    async function addOtherShopperHold(store: Store) {
      await db.inventoryReservation.create({
        data: {
          businessId: store.business.id,
          stripeSessionId: "cs_test_someone_else",
          status: "active",
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
          items: [{ productId: store.product.id, qty: 3 }],
        },
      });
      await db.product.update({
        where: { id: store.product.id },
        data: { reservedQty: 5 },
      });
    }

    it("the sweeper does not re-release a hold the async-failed handler released after the sweeper read it", async () => {
      const store = await setupStore();
      const reservation = await reserveFor(store, SESSION_ID);
      await addOtherShopperHold(store);
      await db.inventoryReservation.update({
        where: { id: reservation.id },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });
      const { session } = buildSession(store, { paymentStatus: "unpaid" });

      // The sweeper selects the stale hold; before its per-row transaction
      // runs, the async_payment_failed webhook releases the same hold.
      const racingDb = {
        inventoryReservation: {
          findMany: async (args: unknown) => {
            const rows = await db.inventoryReservation.findMany(
              args as Parameters<typeof db.inventoryReservation.findMany>[0],
            );
            const res = await post(
              makeCheckoutAsyncPaymentFailedEvent(session, ACCOUNT_ID),
            );
            expect(res.status).toBe(200);
            return rows;
          },
        },
        $transaction: (fn: (tx: unknown) => Promise<unknown>) =>
          db.$transaction(fn as Parameters<typeof db.$transaction>[0]),
      } as unknown as typeof db;

      const released = await sweepStaleReservations(racingDb, {
        businessId: store.business.id,
      });
      expect(released).toBe(0);

      const after = await db.inventoryReservation.findUniqueOrThrow({
        where: { id: reservation.id },
      });
      expect(after.status).toBe("released");
      const { product, variant } = await stockOf(store);
      expect(product.reservedQty).toBe(3);
      expect(variant.reservedQty).toBe(0);
    });

    it("checkout.session.expired does not re-release a hold the sweeper released after the route read it", async () => {
      const store = await setupStore();
      const reservation = await reserveFor(store, SESSION_ID);
      await addOtherShopperHold(store);
      await db.inventoryReservation.update({
        where: { id: reservation.id },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });
      const { session } = buildSession(store, { paymentStatus: "unpaid" });

      // The route has already read the active hold; the sweeper wins the
      // release just before the route's own transaction runs.
      const realTransaction = db.$transaction.bind(db);
      let sweptFirst = 0;
      const spy = vi.spyOn(db, "$transaction").mockImplementationOnce((async (
        fn: unknown,
      ) => {
        sweptFirst = await sweepStaleReservations(db, {
          businessId: store.business.id,
        });
        return realTransaction(fn as Parameters<typeof db.$transaction>[0]);
      }) as typeof db.$transaction);
      try {
        const res = await post(makeCheckoutExpiredEvent(session, ACCOUNT_ID));
        expect(res.status).toBe(200);
      } finally {
        spy.mockRestore();
      }
      expect(sweptFirst).toBe(1);

      const after = await db.inventoryReservation.findUniqueOrThrow({
        where: { id: reservation.id },
      });
      expect(after.status).toBe("released");
      const { product, variant } = await stockOf(store);
      expect(product.reservedQty).toBe(3);
      expect(variant.reservedQty).toBe(0);
    });
  });

  describe("terms acceptance is dated from checkout start", () => {
    /** Checkout started 3 days ago; the bank payment clears now. */
    const startedAt = new Date(
      Math.floor((Date.now() - 3 * DAY_MS) / 1000) * 1000,
    );

    async function settleAsyncCheckout(store: Store) {
      await reserveFor(store, SESSION_ID);
      const created = startedAt.getTime() / 1000;
      const unpaid = buildSession(store, { paymentStatus: "unpaid", created });
      await post(makeCheckoutCompletedEvent(unpaid.session, ACCOUNT_ID));
      const paid = buildSession(store, { paymentStatus: "paid", created });
      stripeMocks.sessionsRetrieve.mockResolvedValue(paid.fullSession);
      await post(
        makeCheckoutAsyncPaymentSucceededEvent(paid.session, ACCOUNT_ID),
      );
      return db.order.findUniqueOrThrow({
        where: { stripeSessionId: SESSION_ID },
      });
    }

    async function termsPageUpdatedAt(store: Store, updatedAt: Date) {
      const page = await createPage(store.business.id, {
        slug: "terms-of-service",
        type: "policy",
        title: "Terms of Service",
      });
      // An explicit value overrides Prisma's @updatedAt stamp.
      return db.page.update({ where: { id: page.id }, data: { updatedAt } });
    }

    it("stamps termsAcceptedAt with session.created, not settlement time", async () => {
      const store = await setupStore();
      const order = await settleAsyncCheckout(store);
      expect(order.termsAcceptedAt).toEqual(startedAt);
      expect(order.merchantTermsUpdatedAt).toBeNull(); // no terms page
    });

    it("snapshots the terms page's updatedAt when it was last edited before checkout started", async () => {
      const store = await setupStore();
      const editedAt = new Date(startedAt.getTime() - 5 * DAY_MS);
      await termsPageUpdatedAt(store, editedAt);
      const order = await settleAsyncCheckout(store);
      expect(order.merchantTermsUpdatedAt).toEqual(editedAt);
    });

    it("records merchantTermsUpdatedAt null when the terms page was edited after checkout started", async () => {
      const store = await setupStore();
      // Edited while the bank payment was clearing — the shopper agreed to
      // the previous wording, which we no longer know.
      await termsPageUpdatedAt(store, new Date(startedAt.getTime() + DAY_MS));
      const order = await settleAsyncCheckout(store);
      expect(order.termsAcceptedAt).toEqual(startedAt);
      expect(order.merchantTermsUpdatedAt).toBeNull();
    });
  });

  describe("other lanes ack async events as no-ops", () => {
    it.each([
      ["succeeded", makeCheckoutAsyncPaymentSucceededEvent],
      ["failed", makeCheckoutAsyncPaymentFailedEvent],
    ] as const)(
      "subscription-mode async_payment_%s → 200, no side effects",
      async (_label, makeEvent) => {
        const store = await setupStore();
        const reservation = await reserveFor(store, SESSION_ID);
        const { session, fullSession } = buildSession(store, {
          paymentStatus: _label === "succeeded" ? "paid" : "unpaid",
          mode: "subscription",
        });
        stripeMocks.sessionsRetrieve.mockResolvedValue(fullSession);

        const res = await post(makeEvent(session, ACCOUNT_ID));
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ received: true });
        expect(await db.order.count()).toBe(0);
        expect(await db.customer.count()).toBe(0);
        expect(stripeMocks.sessionsRetrieve).not.toHaveBeenCalled();
        expect(emailMocks.sendEmail).not.toHaveBeenCalled();
        const after = await db.inventoryReservation.findUniqueOrThrow({
          where: { id: reservation.id },
        });
        expect(after.status).toBe("active");
        expect(after.expiresAt.getTime()).toBe(reservation.expiresAt.getTime());
      },
    );

    it.each([
      ["succeeded", makeCheckoutAsyncPaymentSucceededEvent],
      ["failed", makeCheckoutAsyncPaymentFailedEvent],
    ] as const)(
      "donation async_payment_%s → 200, no side effects",
      async (_label, makeEvent) => {
        const store = await setupStore();
        const reservation = await reserveFor(store, SESSION_ID);
        const { session, fullSession } = buildSession(store, {
          paymentStatus: _label === "succeeded" ? "paid" : "unpaid",
          metadata: { businessId: store.business.id, kind: "donation" },
        });
        stripeMocks.sessionsRetrieve.mockResolvedValue(fullSession);

        const res = await post(makeEvent(session, ACCOUNT_ID));
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ received: true });
        expect(await db.order.count()).toBe(0);
        expect(await db.donation.count()).toBe(0);
        expect(emailMocks.sendEmail).not.toHaveBeenCalled();
        const after = await db.inventoryReservation.findUniqueOrThrow({
          where: { id: reservation.id },
        });
        expect(after.status).toBe("active");
      },
    );
  });
});
