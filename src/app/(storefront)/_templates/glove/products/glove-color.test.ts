import { describe, expect, it } from "vitest";

import { optionDisplayName, sortSizes } from "./glove-color";

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
