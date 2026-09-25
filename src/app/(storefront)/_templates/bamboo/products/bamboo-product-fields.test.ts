import { Leaf } from "lucide-react";
import { describe, expect, it } from "vitest";

import {
  getListFieldValue,
  parseTemplateTrustBadgesListRows,
} from "~/lib/template-fields";

import { bambooProductFields } from ".";

const TRUST_BADGES_KEY = "bamboo.product.trust-badges";

describe("bamboo product-page fields", () => {
  it("trust-badges itemSchema keys match what parseTemplateTrustBadgesListRows reads", () => {
    const field = bambooProductFields.find((f) => f.key === TRUST_BADGES_KEY);
    expect(field?.type).toBe("list");
    if (field?.type !== "list") return;
    expect(field.itemSchema.map((sub) => sub.key)).toEqual(["icon", "label"]);
    // Empty list = no badges; there are no built-in rows to fall back to.
    expect(field.defaultsWhenEmpty).toBeUndefined();
  });

  it("parses rows saved in the editor's shape into icon + label", () => {
    const customFields = {
      [TRUST_BADGES_KEY]: [
        { _id: "a", icon: "Leaf", label: "Septic safe" },
        { _id: "b", label: "No icon picked" },
      ],
    };

    const rows = parseTemplateTrustBadgesListRows(
      getListFieldValue(customFields, TRUST_BADGES_KEY),
    );

    expect(rows).toEqual([
      { icon: Leaf, label: "Septic safe" },
      { icon: undefined, label: "No icon picked" },
    ]);
  });

  it("renders nothing for an unsaved or empty list", () => {
    expect(
      parseTemplateTrustBadgesListRows(getListFieldValue({}, TRUST_BADGES_KEY)),
    ).toEqual([]);
    expect(
      parseTemplateTrustBadgesListRows(
        getListFieldValue({ [TRUST_BADGES_KEY]: [] }, TRUST_BADGES_KEY),
      ) ?? [],
    ).toEqual([]);
  });

  it("every field sits on the product page in the product.details group", () => {
    for (const field of bambooProductFields) {
      expect(field.page).toBe("product");
      expect(field.group).toBe("product.details");
    }
  });
});
