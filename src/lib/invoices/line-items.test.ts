import { describe, expect, it } from "vitest";

import { parseLineItems, serializeLineItems } from "./line-items";

describe("parseLineItems / serializeLineItems", () => {
  const items = [
    { id: "l1", description: "Design", quantity: 2, unitPriceCents: 5000 },
    {
      id: "l2",
      description: "Widget",
      quantity: 1.5,
      unitPriceCents: 999,
      productId: "p1",
      variantId: "v1",
    },
  ];

  it("round-trips", () => {
    expect(parseLineItems(serializeLineItems(items))).toEqual(items);
  });

  it("drops derived and unknown keys on write", () => {
    const withExtras = items.map((item) => ({
      ...item,
      amountCents: 123,
      uiOpen: true,
    }));
    const stored = JSON.parse(serializeLineItems(withExtras)) as unknown[];
    expect(stored[0]).toEqual(items[0]);
    expect(stored[0]).not.toHaveProperty("amountCents");
  });

  it("returns [] for missing or unreadable blobs, never throws", () => {
    expect(parseLineItems(null)).toEqual([]);
    expect(parseLineItems(undefined)).toEqual([]);
    expect(parseLineItems("")).toEqual([]);
    expect(parseLineItems("{not json")).toEqual([]);
    expect(parseLineItems('{"id":"x"}')).toEqual([]);
  });

  it("drops individual malformed entries and keeps the rest", () => {
    const json = JSON.stringify([
      items[0],
      { id: "bad", description: "no price", quantity: 1 },
      null,
      items[1],
    ]);
    expect(parseLineItems(json)).toEqual(items);
  });

  it("reads lines that exceed today's INPUT limits (shape-only read)", () => {
    const long = {
      id: "l3",
      description: "x".repeat(900),
      quantity: 1,
      unitPriceCents: 1,
    };
    expect(parseLineItems(JSON.stringify([long]))).toEqual([long]);
  });
});
