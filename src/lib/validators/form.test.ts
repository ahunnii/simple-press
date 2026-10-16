import { describe, expect, it } from "vitest";

import {
  FORM_DEFAULT_SCREENING_FAIL_MESSAGE,
  FORM_DEFAULT_SUBMIT_LABEL,
  FORM_DEFAULT_SUCCESS_MESSAGE,
  FORM_PICTURE_MAX_GROUPS,
  FORM_PICTURE_MAX_OPTIONS,
  FORM_SCREENING_MAX_QUESTIONS,
  FORM_SCREENING_UNLOCK_MAX_JSON_LENGTH,
  formBulkAddTagsSchema,
  formBulkDeleteSchema,
  formCreateSchema,
  formDefinitionSchema,
  formSettingsSchema,
  formSubmissionListSchema,
  formSubmitSchema,
  isFormChoiceField,
  isPictureChoiceField,
  makeEmptyFormDefinition,
  normalizeTags,
  parseStoredFormDefinition,
  pictureOptionAnswerLabel,
  toPublicFormDefinition,
  visiblePictureOptions,
} from "./form";

/**
 * Fixtures are loose records on purpose: they are INPUT to `safeParse`, and
 * most tests bend one field into something invalid.
 */
type RawField = Record<string, unknown>;

function baseDefinition(): {
  version: 1;
  fields: RawField[];
  settings: Record<string, unknown>;
} {
  return {
    version: 1,
    fields: [
      { id: "f_name", type: "text", label: "Name", required: true },
      { id: "f_email", type: "email", label: "Email", required: true },
      {
        id: "f_topic",
        type: "select",
        label: "Topic",
        options: [
          { id: "o1", label: "Sales" },
          { id: "o2", label: "Support" },
        ],
      },
    ],
    settings: {},
  };
}

function issuePaths(input: unknown) {
  const result = formDefinitionSchema.safeParse(input);
  expect(result.success).toBe(false);
  if (result.success) return [];
  return result.error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

describe("formDefinitionSchema", () => {
  it("accepts a valid definition and fills defaults", () => {
    const result = formDefinitionSchema.safeParse(baseDefinition());
    expect(result.success).toBe(true);
    if (!result.success) return;
    const [name, , topic] = result.data.fields;
    expect(name).toMatchObject({ type: "text", maxLength: 500 });
    expect(topic?.required).toBe(false);
    expect(result.data.settings).toMatchObject({
      submitLabel: FORM_DEFAULT_SUBMIT_LABEL,
      successMessage: FORM_DEFAULT_SUCCESS_MESSAGE,
      confirmationFieldId: null,
    });
    expect(result.data.settings.notifyEmail).toBeUndefined();
  });

  it("fills per-type defaults (longtext maxLength, date minDate)", () => {
    const def = baseDefinition();
    def.fields.push(
      { id: "f_msg", type: "longtext", label: "Message" },
      { id: "f_when", type: "date", label: "When" },
    );
    const result = formDefinitionSchema.parse(def);
    expect(result.fields[3]).toMatchObject({ maxLength: 5000 });
    expect(result.fields[4]).toMatchObject({ minDate: "none" });
  });

  it("accepts a time field and strips keys it doesn't define", () => {
    const def = baseDefinition();
    def.fields.push({
      id: "f_at",
      type: "time",
      label: "Pickup time",
      minDate: "today", // a date-only key: stripped, as for any other type
      maxLength: 5,
    });
    const result = formDefinitionSchema.parse(def);
    const time = result.fields[3]!;
    expect(time).toMatchObject({ type: "time", label: "Pickup time" });
    expect(time).not.toHaveProperty("minDate");
    expect(time).not.toHaveProperty("maxLength");
  });

  it("requires at least one field and at most 50", () => {
    expect(issuePaths({ ...baseDefinition(), fields: [] })).toEqual([
      expect.objectContaining({ path: "fields" }),
    ]);
    const many = Array.from({ length: 51 }, (_, i) => ({
      id: `f${i}`,
      type: "text",
      label: `Field ${i}`,
    }));
    expect(issuePaths({ ...baseDefinition(), fields: many })[0]?.path).toBe(
      "fields",
    );
  });

  it("rejects duplicate field ids", () => {
    const def = baseDefinition();
    def.fields[1]!.id = "f_name";
    expect(issuePaths(def)).toContainEqual(
      expect.objectContaining({ path: "fields.1.id" }),
    );
  });

  it("rejects labels that differ only by case/whitespace", () => {
    const def = baseDefinition();
    def.fields[1]!.label = "  name ";
    expect(issuePaths(def)).toEqual([
      {
        path: "fields.1.label",
        message: "Each field needs a different label",
      },
    ]);
  });

  it.each(["Status", "submitted AT", " tags "])(
    "rejects a label colliding with reserved CSV column %j",
    (label) => {
      const def = baseDefinition();
      def.fields[0]!.label = label;
      expect(issuePaths(def)).toEqual([
        expect.objectContaining({ path: "fields.0.label" }),
      ]);
    },
  );

  it("requires the confirmation field to be an email field", () => {
    const def = baseDefinition();
    def.settings = { confirmationFieldId: "f_name" };
    expect(issuePaths(def)).toEqual([
      expect.objectContaining({ path: "settings.confirmationFieldId" }),
    ]);

    def.settings = { confirmationFieldId: "missing" };
    expect(issuePaths(def)[0]?.path).toBe("settings.confirmationFieldId");

    def.settings = { confirmationFieldId: "f_email" };
    expect(formDefinitionSchema.safeParse(def).success).toBe(true);
  });

  it("rejects number min > max", () => {
    const def = baseDefinition();
    def.fields.push({ id: "n", type: "number", label: "Qty", min: 5, max: 1 });
    expect(issuePaths(def)).toEqual([
      expect.objectContaining({ path: "fields.3.max" }),
    ]);
  });

  it("validates choice options: count, unique labels, no semicolons", () => {
    const def = baseDefinition();
    def.fields[2]!.options = [{ id: "o1", label: "Only" }];
    expect(issuePaths(def)[0]?.path).toBe("fields.2.options");

    def.fields[2]!.options = [
      { id: "o1", label: "Sales" },
      { id: "o2", label: "SALES" },
    ];
    expect(issuePaths(def)[0]?.path).toBe("fields.2.options.1.label");

    def.fields[2]!.options = [
      { id: "o1", label: "a; b" },
      { id: "o2", label: "c" },
    ];
    expect(issuePaths(def)[0]?.message).toMatch(/semicolons/);
  });

  it("rejects an unknown field type", () => {
    const def = baseDefinition();
    def.fields[0]!.type = "signature";
    expect(formDefinitionSchema.safeParse(def).success).toBe(false);
  });
});

describe("picturechoice fields", () => {
  const tiles = [
    { id: "p_red", label: "Red", color: "#FF0000" },
    { id: "p_gold", label: "Gold", imageUrl: "https://cdn.example.com/g.jpg" },
    { id: "p_7", label: "7" }, // neither color nor photo → a label chip
  ];

  function withPicture(overrides: RawField = {}) {
    const def = baseDefinition();
    def.fields.push({
      id: "f_pic",
      type: "picturechoice",
      label: "Balloon colors",
      options: tiles,
      ...overrides,
    });
    return def;
  }

  function parsePicture(overrides: RawField = {}) {
    const result = formDefinitionSchema.safeParse(withPicture(overrides));
    expect(result.success).toBe(true);
    if (!result.success) throw result.error;
    const field = result.data.fields.at(-1)!;
    if (!isPictureChoiceField(field)) throw new Error("not a picture field");
    return field;
  }

  it("fills defaults and lower-cases colors", () => {
    const field = parsePicture();
    expect(field).toMatchObject({
      selection: "one",
      tileSize: "small",
      showLabels: true,
      required: false,
    });
    expect(field.options[0]!.color).toBe("#ff0000");
    expect(field.options[2]).toEqual({ id: "p_7", label: "7" });
    expect(isFormChoiceField(field)).toBe(false);
  });

  it("accepts null color/photo/reference/limits (builder clears to null)", () => {
    const field = parsePicture({
      selection: "quantity",
      tileSize: "large",
      showLabels: false,
      referenceImageUrl: null,
      minTotal: null,
      maxTotal: null,
      options: tiles.map((tile) => ({ ...tile, color: null, imageUrl: null })),
    });
    expect(field.options[0]).toMatchObject({ color: null, imageUrl: null });
  });

  it("rejects a bad color, image URL, or reference URL", () => {
    const issues = issuePaths(
      withPicture({
        referenceImageUrl: "not a url",
        options: [
          { id: "a", label: "A", color: "red" },
          { id: "b", label: "B", color: "#fff" },
          { id: "c", label: "C", imageUrl: "/relative.jpg" },
          {
            id: "d",
            label: "D",
            imageUrl: `https://x.com/${"a".repeat(2050)}`,
          },
        ],
      }),
    ).map((issue) => issue.path);
    expect(issues).toEqual(
      expect.arrayContaining([
        "fields.3.referenceImageUrl",
        "fields.3.options.0.color",
        "fields.3.options.1.color",
        "fields.3.options.2.imageUrl",
        "fields.3.options.3.imageUrl",
      ]),
    );
  });

  it("keeps the option label rules (unique, no semicolons)", () => {
    const issues = issuePaths(
      withPicture({
        options: [
          { id: "a", label: "Red" },
          { id: "b", label: " red " },
          { id: "c", label: "Red; Gold" },
        ],
      }),
    );
    expect(issues).toEqual(
      expect.arrayContaining([
        {
          path: "fields.3.options.1.label",
          message: "Each option needs a different label",
        },
        {
          path: "fields.3.options.2.label",
          message: "Option labels can't contain semicolons",
        },
      ]),
    );
  });

  it(`allows up to ${FORM_PICTURE_MAX_OPTIONS} options (more than other choice fields)`, () => {
    const many = (count: number) =>
      Array.from({ length: count }, (_, i) => ({
        id: `o${i}`,
        label: String(i + 1),
      }));
    expect(
      formDefinitionSchema.safeParse(
        withPicture({ options: many(FORM_PICTURE_MAX_OPTIONS) }),
      ).success,
    ).toBe(true);
    expect(
      issuePaths(withPicture({ options: many(FORM_PICTURE_MAX_OPTIONS + 1) })),
    ).toEqual([
      {
        path: "fields.3.options",
        message: `A field can have at most ${FORM_PICTURE_MAX_OPTIONS} options`,
      },
    ]);
    expect(issuePaths(withPicture({ options: many(1) }))[0]!.message).toBe(
      "Add at least 2 options",
    );
  });

  it("rejects non-positive, fractional, or over-cap totals", () => {
    const paths = issuePaths(
      withPicture({ selection: "quantity", minTotal: 0, maxTotal: 1000 }),
    ).map((issue) => issue.path);
    expect(paths).toEqual(["fields.3.minTotal", "fields.3.maxTotal"]);
    expect(
      issuePaths(withPicture({ selection: "quantity", minTotal: 1.5 }))[0]!
        .path,
    ).toBe("fields.3.minTotal");
  });

  it("requires minTotal <= maxTotal outside 'one' mode", () => {
    expect(
      issuePaths(
        withPicture({ selection: "quantity", minTotal: 12, maxTotal: 6 }),
      ),
    ).toEqual([
      {
        path: "fields.3.maxTotal",
        message: "Minimum can't be greater than maximum",
      },
    ]);
    // Quantity totals may exceed the option count.
    expect(
      parsePicture({ selection: "quantity", minTotal: 12, maxTotal: 12 }),
    ).toMatchObject({ minTotal: 12, maxTotal: 12 });
  });

  it("caps 'many' limits at the number of options", () => {
    expect(
      issuePaths(withPicture({ selection: "many", minTotal: 4, maxTotal: 5 })),
    ).toEqual([
      {
        path: "fields.3.minTotal",
        message: "Can't be more than the number of options (3)",
      },
      {
        path: "fields.3.maxTotal",
        message: "Can't be more than the number of options (3)",
      },
    ]);
    expect(
      parsePicture({ selection: "many", minTotal: 1, maxTotal: 3 }),
    ).toMatchObject({ minTotal: 1, maxTotal: 3 });
  });

  it("ignores limits in 'one' mode", () => {
    expect(
      parsePicture({ selection: "one", minTotal: 50, maxTotal: 10 }),
    ).toMatchObject({ selection: "one" });
  });

  it("passes through the public projection", () => {
    const def = formDefinitionSchema.parse(
      withPicture({ referenceImageUrl: "https://cdn.example.com/c.jpg" }),
    );
    expect(toPublicFormDefinition(def).fields.at(-1)).toMatchObject({
      type: "picturechoice",
      referenceImageUrl: "https://cdn.example.com/c.jpg",
    });
  });
});

describe("picturechoice catalog props (codes, groups, hidden)", () => {
  const groups = [
    { id: "g_pearl", label: "Pearl", description: "Shimmery finish" },
    { id: "g_std", label: "Standard" },
  ];
  const tiles = [
    { id: "p_gold", label: "Pearl Gold", code: "610", groupId: "g_pearl" },
    {
      id: "p_red",
      label: "Red",
      code: "010",
      family: "Reds",
      groupId: "g_std",
    },
    { id: "p_blue", label: "Blue", family: "Blues" },
  ];

  function withPicture(overrides: RawField = {}) {
    const def = baseDefinition();
    def.fields.push({
      id: "f_pic",
      type: "picturechoice",
      label: "Balloon colors",
      options: tiles,
      groups,
      ...overrides,
    });
    return def;
  }

  function parsePicture(overrides: RawField = {}) {
    const result = formDefinitionSchema.safeParse(withPicture(overrides));
    expect(result.success).toBe(true);
    if (!result.success) throw result.error;
    const field = result.data.fields.at(-1)!;
    if (!isPictureChoiceField(field)) throw new Error("not a picture field");
    return field;
  }

  it("keeps a definition without the new props exactly as before", () => {
    const legacy = {
      id: "f_pic",
      type: "picturechoice",
      label: "Pick",
      options: [
        { id: "a", label: "A", color: "#FF0000" },
        { id: "b", label: "B" },
      ],
    };
    const def = baseDefinition();
    def.fields.push(legacy);
    const result = formDefinitionSchema.parse(def);
    expect(result.fields.at(-1)).toEqual({
      ...legacy,
      options: [
        { id: "a", label: "A", color: "#ff0000" },
        { id: "b", label: "B" },
      ],
      required: false,
      selection: "one",
      tileSize: "small",
      showLabels: true,
    });
  });

  it("parses codes, families, groups and imageFit", () => {
    const field = parsePicture({ imageFit: "contain" });
    expect(field.imageFit).toBe("contain");
    expect(field.groups).toEqual(groups);
    expect(field.options[0]).toMatchObject({ code: "610", groupId: "g_pearl" });
    expect(field.options[1]).toMatchObject({ family: "Reds" });
    expect(parsePicture({ imageFit: undefined }).imageFit).toBeUndefined();
    expect(
      formDefinitionSchema.safeParse(withPicture({ imageFit: "stretch" }))
        .success,
    ).toBe(false);
  });

  it("accepts null catalog props", () => {
    const field = parsePicture({
      options: tiles.map((tile) => ({
        ...tile,
        code: null,
        family: null,
        groupId: null,
        hidden: false,
      })),
    });
    expect(field.options[0]).toMatchObject({ code: null, groupId: null });
  });

  it("allows 200 options and 30 groups, and no more", () => {
    expect(FORM_PICTURE_MAX_OPTIONS).toBe(200);
    expect(FORM_PICTURE_MAX_GROUPS).toBe(30);
    const manyGroups = (count: number) =>
      Array.from({ length: count }, (_, i) => ({
        id: `g${i}`,
        label: `Group ${i}`,
      }));
    expect(
      formDefinitionSchema.safeParse(
        withPicture({
          groups: manyGroups(FORM_PICTURE_MAX_GROUPS),
          options: [
            { id: "a", label: "A" },
            { id: "b", label: "B" },
          ],
        }),
      ).success,
    ).toBe(true);
    expect(
      issuePaths(
        withPicture({
          groups: manyGroups(FORM_PICTURE_MAX_GROUPS + 1),
          options: [
            { id: "a", label: "A" },
            { id: "b", label: "B" },
          ],
        }),
      ),
    ).toEqual([
      {
        path: "fields.3.groups",
        message: `A field can have at most ${FORM_PICTURE_MAX_GROUPS} groups`,
      },
    ]);
  });

  it("rejects bad codes (# sign, semicolon, spaces, too long)", () => {
    for (const code of ["#610", "6;10", "61 0", "", "-1", "a".repeat(17)]) {
      const paths = issuePaths(
        withPicture({
          options: [
            { id: "a", label: "A", code },
            { id: "b", label: "B" },
          ],
        }),
      ).map((issue) => issue.path);
      expect(paths, code).toEqual(["fields.3.options.0.code"]);
    }
    expect(
      parsePicture({
        options: [
          { id: "a", label: "A", code: " 7.5-b " },
          { id: "b", label: "B" },
        ],
      }).options[0]!.code,
    ).toBe("7.5-b");
  });

  it("rejects a bad family and group label/description", () => {
    expect(
      issuePaths(
        withPicture({
          options: [
            { id: "a", label: "A", family: "Pinks; Reds" },
            { id: "b", label: "B", family: "x".repeat(41) },
          ],
          groups: [
            { id: "g", label: "x".repeat(61), description: "y".repeat(201) },
          ],
        }),
      ).map((issue) => issue.path),
    ).toEqual([
      "fields.3.options.0.family",
      "fields.3.options.1.family",
      "fields.3.groups.0.label",
      "fields.3.groups.0.description",
    ]);
  });

  it("requires every groupId to name a group of the same field", () => {
    expect(
      issuePaths(
        withPicture({
          options: [
            { id: "a", label: "A", groupId: "g_pearl" },
            { id: "b", label: "B", groupId: "g_gone" },
          ],
        }),
      ),
    ).toEqual([
      {
        path: "fields.3.options.1.groupId",
        message: "This option belongs to a group that no longer exists",
      },
    ]);
    // A groupId with no groups at all is dangling too.
    expect(
      issuePaths(
        withPicture({
          groups: undefined,
          options: [
            { id: "a", label: "A", groupId: "g_pearl" },
            { id: "b", label: "B" },
          ],
        }),
      ).map((issue) => issue.path),
    ).toEqual(["fields.3.options.0.groupId"]);
  });

  it("requires unique group ids and unique (case-insensitive) group labels", () => {
    expect(
      issuePaths(
        withPicture({
          groups: [
            { id: "g1", label: "Pearl" },
            { id: "g1", label: " pearl " },
          ],
          options: [
            { id: "a", label: "A" },
            { id: "b", label: "B" },
          ],
        }),
      ).map((issue) => issue.path),
    ).toEqual(["fields.3.groups.1.id", "fields.3.groups.1.label"]);
  });

  it("requires at least one visible tile", () => {
    expect(
      issuePaths(
        withPicture({
          options: tiles.map((tile) => ({ ...tile, hidden: true })),
        }),
      ),
    ).toEqual([
      {
        path: "fields.3.options",
        message: "Leave at least one option visible",
      },
    ]);
    expect(
      parsePicture({
        options: tiles.map((tile, i) => ({ ...tile, hidden: i > 0 })),
      }).options,
    ).toHaveLength(3);
  });

  it("keeps answer labels unique, so a coded tile can't collide with a literal one", () => {
    expect(
      issuePaths(
        withPicture({
          groups: undefined,
          options: [
            { id: "a", label: "Red", code: "010" },
            { id: "b", label: "red (#010)" },
          ],
        }),
      ),
    ).toEqual([
      {
        path: "fields.3.options.1.label",
        message: "Each option needs a different label and code",
      },
    ]);
    // Same code on tiles with different labels is fine (vendor duplicates).
    expect(
      formDefinitionSchema.safeParse(
        withPicture({
          groups: undefined,
          options: [
            { id: "a", label: "Red", code: "092" },
            { id: "b", label: "Teal", code: "092" },
          ],
        }),
      ).success,
    ).toBe(true);
  });

  it("checks minTotal/maxTotal against the VISIBLE count in many mode", () => {
    const options = [
      { id: "a", label: "A" },
      { id: "b", label: "B" },
      { id: "c", label: "C", hidden: true },
      { id: "d", label: "D", hidden: true },
    ];
    expect(
      issuePaths(
        withPicture({
          groups: undefined,
          options,
          selection: "many",
          maxTotal: 3,
        }),
      ),
    ).toEqual([
      {
        path: "fields.3.maxTotal",
        message: "Can't be more than the number of options (2)",
      },
    ]);
    expect(
      formDefinitionSchema.safeParse(
        withPicture({
          groups: undefined,
          options,
          selection: "many",
          maxTotal: 2,
        }),
      ).success,
    ).toBe(true);
  });

  it("builds answer labels and lists visible tiles", () => {
    expect(pictureOptionAnswerLabel({ label: "Pearl Gold", code: "610" })).toBe(
      "Pearl Gold (#610)",
    );
    expect(pictureOptionAnswerLabel({ label: "Red", code: null })).toBe("Red");
    expect(pictureOptionAnswerLabel({ label: "Red" })).toBe("Red");
    const field = parsePicture({
      options: tiles.map((tile, i) => ({ ...tile, hidden: i === 1 })),
    });
    expect(visiblePictureOptions(field).map((o) => o.id)).toEqual([
      "p_gold",
      "p_blue",
    ]);
  });

  it("drops hidden tiles from the public projection but keeps the rest", () => {
    const def = formDefinitionSchema.parse(
      withPicture({
        options: tiles.map((tile, i) => ({ ...tile, hidden: i === 1 })),
      }),
    );
    const pub = toPublicFormDefinition(def);
    const field = pub.fields.at(-1)!;
    if (!isPictureChoiceField(field)) throw new Error("not a picture field");
    expect(field.options.map((o) => o.id)).toEqual(["p_gold", "p_blue"]);
    expect(field.groups).toEqual(groups);
    // The stored definition is untouched.
    const stored = def.fields.at(-1)!;
    if (!isPictureChoiceField(stored)) throw new Error("not a picture field");
    expect(stored.options.find((o) => o.id === "p_red")?.hidden).toBe(true);
  });
});

describe("formSettingsSchema.notifyEmail", () => {
  it("blank and null become undefined", () => {
    expect(formSettingsSchema.parse({ notifyEmail: "" }).notifyEmail).toBe(
      undefined,
    );
    expect(formSettingsSchema.parse({ notifyEmail: "  " }).notifyEmail).toBe(
      undefined,
    );
    expect(formSettingsSchema.parse({ notifyEmail: null }).notifyEmail).toBe(
      undefined,
    );
  });

  it("keeps a valid address and rejects an invalid one", () => {
    expect(
      formSettingsSchema.parse({ notifyEmail: " owner@example.com " })
        .notifyEmail,
    ).toBe("owner@example.com");
    expect(formSettingsSchema.safeParse({ notifyEmail: "nope" }).success).toBe(
      false,
    );
  });
});

describe("parseStoredFormDefinition / makeEmptyFormDefinition", () => {
  it("tolerates an empty field list on read, unlike the write schema", () => {
    const empty = makeEmptyFormDefinition();
    expect(parseStoredFormDefinition(empty).success).toBe(true);
    expect(formDefinitionSchema.safeParse(empty).success).toBe(false);
  });

  it("returns a failed result for garbage", () => {
    expect(parseStoredFormDefinition(null).success).toBe(false);
    expect(parseStoredFormDefinition({ version: 2 }).success).toBe(false);
  });
});

describe("toPublicFormDefinition", () => {
  it("strips owner-only settings", () => {
    const def = formDefinitionSchema.parse({
      ...baseDefinition(),
      settings: {
        confirmationFieldId: "f_email",
        notifyEmail: "owner@example.com",
        confirmationSubject: "Secret subject",
        confirmationMessage: "Secret body",
      },
    });
    const pub = toPublicFormDefinition(def);
    expect(pub.settings).toEqual({
      submitLabel: FORM_DEFAULT_SUBMIT_LABEL,
      successMessage: FORM_DEFAULT_SUCCESS_MESSAGE,
      confirmationFieldId: "f_email",
      screening: null,
    });
    expect(JSON.stringify(pub)).not.toMatch(/owner@example|Secret/);
    expect(pub.fields).toHaveLength(3);
  });
});

describe("normalizeTags", () => {
  it("trims, drops blanks, dedupes case-insensitively keeping first casing", () => {
    expect(
      normalizeTags([" VIP ", "", "vip", "Follow  up", "follow up"]),
    ).toEqual(["VIP", "Follow up"]);
  });

  it("removes semicolons, truncates to 40 chars and caps at 20", () => {
    expect(normalizeTags(["a;b"])).toEqual(["a b"]);
    expect(normalizeTags(["x".repeat(50)])[0]).toHaveLength(40);
    const many = Array.from({ length: 30 }, (_, i) => `t${i}`);
    expect(normalizeTags(many)).toHaveLength(20);
  });
});

describe("router input schemas", () => {
  it("formCreateSchema trims name and defaults published", () => {
    const parsed = formCreateSchema.parse({
      name: "  Contact  ",
      definition: baseDefinition(),
    });
    expect(parsed.name).toBe("Contact");
    expect(parsed.published).toBe(false);
  });

  it("formSubmitSchema accepts arbitrary answer shapes keyed by id", () => {
    const parsed = formSubmitSchema.parse({
      formId: "form1",
      answers: { a: "x", b: ["y"], c: true },
      recaptchaToken: "tok",
    });
    expect(parsed.answers).toEqual({ a: "x", b: ["y"], c: true });
  });

  it("formSubmissionListSchema defaults status/page/pageSize and coerces dates", () => {
    const parsed = formSubmissionListSchema.parse({
      formId: "form1",
      from: "2026-01-01",
    });
    expect(parsed).toMatchObject({ status: "ALL", page: 1, pageSize: 25 });
    expect(parsed.from).toBeInstanceOf(Date);
    expect(
      formSubmissionListSchema.safeParse({ formId: "f", pageSize: 101 })
        .success,
    ).toBe(false);
    expect(
      formSubmissionListSchema.safeParse({ formId: "f", status: "WON" })
        .success,
    ).toBe(false);
  });

  it("bulk schemas bound ids to 1..500", () => {
    expect(formBulkDeleteSchema.safeParse({ ids: [] }).success).toBe(false);
    expect(
      formBulkDeleteSchema.safeParse({
        ids: Array.from({ length: 501 }, (_, i) => `id${i}`),
      }).success,
    ).toBe(false);
    expect(formBulkDeleteSchema.safeParse({ ids: ["a"] }).success).toBe(true);
  });

  it("bulk tag schema normalizes tags", () => {
    expect(
      formBulkAddTagsSchema.parse({ ids: ["a"], tags: ["Hot", "hot "] }).tags,
    ).toEqual(["Hot"]);
    expect(
      formBulkAddTagsSchema.safeParse({ ids: ["a"], tags: [] }).success,
    ).toBe(false);
  });
});

describe("settings.screening", () => {
  const question = (id: string, extra: Record<string, unknown> = {}) => ({
    id,
    prompt: `Question ${id}?`,
    ...extra,
  });
  const note = (text: string) => ({
    type: "doc" as const,
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  });
  const withScreening = (screening: Record<string, unknown>) => ({
    ...baseDefinition(),
    settings: { screening },
  });

  it("defaults to disabled when a stored definition has no screening key", () => {
    const parsed = parseStoredFormDefinition(baseDefinition());
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.settings.screening).toEqual({
      enabled: false,
      intro: "",
      questions: [],
      defaultFailContent: note(FORM_DEFAULT_SCREENING_FAIL_MESSAGE),
      unlockContent: null,
    });
    expect(formDefinitionSchema.safeParse(baseDefinition()).success).toBe(true);
    expect(makeEmptyFormDefinition().settings.screening.enabled).toBe(false);
  });

  it("fills question defaults (passAnswer yes, no fail message)", () => {
    const def = formDefinitionSchema.parse(
      withScreening({ enabled: true, questions: [question("q1")] }),
    );
    expect(def.settings.screening.questions[0]).toEqual({
      id: "q1",
      prompt: "Question q1?",
      passAnswer: "yes",
      failContent: null,
    });
  });

  it("rejects duplicate question ids", () => {
    expect(
      issuePaths(
        withScreening({
          enabled: true,
          questions: [question("q1"), question("q1")],
        }),
      ),
    ).toContainEqual({
      path: "settings.screening.questions.1.id",
      message: "Duplicate question id",
    });
  });

  it("rejects enabled screening with no questions, allows it when disabled", () => {
    expect(
      issuePaths(withScreening({ enabled: true, questions: [] })),
    ).toContainEqual({
      path: "settings.screening.questions",
      message: "Add at least one screening question or turn screening off",
    });
    expect(
      formDefinitionSchema.safeParse(
        withScreening({ enabled: false, questions: [] }),
      ).success,
    ).toBe(true);
  });

  it("requires a question prompt and a bad passAnswer is rejected", () => {
    expect(
      formDefinitionSchema.safeParse(
        withScreening({
          enabled: true,
          questions: [question("q1", { prompt: "   " })],
        }),
      ).success,
    ).toBe(false);
    expect(
      formDefinitionSchema.safeParse(
        withScreening({
          enabled: true,
          questions: [question("q1", { passAnswer: "maybe" })],
        }),
      ).success,
    ).toBe(false);
  });

  it("enforces the question cap", () => {
    const many = Array.from(
      { length: FORM_SCREENING_MAX_QUESTIONS + 1 },
      (_, i) => question(`q${i}`),
    );
    expect(
      formDefinitionSchema.safeParse(
        withScreening({ enabled: true, questions: many }),
      ).success,
    ).toBe(false);
  });

  describe("failContent / defaultFailContent", () => {
    const parseQuestion = (failContent: unknown) =>
      formDefinitionSchema.safeParse(
        withScreening({
          enabled: true,
          questions: [question("q1", { failContent })],
        }),
      );

    it("keeps a question's own message as-is", () => {
      const doc = note("Try our youth program");
      const def = formDefinitionSchema.parse(
        withScreening({
          enabled: true,
          questions: [question("q1", { failContent: doc })],
        }),
      );
      expect(def.settings.screening.questions[0]?.failContent).toEqual(doc);
    });

    it("normalizes missing, null and empty-editor question messages to null", () => {
      for (const value of [
        undefined,
        null,
        { type: "doc", content: [] },
        { type: "doc", content: [{ type: "paragraph" }] },
      ]) {
        const def = formDefinitionSchema.parse(
          withScreening({
            enabled: true,
            questions: [question("q1", { failContent: value })],
          }),
        );
        expect(def.settings.screening.questions[0]?.failContent).toBeNull();
      }
    });

    it("defaults the default message to the stock paragraph, but keeps an explicit null", () => {
      const missing = formDefinitionSchema.parse(withScreening({}));
      expect(missing.settings.screening.defaultFailContent).toEqual(
        note(FORM_DEFAULT_SCREENING_FAIL_MESSAGE),
      );
      for (const value of [null, { type: "doc", content: [] }]) {
        const def = formDefinitionSchema.parse(
          withScreening({ defaultFailContent: value }),
        );
        expect(def.settings.screening.defaultFailContent).toBeNull();
      }
      const custom = note("Not a fit.");
      expect(
        formDefinitionSchema.parse(
          withScreening({ defaultFailContent: custom }),
        ).settings.screening.defaultFailContent,
      ).toEqual(custom);
    });

    it("rejects non-docs, oversized docs and form nodes in both places", () => {
      const nested = {
        type: "doc",
        content: [{ type: "details", content: [{ type: "form" }] }],
      };
      const big = note("x".repeat(FORM_SCREENING_UNLOCK_MAX_JSON_LENGTH));
      for (const bad of ["plain text", nested, big]) {
        expect(parseQuestion(bad).success).toBe(false);
        expect(
          formDefinitionSchema.safeParse(
            withScreening({ defaultFailContent: bad }),
          ).success,
        ).toBe(false);
      }
      expect(parseQuestion(big).error?.issues.map((i) => i.message)).toContain(
        "This message is too long",
      );
    });

    it("strips the retired failMessage / failLinks / defaultFailMessage keys", () => {
      const def = formDefinitionSchema.parse(
        withScreening({
          enabled: true,
          defaultFailMessage: "old",
          questions: [
            question("q1", {
              failMessage: "old",
              failLinks: [{ label: "Help", href: "/help" }],
            }),
          ],
        }),
      );
      expect(def.settings.screening).not.toHaveProperty("defaultFailMessage");
      expect(def.settings.screening.questions[0]).not.toHaveProperty(
        "failMessage",
      );
      expect(def.settings.screening.questions[0]).not.toHaveProperty(
        "failLinks",
      );
    });
  });

  describe("unlockContent", () => {
    const parseNote = (unlockContent: unknown) =>
      formDefinitionSchema.safeParse(withScreening({ unlockContent }));

    it("keeps a real note as-is", () => {
      const doc = note("Call us at 555-1234");
      const def = formDefinitionSchema.parse(
        withScreening({ unlockContent: doc }),
      );
      expect(def.settings.screening.unlockContent).toEqual(doc);
    });

    it("normalizes missing, null and empty-editor values to null", () => {
      for (const value of [
        undefined,
        null,
        { type: "doc", content: [] },
        { type: "doc", content: [{ type: "paragraph" }] },
        {
          type: "doc",
          content: [
            { type: "paragraph", content: [{ type: "text", text: "" }] },
          ],
        },
      ]) {
        const def = formDefinitionSchema.parse(
          withScreening({ unlockContent: value }),
        );
        expect(def.settings.screening.unlockContent).toBeNull();
      }
    });

    it("keeps an image-only or button-link note", () => {
      const image = {
        type: "doc",
        content: [{ type: "image", attrs: { src: "https://x.test/a.jpg" } }],
      };
      expect(
        formDefinitionSchema.parse(withScreening({ unlockContent: image }))
          .settings.screening.unlockContent,
      ).toEqual(image);
    });

    it("rejects anything that is not a doc", () => {
      expect(parseNote("plain text").success).toBe(false);
      expect(parseNote({ type: "paragraph", content: [] }).success).toBe(false);
      expect(parseNote({ type: "doc", content: "nope" }).success).toBe(false);
    });

    it("caps the serialized size", () => {
      const result = formDefinitionSchema.safeParse(
        withScreening({
          unlockContent: note(
            "x".repeat(FORM_SCREENING_UNLOCK_MAX_JSON_LENGTH),
          ),
        }),
      );
      expect(result.success).toBe(false);
      expect(result.error?.issues.map((i) => i.message)).toContain(
        "This message is too long",
      );
    });

    it("rejects a form node anywhere inside the note", () => {
      const nested = {
        type: "doc",
        content: [
          {
            type: "details",
            content: [{ type: "form", attrs: { formId: "f1" } }],
          },
        ],
      };
      expect(parseNote(nested).success).toBe(false);
    });

    it("strips the retired unlockMessage / unlockLinks keys", () => {
      const def = formDefinitionSchema.parse(
        withScreening({
          unlockMessage: "old",
          unlockLinks: [{ label: "Help", href: "/help" }],
        }),
      );
      expect(def.settings.screening).not.toHaveProperty("unlockMessage");
      expect(def.settings.screening).not.toHaveProperty("unlockLinks");
    });
  });

  it("projects screening to null when disabled or empty, passes it through when enabled", () => {
    const off = formDefinitionSchema.parse(
      withScreening({ enabled: false, questions: [question("q1")] }),
    );
    expect(toPublicFormDefinition(off).settings.screening).toBeNull();

    const on = formDefinitionSchema.parse(
      withScreening({
        enabled: true,
        intro: "Quick check",
        questions: [question("q1", { passAnswer: "no" })],
        unlockContent: note("You're good"),
      }),
    );
    const pub = toPublicFormDefinition(on).settings.screening;
    expect(pub).toEqual(on.settings.screening);
    expect(pub?.intro).toBe("Quick check");
    expect(pub?.questions[0]?.passAnswer).toBe("no");
  });
});
