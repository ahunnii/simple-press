import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  PENDING_COOKIE_MARKER_KEY,
  PENDING_COOKIE_MARKER_VALUE,
  signPendingSessionCookie,
} from "~/lib/checkout/pending-session-cookie";

import { GET } from "./route";

/**
 * `/api/stripe/session` backs every template's order-confirmation page: it
 * proxies a Stripe Checkout Session lookup, gated by the signed
 * `pending_session` cookie create-session sets before redirecting to Stripe
 * (see the route's own comments and pending-session-cookie.ts). This test covers the `delivery_method` field added
 * on top of the existing `customer_email` / `amount_total` / `currency` /
 * `payment_status` passthrough — sourced from
 * `session.metadata?.deliveryMethod`, which `create-session/route.ts` always
 * stamps ("ship" | "pickup").
 */

const stripeMocks = vi.hoisted(() => ({ retrieve: vi.fn() }));
vi.mock("~/lib/stripe/client", () => ({
  stripeClient: {
    checkout: {
      sessions: {
        retrieve: (...args: unknown[]): unknown =>
          stripeMocks.retrieve(...args),
      },
    },
  },
}));

const domainMocks = vi.hoisted(() => ({ getBusinessByDomain: vi.fn() }));
vi.mock("~/lib/domain", () => ({
  getCurrentDomain: () => "shop.example.com",
  getBusinessByDomain: (...args: unknown[]): unknown =>
    domainMocks.getBusinessByDomain(...args),
}));

const BUSINESS = { id: "biz_1", stripeAccountId: "acct_test_1" };
const SESSION_ID = "cs_test_123";
/** What create-session sets for SESSION_ID on BUSINESS. */
const SIGNED = signPendingSessionCookie(SESSION_ID, BUSINESS.id);

function makeRequest(sessionId: string | null, cookiePendingSession?: string) {
  const url = sessionId
    ? `https://shop.example.com/api/stripe/session?session_id=${sessionId}`
    : "https://shop.example.com/api/stripe/session";
  const headers: Record<string, string> = {};
  if (cookiePendingSession !== undefined) {
    headers.cookie = `pending_session=${cookiePendingSession}`;
  }
  return new NextRequest(url, { headers });
}

describe("GET /api/stripe/session", () => {
  beforeEach(() => {
    stripeMocks.retrieve.mockReset();
    domainMocks.getBusinessByDomain.mockReset();
    domainMocks.getBusinessByDomain.mockResolvedValue(BUSINESS);
  });

  it("returns delivery_method from session.metadata.deliveryMethod", async () => {
    stripeMocks.retrieve.mockResolvedValue({
      customer_email: "shopper@example.com",
      amount_total: 4599,
      currency: "usd",
      payment_status: "paid",
      metadata: { deliveryMethod: "pickup" },
    });

    const response = await GET(makeRequest(SESSION_ID, SIGNED));
    const body = (await response.json()) as { delivery_method: string | null };

    expect(response.status).toBe(200);
    expect(body.delivery_method).toBe("pickup");
    expect(stripeMocks.retrieve).toHaveBeenCalledWith(SESSION_ID, {
      stripeAccount: BUSINESS.stripeAccountId,
    });
  });

  it("returns null when the session has no deliveryMethod metadata", async () => {
    stripeMocks.retrieve.mockResolvedValue({
      customer_email: "shopper@example.com",
      amount_total: 4599,
      currency: "usd",
      payment_status: "paid",
      metadata: {},
    });

    const response = await GET(makeRequest(SESSION_ID, SIGNED));
    const body = (await response.json()) as { delivery_method: string | null };

    expect(body.delivery_method).toBeNull();
  });

  it("returns null when the session has no metadata object at all", async () => {
    stripeMocks.retrieve.mockResolvedValue({
      customer_email: "shopper@example.com",
      amount_total: 4599,
      currency: "usd",
      payment_status: "paid",
      metadata: null,
    });

    const response = await GET(makeRequest(SESSION_ID, SIGNED));
    const body = (await response.json()) as { delivery_method: string | null };

    expect(body.delivery_method).toBeNull();
  });

  it("still passes through the pre-existing fields unchanged", async () => {
    stripeMocks.retrieve.mockResolvedValue({
      customer_email: "shopper@example.com",
      amount_total: 4599,
      currency: "usd",
      payment_status: "paid",
      metadata: { deliveryMethod: "ship" },
    });

    const response = await GET(makeRequest(SESSION_ID, SIGNED));
    const body = (await response.json()) as {
      customer_email: string;
      amount_total: number;
      currency: string;
      payment_status: string;
      delivery_method: string | null;
    };

    expect(body).toEqual({
      customer_email: "shopper@example.com",
      amount_total: 4599,
      currency: "usd",
      payment_status: "paid",
      delivery_method: "ship",
    });
  });

  it("400s when session_id is missing", async () => {
    const response = await GET(makeRequest(null));
    expect(response.status).toBe(400);
  });

  it("403s when the pending_session cookie doesn't match session_id", async () => {
    const response = await GET(makeRequest(SESSION_ID, "some_other_session"));
    expect(response.status).toBe(403);
  });

  describe("signed pending_session cookie", () => {
    beforeEach(() => {
      stripeMocks.retrieve.mockResolvedValue({
        customer_email: "shopper@example.com",
        amount_total: 4599,
        currency: "usd",
        payment_status: "paid",
        metadata: { deliveryMethod: "ship" },
      });
    });

    it("200s for the signed cookie create-session set for this session", async () => {
      const response = await GET(makeRequest(SESSION_ID, SIGNED));
      expect(response.status).toBe(200);
    });

    it("403s for a signed cookie of a different session", async () => {
      const response = await GET(
        makeRequest(
          SESSION_ID,
          signPendingSessionCookie("cs_test_other", BUSINESS.id),
        ),
      );
      expect(response.status).toBe(403);
      expect(stripeMocks.retrieve).not.toHaveBeenCalled();
    });

    it("403s for a tampered signature", async () => {
      const tampered = `${SESSION_ID}.${"A".repeat(SIGNED.length - SESSION_ID.length - 1)}`;
      const response = await GET(makeRequest(SESSION_ID, tampered));
      expect(response.status).toBe(403);
      expect(stripeMocks.retrieve).not.toHaveBeenCalled();
    });

    it("403s for a cookie signed for another business", async () => {
      const response = await GET(
        makeRequest(
          SESSION_ID,
          signPendingSessionCookie(SESSION_ID, "biz_other"),
        ),
      );
      expect(response.status).toBe(403);
    });

    it("403s for a cookie signed with another secret", async () => {
      const response = await GET(
        makeRequest(
          SESSION_ID,
          signPendingSessionCookie(SESSION_ID, BUSINESS.id, {
            secret: "attacker-secret",
          }),
        ),
      );
      expect(response.status).toBe(403);
    });
  });

  describe("legacy bare cookie fallback retires with the marker", () => {
    const NOW = new Date("2026-10-11T12:00:00Z");
    const secondsAgo = (n: number) => Math.floor(NOW.getTime() / 1000) - n;

    beforeEach(() => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(NOW);
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    const base = {
      created: secondsAgo(10 * 60),
      customer_email: "shopper@example.com",
      amount_total: 4599,
      currency: "usd",
      payment_status: "paid",
    };
    const MARKED = {
      ...base,
      metadata: {
        deliveryMethod: "ship",
        [PENDING_COOKIE_MARKER_KEY]: PENDING_COOKIE_MARKER_VALUE,
      },
    };
    const UNMARKED = { ...base, metadata: { deliveryMethod: "ship" } };

    it("marked session + signed cookie -> 200", async () => {
      stripeMocks.retrieve.mockResolvedValue(MARKED);
      expect((await GET(makeRequest(SESSION_ID, SIGNED))).status).toBe(200);
    });

    it("marked session + legacy bare cookie -> 403", async () => {
      stripeMocks.retrieve.mockResolvedValue(MARKED);
      expect((await GET(makeRequest(SESSION_ID, SESSION_ID))).status).toBe(403);
    });

    it("unmarked (pre-deploy) session + legacy bare cookie -> 200", async () => {
      stripeMocks.retrieve.mockResolvedValue(UNMARKED);
      expect((await GET(makeRequest(SESSION_ID, SESSION_ID))).status).toBe(200);
    });

    it("unmarked session + signed cookie -> 200", async () => {
      stripeMocks.retrieve.mockResolvedValue(UNMARKED);
      expect((await GET(makeRequest(SESSION_ID, SIGNED))).status).toBe(200);
    });

    it("unmarked session created 10 min ago + bare cookie -> 200", async () => {
      stripeMocks.retrieve.mockResolvedValue({
        ...UNMARKED,
        created: secondsAgo(10 * 60),
      });
      expect((await GET(makeRequest(SESSION_ID, SESSION_ID))).status).toBe(200);
    });

    it("unmarked session created 2 days ago + bare cookie -> 403", async () => {
      stripeMocks.retrieve.mockResolvedValue({
        ...UNMARKED,
        created: secondsAgo(2 * 24 * 3600),
      });
      expect((await GET(makeRequest(SESSION_ID, SESSION_ID))).status).toBe(403);
    });

    it("bare cookie age cutoff is max age + 15 min slack", async () => {
      stripeMocks.retrieve.mockResolvedValue({
        ...UNMARKED,
        created: secondsAgo(3600 + 15 * 60 - 5),
      });
      expect((await GET(makeRequest(SESSION_ID, SESSION_ID))).status).toBe(200);
      stripeMocks.retrieve.mockResolvedValue({
        ...UNMARKED,
        created: secondsAgo(3600 + 15 * 60 + 5),
      });
      expect((await GET(makeRequest(SESSION_ID, SESSION_ID))).status).toBe(403);
    });

    it("unmarked session with no created timestamp + bare cookie -> 403 (fails closed)", async () => {
      stripeMocks.retrieve.mockResolvedValue({
        ...UNMARKED,
        created: undefined,
      });
      expect((await GET(makeRequest(SESSION_ID, SESSION_ID))).status).toBe(403);
    });

    it("signed cookie on an old unmarked session -> 200 (no age limit)", async () => {
      stripeMocks.retrieve.mockResolvedValue({
        ...UNMARKED,
        created: secondsAgo(2 * 24 * 3600),
      });
      expect((await GET(makeRequest(SESSION_ID, SIGNED))).status).toBe(200);
    });

    it("signed cookie on an old marked session -> 200 (no age limit)", async () => {
      stripeMocks.retrieve.mockResolvedValue({
        ...MARKED,
        created: secondsAgo(2 * 24 * 3600),
      });
      expect((await GET(makeRequest(SESSION_ID, SIGNED))).status).toBe(200);
    });

    it("signed cookie for another session + bare cookie for this one (recent, unmarked) -> 200", async () => {
      stripeMocks.retrieve.mockResolvedValue(UNMARKED);
      const other = signPendingSessionCookie("cs_test_other", BUSINESS.id);
      const req = new NextRequest(
        `https://shop.example.com/api/stripe/session?session_id=${SESSION_ID}`,
        {
          headers: {
            cookie: `pending_session=${other}; pending_session=${SESSION_ID}`,
          },
        },
      );
      expect((await GET(req)).status).toBe(200);
    });

    it("forged / mismatched cookies -> 403 for marked and unmarked sessions", async () => {
      for (const session of [MARKED, UNMARKED]) {
        stripeMocks.retrieve.mockResolvedValue(session);
        for (const cookie of [
          "cs_test_other",
          `${SESSION_ID}.forgedsignature`,
          signPendingSessionCookie("cs_test_other", BUSINESS.id),
        ]) {
          expect((await GET(makeRequest(SESSION_ID, cookie))).status).toBe(403);
        }
      }
    });

    it("no cookie at all -> 403 without a Stripe call", async () => {
      expect((await GET(makeRequest(SESSION_ID))).status).toBe(403);
      expect(stripeMocks.retrieve).not.toHaveBeenCalled();
    });

    it("legacy bare cookie for an unknown session -> 403 (not 500), no existence leak", async () => {
      stripeMocks.retrieve.mockRejectedValue(
        Object.assign(new Error("No such checkout.session"), {
          type: "StripeInvalidRequestError",
        }),
      );
      expect((await GET(makeRequest(SESSION_ID, SESSION_ID))).status).toBe(403);
    });

    it("a Stripe outage for the real owner is still a 500", async () => {
      stripeMocks.retrieve.mockRejectedValue(new Error("socket hang up"));
      expect((await GET(makeRequest(SESSION_ID, SIGNED))).status).toBe(500);
    });
  });

  it("404s when the business has no stripeAccountId", async () => {
    domainMocks.getBusinessByDomain.mockResolvedValue({
      id: "biz_1",
      stripeAccountId: null,
    });

    const response = await GET(makeRequest(SESSION_ID, SIGNED));
    expect(response.status).toBe(404);
  });
});
