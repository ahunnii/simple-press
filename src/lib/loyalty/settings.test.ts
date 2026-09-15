import { describe, expect, it } from "vitest";

import {
  DEFAULT_LOYALTY_PROGRAM,
  availableSocialNetworks,
  describeTierReward,
  toPublicProgram,
  type LoyaltyProgramSettings,
  type LoyaltyTierRow,
} from "./settings";

describe("DEFAULT_LOYALTY_PROGRAM", () => {
  it("matches the Prisma model's @default values", () => {
    expect(DEFAULT_LOYALTY_PROGRAM).toEqual({
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
    });
  });
});

describe("availableSocialNetworks", () => {
  it("keeps two valid URLs, drops empty/null/malformed, in canonical order", () => {
    const result = availableSocialNetworks({
      youtube: "https://youtube.com/@store",
      instagram: "https://instagram.com/store",
      facebook: "",
      twitter: null,
      linkedin: "not a url",
    });
    expect(result).toEqual([
      {
        network: "instagram",
        label: "Instagram",
        url: "https://instagram.com/store",
      },
      {
        network: "youtube",
        label: "YouTube",
        url: "https://youtube.com/@store",
      },
    ]);
  });

  it("returns [] for null, arrays, and non-object primitives", () => {
    expect(availableSocialNetworks(null)).toEqual([]);
    expect(availableSocialNetworks([])).toEqual([]);
    expect(availableSocialNetworks("str")).toEqual([]);
    expect(availableSocialNetworks(undefined)).toEqual([]);
    expect(availableSocialNetworks(42)).toEqual([]);
  });

  it("rejects a non-http(s) protocol", () => {
    expect(
      availableSocialNetworks({ instagram: "javascript:alert(1)" }),
    ).toEqual([]);
  });
});

describe("toPublicProgram", () => {
  const program: LoyaltyProgramSettings = { ...DEFAULT_LOYALTY_PROGRAM };

  it("drops inactive tiers and tiers with an unknown type, sorts by sortOrder then pointsCost", () => {
    const tiers: LoyaltyTierRow[] = [
      {
        id: "t3",
        label: "High cost, low sort",
        pointsCost: 5000,
        type: "fixed",
        value: 1000,
        minPurchase: null,
        sortOrder: 0,
        active: true,
      },
      {
        id: "t1",
        label: "Low cost, low sort",
        pointsCost: 100,
        type: "percentage",
        value: 10,
        minPurchase: null,
        sortOrder: 0,
        active: true,
      },
      {
        id: "t2",
        label: "Second sortOrder",
        pointsCost: 1,
        type: "fixed",
        value: 500,
        minPurchase: 1000,
        sortOrder: 1,
        active: true,
      },
      {
        id: "inactive",
        label: "Inactive",
        pointsCost: 1,
        type: "fixed",
        value: 1,
        minPurchase: null,
        sortOrder: 0,
        active: false,
      },
      {
        id: "unknown-type",
        label: "Unknown type",
        pointsCost: 1,
        type: "free_shipping",
        value: 0,
        minPurchase: null,
        sortOrder: 0,
        active: true,
      },
    ];

    const result = toPublicProgram(program, tiers);
    expect(result.rules).toEqual(program);
    expect(result.tiers.map((t) => t.id)).toEqual(["t1", "t3", "t2"]);
  });

  it("returns an empty tiers array when there are none", () => {
    expect(toPublicProgram(program, [])).toEqual({
      rules: program,
      tiers: [],
    });
  });
});

describe("describeTierReward", () => {
  it("formats a percentage tier", () => {
    expect(describeTierReward({ type: "percentage", value: 15 })).toBe(
      "15% off",
    );
  });

  it("formats a fixed (cents) tier using currency formatting", () => {
    expect(describeTierReward({ type: "fixed", value: 500 })).toBe(
      "$5.00 off",
    );
  });
});
