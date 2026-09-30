import { describe, expect, it } from "vitest";

import { numberVisibleSections } from "./section-numbers";

describe("numberVisibleSections", () => {
  it("numbers all four sections 01–04 when none are hidden", () => {
    expect(
      numberVisibleSections([
        ["first-section", true],
        ["second-section", true],
        ["products", true],
        ["cta", true],
      ]),
    ).toEqual({
      "first-section": "01.",
      "second-section": "02.",
      products: "03.",
      cta: "04.",
    });
  });

  it("closes the gap when a section is hidden", () => {
    expect(
      numberVisibleSections([
        ["first-section", true],
        ["second-section", false],
        ["products", true],
        ["cta", true],
      ]),
    ).toEqual({ "first-section": "01.", products: "02.", cta: "03." });
  });
});
