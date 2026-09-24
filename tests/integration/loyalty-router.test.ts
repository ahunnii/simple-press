import { beforeEach, describe, expect, it, vi } from "vitest";

import { createTestCaller } from "../helpers/caller";
import { db, resetDb } from "../helpers/db";
import {
  createBusiness,
  createCustomer,
  createLoyaltyProgram,
  createLoyaltyTier,
  createMembership,
  createOwnerUser,
  createUser,
} from "../helpers/factories";

/**
 * Coverage for `src/server/api/routers/loyalty.ts` — the `loyalty` tRPC
 * router (join/claim/redeem, admin settings + ledger, and the
 * `discount.getAll` exclusion of loyalty-minted codes).
 *
 * `checkBusiness()` (used by every customer-facing procedure via
 * `resolveTenant()`) and `featureGate`'s `getBusinessFlags()` both resolve
 * the tenant from the request host via `next/headers` — mocked with a
 * mutable host, same idiom as `procedure-tiers.test.ts` /
 * `subscription-router.test.ts`.
 */
const reqHost = vi.hoisted(() => ({ value: "loyalty-biz.simplepress.test" }));
vi.mock("next/headers", () => ({
  headers: () => Promise.resolve(new Headers({ host: reqHost.value })),
  cookies: () => Promise.resolve(new Headers()),
}));

const emailMocks = vi.hoisted(() => ({
  sendLoyaltyRewardRedeemedEmail: vi
    .fn()
    .mockResolvedValue({ success: true }),
}));
vi.mock("~/lib/email/templates", () => ({
  sendLoyaltyRewardRedeemedEmail: (...args: unknown[]): unknown =>
    emailMocks.sendLoyaltyRewardRedeemedEmail(...args),
}));

/** A fresh business (unique subdomain from the factory) with the request host pointed at it. */
async function setupBusiness(
  opts: { featureFlags?: Record<string, boolean> } = {},
) {
  const business = await createBusiness(
    opts.featureFlags ? { featureFlags: opts.featureFlags } : {},
  );
  reqHost.value = `${business.subdomain}.simplepress.test`;
  const owner = await createOwnerUser(business.id);
  return { business, owner };
}

describe("loyalty router", () => {
  beforeEach(async () => {
    await resetDb();
    emailMocks.sendLoyaltyRewardRedeemedEmail.mockClear();
  });

  it("getMine rejects a null-session caller with UNAUTHORIZED", async () => {
    await setupBusiness();
    const caller = createTestCaller({});

    await expect(caller.loyalty.getMine()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("flag off: join and redeem are FORBIDDEN, but getMine still resolves with flags.loyalty=false", async () => {
    await setupBusiness({ featureFlags: { loyalty: false } });
    const user = await createUser();
    const caller = createTestCaller({ userId: user.id, email: user.email });

    await expect(caller.loyalty.join()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(
      caller.loyalty.redeem({ tierId: "nonexistent" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    const mine = await caller.loyalty.getMine();
    expect(mine.flags.loyalty).toBe(false);
    expect(mine.customer).toBeNull();
    expect(mine.program).toBeNull();
  });

  it("flag on, coupons off: redeem is PRECONDITION_FAILED", async () => {
    const { business } = await setupBusiness({
      featureFlags: { loyalty: true, coupons: false },
    });
    const program = await createLoyaltyProgram(business.id);
    const tier = await createLoyaltyTier(program.id, business.id, {
      pointsCost: 100,
    });
    const user = await createUser();
    const caller = createTestCaller({ userId: user.id, email: user.email });

    await expect(
      caller.loyalty.redeem({ tierId: tier.id }),
    ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
  });

  it("flag+coupons on: join awards the signup bonus once, claimSocial awards once then rejects, redeem mints a loyalty code and emails once, insufficient balance is BAD_REQUEST", async () => {
    const { business } = await setupBusiness({
      featureFlags: { loyalty: true, coupons: true },
    });
    await db.siteContent.create({
      data: {
        businessId: business.id,
        socialLinks: { instagram: "https://instagram.com/teststore" },
      },
    });
    const program = await createLoyaltyProgram(business.id, {
      signupEnabled: true,
      signupBonus: 100,
      socialEnabled: true,
      socialFollowBonus: 50,
    });
    const cheapTier = await createLoyaltyTier(program.id, business.id, {
      label: "$5 off",
      pointsCost: 100,
      type: "fixed",
      value: 500,
    });
    const pricyTier = await createLoyaltyTier(program.id, business.id, {
      label: "$50 off",
      pointsCost: 100_000,
      type: "fixed",
      value: 5000,
    });

    const user = await createUser({ email: "shopper@test.dev" });
    const caller = createTestCaller({ userId: user.id, email: user.email });

    // join awards the signup bonus once; a second join awards nothing.
    const join1 = await caller.loyalty.join();
    expect(join1.awarded).toBe(100);
    expect(join1.balance).toBe(100);

    const join2 = await caller.loyalty.join();
    expect(join2.awarded).toBe(0);
    expect(join2.balance).toBe(100);

    // claimSocial("instagram") awards once, then rejects the repeat claim.
    const claim1 = await caller.loyalty.claimSocial({ network: "instagram" });
    expect(claim1.awarded).toBe(50);
    expect(claim1.balance).toBe(150);

    await expect(
      caller.loyalty.claimSocial({ network: "instagram" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });

    // Not enough points for the pricy tier.
    await expect(
      caller.loyalty.redeem({ tierId: pricyTier.id }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(emailMocks.sendLoyaltyRewardRedeemedEmail).not.toHaveBeenCalled();

    // Redeeming the affordable tier mints a `source: "loyalty"` code and
    // sends exactly one confirmation email.
    const redeemed = await caller.loyalty.redeem({ tierId: cheapTier.id });
    expect(redeemed.code).toMatch(/^RWD-/);
    expect(redeemed.balance).toBe(50);

    const mintedCode = await db.discountCode.findFirst({
      where: { businessId: business.id, code: redeemed.code },
    });
    expect(mintedCode?.source).toBe("loyalty");

    expect(emailMocks.sendLoyaltyRewardRedeemedEmail).toHaveBeenCalledTimes(1);
  });

  it("STAFF cannot adjustPoints but can read getCustomerLedger", async () => {
    const { business } = await setupBusiness();
    const staffUser = await createUser();
    await createMembership(business.id, staffUser.id, "STAFF");
    const customer = await createCustomer(business.id);

    const staffCaller = createTestCaller({
      userId: staffUser.id,
      email: staffUser.email,
    });

    await expect(
      staffCaller.loyalty.adjustPoints({
        customerId: customer.id,
        points: 10,
        reason: "test adjustment",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    const ledger = await staffCaller.loyalty.getCustomerLedger({
      customerId: customer.id,
    });
    expect(ledger.balance).toBe(0);
    expect(ledger.entries).toEqual([]);
  });

  it("getCustomerLedger and adjustPoints 404 on a customer from another business", async () => {
    const { business: businessB } = await setupBusiness();
    const foreignCustomer = await createCustomer(businessB.id);

    const { business: businessA, owner: ownerA } = await setupBusiness();
    reqHost.value = `${businessA.subdomain}.simplepress.test`;
    const caller = createTestCaller({ userId: ownerA.id, email: ownerA.email });

    await expect(
      caller.loyalty.getCustomerLedger({ customerId: foreignCustomer.id }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      caller.loyalty.adjustPoints({
        customerId: foreignCustomer.id,
        points: 10,
        reason: "cross-tenant",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("updateSettings replaces tiers: keeps+updates an existing id, deletes a removed id, creates a new one", async () => {
    const { business, owner } = await setupBusiness({
      featureFlags: { loyalty: true },
    });
    const program = await createLoyaltyProgram(business.id);
    const keepTier = await createLoyaltyTier(program.id, business.id, {
      label: "Keep",
      pointsCost: 200,
    });
    const removeTier = await createLoyaltyTier(program.id, business.id, {
      label: "Remove",
      pointsCost: 300,
    });

    const caller = createTestCaller({ userId: owner.id, email: owner.email });

    const result = await caller.loyalty.updateSettings({
      earnOnOrders: true,
      pointsPerDollar: 2,
      signupEnabled: false,
      signupBonus: 0,
      firstOrderEnabled: false,
      firstOrderBonus: 0,
      birthdayEnabled: false,
      birthdayBonus: 0,
      socialEnabled: false,
      socialFollowBonus: 0,
      rewardCodeExpiryDays: 60,
      tiers: [
        {
          id: keepTier.id,
          label: "Keep Updated",
          pointsCost: 250,
          type: "fixed",
          value: 500,
        },
        { label: "New Tier", pointsCost: 400, type: "percentage", value: 10 },
      ],
    });

    expect(result.exists).toBe(true);
    expect(result.program.pointsPerDollar).toBe(2);
    const labels = result.tiers.map((t) => t.label).sort();
    expect(labels).toEqual(["Keep Updated", "New Tier"]);

    const removedRow = await db.loyaltyRewardTier.findUnique({
      where: { id: removeTier.id },
    });
    expect(removedRow).toBeNull();

    const keptRow = await db.loyaltyRewardTier.findUnique({
      where: { id: keepTier.id },
    });
    expect(keptRow?.label).toBe("Keep Updated");
    expect(keptRow?.pointsCost).toBe(250);
  });

  it("discount.getAll does not include a loyalty-minted reward code", async () => {
    const { business, owner } = await setupBusiness({
      featureFlags: { loyalty: true, coupons: true },
    });
    // The signup bonus exactly covers the tier so a freshly-joined customer
    // can redeem it — this test only cares about where the minted code shows
    // up, not the points math, which is covered by the happy-path test above.
    // (A zero-cost tier won't do: redeemRewardTier refuses pointsCost 0.)
    const program = await createLoyaltyProgram(business.id, {
      signupEnabled: true,
      signupBonus: 100,
    });
    const tier = await createLoyaltyTier(program.id, business.id, {
      pointsCost: 100,
    });

    const user = await createUser();
    const custCaller = createTestCaller({
      userId: user.id,
      email: user.email,
    });
    await custCaller.loyalty.join();
    const redeemed = await custCaller.loyalty.redeem({
      tierId: tier.id,
    });

    await db.discountCode.create({
      data: {
        businessId: business.id,
        code: "MANUAL10",
        type: "percentage",
        value: 10,
        source: "manual",
      },
    });

    const ownerCaller = createTestCaller({
      userId: owner.id,
      email: owner.email,
    });
    const allCodes = await ownerCaller.discount.getAll();
    const codes = allCodes.map((c) => c.code);

    expect(codes).toContain("MANUAL10");
    expect(codes).not.toContain(redeemed.code);
  });
});
