import { describe, expect, it } from "vitest";

import {
  FORM_DEFAULT_SUBMIT_LABEL,
  FORM_DEFAULT_SUCCESS_MESSAGE,
  FORM_PICTURE_MAX_OPTIONS,
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
  toPublicFormDefinition,
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
    expect(issuePaths(withPicture({ options: many(61) }))).toEqual([
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
