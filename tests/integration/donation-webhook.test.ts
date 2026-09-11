import type Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { db, resetDb } from "../helpers/db";
import { createBusiness } from "../helpers/factories";
import {
  makeCheckoutCompletedEvent,
  makeCheckoutExpiredEvent,
  makeCheckoutSession,
  postWebhookEvent,
} from "../helpers/stripe-webhook";

/**
 * The donation lane of the Stripe Connect webhook, driven through the REAL
 * route (`src/app/api/webhooks/stripe/route.ts`) rather than by calling
 * `handleDonationCheckoutCompleted` directly.
 *
 * Route-level on purpose, for the same reason
 * `stripe-webhook-subscription-dispatch.test.ts` is: the dispatch guard is a
 * two-line edit to a live payment path, and nothing short of posting a real
 * event through the real route proves it landed ABOVE the one-time lane's
 * `metadata.businessId` read. A donation session is `mode: "payment"` — the
 * same mode a cart checkout uses — so a guard in the wrong place would happily
 * try to build an Order out of it.
 *
 * The security assertions here (missing / mismatched `event.account`) are the
 * whole reason the lane has a tenant check: `metadata.businessId` is
 * attacker-controllable by any connected merchant.
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

const ACCOUNT_ID = "acct_test_donations";
const OTHER_ACCOUNT_ID = "acct_test_someone_else";

type EmailCall = {
  subject?: string;
  to?: string | string[];
  replyTo?: string;
  idempotencyKey?: string;
  tags?: Array<{ name: string; value: string }>;
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

async function setupStore(
  opts: { donationLabel?: string; account?: string } = {},
) {
  const created = await createBusiness({
    subdomain: "donations-biz",
    name: "Bloom Florist",
    featureFlags: { donations: true },
  });
  await db.business.update({
    where: { id: created.id },
    data: {
      stripeAccountId: opts.account ?? ACCOUNT_ID,
      stripeChargesEnabled: true,
      ...(opts.donationLabel ? { donationLabel: opts.donationLabel } : {}),
      // Deliberately opted IN, so "no abandoned-cart email" below is a real
      // assertion about the donation guard, not about the store setting.
      sendAbandonedCheckoutEmails: true,
    },
  });
  return db.business.findUniqueOrThrow({ where: { id: created.id } });
}

type Store = Awaited<ReturnType<typeof setupStore>>;

/**
 * A donation Checkout Session as the route sees it: `mode: "payment"`, no line
 * items on the event copy, and the metadata the pure builder
 * (`buildDonationCheckoutParams`) stamps.
 */
function makeDonationSession(
  store: Store,
  opts: {
    id?: string;
    amountTotal?: number;
    donorName?: string;
    donorMessage?: string;
    businessId?: string;
    customerEmail?: string | null;
    paymentStatus?: "paid" | "unpaid" | "no_payment_required";
    paymentIntentId?: string | null;
  } = {},
): Stripe.Checkout.Session {
  const { session } = makeCheckoutSession({
    id: opts.id ?? "cs_test_donation_1",
    mode: "payment",
    metadata: {
      businessId: opts.businessId ?? store.id,
      kind: "donation",
      ...(opts.donorName ? { donorName: opts.donorName } : {}),
      ...(opts.donorMessage ? { donorMessage: opts.donorMessage } : {}),
    },
    customerEmail: opts.customerEmail ?? "ada@donor.test",
    paymentStatus: opts.paymentStatus ?? "paid",
    ...(opts.paymentIntentId !== undefined
      ? { paymentIntentId: opts.paymentIntentId }
      : { paymentIntentId: "pi_test_donation_1" }),
    amountSubtotal: opts.amountTotal ?? 2500,
    amountTotal: opts.amountTotal ?? 2500,
  });
  return session;
}

async function postDonation(
  session: Stripe.Checkout.Session,
  account: string | null,
): Promise<Response> {
  const event = makeCheckoutCompletedEvent(session, account);
  stripeMocks.constructEvent.mockReturnValue(event);
  return postWebhookEvent(event);
}

describe("stripe webhook route — donation lane", () => {
  beforeEach(async () => {
    await resetDb();
    stripeMocks.constructEvent.mockReset();
    stripeMocks.sessionsRetrieve.mockReset();
    stripeMocks.subscriptionsRetrieve.mockReset();
    stripeMocks.invoicesRetrieve.mockReset();
    emailMocks.sendEmail.mockReset();
    emailMocks.sendEmail.mockResolvedValue({ success: true, id: "test" });
  });

  it("records a paid donation with every field round-tripping (donor fields are encrypted at rest)", async () => {
    const store = await setupStore();

    const res = await postDonation(
      makeDonationSession(store, {
        amountTotal: 5000,
        donorName: "Ada Lovelace",
        donorMessage: "Love the shop — keep going!",
      }),
      ACCOUNT_ID,
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });

    const donations = await db.donation.findMany({
      where: { businessId: store.id },
    });
    expect(donations).toHaveLength(1);
    const donation = donations[0]!;
    expect(donation.stripeSessionId).toBe("cs_test_donation_1");
    expect(donation.stripePaymentIntentId).toBe("pi_test_donation_1");
    expect(donation.amountCents).toBe(5000);
    expect(donation.currency).toBe("usd");
    // Encryption is transparent through the Prisma extension — what went in is
    // what comes back.
    expect(donation.donorName).toBe("Ada Lovelace");
    expect(donation.donorEmail).toBe("ada@donor.test");
    expect(donation.message).toBe("Love the shop — keep going!");
  });

  it("records an anonymous donation with null donor fields, not empty strings", async () => {
    const store = await setupStore();

    await postDonation(
      makeDonationSession(store, { id: "cs_test_anon" }),
      ACCOUNT_ID,
    );

    const donation = await db.donation.findUniqueOrThrow({
      where: { stripeSessionId: "cs_test_anon" },
    });
    expect(donation.donorName).toBeNull();
    expect(donation.message).toBeNull();
    // Stripe still collected an email at Checkout even though the donor gave no
    // name — the two are independent.
    expect(donation.donorEmail).toBe("ada@donor.test");
  });

  it("emails the owner exactly once, tagged `donation`, keyed on the session id", async () => {
    const store = await setupStore({ donationLabel: "tip" });

    await postDonation(
      makeDonationSession(store, {
        id: "cs_test_tip",
        amountTotal: 1000,
        donorName: "Ada",
      }),
      ACCOUNT_ID,
    );

    expect(emailCategories()).toEqual(["donation"]);
    const [call] = emailCalls();
    expect(call?.to).toBe(store.ownerEmail);
    // Label-aware: this store calls them tips, so the subject does too.
    expect(call?.subject).toBe("New tip to Bloom Florist");
    expect(call?.idempotencyKey).toBe("donation-owner-cs_test_tip");
    expect(call?.replyTo).toBe("ada@donor.test");
  });

  it("creates exactly one row when Stripe redelivers the same session", async () => {
    const store = await setupStore();
    const session = makeDonationSession(store, { id: "cs_test_retry" });

    const first = await postDonation(session, ACCOUNT_ID);
    const second = await postDonation(session, ACCOUNT_ID);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(await second.json()).toEqual({ received: true });

    expect(await db.donation.count({ where: { businessId: store.id } })).toBe(
      1,
    );
    // The redelivery must not re-notify either — the row check short-circuits
    // ahead of the send.
    expect(emailMocks.sendEmail).toHaveBeenCalledTimes(1);
  });

  it("writes NOTHING when the event carries no connected account", async () => {
    const store = await setupStore();

    const res = await postDonation(
      makeDonationSession(store, { id: "cs_test_no_account" }),
      null,
    );

    // Still acked: a rejected event must not be retried for days.
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
    expect(await db.donation.count()).toBe(0);
    expect(emailMocks.sendEmail).not.toHaveBeenCalled();
  });

  it("writes NOTHING when metadata.businessId names a store that does not own the account", async () => {
    // The attack: a connected merchant stamps someone else's businessId onto
    // their OWN checkout session, and the event arrives from THEIR account.
    const victim = await setupStore();

    const res = await postDonation(
      makeDonationSession(victim, {
        id: "cs_test_cross_tenant",
        businessId: victim.id,
      }),
      OTHER_ACCOUNT_ID,
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
    expect(await db.donation.count()).toBe(0);
    expect(emailMocks.sendEmail).not.toHaveBeenCalled();
  });

  it("writes NOTHING for an unpaid session", async () => {
    const store = await setupStore();

    const res = await postDonation(
      makeDonationSession(store, {
        id: "cs_test_unpaid",
        paymentStatus: "unpaid",
      }),
      ACCOUNT_ID,
    );

    expect(res.status).toBe(200);
    expect(await db.donation.count()).toBe(0);
    expect(emailMocks.sendEmail).not.toHaveBeenCalled();
  });

  it("never enters the one-time order path — no session retrieve, no Order", async () => {
    const store = await setupStore();

    await postDonation(
      makeDonationSession(store, { id: "cs_test_no_order" }),
      ACCOUNT_ID,
    );

    // The FIRST Stripe call of the one-time path. If this fired, the dispatch
    // guard is missing or sits below the `metadata.businessId` read.
    expect(stripeMocks.sessionsRetrieve).not.toHaveBeenCalled();
    expect(await db.order.count()).toBe(0);
    expect(await db.orderItem.count()).toBe(0);
    expect(await db.customer.count()).toBe(0);
    expect(await db.donation.count()).toBe(1);
  });

  it("never sends the abandoned-checkout email for an expired donation session", async () => {
    const store = await setupStore();
    const session = makeDonationSession(store, { id: "cs_test_donation_gone" });

    const event = makeCheckoutExpiredEvent(session, ACCOUNT_ID);
    stripeMocks.constructEvent.mockReturnValue(event);

    const res = await postWebhookEvent(event);
    expect(res.status).toBe(200);

    expect(emailCategories()).not.toContain("abandoned_checkout");
    expect(emailMocks.sendEmail).not.toHaveBeenCalled();
    expect(await db.donation.count()).toBe(0);
  });

  it("still creates an Order for an ordinary mode:'payment' session (the guard is metadata-scoped)", async () => {
    const store = await setupStore();
    const product = await db.product.create({
      data: {
        businessId: store.id,
        name: "Cotton Tee",
        slug: "cotton-tee",
        price: 1500,
        published: true,
        inventoryQty: 10,
      },
    });

    const { session, fullSession } = makeCheckoutSession({
      id: "cs_test_real_order",
      mode: "payment",
      // No `kind` — an ordinary cart checkout.
      metadata: { businessId: store.id, deliveryMethod: "ship" },
      customerEmail: "jane@shopper.test",
      paymentIntentId: "pi_test_real_order",
      amountSubtotal: 1500,
      amountTotal: 1500,
      lineItems: [
        {
          description: "Cotton Tee",
          quantity: 1,
          unitAmount: 1500,
          amountTotal: 1500,
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
    expect(await db.order.count({ where: { businessId: store.id } })).toBe(1);
    expect(await db.donation.count()).toBe(0);
  });
});
