import { describe, expect, it } from "vitest";

import {
  localDeliveryBandSchema,
  localDeliveryFeeForMiles,
  localDeliveryFeeRange,
  MAX_LOCAL_DELIVERY_BANDS,
  parseLocalDeliveryBands,
} from "./local-delivery-bands";

describe("localDeliveryBandSchema", () => {
  it("accepts whole miles 1–100 and non-negative whole cents", () => {
    expect(
      localDeliveryBandSchema.safeParse({ upToMiles: 1, feeCents: 0 }).success,
    ).toBe(true);
    expect(
      localDeliveryBandSchema.safeParse({ upToMiles: 100, feeCents: 999 })
        .success,
    ).toBe(true);
  });

  it.each([
    { upToMiles: 0, feeCents: 0 },
    { upToMiles: 101, feeCents: 0 },
    { upToMiles: 2.5, feeCents: 0 },
    { upToMiles: 2, feeCents: -1 },
    { upToMiles: 2, feeCents: 1.5 },
    { upToMiles: "2", feeCents: 0 },
    { feeCents: 0 },
  ])("rejects %o", (row) => {
    expect(localDeliveryBandSchema.safeParse(row).success).toBe(false);
  });
});

describe("parseLocalDeliveryBands", () => {
  it("is empty for anything that isn't an array", () => {
    for (const value of [null, undefined, {}, "[]", 5]) {
      expect(parseLocalDeliveryBands(value, 15)).toEqual([]);
    }
  });

  it("sorts nearest first", () => {
    expect(
      parseLocalDeliveryBands(
        [
          { upToMiles: 10, feeCents: 300 },
          { upToMiles: 3, feeCents: 0 },
        ],
        15,
      ),
    ).toEqual([
      { upToMiles: 3, feeCents: 0 },
      { upToMiles: 10, feeCents: 300 },
    ]);
  });

  it("drops malformed rows, rows at/over the radius and duplicate limits", () => {
    expect(
      parseLocalDeliveryBands(
        [
          { upToMiles: 5, feeCents: 100 },
          { upToMiles: 5, feeCents: 0 }, // duplicate: first wins
          { upToMiles: 15, feeCents: 0 }, // == radius
          { upToMiles: 20, feeCents: 0 }, // > radius
          { upToMiles: "4", feeCents: 0 },
          null,
        ],
        15,
      ),
    ).toEqual([{ upToMiles: 5, feeCents: 100 }]);
  });

  it("keeps any valid row when the radius is unknown", () => {
    expect(
      parseLocalDeliveryBands([{ upToMiles: 50, feeCents: 0 }], null),
    ).toEqual([{ upToMiles: 50, feeCents: 0 }]);
  });

  it(`caps at ${MAX_LOCAL_DELIVERY_BANDS}, keeping the nearest`, () => {
    const rows = [9, 1, 7, 3, 5].map((upToMiles) => ({
      upToMiles,
      feeCents: upToMiles * 10,
    }));
    expect(parseLocalDeliveryBands(rows, 15).map((b) => b.upToMiles)).toEqual([
      1, 3, 5,
    ]);
  });
});

describe("localDeliveryFeeForMiles", () => {
  const bands = [
    { upToMiles: 3, feeCents: 0 },
    { upToMiles: 8, feeCents: 250 },
  ];

  it("uses the nearest covering band, inclusive at its edge", () => {
    expect(localDeliveryFeeForMiles(0, bands, 500)).toBe(0);
    expect(localDeliveryFeeForMiles(3, bands, 500)).toBe(0);
    expect(localDeliveryFeeForMiles(3.01, bands, 500)).toBe(250);
    expect(localDeliveryFeeForMiles(8, bands, 500)).toBe(250);
  });

  it("falls back to the base fee past every band", () => {
    expect(localDeliveryFeeForMiles(8.01, bands, 500)).toBe(500);
    expect(localDeliveryFeeForMiles(1, [], 500)).toBe(500);
  });

  it("never returns a negative fee", () => {
    expect(localDeliveryFeeForMiles(1, [], -100)).toBe(0);
  });
});

describe("localDeliveryFeeRange", () => {
  it("is the base fee alone with no bands", () => {
    expect(localDeliveryFeeRange([], 500)).toEqual({
      minCents: 500,
      maxCents: 500,
    });
  });

  it("spans the bands and the base fee", () => {
    expect(
      localDeliveryFeeRange(
        [
          { upToMiles: 3, feeCents: 0 },
          { upToMiles: 8, feeCents: 250 },
        ],
        500,
      ),
    ).toEqual({ minCents: 0, maxCents: 500 });
  });

  it("handles a band dearer than the base fee", () => {
    expect(
      localDeliveryFeeRange([{ upToMiles: 3, feeCents: 900 }], 500),
    ).toEqual({ minCents: 500, maxCents: 900 });
  });
});
