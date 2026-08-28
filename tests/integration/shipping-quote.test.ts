import type { Prisma } from "generated/prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createTestCaller } from "../helpers/caller";
import { db, resetDb } from "../helpers/db";
import {
  createBusiness,
  createProduct,
  createVariant,
} from "../helpers/factories";

/**
 * Characterization test for the public `shipping.quote` tRPC procedure
 * (src/server/api/routers/shipping.ts). A later phase moves this procedure's
 * body verbatim into src/lib/checkout/quote-shipping.ts, leaving the router
 * as a thin wrapper. This file pins TODAY'S output with hand-derived,
 * hardcoded expected `shippingCents` values — never computed by calling the
 * same `calculateShipping` / `calculateZoneWeightShipping` helpers the
 * router itself calls — so the extraction can be proven byte-for-byte
 * identical before/after.
 *
 * Procedures resolve the tenant from the request host via `next/headers` —
 * mocked below, same pattern as tests/integration/pool-sales.test.ts.
 */
const reqHost = vi.hoisted(() => ({ value: "shipq-biz.simplepress.test" }));
vi.mock("next/headers", () => ({
  headers: () => Promise.resolve(new Headers({ host: reqHost.value })),
  cookies: () => Promise.resolve(new Headers()),
}));

/** 3-tier matrix shared by every zone_weight scenario below. */
const WEIGHT_TIERS = [
  { label: "Light", minLb: 0, maxLb: 5 },
  { label: "Medium", minLb: 5, maxLb: 20 },
  { label: "Heavy", minLb: 20, maxLb: null },
];

/**
 * Creates a business configured for zone_weight shipping with a single
 * "Nearby" zone (states MI, OH) and rates 500 / 800 / 1200 across the three
 * WEIGHT_TIERS above. `createBusiness` doesn't expose shipping columns, so
 * they're patched on afterward (same pattern as pool-sales.test.ts patching
 * baseInventoryUnitId) rather than editing tests/helpers/factories.ts.
 */
async function createZoneWeightBusiness(opts: {
  subdomain: string;
  fallbackRateCents?: number;
  defaultItemWeightLb?: number;
  freeShippingThreshold?: number | null;
}) {
  const business = await createBusiness({ subdomain: opts.subdomain });
  await db.business.update({
    where: { id: business.id },
    data: {
      shippingType: "zone_weight",
      shippingWeightTiers: WEIGHT_TIERS as unknown as Prisma.InputJsonValue,
      shippingFallbackRate: opts.fallbackRateCents ?? 1500,
      shippingDefaultItemWeightLb: opts.defaultItemWeightLb ?? 2,
      freeShippingThreshold: opts.freeShippingThreshold ?? null,
    },
  });
  await db.shippingZone.create({
    data: {
      businessId: business.id,
      name: "Nearby",
      states: ["MI", "OH"],
      sortOrder: 0,
      rates: {
        create: [
          { tierIndex: 0, priceCents: 500 },
          { tierIndex: 1, priceCents: 800 },
          { tierIndex: 2, priceCents: 1200 },
        ],
      },
    },
  });
  return business;
}

/** Patches weight/weightUnit onto a factory-created product (factory has no weight param). */
function setProductWeight(
  productId: string,
  weight: number | null,
  weightUnit: string | null = "lb",
) {
  return db.product.update({
    where: { id: productId },
    data: { weight, weightUnit },
  });
}

function setHost(business: { subdomain: string }) {
  reqHost.value = `${business.subdomain}.simplepress.test`;
}

describe("shipping.quote (characterization — pins current behavior before extraction)", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("shippingType 'free' → 0, regardless of subtotal", async () => {
    const business = await createBusiness({ subdomain: "free-biz" });
    await db.business.update({
      where: { id: business.id },
      data: { shippingType: "free" },
    });
    const product = await createProduct(business.id, { price: 1000 });
    setHost(business);
    const caller = createTestCaller({});

    const result = await caller.shipping.quote({
      items: [{ productId: product.id, variantId: null, quantity: 2 }],
      destinationState: "MI",
      destinationCountry: "US",
      deliveryMethod: "ship",
    });

    expect(result).toEqual({ shippingCents: 0 });
  });

  it("shippingType 'flat_rate' returns the flat rate — and IGNORES freeShippingThreshold entirely (only flat_rate_with_threshold checks it)", async () => {
    const business = await createBusiness({ subdomain: "flat-biz" });
    await db.business.update({
      where: { id: business.id },
      data: {
        shippingType: "flat_rate",
        shippingFlatRate: 599,
        // Deliberately low: if plain "flat_rate" honored this the way
        // "flat_rate_with_threshold" does, a $50 subtotal would trigger free
        // shipping. It doesn't — calculateShipping's FLAT_RATE branch never
        // reads freeShippingThreshold at all.
        freeShippingThreshold: 100,
      },
    });
    const product = await createProduct(business.id, { price: 5000 });
    setHost(business);
    const caller = createTestCaller({});

    const result = await caller.shipping.quote({
      items: [{ productId: product.id, variantId: null, quantity: 1 }],
      destinationState: "MI",
      destinationCountry: "US",
      deliveryMethod: "ship",
    });

    expect(result).toEqual({ shippingCents: 599 });
  });

  it("shippingType 'flat_rate_with_threshold': subtotal below threshold → flat rate", async () => {
    const business = await createBusiness({ subdomain: "thresh-below-biz" });
    await db.business.update({
      where: { id: business.id },
      data: {
        shippingType: "flat_rate_with_threshold",
        shippingFlatRate: 750,
        freeShippingThreshold: 5000,
      },
    });
    const product = await createProduct(business.id, { price: 1000 });
    setHost(business);
    const caller = createTestCaller({});

    const result = await caller.shipping.quote({
      items: [{ productId: product.id, variantId: null, quantity: 1 }],
      destinationState: "MI",
      destinationCountry: "US",
      deliveryMethod: "ship",
    });

    expect(result).toEqual({ shippingCents: 750 });
  });

  it("shippingType 'flat_rate_with_threshold': subtotal at/above threshold → 0", async () => {
    const business = await createBusiness({ subdomain: "thresh-above-biz" });
    await db.business.update({
      where: { id: business.id },
      data: {
        shippingType: "flat_rate_with_threshold",
        shippingFlatRate: 750,
        freeShippingThreshold: 5000,
      },
    });
    const product = await createProduct(business.id, { price: 5000 });
    setHost(business);
    const caller = createTestCaller({});

    const result = await caller.shipping.quote({
      items: [{ productId: product.id, variantId: null, quantity: 1 }],
      destinationState: "MI",
      destinationCountry: "US",
      deliveryMethod: "ship",
    });

    expect(result).toEqual({ shippingCents: 0 });
  });

  it("zone_weight: destination state in a zone + weight within a tier → the matrix cell rate", async () => {
    const business = await createZoneWeightBusiness({
      subdomain: "zw-cell-biz",
    });
    const product = await createProduct(business.id, { price: 1000 });
    // 3 lb × qty 1 = 3 lb → tier "Light" (0–5) → 500.
    await setProductWeight(product.id, 3, "lb");
    setHost(business);
    const caller = createTestCaller({});

    const result = await caller.shipping.quote({
      items: [{ productId: product.id, variantId: null, quantity: 1 }],
      destinationState: "MI",
      destinationCountry: "US",
      deliveryMethod: "ship",
    });

    expect(result).toEqual({ shippingCents: 500 });
  });

  it("zone_weight: total weight sums a variant's PARENT product weight + a null-weight product's shippingDefaultItemWeightLb fallback", async () => {
    const business = await createZoneWeightBusiness({
      subdomain: "zw-sum-biz",
    });

    const productX = await createProduct(business.id, { price: 1000 });
    await setProductWeight(productX.id, 4, "lb");
    const variantX = await createVariant(productX.id, { price: 1200 });

    const productY = await createProduct(business.id, { price: 800 });
    await setProductWeight(productY.id, null); // no weight → shippingDefaultItemWeightLb (2)

    setHost(business);
    const caller = createTestCaller({});

    // weight: (4 lb parent-product weight × qty 2) + (2 lb default × qty 3)
    //       = 8 + 6 = 14 lb → tier "Medium" (5–20) → 800.
    const result = await caller.shipping.quote({
      items: [
        { productId: productX.id, variantId: variantX.id, quantity: 2 },
        { productId: productY.id, variantId: null, quantity: 3 },
      ],
      destinationState: "OH",
      destinationCountry: "US",
      deliveryMethod: "ship",
    });

    expect(result).toEqual({ shippingCents: 800 });
  });

  it("zone_weight: kg weight is normalized to lb before the tier lookup", async () => {
    const business = await createZoneWeightBusiness({ subdomain: "zw-kg-biz" });
    const product = await createProduct(business.id, { price: 1000 });
    // 3 kg × 2.20462 = 6.61386 lb → tier "Medium" (5–20) → 800.
    // (Read as 3 lb instead, it would land in "Light" (0–5) → 500 — the
    // conversion is exactly what this test is pinning.)
    await setProductWeight(product.id, 3, "kg");
    setHost(business);
    const caller = createTestCaller({});

    const result = await caller.shipping.quote({
      items: [{ productId: product.id, variantId: null, quantity: 1 }],
      destinationState: "MI",
      destinationCountry: "US",
      deliveryMethod: "ship",
    });

    expect(result).toEqual({ shippingCents: 800 });
  });

  it("zone_weight: destination state with no zone match → fallback rate", async () => {
    const business = await createZoneWeightBusiness({
      subdomain: "zw-nozone-biz",
      fallbackRateCents: 1500,
    });
    const product = await createProduct(business.id, { price: 1000 });
    await setProductWeight(product.id, 3, "lb");
    setHost(business);
    const caller = createTestCaller({});

    const result = await caller.shipping.quote({
      items: [{ productId: product.id, variantId: null, quantity: 1 }],
      destinationState: "TX", // not listed in the "Nearby" zone (MI, OH)
      destinationCountry: "US",
      deliveryMethod: "ship",
    });

    expect(result).toEqual({ shippingCents: 1500 });
  });

  it("zone_weight: non-US destination country → fallback rate", async () => {
    const business = await createZoneWeightBusiness({
      subdomain: "zw-intl-biz",
      fallbackRateCents: 1500,
    });
    const product = await createProduct(business.id, { price: 1000 });
    await setProductWeight(product.id, 3, "lb");
    setHost(business);
    const caller = createTestCaller({});

    const result = await caller.shipping.quote({
      items: [{ productId: product.id, variantId: null, quantity: 1 }],
      destinationState: "ON",
      destinationCountry: "CA",
      deliveryMethod: "ship",
    });

    expect(result).toEqual({ shippingCents: 1500 });
  });

  it("zone_weight: freeShippingThreshold reached → 0 (checked before country/zone/weight)", async () => {
    const business = await createZoneWeightBusiness({
      subdomain: "zw-thresh-biz",
      freeShippingThreshold: 5000,
    });
    const product = await createProduct(business.id, { price: 6000 });
    await setProductWeight(product.id, 3, "lb");
    setHost(business);
    const caller = createTestCaller({});

    const result = await caller.shipping.quote({
      items: [{ productId: product.id, variantId: null, quantity: 1 }],
      destinationState: "MI", // otherwise a valid, priced zone match
      destinationCountry: "US",
      deliveryMethod: "ship",
    });

    expect(result).toEqual({ shippingCents: 0 });
  });

  it("deliveryMethod 'pickup' → 0, regardless of shippingType (short-circuits before businessData is even loaded)", async () => {
    const business = await createZoneWeightBusiness({
      subdomain: "pickup-biz",
    });
    const product = await createProduct(business.id, { price: 1000 });
    setHost(business);
    const caller = createTestCaller({});

    const result = await caller.shipping.quote({
      items: [{ productId: product.id, variantId: null, quantity: 1 }],
      destinationState: "MI",
      destinationCountry: "US",
      deliveryMethod: "pickup",
    });

    expect(result).toEqual({ shippingCents: 0 });
  });

  it("prices are re-fetched server-side: a client-supplied 'price' field on an item is ignored", async () => {
    const business = await createBusiness({ subdomain: "tamper-biz" });
    await db.business.update({
      where: { id: business.id },
      data: {
        shippingType: "flat_rate_with_threshold",
        shippingFlatRate: 599,
        freeShippingThreshold: 5000,
      },
    });
    // Real server-side price is low — well under the threshold.
    const product = await createProduct(business.id, { price: 100 });
    setHost(business);
    const caller = createTestCaller({});

    // The input schema has no `price` field on an item at all, so a
    // conforming client literally cannot send one — this documents that even
    // an extra, out-of-schema key is ignored rather than silently accepted:
    // the router only ever reads item.productId/variantId/quantity and looks
    // the price up itself.
    const tamperedItem = {
      productId: product.id,
      variantId: null as string | null,
      quantity: 1,
      price: 999_999, // if honored, subtotal would clear the threshold and shipping would be 0
    };

    const result = await caller.shipping.quote({
      items: [tamperedItem],
      destinationState: "MI",
      destinationCountry: "US",
      deliveryMethod: "ship",
    });

    expect(result).toEqual({ shippingCents: 599 });
  });

  it("unknown/nonexistent product id → treated as price 0 and shippingDefaultItemWeightLb (no error thrown)", async () => {
    const business = await createZoneWeightBusiness({
      subdomain: "unknown-biz",
      defaultItemWeightLb: 2,
    });
    setHost(business);
    const caller = createTestCaller({});

    // The router never validates that every submitted productId resolved to
    // a row — it silently treats a miss as price 0 / default weight rather
    // than rejecting the quote. weight: 2 lb default × qty 3 = 6 lb → tier
    // "Medium" (5–20) → 800.
    const result = await caller.shipping.quote({
      items: [{ productId: "does-not-exist", variantId: null, quantity: 3 }],
      destinationState: "MI",
      destinationCountry: "US",
      deliveryMethod: "ship",
    });

    expect(result).toEqual({ shippingCents: 800 });
  });
});
