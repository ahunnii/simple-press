import { describe, expect, it } from "vitest";

import type { ShippingForSchema } from "./merchant-listing";
import { US_STATES } from "~/lib/geo/regions";

import {
  buildDeliveryTime,
  buildMerchantReturnPolicy,
  buildShippingDetails,
  productWeightLb,
  SCHEMA_CURRENCY,
} from "./merchant-listing";

const usd = (value: string) => ({
  "@type": "MonetaryAmount",
  value,
  currency: "USD",
});

const base: ShippingForSchema = {
  shippingType: "free",
  shippingFlatRate: null,
  freeShippingThreshold: null,
  salesCountries: [],
};

const tiers = [
  { label: "0–2 lb", minLb: 0, maxLb: 2 },
  { label: "2–10 lb", minLb: 2, maxLb: 10 },
  { label: "10+ lb", minLb: 10, maxLb: null },
];

const zoneBiz: ShippingForSchema = {
  ...base,
  shippingType: "zone_weight",
  shippingWeightTiers: tiers,
  shippingFallbackRate: 1500,
  shippingDefaultItemWeightLb: 1,
  freeShippingThreshold: 10000,
  salesCountries: ["CA", "MX"],
  zones: [
    {
      name: "West",
      states: ["ca", " NV ", "OR"],
      rates: [
        { tierIndex: 0, priceCents: 500 },
        { tierIndex: 1, priceCents: 900 },
        { tierIndex: 2, priceCents: 1900 },
      ],
    },
    {
      name: "East",
      // NV is already in West — checkout prices it with West, so must we.
      states: ["NY", "NJ", "NV"],
      rates: [
        { tierIndex: 0, priceCents: 700 },
        { tierIndex: 1, priceCents: 1100 },
        { tierIndex: 2, priceCents: 2100 },
      ],
    },
  ],
};

describe("SCHEMA_CURRENCY", () => {
  it("is USD", () => {
    expect(SCHEMA_CURRENCY).toBe("USD");
  });
});

describe("productWeightLb", () => {
  it("passes lb through", () => {
    expect(productWeightLb({ weight: 3, weightUnit: "lb" }, 1)).toBe(3);
  });

  it("converts kg to lb", () => {
    expect(productWeightLb({ weight: 2, weightUnit: "kg" }, 1)).toBeCloseTo(
      4.40924,
    );
  });

  it("uses the store default when the product has no weight", () => {
    expect(productWeightLb({ weight: null }, 2.5)).toBe(2.5);
    expect(productWeightLb({}, null)).toBe(0);
  });

  it("keeps an explicit weight of 0", () => {
    expect(productWeightLb({ weight: 0 }, 5)).toBe(0);
  });
});

describe("buildDeliveryTime", () => {
  it("returns undefined when nothing is set", () => {
    expect(buildDeliveryTime({})).toBeUndefined();
  });

  it("returns undefined when only half of each pair is set", () => {
    expect(
      buildDeliveryTime({ handlingDaysMin: 1, transitDaysMax: 5 }),
    ).toBeUndefined();
  });

  it("emits only the complete pair", () => {
    expect(
      buildDeliveryTime({
        handlingDaysMin: 0,
        handlingDaysMax: 1,
        transitDaysMin: 3,
      }),
    ).toEqual({
      "@type": "ShippingDeliveryTime",
      handlingTime: {
        "@type": "QuantitativeValue",
        minValue: 0,
        maxValue: 1,
        unitCode: "DAY",
      },
    });
  });

  it("emits both pairs", () => {
    expect(
      buildDeliveryTime({
        handlingDaysMin: 1,
        handlingDaysMax: 2,
        transitDaysMin: 3,
        transitDaysMax: 5,
      }),
    ).toEqual({
      "@type": "ShippingDeliveryTime",
      handlingTime: {
        "@type": "QuantitativeValue",
        minValue: 1,
        maxValue: 2,
        unitCode: "DAY",
      },
      transitTime: {
        "@type": "QuantitativeValue",
        minValue: 3,
        maxValue: 5,
        unitCode: "DAY",
      },
    });
  });

  it("drops a reversed pair", () => {
    expect(
      buildDeliveryTime({ transitDaysMin: 5, transitDaysMax: 2 }),
    ).toBeUndefined();
  });
});

describe("buildShippingDetails — simple types", () => {
  const args = { priceCents: 2500, weightLb: 1 };

  it("free → a single 0.00 entry to the US", () => {
    expect(buildShippingDetails(base, args)).toEqual([
      {
        "@type": "OfferShippingDetails",
        shippingRate: usd("0.00"),
        shippingDestination: {
          "@type": "DefinedRegion",
          addressCountry: "US",
        },
      },
    ]);
  });

  it("lists every allowed country as destinations", () => {
    const [entry] = buildShippingDetails(
      { ...base, salesCountries: ["MX", "CA"] },
      args,
    );
    expect(entry?.shippingDestination).toEqual([
      { "@type": "DefinedRegion", addressCountry: "US" },
      { "@type": "DefinedRegion", addressCountry: "CA" },
      { "@type": "DefinedRegion", addressCountry: "MX" },
    ]);
  });

  it("treats missing salesCountries as US only", () => {
    const [entry] = buildShippingDetails(
      { ...base, salesCountries: undefined },
      args,
    );
    expect(entry?.shippingDestination).toEqual({
      "@type": "DefinedRegion",
      addressCountry: "US",
    });
  });

  it("flat_rate → the flat rate", () => {
    const [entry] = buildShippingDetails(
      { ...base, shippingType: "flat_rate", shippingFlatRate: 599 },
      args,
    );
    expect(entry?.shippingRate).toEqual(usd("5.99"));
  });

  it("flat_rate_with_threshold below the threshold → flat", () => {
    const [entry] = buildShippingDetails(
      {
        ...base,
        shippingType: "flat_rate_with_threshold",
        shippingFlatRate: 799,
        freeShippingThreshold: 5000,
      },
      { priceCents: 4999, weightLb: 1 },
    );
    expect(entry?.shippingRate).toEqual(usd("7.99"));
  });

  it("flat_rate_with_threshold at the threshold → 0", () => {
    const [entry] = buildShippingDetails(
      {
        ...base,
        shippingType: "flat_rate_with_threshold",
        shippingFlatRate: 799,
        freeShippingThreshold: 5000,
      },
      { priceCents: 5000, weightLb: 1 },
    );
    expect(entry?.shippingRate).toEqual(usd("0.00"));
  });

  it("returns [] for an unknown shipping type", () => {
    expect(
      buildShippingDetails({ ...base, shippingType: "carrier_calc" }, args),
    ).toEqual([]);
  });

  it("attaches deliveryTime when set", () => {
    const [entry] = buildShippingDetails(
      { ...base, transitDaysMin: 2, transitDaysMax: 4 },
      args,
    );
    expect(entry?.deliveryTime).toMatchObject({
      "@type": "ShippingDeliveryTime",
      transitTime: { minValue: 2, maxValue: 4, unitCode: "DAY" },
    });
  });
});

describe("buildShippingDetails — zone_weight", () => {
  const allJson = (v: unknown) => JSON.stringify(v);

  it("at/over the threshold → a single 0-rate entry for every allowed country", () => {
    expect(
      buildShippingDetails(zoneBiz, { priceCents: 10000, weightLb: 50 }),
    ).toEqual([
      {
        "@type": "OfferShippingDetails",
        shippingRate: usd("0.00"),
        shippingDestination: [
          { "@type": "DefinedRegion", addressCountry: "US" },
          { "@type": "DefinedRegion", addressCountry: "CA" },
          { "@type": "DefinedRegion", addressCountry: "MX" },
        ],
      },
    ]);
  });

  it("prices one entry per zone by weight tier, then unzoned states and CA/MX at the stored fallback", () => {
    const entries = buildShippingDetails(zoneBiz, {
      priceCents: 2500,
      weightLb: 3,
    });
    expect(entries).toHaveLength(4);

    expect(entries[0]).toEqual({
      "@type": "OfferShippingDetails",
      shippingRate: usd("9.00"),
      shippingDestination: {
        "@type": "DefinedRegion",
        addressCountry: "US",
        addressRegion: ["CA", "NV", "OR"],
      },
    });
    // NV belongs to West only (first zone wins, as at checkout).
    expect(entries[1]).toEqual({
      "@type": "OfferShippingDetails",
      shippingRate: usd("11.00"),
      shippingDestination: {
        "@type": "DefinedRegion",
        addressCountry: "US",
        addressRegion: ["NY", "NJ"],
      },
    });

    const unzoned = entries[2]!;
    expect(unzoned.shippingRate).toEqual(usd("15.00"));
    const region = (unzoned.shippingDestination as { addressRegion: string[] })
      .addressRegion;
    expect(region).toHaveLength(US_STATES.length - 5);
    expect(region).not.toContain("CA");
    expect(region).not.toContain("NY");
    expect(region).toContain("TX");

    expect(entries[3]).toEqual({
      "@type": "OfferShippingDetails",
      shippingRate: usd("15.00"),
      shippingDestination: [
        { "@type": "DefinedRegion", addressCountry: "CA" },
        { "@type": "DefinedRegion", addressCountry: "MX" },
      ],
    });
  });

  it("uses the heaviest tier for a heavy product", () => {
    const [west] = buildShippingDetails(zoneBiz, {
      priceCents: 2500,
      weightLb: productWeightLb({ weight: 5, weightUnit: "kg" }, 1), // ~11 lb
    });
    expect(west?.shippingRate).toEqual(usd("19.00"));
  });

  it("uses the store default weight for an unweighted product", () => {
    const [west] = buildShippingDetails(zoneBiz, {
      priceCents: 2500,
      weightLb: productWeightLb(
        { weight: null },
        zoneBiz.shippingDefaultItemWeightLb,
      ),
    });
    expect(west?.shippingRate).toEqual(usd("5.00"));
  });

  it("with no stored fallback: only fully priced zones, no unzoned/CA/MX entries, never 99.99", () => {
    const entries = buildShippingDetails(
      { ...zoneBiz, shippingFallbackRate: null },
      { priceCents: 2500, weightLb: 3 },
    );
    expect(entries).toHaveLength(2);
    expect(allJson(entries)).not.toContain("99.99");
    expect(allJson(entries)).not.toContain('"addressCountry":"CA"');
    expect(allJson(entries)).not.toContain('"addressCountry":"MX"');
  });

  it("skips a zone with a missing rate cell when there is no stored fallback", () => {
    const entries = buildShippingDetails(
      {
        ...zoneBiz,
        shippingFallbackRate: null,
        zones: [
          zoneBiz.zones![0]!,
          {
            name: "East",
            states: ["NY"],
            rates: [{ tierIndex: 0, priceCents: 700 }], // no tier-1 cell
          },
        ],
      },
      { priceCents: 2500, weightLb: 3 },
    );
    expect(entries).toHaveLength(1);
    expect(entries[0]?.shippingRate).toEqual(usd("9.00"));
  });

  it("prices a zone with a missing rate cell at the stored fallback when one is set", () => {
    const entries = buildShippingDetails(
      {
        ...zoneBiz,
        salesCountries: [],
        zones: [
          {
            name: "East",
            states: ["NY"],
            rates: [{ tierIndex: 0, priceCents: 700 }],
          },
        ],
      },
      { priceCents: 2500, weightLb: 3 },
    );
    expect(entries[0]).toMatchObject({
      shippingRate: usd("15.00"),
      shippingDestination: { addressRegion: "NY" },
    });
    // unzoned US entry; no CA/MX since the store doesn't sell there
    expect(entries).toHaveLength(2);
  });

  it("never emits the $99.99 placeholder when tiers are malformed and fallback is null", () => {
    const entries = buildShippingDetails(
      {
        ...zoneBiz,
        shippingWeightTiers: "garbage",
        shippingFallbackRate: null,
      },
      { priceCents: 2500, weightLb: 3 },
    );
    expect(entries).toEqual([]);
  });

  it("emits a 0 fallback when the owner saved 0", () => {
    const entries = buildShippingDetails(
      { ...zoneBiz, shippingFallbackRate: 0, zones: [] },
      { priceCents: 2500, weightLb: 3 },
    );
    expect(entries.map((e) => e.shippingRate)).toEqual([
      usd("0.00"),
      usd("0.00"),
    ]);
  });

  it("drops zone states that aren't US state codes", () => {
    const [entry] = buildShippingDetails(
      {
        ...zoneBiz,
        zones: [
          {
            name: "Odd",
            states: ["California", "TX"],
            rates: [{ tierIndex: 1, priceCents: 1000 }],
          },
        ],
      },
      { priceCents: 2500, weightLb: 3 },
    );
    expect(entry?.shippingDestination).toEqual({
      "@type": "DefinedRegion",
      addressCountry: "US",
      addressRegion: "TX",
    });
  });

  it("attaches deliveryTime to every entry", () => {
    const entries = buildShippingDetails(
      { ...zoneBiz, handlingDaysMin: 1, handlingDaysMax: 2 },
      { priceCents: 2500, weightLb: 3 },
    );
    expect(entries.length).toBeGreaterThan(1);
    for (const e of entries) {
      expect(e.deliveryTime).toMatchObject({
        handlingTime: { minValue: 1, maxValue: 2 },
      });
    }
  });
});

describe("buildMerchantReturnPolicy", () => {
  it("returns undefined when the window is not set", () => {
    expect(
      buildMerchantReturnPolicy({ returnWindowDays: null }),
    ).toBeUndefined();
    expect(buildMerchantReturnPolicy({})).toBeUndefined();
  });

  it("0 → MerchantReturnNotPermitted", () => {
    expect(
      buildMerchantReturnPolicy({
        returnWindowDays: 0,
        returnFees: "free",
        returnMethod: "by_mail",
      }),
    ).toEqual({
      "@type": "MerchantReturnPolicy",
      applicableCountry: "US",
      returnPolicyCountry: "US",
      returnPolicyCategory: "https://schema.org/MerchantReturnNotPermitted",
    });
  });

  it("N → finite window with free returns by mail", () => {
    expect(
      buildMerchantReturnPolicy({
        returnWindowDays: 30,
        returnFees: "free",
        returnMethod: "by_mail",
      }),
    ).toEqual({
      "@type": "MerchantReturnPolicy",
      applicableCountry: "US",
      returnPolicyCountry: "US",
      returnPolicyCategory:
        "https://schema.org/MerchantReturnFiniteReturnWindow",
      merchantReturnDays: 30,
      returnMethod: "https://schema.org/ReturnByMail",
      returnFees: "https://schema.org/FreeReturn",
    });
  });

  it("customer_pays, in store", () => {
    expect(
      buildMerchantReturnPolicy({
        returnWindowDays: 14,
        returnFees: "customer_pays",
        returnMethod: "in_store",
      }),
    ).toMatchObject({
      returnMethod: "https://schema.org/ReturnInStore",
      returnFees: "https://schema.org/ReturnFeesCustomerResponsibility",
    });
  });

  it("flat_fee, either method → fee amount and both methods", () => {
    const policy = buildMerchantReturnPolicy({
      returnWindowDays: 60,
      returnFees: "flat_fee",
      returnShippingFeeCents: 595,
      returnMethod: "either",
    });
    expect(policy).toMatchObject({
      merchantReturnDays: 60,
      returnMethod: [
        "https://schema.org/ReturnByMail",
        "https://schema.org/ReturnInStore",
      ],
      returnFees: "https://schema.org/ReturnShippingFees",
      returnShippingFeesAmount: usd("5.95"),
    });
  });

  it("flat_fee without an amount omits returnFees entirely", () => {
    const policy = buildMerchantReturnPolicy({
      returnWindowDays: 30,
      returnFees: "flat_fee",
      returnShippingFeeCents: null,
      returnMethod: "by_mail",
    });
    expect(policy).not.toHaveProperty("returnFees");
    expect(policy).not.toHaveProperty("returnShippingFeesAmount");
  });

  it("lists every sales country as applicableCountry", () => {
    expect(
      buildMerchantReturnPolicy({
        returnWindowDays: 30,
        salesCountries: ["CA"],
      }),
    ).toMatchObject({ applicableCountry: ["US", "CA"] });
  });

  it("adds merchantReturnLink when given (also for no-returns)", () => {
    const link = "https://shop.test/refund-policy";
    expect(
      buildMerchantReturnPolicy(
        { returnWindowDays: 30, returnFees: "free", returnMethod: "by_mail" },
        { returnPolicyUrl: link },
      ),
    ).toMatchObject({ merchantReturnLink: link });
    expect(
      buildMerchantReturnPolicy(
        { returnWindowDays: 0 },
        { returnPolicyUrl: link },
      ),
    ).toMatchObject({ merchantReturnLink: link });
  });
});
