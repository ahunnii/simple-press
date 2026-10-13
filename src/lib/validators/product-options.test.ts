import { describe, expect, it } from "vitest";

import {
  customizerSelectionSchema,
  optionGroupInputSchema,
  optionValueInputSchema,
} from "./product-options";

describe("customizerSelectionSchema", () => {
  it("defaults missing arrays and bounds sizes", () => {
    expect(customizerSelectionSchema.parse({})).toEqual({
      choices: [],
      texts: [],
    });
    expect(
      customizerSelectionSchema.safeParse({
        choices: Array.from({ length: 31 }, (_, i) => ({
          groupId: `g${i}`,
          valueIds: [],
        })),
      }).success,
    ).toBe(false);
    expect(
      customizerSelectionSchema.safeParse({
        choices: [
          {
            groupId: "g",
            valueIds: Array.from({ length: 61 }, (_, i) => `v${i}`),
          },
        ],
      }).success,
    ).toBe(false);
    expect(
      customizerSelectionSchema.safeParse({
        texts: [{ groupId: "g", text: "x".repeat(2001) }],
      }).success,
    ).toBe(false);
    expect(
      customizerSelectionSchema.safeParse({
        choices: [{ groupId: "x".repeat(65), valueIds: [] }],
      }).success,
    ).toBe(false);
  });
});

describe("optionGroupInputSchema", () => {
  const base = { name: "Charms", kind: "choice" as const };

  it("fills defaults", () => {
    expect(optionGroupInputSchema.parse(base)).toMatchObject({
      required: false,
      minSelections: 0,
      maxSelections: 1,
      includedCount: 0,
      display: "tiles",
      textPriceCents: 0,
    });
  });

  it("rejects min > max and included > max", () => {
    const r = optionGroupInputSchema.safeParse({
      ...base,
      minSelections: 3,
      maxSelections: 2,
      includedCount: 4,
    });
    expect(r.success ? [] : r.error.issues.map((i) => i.path[0])).toEqual([
      "minSelections",
      "includedCount",
    ]);
  });

  it("bounds maxLength to 1–500", () => {
    expect(
      optionGroupInputSchema.safeParse({
        ...base,
        kind: "text",
        maxLength: 500,
      }).success,
    ).toBe(true);
    expect(
      optionGroupInputSchema.safeParse({
        ...base,
        kind: "text",
        maxLength: 501,
      }).success,
    ).toBe(false);
    expect(
      optionGroupInputSchema.safeParse({ ...base, kind: "text", maxLength: 0 })
        .success,
    ).toBe(false);
  });
});

describe("optionValueInputSchema", () => {
  it("lower-cases a hex swatch and rejects other colors", () => {
    expect(
      optionValueInputSchema.parse({ label: "Gold", swatchColor: "#FFAA00" })
        .swatchColor,
    ).toBe("#ffaa00");
    expect(
      optionValueInputSchema.safeParse({ label: "Gold", swatchColor: "gold" })
        .success,
    ).toBe(false);
  });

  it("bounds label and prices", () => {
    expect(optionValueInputSchema.safeParse({ label: "" }).success).toBe(false);
    expect(
      optionValueInputSchema.safeParse({ label: "x".repeat(81) }).success,
    ).toBe(false);
    expect(
      optionValueInputSchema.safeParse({ label: "x", priceDelta: -1 }).success,
    ).toBe(false);
    expect(
      optionValueInputSchema.safeParse({ label: "x", priceDelta: 1.5 }).success,
    ).toBe(false);
    expect(
      optionValueInputSchema.safeParse({ label: "x", priceDelta: 1_000_001 })
        .success,
    ).toBe(false);
  });

  it("requires a product for a variant link and for a price override", () => {
    expect(
      optionValueInputSchema.safeParse({ label: "x", linkedVariantId: "v" })
        .success,
    ).toBe(false);
    expect(
      optionValueInputSchema.safeParse({ label: "x", priceOverride: 100 })
        .success,
    ).toBe(false);
    expect(
      optionValueInputSchema.safeParse({
        label: "x",
        linkedProductId: "p",
        linkedVariantId: "v",
        priceOverride: 100,
      }).success,
    ).toBe(true);
  });
});
