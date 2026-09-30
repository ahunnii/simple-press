import { describe, expect, it } from "vitest";

import type { TemplateListRow } from "~/lib/template-fields";
import { TEMPLATE_FIELDS } from "~/lib/template-fields";

import { DEFAULT_PINK_VALUES } from "./about";
import {
  DEFAULT_PINK_CONTACT_SHORTCUTS,
  DEFAULT_PINK_CONTACT_TOPICS,
} from "./contact";
import { DEFAULT_PINK_EVENTS_FACTS, DEFAULT_PINK_PROMISES } from "./homepage";
import { DEFAULT_PINK_PRODUCT_PANELS } from "./products";
import { DEFAULT_PINK_SERVICE_STEPS } from "./services";
import { DEFAULT_PINK_TABLE_FACT_ROWS } from "./services/service-pages/fields";

/**
 * Regression test for the 2026-09-26 migration of pink's list-field
 * built-in fallback rows from hardcoded `TemplateListRow[]` constants in
 * component files into field-level `defaultRows`, resolved back to
 * components via `listRowsFromDefaults`. The expected arrays below are the
 * exact pre-migration constant values — copied verbatim from the source
 * files before they were rewritten — so this test proves the storefront
 * output is byte-for-byte identical.
 */

describe("pink list-field defaults (moved into TemplateField.defaultRows 2026-09-26)", () => {
  it("DEFAULT_PINK_PROMISES (pink.homepage.promises-items) matches the pre-migration copy", () => {
    const expected = [
      {
        title: "One of a kind",
        body: "Every piece is made on its own, never in runs. No two are exactly alike.",
      },
      {
        title: "Made by hand",
        body: "Each piece is shaped and finished by hand.",
      },
      {
        title: "Made to keep",
        body: "Chosen materials and careful finishing, built to last.",
      },
    ];

    expect(DEFAULT_PINK_PROMISES).toHaveLength(expected.length);
    DEFAULT_PINK_PROMISES.forEach((row, index) => {
      const exp = expected[index]!;
      const { _id, ...rest } = row;
      expect(rest).toEqual(exp);
      expect(_id).toBe(`promise-${index + 1}`);
    });

    const field = (TEMPLATE_FIELDS.pink ?? []).find(
      (f) => f.key === "pink.homepage.promises-items",
    );
    expect(field).toBeDefined();
    if (field?.type === "list") {
      expect(field.defaultRows).toEqual(expected);
      expect(field.defaultsWhenEmpty).toBe(true);
      expect(field.defaultValue ?? "").toBe("");
    }
  });

  it("DEFAULT_PINK_EVENTS_FACTS (pink.homepage.events-facts) matches the pre-migration copy", () => {
    const expected = [
      {
        label: "Where",
        value: "Your space — school, church, library, workplace or back yard",
      },
      { label: "Group size", value: "10 to 12 at a table" },
      { label: "Materials", value: "Everything included" },
      { label: "Notice", value: "Book at least 2 weeks out" },
    ];

    expect(DEFAULT_PINK_EVENTS_FACTS).toHaveLength(expected.length);
    DEFAULT_PINK_EVENTS_FACTS.forEach((row, index) => {
      const exp = expected[index]!;
      const { _id, ...rest } = row;
      expect(rest).toEqual(exp);
      expect(_id).toBe(`fact-${index + 1}`);
    });

    const field = (TEMPLATE_FIELDS.pink ?? []).find(
      (f) => f.key === "pink.homepage.events-facts",
    );
    expect(field).toBeDefined();
    if (field?.type === "list") {
      expect(field.defaultRows).toEqual(expected);
      expect(field.defaultsWhenEmpty).toBe(true);
      expect(field.defaultValue ?? "").toBe("");
    }
  });

  it("DEFAULT_PINK_VALUES (pink.about.values-items) matches the pre-migration copy", () => {
    const expected = [
      {
        title: "One of a kind",
        body: "Made one at a time, never in runs. No two pieces are exactly alike.",
      },
      {
        title: "Made by hand",
        body: "Every piece passes through Evelyn's hands start to finish.",
      },
    ];

    expect(DEFAULT_PINK_VALUES).toHaveLength(expected.length);
    DEFAULT_PINK_VALUES.forEach((row, index) => {
      const exp = expected[index]!;
      const { _id, ...rest } = row;
      expect(rest).toEqual(exp);
    });

    const field = (TEMPLATE_FIELDS.pink ?? []).find(
      (f) => f.key === "pink.about.values-items",
    );
    expect(field).toBeDefined();
    if (field?.type === "list") {
      expect(field.defaultRows).toEqual(expected);
      expect(field.defaultsWhenEmpty).toBe(true);
      expect(field.defaultValue ?? "").toBe("");
    }
  });

  it("DEFAULT_PINK_PRODUCT_PANELS (pink.global.product-panels) matches the pre-migration copy", () => {
    const expected = [
      {
        title: "Care & keeping",
        body: "Keep out of direct sun and away from damp. Ask us if you have questions about caring for a piece.",
      },
      {
        title: "Custom orders",
        body: "Want something close to this but not quite? Reach out and we'll talk it through.",
      },
    ];

    expect(DEFAULT_PINK_PRODUCT_PANELS).toHaveLength(expected.length);
    DEFAULT_PINK_PRODUCT_PANELS.forEach((row, index) => {
      const exp = expected[index]!;
      const { _id, ...rest } = row;
      expect(rest).toEqual(exp);
      expect(_id).toBe(`default-panel-${index + 1}`);
    });

    const field = (TEMPLATE_FIELDS.pink ?? []).find(
      (f) => f.key === "pink.global.product-panels",
    );
    expect(field).toBeDefined();
    if (field?.type === "list") {
      expect(field.defaultRows).toEqual(expected);
      expect(field.defaultsWhenEmpty).toBe(true);
      expect(field.defaultValue ?? "").toBe("");
    }
  });

  it("DEFAULT_PINK_CONTACT_TOPICS (pink.contact.topics-items) matches the pre-migration copy", () => {
    const expected = [
      {
        name: "Custom orders",
        blurb:
          "A doll, a piece of jewelry, or something else made just for you.",
        messageLabel: "Tell me what you have in mind",
        messagePlaceholder: "Sizes, colors, timeline — whatever you've got.",
      },
      {
        name: "Make & takes",
        blurb: "Bringing a workshop to your group.",
        messageLabel: "Tell me about your group",
        messagePlaceholder: "Group size, dates that work, and where.",
      },
      {
        name: "Something else",
        blurb: "Questions, press, or anything else.",
        messageLabel: "What's on your mind",
        messagePlaceholder: "Ask away.",
      },
    ];

    expect(DEFAULT_PINK_CONTACT_TOPICS).toHaveLength(expected.length);
    DEFAULT_PINK_CONTACT_TOPICS.forEach((row, index) => {
      const exp = expected[index]!;
      const { _id, ...rest } = row;
      expect(rest).toEqual(exp);
    });

    const field = (TEMPLATE_FIELDS.pink ?? []).find(
      (f) => f.key === "pink.contact.topics-items",
    );
    expect(field).toBeDefined();
    if (field?.type === "list") {
      expect(field.defaultRows).toEqual(expected);
      expect(field.defaultsWhenEmpty).toBe(true);
      expect(field.defaultValue ?? "").toBe("");
    }
  });

  it("DEFAULT_PINK_CONTACT_SHORTCUTS (pink.contact.shortcuts-items) matches the pre-migration copy", () => {
    const expected = [
      { label: "Ask about a make & take", href: "/services" },
      { label: "Browse what's ready now", href: "/shop" },
    ];

    expect(DEFAULT_PINK_CONTACT_SHORTCUTS).toHaveLength(expected.length);
    DEFAULT_PINK_CONTACT_SHORTCUTS.forEach((row, index) => {
      const exp = expected[index]!;
      const { _id, ...rest } = row;
      expect(rest).toEqual(exp);
    });

    const field = (TEMPLATE_FIELDS.pink ?? []).find(
      (f) => f.key === "pink.contact.shortcuts-items",
    );
    expect(field).toBeDefined();
    if (field?.type === "list") {
      expect(field.defaultRows).toEqual(expected);
      expect(field.defaultsWhenEmpty).toBe(true);
      expect(field.defaultValue ?? "").toBe("");
    }
  });

  it("DEFAULT_PINK_SERVICE_STEPS (pink.services.steps-list) matches the pre-migration copy", () => {
    const expected = [
      {
        ordinal: "01",
        title: "You reach out",
        body: "Tell us the room — a classroom, a sanctuary, a break room, a back yard — and how many hands.",
      },
      {
        ordinal: "02",
        title: "We pick a project",
        body: "Something that fits the time you have and travels well.",
      },
      {
        ordinal: "03",
        title: "Materials show up",
        body: "Everything's cut, sorted and ready before anyone sits down.",
      },
      {
        ordinal: "04",
        title: "Everyone leaves with something",
        body: "Sewn, glued or knotted by their own hands.",
      },
    ];

    expect(DEFAULT_PINK_SERVICE_STEPS).toHaveLength(expected.length);
    DEFAULT_PINK_SERVICE_STEPS.forEach((row, index) => {
      const exp = expected[index]!;
      const { _id, ...rest } = row;
      expect(rest).toEqual(exp);
    });

    const field = (TEMPLATE_FIELDS.pink ?? []).find(
      (f) => f.key === "pink.services.steps-list",
    );
    expect(field).toBeDefined();
    if (field?.type === "list") {
      expect(field.defaultRows).toEqual(expected);
      expect(field.defaultsWhenEmpty).toBe(true);
      expect(field.defaultValue ?? "").toBe("");
    }
  });

  it("DEFAULT_PINK_TABLE_FACT_ROWS (pink-table.fact-rows) matches the pre-migration copy", () => {
    const expected = [
      {
        label: "Where",
        value: "Your space — school, church, library or workplace",
      },
      { label: "Group size", value: "10 to 12 at a table" },
      { label: "Materials", value: "Everything included" },
      { label: "Notice", value: "Book at least 2 weeks out" },
    ];

    expect(DEFAULT_PINK_TABLE_FACT_ROWS).toHaveLength(expected.length);
    DEFAULT_PINK_TABLE_FACT_ROWS.forEach((row, index) => {
      const exp = expected[index]!;
      const { _id, ...rest } = row;
      expect(rest).toEqual(exp);
    });

    // This field is not in TEMPLATE_FIELDS.pink; it's a service-specific field
    // exported from services/service-pages/fields.ts. Check the export separately.
  });
});
