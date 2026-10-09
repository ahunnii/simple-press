import { describe, expect, it } from "vitest";

import {
  gloveStepPlan,
  orderGloveGroups,
  visibleSpecGroups,
} from "./glove-steps";

describe("orderGloveGroups", () => {
  it("follows the Easy Guide order and trails unknown dimensions", () => {
    const keys = ["Amount", "Size", "Grommet", "Colors"].map((key) => ({
      key,
    }));
    expect(orderGloveGroups(keys, true).map((g) => g.key)).toEqual([
      "Colors",
      "Size",
      "Grommet",
      "Amount",
    ]);
  });

  it("keeps the owner's order for non-numbered products", () => {
    const keys = ["Size", "Colors"].map((key) => ({ key }));
    expect(orderGloveGroups(keys, false)).toBe(keys);
  });
});

describe("gloveStepPlan", () => {
  it("numbers the rows present from 1, with no gaps", () => {
    // No Color option: Size and Grommet are 1 and 2, not the guide's 3 and 4.
    const plan = gloveStepPlan(["Size", "Grommet"], true);
    expect(plan.options).toEqual({ Size: 1, Grommet: 2 });
    expect(plan.next).toBe(3);
  });

  it("leaves dimensions the guide has no step for unnumbered", () => {
    const plan = gloveStepPlan(["Colors", "Amount", "Size"], true);
    expect(plan.options).toEqual({ Colors: 1, Size: 2 });
    expect(plan.next).toBe(3);
  });

  it("hands the add-on picker the next number (or 1 with no option rows)", () => {
    expect(gloveStepPlan(["Colors", "Size", "Grommet"], true).next).toBe(4);
    expect(gloveStepPlan([], true).next).toBe(1);
  });

  it("numbers nothing for a non-numbered product", () => {
    expect(gloveStepPlan(["Size"], false)).toEqual({ options: {}, next: 1 });
  });
});

describe("visibleSpecGroups", () => {
  const groups = [
    { key: "Size", values: ["S", "M"] },
    { key: "Lining", values: ["Silk"] },
    { key: "Finish", values: ["Matte"] },
  ];

  it("hides rows that repeat a selector, case-insensitively", () => {
    expect(visibleSpecGroups(groups, ["size", " LINING "])).toEqual([
      { key: "Finish", values: ["Matte"] },
    ]);
  });

  it("keeps every row when no selector is shown", () => {
    expect(visibleSpecGroups(groups, [])).toEqual(groups);
  });
});
