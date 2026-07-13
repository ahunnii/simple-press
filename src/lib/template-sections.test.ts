import { describe, expect, it } from "vitest";

import {
  getSpMeta,
  isSectionVisible,
  setSectionHidden,
  SP_META_KEY,
} from "./sp-meta";
import {
  groupFieldsByPage,
  TEMPLATE_FIELD_GROUPS,
  TEMPLATE_FIELDS,
} from "./template-fields";
import { getSectionById, getSectionsForTemplate } from "./template-sections";

describe("getSectionsForTemplate (derived fallback)", () => {
  it("derives section ids that exactly match TemplateFieldGroup ids (the data-sp-group contract)", () => {
    // Every derived section id must be a real field-group id (or a synthetic
    // "${page}.__other"), because data-sp-group hotspot values are group ids.
    for (const templateId of Object.keys(TEMPLATE_FIELDS)) {
      const groupIds = new Set(
        (TEMPLATE_FIELD_GROUPS[templateId] ?? []).map((g) => g.id),
      );
      for (const section of getSectionsForTemplate(templateId)) {
        if (section.id.endsWith(".__other")) continue;
        expect(
          groupIds.has(section.id) ||
            // Groups referenced by fields but missing group metadata are still
            // valid ids as long as they are "${page}." qualified.
            section.id.startsWith(`${section.page}.`),
          `section id "${section.id}" (template "${templateId}") is not page-qualified`,
        ).toBe(true);
        // Regression: ids must never be double-prefixed ("homepage.homepage.hero").
        expect(section.id.startsWith(`${section.page}.${section.page}.`)).toBe(
          false,
        );
      }
    }
  });

  it("derives a non-curated template's homepage hero with its real group id and title", () => {
    // "modern" has no curated registry, so it exercises the derived path.
    const sections = getSectionsForTemplate("modern");
    const hero = sections.find((s) => s.id === "homepage.hero");
    expect(hero).toBeDefined();
    expect(hero?.page).toBe("homepage");
    expect(hero?.groupIds).toEqual(["homepage.hero"]);
    // Metadata title comes from TEMPLATE_FIELD_GROUPS, not a humanized key.
    const meta = TEMPLATE_FIELD_GROUPS.modern?.find(
      (g) => g.id === "homepage.hero",
    );
    expect(hero?.title).toBe(meta?.title);
  });

  it("orders sections per page in declaration order starting at 0", () => {
    const sections = getSectionsForTemplate("default");
    const pages = new Set(sections.map((s) => s.page));
    for (const page of pages) {
      const orders = sections
        .filter((s) => s.page === page)
        .map((s) => s.order);
      expect(orders).toEqual(orders.map((_, i) => i));
    }
  });

  it("curated registries cover every field group (no fields become unreachable)", () => {
    // Every group that has fields must appear in some section's groupIds,
    // otherwise those fields were editable under derived sections but are
    // orphaned by the curated registry.
    for (const templateId of ["default", "happy-bamboo", "vii", "coop"]) {
      const coveredGroupIds = new Set(
        getSectionsForTemplate(templateId).flatMap((s) => s.groupIds),
      );
      const missing: string[] = [];
      for (const [page, fields] of Object.entries(
        groupFieldsByPage(templateId),
      )) {
        const groups = new Set(fields.map((f) => f.group ?? `${page}.__other`));
        for (const g of groups) {
          if (!coveredGroupIds.has(g)) missing.push(g);
        }
      }
      expect(missing, `template "${templateId}" orphans groups`).toEqual([]);
    }
  });

  it("getSectionById finds derived sections", () => {
    expect(getSectionById("default", "homepage.hero")?.id).toBe(
      "homepage.hero",
    );
    expect(getSectionById("default", "homepage.nope")).toBeUndefined();
  });
});

describe("sp-meta", () => {
  it("getSpMeta never throws on garbage input", () => {
    for (const garbage of [
      null,
      undefined,
      42,
      "x",
      [],
      { sections: "x" },
      { sections: { a: { hidden: "yes" } } },
      { theme: 7 },
    ]) {
      expect(() => getSpMeta(garbage)).not.toThrow();
    }
  });

  it("setSectionHidden is immutable and preserves unrelated keys and _sp subtrees", () => {
    const original: Record<string, unknown> = {
      "default.homepage.hero-title": "Hi",
      [SP_META_KEY]: { theme: { palette: "warm" } },
    };
    const next = setSectionHidden(original, "homepage.hero", true);
    expect(next).not.toBe(original);
    expect(original[SP_META_KEY]).toEqual({ theme: { palette: "warm" } });
    expect(next["default.homepage.hero-title"]).toBe("Hi");
    expect(getSpMeta(next).theme?.palette).toBe("warm");
    expect(getSpMeta(next).sections?.["homepage.hero"]?.hidden).toBe(true);
  });

  it("isSectionVisible: stored value wins, unknown section defaults visible", () => {
    const hidden = setSectionHidden({}, "homepage.hero", true);
    expect(isSectionVisible(hidden, "default", "homepage.hero")).toBe(false);
    expect(isSectionVisible({}, "default", "homepage.hero")).toBe(true);
    expect(isSectionVisible({}, "default", "not.a.section")).toBe(true);
    const reshown = setSectionHidden(hidden, "homepage.hero", false);
    expect(isSectionVisible(reshown, "default", "homepage.hero")).toBe(true);
  });
});
