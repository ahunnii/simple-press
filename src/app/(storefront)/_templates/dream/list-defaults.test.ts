import { describe, expect, it } from "vitest";

import { TEMPLATE_FIELDS } from "~/lib/template-fields";

import { toDreamQuoteChips } from "./homepage/dream-homepage-quote-chips";
import { DREAM_PACKAGES_DEFAULT_ROWS } from "./services";

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
      expect(
        (field as { defaultValue?: unknown }).defaultValue,
      ).toBeUndefined();
    });

    it("dream.services.packages declares its defaultRows and no defaultValue", () => {
      const field = findField("dream.services.packages");
      expect(field.defaultRows).toEqual(expectedPackageRows);
      expect(
        (field as { defaultValue?: unknown }).defaultValue,
      ).toBeUndefined();
    });

    it("dream.homepage.hero-shelf declares six defaultRows (empty photos), bounds, and no defaultValue", () => {
      const field = findField("dream.homepage.hero-shelf");
      expect(field.itemLabel).toBe("photo");
      expect(field.summaryKey).toBe("caption");
      expect(field.minItems).toBe(3);
      expect(field.maxItems).toBe(12);
      expect(field.defaultsWhenEmpty).toBe(true);
      expect(field.itemSchema.map((sub) => sub.key)).toEqual([
        "image",
        "caption",
        "alt",
      ]);
      expect(field.defaultRows).toEqual([
        {
          image: "",
          alt: "A white draped arbor set up outdoors by Selest",
          caption: "Outdoor draping",
        },
        {
          image: "",
          alt: "A wall of pastel balloons styled by Selest",
          caption: "Balloon wall",
        },
        {
          image: "",
          alt: "A tablescape with centerpieces styled by Selest",
          caption: "Tablescape",
        },
        {
          image: "",
          alt: "White throne chairs framed by draping at a Selest event",
          caption: "Throne chairs",
        },
        {
          image: "",
          alt: "A floral backdrop with candlelight styled by Selest",
          caption: "Floral backdrop",
        },
        {
          image: "",
          alt: "A table dressed with balloons at a Selest event",
          caption: "Balloon table",
        },
      ]);
      expect(
        (field as { defaultValue?: unknown }).defaultValue,
      ).toBeUndefined();
    });

    it("the 18 numbered hero-shelf fields are gone from the registry", () => {
      expect(
        dreamFields.filter((f) => f.key.includes("hero-shelf-photo-")),
      ).toEqual([]);
    });

    const wwdRows = [
      {
        heading: "Event Decor",
        body: "Selest builds the room around your occasion — backdrops, florals, and focal points designed to be photographed.",
        linkLabel: "See Event Decor",
        linkUrl: "/services",
        image: "",
        alt: "A fully styled event decor setup by Selest",
        sideImage: "",
        sideAlt: "Detail of an event decor accent piece",
      },
      {
        heading: "Event Rentals",
        body: "Chairs, linens, and statement furniture — rented and delivered so every seat matches the mood.",
        linkLabel: "See Event Rentals",
        linkUrl: "/services",
        image: "",
        alt: "Rental chairs and table settings styled by Selest",
        sideImage: "",
        sideAlt: "Detail of a rental linen and place setting",
      },
      {
        heading: "Customized Draping",
        body: "Fabric shaped around your space — ceilings, walls, and thrones draped to fit the theme exactly.",
        linkLabel: "See Customized Draping",
        linkUrl: "/services",
        image: "",
        alt: "A draped ceiling and throne chair styled by Selest",
        sideImage: "",
        sideAlt: "Detail of draped fabric along a wall",
      },
    ];

    it("dream.homepage.what-we-do-rows declares three defaultRows (empty photos), bounds, and no defaultValue", () => {
      const field = findField("dream.homepage.what-we-do-rows");
      expect(field.itemLabel).toBe("row");
      expect(field.summaryKey).toBe("heading");
      expect(field.minItems).toBe(1);
      expect(field.maxItems).toBe(6);
      expect(field.defaultsWhenEmpty).toBe(true);
      expect(field.itemSchema.map((sub) => sub.key)).toEqual([
        "heading",
        "body",
        "linkLabel",
        "linkUrl",
        "image",
        "alt",
        "sideImage",
        "sideAlt",
      ]);
      expect(field.defaultRows).toEqual(wwdRows);
      expect(
        (field as { defaultValue?: unknown }).defaultValue,
      ).toBeUndefined();
    });

    const stepLists = [
      {
        key: "dream.homepage.process-steps",
        rows: [
          {
            heading: "Share the occasion",
            body: "Tell Selest the date, the space, and the feeling you want the day to have.",
          },
          {
            heading: "Choose the decor path",
            body: "Selest recommends the decor, rentals, and draping that fit your event and space.",
          },
          {
            heading: "Build the look",
            body: "The pieces come together on-site, styled and ready before your guests arrive.",
          },
        ],
      },
      {
        key: "dream.about.consultation-steps",
        rows: [
          {
            heading: "See the venue",
            body: "Selest walks the space with you and starts sketching the shape of the day.",
          },
          {
            heading: "Design the plan",
            body: "Colors, draping, and rental pieces come together into one themed plan.",
          },
          {
            heading: "Prepare the day",
            body: "Everything is delivered, set, and styled before your first guest arrives.",
          },
        ],
      },
      {
        key: "dream.contact.form-next-steps",
        rows: [
          {
            heading: "Selest reviews your details",
            body: "She looks over the event, the space, and the theme you described.",
          },
          {
            heading: "You get a proposal",
            body: "A plan with the pieces, colors, and pricing for your event.",
          },
          {
            heading: "You lock in your date",
            body: "Approve the plan and Selest reserves your date.",
          },
        ],
      },
    ];

    for (const { key, rows } of stepLists) {
      it(`${key} declares three defaultRows, bounds, and no defaultValue`, () => {
        const field = findField(key);
        expect(field.itemLabel).toBe("step");
        expect(field.summaryKey).toBe("heading");
        expect(field.minItems).toBe(1);
        expect(field.maxItems).toBe(6);
        expect(field.defaultsWhenEmpty).toBe(true);
        expect(field.itemSchema.map((sub) => sub.key)).toEqual([
          "heading",
          "body",
        ]);
        expect(field.defaultRows).toEqual(rows);
        expect(
          (field as { defaultValue?: unknown }).defaultValue,
        ).toBeUndefined();
      });
    }

    it("the numbered what-we-do row and step fields are gone from the registry", () => {
      const retired = [
        /^dream\.homepage\.row-[123]-/,
        /^dream\.homepage\.process-step-/,
        /^dream\.about\.consultation-step-/,
        /^dream\.contact\.form-next-step-/,
      ];
      expect(
        dreamFields.filter((f) => retired.some((re) => re.test(f.key))),
      ).toEqual([]);
    });
  });
});
