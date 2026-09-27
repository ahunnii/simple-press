import { describe, expect, it } from "vitest";

import {
  dreamProductData,
  dreamProductFieldGroups,
  dreamProductSections,
  resolveDreamProductFields,
} from ".";

const OPTIONAL_BLANK_KEYS = [
  "dream.product.shipping-note",
  "dream.product.returns-note",
  "dream.product.question-text",
];

describe("dream product-page fields", () => {
  it("every field sits on the product page in the product.details group", () => {
    expect(dreamProductData.length).toBeGreaterThan(0);
    for (const field of dreamProductData) {
      expect(field.key.startsWith("dream.product.")).toBe(true);
      expect(field.page).toBe("product");
      expect(field.group).toBe("product.details");
    }
  });

  it("ships the optional notes blank and says blank hides them", () => {
    for (const key of OPTIONAL_BLANK_KEYS) {
      const field = dreamProductData.find((f) => f.key === key);
      expect(field?.defaultValue).toBe("");
      expect(field?.description).toMatch(/Leave blank to hide/);
    }
  });

  it("section title equals its field group's title and wires the group", () => {
    const group = dreamProductFieldGroups.find(
      (g) => g.id === "product.details",
    );
    const section = dreamProductSections.find(
      (s) => s.id === "product.details",
    );
    expect(group).toBeDefined();
    expect(section).toBeDefined();
    expect(section?.title).toBe(group?.title);
    expect(section?.page).toBe("product");
    expect(section?.groupIds).toEqual(["product.details"]);
    expect(section?.hideable).toBe(false);
    expect(section?.links?.length).toBe(1);
  });

  it("resolves defaults, keeps a saved blank blank, and trims saved text", () => {
    const f = resolveDreamProductFields(
      {
        "dream.product.coming-soon-body": "",
        "dream.product.shipping-note": "  Delivered and set up.  ",
      },
      [
        "dream.product.related-heading",
        "dream.product.coming-soon-body",
        "dream.product.shipping-note",
      ],
    );
    expect(f["dream.product.related-heading"]).toBe("You might also like");
    expect(f["dream.product.coming-soon-body"]).toBe("");
    expect(f["dream.product.shipping-note"]).toBe("Delivered and set up.");
  });
});
