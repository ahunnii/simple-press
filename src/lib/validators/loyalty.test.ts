import { describe, expect, it } from "vitest";

import {
  adjustPointsSchema,
  birthdaySchema,
  customerLedgerQuerySchema,
  loyaltyProgramSettingsSchema,
  loyaltyTierInputSchema,
} from "./loyalty";

describe("birthdaySchema", () => {
  it("rejects Feb 30", () => {
    expect(birthdaySchema.safeParse({ month: 2, day: 30 }).success).toBe(
      false,
    );
  });

  it("accepts Feb 29", () => {
    expect(birthdaySchema.safeParse({ month: 2, day: 29 }).success).toBe(
      true,
    );
  });
});

describe("loyaltyTierInputSchema — percentage bounds", () => {
  const base = {
    label: "10% off",
    pointsCost: 100,
    type: "percentage" as const,
    value: 0,
  };

  it("rejects 101", () => {
    const result = loyaltyTierInputSchema.safeParse({ ...base, value: 101 });
    expect(result.success).toBe(false);
  });

  it("rejects 0", () => {
    const result = loyaltyTierInputSchema.safeParse({ ...base, value: 0 });
    expect(result.success).toBe(false);
  });

  it("accepts 100", () => {
    const result = loyaltyTierInputSchema.safeParse({ ...base, value: 100 });
    expect(result.success).toBe(true);
  });
});

describe("loyaltyTierInputSchema — fixed bounds", () => {
  it("rejects 0", () => {
    const result = loyaltyTierInputSchema.safeParse({
      label: "$5 off",
      pointsCost: 100,
      type: "fixed",
      value: 0,
    });
    expect(result.success).toBe(false);
  });

  it("accepts a positive cents value", () => {
    const result = loyaltyTierInputSchema.safeParse({
      label: "$5 off",
      pointsCost: 100,
      type: "fixed",
      value: 500,
    });
    expect(result.success).toBe(true);
  });
});

describe("loyaltyProgramSettingsSchema", () => {
  const validProgram = {
    earnOnOrders: true,
    pointsPerDollar: 1,
    signupEnabled: false,
    signupBonus: 0,
    firstOrderEnabled: false,
    firstOrderBonus: 0,
    birthdayEnabled: false,
    birthdayBonus: 0,
    socialEnabled: false,
    socialFollowBonus: 0,
    rewardCodeExpiryDays: 90,
  };

  it("accepts a valid program with no tiers", () => {
    expect(
      loyaltyProgramSettingsSchema.safeParse({ ...validProgram, tiers: [] })
        .success,
    ).toBe(true);
  });

  it("rejects more than 20 tiers", () => {
    const tiers = Array.from({ length: 21 }, (_, i) => ({
      label: `Tier ${i}`,
      pointsCost: 100,
      type: "fixed" as const,
      value: 100,
    }));
    const result = loyaltyProgramSettingsSchema.safeParse({
      ...validProgram,
      tiers,
    });
    expect(result.success).toBe(false);
  });

  it("accepts exactly 20 tiers", () => {
    const tiers = Array.from({ length: 20 }, (_, i) => ({
      label: `Tier ${i}`,
      pointsCost: 100,
      type: "fixed" as const,
      value: 100,
    }));
    const result = loyaltyProgramSettingsSchema.safeParse({
      ...validProgram,
      tiers,
    });
    expect(result.success).toBe(true);
  });
});

describe("adjustPointsSchema", () => {
  it("rejects 0 points", () => {
    const result = adjustPointsSchema.safeParse({
      customerId: "cust_1",
      points: 0,
      reason: "Goodwill gesture",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a positive or negative non-zero adjustment", () => {
    expect(
      adjustPointsSchema.safeParse({
        customerId: "cust_1",
        points: 100,
        reason: "Goodwill gesture",
      }).success,
    ).toBe(true);
    expect(
      adjustPointsSchema.safeParse({
        customerId: "cust_1",
        points: -100,
        reason: "Fraud correction",
      }).success,
    ).toBe(true);
  });

  it("rejects an adjustment beyond the max magnitude", () => {
    const result = adjustPointsSchema.safeParse({
      customerId: "cust_1",
      points: 1_000_001,
      reason: "Too much",
    });
    expect(result.success).toBe(false);
  });
});

describe("customerLedgerQuerySchema", () => {
  it("defaults take to 50", () => {
    const result = customerLedgerQuerySchema.parse({ customerId: "cust_1" });
    expect(result.take).toBe(50);
  });

  it("accepts an explicit take within range", () => {
    const result = customerLedgerQuerySchema.parse({
      customerId: "cust_1",
      take: 10,
    });
    expect(result.take).toBe(10);
  });

  it("rejects take above 200", () => {
    const result = customerLedgerQuerySchema.safeParse({
      customerId: "cust_1",
      take: 201,
    });
    expect(result.success).toBe(false);
  });
});
