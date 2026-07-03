import { beforeEach, describe, expect, it, vi } from "vitest";

import { verifyOrderStatusToken } from "~/lib/order-status-token";

import { createTestCaller } from "../helpers/caller";
import { resetDb } from "../helpers/db";
import { createBusiness, createOrder } from "../helpers/factories";

const reqHost = vi.hoisted(() => ({ value: "lookup-biz.simplepress.test" }));
vi.mock("next/headers", () => ({
  headers: () => Promise.resolve(new Headers({ host: reqHost.value })),
  cookies: () => Promise.resolve(new Headers()),
}));

// order-lookup only imports sendOrderStatusLink from the templates module.
const emailMocks = vi.hoisted(() => ({
  sendOrderStatusLink: vi.fn().mockResolvedValue({ success: true }),
}));
vi.mock("~/lib/email/templates", () => ({
  sendOrderStatusLink: (...args: unknown[]): unknown =>
    emailMocks.sendOrderStatusLink(...args),
}));

describe("order-lookup.requestLink", () => {
  beforeEach(async () => {
    await resetDb();
    reqHost.value = "lookup-biz.simplepress.test";
    emailMocks.sendOrderStatusLink.mockClear();
  });

  it("returns success and sends no email when no order matches (no enumeration)", async () => {
    await createBusiness({ subdomain: "lookup-biz" });
    const caller = createTestCaller({});

    const result = await caller.orderLookup.requestLink({
      email: "nobody@test.dev",
      orderNumber: 99999,
    });

    expect(result).toEqual({ success: true });
    expect(emailMocks.sendOrderStatusLink).not.toHaveBeenCalled();
  });

  it("returns success when the host resolves to no business at all", async () => {
    // No business created for this host.
    reqHost.value = "unknown-host.simplepress.test";
    const caller = createTestCaller({});

    const result = await caller.orderLookup.requestLink({
      email: "nobody@test.dev",
      orderNumber: 1,
    });

    expect(result).toEqual({ success: true });
    expect(emailMocks.sendOrderStatusLink).not.toHaveBeenCalled();
  });

  it("finds a matching order (businessId + orderNumber + email) and mints a token that verifies to the right orderId", async () => {
    const business = await createBusiness({ subdomain: "lookup-biz" });
    const order = await createOrder(business.id, {
      orderNumber: 4242,
      customerEmail: "shopper@test.dev",
      customerName: "Shopper Jones",
    });

    const caller = createTestCaller({});
    const result = await caller.orderLookup.requestLink({
      email: "shopper@test.dev",
      orderNumber: 4242,
    });

    expect(result).toEqual({ success: true });
    expect(emailMocks.sendOrderStatusLink).toHaveBeenCalledTimes(1);

    const callArgs = emailMocks.sendOrderStatusLink.mock.calls[0]?.[0] as {
      orderStatusUrl: string;
      orderNumber: number;
    };
    expect(callArgs.orderNumber).toBe(4242);

    const token = callArgs.orderStatusUrl.split("/order-status/")[1];
    expect(token).toBeTruthy();

    const verified = verifyOrderStatusToken(token!);
    expect(verified?.orderId).toBe(order.id);
  });

  it("does not match an order from a different business even with the same order number + email", async () => {
    // business A must exist so the host resolves; the matching order lives
    // only on business B and must not be found from A's host.
    await createBusiness({ subdomain: "lookup-biz" });
    const businessB = await createBusiness({ subdomain: "lookup-biz-b" });
    await createOrder(businessB.id, {
      orderNumber: 7,
      customerEmail: "cross@test.dev",
    });

    reqHost.value = "lookup-biz.simplepress.test";
    const caller = createTestCaller({});

    const result = await caller.orderLookup.requestLink({
      email: "cross@test.dev",
      orderNumber: 7,
    });

    expect(result).toEqual({ success: true });
    expect(emailMocks.sendOrderStatusLink).not.toHaveBeenCalled();
  });

  it("matches the customer email case-insensitively", async () => {
    const business = await createBusiness({ subdomain: "lookup-biz" });
    await createOrder(business.id, {
      orderNumber: 55,
      customerEmail: "MixedCase@Test.dev",
    });

    const caller = createTestCaller({});
    const result = await caller.orderLookup.requestLink({
      email: "mixedcase@test.dev",
      orderNumber: 55,
    });

    expect(result).toEqual({ success: true });
    expect(emailMocks.sendOrderStatusLink).toHaveBeenCalledTimes(1);
  });
});
