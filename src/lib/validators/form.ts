import { z } from "zod";

import { MAX_REQUESTED_PAGE } from "~/lib/validators/admin-table";

/**
 * Schemas for the Forms feature.
 *
 * One form is a `FormDefinition`: an ordered list of FIELDS plus a handful of
 * settings (button label, success message, confirmation email, owner
 * notification address). The definition is stored as a versioned JSON blob on
 * `Form.definition`; every entry is stored as a `FormAnswerSnapshot[]` (see
 * `~/lib/forms/answers`) so old entries still render after the form changes.
 *
 * Three invariants run through this file:
 *
 * 1. **Field labels are a key.** CSV export writes one column per label and
 *    CSV import matches columns back to fields by label (trimmed,
 *    case-insensitive). The `superRefine` on the definition therefore rejects
 *    two fields whose labels differ only by case/whitespace, and any label that
 *    collides with a reserved CSV column (`FORM_CSV_RESERVED_COLUMNS`).
 * 2. **Option labels are a key too.** Choice answers are stored as the option
 *    LABEL (not its id — ids are meaningless once the option is deleted), and
 *    import matches a cell to an option by label. So option labels are unique
 *    per field (case-insensitive) and may not contain `;`, the separator used
 *    for multi-choice cells.
 * 3. **The client never sees owner-only settings.** `toPublicFormDefinition`
 *    builds its output field-by-field (not by omission) so a setting added
 *    later cannot leak to the storefront by default.
 */

// ─── Constants ──────────────────────────────────────────────────────────────

export const FORM_FIELD_TYPE_VALUES = [
  "text", // single-line text
  "longtext", // multi-line text
  "email",
  "phone",
  "number",
  "select", // dropdown, single answer
  "radio", // single answer
  "checkboxes", // multiple answers
  "checkbox", // single yes/no box; the label is the statement
  "date",
] as const;

export type FormFieldType = (typeof FORM_FIELD_TYPE_VALUES)[number];

/** Field types whose answer is chosen from `options`. */
export const FORM_CHOICE_FIELD_TYPES = [
  "select",
  "radio",
  "checkboxes",
] as const;
export type FormChoiceFieldType = (typeof FORM_CHOICE_FIELD_TYPES)[number];

export const FORM_STATUS_VALUES = ["NEW", "READ", "ARCHIVED"] as const;
export type FormStatus = (typeof FORM_STATUS_VALUES)[number];

export const FORM_STATUS_LABELS: Record<FormStatus, string> = {
  NEW: "New",
  READ: "Read",
  ARCHIVED: "Archived",
};

export const FORM_STATUS_FILTER_VALUES = [
  "ALL",
  ...FORM_STATUS_VALUES,
] as const;
export type FormStatusFilterValue = (typeof FORM_STATUS_FILTER_VALUES)[number];

export const FORM_SOURCE_VALUES = ["WEB", "IMPORT"] as const;
export type FormSource = (typeof FORM_SOURCE_VALUES)[number];

/** Ids (field, option, form) are cuid/nanoid-like; 64 is generous. */
export const FORM_ID_MAX_LENGTH = 64;
export const FORM_MAX_FIELDS = 50;
export const FORM_MAX_OPTIONS = 30;
export const FORM_MAX_TAGS = 20;
export const FORM_TAG_MAX_LENGTH = 40;
/** Cap on ids per bulk inbox action. */
export const FORM_BULK_LIMIT = 500;
/** Cap on raw CSV text accepted by `import` (~2 MB). */
export const FORM_IMPORT_MAX_CSV_LENGTH = 2_000_000;

/**
 * CSV columns `buildFormCsv` always writes before the field columns. A field
 * label may not collide with one (case-insensitive), or import could not tell
 * the two apart.
 */
export const FORM_CSV_RESERVED_COLUMNS = [
  "Submitted at",
  "Status",
  "Tags",
] as const;

export const FORM_DEFAULT_SUBMIT_LABEL = "Submit";
export const FORM_DEFAULT_SUCCESS_MESSAGE =
  "Thanks! We received your submission.";
export const FORM_DEFAULT_CONFIRMATION_SUBJECT = "We received your submission";
export const FORM_DEFAULT_CONFIRMATION_MESSAGE =
  "Thanks for reaching out! This is a quick note to confirm we received your submission. We'll be in touch soon.";

/** Trim + lower-case: the comparison key for labels and CSV headers. */
export function labelKey(label: string): string {
  return label.trim().toLowerCase();
}

// ─── Fields ─────────────────────────────────────────────────────────────────

const formIdField = z.string().min(1).max(FORM_ID_MAX_LENGTH);

export const formFieldOptionSchema = z.object({
  id: formIdField,
  label: z
    .string()
    .trim()
    .min(1, "Option label is required")
    .max(200, "Option label must be 200 characters or fewer")
    // Multi-choice answers are written to CSV as "a; b"; a `;` inside a label
    // would split into two bogus options on import.
    .refine((value) => !value.includes(";"), {
      message: "Option labels can't contain semicolons",
    }),
});

export type FormFieldOption = z.infer<typeof formFieldOptionSchema>;

const formFieldBaseShape = {
  id: formIdField,
  label: z
    .string()
    .trim()
    .min(1, "Label is required")
    .max(200, "Label must be 200 characters or fewer"),
  description: z
    .string()
    .trim()
    .max(500, "Description must be 500 characters or fewer")
    .optional(),
  required: z.boolean().default(false),
  placeholder: z
    .string()
    .trim()
    .max(200, "Placeholder must be 200 characters or fewer")
    .optional(),
};

const formOptionsField = z
  .array(formFieldOptionSchema)
  .min(2, "Add at least 2 options")
  .max(FORM_MAX_OPTIONS, `A field can have at most ${FORM_MAX_OPTIONS} options`)
  .superRefine((options, ctx) => {
    const seenIds = new Set<string>();
    const seenLabels = new Set<string>();
    options.forEach((option, index) => {
      if (seenIds.has(option.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Duplicate option id",
          path: [index, "id"],
        });
      }
      seenIds.add(option.id);
      const key = labelKey(option.label);
      if (seenLabels.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Each option needs a different label",
          path: [index, "label"],
        });
      }
      seenLabels.add(key);
    });
  });

export const formTextFieldSchema = z.object({
  type: z.literal("text"),
  ...formFieldBaseShape,
  maxLength: z.number().int().min(1).max(5000).default(500),
});

export const formLongtextFieldSchema = z.object({
  type: z.literal("longtext"),
  ...formFieldBaseShape,
  maxLength: z.number().int().min(1).max(20000).default(5000),
});

export const formEmailFieldSchema = z.object({
  type: z.literal("email"),
  ...formFieldBaseShape,
});

export const formPhoneFieldSchema = z.object({
  type: z.literal("phone"),
  ...formFieldBaseShape,
});

/**
 * `min <= max` is enforced by the definition's `superRefine`, not a `.refine`
 * here: a refined schema is a ZodEffects, which `z.discriminatedUnion` can't
 * hold.
 */
export const formNumberFieldSchema = z.object({
  type: z.literal("number"),
  ...formFieldBaseShape,
  // Nullable as well as optional: builder number inputs clear to null.
  min: z.number().finite().optional().nullable(),
  max: z.number().finite().optional().nullable(),
  step: z.number().finite().positive().optional().nullable(),
});

export const formSelectFieldSchema = z.object({
  type: z.literal("select"),
  ...formFieldBaseShape,
  options: formOptionsField,
});

export const formRadioFieldSchema = z.object({
  type: z.literal("radio"),
  ...formFieldBaseShape,
  options: formOptionsField,
});

export const formCheckboxesFieldSchema = z.object({
  type: z.literal("checkboxes"),
  ...formFieldBaseShape,
  options: formOptionsField,
});

/** A single yes/no box. The label is the statement ("I agree to…"). */
export const formCheckboxFieldSchema = z.object({
  type: z.literal("checkbox"),
  ...formFieldBaseShape,
});

export const formDateFieldSchema = z.object({
  type: z.literal("date"),
  ...formFieldBaseShape,
  /**
   * `"today"` refuses a past date. "Today" is the caller's to supply (see
   * `validateFormAnswers`' `today` option) — the server passes the business's
   * zoned date, the browser its local one.
   */
  minDate: z.enum(["none", "today"]).default("none"),
});

export const formFieldSchema = z.discriminatedUnion("type", [
  formTextFieldSchema,
  formLongtextFieldSchema,
  formEmailFieldSchema,
  formPhoneFieldSchema,
  formNumberFieldSchema,
  formSelectFieldSchema,
  formRadioFieldSchema,
  formCheckboxesFieldSchema,
  formCheckboxFieldSchema,
  formDateFieldSchema,
]);

export type FormField = z.infer<typeof formFieldSchema>;
export type FormFieldInput = z.input<typeof formFieldSchema>;
export type FormChoiceField = Extract<FormField, { type: FormChoiceFieldType }>;

export function isFormChoiceField(field: FormField): field is FormChoiceField {
  return (FORM_CHOICE_FIELD_TYPES as readonly string[]).includes(field.type);
}

// ─── Settings ───────────────────────────────────────────────────────────────

const plainEmail = z.string().email();

export const formSettingsSchema = z.object({
  submitLabel: z
    .string()
    .trim()
    .min(1, "Button label is required")
    .max(60, "Button label must be 60 characters or fewer")
    .default(FORM_DEFAULT_SUBMIT_LABEL),
  successMessage: z
    .string()
    .trim()
    .min(1, "Success message is required")
    .max(1000, "Success message must be 1000 characters or fewer")
    .default(FORM_DEFAULT_SUCCESS_MESSAGE),
  /**
   * The `email` field whose answer receives a confirmation email. `null` =
   * no confirmation email. Must reference an email field (definition refine).
   */
  confirmationFieldId: formIdField.nullable().optional().default(null),
  confirmationSubject: z
    .string()
    .trim()
    .max(200, "Subject must be 200 characters or fewer")
    .default(FORM_DEFAULT_CONFIRMATION_SUBJECT),
  confirmationMessage: z
    .string()
    .trim()
    .max(2000, "Message must be 2000 characters or fewer")
    .default(FORM_DEFAULT_CONFIRMATION_MESSAGE),
  /** Owner notification address. Blank/null → `undefined` (use the default). */
  notifyEmail: z
    .string()
    .trim()
    .max(254, "Email must be 254 characters or fewer")
    .refine((value) => value === "" || plainEmail.safeParse(value).success, {
      message: "Enter a valid email address",
    })
    .nullish()
    // `||` not `??`: the blank string must map to undefined too.
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    .transform((value) => value || undefined),
});

export type FormSettings = z.infer<typeof formSettingsSchema>;

// ─── Definition ─────────────────────────────────────────────────────────────

function refineDefinition(
  definition: { fields: FormField[]; settings: FormSettings },
  ctx: z.RefinementCtx,
) {
  const reserved = new Set(FORM_CSV_RESERVED_COLUMNS.map(labelKey));
  const seenIds = new Set<string>();
  const seenLabels = new Set<string>();

  definition.fields.forEach((field, index) => {
    if (seenIds.has(field.id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Duplicate field id",
        path: ["fields", index, "id"],
      });
    }
    seenIds.add(field.id);

    const key = labelKey(field.label);
    if (reserved.has(key)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `"${field.label}" is reserved for the spreadsheet export — pick another label`,
        path: ["fields", index, "label"],
      });
    } else if (seenLabels.has(key)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Each field needs a different label",
        path: ["fields", index, "label"],
      });
    }
    seenLabels.add(key);

    if (
      field.type === "number" &&
      field.min != null &&
      field.max != null &&
      field.min > field.max
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Minimum can't be greater than maximum",
        path: ["fields", index, "max"],
      });
    }
  });

  const confirmationFieldId = definition.settings.confirmationFieldId;
  if (confirmationFieldId) {
    const target = definition.fields.find(
      (field) => field.id === confirmationFieldId,
    );
    if (target?.type !== "email") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Confirmation emails must go to an email field",
        path: ["settings", "confirmationFieldId"],
      });
    }
  }
}

function definitionObject(minFields: number) {
  return z.object({
    version: z.literal(1),
    fields: z
      .array(formFieldSchema)
      .min(minFields, "Add at least one field")
      .max(
        FORM_MAX_FIELDS,
        `A form can have at most ${FORM_MAX_FIELDS} fields`,
      ),
    settings: formSettingsSchema.default({}),
  });
}

/** Strict write schema — what `create`/`update` and the builder use. */
export const formDefinitionSchema =
  definitionObject(1).superRefine(refineDefinition);

/**
 * Read schema for a stored blob. Same rules, except an empty field list is
 * tolerated so a stored-but-emptied definition still opens in the builder.
 */
export const storedFormDefinitionSchema =
  definitionObject(0).superRefine(refineDefinition);

export type FormDefinition = z.infer<typeof formDefinitionSchema>;
export type FormDefinitionInput = z.input<typeof formDefinitionSchema>;

/** `safeParse` a stored `Form.definition` blob (mirrors `parseStoredQuoteDefinition`). */
export function parseStoredFormDefinition(raw: unknown) {
  return storedFormDefinitionSchema.safeParse(raw);
}

/**
 * A fresh definition for the builder. It has no fields, so it does NOT pass
 * `formDefinitionSchema` until the owner adds one.
 */
export function makeEmptyFormDefinition(): FormDefinition {
  return {
    version: 1,
    fields: [],
    settings: {
      submitLabel: FORM_DEFAULT_SUBMIT_LABEL,
      successMessage: FORM_DEFAULT_SUCCESS_MESSAGE,
      confirmationFieldId: null,
      confirmationSubject: FORM_DEFAULT_CONFIRMATION_SUBJECT,
      confirmationMessage: FORM_DEFAULT_CONFIRMATION_MESSAGE,
      notifyEmail: undefined,
    },
  };
}

// ─── Public projection ──────────────────────────────────────────────────────

export type PublicFormSettings = {
  submitLabel: string;
  successMessage: string;
  confirmationFieldId: string | null;
};

export type PublicFormDefinition = {
  version: 1;
  fields: FormField[];
  settings: PublicFormSettings;
};

/**
 * The storefront's view of a form. Built field-by-field: the owner's
 * notification address and confirmation email copy never leave the server.
 * Fields carry nothing owner-private, so they pass through as-is.
 */
export function toPublicFormDefinition(
  definition: FormDefinition,
): PublicFormDefinition {
  return {
    version: 1,
    fields: definition.fields,
    settings: {
      submitLabel: definition.settings.submitLabel,
      successMessage: definition.settings.successMessage,
      confirmationFieldId: definition.settings.confirmationFieldId ?? null,
    },
  };
}

// ─── Tags ───────────────────────────────────────────────────────────────────

export const formTagSchema = z
  .string()
  .trim()
  .min(1, "Tag can't be blank")
  .max(
    FORM_TAG_MAX_LENGTH,
    `Tags must be ${FORM_TAG_MAX_LENGTH} characters or fewer`,
  )
  // Tags are written to CSV as "a; b".
  .refine((value) => !value.includes(";"), {
    message: "Tags can't contain semicolons",
  });

/**
 * Canonical tag list: trimmed, inner whitespace collapsed, `;` removed,
 * blank dropped, truncated to `FORM_TAG_MAX_LENGTH`, de-duplicated
 * case-insensitively (first casing wins), capped at `FORM_MAX_TAGS`.
 */
export function normalizeTags(tags: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const rawTag of tags) {
    const tag = rawTag
      .replace(/;/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, FORM_TAG_MAX_LENGTH)
      .trim();
    if (tag === "") continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(tag);
    if (result.length >= FORM_MAX_TAGS) break;
  }
  return result;
}

const formTagListField = z
  .array(formTagSchema)
  .max(FORM_MAX_TAGS, `At most ${FORM_MAX_TAGS} tags`)
  .transform(normalizeTags);

// ─── Admin CRUD ─────────────────────────────────────────────────────────────

const formNameField = z
  .string()
  .trim()
  .min(1, "Name is required")
  .max(120, "Name must be 120 characters or fewer");

export const formCreateSchema = z.object({
  name: formNameField,
  definition: formDefinitionSchema,
  published: z.boolean().default(false),
});

export const formUpdateSchema = formCreateSchema.extend({
  id: z.string().min(1),
});

export type FormCreateData = z.infer<typeof formCreateSchema>;
export type FormUpdateData = z.infer<typeof formUpdateSchema>;

// ─── Storefront submission (wire) ───────────────────────────────────────────

export const formSubmitSchema = z.object({
  formId: formIdField,
  /**
   * Raw answers keyed by field id. Shapes are validated against the stored
   * definition by `validateFormAnswers`; unknown keys are ignored there. The
   * key-count cap bounds the work an anonymous POST can cause.
   */
  answers: z
    .record(z.string().max(FORM_ID_MAX_LENGTH), z.unknown())
    .refine((answers) => Object.keys(answers).length <= FORM_MAX_FIELDS * 2, {
      message: "Too many answers submitted",
    }),
  recaptchaToken: z.string(),
});

export type FormSubmitData = z.infer<typeof formSubmitSchema>;

// ─── Inbox ──────────────────────────────────────────────────────────────────

const formSubmissionFilterShape = {
  formId: z.string().min(1),
  status: z.enum(FORM_STATUS_FILTER_VALUES).default("ALL"),
  tags: z.array(formTagSchema).max(FORM_MAX_TAGS).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  search: z.string().trim().max(200).optional(),
  fieldFilter: z
    .object({
      fieldId: formIdField,
      value: z.string().trim().max(200),
    })
    .optional(),
};

export const formSubmissionListSchema = z.object({
  ...formSubmissionFilterShape,
  page: z.number().int().positive().max(MAX_REQUESTED_PAGE).default(1),
  pageSize: z.number().int().min(1).max(100).default(25),
});

export const formSubmissionExportSchema = z.object(formSubmissionFilterShape);

export type FormSubmissionListData = z.infer<typeof formSubmissionListSchema>;
export type FormSubmissionExportData = z.infer<
  typeof formSubmissionExportSchema
>;

const formBulkIdsField = z
  .array(z.string().min(1))
  .min(1, "Select at least one entry")
  .max(
    FORM_BULK_LIMIT,
    `Too many entries selected — at most ${FORM_BULK_LIMIT} at a time`,
  );

export const formSubmissionSetStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(FORM_STATUS_VALUES),
});

export const formBulkSetStatusSchema = z.object({
  ids: formBulkIdsField,
  status: z.enum(FORM_STATUS_VALUES),
});

export const formBulkDeleteSchema = z.object({
  ids: formBulkIdsField,
});

export const formBulkAddTagsSchema = z.object({
  ids: formBulkIdsField,
  tags: formTagListField.refine((tags) => tags.length > 0, {
    message: "Add at least one tag",
  }),
});

export const formBulkRemoveTagsSchema = formBulkAddTagsSchema;

export const formSetTagsSchema = z.object({
  id: z.string().min(1),
  tags: formTagListField,
});

export const formImportSchema = z.object({
  formId: z.string().min(1),
  csvContent: z
    .string()
    .max(
      FORM_IMPORT_MAX_CSV_LENGTH,
      "That file is too large — split it into smaller files",
    ),
});

export type FormSubmissionSetStatusData = z.infer<
  typeof formSubmissionSetStatusSchema
>;
export type FormBulkSetStatusData = z.infer<typeof formBulkSetStatusSchema>;
export type FormBulkDeleteData = z.infer<typeof formBulkDeleteSchema>;
export type FormBulkTagsData = z.infer<typeof formBulkAddTagsSchema>;
export type FormSetTagsData = z.infer<typeof formSetTagsSchema>;
export type FormImportData = z.infer<typeof formImportSchema>;
