import type * as Sentry from "@sentry/nextjs";
import type { Prisma } from "generated/prisma";
import type { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ReservationEntry } from "~/lib/inventory/reservation";
import {
  findSupersedableHold,
  LOOKUP_BUDGET_MS,
  STRIPE_HOLD_REQUEST_TIMEOUT_MS,
  SUPERSEDE_BUDGET_MS,
} from "~/lib/checkout/discount-holds";
import {
  PENDING_COOKIE_MARKER_KEY,
  PENDING_COOKIE_MARKER_VALUE,
  signPendingSessionCookie,
} from "~/lib/checkout/pending-session-cookie";
import {
  createDeadline,
  DeadlineExceededError,
  MIN_CALL_BUDGET_MS,
} from "~/lib/checkout/stripe-call-budget";
import { deactivateExpiredDiscountCodes } from "~/lib/deactivate-expired-discounts";
import {
  countHeldDiscountUses,
  sweepStaleReservations,
} from "~/lib/inventory/reservation";
import { listLedger } from "~/lib/loyalty/ledger";
import { POST as createSession } from "~/app/api/stripe/create-session/route";

import { createTestCaller } from "../helpers/caller";
import { db, resetDb } from "../helpers/db";
import {
  createBusiness,
  createCustomer,
  createDiscount,
  createProduct,
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
 * Discount-code uses are held at checkout START, riding on the per-session
 * InventoryReservation (a `discountCodeId` entry): create-session claims the
 * use atomically (usageCount + 1 under usageLimit), every release path gives
 * it back, and the consume path (order created) makes it final — the webhook
 * then skips its own increment. Delayed (bank) payments stay open for days,
 * so counting at order creation let several pending checkouts redeem one
 * single-use code.
 *
 * Real create-session + webhook routes against the test Postgres; Stripe, the
 * checkout rate limiter and email are mocked.
 */

const ACCOUNT_ID = "acct_test_discount_hold";
/** Set by tests/helpers/test-env.ts — the host suffix `extractSubdomain` strips. */
const PLATFORM_DOMAIN = "simplepress.test";
const SUBDOMAIN = "hold-biz";

const stripeMocks = vi.hoisted(() => ({
  constructEvent: vi.fn(),
  sessionsRetrieve: vi.fn(),
  sessionsCreate: vi.fn(),
  sessionsUpdate: vi.fn(),
  sessionsExpire: vi.fn(),
  listLineItems: vi.fn(),
  couponsCreate: vi.fn(),
  customersCreate: vi.fn(),
}));
vi.mock("~/lib/stripe/client", () => ({
  stripeClient: {
    webhooks: {
      constructEvent: (...args: unknown[]): unknown =>
        stripeMocks.constructEvent(...args),
    },
    coupons: {
      create: (...args: unknown[]): unknown =>
        stripeMocks.couponsCreate(...args),
    },
    customers: {
      create: (...args: unknown[]): unknown =>
        stripeMocks.customersCreate(...args),
    },
    checkout: {
      sessions: {
        create: (...args: unknown[]): unknown =>
          stripeMocks.sessionsCreate(...args),
        retrieve: (...args: unknown[]): unknown =>
          stripeMocks.sessionsRetrieve(...args),
        update: (...args: unknown[]): unknown =>
          stripeMocks.sessionsUpdate(...args),
        expire: (...args: unknown[]): unknown =>
          stripeMocks.sessionsExpire(...args),
        listLineItems: (...args: unknown[]): unknown =>
          stripeMocks.listLineItems(...args),
      },
    },
  },
}));

// Sentry: observe what the supersede / Apply-lookup steps report. A Proxy over
// the real module, so everything else (e.g. `withScope` on create-session's
// 500 path) keeps working.
const sentryMocks = vi.hoisted(() => ({
  captureException: vi.fn(),
  addBreadcrumb: vi.fn(),
}));
vi.mock("@sentry/nextjs", async (importOriginal) => {
  const actual = await importOriginal<typeof Sentry>();
  return new Proxy(actual, {
    get: (target, prop, receiver) =>
      prop === "captureException"
        ? sentryMocks.captureException
        : prop === "addBreadcrumb"
          ? sentryMocks.addBreadcrumb
          : (Reflect.get(target, prop, receiver) as unknown),
  });
});

/** Sentry events the supersede / lookup steps captured (by checkout.step tag). */
function holdCaptures() {
  return sentryMocks.captureException.mock.calls.filter(([, ctx]) => {
    const step = (ctx as { tags?: Record<string, string> } | undefined)?.tags?.[
      "checkout.step"
    ];
    return (
      step === "supersede-mark" ||
      step === "supersede-unmark" ||
      step === "supersede-pending-session" ||
      step === "find-supersedable-hold"
    );
  });
}

// The in-memory checkout limiter (per IP) would trip partway through the file.
vi.mock("~/lib/rate-limit", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    checkoutLimiter: { consume: vi.fn().mockResolvedValue(undefined) },
    discountLimiter: { consume: vi.fn().mockResolvedValue(undefined) },
  };
});

// Tenant resolution in tRPC procedures (discount.validate) reads the request
// host via `next/headers`.
vi.mock("next/headers", () => ({
  headers: () =>
    Promise.resolve(new Headers({ host: "hold-biz.simplepress.test" })),
  cookies: () => Promise.resolve(new Headers()),
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

const DISCOUNT_ERROR = "This discount code has reached its usage limit";
const OUT_OF_STOCK_ERROR =
  "Some items in your cart are out of stock or no longer available. Please update your cart and try again.";

async function setupStore() {
  const created = await createBusiness({ subdomain: SUBDOMAIN });
  const business = await db.business.update({
    where: { id: created.id },
    data: {
      stripeAccountId: ACCOUNT_ID,
      offersInStorePickup: true,
      featureFlags: {
        products: true,
        cart: true,
        checkout: true,
        orders: true,
        payments: true,
        coupons: true,
      } as Prisma.InputJsonValue,
    },
  });
  const product = await createProduct(business.id, {
    name: "Cotton Tee",
    price: 2000,
    inventoryQty: 10,
  });
  return { business, product };
}

type Store = Awaited<ReturnType<typeof setupStore>>;

let sessionCounter = 0;

/**
 * POSTs a pickup checkout for one tee to the real create-session route.
 * Returns the response plus the metadata create-session sent to Stripe (the
 * webhook sessions below are built from it, as Stripe would echo it back).
 */
async function startCheckout(
  store: Store,
  opts: {
    discountCodeId?: string | null;
    email?: string;
    trackedQty?: number;
    /** The `pending_session` cookie value the browser sends. */
    pendingSession?: string;
    /** Post this product id instead of the store's tee. */
    productId?: string;
  } = {},
) {
  sessionCounter += 1;
  const sessionId = `cs_test_hold_${sessionCounter}`;
  stripeMocks.sessionsCreate.mockResolvedValueOnce({
    id: sessionId,
    url: `https://checkout.stripe.test/${sessionId}`,
  });
  const host = `${SUBDOMAIN}.${PLATFORM_DOMAIN}`;
  const req = new Request(`https://${host}/api/stripe/create-session`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      host,
      "x-forwarded-for": "203.0.113.9",
      ...(opts.pendingSession
        ? { cookie: `theme=dark; pending_session=${opts.pendingSession}` }
        : {}),
    },
    body: JSON.stringify({
      items: [
        {
          productId: opts.productId ?? store.product.id,
          variantId: null,
          productName: "Cotton Tee",
          variantName: null,
          price: 2000,
          quantity: opts.trackedQty ?? 1,
          imageUrl: null,
        },
      ],
      customerInfo: {
        email: opts.email ?? "Jane@Shopper.Test",
        name: "Jane Doe",
      },
      discountCodeId: opts.discountCodeId ?? null,
      deliveryMethod: "pickup",
    }),
  });
  const res = await createSession(req as never);
  const body = (await res.json()) as Record<string, unknown>;
  /** The signed `pending_session` value create-session set (200s only). */
  const cookie = (res as unknown as NextResponse).cookies.get(
    "pending_session",
  )?.value;
  const lastCall = stripeMocks.sessionsCreate.mock.lastCall as
    | [{ metadata: Record<string, string> }]
    | undefined;
  return {
    res,
    body,
    sessionId,
    cookie: cookie ?? "",
    metadata: lastCall?.[0].metadata ?? {},
  };
}

function webhookSession(
  store: Store,
  sessionId: string,
  metadata: Record<string, string>,
  paymentStatus: "paid" | "unpaid",
) {
  return makeCheckoutSession({
    id: sessionId,
    metadata,
    customerName: "Jane Doe",
    customerEmail: "jane@shopper.test",
    paymentStatus,
    amountSubtotal: 2000,
    amountDiscount: 200,
    lineItems: [
      {
        description: "Cotton Tee",
        quantity: 1,
        unitAmount: 2000,
        amountTotal: 2000,
        productId: store.product.id,
      },
    ],
  });
}

async function post(event: ReturnType<typeof makeCheckoutCompletedEvent>) {
  stripeMocks.constructEvent.mockReturnValue(event);
  const res = await postWebhookEvent(event);
  expect(res.status).toBe(200);
  return res;
}

async function usageOf(codeId: string) {
  return (await db.discountCode.findUniqueOrThrow({ where: { id: codeId } }))
    .usageCount;
}

async function reservationFor(sessionId: string) {
  return db.inventoryReservation.findUniqueOrThrow({
    where: { stripeSessionId: sessionId },
  });
}

describe("discount-code uses are held at checkout start", () => {
  beforeEach(async () => {
    await resetDb();
    for (const mock of Object.values(stripeMocks)) mock.mockReset();
    stripeMocks.couponsCreate.mockResolvedValue({ id: "coupon_test" });
    stripeMocks.listLineItems.mockImplementation((...args: unknown[]) =>
      fakeListLineItems(...args),
    );
    emailMocks.sendEmail.mockReset();
    emailMocks.sendEmail.mockResolvedValue({ success: true, id: "test" });
    sentryMocks.captureException.mockReset();
    sentryMocks.addBreadcrumb.mockReset();
  });

  describe("create-session", () => {
    it("counts the use and records a discount entry on the reservation", async () => {
      const store = await setupStore();
      const code = await createDiscount(store.business.id, { usageLimit: 1 });

      const { res, sessionId, metadata } = await startCheckout(store, {
        discountCodeId: code.id,
      });
      expect(res.status).toBe(200);
      expect(await usageOf(code.id)).toBe(1);
      expect(metadata.discountCodeId).toBe(code.id);

      const reservation = await reservationFor(sessionId);
      expect(reservation.id).toBe(metadata.reservationId);
      expect(reservation.status).toBe("active");
      expect(reservation.items).toEqual([
        { productId: store.product.id, qty: 1 },
        {
          discountCodeId: code.id,
          customerEmail: "jane@shopper.test",
          qty: 1,
        },
      ]);
      expect(
        (
          await countHeldDiscountUses(db, { businessId: store.business.id })
        ).get(code.id),
      ).toBe(1);
    });

    it("rejects a second checkout with a usageLimit-1 code while the first is pending", async () => {
      const store = await setupStore();
      const code = await createDiscount(store.business.id, { usageLimit: 1 });
      const first = await startCheckout(store, { discountCodeId: code.id });
      expect(first.res.status).toBe(200);
      // First checkout is a bank payment, still pending.
      await post(
        makeCheckoutCompletedEvent(
          webhookSession(store, first.sessionId, first.metadata, "unpaid")
            .session,
          ACCOUNT_ID,
        ),
      );

      const second = await startCheckout(store, {
        discountCodeId: code.id,
        email: "someone@else.test",
      });
      expect(second.res.status).toBe(400);
      expect(second.body.error).toBe(DISCOUNT_ERROR);
      expect(second.body.error).not.toBe(OUT_OF_STOCK_ERROR);
      expect(await usageOf(code.id)).toBe(1);
      expect(await db.inventoryReservation.count()).toBe(1);
    });

    it("loses the race for the last use with the discount error (not out-of-stock) and rolls the stock hold back", async () => {
      const store = await setupStore();
      const code = await createDiscount(store.business.id, { usageLimit: 1 });
      // Another checkout claims the last use between this request's
      // validation read and its reservation transaction: validation sees the
      // stale row (0 uses), the atomic claim sees the real one.
      const stale = { ...code, usageCount: 0 };
      await db.discountCode.update({
        where: { id: code.id },
        data: { usageCount: 1 },
      });
      const spy = vi
        .spyOn(db.discountCode, "findFirst")
        .mockResolvedValueOnce(stale as never);
      try {
        const { res, body } = await startCheckout(store, {
          discountCodeId: code.id,
        });
        expect(res.status).toBe(400);
        expect(body.error).toBe(DISCOUNT_ERROR);
        expect(body.unavailableItems).toBeUndefined();
      } finally {
        spy.mockRestore();
      }
      expect(await usageOf(code.id)).toBe(1);
      expect(await db.inventoryReservation.count()).toBe(0);
      const product = await db.product.findUniqueOrThrow({
        where: { id: store.product.id },
      });
      expect(product.reservedQty).toBe(0);
      expect(stripeMocks.sessionsCreate).not.toHaveBeenCalled();
    });

    it("gives the use back when the Stripe session cannot be created", async () => {
      const store = await setupStore();
      const code = await createDiscount(store.business.id, { usageLimit: 1 });
      stripeMocks.sessionsCreate.mockRejectedValueOnce(
        new Error("stripe down"),
      );
      const host = `${SUBDOMAIN}.${PLATFORM_DOMAIN}`;
      const res = await createSession(
        new Request(`https://${host}/api/stripe/create-session`, {
          method: "POST",
          headers: { "content-type": "application/json", host },
          body: JSON.stringify({
            items: [
              {
                productId: store.product.id,
                variantId: null,
                productName: "Cotton Tee",
                variantName: null,
                price: 2000,
                quantity: 1,
                imageUrl: null,
              },
            ],
            customerInfo: { email: "jane@shopper.test", name: "Jane" },
            discountCodeId: code.id,
            deliveryMethod: "pickup",
          }),
        }) as never,
      );
      expect(res.status).toBe(500);
      expect(await usageOf(code.id)).toBe(0);
      const reservation = await db.inventoryReservation.findFirstOrThrow();
      expect(reservation.status).toBe("released");
    });

    it("a discount entry alone creates the reservation (cart with no tracked stock)", async () => {
      const store = await setupStore();
      await db.product.update({
        where: { id: store.product.id },
        data: { trackInventory: false },
      });
      const code = await createDiscount(store.business.id, { usageLimit: 1 });

      const { res, sessionId, metadata } = await startCheckout(store, {
        discountCodeId: code.id,
      });
      expect(res.status).toBe(200);
      const reservation = await reservationFor(sessionId);
      expect(reservation.items).toEqual([
        {
          discountCodeId: code.id,
          customerEmail: "jane@shopper.test",
          qty: 1,
        },
      ]);
      expect(metadata.reservationId).toBe(reservation.id);
      expect(await usageOf(code.id)).toBe(1);

      // ...and settles normally: a paid card checkout consumes it.
      const paid = webhookSession(store, sessionId, metadata, "paid");
      stripeMocks.sessionsRetrieve.mockResolvedValue(paid.fullSession);
      await post(makeCheckoutCompletedEvent(paid.session, ACCOUNT_ID));
      expect((await reservationFor(sessionId)).status).toBe("consumed");
      expect(await usageOf(code.id)).toBe(1);
    });

    it("per-customer limit counts the shopper's open checkouts holding the code", async () => {
      const store = await setupStore();
      const code = await createDiscount(store.business.id, {
        perCustomerLimit: 1,
      });
      const first = await startCheckout(store, { discountCodeId: code.id });
      expect(first.res.status).toBe(200);

      const again = await startCheckout(store, {
        discountCodeId: code.id,
        email: "JANE@shopper.test",
      });
      expect(again.res.status).toBe(400);
      expect(again.body.error).toBe(
        "You've already used this code the maximum number of times",
      );

      const other = await startCheckout(store, {
        discountCodeId: code.id,
        email: "other@shopper.test",
      });
      expect(other.res.status).toBe(200);
      expect(await usageOf(code.id)).toBe(2);

      // Once Jane's checkout expires her use is free again.
      await post(
        makeCheckoutExpiredEvent(
          webhookSession(store, first.sessionId, first.metadata, "unpaid")
            .session,
          ACCOUNT_ID,
        ),
      );
      const retry = await startCheckout(store, { discountCodeId: code.id });
      expect(retry.res.status).toBe(200);
    });
  });

  describe("settlement", () => {
    it("checkout.session.expired releases the use; the code is usable again", async () => {
      const store = await setupStore();
      const code = await createDiscount(store.business.id, { usageLimit: 1 });
      const first = await startCheckout(store, { discountCodeId: code.id });
      expect(await usageOf(code.id)).toBe(1);

      const event = makeCheckoutExpiredEvent(
        webhookSession(store, first.sessionId, first.metadata, "unpaid")
          .session,
        ACCOUNT_ID,
      );
      await post(event);
      expect(await usageOf(code.id)).toBe(0);
      expect((await reservationFor(first.sessionId)).status).toBe("released");
      // Duplicate delivery releases nothing more.
      await post(event);
      expect(await usageOf(code.id)).toBe(0);

      const second = await startCheckout(store, { discountCodeId: code.id });
      expect(second.res.status).toBe(200);
      expect(await usageOf(code.id)).toBe(1);
    });

    it("async_payment_failed releases the use exactly once, even on duplicate delivery", async () => {
      const store = await setupStore();
      // 2 final uses already; a double release would show as 1.
      const code = await createDiscount(store.business.id, {
        usageLimit: 5,
        usageCount: 2,
      });
      const { sessionId, metadata } = await startCheckout(store, {
        discountCodeId: code.id,
      });
      expect(await usageOf(code.id)).toBe(3);
      const unpaid = webhookSession(store, sessionId, metadata, "unpaid");
      await post(makeCheckoutCompletedEvent(unpaid.session, ACCOUNT_ID));
      expect(await usageOf(code.id)).toBe(3);

      const failed = makeCheckoutAsyncPaymentFailedEvent(
        unpaid.session,
        ACCOUNT_ID,
      );
      await post(failed);
      expect(await usageOf(code.id)).toBe(2);
      await post(failed);
      expect(await usageOf(code.id)).toBe(2);
      expect(await db.order.count()).toBe(0);
    });

    it("async_payment_succeeded creates the order and keeps usage at 1 (not 2)", async () => {
      const store = await setupStore();
      // Limit 2, not 1: the order path's own increment is capped at the
      // limit, so a double count would only be visible with headroom.
      const code = await createDiscount(store.business.id, { usageLimit: 2 });
      const { sessionId, metadata } = await startCheckout(store, {
        discountCodeId: code.id,
      });
      const unpaid = webhookSession(store, sessionId, metadata, "unpaid");
      await post(makeCheckoutCompletedEvent(unpaid.session, ACCOUNT_ID));

      const paid = webhookSession(store, sessionId, metadata, "paid");
      stripeMocks.sessionsRetrieve.mockResolvedValue(paid.fullSession);
      const success = makeCheckoutAsyncPaymentSucceededEvent(
        paid.session,
        ACCOUNT_ID,
      );
      await post(success);

      const order = await db.order.findUniqueOrThrow({
        where: { stripeSessionId: sessionId },
      });
      expect(order.discountCodeId).toBe(code.id);
      expect((await reservationFor(sessionId)).status).toBe("consumed");
      expect(await usageOf(code.id)).toBe(1);

      // Duplicate success: still one order, still one use.
      await post(success);
      expect(await db.order.count()).toBe(1);
      expect(await usageOf(code.id)).toBe(1);
      // The use is final: nothing held any more.
      expect(
        (await countHeldDiscountUses(db, { businessId: store.business.id }))
          .size,
      ).toBe(0);
    });

    it("a card checkout (completed, paid) ends with usage 1", async () => {
      const store = await setupStore();
      const code = await createDiscount(store.business.id, { usageLimit: 3 });
      const { sessionId, metadata } = await startCheckout(store, {
        discountCodeId: code.id,
      });
      const paid = webhookSession(store, sessionId, metadata, "paid");
      stripeMocks.sessionsRetrieve.mockResolvedValue(paid.fullSession);
      await post(makeCheckoutCompletedEvent(paid.session, ACCOUNT_ID));

      expect(await db.order.count()).toBe(1);
      expect(await usageOf(code.id)).toBe(1);
      const product = await db.product.findUniqueOrThrow({
        where: { id: store.product.id },
      });
      expect(product.inventoryQty).toBe(9);
      expect(product.reservedQty).toBe(0);
    });

    it("the inventory transaction fails: the order stands, the hold is still consumed, and the sweeper cannot give the use back", async () => {
      const store = await setupStore();
      const code = await createDiscount(store.business.id, { usageLimit: 1 });
      const { sessionId, metadata } = await startCheckout(store, {
        discountCodeId: code.id,
      });
      expect(await usageOf(code.id)).toBe(1);

      // Fail the stock deduction inside the webhook's transaction (its sale
      // history row), which rolls the in-transaction consume back with it.
      await db.$executeRawUnsafe(`
        CREATE OR REPLACE FUNCTION fail_sale_history() RETURNS trigger AS $$
        BEGIN RAISE EXCEPTION 'injected inventory failure'; END;
        $$ LANGUAGE plpgsql`);
      await db.$executeRawUnsafe(`
        CREATE TRIGGER fail_sale_history BEFORE INSERT ON "InventoryHistory"
        FOR EACH ROW EXECUTE FUNCTION fail_sale_history()`);
      try {
        const paid = webhookSession(store, sessionId, metadata, "paid");
        stripeMocks.sessionsRetrieve.mockResolvedValue(paid.fullSession);
        await post(makeCheckoutCompletedEvent(paid.session, ACCOUNT_ID));
      } finally {
        await db.$executeRawUnsafe(
          `DROP TRIGGER IF EXISTS fail_sale_history ON "InventoryHistory"`,
        );
        await db.$executeRawUnsafe(`DROP FUNCTION IF EXISTS fail_sale_history`);
      }

      expect(await db.order.count()).toBe(1);
      // The failure was reported; the standalone consume then settled the hold.
      expect(sentryMocks.captureException).toHaveBeenCalledTimes(1);
      expect((await reservationFor(sessionId)).status).toBe("consumed");
      expect(await usageOf(code.id)).toBe(1);

      // Nothing is left active for the sweeper to release.
      await db.inventoryReservation.update({
        where: { stripeSessionId: sessionId },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });
      expect(
        await sweepStaleReservations(db, { businessId: store.business.id }),
      ).toBe(0);
      expect(await usageOf(code.id)).toBe(1);
    });

    it("legacy session (reservation without a discount entry): the order path still increments", async () => {
      const store = await setupStore();
      const code = await createDiscount(store.business.id, { usageLimit: 3 });
      // As create-session wrote it before uses were held at checkout start.
      const reservation = await db.inventoryReservation.create({
        data: {
          businessId: store.business.id,
          stripeSessionId: "cs_test_legacy",
          status: "active",
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
          items: [{ productId: store.product.id, qty: 1 }],
        },
      });
      await db.product.update({
        where: { id: store.product.id },
        data: { reservedQty: 1 },
      });
      const paid = webhookSession(
        store,
        "cs_test_legacy",
        {
          businessId: store.business.id,
          discountCodeId: code.id,
          deliveryMethod: "pickup",
          reservationId: reservation.id,
        },
        "paid",
      );
      stripeMocks.sessionsRetrieve.mockResolvedValue(paid.fullSession);
      await post(makeCheckoutCompletedEvent(paid.session, ACCOUNT_ID));

      expect(await db.order.count()).toBe(1);
      expect(
        (
          await db.inventoryReservation.findUniqueOrThrow({
            where: { id: reservation.id },
          })
        ).status,
      ).toBe("consumed");
      expect(await usageOf(code.id)).toBe(1);
    });

    it("the stale sweeper releases the use once; a late success then counts it at the order", async () => {
      const store = await setupStore();
      const code = await createDiscount(store.business.id, {
        usageLimit: 5,
        usageCount: 2,
      });
      const { sessionId, metadata } = await startCheckout(store, {
        discountCodeId: code.id,
      });
      expect(await usageOf(code.id)).toBe(3);
      await db.inventoryReservation.update({
        where: { stripeSessionId: sessionId },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });

      expect(
        await sweepStaleReservations(db, { businessId: store.business.id }),
      ).toBe(1);
      expect(await usageOf(code.id)).toBe(2);
      expect(
        await sweepStaleReservations(db, { businessId: store.business.id }),
      ).toBe(0);
      expect(await usageOf(code.id)).toBe(2);

      // The bank payment clears after the hold was swept: the released
      // reservation is not consumed, so the order path counts the use.
      const paid = webhookSession(store, sessionId, metadata, "paid");
      stripeMocks.sessionsRetrieve.mockResolvedValue(paid.fullSession);
      await post(
        makeCheckoutAsyncPaymentSucceededEvent(paid.session, ACCOUNT_ID),
      );
      expect(await db.order.count()).toBe(1);
      expect(await usageOf(code.id)).toBe(3);
    });
  });

  describe("admin tidy-up and reward-code status", () => {
    it("does not deactivate a code at its limit only through an open checkout; it is usable again once the hold is released", async () => {
      const store = await setupStore();
      const held = await createDiscount(store.business.id, { usageLimit: 1 });
      const spent = await createDiscount(store.business.id, {
        usageLimit: 1,
        usageCount: 1,
      });
      const { sessionId, metadata } = await startCheckout(store, {
        discountCodeId: held.id,
      });
      expect(await usageOf(held.id)).toBe(1);

      const result = await deactivateExpiredDiscountCodes(
        db,
        store.business.id,
      );
      expect(result.deactivatedByUsage).toBe(1);
      expect(
        (await db.discountCode.findUniqueOrThrow({ where: { id: held.id } }))
          .active,
      ).toBe(true);
      expect(
        (await db.discountCode.findUniqueOrThrow({ where: { id: spent.id } }))
          .active,
      ).toBe(false);

      // While held, checkout still refuses it.
      const blocked = await startCheckout(store, { discountCodeId: held.id });
      expect(blocked.body.error).toBe(DISCOUNT_ERROR);

      await post(
        makeCheckoutExpiredEvent(
          webhookSession(store, sessionId, metadata, "unpaid").session,
          ACCOUNT_ID,
        ),
      );
      await deactivateExpiredDiscountCodes(db, store.business.id);
      const after = await db.discountCode.findUniqueOrThrow({
        where: { id: held.id },
      });
      expect(after.active).toBe(true);
      expect(after.usageCount).toBe(0);
      const retry = await startCheckout(store, { discountCodeId: held.id });
      expect(retry.res.status).toBe(200);
    });

    it("a held reward code reports heldUses on the loyalty ledger (Pending, not Used)", async () => {
      const store = await setupStore();
      const customer = await createCustomer(store.business.id, {
        email: "jane@shopper.test",
      });
      const code = await db.discountCode.create({
        data: {
          businessId: store.business.id,
          code: "RWD-ABC234",
          type: "fixed",
          value: 500,
          usageLimit: 1,
          perCustomerLimit: 1,
          source: "loyalty",
        },
      });
      await db.loyaltyLedger.create({
        data: {
          businessId: store.business.id,
          customerId: customer.id,
          type: "redeem",
          points: -100,
          balanceAfter: 0,
          reason: "$5 off",
          sourceKey: "redeem:test",
          discountCodeId: code.id,
        },
      });

      await startCheckout(store, { discountCodeId: code.id });
      let [entry] = await listLedger(db, {
        businessId: store.business.id,
        customerId: customer.id,
      });
      expect(entry!.discountCode).toMatchObject({
        usageCount: 1,
        heldUses: 1,
      });

      // Settled by a card order → the use is final.
      const reservation = await db.inventoryReservation.findFirstOrThrow({
        where: { status: "active" },
      });
      const items = reservation.items as ReservationEntry[];
      expect(items.some((e) => e.discountCodeId === code.id)).toBe(true);
      const paid = webhookSession(
        store,
        reservation.stripeSessionId!,
        {
          businessId: store.business.id,
          discountCodeId: code.id,
          deliveryMethod: "pickup",
          reservationId: reservation.id,
        },
        "paid",
      );
      stripeMocks.sessionsRetrieve.mockResolvedValue(paid.fullSession);
      await post(makeCheckoutCompletedEvent(paid.session, ACCOUNT_ID));
      [entry] = await listLedger(db, {
        businessId: store.business.id,
        customerId: customer.id,
      });
      expect(entry!.discountCode).toMatchObject({
        usageCount: 1,
        heldUses: 0,
      });
    });
  });

  describe("superseding the shopper's own open checkout (pending_session cookie)", () => {
    type FakeSession = {
      account: string;
      status: "open" | "complete" | "expired";
      metadata: Record<string, string>;
    };
    /** Stripe's view of the checkout sessions, keyed by id. */
    let stripeSessions: Map<string, FakeSession>;

    function stripeNotFound() {
      return Object.assign(new Error("No such checkout.session"), {
        type: "StripeInvalidRequestError",
        code: "resource_missing",
        statusCode: 404,
      });
    }

    function accountOf(args: unknown[]): string | undefined {
      for (const arg of args) {
        const account = (arg as { stripeAccount?: string } | undefined)
          ?.stripeAccount;
        if (account) return account;
      }
      return undefined;
    }

    function stripeSession(id: string, s: FakeSession) {
      return {
        id,
        object: "checkout.session",
        mode: "payment",
        status: s.status,
        metadata: { ...s.metadata },
      };
    }

    function register(
      sessionId: string,
      metadata: Record<string, string>,
      status: FakeSession["status"] = "open",
      account = ACCOUNT_ID,
    ) {
      stripeSessions.set(sessionId, { account, status, metadata });
    }

    /** The expired event Stripe sends for a session, as it is now. */
    function expiredEventFor(store: Store, sessionId: string) {
      const s = stripeSessions.get(sessionId)!;
      return makeCheckoutExpiredEvent(
        webhookSession(store, sessionId, s.metadata, "unpaid").session,
        ACCOUNT_ID,
      );
    }

    async function reservedQty(store: Store) {
      return (
        await db.product.findUniqueOrThrow({ where: { id: store.product.id } })
      ).reservedQty;
    }

    async function enableAbandonedEmails(store: Store) {
      await db.business.update({
        where: { id: store.business.id },
        // Reminders only send with a postal address (CAN-SPAM).
        data: {
          sendAbandonedCheckoutEmails: true,
          addressStreet: "1 Market St",
          addressCity: "Detroit",
          addressState: "MI",
          addressPostalCode: "48201",
        },
      });
    }

    beforeEach(() => {
      stripeSessions = new Map();
      stripeMocks.sessionsRetrieve.mockImplementation(
        (id: string, ...rest: unknown[]) => {
          const s = stripeSessions.get(id);
          if (!s || s.account !== accountOf(rest))
            return Promise.reject(stripeNotFound());
          return Promise.resolve(stripeSession(id, s));
        },
      );
      stripeMocks.sessionsUpdate.mockImplementation(
        (
          id: string,
          params: { metadata?: Record<string, string> },
          opts: { stripeAccount?: string },
        ) => {
          const s = stripeSessions.get(id);
          if (!s || s.account !== opts.stripeAccount)
            return Promise.reject(stripeNotFound());
          // Stripe merges metadata keys.
          s.metadata = { ...s.metadata, ...params.metadata };
          return Promise.resolve(stripeSession(id, s));
        },
      );
      stripeMocks.sessionsExpire.mockImplementation(
        (id: string, _params: unknown, opts: { stripeAccount?: string }) => {
          const s = stripeSessions.get(id);
          if (!s || s.account !== opts.stripeAccount)
            return Promise.reject(stripeNotFound());
          if (s.status !== "open") {
            return Promise.reject(
              Object.assign(new Error("Session is not open"), {
                type: "StripeInvalidRequestError",
              }),
            );
          }
          s.status = "expired";
          return Promise.resolve(stripeSession(id, s));
        },
      );
    });

    // Every Stripe call of the supersede/lookup step carries a timeout — the
    // per-attempt cap or less (what is left of the step's budget), never 0 or
    // a fraction (stripe-node would fall back to its 80s default) — one
    // network retry, and the connected account.
    const HOLD_REQUEST_OPTS = {
      stripeAccount: ACCOUNT_ID,
      timeout: expect.toSatisfy(
        (t: unknown) =>
          Number.isInteger(t) &&
          (t as number) > 0 &&
          (t as number) <= STRIPE_HOLD_REQUEST_TIMEOUT_MS,
        "a positive integer timeout <= STRIPE_HOLD_REQUEST_TIMEOUT_MS",
      ) as number,
      maxNetworkRetries: 1,
    };

    /** What stripe-node throws when a request times out / the socket drops:
     *  outcome UNKNOWN (Stripe may have committed the write). */
    function stripeConnectionError() {
      return Object.assign(new Error("Request timed out"), {
        type: "StripeConnectionError",
      });
    }

    /** Stripe answered with an error (5xx after stripe-node's retry): a
     *  DEFINITE failure — the write did not happen. */
    function stripeApiError() {
      return Object.assign(new Error("An unknown error occurred"), {
        type: "StripeAPIError",
        statusCode: 500,
      });
    }

    function supersededMarkOf(sessionId: string) {
      return stripeSessions.get(sessionId)!.metadata.supersededAt;
    }

    describe("create-session", () => {
      it("single-use code: Back + continue again supersedes the first session instead of rejecting the shopper", async () => {
        const store = await setupStore();
        await enableAbandonedEmails(store);
        const code = await createDiscount(store.business.id, {
          usageLimit: 1,
        });
        const a = await startCheckout(store, { discountCodeId: code.id });
        expect(a.res.status).toBe(200);
        register(a.sessionId, a.metadata);

        const b = await startCheckout(store, {
          discountCodeId: code.id,
          pendingSession: a.cookie,
        });
        expect(b.res.status).toBe(200);
        expect(stripeMocks.sessionsExpire).toHaveBeenCalledTimes(1);
        expect(stripeMocks.sessionsExpire).toHaveBeenCalledWith(
          a.sessionId,
          {},
          HOLD_REQUEST_OPTS,
        );
        // Marked before it was expired, existing metadata kept.
        const markedA = stripeSessions.get(a.sessionId)!.metadata;
        expect(markedA).toMatchObject({
          businessId: store.business.id,
          reservationId: a.metadata.reservationId,
        });
        expect(markedA.supersededAt).toMatch(/^\d+$/);
        expect((await reservationFor(a.sessionId)).status).toBe("released");
        expect((await reservationFor(b.sessionId)).status).toBe("active");
        expect(await usageOf(code.id)).toBe(1);
        expect(await reservedQty(store)).toBe(1);

        // A's own expired webhook: no abandoned email to a shopper who is
        // checking out right now, and nothing released twice.
        const expiredA = expiredEventFor(store, a.sessionId);
        await post(expiredA);
        await post(expiredA);
        expect(emailMocks.sendEmail).not.toHaveBeenCalled();
        expect(await usageOf(code.id)).toBe(1);
        expect(await reservedQty(store)).toBe(1);
        expect((await reservationFor(b.sessionId)).status).toBe("active");

        // Control: B really abandoned → the email does go out.
        register(b.sessionId, b.metadata, "expired");
        await post(expiredEventFor(store, b.sessionId));
        expect(emailMocks.sendEmail).toHaveBeenCalledTimes(1);
        expect(await usageOf(code.id)).toBe(0);
        expect(await reservedQty(store)).toBe(0);
      });

      it("every new session carries the signed-cookie marker", async () => {
        const store = await setupStore();
        const a = await startCheckout(store);
        expect(a.res.status).toBe(200);
        expect(a.metadata[PENDING_COOKIE_MARKER_KEY]).toBe(
          PENDING_COOKIE_MARKER_VALUE,
        );
        expect(PENDING_COOKIE_MARKER_VALUE).toBe("signed-v1");
      });

      it("expire fails definitely (Stripe error response) and the re-check says still open: the mark is cleared, the hold kept, the new checkout not blocked", async () => {
        const store = await setupStore();
        await enableAbandonedEmails(store);
        const a = await startCheckout(store);
        expect(a.res.status).toBe(200);
        register(a.sessionId, a.metadata);
        stripeMocks.sessionsExpire.mockRejectedValueOnce(stripeApiError());

        const b = await startCheckout(store, { pendingSession: a.cookie });
        expect(b.res.status).toBe(200);

        // Looked up, marked, expire failed, re-checked (open), un-marked —
        // all on the right account.
        expect(stripeMocks.sessionsRetrieve).toHaveBeenCalledTimes(2);
        expect(stripeMocks.sessionsUpdate).toHaveBeenCalledTimes(2);
        const markCall = stripeMocks.sessionsUpdate.mock.calls[0] as [
          string,
          { metadata: Record<string, string> },
          { stripeAccount: string },
        ];
        expect(markCall[0]).toBe(a.sessionId);
        expect(markCall[1].metadata.supersededAt).toMatch(/^\d+$/);
        expect(markCall[2]).toEqual(HOLD_REQUEST_OPTS);
        expect(stripeMocks.sessionsUpdate).toHaveBeenNthCalledWith(
          2,
          a.sessionId,
          { metadata: { supersededAt: "" } },
          HOLD_REQUEST_OPTS,
        );
        expect(stripeSessions.get(a.sessionId)!.status).toBe("open");
        expect((await reservationFor(a.sessionId)).status).toBe("active");

        // A really abandons later → the abandoned-cart email is not suppressed.
        register(
          a.sessionId,
          stripeSessions.get(a.sessionId)!.metadata,
          "expired",
        );
        await post(expiredEventFor(store, a.sessionId));
        expect(emailMocks.sendEmail).toHaveBeenCalledTimes(1);
      });

      it("expire fails definitely but the re-check says expired: the hold is released inline, the mark is NOT cleared", async () => {
        const store = await setupStore();
        const code = await createDiscount(store.business.id, {
          usageLimit: 1,
        });
        const a = await startCheckout(store, { discountCodeId: code.id });
        register(a.sessionId, a.metadata);
        // The session lapsed on its own between the mark and the expire call.
        stripeMocks.sessionsExpire.mockImplementationOnce(() => {
          stripeSessions.get(a.sessionId)!.status = "expired";
          return Promise.reject(stripeApiError());
        });

        const b = await startCheckout(store, {
          discountCodeId: code.id,
          pendingSession: a.cookie,
        });
        expect(b.res.status).toBe(200);

        expect(stripeMocks.sessionsRetrieve).toHaveBeenCalledTimes(2);
        expect(stripeMocks.sessionsUpdate).toHaveBeenCalledTimes(1);
        expect(supersededMarkOf(a.sessionId)).toMatch(/^\d+$/);
        expect((await reservationFor(a.sessionId)).status).toBe("released");
        expect((await reservationFor(b.sessionId)).status).toBe("active");
        expect(await usageOf(code.id)).toBe(1);
      });

      it("expire fails definitely and the re-check fails too: can't tell, so the mark is NOT cleared, the hold kept, the new checkout not blocked", async () => {
        const store = await setupStore();
        const code = await createDiscount(store.business.id, {
          usageLimit: 5,
        });
        const a = await startCheckout(store, { discountCodeId: code.id });
        register(a.sessionId, a.metadata);
        stripeMocks.sessionsExpire.mockRejectedValueOnce(stripeApiError());
        // Lookup succeeds (default impl), the re-check after the failed expire
        // does not.
        const lookup = stripeMocks.sessionsRetrieve.getMockImplementation()!;
        stripeMocks.sessionsRetrieve.mockImplementationOnce(lookup);
        stripeMocks.sessionsRetrieve.mockRejectedValueOnce(
          stripeConnectionError(),
        );

        const b = await startCheckout(store, {
          discountCodeId: code.id,
          pendingSession: a.cookie,
        });
        expect(b.res.status).toBe(200);

        expect(stripeMocks.sessionsRetrieve).toHaveBeenCalledTimes(2);
        expect(stripeMocks.sessionsUpdate).toHaveBeenCalledTimes(1);
        expect(supersededMarkOf(a.sessionId)).toMatch(/^\d+$/);
        expect((await reservationFor(a.sessionId)).status).toBe("active");
        expect(await usageOf(code.id)).toBe(2);
        expect(await reservedQty(store)).toBe(2);
      });

      it("expire outcome unknown (timeout) AFTER Stripe expired the session: the hold is released inline, the mark is NOT cleared, the new single-use checkout succeeds", async () => {
        const store = await setupStore();
        await enableAbandonedEmails(store);
        const code = await createDiscount(store.business.id, {
          usageLimit: 1,
        });
        const a = await startCheckout(store, { discountCodeId: code.id });
        expect(a.res.status).toBe(200);
        register(a.sessionId, a.metadata);
        // Stripe commits the expire, but the response never reaches us.
        stripeMocks.sessionsExpire.mockImplementationOnce(() => {
          stripeSessions.get(a.sessionId)!.status = "expired";
          return Promise.reject(stripeConnectionError());
        });

        const b = await startCheckout(store, {
          discountCodeId: code.id,
          pendingSession: a.cookie,
        });
        expect(b.res.status).toBe(200);

        // Looked up once, re-checked once after the failed expire.
        expect(stripeMocks.sessionsRetrieve).toHaveBeenCalledTimes(2);
        expect(stripeMocks.sessionsRetrieve).toHaveBeenLastCalledWith(
          a.sessionId,
          HOLD_REQUEST_OPTS,
        );
        // Marked, never un-marked.
        expect(stripeMocks.sessionsUpdate).toHaveBeenCalledTimes(1);
        expect(supersededMarkOf(a.sessionId)).toMatch(/^\d+$/);
        expect((await reservationFor(a.sessionId)).status).toBe("released");
        expect((await reservationFor(b.sessionId)).status).toBe("active");
        expect(await usageOf(code.id)).toBe(1);
        expect(await reservedQty(store)).toBe(1);

        // A's expired webhook: no abandoned email, nothing released twice.
        const expiredA = expiredEventFor(store, a.sessionId);
        await post(expiredA);
        expect(emailMocks.sendEmail).not.toHaveBeenCalled();
        expect(await usageOf(code.id)).toBe(1);
        expect(await reservedQty(store)).toBe(1);
      });

      it("expire outcome unknown (timeout) and the re-check says still open: the mark is NOT cleared, the hold kept", async () => {
        const store = await setupStore();
        await enableAbandonedEmails(store);
        const a = await startCheckout(store);
        register(a.sessionId, a.metadata);
        // Stripe may still commit this expire after the re-check.
        stripeMocks.sessionsExpire.mockRejectedValueOnce(
          stripeConnectionError(),
        );

        const b = await startCheckout(store, { pendingSession: a.cookie });
        expect(b.res.status).toBe(200);

        expect(stripeMocks.sessionsRetrieve).toHaveBeenCalledTimes(2);
        // Only the mark — no clear.
        expect(stripeMocks.sessionsUpdate).toHaveBeenCalledTimes(1);
        expect(supersededMarkOf(a.sessionId)).toMatch(/^\d+$/);
        expect(stripeSessions.get(a.sessionId)!.status).toBe("open");
        expect((await reservationFor(a.sessionId)).status).toBe("active");

        // The late expire lands: the shopper (checking out as B right now)
        // gets no abandoned-cart email for A. The accepted trade-off: had A
        // truly been abandoned instead, its email would be missed too.
        register(
          a.sessionId,
          stripeSessions.get(a.sessionId)!.metadata,
          "expired",
        );
        await post(expiredEventFor(store, a.sessionId));
        expect(emailMocks.sendEmail).not.toHaveBeenCalled();
      });

      it("every Stripe call (lookup, mark, expire, re-check, un-mark) gets a bounded timeout, one network retry and the connected account", async () => {
        expect(STRIPE_HOLD_REQUEST_TIMEOUT_MS).toBeLessThanOrEqual(10_000);
        expect(SUPERSEDE_BUDGET_MS).toBeLessThanOrEqual(10_000);
        const store = await setupStore();
        const a = await startCheckout(store);
        register(a.sessionId, a.metadata);
        // Exercise the full chain: expire fails definitely, the re-check says
        // still open → un-mark.
        stripeMocks.sessionsExpire.mockRejectedValueOnce(stripeApiError());

        const b = await startCheckout(store, { pendingSession: a.cookie });
        expect(b.res.status).toBe(200);

        expect(stripeMocks.sessionsRetrieve).toHaveBeenCalledTimes(2);
        expect(stripeMocks.sessionsUpdate).toHaveBeenCalledTimes(2);
        expect(stripeMocks.sessionsExpire).toHaveBeenCalledTimes(1);
        for (const mock of [
          stripeMocks.sessionsRetrieve,
          stripeMocks.sessionsUpdate,
          stripeMocks.sessionsExpire,
        ]) {
          for (const call of mock.mock.calls) {
            expect(call[call.length - 1]).toEqual(HOLD_REQUEST_OPTS);
          }
        }
      });

      describe("the whole step runs within SUPERSEDE_BUDGET_MS", () => {
        /**
         * Every lookup/mark/expire/re-check call takes `stepMs` of simulated
         * time (Date.now is pinned and only these mocks advance it), so the
         * run is deterministic.
         */
        async function supersedeWithSlowStripe(
          store: Store,
          pendingSession: string,
          stepMs: number,
        ) {
          let fakeNow = Date.now();
          const start = fakeNow;
          const nowSpy = vi
            .spyOn(Date, "now")
            .mockImplementation(() => fakeNow);
          for (const mock of [
            stripeMocks.sessionsRetrieve,
            stripeMocks.sessionsUpdate,
            stripeMocks.sessionsExpire,
          ]) {
            const impl = mock.getMockImplementation()!;
            mock.mockImplementation((...args: unknown[]): unknown => {
              fakeNow += stepMs;
              return (impl as (...a: unknown[]) => unknown)(...args);
            });
          }
          try {
            const b = await startCheckout(store, { pendingSession });
            return { b, elapsedMs: fakeNow - start };
          } finally {
            nowSpy.mockRestore();
          }
        }

        function timeoutOf(call: unknown[]) {
          return (call[call.length - 1] as { timeout: number }).timeout;
        }

        it("4s per call: the lookup and the mark fit, the expire and the re-check are skipped (never sent); unknown outcome → mark and hold kept, the new checkout still succeeds", async () => {
          const store = await setupStore();
          const a = await startCheckout(store);
          register(a.sessionId, a.metadata);

          const { b, elapsedMs } = await supersedeWithSlowStripe(
            store,
            a.cookie,
            4000,
          );
          expect(b.res.status).toBe(200);

          expect(stripeMocks.sessionsRetrieve).toHaveBeenCalledTimes(1);
          expect(stripeMocks.sessionsUpdate).toHaveBeenCalledTimes(1);
          expect(stripeMocks.sessionsExpire).not.toHaveBeenCalled();
          // 8s left → the full per-attempt timeout; 4s left → 4s.
          expect(timeoutOf(stripeMocks.sessionsRetrieve.mock.calls[0]!)).toBe(
            STRIPE_HOLD_REQUEST_TIMEOUT_MS,
          );
          expect(timeoutOf(stripeMocks.sessionsUpdate.mock.calls[0]!)).toBe(
            SUPERSEDE_BUDGET_MS - 4000,
          );
          expect(elapsedMs).toBeLessThanOrEqual(SUPERSEDE_BUDGET_MS + 4000);

          expect(supersededMarkOf(a.sessionId)).toMatch(/^\d+$/);
          expect(stripeSessions.get(a.sessionId)!.status).toBe("open");
          expect((await reservationFor(a.sessionId)).status).toBe("active");
          expect((await reservationFor(b.sessionId)).status).toBe("active");
        });

        it("3s per call: the expire still fits with a shortened timeout and the hold is released", async () => {
          const store = await setupStore();
          const a = await startCheckout(store);
          register(a.sessionId, a.metadata);

          const { b, elapsedMs } = await supersedeWithSlowStripe(
            store,
            a.cookie,
            3000,
          );
          expect(b.res.status).toBe(200);

          expect(stripeMocks.sessionsExpire).toHaveBeenCalledTimes(1);
          expect(timeoutOf(stripeMocks.sessionsExpire.mock.calls[0]!)).toBe(
            SUPERSEDE_BUDGET_MS - 6000,
          );
          expect(elapsedMs).toBe(9000);
          expect((await reservationFor(a.sessionId)).status).toBe("released");
        });
      });

      it("expire fails with an invalid-request error (completed/expired in between): the mark is NOT cleared", async () => {
        const store = await setupStore();
        const a = await startCheckout(store);
        register(a.sessionId, a.metadata);
        stripeMocks.sessionsExpire.mockRejectedValueOnce(
          Object.assign(new Error("Session is not open"), {
            type: "StripeInvalidRequestError",
          }),
        );

        const b = await startCheckout(store, { pendingSession: a.cookie });
        expect(b.res.status).toBe(200);

        expect(stripeMocks.sessionsUpdate).toHaveBeenCalledTimes(1);
        expect(stripeSessions.get(a.sessionId)!.metadata.supersededAt).toMatch(
          /^\d+$/,
        );
        expect((await reservationFor(a.sessionId)).status).toBe("active");
      });

      it("the lookup times out (StripeConnectionError): the new checkout still succeeds and no hold is released", async () => {
        const store = await setupStore();
        const code = await createDiscount(store.business.id, {
          usageLimit: 5,
        });
        const a = await startCheckout(store, { discountCodeId: code.id });
        register(a.sessionId, a.metadata);
        stripeMocks.sessionsRetrieve.mockRejectedValueOnce(
          stripeConnectionError(),
        );

        const b = await startCheckout(store, {
          discountCodeId: code.id,
          pendingSession: a.cookie,
        });
        expect(b.res.status).toBe(200);

        expect(stripeMocks.sessionsRetrieve).toHaveBeenCalledTimes(1);
        expect(stripeMocks.sessionsUpdate).not.toHaveBeenCalled();
        expect(stripeMocks.sessionsExpire).not.toHaveBeenCalled();
        expect((await reservationFor(a.sessionId)).status).toBe("active");
        expect((await reservationFor(b.sessionId)).status).toBe("active");
        expect(await usageOf(code.id)).toBe(2);
        expect(await reservedQty(store)).toBe(2);
      });

      it("every Stripe call cut off by the step deadline: no Sentry event, a breadcrumb, and the new checkout still succeeds", async () => {
        const store = await setupStore();
        const code = await createDiscount(store.business.id, {
          usageLimit: 5,
        });
        const a = await startCheckout(store, { discountCodeId: code.id });
        register(a.sessionId, a.metadata);
        // The lookup works; mark, expire and the re-check all run out of budget.
        const cutOff = () =>
          Promise.reject(new DeadlineExceededError("cut off at the deadline"));
        stripeMocks.sessionsUpdate.mockImplementation(cutOff);
        stripeMocks.sessionsExpire.mockImplementation(cutOff);
        stripeMocks.sessionsRetrieve.mockReset();
        stripeMocks.sessionsRetrieve
          .mockResolvedValueOnce(
            stripeSession(a.sessionId, stripeSessions.get(a.sessionId)!),
          )
          .mockImplementation(cutOff);

        const b = await startCheckout(store, {
          discountCodeId: code.id,
          pendingSession: a.cookie,
        });
        expect(b.res.status).toBe(200);

        expect(stripeMocks.sessionsExpire).toHaveBeenCalledTimes(1);
        expect(holdCaptures()).toEqual([]);
        expect(sentryMocks.captureException).not.toHaveBeenCalled();
        expect(sentryMocks.addBreadcrumb).toHaveBeenCalledWith(
          expect.objectContaining({
            category: "checkout",
            level: "info",
            message: expect.stringContaining(
              "supersede-pending-session",
            ) as string,
          }),
        );
        // The hold is untouched (outcome unknown), the new checkout holds too.
        expect((await reservationFor(a.sessionId)).status).toBe("active");
        expect((await reservationFor(b.sessionId)).status).toBe("active");
      });

      it("a deadline error that is a PLAIN object (not our class instance) is still treated as expected: no Sentry event, a breadcrumb", async () => {
        const store = await setupStore();
        const code = await createDiscount(store.business.id, {
          usageLimit: 5,
        });
        const a = await startCheckout(store, { discountCodeId: code.id });
        register(a.sessionId, a.metadata);
        stripeMocks.sessionsRetrieve.mockRejectedValueOnce({
          type: "DeadlineExceededError",
        });

        const b = await startCheckout(store, {
          discountCodeId: code.id,
          pendingSession: a.cookie,
        });
        expect(b.res.status).toBe(200);

        expect(holdCaptures()).toEqual([]);
        expect(sentryMocks.captureException).not.toHaveBeenCalled();
        expect(sentryMocks.addBreadcrumb).toHaveBeenCalledWith(
          expect.objectContaining({
            category: "checkout",
            level: "info",
            message: expect.stringContaining(
              "supersede-pending-session",
            ) as string,
          }),
        );
      });

      it("a genuine StripeConnectionError (not a deadline cut-off) is still captured, once, with a stable fingerprint", async () => {
        const store = await setupStore();
        const code = await createDiscount(store.business.id, {
          usageLimit: 5,
        });
        const a = await startCheckout(store, { discountCodeId: code.id });
        register(a.sessionId, a.metadata);
        stripeMocks.sessionsRetrieve.mockRejectedValueOnce(
          stripeConnectionError(),
        );

        const b = await startCheckout(store, {
          discountCodeId: code.id,
          pendingSession: a.cookie,
        });
        expect(b.res.status).toBe(200);

        expect(holdCaptures()).toHaveLength(1);
        expect(holdCaptures()[0]![1]).toMatchObject({
          level: "warning",
          fingerprint: [
            "supersede",
            "supersede-pending-session",
            "StripeConnectionError",
          ],
          tags: {
            route: "stripe.create-session",
            "checkout.step": "supersede-pending-session",
          },
        });
      });

      it("the rethrown expire failure is not captured when it was a deadline cut-off, but a Stripe API error is", async () => {
        const store = await setupStore();
        const code = await createDiscount(store.business.id, {
          usageLimit: 5,
        });
        const a = await startCheckout(store, { discountCodeId: code.id });
        register(a.sessionId, a.metadata);
        stripeMocks.sessionsExpire.mockRejectedValueOnce(
          new DeadlineExceededError("Skipped Stripe call: 0ms of budget left"),
        );
        const b = await startCheckout(store, {
          discountCodeId: code.id,
          pendingSession: a.cookie,
        });
        expect(b.res.status).toBe(200);
        expect(holdCaptures()).toEqual([]);

        // Same shape with a definite Stripe failure: reported once.
        const nextCookie = b.cookie;
        register(b.sessionId, b.metadata);
        stripeMocks.sessionsExpire.mockRejectedValueOnce(stripeApiError());
        const c = await startCheckout(store, {
          discountCodeId: code.id,
          pendingSession: nextCookie,
        });
        expect(c.res.status).toBe(200);
        expect(holdCaptures()).toHaveLength(1);
        expect(holdCaptures()[0]![1]).toMatchObject({
          fingerprint: [
            "supersede",
            "supersede-pending-session",
            "StripeAPIError",
          ],
        });
      });

      it("perCustomerLimit-1 code: the shopper's superseded hold no longer counts against them", async () => {
        const store = await setupStore();
        const code = await createDiscount(store.business.id, {
          perCustomerLimit: 1,
        });
        const a = await startCheckout(store, { discountCodeId: code.id });
        expect(a.res.status).toBe(200);
        register(a.sessionId, a.metadata);

        const b = await startCheckout(store, {
          discountCodeId: code.id,
          pendingSession: a.cookie,
        });
        expect(b.res.status).toBe(200);
        expect(stripeMocks.sessionsExpire).toHaveBeenCalledWith(
          a.sessionId,
          {},
          HOLD_REQUEST_OPTS,
        );
        expect((await reservationFor(a.sessionId)).status).toBe("released");
        expect(await usageOf(code.id)).toBe(1);
        expect(
          (
            await countHeldDiscountUses(db, {
              businessId: store.business.id,
              customerEmail: "jane@shopper.test",
            })
          ).get(code.id),
        ).toBe(1);

        await post(expiredEventFor(store, a.sessionId));
        expect(await usageOf(code.id)).toBe(1);
        expect((await reservationFor(b.sessionId)).status).toBe("active");
      });

      it("a session that already completed (bank payment pending) is never expired or released", async () => {
        const store = await setupStore();
        const code = await createDiscount(store.business.id, {
          usageLimit: 1,
        });
        const a = await startCheckout(store, { discountCodeId: code.id });
        register(a.sessionId, a.metadata);
        await post(
          makeCheckoutCompletedEvent(
            webhookSession(store, a.sessionId, a.metadata, "unpaid").session,
            ACCOUNT_ID,
          ),
        );
        stripeSessions.get(a.sessionId)!.status = "complete";

        const b = await startCheckout(store, {
          discountCodeId: code.id,
          pendingSession: a.cookie,
        });
        // The use is genuinely spoken for by the pending bank payment.
        expect(b.res.status).toBe(400);
        expect(b.body.error).toBe(DISCOUNT_ERROR);
        expect(stripeMocks.sessionsExpire).not.toHaveBeenCalled();
        expect(stripeMocks.sessionsUpdate).not.toHaveBeenCalled();
        expect((await reservationFor(a.sessionId)).status).toBe("active");
        expect(await usageOf(code.id)).toBe(1);
        expect(await db.inventoryReservation.count()).toBe(1);
      });

      it("a garbage cookie is ignored without a Stripe call", async () => {
        const store = await setupStore();
        const code = await createDiscount(store.business.id, {
          usageLimit: 2,
        });
        const b = await startCheckout(store, {
          discountCodeId: code.id,
          pendingSession: "not-a-session%ZZ",
        });
        expect(b.res.status).toBe(200);
        expect(stripeMocks.sessionsRetrieve).not.toHaveBeenCalled();
        expect(stripeMocks.sessionsExpire).not.toHaveBeenCalled();
        expect(await usageOf(code.id)).toBe(1);
      });

      it("another business's session is left alone and its hold is never released", async () => {
        const store = await setupStore();
        const code = await createDiscount(store.business.id, {
          usageLimit: 2,
        });
        // Another store (own connected account) with an open checkout holding
        // stock and a use of its own code.
        const other = await db.business.update({
          where: {
            id: (await createBusiness({ subdomain: "other-hold-biz" })).id,
          },
          data: { stripeAccountId: "acct_other_store" },
        });
        const otherProduct = await createProduct(other.id, {
          inventoryQty: 5,
        });
        const otherCode = await createDiscount(other.id, {
          usageLimit: 1,
          usageCount: 1,
        });
        await db.product.update({
          where: { id: otherProduct.id },
          data: { reservedQty: 1 },
        });
        const foreign = await db.inventoryReservation.create({
          data: {
            businessId: other.id,
            stripeSessionId: "cs_test_foreign",
            status: "active",
            expiresAt: new Date(Date.now() + 30 * 60 * 1000),
            items: [
              { productId: otherProduct.id, qty: 1 },
              {
                discountCodeId: otherCode.id,
                customerEmail: "jane@shopper.test",
                qty: 1,
              },
            ],
          },
        });
        register(
          "cs_test_foreign",
          { businessId: other.id, reservationId: foreign.id },
          "open",
          "acct_other_store",
        );

        // Even a validly signed cookie naming it finds no active hold of
        // THIS store → no Stripe call at all; a cookie signed for the other
        // store does not verify here.
        for (const pendingSession of [
          signPendingSessionCookie("cs_test_foreign", store.business.id),
          signPendingSessionCookie("cs_test_foreign", other.id),
        ]) {
          const b = await startCheckout(store, {
            discountCodeId: code.id,
            pendingSession,
          });
          expect(b.res.status).toBe(200);
        }
        expect(stripeMocks.sessionsRetrieve).not.toHaveBeenCalled();
        expect(stripeMocks.sessionsExpire).not.toHaveBeenCalled();
        expect(stripeSessions.get("cs_test_foreign")!.status).toBe("open");
        expect(
          (
            await db.inventoryReservation.findUniqueOrThrow({
              where: { id: foreign.id },
            })
          ).status,
        ).toBe("active");
        expect(await usageOf(otherCode.id)).toBe(1);
        expect(
          (
            await db.product.findUniqueOrThrow({
              where: { id: otherProduct.id },
            })
          ).reservedQty,
        ).toBe(1);

        // A hold of this store whose session (same account) carries another
        // business's metadata: retrieved, but left alone.
        const odd = await db.inventoryReservation.create({
          data: {
            businessId: store.business.id,
            stripeSessionId: "cs_test_foreign_meta",
            status: "active",
            expiresAt: new Date(Date.now() + 30 * 60 * 1000),
            items: [{ productId: store.product.id, qty: 1 }],
          },
        });
        register("cs_test_foreign_meta", { businessId: other.id });
        const c = await startCheckout(store, {
          pendingSession: signPendingSessionCookie(
            "cs_test_foreign_meta",
            store.business.id,
          ),
        });
        expect(c.res.status).toBe(200);
        expect(stripeMocks.sessionsRetrieve).toHaveBeenCalledWith(
          "cs_test_foreign_meta",
          HOLD_REQUEST_OPTS,
        );
        expect(stripeMocks.sessionsExpire).not.toHaveBeenCalled();
        expect(stripeMocks.sessionsUpdate).not.toHaveBeenCalled();
        expect(
          (
            await db.inventoryReservation.findUniqueOrThrow({
              where: { id: odd.id },
            })
          ).status,
        ).toBe("active");
      });

      it("a Stripe error while expiring never blocks the new checkout and releases nothing", async () => {
        const store = await setupStore();
        const code = await createDiscount(store.business.id, {
          usageLimit: 5,
        });
        const a = await startCheckout(store, { discountCodeId: code.id });
        register(a.sessionId, a.metadata);
        stripeMocks.sessionsExpire.mockRejectedValueOnce(
          new Error("connection reset"),
        );

        const b = await startCheckout(store, {
          discountCodeId: code.id,
          pendingSession: a.cookie,
        });
        expect(b.res.status).toBe(200);
        expect((await reservationFor(a.sessionId)).status).toBe("active");
        expect(await usageOf(code.id)).toBe(2);
        expect(await reservedQty(store)).toBe(2);
      });

      it("a Stripe error on the lookup never blocks the new checkout", async () => {
        const store = await setupStore();
        const a = await startCheckout(store);
        register(a.sessionId, a.metadata);
        stripeMocks.sessionsRetrieve.mockRejectedValueOnce(
          new Error("Stripe is down"),
        );
        const b = await startCheckout(store, { pendingSession: a.cookie });
        expect(b.res.status).toBe(200);
        expect(stripeMocks.sessionsRetrieve).toHaveBeenCalledTimes(1);
        expect(stripeMocks.sessionsExpire).not.toHaveBeenCalled();
        expect((await reservationFor(a.sessionId)).status).toBe("active");
      });

      it("sets a signed cookie bound to the session and the business", async () => {
        const store = await setupStore();
        const a = await startCheckout(store);
        expect(a.res.status).toBe(200);
        expect(a.cookie).toBe(
          signPendingSessionCookie(a.sessionId, store.business.id),
        );
        expect(a.cookie).not.toBe(a.sessionId);
      });

      it("a forged (unsigned) or tampered cookie naming another shopper's open session never touches it", async () => {
        const store = await setupStore();
        const code = await createDiscount(store.business.id, {
          usageLimit: 1,
        });
        // The victim's open checkout holds the last use and a unit.
        const victim = await startCheckout(store, { discountCodeId: code.id });
        expect(victim.res.status).toBe(200);
        register(victim.sessionId, victim.metadata);

        const sig = victim.cookie.slice(victim.cookie.lastIndexOf(".") + 1);
        const tampered = `${victim.sessionId}.${sig.startsWith("A") ? "B" : "A"}${sig.slice(1)}`;
        for (const pendingSession of [
          victim.sessionId, // the id from the victim's Stripe URL, unsigned
          tampered,
          signPendingSessionCookie(victim.sessionId, store.business.id, {
            secret: "x",
          }),
        ]) {
          const attacker = await startCheckout(store, {
            discountCodeId: code.id,
            email: "attacker@evil.test",
            pendingSession,
          });
          expect(attacker.res.status).toBe(400);
          expect(attacker.body.error).toBe(DISCOUNT_ERROR);

          // Apply agrees: the victim's hold still counts.
          await expect(
            createTestCaller({
              headers: { cookie: `pending_session=${pendingSession}` },
            }).discount.validate({ code: code.code, cartTotal: 2000 }),
          ).rejects.toMatchObject({
            code: "BAD_REQUEST",
            message: DISCOUNT_ERROR,
          });
        }
        expect(stripeMocks.sessionsRetrieve).not.toHaveBeenCalled();
        expect(stripeMocks.sessionsUpdate).not.toHaveBeenCalled();
        expect(stripeMocks.sessionsExpire).not.toHaveBeenCalled();
        expect(stripeSessions.get(victim.sessionId)!.status).toBe("open");
        expect(
          stripeSessions.get(victim.sessionId)!.metadata.supersededAt,
        ).toBeUndefined();
        expect((await reservationFor(victim.sessionId)).status).toBe("active");
        expect(await usageOf(code.id)).toBe(1);
        expect(await reservedQty(store)).toBe(1);
      });

      it("DB-first: no active hold for the cookie session → no Stripe call (create-session or Apply)", async () => {
        const store = await setupStore();
        const code = await createDiscount(store.business.id, {
          usageLimit: 5,
        });
        // A's hold was already released (its expired webhook ran).
        const a = await startCheckout(store, { discountCodeId: code.id });
        register(a.sessionId, a.metadata, "expired");
        await post(expiredEventFor(store, a.sessionId));
        expect((await reservationFor(a.sessionId)).status).toBe("released");

        const applied = await createTestCaller({
          headers: { cookie: `pending_session=${a.cookie}` },
        }).discount.validate({ code: code.code, cartTotal: 2000 });
        expect(applied.valid).toBe(true);
        const b = await startCheckout(store, {
          discountCodeId: code.id,
          pendingSession: a.cookie,
        });
        expect(b.res.status).toBe(200);
        expect(stripeMocks.sessionsRetrieve).not.toHaveBeenCalled();
        expect(stripeMocks.sessionsExpire).not.toHaveBeenCalled();
      });

      it("a cart with no reservation (untracked stock, no code) is not superseded — its session is left to lapse as before", async () => {
        const store = await setupStore();
        await db.product.update({
          where: { id: store.product.id },
          data: { trackInventory: false },
        });
        const a = await startCheckout(store);
        expect(a.res.status).toBe(200);
        expect(await db.inventoryReservation.count()).toBe(0);
        register(a.sessionId, a.metadata);

        const b = await startCheckout(store, { pendingSession: a.cookie });
        expect(b.res.status).toBe(200);
        expect(stripeMocks.sessionsRetrieve).not.toHaveBeenCalled();
        expect(stripeMocks.sessionsUpdate).not.toHaveBeenCalled();
        expect(stripeMocks.sessionsExpire).not.toHaveBeenCalled();
        expect(stripeSessions.get(a.sessionId)!.status).toBe("open");
      });

      it("attach failed (reservation without stripeSessionId): neither create-session nor Apply supersedes it", async () => {
        const store = await setupStore();
        const code = await createDiscount(store.business.id, {
          usageLimit: 1,
        });
        const a = await startCheckout(store, { discountCodeId: code.id });
        register(a.sessionId, a.metadata);
        await db.inventoryReservation.update({
          where: { id: a.metadata.reservationId },
          data: { stripeSessionId: null },
        });

        await expect(
          createTestCaller({
            headers: { cookie: `pending_session=${a.cookie}` },
          }).discount.validate({ code: code.code, cartTotal: 2000 }),
        ).rejects.toMatchObject({
          code: "BAD_REQUEST",
          message: DISCOUNT_ERROR,
        });
        const b = await startCheckout(store, {
          discountCodeId: code.id,
          pendingSession: a.cookie,
        });
        expect(b.res.status).toBe(400);
        expect(b.body.error).toBe(DISCOUNT_ERROR);
        expect(stripeMocks.sessionsRetrieve).not.toHaveBeenCalled();
        expect(stripeMocks.sessionsExpire).not.toHaveBeenCalled();
        expect(stripeSessions.get(a.sessionId)!.status).toBe("open");
        expect(
          (
            await db.inventoryReservation.findUniqueOrThrow({
              where: { id: a.metadata.reservationId },
            })
          ).status,
        ).toBe("active");
      });

      describe("ordering: requests rejected on their own merits never supersede", () => {
        async function openCheckout() {
          const store = await setupStore();
          const code = await createDiscount(store.business.id, {
            usageLimit: 1,
          });
          const a = await startCheckout(store, { discountCodeId: code.id });
          expect(a.res.status).toBe(200);
          register(a.sessionId, a.metadata);
          return { store, code, a };
        }

        async function expectUntouched(
          store: Store,
          codeId: string,
          sessionId: string,
        ) {
          expect(stripeMocks.sessionsRetrieve).not.toHaveBeenCalled();
          expect(stripeMocks.sessionsUpdate).not.toHaveBeenCalled();
          expect(stripeMocks.sessionsExpire).not.toHaveBeenCalled();
          expect(stripeSessions.get(sessionId)!.status).toBe("open");
          expect((await reservationFor(sessionId)).status).toBe("active");
          expect(await usageOf(codeId)).toBe(1);
          expect(await reservedQty(store)).toBe(1);
        }

        it("unknown product id", async () => {
          const { store, code, a } = await openCheckout();
          const b = await startCheckout(store, {
            discountCodeId: code.id,
            pendingSession: a.cookie,
            productId: "prod_does_not_exist",
          });
          expect(b.res.status).toBe(400);
          expect(b.body.error).toBe(OUT_OF_STOCK_ERROR);
          await expectUntouched(store, code.id, a.sessionId);
        });

        it("unknown discount code", async () => {
          const { store, code, a } = await openCheckout();
          const b = await startCheckout(store, {
            discountCodeId: "code_does_not_exist",
            pendingSession: a.cookie,
          });
          expect(b.res.status).toBe(400);
          expect(b.body.error).toBe("Invalid or expired discount code");
          await expectUntouched(store, code.id, a.sessionId);
        });

        it("expired discount code", async () => {
          const { store, code, a } = await openCheckout();
          const expired = await createDiscount(store.business.id);
          await db.discountCode.update({
            where: { id: expired.id },
            data: { expiresAt: new Date("2020-01-01T00:00:00Z") },
          });
          const b = await startCheckout(store, {
            discountCodeId: expired.id,
            pendingSession: a.cookie,
          });
          expect(b.res.status).toBe(400);
          expect(b.body.error).toBe("This discount code has expired");
          await expectUntouched(store, code.id, a.sessionId);
        });

        it("minimum purchase not met", async () => {
          const { store, code, a } = await openCheckout();
          const big = await createDiscount(store.business.id, {
            minPurchase: 100_000,
          });
          const b = await startCheckout(store, {
            discountCodeId: big.id,
            pendingSession: a.cookie,
          });
          expect(b.res.status).toBe(400);
          expect(b.body.error).toMatch(/^Minimum purchase/);
          await expectUntouched(store, code.id, a.sessionId);
        });

        it("a valid request supersedes (control)", async () => {
          const { store, code, a } = await openCheckout();
          const b = await startCheckout(store, {
            discountCodeId: code.id,
            pendingSession: a.cookie,
          });
          expect(b.res.status).toBe(200);
          expect(stripeSessions.get(a.sessionId)!.status).toBe("expired");
          expect((await reservationFor(a.sessionId)).status).toBe("released");
        });

        it("the last unit held by the shopper's own checkout: superseded, then the stock check sees it free", async () => {
          const store = await setupStore();
          await db.product.update({
            where: { id: store.product.id },
            data: { inventoryQty: 1 },
          });
          const a = await startCheckout(store);
          expect(a.res.status).toBe(200);
          register(a.sessionId, a.metadata);

          // Without the cookie, the shopper's own hold makes it sold out.
          const blocked = await startCheckout(store);
          expect(blocked.res.status).toBe(400);
          expect(blocked.body.error).toBe(OUT_OF_STOCK_ERROR);

          const b = await startCheckout(store, { pendingSession: a.cookie });
          expect(b.res.status).toBe(200);
          expect((await reservationFor(a.sessionId)).status).toBe("released");
          // (The rejected attempt left its queued Stripe mock unused, so B got
          // that id — read it from the response.)
          expect(
            (await reservationFor(b.body.sessionId as string)).status,
          ).toBe("active");
          expect(await reservedQty(store)).toBe(1);
        });
      });
    });

    describe("storefront Apply (discount.validate) agrees with create-session", () => {
      function applyCaller(pendingSession?: string) {
        return createTestCaller({
          headers: pendingSession
            ? { cookie: `pending_session=${pendingSession}` }
            : {},
        });
      }

      it("after Back, the shopper's own held single-use code applies; another shopper is still rejected", async () => {
        const store = await setupStore();
        const code = await createDiscount(store.business.id, {
          usageLimit: 1,
        });
        const a = await startCheckout(store, { discountCodeId: code.id });
        register(a.sessionId, a.metadata);

        const mine = await applyCaller(a.cookie).discount.validate({
          code: code.code,
          cartTotal: 2000,
        });
        expect(mine.valid).toBe(true);
        expect(mine.discount.id).toBe(code.id);
        // Apply never mutates anything.
        expect(stripeMocks.sessionsExpire).not.toHaveBeenCalled();
        expect((await reservationFor(a.sessionId)).status).toBe("active");

        await expect(
          applyCaller().discount.validate({ code: code.code, cartTotal: 2000 }),
        ).rejects.toMatchObject({
          code: "BAD_REQUEST",
          message: DISCOUNT_ERROR,
        });

        // ...and create-session then agrees with the shopper's Apply.
        const b = await startCheckout(store, {
          discountCodeId: code.id,
          pendingSession: a.cookie,
        });
        expect(b.res.status).toBe(200);
      });

      it("a completed (bank-pending) cookie session's hold still counts", async () => {
        const store = await setupStore();
        const code = await createDiscount(store.business.id, {
          usageLimit: 1,
        });
        const a = await startCheckout(store, { discountCodeId: code.id });
        register(a.sessionId, a.metadata, "complete");

        await expect(
          applyCaller(a.cookie).discount.validate({
            code: code.code,
            cartTotal: 2000,
          }),
        ).rejects.toMatchObject({
          code: "BAD_REQUEST",
          message: DISCOUNT_ERROR,
        });
      });

      it("the lookup times out (StripeConnectionError): the hold still counts", async () => {
        const store = await setupStore();
        const code = await createDiscount(store.business.id, {
          usageLimit: 1,
        });
        const a = await startCheckout(store, { discountCodeId: code.id });
        register(a.sessionId, a.metadata);
        stripeMocks.sessionsRetrieve.mockRejectedValueOnce(
          stripeConnectionError(),
        );

        await expect(
          applyCaller(a.cookie).discount.validate({
            code: code.code,
            cartTotal: 2000,
          }),
        ).rejects.toMatchObject({
          code: "BAD_REQUEST",
          message: DISCOUNT_ERROR,
        });
        expect(stripeMocks.sessionsRetrieve).toHaveBeenCalledWith(
          a.sessionId,
          HOLD_REQUEST_OPTS,
        );
        expect((await reservationFor(a.sessionId)).status).toBe("active");
      });

      it("the lookup cut off by the budget: the hold counts and nothing is captured (breadcrumb only)", async () => {
        const store = await setupStore();
        const code = await createDiscount(store.business.id, {
          usageLimit: 1,
        });
        const a = await startCheckout(store, { discountCodeId: code.id });
        register(a.sessionId, a.metadata);
        stripeMocks.sessionsRetrieve.mockReset();
        stripeMocks.sessionsRetrieve.mockRejectedValue(
          new DeadlineExceededError("cut off at the deadline"),
        );

        // Through Apply, the hold still counts.
        await expect(
          applyCaller(a.cookie).discount.validate({
            code: code.code,
            cartTotal: 2000,
          }),
        ).rejects.toMatchObject({
          code: "BAD_REQUEST",
          message: DISCOUNT_ERROR,
        });
        // And directly, with a budget that is already spent (no Stripe call).
        let t = 0;
        const spent = createDeadline(LOOKUP_BUDGET_MS, () => t);
        t = LOOKUP_BUDGET_MS;
        expect(
          await findSupersedableHold(db, {
            headers: new Headers({ cookie: `pending_session=${a.cookie}` }),
            businessId: store.business.id,
            discountCodeId: code.id,
            deadline: spent,
          }),
        ).toBeNull();

        expect(sentryMocks.captureException).not.toHaveBeenCalled();
        expect(sentryMocks.addBreadcrumb).toHaveBeenCalledWith(
          expect.objectContaining({
            category: "checkout",
            level: "info",
            message: expect.stringContaining(
              "find-supersedable-hold",
            ) as string,
          }),
        );
      });

      it("a genuine lookup StripeConnectionError is still captured, with a stable fingerprint", async () => {
        const store = await setupStore();
        const code = await createDiscount(store.business.id, {
          usageLimit: 1,
        });
        const a = await startCheckout(store, { discountCodeId: code.id });
        register(a.sessionId, a.metadata);
        stripeMocks.sessionsRetrieve.mockRejectedValueOnce(
          stripeConnectionError(),
        );

        await expect(
          applyCaller(a.cookie).discount.validate({
            code: code.code,
            cartTotal: 2000,
          }),
        ).rejects.toMatchObject({ code: "BAD_REQUEST" });
        expect(holdCaptures()).toHaveLength(1);
        expect(holdCaptures()[0]![1]).toMatchObject({
          fingerprint: [
            "supersede",
            "find-supersedable-hold",
            "StripeConnectionError",
          ],
          tags: { route: "discount.validate" },
        });
      });

      it("the lookup runs within LOOKUP_BUDGET_MS: its retrieve gets what is left, and is skipped once the budget is spent (the hold counts)", async () => {
        expect(LOOKUP_BUDGET_MS).toBeLessThanOrEqual(
          STRIPE_HOLD_REQUEST_TIMEOUT_MS,
        );
        const store = await setupStore();
        const code = await createDiscount(store.business.id, {
          usageLimit: 1,
        });
        const a = await startCheckout(store, { discountCodeId: code.id });
        register(a.sessionId, a.metadata);
        const headers = new Headers({
          cookie: `pending_session=${a.cookie}`,
        });
        let t = 0;
        const clock = () => t;
        const lookup = (deadline: ReturnType<typeof createDeadline>) =>
          findSupersedableHold(db, {
            headers,
            businessId: store.business.id,
            discountCodeId: code.id,
            deadline,
          });

        // A slow start left 1.2s of the budget: the retrieve gets 1.2s.
        const slow = createDeadline(LOOKUP_BUDGET_MS, clock);
        t = LOOKUP_BUDGET_MS - 1200;
        expect(await lookup(slow)).toBe(a.metadata.reservationId);
        expect(stripeMocks.sessionsRetrieve).toHaveBeenLastCalledWith(
          a.sessionId,
          { stripeAccount: ACCOUNT_ID, timeout: 1200, maxNetworkRetries: 1 },
        );

        // Budget spent: no Stripe call, and in doubt the hold counts.
        const spent = createDeadline(LOOKUP_BUDGET_MS, clock);
        t += LOOKUP_BUDGET_MS - MIN_CALL_BUDGET_MS + 1;
        expect(await lookup(spent)).toBeNull();
        expect(stripeMocks.sessionsRetrieve).toHaveBeenCalledTimes(1);

        // Without a test deadline (the real Apply path), the retrieve gets
        // a bounded timeout and one retry.
        expect(
          (
            await applyCaller(a.cookie).discount.validate({
              code: code.code,
              cartTotal: 2000,
            })
          ).valid,
        ).toBe(true);
        expect(stripeMocks.sessionsRetrieve).toHaveBeenCalledTimes(2);
        expect(stripeMocks.sessionsRetrieve).toHaveBeenLastCalledWith(
          a.sessionId,
          HOLD_REQUEST_OPTS,
        );
      });

      it("per-customer: excludes only the cookie session's hold, not the shopper's other open checkouts", async () => {
        const store = await setupStore();
        const code = await createDiscount(store.business.id, {
          perCustomerLimit: 1,
        });
        const a = await startCheckout(store, { discountCodeId: code.id });
        register(a.sessionId, a.metadata);

        const ok = await applyCaller(a.cookie).discount.validate({
          code: code.code,
          cartTotal: 2000,
          email: "JANE@shopper.test",
        });
        expect(ok.valid).toBe(true);

        // Without the cookie the shopper's own open checkout counts.
        await expect(
          applyCaller().discount.validate({
            code: code.code,
            cartTotal: 2000,
            email: "jane@shopper.test",
          }),
        ).rejects.toMatchObject({
          code: "BAD_REQUEST",
          message: "You've already used this code the maximum number of times",
        });

        // Another open checkout of Jane's (another device) holding the code.
        await db.inventoryReservation.create({
          data: {
            businessId: store.business.id,
            stripeSessionId: "cs_test_jane_phone",
            status: "active",
            expiresAt: new Date(Date.now() + 30 * 60 * 1000),
            items: [
              {
                discountCodeId: code.id,
                customerEmail: "jane@shopper.test",
                qty: 1,
              },
            ],
          },
        });
        await db.discountCode.update({
          where: { id: code.id },
          data: { usageCount: { increment: 1 } },
        });
        await expect(
          applyCaller(a.cookie).discount.validate({
            code: code.code,
            cartTotal: 2000,
            email: "jane@shopper.test",
          }),
        ).rejects.toMatchObject({
          code: "BAD_REQUEST",
          message: "You've already used this code the maximum number of times",
        });

        // A different shopper is unaffected by Jane's holds.
        const other = await applyCaller(a.cookie).discount.validate({
          code: code.code,
          cartTotal: 2000,
          email: "other@shopper.test",
        });
        expect(other.valid).toBe(true);
      });
    });
  });
});
