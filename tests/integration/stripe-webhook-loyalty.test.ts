import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as EmailTemplates from "~/lib/email/templates";

import { db, resetDb } from "../helpers/db";
import {
  createBusiness,
  createLoyaltyProgram,
  createProduct,
} from "../helpers/factories";
import {
  makeCheckoutCompletedEvent,
  makeCheckoutSession,
  postWebhookEvent,
} from "../helpers/stripe-webhook";

/**
 * The loyalty earn seam inside the one-time (`mode: "payment"`) Stripe webhook
 * path — `awardPointsForPaidOrder` between the customer-metrics block and the
 * discount-increment block.
 *
 * Sibling of `stripe-webhook-one-time.test.ts`, which pins the rest of that
 * path and must keep passing unchanged: the contract here is that the loyalty
 * hook is purely additive. With the `loyalty` flag off (the registry default)
 * not a single row is written and the confirmation email is byte-identical to
 * what it was before the feature existed.
 *
 * Mocks mirror the sibling file — Stripe (signature + session re-read) and the
 * `sendEmail` chokepoint — plus a pass-through spy on `sendOrderConfirmation`
 * so the `loyalty` argument can be asserted directly rather than inferred from
 * rendered HTML. Sentry is left real: with no client initialized every capture
 * is a no-op, which is also what proves the hook didn't throw.
 */

const stripeMocks = vi.hoisted(() => ({
  constructEvent: vi.fn(),
  sessionsRetrieve: vi.fn(),
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

// Pass-through spy: the real helper still runs (so the email is still built and
// still reaches the mocked `sendEmail`), we just get to look at its arguments.
const templateMocks = vi.hoisted(() => ({ sendOrderConfirmation: vi.fn() }));
vi.mock("~/lib/email/templates", async (importOriginal) => {
  const actual = await importOriginal<typeof EmailTemplates>();
  return {
    ...actual,
    sendOrderConfirmation: (
      params: Parameters<typeof actual.sendOrderConfirmation>[0],
    ) => {
      templateMocks.sendOrderConfirmation(params);
      return actual.sendOrderConfirmation(params);
    },
  };
});

const ACCOUNT_ID = "acct_test_loyalty";

/** The `loyalty` argument the confirmation email was built with, if any. */
function confirmationLoyaltyArg(call = 0) {
  const params = templateMocks.sendOrderConfirmation.mock.calls[call]?.[0] as
    | { loyalty?: { earned: number; balance: number } }
    | undefined;
  return params?.loyalty;
}

async function setupStore(opts: { loyaltyEnabled: boolean }) {
  const created = await createBusiness({
    subdomain: `loyalty-biz-${opts.loyaltyEnabled ? "on" : "off"}`,
    featureFlags: { loyalty: opts.loyaltyEnabled },
  });
  const business = await db.business.update({
    where: { id: created.id },
    data: { stripeAccountId: ACCOUNT_ID },
  });

  // Program row exists in BOTH cases, so the flag is provably the only thing
  // standing between a paid order and a ledger row.
  const program = await createLoyaltyProgram(business.id, {
    earnOnOrders: true,
    pointsPerDollar: 1,
    firstOrderEnabled: true,
    firstOrderBonus: 50,
  });

  const product = await createProduct(business.id, {
    name: "Cotton Tee",
    price: 1500,
    inventoryQty: 50,
  });

  return { business, program, product };
}

type Store = Awaited<ReturnType<typeof setupStore>>;

/**
 * subtotal 5500 − discount 250 = 5250 eligible cents → at 1 pt/$ that is
 * `floor(5250 * 1 / 100)` = 52 points, plus the 50-point first-order bonus.
 */
const EXPECTED_EARN = 52;
const FIRST_ORDER_BONUS = 50;

function buildPaidSession(store: Store, sessionId: string) {
  return makeCheckoutSession({
    id: sessionId,
    mode: "payment",
    metadata: { businessId: store.business.id, deliveryMethod: "ship" },
    customerName: "Jane Doe",
    customerEmail: "jane@shopper.test",
    paymentIntentId: `pi_${sessionId}`,
    amountSubtotal: 5500,
    amountTax: 330,
    amountShipping: 500,
    amountDiscount: 250,
    lineItems: [
      {
        description: "Cotton Tee",
        quantity: 2,
        unitAmount: 1500,
        amountTotal: 3000,
        productId: store.product.id,
      },
      {
        description: "Cotton Tee",
        quantity: 1,
        unitAmount: 2500,
        amountTotal: 2500,
        productId: store.product.id,
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

/** Posts a complete paid checkout for `sessionId` and returns the response. */
async function postPaidCheckout(store: Store, sessionId: string) {
  const { session, fullSession } = buildPaidSession(store, sessionId);
  const event = makeCheckoutCompletedEvent(session, ACCOUNT_ID);
  stripeMocks.constructEvent.mockReturnValue(event);
  stripeMocks.sessionsRetrieve.mockResolvedValue(fullSession);
  const res = await postWebhookEvent(event);
  return { res, event };
}

function ledgerFor(businessId: string) {
  return db.loyaltyLedger.findMany({
    where: { businessId },
    orderBy: { createdAt: "asc" },
  });
}

describe("stripe webhook — loyalty earn on the one-time payment path", () => {
  beforeEach(async () => {
    await resetDb();
    stripeMocks.constructEvent.mockReset();
    stripeMocks.sessionsRetrieve.mockReset();
    emailMocks.sendEmail.mockReset();
    emailMocks.sendEmail.mockResolvedValue({ success: true, id: "test" });
    templateMocks.sendOrderConfirmation.mockClear();
  });

  it("awards order_earn + first_order_bonus and reflects them on the customer balance", async () => {
    const store = await setupStore({ loyaltyEnabled: true });

    const { res } = await postPaidCheckout(store, "cs_loyalty_1");
    expect(res.status).toBe(200);

    const order = await db.order.findFirstOrThrow({
      where: { businessId: store.business.id },
    });
    const customer = await db.customer.findFirstOrThrow({
      where: { businessId: store.business.id },
    });
    expect(customer.orderCount).toBe(1);

    const rows = await ledgerFor(store.business.id);
    expect(rows.map((r) => r.type).sort()).toEqual([
      "first_order_bonus",
      "order_earn",
    ]);

    const earn = rows.find((r) => r.type === "order_earn")!;
    expect(earn.points).toBe(EXPECTED_EARN);
    expect(earn.sourceKey).toBe(`order:${order.id}`);
    expect(earn.orderId).toBe(order.id);
    expect(earn.customerId).toBe(customer.id);
    expect(earn.metadata as Record<string, unknown>).toMatchObject({
      rate: 1,
      eligibleCents: 5250,
    });

    const bonus = rows.find((r) => r.type === "first_order_bonus")!;
    expect(bonus.points).toBe(FIRST_ORDER_BONUS);
    expect(bonus.sourceKey).toBe(`first-order:${customer.id}`);
    expect(bonus.orderId).toBe(order.id);

    // The denormalized balance equals the sum of the ledger.
    expect(customer.loyaltyPoints).toBe(EXPECTED_EARN + FIRST_ORDER_BONUS);
    expect(rows.reduce((sum, r) => sum + r.points, 0)).toBe(
      customer.loyaltyPoints,
    );

    // The confirmation email carries the combined figure and the new balance.
    expect(templateMocks.sendOrderConfirmation).toHaveBeenCalledTimes(1);
    expect(confirmationLoyaltyArg()).toEqual({
      earned: EXPECTED_EARN + FIRST_ORDER_BONUS,
      balance: EXPECTED_EARN + FIRST_ORDER_BONUS,
    });
  });

  it("is idempotent on a replayed event — still exactly two ledger rows", async () => {
    const store = await setupStore({ loyaltyEnabled: true });

    const { event } = await postPaidCheckout(store, "cs_loyalty_replay");
    const replay = await postWebhookEvent(event);
    expect(replay.status).toBe(200);

    // The webhook's own `stripeSessionId` guard short-circuits first, and the
    // ledger's `@@unique([businessId, sourceKey])` would catch it regardless.
    expect(
      await db.order.count({ where: { businessId: store.business.id } }),
    ).toBe(1);
    const rows = await ledgerFor(store.business.id);
    expect(rows).toHaveLength(2);

    const customer = await db.customer.findFirstOrThrow({
      where: { businessId: store.business.id },
    });
    expect(customer.loyaltyPoints).toBe(EXPECTED_EARN + FIRST_ORDER_BONUS);
  });

  it("earns again on a second order but never a second first-order bonus", async () => {
    const store = await setupStore({ loyaltyEnabled: true });

    await postPaidCheckout(store, "cs_loyalty_first");
    await postPaidCheckout(store, "cs_loyalty_second");

    expect(
      await db.order.count({ where: { businessId: store.business.id } }),
    ).toBe(2);

    const rows = await ledgerFor(store.business.id);
    expect(rows.filter((r) => r.type === "order_earn")).toHaveLength(2);
    expect(rows.filter((r) => r.type === "first_order_bonus")).toHaveLength(1);

    // Distinct `order:<id>` keys — the second earn is a genuinely new row.
    const earnKeys = rows
      .filter((r) => r.type === "order_earn")
      .map((r) => r.sourceKey);
    expect(new Set(earnKeys).size).toBe(2);

    const customer = await db.customer.findFirstOrThrow({
      where: { businessId: store.business.id },
    });
    expect(customer.orderCount).toBe(2);
    expect(customer.loyaltyPoints).toBe(EXPECTED_EARN * 2 + FIRST_ORDER_BONUS);

    // Second confirmation email: points earned, running balance includes the
    // bonus from the first order.
    expect(confirmationLoyaltyArg(1)).toEqual({
      earned: EXPECTED_EARN,
      balance: EXPECTED_EARN * 2 + FIRST_ORDER_BONUS,
    });
  });

  it("writes nothing and changes no email when the loyalty flag is off", async () => {
    const store = await setupStore({ loyaltyEnabled: false });

    const { res } = await postPaidCheckout(store, "cs_loyalty_off");
    expect(res.status).toBe(200);

    // The order path is completely unaffected.
    const order = await db.order.findFirstOrThrow({
      where: { businessId: store.business.id },
    });
    expect(order.total).toBe(6080);
    const customer = await db.customer.findFirstOrThrow({
      where: { businessId: store.business.id },
    });
    expect(customer.orderCount).toBe(1);
    expect(customer.totalSpent).toBe(6080);

    expect(await ledgerFor(store.business.id)).toHaveLength(0);
    expect(customer.loyaltyPoints).toBe(0);

    // No `loyalty` key at all — the email renders as it did before the feature.
    expect(templateMocks.sendOrderConfirmation).toHaveBeenCalledTimes(1);
    const params = templateMocks.sendOrderConfirmation.mock.calls[0]?.[0] as
      | Record<string, unknown>
      | undefined;
    expect(params).toBeDefined();
    expect(params).not.toHaveProperty("loyalty");
  });
});
