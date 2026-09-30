import { describe, expect, it } from "vitest";

import type { TemplateListRow } from "~/lib/template-fields";

import { DEFAULT_OLIVE_ABOUT_CTA_TILES, DEFAULT_OLIVE_ABOUT_STORY, oliveAboutData } from "./about";

/**
 * Regression test for the 2026-09-26 migration of olive's list-field
 * built-in fallback rows (`olive.about.story` / `olive.about.cta`) from
 * hardcoded `TemplateListRow[]` constants in `about/olive-about-page.tsx`
 * (formerly `DEFAULT_STORY` / `DEFAULT_CTA_TILES`) into field-level
 * `defaultRows` on `about/index.ts`, resolved back to storefront constants
 * (`DEFAULT_OLIVE_ABOUT_STORY` / `DEFAULT_OLIVE_ABOUT_CTA_TILES`) via
 * `listRowsFromDefaults`. The expected arrays below are the exact
 * pre-migration constant values — copied verbatim from
 * `olive-about-page.tsx` before it was rewritten — so this test proves the
 * storefront output is byte-for-byte identical (this test passed against the
 * pre-migration constants too, before the migration landed).
 */

const EXPECTED_STORY: TemplateListRow[] = [
  {
    _id: "default-story-1",
    image: "",
    heading: "Started on a card table",
    body: "We began as a folding table at a weekend market — a rack of dresses and a handwritten sign. We sold out by noon and ordered more the next week.",
  },
  {
    _id: "default-story-2",
    image: "",
    heading: "Every fabric, chosen by hand",
    body: "We touch every fabric before it goes on the floor. If it wrinkles wrong or doesn't feel right against your skin, it doesn't make the cut.",
  },
  {
    _id: "default-story-3",
    image: "",
    heading: "A shop that remembers you",
    body: "We keep notes — your size, the dress you almost bought last spring, the color you always reach for. Walk in and we'll likely have something pulled already.",
  },
  {
    _id: "default-story-4",
    image: "",
    heading: "Still here, still local",
    body: "We've grown from one folding table to a real shop on a real block, and neither has changed much. Come try things on and stay as long as you like.",
  },
];

const EXPECTED_CTA_TILES: TemplateListRow[] = [
  { _id: "default-cta-1", image: "", label: "Shop new", link: "/shop" },
  {
    _id: "default-cta-2",
    image: "",
    label: "Read the journal",
    link: "/blog",
  },
  { _id: "default-cta-3", image: "", label: "Say hello", link: "/contact" },
];

describe("olive list-field defaults (moved into TemplateField.defaultRows 2026-09-26)", () => {
  it("DEFAULT_OLIVE_ABOUT_STORY (olive.about.story) matches the pre-migration copy", () => {
    expect(DEFAULT_OLIVE_ABOUT_STORY).toEqual(EXPECTED_STORY);
  });

  it("DEFAULT_OLIVE_ABOUT_CTA_TILES (olive.about.cta) matches the pre-migration copy", () => {
    expect(DEFAULT_OLIVE_ABOUT_CTA_TILES).toEqual(EXPECTED_CTA_TILES);
  });

  function expectListDefaultsMatch(key: string) {
    const field = oliveAboutData.find((f) => f.key === key);
    expect(field, `expected a field with key "${key}"`).toBeDefined();
    if (field?.type !== "list") {
      throw new Error(`expected "${key}" to be a list field`);
    }
    expect(field.defaultsWhenEmpty).toBe(true);
    expect(field.defaultRows).toBeDefined();
    const itemKeys = new Set(field.itemSchema.map((s) => s.key));
    for (const row of field.defaultRows ?? []) {
      expect(Object.keys(row)).not.toContain("_id");
      for (const rowKey of Object.keys(row)) {
        expect(
          itemKeys.has(rowKey),
          `unexpected key "${rowKey}" not in itemSchema`,
        ).toBe(true);
      }
    }
  }

  it("olive.about.story declares defaultsWhenEmpty + matching defaultRows", () => {
    expectListDefaultsMatch("olive.about.story");
  });

  it("olive.about.cta declares defaultsWhenEmpty + matching defaultRows", () => {
    expectListDefaultsMatch("olive.about.cta");
  });
});
