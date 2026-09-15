import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AwardResult } from "~/lib/loyalty/ledger";
import { ensureLoyaltyCustomer } from "~/lib/loyalty/customer";
import { awardPoints, getBalance, listLedger } from "~/lib/loyalty/ledger";
import {
  awardPointsForPaidOrder,
  clawbackPointsForOrder,
} from "~/lib/loyalty/order-hooks";
import { LoyaltyError, redeemRewardTier } from "~/lib/loyalty/redeem";

import { db, resetDb } from "../helpers/db";
import {
  createBusiness,
  createCustomer,
  createLoyaltyProgram,
  createLoyaltyTier,
  createOrder,
  createUser,
} from "../helpers/factories";

// These are lib-level tests that call the loyalty write path directly rather
// than through a tRPC caller, so nothing here resolves a tenant from the
// request host. The mock is kept anyway (matching the other integration
// tests) so that importing a module which transitively pulls in
// `next/headers` can never turn into a confusing failure here.
vi.mock("next/headers", () => ({
  headers: () =>
    Promise.resolve(new Headers({ host: "loyalty.simplepress.test" })),
  cookies: () => Promise.resolve(new Headers()),
}));

/** Narrows an AwardResult to the success arm, failing loudly if it isn't one. */
function assertAwarded(
  result: AwardResult,
): asserts result is Extract<AwardResult, { awarded: true }> {
  if (!result.awarded) {
    throw new Error(`expected points to be awarded, got "${result.reason}"`);
  }
}

/** A business with the loyalty flag on, plus a customer with no points yet. */
async function setupStore(
  opts: { featureFlags?: Record<string, boolean> } = {},
) {
  const business = await createBusiness({
    featureFlags: opts.featureFlags ?? { loyalty: true },
  });
  const customer = await createCustomer(business.id);
  return { business, customer };
}

/** Current `Customer.loyaltyPoints` straight from the row, bypassing helpers. */
async function storedBalance(customerId: string): Promise<number> {
  const row = await db.customer.findUniqueOrThrow({
    where: { id: customerId },
    select: { loyaltyPoints: true },
  });
  return row.loyaltyPoints;
}

describe("loyalty ledger: idempotency, clamping, earning, redeeming, clawback", () => {
  beforeEach(async () => {
    await resetDb();
  });

  // ---------------------------------------------------------------- awardPoints

  describe("awardPoints", () => {
    it("collapses a repeated sourceKey onto one row and one balance change", async () => {
      const { business, customer } = await setupStore();
      const input = {
        businessId: business.id,
        customerId: customer.id,
        type: "adjust" as const,
        points: 100,
        sourceKey: "adjust:fixed-key",
      };

      const first = await awardPoints(db, input);
      assertAwarded(first);
      expect(first.points).toBe(100);
      expect(first.balanceAfter).toBe(100);

      const second = await awardPoints(db, input);
      expect(second).toEqual({ awarded: false, reason: "duplicate" });

      const rows = await db.loyaltyLedger.findMany({
        where: { customerId: customer.id },
      });
      expect(rows).toHaveLength(1);
      // The balance must move exactly once — the whole point of writing the
      // ledger row before the balance update.
      expect(await storedBalance(customer.id)).toBe(100);
    });

    it("is a no-op for zero points", async () => {
      const { business, customer } = await setupStore();

      const result = await awardPoints(db, {
        businessId: business.id,
        customerId: customer.id,
        type: "adjust",
        points: 0,
        sourceKey: "adjust:zero",
      });

      expect(result).toEqual({ awarded: false, reason: "zero" });
      expect(await db.loyaltyLedger.count()).toBe(0);
    });

    it("clamps a deduction at the current balance", async () => {
      const { business, customer } = await setupStore();
      assertAwarded(
        await awardPoints(db, {
          businessId: business.id,
          customerId: customer.id,
          type: "adjust",
          points: 30,
          sourceKey: "adjust:seed",
        }),
      );

      const result = await awardPoints(db, {
        businessId: business.id,
        customerId: customer.id,
        type: "order_clawback",
        points: -100,
        sourceKey: "order-clawback:x:manual",
      });

      assertAwarded(result);
      expect(result.points).toBe(-30);
      expect(result.balanceAfter).toBe(0);

      const row = await db.loyaltyLedger.findFirstOrThrow({
        where: { type: "order_clawback" },
      });
      expect(row.points).toBe(-30);
      expect(await storedBalance(customer.id)).toBe(0);
    });

    it("goes negative when clamping is explicitly disabled", async () => {
      const { business, customer } = await setupStore();

      const result = await awardPoints(db, {
        businessId: business.id,
        customerId: customer.id,
        type: "adjust",
        points: -50,
        sourceKey: "adjust:negative",
        clampToBalance: false,
      });

      assertAwarded(result);
      expect(result.points).toBe(-50);
      expect(await storedBalance(customer.id)).toBe(-50);
    });

    it("refuses a customer belonging to another business", async () => {
      const { customer } = await setupStore();
      const other = await createBusiness({ featureFlags: { loyalty: true } });

      await expect(
        awardPoints(db, {
          businessId: other.id,
          customerId: customer.id,
          type: "adjust",
          points: 10,
          sourceKey: "adjust:cross-tenant",
        }),
      ).rejects.toThrow(/another business/i);

      expect(await db.loyaltyLedger.count()).toBe(0);
      expect(await storedBalance(customer.id)).toBe(0);
    });

    it("lists a customer's ledger newest first", async () => {
      const { business, customer } = await setupStore();
      for (const [index, points] of [10, 20, 30].entries()) {
        assertAwarded(
          await awardPoints(db, {
            businessId: business.id,
            customerId: customer.id,
            type: "adjust",
            points,
            sourceKey: `adjust:${index}`,
          }),
        );
      }

      const rows = await listLedger(db, {
        businessId: business.id,
        customerId: customer.id,
      });

      expect(rows).toHaveLength(3);
      // Newest first. Compared as timestamps (ties allowed) rather than by
      // points, because three inserts can land in the same millisecond.
      const times = rows.map((row) => row.createdAt.getTime());
      expect([...times].sort((a, b) => b - a)).toEqual(times);
      expect(rows.map((row) => row.points).sort((a, b) => a - b)).toEqual([
        10, 20, 30,
      ]);
      expect(rows.every((row) => row.discountCode === null)).toBe(true);
      expect(await getBalance(db, customer.id)).toBe(60);
    });
  });

  // ------------------------------------------------------- ensureLoyaltyCustomer

  describe("ensureLoyaltyCustomer", () => {
    it("creates the row on first touch and claims an unlinked guest row later", async () => {
      const business = await createBusiness({
        featureFlags: { loyalty: true },
      });
      const user = await createUser({ email: "Shopper@Example.com" });

      const created = await ensureLoyaltyCustomer(db, {
        businessId: business.id,
        user: {
          id: user.id,
          email: "Shopper@Example.com",
          name: "Ada Lovelace",
        },
      });
      expect(created.loyaltyPoints).toBe(0);
      // Email is normalized on write so a guest checkout and a sign-in with
      // different casing resolve to one row (and one balance).
      expect(created.email).toBe("shopper@example.com");

      const row = await db.customer.findUniqueOrThrow({
        where: { id: created.id },
        select: { userId: true, firstName: true, lastName: true },
      });
      expect(row).toEqual({
        userId: user.id,
        firstName: "Ada",
        lastName: "Lovelace",
      });

      // A second call with the same email must return the same row, not a new one.
      const again = await ensureLoyaltyCustomer(db, {
        businessId: business.id,
        user: { id: user.id, email: "shopper@example.com" },
      });
      expect(again.id).toBe(created.id);
      expect(
        await db.customer.count({ where: { businessId: business.id } }),
      ).toBe(1);
    });

    it("links a guest customer row to the signed-in user", async () => {
      const business = await createBusiness({
        featureFlags: { loyalty: true },
      });
      const guest = await createCustomer(business.id, {
        email: "guest@example.com",
      });
      const user = await createUser({ email: "guest@example.com" });

      const resolved = await ensureLoyaltyCustomer(db, {
        businessId: business.id,
        user: { id: user.id, email: "guest@example.com" },
      });

      expect(resolved.id).toBe(guest.id);
      const row = await db.customer.findUniqueOrThrow({
        where: { id: guest.id },
        select: { userId: true },
      });
      expect(row.userId).toBe(user.id);
    });

    it("refuses a row already claimed by a different account", async () => {
      const business = await createBusiness({
        featureFlags: { loyalty: true },
      });
      const owner = await createUser({ email: "owner@example.com" });
      await createCustomer(business.id, {
        email: "shared@example.com",
        userId: owner.id,
      });
      const intruder = await createUser({ email: "intruder@example.com" });

      await expect(
        ensureLoyaltyCustomer(db, {
          businessId: business.id,
          user: { id: intruder.id, email: "shared@example.com" },
        }),
      ).rejects.toThrow("Customer record belongs to another account");
    });
  });

  // ------------------------------------------------- awardPointsForPaidOrder

  describe("awardPointsForPaidOrder", () => {
    it("awards order points plus the first-order bonus, once", async () => {
      const { business, customer } = await setupStore();
      await createLoyaltyProgram(business.id, {
        pointsPerDollar: 1,
        firstOrderEnabled: true,
        firstOrderBonus: 50,
      });
      const order = await createOrder(business.id, {
        customerId: customer.id,
        subtotal: 2599,
        discount: 100,
        total: 2499,
      });

      const result = await awardPointsForPaidOrder(db, {
        businessId: business.id,
        order: {
          id: order.id,
          subtotal: order.subtotal,
          discount: order.discount,
        },
        // orderCount is the value AFTER the caller incremented it.
        customer: { id: customer.id, orderCount: 1 },
      });

      // (2599 - 100) cents at 1 pt/$ = 24 pts, + 50 first-order bonus.
      expect(result).toEqual({ earned: 24, firstOrderBonus: 50, balance: 74 });
      expect(await storedBalance(customer.id)).toBe(74);

      const types = await db.loyaltyLedger.findMany({
        where: { customerId: customer.id },
        select: { type: true, orderId: true },
      });
      expect(types.map((row) => row.type).sort()).toEqual([
        "first_order_bonus",
        "order_earn",
      ]);
      expect(types.every((row) => row.orderId === order.id)).toBe(true);

      // Replayed webhook: both sourceKeys already exist, so nothing is added.
      const replay = await awardPointsForPaidOrder(db, {
        businessId: business.id,
        order: {
          id: order.id,
          subtotal: order.subtotal,
          discount: order.discount,
        },
        customer: { id: customer.id, orderCount: 1 },
      });
      expect(replay).toBeNull();
      expect(await db.loyaltyLedger.count()).toBe(2);
      expect(await storedBalance(customer.id)).toBe(74);
    });

    it("skips the first-order bonus for a repeat customer", async () => {
      const { business, customer } = await setupStore();
      await createLoyaltyProgram(business.id, {
        pointsPerDollar: 1,
        firstOrderEnabled: true,
        firstOrderBonus: 50,
      });
      const order = await createOrder(business.id, {
        customerId: customer.id,
        subtotal: 2599,
        discount: 100,
      });

      const result = await awardPointsForPaidOrder(db, {
        businessId: business.id,
        order: { id: order.id, subtotal: 2599, discount: 100 },
        customer: { id: customer.id, orderCount: 2 },
      });

      expect(result).toEqual({ earned: 24, firstOrderBonus: 0, balance: 24 });
      expect(
        await db.loyaltyLedger.count({ where: { type: "first_order_bonus" } }),
      ).toBe(0);
    });

    it("returns null and writes nothing when the feature flag is off", async () => {
      const { business, customer } = await setupStore({
        featureFlags: { loyalty: false },
      });
      await createLoyaltyProgram(business.id);
      const order = await createOrder(business.id, {
        customerId: customer.id,
        subtotal: 5000,
      });

      const result = await awardPointsForPaidOrder(db, {
        businessId: business.id,
        order: { id: order.id, subtotal: 5000, discount: 0 },
        customer: { id: customer.id, orderCount: 1 },
      });

      expect(result).toBeNull();
      expect(await db.loyaltyLedger.count()).toBe(0);
      expect(await storedBalance(customer.id)).toBe(0);
    });

    it("returns null when the business has no program row", async () => {
      const { business, customer } = await setupStore();
      const order = await createOrder(business.id, {
        customerId: customer.id,
        subtotal: 5000,
      });

      const result = await awardPointsForPaidOrder(db, {
        businessId: business.id,
        order: { id: order.id, subtotal: 5000, discount: 0 },
        customer: { id: customer.id, orderCount: 1 },
      });

      expect(result).toBeNull();
      expect(await db.loyaltyLedger.count()).toBe(0);
    });

    it("returns null when earning is off and there is no bonus to pay", async () => {
      const { business, customer } = await setupStore();
      await createLoyaltyProgram(business.id, {
        earnOnOrders: false,
        firstOrderEnabled: false,
      });
      const order = await createOrder(business.id, {
        customerId: customer.id,
        subtotal: 5000,
      });

      const result = await awardPointsForPaidOrder(db, {
        businessId: business.id,
        order: { id: order.id, subtotal: 5000, discount: 0 },
        customer: { id: customer.id, orderCount: 1 },
      });

      expect(result).toBeNull();
      expect(await db.loyaltyLedger.count()).toBe(0);
    });
  });

  // -------------------------------------------------------- redeemRewardTier

  describe("redeemRewardTier", () => {
    const now = new Date("2026-03-01T12:00:00.000Z");

    async function setupRedeemable(opts: {
      balance: number;
      pointsCost?: number;
    }) {
      const { business, customer } = await setupStore();
      const program = await createLoyaltyProgram(business.id);
      const tier = await createLoyaltyTier(program.id, business.id, {
        pointsCost: opts.pointsCost ?? 500,
      });
      if (opts.balance > 0) {
        assertAwarded(
          await awardPoints(db, {
            businessId: business.id,
            customerId: customer.id,
            type: "adjust",
            points: opts.balance,
            sourceKey: "adjust:seed",
          }),
        );
      }
      return { business, customer, program, tier };
    }

    it("mints a single-use loyalty code and spends the points", async () => {
      const { business, customer, tier } = await setupRedeemable({
        balance: 500,
      });

      const result = await redeemRewardTier(db, {
        businessId: business.id,
        customerId: customer.id,
        tierId: tier.id,
        expiryDays: 30,
        now,
      });

      expect(result.balanceAfter).toBe(0);
      expect(result.tier).toEqual({
        id: tier.id,
        label: tier.label,
        pointsCost: 500,
      });
      expect(result.discountCode.code).toMatch(/^RWD-[A-Z2-9]{6}$/);

      const code = await db.discountCode.findUniqueOrThrow({
        where: { id: result.discountCode.id },
      });
      expect(code.source).toBe("loyalty");
      expect(code.usageLimit).toBe(1);
      expect(code.perCustomerLimit).toBe(1);
      expect(code.active).toBe(true);
      expect(code.type).toBe(tier.type);
      expect(code.value).toBe(tier.value);
      expect(code.expiresAt?.getTime()).toBe(now.getTime() + 30 * 86_400_000);

      const ledger = await db.loyaltyLedger.findUniqueOrThrow({
        where: { id: result.ledgerId },
      });
      expect(ledger.type).toBe("redeem");
      expect(ledger.points).toBe(-500);
      expect(ledger.balanceAfter).toBe(0);
      expect(ledger.discountCodeId).toBe(code.id);
      expect(ledger.sourceKey).toBe(`redeem:${code.id}`);
      expect(await storedBalance(customer.id)).toBe(0);

      // The joined code surfaces on the customer's ledger view.
      const [entry] = await listLedger(db, {
        businessId: business.id,
        customerId: customer.id,
      });
      expect(entry?.discountCode?.code).toBe(code.code);
    });

    it("refuses a redemption the balance cannot cover, writing nothing", async () => {
      const { business, customer, tier } = await setupRedeemable({
        balance: 100,
      });

      const error = await redeemRewardTier(db, {
        businessId: business.id,
        customerId: customer.id,
        tierId: tier.id,
        expiryDays: 30,
        now,
      }).catch((err: unknown) => err);

      expect(error).toBeInstanceOf(LoyaltyError);
      expect((error as LoyaltyError).code).toBe("insufficient_points");

      // The whole transaction rolls back: no code, no ledger row, no spend.
      expect(await db.discountCode.count()).toBe(0);
      expect(await db.loyaltyLedger.count({ where: { type: "redeem" } })).toBe(
        0,
      );
      expect(await storedBalance(customer.id)).toBe(100);
    });

    it("rejects an inactive tier", async () => {
      const { business, customer } = await setupStore();
      const program = await createLoyaltyProgram(business.id);
      const tier = await createLoyaltyTier(program.id, business.id, {
        active: false,
      });
      assertAwarded(
        await awardPoints(db, {
          businessId: business.id,
          customerId: customer.id,
          type: "adjust",
          points: 1000,
          sourceKey: "adjust:seed",
        }),
      );

      const error = await redeemRewardTier(db, {
        businessId: business.id,
        customerId: customer.id,
        tierId: tier.id,
        expiryDays: 30,
        now,
      }).catch((err: unknown) => err);

      expect(error).toBeInstanceOf(LoyaltyError);
      expect((error as LoyaltyError).code).toBe("tier_not_found");
      expect(await storedBalance(customer.id)).toBe(1000);
    });

    it("rejects a tier belonging to another business", async () => {
      const { business, customer } = await setupRedeemable({ balance: 1000 });
      const otherBusiness = await createBusiness({
        featureFlags: { loyalty: true },
      });
      const otherProgram = await createLoyaltyProgram(otherBusiness.id);
      const foreignTier = await createLoyaltyTier(
        otherProgram.id,
        otherBusiness.id,
      );

      const error = await redeemRewardTier(db, {
        businessId: business.id,
        customerId: customer.id,
        tierId: foreignTier.id,
        expiryDays: 30,
        now,
      }).catch((err: unknown) => err);

      expect(error).toBeInstanceOf(LoyaltyError);
      expect((error as LoyaltyError).code).toBe("tier_not_found");

      expect(await db.discountCode.count()).toBe(0);
      expect(await storedBalance(customer.id)).toBe(1000);
    });
  });

  // --------------------------------------------------- clawbackPointsForOrder

  describe("clawbackPointsForOrder", () => {
    /** An order that earned exactly 100 points (a $100 order at 1 pt/$). */
    async function setupEarnedOrder() {
      const { business, customer } = await setupStore();
      await createLoyaltyProgram(business.id, {
        pointsPerDollar: 1,
        firstOrderEnabled: false,
      });
      const order = await createOrder(business.id, {
        customerId: customer.id,
        subtotal: 10_000,
        total: 10_000,
      });
      const earned = await awardPointsForPaidOrder(db, {
        businessId: business.id,
        order: { id: order.id, subtotal: 10_000, discount: 0 },
        customer: { id: customer.id, orderCount: 1 },
      });
      expect(earned).toEqual({ earned: 100, firstOrderBonus: 0, balance: 100 });
      return { business, customer, order };
    }

    it("claws back the refunded proportion, then only the difference on a full refund", async () => {
      const { business, customer, order } = await setupEarnedOrder();

      const partial = await clawbackPointsForOrder(db, {
        businessId: business.id,
        orderId: order.id,
        orderTotalCents: 10_000,
        refundCents: 5_000,
        isFullRefund: false,
        sourceSuffix: "re_partial",
        reason: "Partial refund",
      });
      expect(partial).toBe(50);
      expect(await storedBalance(customer.id)).toBe(50);

      // Same refund replayed: nothing further is deducted and no second row
      // appears for that suffix.
      const replay = await clawbackPointsForOrder(db, {
        businessId: business.id,
        orderId: order.id,
        orderTotalCents: 10_000,
        refundCents: 5_000,
        isFullRefund: false,
        sourceSuffix: "re_partial",
        reason: "Partial refund",
      });
      expect(replay).toBe(0);
      expect(
        await db.loyaltyLedger.count({ where: { type: "order_clawback" } }),
      ).toBe(1);

      const full = await clawbackPointsForOrder(db, {
        businessId: business.id,
        orderId: order.id,
        orderTotalCents: 10_000,
        refundCents: 10_000,
        isFullRefund: true,
        sourceSuffix: "re_full",
        reason: "Refund",
      });
      // Only the remaining 50 — never more than the order earned in total.
      expect(full).toBe(50);
      expect(await storedBalance(customer.id)).toBe(0);
      expect(
        await db.loyaltyLedger.count({ where: { type: "order_clawback" } }),
      ).toBe(2);
    });

    it("claws back each partial refund's own share when given the cumulative refunded total", async () => {
      // `order.refund` passes the CUMULATIVE refunded total (`newTotalRefunded`),
      // never this refund's own amount: the helper derives the intended total
      // clawback from that figure and subtracts what earlier refunds already
      // took. Two 25% refunds must therefore claw 25 then 25 — a per-refund
      // numerator would make the second one claw nothing.
      const { business, customer, order } = await setupEarnedOrder();

      const first = await clawbackPointsForOrder(db, {
        businessId: business.id,
        orderId: order.id,
        orderTotalCents: 10_000,
        refundCents: 2_500, // cumulative after refund #1
        isFullRefund: false,
        sourceSuffix: "re_1",
        reason: "Partial refund 1",
      });
      expect(first).toBe(25);

      const second = await clawbackPointsForOrder(db, {
        businessId: business.id,
        orderId: order.id,
        orderTotalCents: 10_000,
        refundCents: 5_000, // cumulative after refund #2
        isFullRefund: false,
        sourceSuffix: "re_2",
        reason: "Partial refund 2",
      });
      expect(second).toBe(25);
      expect(await storedBalance(customer.id)).toBe(50);
      expect(
        await db.loyaltyLedger.count({ where: { type: "order_clawback" } }),
      ).toBe(2);
    });

    it("returns 0 for an order that never earned points", async () => {
      const { business, customer } = await setupStore();
      await createLoyaltyProgram(business.id);
      const order = await createOrder(business.id, { customerId: customer.id });

      const result = await clawbackPointsForOrder(db, {
        businessId: business.id,
        orderId: order.id,
        orderTotalCents: 1000,
        refundCents: 1000,
        isFullRefund: true,
        sourceSuffix: "manual",
        reason: "Refund",
      });

      expect(result).toBe(0);
      expect(await db.loyaltyLedger.count()).toBe(0);
    });

    it("never pushes a balance negative when the points were already spent", async () => {
      const { business, customer, order } = await setupEarnedOrder();
      const program = await db.loyaltyProgram.findUniqueOrThrow({
        where: { businessId: business.id },
      });
      const tier = await createLoyaltyTier(program.id, business.id, {
        pointsCost: 60,
      });
      await redeemRewardTier(db, {
        businessId: business.id,
        customerId: customer.id,
        tierId: tier.id,
        expiryDays: 30,
      });
      expect(await storedBalance(customer.id)).toBe(40);

      const result = await clawbackPointsForOrder(db, {
        businessId: business.id,
        orderId: order.id,
        orderTotalCents: 10_000,
        refundCents: 10_000,
        isFullRefund: true,
        sourceSuffix: "re_full",
        reason: "Refund",
      });

      // Intended 100, but only 40 are left — the customer keeps the reward
      // code they already redeemed rather than going into debt.
      expect(result).toBe(40);
      expect(await storedBalance(customer.id)).toBe(0);
    });

    it("ignores an order that belongs to another business", async () => {
      const { business, order } = await setupEarnedOrder();
      const other = await createBusiness({ featureFlags: { loyalty: true } });

      const result = await clawbackPointsForOrder(db, {
        businessId: other.id,
        orderId: order.id,
        orderTotalCents: 10_000,
        refundCents: 10_000,
        isFullRefund: true,
        sourceSuffix: "re_full",
        reason: "Refund",
      });

      expect(result).toBe(0);
      expect(
        await db.loyaltyLedger.count({
          where: { businessId: business.id, type: "order_clawback" },
        }),
      ).toBe(0);
    });
  });
});
