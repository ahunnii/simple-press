import { beforeEach, describe, expect, it, vi } from "vitest";

import { createTestCaller } from "../helpers/caller";
import { db, resetDb } from "../helpers/db";
import { createBusiness, createOrder, createOwnerUser } from "../helpers/factories";

// Procedures resolve the tenant from the request host via `next/headers` — see
// tenant-isolation.test.ts for the reference pattern.
const reqHost = vi.hoisted(() => ({ value: "finance-biz.simplepress.test" }));
vi.mock("next/headers", () => ({
  headers: () => Promise.resolve(new Headers({ host: reqHost.value })),
  cookies: () => Promise.resolve(new Headers()),
}));

/**
 * `now` at local noon minus `n` days (calendar-day arithmetic, not epoch-ms
 * subtraction) so fixtures land solidly inside a day and are never flaky
 * against the router's local-midnight-aligned range boundaries.
 */
function localNoonDaysAgo(n: number, base = new Date()): Date {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 12, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

describe("finance.getBreakdown — DB half (no Stripe account connected)", () => {
  beforeEach(async () => {
    await resetDb();
    reqHost.value = "finance-biz.simplepress.test";
  });

  async function setupBusiness() {
    const business = await createBusiness({});
    const owner = await createOwnerUser(business.id);
    reqHost.value = `${business.subdomain}.simplepress.test`;
    const caller = createTestCaller({ userId: owner.id });
    return { business, owner, caller };
  }

  it("two ordinary paid orders: component identities hold, isStripeConnected/stripe pinned to false/null", async () => {
    const { business, caller } = await setupBusiness();
    const a = await createOrder(business.id, { total: 10000, tax: 500, shipping: 300 });
    const b = await createOrder(business.id, { total: 5000, tax: 250, shipping: 150 });

    const result = await caller.finance.getBreakdown({ range: "30d" });

    // Pin the Stripe-skip branch: no stripeAccountId on this business at all.
    expect(result.isStripeConnected).toBe(false);
    expect(result.stripe).toBeNull();

    const expectedProductSales =
      a.total - a.tax - a.shipping + (b.total - b.tax - b.shipping);
    expect(result.orders.productSalesCents).toBe(expectedProductSales);
    expect(
      result.orders.productSalesCents +
        result.orders.shippingCents +
        result.orders.taxCents,
    ).toBe(result.orders.netCollectedCents);
    expect(result.orders.netCollectedCents).toBe(
      result.orders.totalChargedCents - result.orders.refundedCents,
    );
    expect(result.orders.orderCount).toBe(2);
  });

  it("a paid-but-cancelled order is excluded from every figure", async () => {
    const { business, caller } = await setupBusiness();
    const kept = await createOrder(business.id, {
      total: 6000,
      tax: 300,
      shipping: 200,
      paymentStatus: "paid",
      status: "open",
    });
    await createOrder(business.id, {
      total: 9000,
      tax: 400,
      shipping: 100,
      paymentStatus: "paid",
      status: "cancelled",
    });

    const result = await caller.finance.getBreakdown({ range: "30d" });

    expect(result.orders.orderCount).toBe(1);
    expect(result.orders.totalChargedCents).toBe(kept.total);
    expect(result.orders.taxCents).toBe(kept.tax);
    expect(result.orders.shippingCents).toBe(kept.shipping);
    expect(result.orders.productSalesCents).toBe(kept.total - kept.tax - kept.shipping);
  });

  it("a fully-refunded order contributes to totalCharged+refunded but 0 to net; sum identity still holds", async () => {
    const { business, caller } = await setupBusiness();
    await createOrder(business.id, {
      total: 8000,
      tax: 400,
      shipping: 200,
      paymentStatus: "refunded",
      status: "refunded",
      refundAmountCents: 8000,
    });

    const result = await caller.finance.getBreakdown({ range: "30d" });

    expect(result.orders.totalChargedCents).toBe(8000);
    expect(result.orders.refundedCents).toBe(8000);
    expect(result.orders.netCollectedCents).toBe(0);
    expect(
      result.orders.productSalesCents +
        result.orders.shippingCents +
        result.orders.taxCents,
    ).toBe(result.orders.netCollectedCents);
  });

  it("a partial refund with awkward numbers reduces components proportionally with an EXACT sum identity", async () => {
    const { business, caller } = await setupBusiness();
    // total 10000 / tax 833 / shipping 599 / refund 3333 — hand-computed
    // independently of src/lib/orders/order-money.ts so this genuinely checks
    // the rounding, not just that the router calls the same helper twice.
    //
    // refundRatio = 3333/10000 = 0.3333
    // taxKept      = 833 - round(833 * 0.3333)  = 833 - round(277.6389) = 833 - 278 = 555
    // shippingKept = 599 - round(599 * 0.3333)  = 599 - round(199.6467) = 599 - 200 = 399
    // netCollected = 10000 - 3333 = 6667
    // productSales = netCollected - taxKept - shippingKept = 6667 - 555 - 399 = 5713
    await createOrder(business.id, {
      total: 10000,
      tax: 833,
      shipping: 599,
      paymentStatus: "paid",
      status: "open",
      refundAmountCents: 3333,
    });

    const result = await caller.finance.getBreakdown({ range: "30d" });

    expect(result.orders.taxCents).toBe(555);
    expect(result.orders.shippingCents).toBe(399);
    expect(result.orders.productSalesCents).toBe(5713);
    expect(result.orders.netCollectedCents).toBe(6667);
    expect(result.orders.totalChargedCents).toBe(10000);
    expect(result.orders.refundedCents).toBe(3333);
    expect(
      result.orders.productSalesCents +
        result.orders.shippingCents +
        result.orders.taxCents,
    ).toBe(result.orders.netCollectedCents);
  });

  it("paymentStatus 'disputed' is included in the breakdown", async () => {
    const { business, caller } = await setupBusiness();
    const order = await createOrder(business.id, {
      total: 4000,
      tax: 200,
      shipping: 100,
      paymentStatus: "disputed",
      status: "open",
    });

    const result = await caller.finance.getBreakdown({ range: "30d" });

    expect(result.orders.orderCount).toBe(1);
    expect(result.orders.totalChargedCents).toBe(order.total);
  });

  it("paymentStatus 'pending' is excluded entirely", async () => {
    const { business, caller } = await setupBusiness();
    await createOrder(business.id, {
      total: 4000,
      tax: 0,
      shipping: 0,
      paymentStatus: "pending",
      status: "open",
    });

    const result = await caller.finance.getBreakdown({ range: "30d" });

    expect(result.orders.orderCount).toBe(0);
    expect(result.orders.totalChargedCents).toBe(0);
  });

  it("card payment lands in viaStripeCents; cash lands in viaManualCents and bumps manualOrderCount", async () => {
    const { business, caller } = await setupBusiness();
    // Default paymentMethod from the schema is "card" — createOrder does not
    // expose paymentMethod, so the manual-order case is patched via a direct
    // db.order.update after creation (not editing tests/helpers/factories.ts).
    const cardOrder = await createOrder(business.id, { total: 3000, tax: 0, shipping: 0 });
    const cashOrder = await createOrder(business.id, { total: 1500, tax: 0, shipping: 0 });
    await db.order.update({
      where: { id: cashOrder.id },
      data: { paymentMethod: "cash" },
    });

    const result = await caller.finance.getBreakdown({ range: "30d" });

    expect(result.orders.viaStripeCents).toBe(cardOrder.total);
    expect(result.orders.viaManualCents).toBe(cashOrder.total);
    expect(result.orders.manualOrderCount).toBe(1);
    expect(result.orders.viaStripeCents + result.orders.viaManualCents).toBe(
      result.orders.totalChargedCents,
    );
  });

  it("range boundary (30d): a 5-day-old order is included, a 40-day-old order is excluded", async () => {
    const { business, caller } = await setupBusiness();
    const recent = await createOrder(business.id, {
      total: 4000,
      tax: 0,
      shipping: 0,
      createdAt: localNoonDaysAgo(5),
    });
    await createOrder(business.id, {
      total: 9000,
      tax: 0,
      shipping: 0,
      createdAt: localNoonDaysAgo(40),
    });

    const result = await caller.finance.getBreakdown({ range: "30d" });

    expect(result.orders.orderCount).toBe(1);
    expect(result.orders.totalChargedCents).toBe(recent.total);
  });

  // taxCollectedYtdCents must reflect the calendar year regardless of `range`.
  // Guard: constructing an "in-year but outside a 7d range" fixture requires
  // at least ~3 weeks of runway since Jan 1 of the current year. If the test
  // is running in the first few weeks of January, skip rather than produce a
  // flaky/incorrect fixture that accidentally crosses into the prior year.
  const now = new Date();
  const daysSinceJan1 = Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 86_400_000,
  );
  const ytdCase = daysSinceJan1 >= 21 ? it : it.skip;

  ytdCase(
    "taxCollectedYtdCents reflects the calendar year regardless of the selected range",
    async () => {
      const { business, caller } = await setupBusiness();
      // In-year, but 20 days back — outside a 7d window, safely inside the
      // current calendar year given the >=21-day guard above.
      await createOrder(business.id, {
        total: 5000,
        tax: 400,
        shipping: 100,
        createdAt: localNoonDaysAgo(20),
      });

      const result = await caller.finance.getBreakdown({ range: "7d" });

      expect(result.orders.orderCount).toBe(0);
      expect(result.orders.taxCents).toBe(0);
      expect(result.taxCollectedYtdCents).toBe(400);
    },
  );

  it("empty result set: all-zero breakdown, no NaN", async () => {
    const { caller } = await setupBusiness();

    const result = await caller.finance.getBreakdown({ range: "30d" });

    expect(result.orders.orderCount).toBe(0);
    expect(result.orders.productSalesCents).toBe(0);
    expect(result.orders.shippingCents).toBe(0);
    expect(result.orders.taxCents).toBe(0);
    expect(result.orders.totalChargedCents).toBe(0);
    expect(result.orders.refundedCents).toBe(0);
    expect(result.orders.netCollectedCents).toBe(0);
    expect(result.taxCollectedYtdCents).toBe(0);
    for (const v of Object.values(result.orders)) {
      expect(Number.isNaN(v)).toBe(false);
    }
  });

  it("tenant isolation: another business's orders never appear in this business's breakdown", async () => {
    const { business, caller } = await setupBusiness();
    const other = await createBusiness({});
    const mine = await createOrder(business.id, { total: 3000, tax: 0, shipping: 0 });
    await createOrder(other.id, { total: 999_999, tax: 0, shipping: 0 });

    const result = await caller.finance.getBreakdown({ range: "30d" });

    expect(result.orders.orderCount).toBe(1);
    expect(result.orders.totalChargedCents).toBe(mine.total);
  });
});
