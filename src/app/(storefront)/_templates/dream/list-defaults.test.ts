import { describe, expect, it } from "vitest";

import { TEMPLATE_FIELDS } from "~/lib/template-fields";

import { DREAM_PACKAGES_DEFAULT_ROWS } from "./services";
import { toDreamQuoteChips } from "./homepage/dream-homepage-quote-chips";

/**
 * Regression test for the migration of dream's two list-field built-in
 * fallback rows from hardcoded storefront constants into field-level
 * `defaultRows` (see `.claude/skills/sp-new-template/references/
 * field-conventions.md` "List defaults"). The expected values below are
 * copied verbatim from the pre-migration source (`dream-homepage-quote-
 * chips.ts` / `services/index.ts`) so this test proves the migration didn't
 * change storefront output.
 */
describe("dream list-field defaults (moved into TemplateField.defaultRows)", () => {
  describe("toDreamQuoteChips (dream.homepage.quote-chips)", () => {
    const expected = [
      "Date + time",
      "Location",
      "Theme",
      "Colors",
      "Draping",
      "Rentals",
      "Space photos",
      "Full decor?",
    ];

    it("falls back to the built-in checklist when undefined", () => {
      expect(toDreamQuoteChips(undefined)).toEqual(expected);
    });

    it("falls back to the built-in checklist when the saved list is empty", () => {
      expect(toDreamQuoteChips([])).toEqual(expected);
    });

    it("falls back to the built-in checklist when the only saved row is blank", () => {
      expect(toDreamQuoteChips([{ label: "  " }])).toEqual(expected);
    });

    it("uses the saved row when present", () => {
      expect(toDreamQuoteChips([{ label: "Budget" }])).toEqual(["Budget"]);
    });
  });

  const expectedPackageRows = [
    {
      name: "Essence",
      tagline: "A simple, elegant start.",
      includes: "1 panel\n3 colors\n2 layers\n2 tie backs",
      note: "Inquiry-only; delivery, setup, and teardown quoted separately.",
    },
    {
      name: "Deluxe",
      tagline: "Full and finished with a theme.",
      includes: "1 panel\na theme\n3–5 colors\nvalance",
      note: "Inquiry-only; delivery, setup, and teardown quoted separately.",
    },
    {
      name: "Premium",
      tagline: "Deluxe, plus a throne chair moment.",
      includes: "Deluxe package\n2 panels\nthrone chair",
      note: "Inquiry-only; delivery, setup, and teardown quoted separately.",
    },
    {
      name: "Lavish",
      tagline: "Dressed for a full guest list.",
      includes: "up to 50 guests\nchair covers\ntable cloths",
      note: "Inquiry-only; delivery, setup, and teardown quoted separately.",
    },
    {
      name: "Yasss!",
      tagline: "Big, bright, and ready to celebrate.",
      includes: "backdrop\nballoon garland\nthrone chair\ngift tables",
      note: "Inquiry-only; delivery, setup, and teardown quoted separately.",
    },
  ];

  describe("DREAM_PACKAGES_DEFAULT_ROWS (dream.services.packages storefront fallback)", () => {
    it("matches the pre-migration copy verbatim", () => {
      expect(DREAM_PACKAGES_DEFAULT_ROWS).toEqual(expectedPackageRows);
    });
  });

  describe("TEMPLATE_FIELDS.dream — defaultRows moved onto the fields themselves", () => {
    const dreamFields = TEMPLATE_FIELDS.dream ?? [];

    function findField(key: string) {
      const field = dreamFields.find((f) => f.key === key);
      if (!field || field.type !== "list") {
        throw new Error(
          `Expected a list field for key "${key}", found ${JSON.stringify(field)}`,
        );
      }
      return field;
    }

    it("dream.homepage.quote-chips declares its defaultRows and no defaultValue", () => {
      const field = findField("dream.homepage.quote-chips");
      expect(field.defaultRows).toEqual([
        { label: "Date + time" },
        { label: "Location" },
        { label: "Theme" },
        { label: "Colors" },
        { label: "Draping" },
        { label: "Rentals" },
        { label: "Space photos" },
        { label: "Full decor?" },
      ]);
      expect((field as { defaultValue?: unknown }).defaultValue).toBeUndefined();
    });

    it("dream.services.packages declares its defaultRows and no defaultValue", () => {
      const field = findField("dream.services.packages");
      expect(field.defaultRows).toEqual(expectedPackageRows);
      expect((field as { defaultValue?: unknown }).defaultValue).toBeUndefined();
    });
  });
});
