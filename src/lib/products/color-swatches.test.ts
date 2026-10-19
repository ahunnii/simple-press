import { describe, expect, it } from "vitest";

import {
  BASE_PRODUCT_COLORS,
  colorOptionValues,
  isColorOptionName,
  matchColorName,
  MAX_COLOR_SWATCHES,
  normalizeColorName,
  pruneColorSwatches,
  readColorSwatches,
  sanitizeColorSwatches,
  swatchOverrideFor,
} from "./color-swatches";

describe("isColorOptionName", () => {
  it("matches color-ish keys and nothing else", () => {
    for (const key of [
      "Color",
      "colors",
      " Colour ",
      "Colorway",
      "Shade",
      "Finish",
    ]) {
      expect(isColorOptionName(key)).toBe(true);
    }
    for (const key of ["Size", "Glove color size", "Chain", ""]) {
      expect(isColorOptionName(key)).toBe(false);
    }
  });
});

describe("sanitizeColorSwatches", () => {
  it("keeps six-digit hex and lowercases it", () => {
    expect(
      sanitizeColorSwatches({ "Hunter Green": "#355E3B", Red: " #B02A2A " }),
    ).toEqual({ "Hunter Green": "#355e3b", Red: "#b02a2a" });
  });

  it("drops short hex, names, css functions and non-strings", () => {
    expect(
      sanitizeColorSwatches({
        a: "#fff",
        b: "red",
        c: "url(x)",
        d: 123,
        e: null,
        f: { x: 1 },
        ok: "#000000",
      }),
    ).toEqual({ ok: "#000000" });
  });

  it("trims keys and drops empty ones", () => {
    expect(
      sanitizeColorSwatches({
        "": "#000000",
        "  ": "#111111",
        " Gold ": "#222222",
      }),
    ).toEqual({
      Gold: "#222222",
    });
  });

  it("rejects non-objects", () => {
    for (const raw of [null, undefined, "x", 5, [], ["#000000"]]) {
      expect(sanitizeColorSwatches(raw)).toEqual({});
    }
  });

  it("caps the number of entries", () => {
    const raw = Object.fromEntries(
      Array.from({ length: MAX_COLOR_SWATCHES + 20 }, (_, i) => [
        `c${i}`,
        "#000000",
      ]),
    );
    expect(Object.keys(sanitizeColorSwatches(raw))).toHaveLength(
      MAX_COLOR_SWATCHES,
    );
  });
});

describe("readColorSwatches", () => {
  it("reads from additionalFields", () => {
    expect(readColorSwatches({ colorSwatches: { Gold: "#C7A44A" } })).toEqual({
      Gold: "#c7a44a",
    });
  });

  it("handles null, arrays, junk and a missing key", () => {
    expect(readColorSwatches(null)).toEqual({});
    expect(readColorSwatches(undefined)).toEqual({});
    expect(readColorSwatches([])).toEqual({});
    expect(readColorSwatches("x")).toEqual({});
    expect(readColorSwatches({ productTagline: "hi" })).toEqual({});
    expect(readColorSwatches({ colorSwatches: ["#000000"] })).toEqual({});
  });
});

describe("swatchOverrideFor", () => {
  const map = { "Hunter Green": "#355e3b", Red: "#b02a2a" };

  it("matches exact, then trimmed case-insensitive", () => {
    expect(swatchOverrideFor(map, "Hunter Green")).toBe("#355e3b");
    expect(swatchOverrideFor(map, "  hunter green ")).toBe("#355e3b");
    expect(swatchOverrideFor(map, "RED")).toBe("#b02a2a");
  });

  it("returns undefined when nothing matches or there is no map", () => {
    expect(swatchOverrideFor(map, "Green")).toBeUndefined();
    expect(swatchOverrideFor(map, "")).toBeUndefined();
    expect(swatchOverrideFor(undefined, "Red")).toBeUndefined();
  });

  it("prefers the exact key over a case-insensitive one", () => {
    expect(swatchOverrideFor({ red: "#111111", Red: "#222222" }, "Red")).toBe(
      "#222222",
    );
  });
});

describe("colorOptionValues", () => {
  it("lists distinct color values in first-seen order, ignoring other options", () => {
    const variants = [
      { options: { Size: "S", Color: "Black" } },
      { options: { Size: "M", Color: " Black " } },
      { options: { Size: "M", Colors: "Hunter Green" } },
      { options: { Color: "Red", Chain: "Gold" } },
      { options: null },
      { options: ["Color"] },
      { options: { Color: 5 } },
    ];
    expect(colorOptionValues(variants)).toEqual([
      "Black",
      "Hunter Green",
      "Red",
    ]);
  });

  it("returns nothing when there is no color option", () => {
    expect(colorOptionValues([{ options: { Size: "S" } }])).toEqual([]);
  });
});

describe("pruneColorSwatches", () => {
  it("keeps only colors a variant still uses, with the stored key", () => {
    const variants = [
      { options: { Color: "Hunter Green" } },
      { options: { Color: "red" } },
    ];
    expect(
      pruneColorSwatches(
        { "Hunter Green": "#355e3b", Red: "#b02a2a", Gold: "#c7a44a" },
        variants,
      ),
    ).toEqual({ "Hunter Green": "#355e3b", Red: "#b02a2a" });
  });

  it("empties the map when no variant has a color", () => {
    expect(
      pruneColorSwatches({ Red: "#b02a2a" }, [{ options: { Size: "S" } }]),
    ).toEqual({});
  });
});

describe("normalizeColorName", () => {
  it("lowercases and collapses separators", () => {
    expect(normalizeColorName("  Hot_Pink/Rose-Gold! 2 ")).toBe(
      "hot pink rose gold",
    );
  });
});

describe("matchColorName", () => {
  const match = (value: string) => matchColorName(BASE_PRODUCT_COLORS, value);

  it("matches compound shades as a whole", () => {
    expect(match("Hunter Green")).toBe("#355e3b");
    expect(match("Hunter Green")).not.toBe(match("Green"));
    expect(match("Hot Pink")).toBe("#e0218a");
    expect(match("Hot Pink")).not.toBe(match("Pink"));
    expect(match("Navy Blue")).toBe(BASE_PRODUCT_COLORS.navy);
    expect(match("Bluish Purple")).toBe("#5b4fa8");
  });

  it("falls back to the longest known run of words", () => {
    expect(match("Gold with Stones")).toBe(BASE_PRODUCT_COLORS.gold);
    expect(match("Deep Navy")).toBe(BASE_PRODUCT_COLORS.navy);
    expect(match("Deep Hunter Green Matte")).toBe("#355e3b");
  });

  it("lets the leftmost word win a tie", () => {
    expect(match("Gold Silver")).toBe(BASE_PRODUCT_COLORS.gold);
  });

  it("returns null for unknown or empty names", () => {
    expect(match("Mystery Shimmer")).toBeNull();
    expect(match("")).toBeNull();
    expect(match("   ")).toBeNull();
    expect(match("constructor")).toBeNull();
  });
});
