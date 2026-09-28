import { describe, expect, it } from "vitest";

import { getSectionsForTemplate } from "~/lib/template-sections";

import { umscProductData, umscProductFieldGroups, umscProductSections } from ".";
import { resolveFields, umscData } from "..";

const PRODUCT_GROUPS = [
  "product.details",
  "product.shipping",
  "product.returns",
  "product.questions",
];

/**
 * 2026-09-28 parity fix (PF14/B6.2): the shipping/returns/questions fields
 * each moved to their OWN group so the owner can hide one accordion row
 * without hiding the others. Keys are unchanged — `umsc.global.product-*`
 * is kept exactly per the prod-client decision (uniquemonique runs umsc in
 * PROD; docs/templates/umsc/parity-plan-2026-09-28.md, decision under
 * B6.2).
 */
const ROW_GROUP_BY_KEY: Record<string, string> = {
  "umsc.global.product-shipping-description": "product.shipping",
  "umsc.product.returns-note": "product.returns",
  "umsc.global.product-question-description": "product.questions",
  "umsc.product.question-link-label": "product.questions",
};

describe("umsc product-page fields", () => {
  it("every field sits on the product page in one of the product groups", () => {
    for (const field of umscProductData) {
      expect(field.page).toBe("product");
      expect(PRODUCT_GROUPS, field.key).toContain(field.group);
    }
  });

  it("keeps the legacy `umsc.global.product-*` and `umsc.product.*` keys unchanged", () => {
    const keys = umscProductData.map((f) => f.key).sort();
    expect(keys).toEqual(
      [
        "umsc.global.product-shipping-description",
        "umsc.product.returns-note",
        "umsc.global.product-question-description",
        "umsc.product.question-link-label",
        "umsc.product.coming-soon-heading",
        "umsc.product.coming-soon-body",
        "umsc.global.product-trust-badges",
        "umsc.product.reviews-heading",
        "umsc.product.related-heading",
        "umsc.product.related-link-label",
      ].sort(),
    );
  });

  it("splits shipping/returns/questions out of product.details into their own matching groups (triple-match rule)", () => {
    const byKey = new Map(umscProductData.map((f) => [f.key, f]));
    for (const [key, group] of Object.entries(ROW_GROUP_BY_KEY)) {
      expect(byKey.get(key)?.group, key).toBe(group);
    }
    const detailsKeys = umscProductData
      .filter((f) => f.group === "product.details")
      .map((f) => f.key);
    for (const key of Object.keys(ROW_GROUP_BY_KEY)) {
      expect(detailsKeys).not.toContain(key);
    }
  });

  it("is spread into the template's field registry", () => {
    const keys = new Set((umscData.umsc ?? []).map((f) => f.key));
    for (const field of umscProductData) {
      expect(keys.has(field.key), field.key).toBe(true);
    }
  });

  it("keeps the pre-split, real (non-blank) copy as defaults, so an unsaved store looks unchanged", () => {
    expect(
      resolveFields({}, [
        "umsc.global.product-shipping-description",
        "umsc.product.returns-note",
        "umsc.global.product-question-description",
        "umsc.product.question-link-label",
        "umsc.product.coming-soon-heading",
        "umsc.product.coming-soon-body",
        "umsc.product.reviews-heading",
        "umsc.product.related-heading",
        "umsc.product.related-link-label",
      ]),
    ).toEqual({
      "umsc.global.product-shipping-description":
        "We ship within 1–2 business days. Local pickup is available — we'll email you when it's ready.",
      "umsc.product.returns-note":
        "Returns are accepted within 30 days of delivery, unused and in original packaging.",
      "umsc.global.product-question-description":
        "Have a question about scent, size, or ingredients? Monique is happy to help.",
      "umsc.product.question-link-label": "Reach out here.",
      "umsc.product.coming-soon-heading": "Coming Soon",
      "umsc.product.coming-soon-body":
        "This product isn't available yet — check back soon.",
      "umsc.product.reviews-heading": "Customer reviews",
      "umsc.product.related-heading": "You may also like",
      "umsc.product.related-link-label": "All products",
    });
  });

  it("wires product.details as the non-hideable buy-panel section matching its field group", () => {
    const group = umscProductFieldGroups.find((g) => g.id === "product.details");
    const section = umscProductSections.find((s) => s.id === "product.details");
    expect(group).toBeDefined();
    expect(section).toBeDefined();
    expect(section?.title).toBe(group?.title);
    expect(section?.page).toBe("product");
    expect(section?.groupIds).toEqual(["product.details"]);
    expect(section?.hideable).toBe(false);
  });

  it("wires shipping/returns/questions as independently hideable sections matching their field groups", () => {
    for (const groupId of ["product.shipping", "product.returns", "product.questions"]) {
      const group = umscProductFieldGroups.find((g) => g.id === groupId);
      const section = umscProductSections.find((s) => s.id === groupId);
      expect(group, groupId).toBeDefined();
      expect(section, groupId).toBeDefined();
      expect(section?.title).toBe(group?.title);
      expect(section?.page).toBe("product");
      expect(section?.groupIds).toEqual([groupId]);
      expect(section?.hideable).toBe(true);
    }
  });

  it("registers all four product sections in the template's live section registry", () => {
    // `T/sections.ts` imports `umscProductSections` from this module and
    // spreads it directly (no orchestrator curation step needed for umsc —
    // unlike noise, umsc's sections.ts already delegates to products/).
    const sections = getSectionsForTemplate("umsc");
    const groupsByTitle = new Map(
      umscProductFieldGroups.map((g) => [g.id, g.title]),
    );
    for (const groupId of PRODUCT_GROUPS) {
      const section = sections.find((s) => s.id === groupId);
      expect(section?.page, groupId).toBe("product");
      expect(section?.groupIds, groupId).toEqual([groupId]);
      expect(section?.title, groupId).toBe(groupsByTitle.get(groupId));
    }
  });
});
