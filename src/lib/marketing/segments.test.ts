import { describe, expect, it } from "vitest";

import { marketingAudienceWhere } from "./audience";
import {
  audienceSchema,
  audienceSegmentWhere,
  COUNTED_ORDER_WHERE,
  DEFAULT_AUDIENCE,
  describeAudience,
  parseAudience,
  parseStoredAudience,
} from "./segments";

const NOW = new Date("2026-10-22T12:00:00.000Z");
const daysBefore = (days: number) =>
  new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);

describe("audienceSchema", () => {
  it("accepts every segment shape", () => {
    for (const value of [
      { type: "all" },
      { type: "customers" },
      { type: "never-ordered" },
      { type: "bought", productIds: ["clx1abc", "clx2def"] },
      { type: "lapsed", days: 30 },
      { type: "lapsed", days: 180 },
      { type: "recent-signup", days: 7 },
      { type: "recent-signup", days: 90 },
    ]) {
      expect(audienceSchema.safeParse(value).success).toBe(true);
    }
  });

  it("dedupes product ids", () => {
    expect(
      audienceSchema.parse({
        type: "bought",
        productIds: ["a1", "b2", "a1", " b2 "],
      }),
    ).toEqual({ type: "bought", productIds: ["a1", "b2"] });
  });

  it("rejects bad shapes", () => {
    for (const value of [
      null,
      {},
      { type: "vip" },
      { type: "bought", productIds: [] },
      {
        type: "bought",
        productIds: Array.from({ length: 21 }, (_, i) => `p${i}`),
      },
      { type: "bought", productIds: ["bad id!"] },
      { type: "bought", productIds: [""] },
      { type: "bought" },
      { type: "lapsed", days: 45 },
      { type: "lapsed", days: "30" },
      { type: "recent-signup", days: 60 },
      { type: "recent-signup" },
    ]) {
      expect(audienceSchema.safeParse(value).success).toBe(false);
    }
  });
});

describe("parseAudience", () => {
  it("returns valid audiences as parsed", () => {
    expect(parseAudience({ type: "lapsed", days: 90 })).toEqual({
      type: "lapsed",
      days: 90,
    });
  });

  it("falls back to everyone for null, junk and unknown types", () => {
    for (const raw of [
      null,
      undefined,
      "all",
      42,
      [],
      { type: "removed-segment" },
      { type: "bought", productIds: [] },
    ]) {
      expect(parseAudience(raw)).toEqual(DEFAULT_AUDIENCE);
    }
  });
});

describe("parseStoredAudience", () => {
  it("treats null / undefined as everyone", () => {
    expect(parseStoredAudience(null)).toEqual({
      ok: true,
      audience: DEFAULT_AUDIENCE,
    });
    expect(parseStoredAudience(undefined)).toEqual({
      ok: true,
      audience: DEFAULT_AUDIENCE,
    });
  });

  it("returns a valid stored segment", () => {
    expect(parseStoredAudience({ type: "lapsed", days: 90 })).toEqual({
      ok: true,
      audience: { type: "lapsed", days: 90 },
    });
  });

  it("refuses anything else instead of widening to everyone", () => {
    for (const raw of [
      "all",
      42,
      [],
      {},
      { type: "removed-segment" },
      { type: "bought", productIds: [] },
      { type: "lapsed", days: 45 },
    ]) {
      expect(parseStoredAudience(raw)).toEqual({ ok: false });
    }
  });
});

describe("audienceSegmentWhere", () => {
  it("is empty for all", () => {
    expect(audienceSegmentWhere({ type: "all" }, NOW)).toEqual({});
  });

  it("counts paid and $0 orders, never cancelled / refunded / pending", () => {
    expect(COUNTED_ORDER_WHERE).toEqual({
      paymentStatus: { in: ["paid", "no_payment_required"] },
      status: { not: "cancelled" },
    });
  });

  it("uses counted orders (not orderCount) for customers / never-ordered", () => {
    expect(audienceSegmentWhere({ type: "customers" }, NOW)).toEqual({
      orders: { some: COUNTED_ORDER_WHERE },
    });
    expect(audienceSegmentWhere({ type: "never-ordered" }, NOW)).toEqual({
      orders: { none: COUNTED_ORDER_WHERE },
    });
  });

  it("matches counted orders containing any chosen product", () => {
    expect(
      audienceSegmentWhere({ type: "bought", productIds: ["p1", "p2"] }, NOW),
    ).toEqual({
      orders: {
        some: {
          ...COUNTED_ORDER_WHERE,
          items: { some: { productId: { in: ["p1", "p2"] } } },
        },
      },
    });
  });

  it("lapsed = some counted order, none within the window", () => {
    expect(audienceSegmentWhere({ type: "lapsed", days: 90 }, NOW)).toEqual({
      orders: {
        some: COUNTED_ORDER_WHERE,
        none: { ...COUNTED_ORDER_WHERE, createdAt: { gte: daysBefore(90) } },
      },
    });
  });

  it("recent-signup filters on consent date", () => {
    expect(
      audienceSegmentWhere({ type: "recent-signup", days: 7 }, NOW),
    ).toEqual({ marketingConsentAt: { gte: daysBefore(7) } });
  });
});

describe("marketingAudienceWhere with a segment", () => {
  const base = marketingAudienceWhere("biz_1");

  it("is the plain consent filter without a segment or for all", () => {
    expect(base).not.toHaveProperty("AND");
    expect(marketingAudienceWhere("biz_1", { type: "all" }, NOW)).toEqual(base);
  });

  it("ANDs the segment onto the consent filter", () => {
    expect(marketingAudienceWhere("biz_1", { type: "customers" }, NOW)).toEqual(
      { ...base, AND: [{ orders: { some: COUNTED_ORDER_WHERE } }] },
    );
  });
});

describe("describeAudience", () => {
  it("labels each segment", () => {
    expect(describeAudience({ type: "all" })).toBe("All subscribers");
    expect(describeAudience({ type: "customers" })).toBe(
      "Customers who've ordered",
    );
    expect(describeAudience({ type: "never-ordered" })).toBe(
      "Subscribers who haven't ordered",
    );
    expect(describeAudience({ type: "lapsed", days: 90 })).toBe(
      "Haven't ordered in 90 days",
    );
    expect(describeAudience({ type: "recent-signup", days: 30 })).toBe(
      "Signed up in the last 30 days",
    );
  });

  it("names bought products when it can", () => {
    const names = { p1: "Lavender Candle", p2: "Rose Soap", p3: "Mug" };
    expect(
      describeAudience({ type: "bought", productIds: ["p1"] }, names),
    ).toBe("Bought Lavender Candle");
    expect(
      describeAudience({ type: "bought", productIds: ["p1", "p2"] }, names),
    ).toBe("Bought Lavender Candle or Rose Soap");
    expect(
      describeAudience(
        { type: "bought", productIds: ["p1", "p2", "p3"] },
        names,
      ),
    ).toBe("Bought Lavender Candle or 2 others");
    expect(
      describeAudience({ type: "bought", productIds: ["gone", "p2"] }, names),
    ).toBe("Bought Rose Soap or 1 other");
  });

  it("falls back to a count without names", () => {
    expect(describeAudience({ type: "bought", productIds: ["p1"] })).toBe(
      "Bought a selected product",
    );
    expect(describeAudience({ type: "bought", productIds: ["p1", "p2"] })).toBe(
      "Bought any of 2 products",
    );
  });
});
