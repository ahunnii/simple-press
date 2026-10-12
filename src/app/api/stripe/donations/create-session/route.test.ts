import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";

/**
 * `getBusinessByDomain` is active-only, so null covers an unknown host AND a
 * suspended/closed store. The route must refuse to start a Stripe session
 * for either.
 */

vi.mock("@sentry/nextjs", () => ({
  captureMessage: vi.fn(),
  captureException: vi.fn(),
}));
vi.mock("~/lib/rate-limit", () => ({
  donationCheckoutLimiter: { consume: vi.fn().mockResolvedValue(undefined) },
  getClientIp: () => "127.0.0.1",
}));
vi.mock("~/lib/stripe/client", () => ({ stripeClient: {} }));

const domainMocks = vi.hoisted(() => ({ getBusinessByDomain: vi.fn() }));
vi.mock("~/lib/domain", () => ({
  getCurrentDomain: () => "shop.example.com",
  getBusinessByDomain: (...args: unknown[]): unknown =>
    domainMocks.getBusinessByDomain(...args),
}));

function makeRequest() {
  return new Request(
    "https://shop.example.com/api/stripe/donations/create-session",
    {
      method: "POST",
      headers: { "content-type": "application/json", host: "shop.example.com" },
      body: JSON.stringify({ amountCents: 2500 }),
    },
  );
}

describe("POST /api/stripe/donations/create-session", () => {
  beforeEach(() => {
    domainMocks.getBusinessByDomain.mockReset();
  });

  it("returns 404 when no active store resolves for the host", async () => {
    domainMocks.getBusinessByDomain.mockResolvedValue(null);

    const response = await POST(makeRequest());
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(404);
    expect(body.error).toBe("Donations are not available for this store.");
  });
});
