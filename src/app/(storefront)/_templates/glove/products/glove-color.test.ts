import { describe, expect, it } from "vitest";

import { optionDisplayName, resolveSwatch, sortSizes } from "./glove-color";

describe("sortSizes", () => {
  it("orders clothing sizes smallest first", () => {
    expect(sortSizes(["L", "XL", "XXL", "S", "M"])).toEqual([
      "S",
      "M",
      "L",
      "XL",
      "XXL",
    ]);
  });

  it("places 1XL/2XL/3XL after L (alongside XL/XXL/XXXL)", () => {
    expect(sortSizes(["1XL", "2XL", "3XL", "L", "M", "S"])).toEqual([
      "S",
      "M",
      "L",
      "1XL",
      "2XL",
      "3XL",
    ]);
  });

  it("keeps unknown values in entered order after the known ones", () => {
    expect(sortSizes(["Custom B", "M", "Custom A", "S"])).toEqual([
      "S",
      "M",
      "Custom B",
      "Custom A",
    ]);
  });

  it("understands spelled-out sizes and does not mutate its input", () => {
    const input = ["Large", "Small", "Medium"];
    expect(sortSizes(input)).toEqual(["Small", "Medium", "Large"]);
    expect(input).toEqual(["Large", "Small", "Medium"]);
  });
});

describe("optionDisplayName", () => {
  it("capitalises the first letter", () => {
    expect(optionDisplayName("color")).toBe("Color");
    expect(optionDisplayName("  size ")).toBe("Size");
  });

  it("leaves already-capitalised and empty names alone", () => {
    expect(optionDisplayName("Glove Size")).toBe("Glove Size");
    expect(optionDisplayName("")).toBe("");
  });
});

describe("resolveSwatch", () => {
  const LUVGLUV_COLORS = [
    "Black",
    "Bluish Purple",
    "Gold",
    "Gold with Stones",
    "Green",
    "Hot Pink",
    "Hunter Green",
    "Navy",
    "Red",
    "Silver",
  ];

  it("resolves every luvgluv color to a known swatch", () => {
    for (const name of LUVGLUV_COLORS) {
      const swatch = resolveSwatch(name);
      expect(swatch.unknown, name).toBe(false);
      expect(swatch.color, name).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("keeps compound shades distinct from their last word", () => {
    expect(resolveSwatch("Hunter Green").color).not.toBe(
      resolveSwatch("Green").color,
    );
    expect(resolveSwatch("Hot Pink").color).not.toBe(
      resolveSwatch("Pink").color,
    );
    expect(resolveSwatch("Gold with Stones").color).toBe(
      resolveSwatch("Gold").color,
    );
  });

  it("passes CSS colors through and leaves unknown names unknown", () => {
    expect(resolveSwatch("#355e3b")).toEqual({
      color: "#355e3b",
      unknown: false,
    });
    expect(resolveSwatch("Mystery Shimmer")).toEqual({
      color: "var(--glove-paper)",
      unknown: true,
    });
    expect(resolveSwatch("  ").unknown).toBe(true);
  });
});
