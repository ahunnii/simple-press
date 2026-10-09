import { describe, expect, it } from "vitest";

import { isGloveMadeToOrder, showGloveEasyGuide } from "./glove-pdp-rules";

describe("isGloveMadeToOrder", () => {
  it("is true for members of the made-to-order collection", () => {
    expect(isGloveMadeToOrder("gloves", ["gloves", "new"])).toBe(true);
  });

  it("is false for products outside it (charms, chains, gift cards)", () => {
    expect(isGloveMadeToOrder("gloves", ["charms"])).toBe(false);
    expect(isGloveMadeToOrder("gloves", [])).toBe(false);
  });

  it("treats every product as made to order when the slug is blank", () => {
    expect(isGloveMadeToOrder("", ["charms"])).toBe(true);
    expect(isGloveMadeToOrder("   ", [])).toBe(true);
  });
});

describe("showGloveEasyGuide", () => {
  const base = { madeToOrder: true, sectionVisible: true, text: "Confused?" };

  it("shows on a made-to-order glove with text", () => {
    expect(showGloveEasyGuide(base)).toBe(true);
  });

  it("hides on products outside the gloves collection", () => {
    expect(showGloveEasyGuide({ ...base, madeToOrder: false })).toBe(false);
  });

  it("hides when the section is hidden or the text is blank", () => {
    expect(showGloveEasyGuide({ ...base, sectionVisible: false })).toBe(false);
    expect(showGloveEasyGuide({ ...base, text: "  " })).toBe(false);
  });
});
