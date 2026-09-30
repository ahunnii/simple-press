import { describe, expect, it } from "vitest";

import type { TemplateField } from "./template-fields";

import { TEMPLATE_LUCIDE_ICON_NAMES } from "./lucide-template-icons";
import {
  getGroupMetadata,
  TEMPLATE_FIELD_GROUPS,
  TEMPLATE_FIELDS,
} from "./template-fields";
import { getSectionsForTemplate } from "./template-sections";

/**
 * Templates held to the full field-authoring/copy bar documented in
 * `.claude/skills/sp-new-template/references/field-conventions.md`.
 *
 * Add a template id here once its field copy (labels, descriptions,
 * placeholders) has been swept to match the convention doc — the strict
 * checks below will then start enforcing it in CI. Every other template
 * still gets the cheap universal checks at the bottom of this file.
 */
const STRICT_TEMPLATES: readonly string[] = [
  "bamboo",
  "vii",
  "noise",
  "happy-bamboo",
  "pollen",
  "olive",
  "pink",
  "dream",
  "sledge",
  "umsc",
  "dark-trend",
  "elegant",
  "modern",
  "default",
];

/**
 * Strict templates additionally swept for the `defaultRows` list-default
 * convention (see `field-conventions.md`'s "List defaults" section):
 * `defaultsWhenEmpty: true` lists declare their built-in fallback via
 * `defaultRows` in the field itself, never via a list field's `defaultValue`
 * (the old `JSON.stringify([...])` pattern). Bamboo was swept 2026-09-26;
 * happy-bamboo followed the same day; vii followed 2026-09-26; pollen
 * followed 2026-09-26; olive followed the same day; pink followed the same
 * day; sledge followed the same day. The other `STRICT_TEMPLATES` entries still have pre-`defaultRows`
 * list fields (e.g. `dream.services.packages`) and are not yet held to this
 * pair of checks — add a template's id here once its list fields have been
 * swept.
 */
const LIST_DEFAULTS_SWEPT_TEMPLATES: readonly string[] = [
  "bamboo",
  "happy-bamboo",
  "vii",
  "pollen",
  "olive",
  "pink",
  "sledge",
  "dream",
  "umsc",
  "default",
];

/**
 * Merchant-facing jargon that should never appear in a field *label* — the
 * label is the first thing an owner reads in the field panel, so it has to
 * read as plain merchant English, not internal template-building shorthand.
 */
const BANNED_LABEL_JARGON_WORDS: readonly string[] = [
  "eyebrow",
  "lede",
  "kicker",
  "CTA",
  "hero wave",
  "value band",
  "full-bleed",
];

/**
 * Palette-specific color words that lock a field's copy to one theme's look.
 * Checked across both labels and descriptions.
 */
const PALETTE_COLOR_WORDS: readonly string[] = [
  "gold",
  "forest",
  "cream",
  "deep green",
  "copper",
  "navy",
  "steel",
  "bone",
  "rose",
  "pink",
];

/** Escapes regex-special characters in a literal word/phrase. */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Returns the first banned word/phrase found in `text` via whole-word,
 * case-insensitive matching (so "gold" doesn't match "marigold", but "hero
 * wave" and "full-bleed" still match as phrases).
 */
function findBannedWord(
  text: string,
  words: readonly string[],
): string | undefined {
  return words.find((word) =>
    new RegExp(`\\b${escapeRegExp(word)}\\b`, "i").test(text),
  );
}

function describeField(templateId: string, field: TemplateField): string {
  return `${templateId} field "${field.key}" (label "${field.label}")`;
}

/** Every `TemplateField` across every template, paired with its template id. */
function allFields(): Array<{ templateId: string; field: TemplateField }> {
  const out: Array<{ templateId: string; field: TemplateField }> = [];
  for (const [templateId, fields] of Object.entries(TEMPLATE_FIELDS)) {
    for (const field of fields) out.push({ templateId, field });
  }
  return out;
}

describe("TEMPLATE_FIELDS — universal invariants (all templates)", () => {
  it('boolean field defaultValue is exactly "true", "false", or undefined', () => {
    for (const { templateId, field } of allFields()) {
      if (field.type !== "boolean") continue;
      if (field.defaultValue === undefined) continue;
      expect(
        field.defaultValue === "true" || field.defaultValue === "false",
        `${describeField(templateId, field)} has boolean defaultValue ` +
          `${JSON.stringify(field.defaultValue)} — must be "true", "false", or undefined.`,
      ).toBe(true);
    }
  });

  it("visibleWhen.key (if set) refers to a real field on the same template", () => {
    for (const { templateId, field } of allFields()) {
      const condition = field.visibleWhen;
      if (!condition) continue;
      const keys = new Set(
        (TEMPLATE_FIELDS[templateId] ?? []).map((f) => f.key),
      );
      expect(
        keys.has(condition.key),
        `${describeField(templateId, field)} has visibleWhen.key ` +
          `${JSON.stringify(condition.key)}, which is not a field on template "${templateId}".`,
      ).toBe(true);
    }
  });

  it("list field summaryKey (if set) refers to a real itemSchema sub-field", () => {
    for (const { templateId, field } of allFields()) {
      if (field.type !== "list") continue;
      if (!field.summaryKey) continue;
      const subKeys = new Set(field.itemSchema.map((sub) => sub.key));
      expect(
        subKeys.has(field.summaryKey),
        `${describeField(templateId, field)} has summaryKey ` +
          `${JSON.stringify(field.summaryKey)}, which is not a key in its itemSchema.`,
      ).toBe(true);
    }
  });

  it("list field defaultRows requires defaultsWhenEmpty: true", () => {
    for (const { templateId, field } of allFields()) {
      if (field.type !== "list") continue;
      if (!field.defaultRows) continue;
      expect(
        field.defaultsWhenEmpty,
        `${describeField(templateId, field)} declares defaultRows but not ` +
          `defaultsWhenEmpty: true.`,
      ).toBe(true);
    }
  });

  it("list field defaultRows: every row's keys are a subset of itemSchema keys", () => {
    for (const { templateId, field } of allFields()) {
      if (field.type !== "list" || !field.defaultRows) continue;
      const subKeys = new Set(field.itemSchema.map((sub) => sub.key));
      field.defaultRows.forEach((row, index) => {
        for (const key of Object.keys(row)) {
          expect(
            subKeys.has(key),
            `${describeField(templateId, field)} defaultRows[${index}] has key ` +
              `${JSON.stringify(key)}, which is not in its itemSchema.`,
          ).toBe(true);
        }
      });
    }
  });

  it("list field defaultRows.length does not exceed maxItems", () => {
    for (const { templateId, field } of allFields()) {
      if (field.type !== "list" || !field.defaultRows) continue;
      const max = field.maxItems ?? Infinity;
      expect(
        field.defaultRows.length <= max,
        `${describeField(templateId, field)} has ${field.defaultRows.length} ` +
          `defaultRows, which exceeds maxItems (${field.maxItems}).`,
      ).toBe(true);
    }
  });

  it("list field defaultRows: every icon sub-field value is a real Lucide icon name", () => {
    const iconNames: readonly string[] = TEMPLATE_LUCIDE_ICON_NAMES;
    for (const { templateId, field } of allFields()) {
      if (field.type !== "list" || !field.defaultRows) continue;
      const iconKeys = field.itemSchema
        .filter((sub) => sub.type === "icon")
        .map((sub) => sub.key);
      if (iconKeys.length === 0) continue;
      field.defaultRows.forEach((row, index) => {
        for (const key of iconKeys) {
          const value = row[key];
          if (value === undefined) continue;
          expect(
            iconNames.includes(value),
            `${describeField(templateId, field)} defaultRows[${index}].${key} is ` +
              `${JSON.stringify(value)}, which is not in TEMPLATE_LUCIDE_ICON_NAMES.`,
          ).toBe(true);
        }
      });
    }
  });
});

describe.each(STRICT_TEMPLATES)(
  "TEMPLATE_FIELDS — strict copy/lint (%s)",
  (templateId) => {
    const fields = TEMPLATE_FIELDS[templateId] ?? [];

    it("has at least one field to lint (sanity check the template id is right)", () => {
      expect(fields.length).toBeGreaterThan(0);
    });

    it("every field description is non-empty and not just a repeat of its label", () => {
      for (const field of fields) {
        expect(
          field.description.trim().length > 0,
          `${describeField(templateId, field)} has an empty description.`,
        ).toBe(true);
        expect(
          field.description.trim().toLowerCase(),
          `${describeField(templateId, field)} has a description that just repeats its label ` +
            `— describe what the field does / where it appears instead.`,
        ).not.toBe(field.label.trim().toLowerCase());
      }
    });

    it("no placeholder equals its defaultValue when the default is longer than 40 characters", () => {
      for (const field of fields) {
        if (!field.placeholder || !field.defaultValue) continue;
        if (field.defaultValue.length <= 40) continue;
        expect(
          field.placeholder,
          `${describeField(templateId, field)} has placeholder === defaultValue for a ` +
            `${field.defaultValue.length}-char default — the placeholder should hint at the ` +
            `shape of the value, not restate the whole default (which the editor already shows).`,
        ).not.toBe(field.defaultValue);
      }
    });

    it("labels contain no banned jargon words", () => {
      for (const field of fields) {
        const hit = findBannedWord(field.label, BANNED_LABEL_JARGON_WORDS);
        expect(
          hit,
          `${describeField(templateId, field)} label contains banned jargon word ${JSON.stringify(hit)} ` +
            `— use plain merchant-facing language instead.`,
        ).toBeUndefined();
      }
    });

    it("labels and descriptions contain no palette-specific colour words", () => {
      for (const field of fields) {
        const labelHit = findBannedWord(field.label, PALETTE_COLOR_WORDS);
        expect(
          labelHit,
          `${describeField(templateId, field)} label contains palette colour word ${JSON.stringify(labelHit)} ` +
            `— field copy must not lock in one theme's colour choices.`,
        ).toBeUndefined();

        const descriptionHit = findBannedWord(
          field.description,
          PALETTE_COLOR_WORDS,
        );
        expect(
          descriptionHit,
          `${describeField(templateId, field)} description contains palette colour word ` +
            `${JSON.stringify(descriptionHit)} — field copy must not lock in one theme's colour choices.`,
        ).toBeUndefined();
      }
    });

    it("list fields: every itemSchema sub-field has a non-empty description", () => {
      for (const field of fields) {
        if (field.type !== "list") continue;
        for (const sub of field.itemSchema) {
          expect(
            sub.description && sub.description.trim().length > 0,
            `${describeField(templateId, field)} sub-field "${sub.key}" has an empty description.`,
          ).toBe(true);
        }
      }
    });

    it("list fields: summaryKey (if set) refers to a real sub-field key", () => {
      for (const field of fields) {
        if (field.type !== "list" || !field.summaryKey) continue;
        const subKeys = new Set(field.itemSchema.map((sub) => sub.key));
        expect(
          subKeys.has(field.summaryKey),
          `${describeField(templateId, field)} summaryKey ${JSON.stringify(field.summaryKey)} ` +
            `is not a key in its itemSchema.`,
        ).toBe(true);
      }
    });

    it("list fields: itemLabel is set", () => {
      for (const field of fields) {
        if (field.type !== "list") continue;
        expect(
          field.itemLabel && field.itemLabel.trim().length > 0,
          `${describeField(templateId, field)} is missing itemLabel (used for "Add <itemLabel>" / ` +
            `"<itemLabel> 3" copy in the editor).`,
        ).toBe(true);
      }
    });

    it("visibleWhen.key (if set) refers to a real field on this template", () => {
      const keys = new Set(fields.map((f) => f.key));
      for (const field of fields) {
        if (!field.visibleWhen) continue;
        expect(
          keys.has(field.visibleWhen.key),
          `${describeField(templateId, field)} visibleWhen.key ${JSON.stringify(field.visibleWhen.key)} ` +
            `is not a field on template "${templateId}".`,
        ).toBe(true);
      }
    });

    it('boolean defaultValue is exactly "true" or "false" (or undefined)', () => {
      for (const field of fields) {
        if (field.type !== "boolean" || field.defaultValue === undefined)
          continue;
        expect(
          field.defaultValue === "true" || field.defaultValue === "false",
          `${describeField(templateId, field)} has boolean defaultValue ${JSON.stringify(field.defaultValue)}.`,
        ).toBe(true);
      }
    });

    it('number fields with control: "slider" have numeric min < max', () => {
      for (const field of fields) {
        if (field.type !== "number" || field.control !== "slider") continue;
        expect(
          typeof field.min === "number" && typeof field.max === "number",
          `${describeField(templateId, field)} uses control: "slider" but is missing numeric min/max.`,
        ).toBe(true);
        expect(
          field.min! < field.max!,
          `${describeField(templateId, field)} has slider min (${field.min}) >= max (${field.max}).`,
        ).toBe(true);
      }
    });

    it("every group referenced by a field has group metadata", () => {
      const groups = TEMPLATE_FIELD_GROUPS[templateId] ?? [];
      const groupIds = new Set(groups.map((g) => g.id));
      for (const field of fields) {
        if (!field.group) continue;
        expect(
          groupIds.has(field.group),
          `${describeField(templateId, field)} references group ${JSON.stringify(field.group)}, ` +
            `which has no TemplateFieldGroup metadata on template "${templateId}".`,
        ).toBe(true);
      }
    });

    it("list fields with defaultsWhenEmpty: true declare non-empty defaultRows", () => {
      if (!LIST_DEFAULTS_SWEPT_TEMPLATES.includes(templateId)) return;
      for (const field of fields) {
        if (field.type !== "list" || !field.defaultsWhenEmpty) continue;
        expect(
          field.defaultRows && field.defaultRows.length > 0,
          `${describeField(templateId, field)} has defaultsWhenEmpty: true but no ` +
            `(or empty) defaultRows — declare the built-in fallback rows in the field ` +
            `itself so the editor can show and copy-on-write them.`,
        ).toBe(true);
      }
    });

    it("list fields never have a non-empty defaultValue string", () => {
      if (!LIST_DEFAULTS_SWEPT_TEMPLATES.includes(templateId)) return;
      for (const field of fields) {
        if (field.type !== "list") continue;
        expect(
          !field.defaultValue,
          `${describeField(templateId, field)} has a non-empty defaultValue ` +
            `${JSON.stringify(field.defaultValue)} — list fields declare their built-in ` +
            `fallback via defaultRows, never defaultValue: JSON.stringify(...).`,
        ).toBe(true);
      }
    });

    it("group title equals its section title when that section has exactly one group", () => {
      const sections = getSectionsForTemplate(templateId);
      for (const section of sections) {
        if (section.groupIds.length !== 1) continue;
        const groupId = section.groupIds[0]!;
        const group = getGroupMetadata(templateId, groupId);
        // Synthetic "__other" filler sections (and any section whose lone
        // group has no metadata) have nothing to compare against — skip.
        if (!group) continue;
        expect(
          group.title,
          `Section "${section.id}" (title ${JSON.stringify(section.title)}) has exactly one group ` +
            `(${JSON.stringify(groupId)}, title ${JSON.stringify(group.title)}) — the two titles ` +
            `should match so the field panel and the section list read as the same thing.`,
        ).toBe(section.title);
      }
    });
  },
);
