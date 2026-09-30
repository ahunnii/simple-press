import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";

/**
 * `/api/stripe/session` backs every template's order-confirmation page: it
 * proxies a Stripe Checkout Session lookup, gated by the `pending_session`
 * cookie the checkout form sets before redirecting to Stripe (see the
 * route's own comments). This test covers the `delivery_method` field added
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

    const response = await GET(makeRequest(SESSION_ID, SESSION_ID));
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

    const response = await GET(makeRequest(SESSION_ID, SESSION_ID));
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

    const response = await GET(makeRequest(SESSION_ID, SESSION_ID));
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

    const response = await GET(makeRequest(SESSION_ID, SESSION_ID));
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

  it("404s when the business has no stripeAccountId", async () => {
    domainMocks.getBusinessByDomain.mockResolvedValue({
      id: "biz_1",
      stripeAccountId: null,
    });

    const response = await GET(makeRequest(SESSION_ID, SESSION_ID));
    expect(response.status).toBe(404);
  });
});
