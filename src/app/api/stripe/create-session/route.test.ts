import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";

/**
 * `getBusinessByDomain` is active-only, so null covers an unknown host AND a
 * suspended/closed store (e.g. a shopper whose cart was open at suspension).
 * The money endpoint must refuse to start a Stripe session for either.
 */

vi.mock("@sentry/nextjs", () => ({
  captureMessage: vi.fn(),
  captureException: vi.fn(),
}));
vi.mock("~/lib/rate-limit", () => ({
  checkoutLimiter: { consume: vi.fn().mockResolvedValue(undefined) },
  getClientIp: () => "127.0.0.1",
}));
vi.mock("~/lib/stripe/client", () => ({ stripeClient: {} }));
vi.mock("~/server/db", () => ({ db: {} }));

const domainMocks = vi.hoisted(() => ({ getBusinessByDomain: vi.fn() }));
vi.mock("~/lib/domain", () => ({
  getCurrentDomain: () => "shop.example.com",
  getBusinessByDomain: (...args: unknown[]): unknown =>
    domainMocks.getBusinessByDomain(...args),
}));

const VALID_BODY = {
  items: [
    {
      productId: "prod_1",
      variantId: null,
      productName: "Candle",
      variantName: null,
      price: 12,
      quantity: 1,
      imageUrl: null,
    },
  ],
  customerInfo: { email: "shopper@example.com", name: "Shopper" },
};

function makeRequest() {
  return new NextRequest("https://shop.example.com/api/stripe/create-session", {
    method: "POST",
    headers: { "content-type": "application/json", host: "shop.example.com" },
    body: JSON.stringify(VALID_BODY),
  });
}

describe("POST /api/stripe/create-session", () => {
  beforeEach(() => {
    domainMocks.getBusinessByDomain.mockReset();
  });

  it("returns 404 when no active store resolves for the host", async () => {
    domainMocks.getBusinessByDomain.mockResolvedValue(null);

    const response = await POST(makeRequest());
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(404);
    expect(body.error).toBe("Checkout is not available for this store.");
  });

  it("still reports stripe-not-connected (400) for an active store without Connect", async () => {
    domainMocks.getBusinessByDomain.mockResolvedValue({
      id: "biz_1",
      templateId: "default",
      stripeAccountId: null,
      stripeChargesEnabled: false,
    });

    const response = await POST(makeRequest());

    expect(response.status).toBe(400);
  });
});
