import { describe, expect, it } from "vitest";

import {
  colorFromName,
  isColorOptionName,
  resolveChipColor,
} from "./olive-color";

describe("resolveChipColor", () => {
  const COLORS = [
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
    for (const name of COLORS) {
      const chip = resolveChipColor(name);
      expect(chip.unknown, name).toBe(false);
      expect(chip.color, name).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("keeps compound shades distinct from their last word", () => {
    expect(resolveChipColor("Hunter Green").color).not.toBe(
      resolveChipColor("Green").color,
    );
    expect(resolveChipColor("Hot Pink").color).not.toBe(
      resolveChipColor("Pink").color,
    );
  });

  it("keeps olive's own extras and earlier name behavior", () => {
    expect(colorFromName("Terracotta")).toBe("#c4623f");
    expect(colorFromName("Slate")).toBe("#7e99a3");
    expect(colorFromName("Rust")).toBe("#a6522c");
    expect(colorFromName("Sage Green")).toBe("#9caf9c");
    expect(colorFromName("Deep Navy")).toBe("#1f2a44");
    expect(colorFromName("Navy Blue")).toBe("#1f2a44");
  });

  it("passes CSS colors through and leaves unknown names unknown", () => {
    expect(resolveChipColor("#355e3b")).toEqual({
      color: "#355e3b",
      unknown: false,
    });
    expect(resolveChipColor("Mystery Shimmer")).toEqual({
      color: "var(--olive-paper)",
      unknown: true,
    });
  });
});

describe("isColorOptionName", () => {
  it("accepts singular and plural colour spellings", () => {
    for (const key of [
      "Color",
      "Colors",
      "colour",
      "Colours",
      "Shade",
      "Shades",
      "Colorway",
      "Finish",
    ]) {
      expect(isColorOptionName(key)).toBe(true);
    }
  });

  it("rejects other dimensions", () => {
    for (const key of ["Size", "Material", "Colorful"]) {
      expect(isColorOptionName(key)).toBe(false);
    }
  });
});
