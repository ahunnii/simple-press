import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  signPendingSessionCookie,
  SUBSCRIPTION_PENDING_COOKIE,
} from "~/lib/checkout/pending-session-cookie";
import { findOwnedSubscription } from "~/lib/subscriptions/success-owner";

import { db, resetDb } from "../helpers/db";
import { createBusiness } from "../helpers/factories";

/**
 * `/subscribe/success`'s ownership check. The page shows the subscriber's
 * product, cadence and shipping address, so only the browser that started the
 * checkout may see them: a SIGNED `pending_subscription_session` cookie always
 * works; a legacy bare cookie only for a recent, unmarked session (rollout
 * fallback, mirroring `/api/stripe/session`); everything else gets null, which
 * the page renders as the generic "Thanks!" card.
 */

const ACCOUNT_ID = "acct_test_subsuccess";
const SESSION_ID = "cs_test_sub_owner_1";

const stripeMocks = vi.hoisted(() => ({ sessionsRetrieve: vi.fn() }));
const sentryMocks = vi.hoisted(() => ({ captureException: vi.fn() }));
vi.mock("@sentry/nextjs", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  captureException: (...args: unknown[]): unknown =>
    sentryMocks.captureException(...args),
}));

vi.mock("~/lib/stripe/client", () => ({
  stripeClient: {
    checkout: {
      sessions: {
        retrieve: (...args: unknown[]): unknown =>
          stripeMocks.sessionsRetrieve(...args),
      },
    },
  },
}));

async function setup(opts: { createdAt?: Date } = {}) {
  const created = await createBusiness();
  const business = await db.business.update({
    where: { id: created.id },
    data: { stripeAccountId: ACCOUNT_ID },
  });
  const subscription = await db.subscription.create({
    data: {
      businessId: business.id,
      customerEmail: "shopper@test.dev",
      productName: "Ultra Soft 12-pack",
      quantity: 1,
      intervalKey: "month:1",
      interval: "month",
      intervalCount: 1,
      listPriceCents: 1099,
      unitAmountCents: 989,
      stripeCheckoutSessionId: SESSION_ID,
      ...(opts.createdAt ? { createdAt: opts.createdAt } : {}),
    },
  });
  return { business, subscription };
}

function signed(sessionId: string, businessId: string) {
  return signPendingSessionCookie(sessionId, businessId, {
    kind: SUBSCRIPTION_PENDING_COOKIE,
  });
}

function find(businessId: string, cookie?: string, sessionId = SESSION_ID) {
  return findOwnedSubscription({
    headers: new Headers(cookie ? { cookie } : {}),
    businessId,
    sessionId,
  });
}

describe("findOwnedSubscription (/subscribe/success)", () => {
  beforeEach(async () => {
    await resetDb();
    stripeMocks.sessionsRetrieve.mockReset();
    sentryMocks.captureException.mockReset();
  });

  it("signed cookie for this session + store → the subscription, no Stripe call", async () => {
    const { business, subscription } = await setup({
      // Age doesn't matter on the signed path.
      createdAt: new Date(Date.now() - 24 * 3600 * 1000),
    });
    const found = await find(
      business.id,
      `pending_subscription_session=${signed(SESSION_ID, business.id)}`,
    );
    expect(found?.id).toBe(subscription.id);
    expect(stripeMocks.sessionsRetrieve).not.toHaveBeenCalled();
  });

  it("no cookie / no session_id → null", async () => {
    const { business } = await setup();
    expect(await find(business.id)).toBeNull();
    expect(
      await findOwnedSubscription({
        headers: new Headers({
          cookie: `pending_subscription_session=${signed(SESSION_ID, business.id)}`,
        }),
        businessId: business.id,
        sessionId: undefined,
      }),
    ).toBeNull();
  });

  it("forged, other-store, other-session or one-time-cookie signatures → null", async () => {
    const { business } = await setup();
    const sig = signed(SESSION_ID, business.id);
    const mac = sig.slice(sig.lastIndexOf(".") + 1);
    const forged = `${SESSION_ID}.${mac.startsWith("A") ? "B" : "A"}${mac.slice(1)}`;
    for (const cookie of [
      `pending_subscription_session=${forged}`,
      `pending_subscription_session=${signed(SESSION_ID, "biz_other")}`,
      `pending_subscription_session=${signed("cs_test_other", business.id)}`,
      `pending_subscription_session=${signPendingSessionCookie(SESSION_ID, business.id, { secret: "attacker-secret", kind: SUBSCRIPTION_PENDING_COOKIE })}`,
      // The one-time checkout's cookie can't stand in for this one, under
      // either name.
      `pending_subscription_session=${signPendingSessionCookie(SESSION_ID, business.id)}`,
      `pending_session=${signPendingSessionCookie(SESSION_ID, business.id)}`,
      `pending_session=${sig}`,
    ]) {
      expect(await find(business.id, cookie)).toBeNull();
    }
    expect(stripeMocks.sessionsRetrieve).not.toHaveBeenCalled();
  });

  it("a valid signed cookie for a session in ANOTHER store → null", async () => {
    await setup();
    const other = await createBusiness();
    expect(
      await find(
        other.id,
        `pending_subscription_session=${signed(SESSION_ID, other.id)}`,
      ),
    ).toBeNull();
    // Refused on the cookie/row alone: the other store has no such row.
    expect(stripeMocks.sessionsRetrieve).not.toHaveBeenCalled();
  });

  describe("legacy bare cookie (rollout fallback)", () => {
    it("accepted for a recent session without the signed-cookie marker", async () => {
      const { business, subscription } = await setup();
      stripeMocks.sessionsRetrieve.mockResolvedValue({
        id: SESSION_ID,
        created: Math.floor(Date.now() / 1000),
        metadata: { businessId: business.id, kind: "subscription" },
      });
      const found = await find(
        business.id,
        `pending_subscription_session=${SESSION_ID}`,
      );
      expect(found?.id).toBe(subscription.id);
      // Fail fast: this runs inside the page render.
      expect(stripeMocks.sessionsRetrieve).toHaveBeenCalledWith(
        SESSION_ID,
        {},
        { stripeAccount: ACCOUNT_ID, timeout: 5000, maxNetworkRetries: 0 },
      );
    });

    it("asks Stripe at most once per session, however often the page is replayed", async () => {
      const { business } = await setup();
      stripeMocks.sessionsRetrieve.mockResolvedValue({
        id: SESSION_ID,
        created: Math.floor(Date.now() / 1000),
        metadata: { kind: "subscription", pendingCookie: "signed-v1" },
      });
      const cookie = `pending_subscription_session=${SESSION_ID}`;
      // Concurrent and sequential replays share one lookup.
      const results = await Promise.all([
        find(business.id, cookie),
        find(business.id, cookie),
        find(business.id, cookie),
      ]);
      expect(results).toEqual([null, null, null]);
      expect(await find(business.id, cookie)).toBeNull();
      expect(stripeMocks.sessionsRetrieve).toHaveBeenCalledTimes(1);
    });

    it("rejected for a session created with a signed cookie (marker)", async () => {
      const { business } = await setup();
      stripeMocks.sessionsRetrieve.mockResolvedValue({
        id: SESSION_ID,
        created: Math.floor(Date.now() / 1000),
        metadata: { kind: "subscription", pendingCookie: "signed-v1" },
      });
      expect(
        await find(business.id, `pending_subscription_session=${SESSION_ID}`),
      ).toBeNull();
    });

    it("rejected once the session is older than the cookie could be — without calling Stripe", async () => {
      const { business } = await setup({
        // 3600s max age + 15 min slack, plus a minute.
        createdAt: new Date(Date.now() - (3600 + 15 * 60 + 60) * 1000),
      });
      expect(
        await find(business.id, `pending_subscription_session=${SESSION_ID}`),
      ).toBeNull();
      expect(stripeMocks.sessionsRetrieve).not.toHaveBeenCalled();
    });

    it("rejected, without a Sentry report, when Stripe says no such session", async () => {
      const { business } = await setup();
      stripeMocks.sessionsRetrieve.mockRejectedValue(
        Object.assign(new Error("No such checkout.session"), {
          type: "StripeInvalidRequestError",
        }),
      );
      expect(
        await find(business.id, `pending_subscription_session=${SESSION_ID}`),
      ).toBeNull();
      expect(sentryMocks.captureException).not.toHaveBeenCalled();
    });

    it("rejected and reported when Stripe fails; the failure is not cached", async () => {
      const { business, subscription } = await setup();
      const outage = Object.assign(new Error("connection reset"), {
        type: "StripeConnectionError",
      });
      stripeMocks.sessionsRetrieve.mockRejectedValueOnce(outage);
      const cookie = `pending_subscription_session=${SESSION_ID}`;

      expect(await find(business.id, cookie)).toBeNull();
      expect(sentryMocks.captureException).toHaveBeenCalledWith(
        outage,
        expect.objectContaining({
          tags: expect.objectContaining({ businessId: business.id }) as unknown,
        }),
      );

      // The next visit retries rather than reusing the failure.
      stripeMocks.sessionsRetrieve.mockResolvedValueOnce({
        id: SESSION_ID,
        created: Math.floor(Date.now() / 1000),
        metadata: { kind: "subscription" },
      });
      expect((await find(business.id, cookie))?.id).toBe(subscription.id);
      expect(stripeMocks.sessionsRetrieve).toHaveBeenCalledTimes(2);
    });

    it("a bare cookie naming a DIFFERENT session → null", async () => {
      const { business } = await setup();
      expect(
        await find(business.id, "pending_subscription_session=cs_test_other"),
      ).toBeNull();
      expect(stripeMocks.sessionsRetrieve).not.toHaveBeenCalled();
    });
  });
});
