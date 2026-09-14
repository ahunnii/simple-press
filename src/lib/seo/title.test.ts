import { describe, expect, it } from "vitest";

import { renderSeoTitle, resolveSeoBrand, SEO_TITLE_MAX } from "./title";

describe("renderSeoTitle", () => {
  it("appends the brand with the separator", () => {
    expect(renderSeoTitle("Lavender Soap", "Bloom Apothecary")).toBe(
      "Lavender Soap | Bloom Apothecary",
    );
  });

  it("does not double the brand when the owner already typed it", () => {
    expect(
      renderSeoTitle("Lavender Soap | Bloom Apothecary", "Bloom Apothecary"),
    ).toBe("Lavender Soap | Bloom Apothecary");
    expect(renderSeoTitle("bloom apothecary soaps", "Bloom Apothecary")).toBe(
      "bloom apothecary soaps",
    );
  });

  it("trims both sides", () => {
    expect(renderSeoTitle("  Shop  ", "  Bloom ")).toBe("Shop | Bloom");
  });

  it("returns the brand alone for a blank title", () => {
    expect(renderSeoTitle("", "Bloom")).toBe("Bloom");
    expect(renderSeoTitle(null, "Bloom")).toBe("Bloom");
  });

  it("returns the title alone for a blank brand", () => {
    expect(renderSeoTitle("Shop", "")).toBe("Shop");
    expect(renderSeoTitle("Shop", undefined)).toBe("Shop");
  });

  it("exposes a 60-character target", () => {
    expect(SEO_TITLE_MAX).toBe(60);
  });
});

describe("resolveSeoBrand", () => {
  it("prefers a non-blank seoBrandName", () => {
    expect(
      resolveSeoBrand({
        name: "Detroit Pollinator Company",
        siteContent: { seoBrandName: "Detroit Pollinator Co." },
      }),
    ).toBe("Detroit Pollinator Co.");
  });

  it("falls back to the business name on null, missing, or cleared", () => {
    expect(resolveSeoBrand({ name: "Bloom" })).toBe("Bloom");
    expect(resolveSeoBrand({ name: "Bloom", siteContent: null })).toBe("Bloom");
    expect(
      resolveSeoBrand({ name: "Bloom", siteContent: { seoBrandName: "  " } }),
    ).toBe("Bloom");
  });
});
