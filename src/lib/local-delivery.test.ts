import { beforeEach, describe, expect, it, vi } from "vitest";

import type { LocalDeliverySettings } from "./local-delivery";
import type * as Haversine from "~/lib/geo/haversine";
import { haversineMiles } from "~/lib/geo/haversine";

import {
  checkLocalDelivery,
  lookupOriginPlace,
  normalizeUsZip,
  resolveDeliveryOriginZip,
} from "./local-delivery";

// Real ZIP dataset (as zip-lookup.test.ts does — "server-only" is stubbed for
// the unit project). The distance function is wrapped so the radius boundary
// can be pinned to an exact figure without depending on centroid decimals.
vi.mock("~/lib/geo/haversine", async (importOriginal) => {
  const real = await importOriginal<typeof Haversine>();
  return { haversineMiles: vi.fn(real.haversineMiles) };
});

const SAGINAW = "48601";
const BEVERLY_HILLS = "90210";

const settings = (
  overrides: Partial<LocalDeliverySettings> = {},
): LocalDeliverySettings => ({
  offersLocalDelivery: true,
  localDeliveryOriginZip: SAGINAW,
  addressPostalCode: null,
  localDeliveryRadiusMiles: 15,
  localDeliveryFeeCents: 500,
  localDeliveryBands: null,
  localDeliveryMinOrderCents: null,
  ...overrides,
});

const check = (
  s: LocalDeliverySettings,
  destinationZip: string | null = SAGINAW,
  subtotalCents = 2000,
  destinationCountry = "US",
) =>
  checkLocalDelivery({
    settings: s,
    destinationZip,
    destinationCountry,
    subtotalCents,
  });

beforeEach(() => {
  vi.mocked(haversineMiles).mockClear();
});

describe("normalizeUsZip", () => {
  it("accepts 5-digit, ZIP+4 and whitespace", () => {
    expect(normalizeUsZip("48601")).toBe("48601");
    expect(normalizeUsZip(" 48601 ")).toBe("48601");
    expect(normalizeUsZip("48601-1234")).toBe("48601");
    expect(normalizeUsZip("486011234")).toBe("48601");
    expect(normalizeUsZip("48601 - 1234")).toBe("48601");
  });

  it("rejects anything else", () => {
    expect(normalizeUsZip("4860")).toBeNull();
    expect(normalizeUsZip("486012")).toBeNull();
    expect(normalizeUsZip("K1A 0B1")).toBeNull();
    expect(normalizeUsZip("")).toBeNull();
    expect(normalizeUsZip(null)).toBeNull();
    expect(normalizeUsZip(48601)).toBeNull();
  });
});

describe("resolveDeliveryOriginZip", () => {
  it("prefers the dedicated origin ZIP", () => {
    expect(
      resolveDeliveryOriginZip({
        localDeliveryOriginZip: "48601",
        addressPostalCode: "90210",
      }),
    ).toBe("48601");
  });

  it("falls back to the business ZIP when the origin is blank", () => {
    expect(
      resolveDeliveryOriginZip({
        localDeliveryOriginZip: "  ",
        addressPostalCode: "90210-1234",
      }),
    ).toBe("90210");
    expect(
      resolveDeliveryOriginZip({
        localDeliveryOriginZip: null,
        addressPostalCode: "90210",
      }),
    ).toBe("90210");
  });

  it("is null when neither is a US ZIP", () => {
    expect(
      resolveDeliveryOriginZip({
        localDeliveryOriginZip: null,
        addressPostalCode: null,
      }),
    ).toBeNull();
    expect(
      resolveDeliveryOriginZip({
        localDeliveryOriginZip: "abc",
        addressPostalCode: "90210",
      }),
    ).toBeNull();
  });
});

describe("checkLocalDelivery", () => {
  it("eligible in range, passing the fee through", async () => {
    await expect(check(settings())).resolves.toEqual({
      eligible: true,
      feeCents: 500,
    });
    await expect(
      check(settings({ localDeliveryFeeCents: 0 })),
    ).resolves.toEqual({ eligible: true, feeCents: 0 });
  });

  it("accepts a ZIP+4 destination", async () => {
    await expect(check(settings(), "48601-4321")).resolves.toEqual({
      eligible: true,
      feeCents: 500,
    });
  });

  it("not_offered when switched off or no radius", async () => {
    await expect(
      check(settings({ offersLocalDelivery: false })),
    ).resolves.toEqual({ eligible: false, reason: "not_offered" });
    await expect(
      check(settings({ localDeliveryRadiusMiles: null })),
    ).resolves.toEqual({ eligible: false, reason: "not_offered" });
    await expect(
      check(settings({ localDeliveryRadiusMiles: 0 })),
    ).resolves.toEqual({ eligible: false, reason: "not_offered" });
  });

  it("not_us for any other country", async () => {
    await expect(check(settings(), SAGINAW, 2000, "CA")).resolves.toEqual({
      eligible: false,
      reason: "not_us",
    });
  });

  it("no_origin when neither origin nor business ZIP resolves", async () => {
    await expect(
      check(
        settings({ localDeliveryOriginZip: null, addressPostalCode: null }),
      ),
    ).resolves.toEqual({ eligible: false, reason: "no_origin" });
    // Well-formed but not in the dataset.
    await expect(
      check(settings({ localDeliveryOriginZip: "00000" })),
    ).resolves.toEqual({ eligible: false, reason: "no_origin" });
  });

  it("blank origin falls back to the business ZIP", async () => {
    const s = settings({
      localDeliveryOriginZip: "",
      addressPostalCode: BEVERLY_HILLS,
    });
    await expect(check(s, BEVERLY_HILLS)).resolves.toEqual({
      eligible: true,
      feeCents: 500,
    });
    await expect(check(s, SAGINAW)).resolves.toEqual({
      eligible: false,
      reason: "out_of_range",
    });
  });

  it("unknown_zip for a malformed or unlisted destination", async () => {
    await expect(check(settings(), "00000")).resolves.toEqual({
      eligible: false,
      reason: "unknown_zip",
    });
    await expect(check(settings(), "4860")).resolves.toEqual({
      eligible: false,
      reason: "unknown_zip",
    });
    await expect(check(settings(), null)).resolves.toEqual({
      eligible: false,
      reason: "unknown_zip",
    });
  });

  it("out_of_range far away, and never exposes the distance", async () => {
    const result = await check(settings(), BEVERLY_HILLS);
    expect(result).toEqual({ eligible: false, reason: "out_of_range" });
    expect(JSON.stringify(result)).not.toMatch(/mile|distance/i);
  });

  it("is inclusive at exactly the radius", async () => {
    vi.mocked(haversineMiles).mockReturnValueOnce(15);
    await expect(check(settings(), "48602")).resolves.toEqual({
      eligible: true,
      feeCents: 500,
    });
    vi.mocked(haversineMiles).mockReturnValueOnce(15.0001);
    await expect(check(settings(), "48602")).resolves.toEqual({
      eligible: false,
      reason: "out_of_range",
    });
  });

  it("below_minimum compares the subtotal inclusively", async () => {
    const s = settings({ localDeliveryMinOrderCents: 5000 });
    await expect(check(s, SAGINAW, 4999)).resolves.toEqual({
      eligible: false,
      reason: "below_minimum",
      minOrderCents: 5000,
      // The address's price once the minimum is met.
      feeCents: 500,
    });
    await expect(check(s, SAGINAW, 5000)).resolves.toEqual({
      eligible: true,
      feeCents: 500,
    });
  });

  it("reports out_of_range ahead of below_minimum", async () => {
    const s = settings({ localDeliveryMinOrderCents: 5000 });
    await expect(check(s, BEVERLY_HILLS, 100)).resolves.toEqual({
      eligible: false,
      reason: "out_of_range",
    });
  });
});

describe("checkLocalDelivery distance bands", () => {
  // Radius 15, base $5; free within 3 mi, $2.50 within 8 mi.
  const banded = (overrides: Partial<LocalDeliverySettings> = {}) =>
    settings({
      localDeliveryBands: [
        { upToMiles: 8, feeCents: 250 },
        { upToMiles: 3, feeCents: 0 },
      ],
      ...overrides,
    });
  const at = async (miles: number, s = banded(), subtotalCents = 2000) => {
    vi.mocked(haversineMiles).mockReturnValueOnce(miles);
    return check(s, "48602", subtotalCents);
  };

  it("picks the nearest band covering the distance", async () => {
    await expect(at(1.2)).resolves.toEqual({ eligible: true, feeCents: 0 });
    await expect(at(5)).resolves.toEqual({ eligible: true, feeCents: 250 });
  });

  it("is inclusive at a band edge", async () => {
    await expect(at(3)).resolves.toEqual({ eligible: true, feeCents: 0 });
    await expect(at(3.0001)).resolves.toEqual({
      eligible: true,
      feeCents: 250,
    });
    await expect(at(8)).resolves.toEqual({ eligible: true, feeCents: 250 });
  });

  it("charges the base fee inside the radius but outside every band", async () => {
    await expect(at(8.5)).resolves.toEqual({ eligible: true, feeCents: 500 });
    await expect(at(15)).resolves.toEqual({ eligible: true, feeCents: 500 });
    await expect(at(15.0001)).resolves.toEqual({
      eligible: false,
      reason: "out_of_range",
    });
  });

  it("no bands prices exactly as before", async () => {
    for (const localDeliveryBands of [null, undefined, [], {}]) {
      await expect(at(1, settings({ localDeliveryBands }))).resolves.toEqual({
        eligible: true,
        feeCents: 500,
      });
    }
  });

  it("ignores malformed and at/over-radius bands", async () => {
    const s = settings({
      localDeliveryBands: [
        { upToMiles: 15, feeCents: 0 }, // == radius: could never apply
        { upToMiles: 40, feeCents: 0 },
        { upToMiles: "2", feeCents: 0 },
        { upToMiles: 2, feeCents: -100 },
        { upToMiles: 2.5, feeCents: 0 },
        null,
        "free",
      ],
    });
    await expect(at(1, s)).resolves.toEqual({ eligible: true, feeCents: 500 });
  });

  it("below_minimum carries the band fee, never the distance", async () => {
    const result = await at(
      2,
      banded({ localDeliveryMinOrderCents: 5000 }),
      100,
    );
    expect(result).toEqual({
      eligible: false,
      reason: "below_minimum",
      minOrderCents: 5000,
      feeCents: 0,
    });
    expect(JSON.stringify(result)).not.toMatch(/mile|distance/i);
  });

  it("never exposes the distance or the band when eligible", async () => {
    const result = await at(5.123);
    expect(Object.keys(result).sort()).toEqual(["eligible", "feeCents"]);
    expect(JSON.stringify(result)).not.toMatch(/5\.123|mile|band/i);
  });
});

describe("lookupOriginPlace", () => {
  it("returns city/state only", async () => {
    const place = await lookupOriginPlace("48601-1234");
    expect(place).toEqual({ city: "Saginaw", state: "MI" });
  });

  it("is null for malformed or unknown ZIPs", async () => {
    await expect(lookupOriginPlace("abc")).resolves.toBeNull();
    await expect(lookupOriginPlace("00000")).resolves.toBeNull();
  });
});
