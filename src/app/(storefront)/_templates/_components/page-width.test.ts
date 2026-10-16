import { describe, expect, it } from "vitest";

import {
  getPageWidth,
  PROSE_WIDE_CENTERED_CLASS,
  PROSE_WIDE_CLASS,
} from "./page-width";

describe("getPageWidth", () => {
  it('maps "full-width" to wide', () => {
    expect(getPageWidth({ template: "full-width" })).toBe("wide");
  });

  it.each(["default", "sidebar", "", "Full-Width", "wide"])(
    "treats %j as standard",
    (template) => {
      expect(getPageWidth({ template })).toBe("standard");
    },
  );

  it("treats null and undefined as standard", () => {
    expect(getPageWidth({ template: null })).toBe("standard");
    expect(getPageWidth({ template: undefined })).toBe("standard");
    expect(getPageWidth({})).toBe("standard");
  });
});

describe("prose width classes", () => {
  it("centred variant extends the base class", () => {
    expect(PROSE_WIDE_CENTERED_CLASS.split(" ")).toEqual([
      PROSE_WIDE_CLASS,
      "sp-prose-wide--centered",
    ]);
  });
});
