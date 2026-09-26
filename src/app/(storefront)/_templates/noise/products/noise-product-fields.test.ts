import { describe, expect, it } from "vitest";

import { getSectionsForTemplate } from "~/lib/template-sections";

import { noiseProductData, noiseProductFieldGroups } from ".";
import { noiseData, resolveFields } from "..";

const BLANK_BY_DEFAULT = [
  "noise.product.shipping-note",
  "noise.product.returns-note",
  "noise.product.question-text",
];

describe("noise product-page fields", () => {
  it("every field sits on the product page in the product.details group", () => {
    for (const field of noiseProductData) {
      expect(field.page).toBe("product");
      expect(field.group).toBe("product.details");
    }
  });

  it("is spread into the template's field registry", () => {
    const keys = new Set(noiseData.noise.map((f) => f.key));
    for (const field of noiseProductData) {
      expect(keys.has(field.key), field.key).toBe(true);
    }
  });

  it("shipping, returns and question notes are blank (hidden) until the owner writes them", () => {
    const f = resolveFields({}, BLANK_BY_DEFAULT);
    for (const key of BLANK_BY_DEFAULT) {
      expect(f[key], key).toBe("");
    }
  });

  it("keeps the page's original copy as defaults, so an unsaved store looks unchanged", () => {
    expect(
      resolveFields({}, [
        "noise.product.coming-soon-heading",
        "noise.product.related-heading",
        "noise.product.sold-out-text",
      ]),
    ).toEqual({
      "noise.product.coming-soon-heading": "Coming Soon",
      "noise.product.related-heading": "More from the collection.",
      "noise.product.sold-out-text": "Sold Out",
    });
  });

  it("registers a product.details section whose title matches its group", () => {
    const section = getSectionsForTemplate("noise").find(
      (s) => s.id === "product.details",
    );
    expect(section?.page).toBe("product");
    expect(section?.groupIds).toEqual(["product.details"]);
    expect(section?.title).toBe(noiseProductFieldGroups[0]?.title);
  });
});
