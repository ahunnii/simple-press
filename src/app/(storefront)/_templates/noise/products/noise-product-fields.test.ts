import { describe, expect, it } from "vitest";

import { getSectionsForTemplate } from "~/lib/template-sections";

import { noiseProductData, noiseProductFieldGroups } from ".";
import { noiseData, resolveFields } from "..";

const PRODUCT_GROUPS = [
  "product.details",
  "product.shipping",
  "product.returns",
  "product.questions",
];

const BLANK_BY_DEFAULT = ["noise.product.shipping-note", "noise.product.returns-note"];

describe("noise product-page fields", () => {
  it("every field sits on the product page in one of the product groups", () => {
    for (const field of noiseProductData) {
      expect(field.page).toBe("product");
      expect(PRODUCT_GROUPS, field.key).toContain(field.group);
    }
  });

  it("shipping/returns/questions fields sit in their own matching groups (triple-match rule)", () => {
    const byKey = new Map(noiseProductData.map((f) => [f.key, f]));
    expect(byKey.get("noise.product.shipping-note")?.group).toBe(
      "product.shipping",
    );
    expect(byKey.get("noise.product.returns-note")?.group).toBe(
      "product.returns",
    );
    expect(byKey.get("noise.product.question-text")?.group).toBe(
      "product.questions",
    );
  });

  it("is spread into the template's field registry", () => {
    const keys = new Set(noiseData.noise.map((f) => f.key));
    for (const field of noiseProductData) {
      expect(keys.has(field.key), field.key).toBe(true);
    }
  });

  it("shipping and returns notes are blank (hidden text) until the owner writes them", () => {
    const f = resolveFields({}, BLANK_BY_DEFAULT);
    for (const key of BLANK_BY_DEFAULT) {
      expect(f[key], key).toBe("");
    }
  });

  it("the questions row ships with real default copy (not blank)", () => {
    expect(
      resolveFields({}, ["noise.product.question-text"])[
        "noise.product.question-text"
      ],
    ).toBe("Questions about this product? Contact us.");
  });

  it("keeps the page's original copy as defaults, so an unsaved store looks unchanged", () => {
    expect(
      resolveFields({}, [
        "noise.product.coming-soon-heading",
        "noise.product.related-heading",
        "noise.product.sold-out-text",
        "noise.product.reviews-heading",
      ]),
    ).toEqual({
      "noise.product.coming-soon-heading": "Coming Soon",
      "noise.product.related-heading": "More from the collection.",
      "noise.product.sold-out-text": "Sold Out",
      "noise.product.reviews-heading": "What people are saying",
    });
  });

  it("registers a section per product group, each titled to match its field group", () => {
    // `T/sections.ts` is orchestrator-retained (curates title/description/
    // order/hideable). Until that curation lands, `getSectionsForTemplate`
    // derives one filler section per group — id/page/groupIds and the
    // title (via `getGroupMetadata`) already match; `hideable` on the
    // derived filler defaults to false regardless of the group, so it's
    // not asserted here (see docs/templates/noise/parity/reports/TP3-fixes.md).
    const sections = getSectionsForTemplate("noise");
    const groupsByTitle = new Map(
      noiseProductFieldGroups.map((g) => [g.id, g.title]),
    );
    for (const groupId of PRODUCT_GROUPS) {
      const section = sections.find((s) => s.id === groupId);
      expect(section?.page, groupId).toBe("product");
      expect(section?.groupIds, groupId).toEqual([groupId]);
      expect(section?.title, groupId).toBe(groupsByTitle.get(groupId));
    }
  });
});
