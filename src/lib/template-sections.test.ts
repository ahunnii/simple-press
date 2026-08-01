import { describe, expect, it } from "vitest";

import type { TemplateSection } from "./template-sections";

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
import {
  getSectionById,
  getSectionsForTemplate,
  isBlogPostContextSection,
  TEMPLATE_SECTIONS,
} from "./template-sections";

function makeSection(overrides: Partial<TemplateSection>): TemplateSection {
  return {
    id: "homepage.hero",
    page: "homepage",
    title: "Hero",
    groupIds: ["homepage.hero"],
    order: 0,
    ...overrides,
  };
}

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

  it("curated sections take precedence over the derived title", () => {
    // Every template is now curated. modern's curated Hero section title must
    // win over the meta/humanized title the derived fallback would produce.
    const sections = getSectionsForTemplate("modern");
    const hero = sections.find((s) => s.id === "homepage.hero");
    expect(hero).toBeDefined();
    expect(hero?.page).toBe("homepage");
    expect(hero?.groupIds).toEqual(["homepage.hero"]);
    const curated = TEMPLATE_SECTIONS.modern?.find(
      (s) => s.id === "homepage.hero",
    );
    expect(hero?.title).toBe(curated?.title);
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
    for (const templateId of Object.keys(TEMPLATE_SECTIONS)) {
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

describe("pink homepage.upcoming vs homepage.events (real dates vs evergreen explainer)", () => {
  it("registers both as distinct, hideable sections", () => {
    const sections = getSectionsForTemplate("pink");
    const upcoming = sections.find((s) => s.id === "homepage.upcoming");
    const events = sections.find((s) => s.id === "homepage.events");

    expect(upcoming).toBeDefined();
    expect(events).toBeDefined();
    expect(upcoming?.id).not.toBe(events?.id);
    expect(upcoming?.hideable).toBe(true);
    expect(events?.hideable).toBe(true);
  });
});

describe("events-page sections (pink and default)", () => {
  it.each(["pink", "default"])(
    "'%s' registers events-page sections, each id exactly \"${page}.${group}\"",
    (templateId) => {
      const eventsPageSections = getSectionsForTemplate(templateId).filter(
        (s) => s.page === "events",
      );

      expect(eventsPageSections.length).toBeGreaterThan(0);
      for (const section of eventsPageSections) {
        expect(section.id.startsWith("events.")).toBe(true);
        // The triple-match invariant (section id === field-group id ===
        // data-sp-group value) means a curated section's own id is always
        // one of its groupIds.
        expect(section.groupIds).toContain(section.id);
      }
    },
  );
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

describe("isBlogPostContextSection", () => {
  it("returns true for explicit renderContext: 'blog-post', even with a non-blog.post id", () => {
    const section = makeSection({
      id: "homepage.hero",
      renderContext: "blog-post",
    });

    expect(isBlogPostContextSection(section)).toBe(true);
  });

  it("returns false for explicit renderContext: 'page', even when id is 'blog.post'", () => {
    const section = makeSection({
      id: "blog.post",
      page: "blog",
      renderContext: "page",
    });

    expect(isBlogPostContextSection(section)).toBe(false);
  });

  it("defaults to true via the id convention when renderContext is absent and id is 'blog.post'", () => {
    const section = makeSection({ id: "blog.post", page: "blog" });

    expect(isBlogPostContextSection(section)).toBe(true);
  });

  it("defaults to false when renderContext is absent and id is not 'blog.post'", () => {
    const section = makeSection({ id: "homepage.hero" });

    expect(isBlogPostContextSection(section)).toBe(false);
  });
});

describe("getSectionsForTemplate blog-post section coverage", () => {
  const curatedTemplateIds = [
    "happy-bamboo",
    "bamboo",
    "noise",
    "sledge",
    "pink",
  ];

  for (const templateId of curatedTemplateIds) {
    it(`has exactly one blog-post-context section for '${templateId}', with id 'blog.post'`, () => {
      const sections = getSectionsForTemplate(templateId);
      const blogPostSections = sections.filter(isBlogPostContextSection);

      expect(blogPostSections).toHaveLength(1);
      expect(blogPostSections[0]?.id).toBe("blog.post");
    });
  }
});
