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
];

/** Each support-row field lives in its own hideable group, split from the
 * rest of the buy panel (B6.2: field group id == section id). */
const ROW_GROUP_BY_KEY: Record<string, string> = {
  "dream.product.shipping-note": "product.shipping",
  "dream.product.returns-note": "product.returns",
  "dream.product.question-text": "product.questions",
};

describe("dream product-page fields", () => {
  it("every field sits on the product page", () => {
    expect(dreamProductData.length).toBeGreaterThan(0);
    for (const field of dreamProductData) {
      expect(field.key.startsWith("dream.product.")).toBe(true);
      expect(field.page).toBe("product");
    }
  });

  it("splits shipping/returns/questions out of product.details into their own groups", () => {
    for (const [key, group] of Object.entries(ROW_GROUP_BY_KEY)) {
      const field = dreamProductData.find((f) => f.key === key);
      expect(field?.group, key).toBe(group);
    }
    const detailsKeys = dreamProductData
      .filter((f) => f.group === "product.details")
      .map((f) => f.key);
    for (const key of Object.keys(ROW_GROUP_BY_KEY)) {
      expect(detailsKeys).not.toContain(key);
    }
  });

  it("ships the optional notes blank and says blank hides them", () => {
    for (const key of OPTIONAL_BLANK_KEYS) {
      const field = dreamProductData.find((f) => f.key === key);
      expect(field?.defaultValue).toBe("");
      expect(field?.description).toMatch(/Leave blank to hide/);
    }
  });

  it("ships the questions line with default copy (B6.2) that blank hides", () => {
    const field = dreamProductData.find(
      (f) => f.key === "dream.product.question-text",
    );
    expect(field?.defaultValue).toBe("Questions about this piece? Ask us.");
    expect(field?.description).toMatch(/Leave blank to hide/);
  });

  it("wires product.details as the non-hideable buy-panel section matching its field group", () => {
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

  it("wires shipping/returns/questions as independently hideable sections matching their field groups", () => {
    for (const groupId of Object.values(ROW_GROUP_BY_KEY)) {
      const group = dreamProductFieldGroups.find((g) => g.id === groupId);
      const section = dreamProductSections.find((s) => s.id === groupId);
      expect(group, groupId).toBeDefined();
      expect(section, groupId).toBeDefined();
      expect(section?.title).toBe(group?.title);
      expect(section?.page).toBe("product");
      expect(section?.groupIds).toEqual([groupId]);
      expect(section?.hideable).toBe(true);
    }
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
