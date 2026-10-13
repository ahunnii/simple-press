import { describe, expect, it } from "vitest";

import { gloveBuildTotalParts, pickLineLabel } from "./glove-build-total";

const copy = { chainLabel: "Chain", charmsLabel: "Charms", charmLine: "Charm" };

describe("pickLineLabel", () => {
  it("uses the template's wording for the charms and chain groups", () => {
    expect(pickLineLabel("Charms", true, copy)).toBe("Charm");
    expect(pickLineLabel("charms", true, copy)).toBe("Charm");
    expect(pickLineLabel("Chain", false, copy)).toBe("Chain");
  });

  it("singularises other multi-pick groups and keeps single-pick names", () => {
    expect(pickLineLabel("Pins", true, copy)).toBe("Pin");
    expect(pickLineLabel("Berries", true, copy)).toBe("Berry");
    expect(pickLineLabel("Glass", true, copy)).toBe("Glass");
    expect(pickLineLabel("Lining", false, copy)).toBe("Lining");
  });
});

describe("gloveBuildTotalParts", () => {
  const lineLabel = (_id: string, name: string) => name;
  const value = (
    label: string,
    price: number,
    included = false,
    groupName = "Charm",
  ) => ({
    groupId: groupName,
    groupName,
    valueId: label,
    label,
    imageUrl: null,
    swatchColor: null,
    price,
    included,
  });

  it("is just the glove with nothing chosen", () => {
    expect(
      gloveBuildTotalParts({
        gloveLine: "Glove",
        gloveAmount: 16000,
        quantity: 1,
        values: [],
        texts: [],
        lineLabel,
      }),
    ).toEqual(["Glove $160.00"]);
  });

  it("lists paid, included and free picks plus a priced engraving", () => {
    expect(
      gloveBuildTotalParts({
        gloveLine: "Glove",
        gloveAmount: 32000,
        quantity: 2,
        values: [
          value("Heart", 0, true),
          value("Star", 3500),
          value("Plain", 0),
        ],
        texts: [
          { groupId: "e", groupName: "Engraving", text: "Mom", price: 500 },
        ],
        lineLabel,
      }),
    ).toEqual([
      "Glove $320.00",
      "Charm included",
      "Charm $70.00",
      "Plain",
      "Engraving $10.00",
    ]);
  });
});
