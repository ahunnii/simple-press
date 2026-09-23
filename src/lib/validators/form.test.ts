import { describe, expect, it } from "vitest";

import {
  FORM_DEFAULT_SUBMIT_LABEL,
  FORM_DEFAULT_SUCCESS_MESSAGE,
  formBulkAddTagsSchema,
  formBulkDeleteSchema,
  formCreateSchema,
  formDefinitionSchema,
  formSettingsSchema,
  formSubmissionListSchema,
  formSubmitSchema,
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
