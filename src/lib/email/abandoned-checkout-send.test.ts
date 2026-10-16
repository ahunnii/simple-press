import { beforeEach, describe, expect, it, vi } from "vitest";

import { sendAbandonedCheckoutEmail } from "./templates";
import {
  buildUnsubscribeUrl,
  oneClickUnsubscribeHeaders,
  verifyUnsubscribeToken,
} from "./unsubscribe-token";

const mocks = vi.hoisted(() => ({ sendEmail: vi.fn() }));
vi.mock("./send", () => ({
  sendEmail: (...args: unknown[]): unknown => mocks.sendEmail(...args),
  EMAIL_FROM: {
    NOREPLY: "noreply@test.dev",
    ORDERS: "orders@test.dev",
    SUPPORT: "support@test.dev",
    MARKETING: "marketing@test.dev",
  },
}));
vi.mock("./overrides.server", () => ({
  getEmailOverrides: () => Promise.resolve({}),
}));

const business = {
  name: "Acme Candles",
  ownerEmail: "owner@acme.test",
  subdomain: "acme",
};

describe("buildUnsubscribeUrl / oneClickUnsubscribeHeaders", () => {
  it("builds a verifiable /api/unsubscribe link under the base URL", () => {
    const url = buildUnsubscribeUrl("https://acme.test", {
      customerId: "cust_1",
      businessId: "biz_1",
    });
    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe(
      "https://acme.test/api/unsubscribe",
    );
    expect(verifyUnsubscribeToken(parsed.searchParams.get("t")!)).toEqual({
      customerId: "cust_1",
      businessId: "biz_1",
    });
  });

  it("emits RFC 8058 one-click headers", () => {
    expect(oneClickUnsubscribeHeaders("https://x.test/u")).toEqual({
      "List-Unsubscribe": "<https://x.test/u>",
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    });
  });
});

describe("sendAbandonedCheckoutEmail", () => {
  beforeEach(() => {
    mocks.sendEmail.mockReset();
    mocks.sendEmail.mockResolvedValue({ success: true, id: "re_1" });
  });

  it("sends one-click unsubscribe headers and keeps the idempotency key", async () => {
    const unsubscribeUrl = "https://acme.test/api/unsubscribe?t=tok_123";
    await sendAbandonedCheckoutEmail({
      to: "jane@shopper.test",
      business,
      idempotencyKey: "abandoned-checkout-cs_1",
      unsubscribeUrl,
      postalAddress: "123 Main St, Detroit, MI 48201",
    });

    expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
    const opts = mocks.sendEmail.mock.calls[0]![0] as {
      headers?: Record<string, string>;
      idempotencyKey?: string;
      tags?: Array<{ name: string; value: string }>;
    };
    expect(opts.headers).toEqual({
      "List-Unsubscribe": `<${unsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    });
    expect(opts.idempotencyKey).toBe("abandoned-checkout-cs_1");
    expect(opts.tags).toContainEqual({
      name: "category",
      value: "abandoned_checkout",
    });
  });
});
