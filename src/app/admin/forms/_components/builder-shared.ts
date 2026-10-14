import type { z } from "zod";

import type { formCreateSchema, FormFieldType } from "~/lib/validators/form";
import { FORM_CHOICE_FIELD_TYPES } from "~/lib/validators/form";

/**
 * Shared vocabulary for the Forms builder.
 *
 * The form is typed on `z.input` of the create schema, NOT `z.output`, for the
 * same reason `CalculatorFormValues` is (see the quote calculator builder's
 * `builder-shared.ts`): every `.default()` in `formFieldSchema`/
 * `formSettingsSchema` (`required`, `maxLength`, `min`/`max`, `minDate`, every
 * setting) is optional on the input side, which is exactly what a half-filled
 * form legitimately holds. The factories below write those keys explicitly so
 * nothing is ever actually `undefined` at runtime — the optional types just
 * stop TypeScript from insisting the owner has finished typing.
 */

export type FormBuilderValues = z.input<typeof formCreateSchema>;

export type FormDefinitionInput = FormBuilderValues["definition"];

export type FieldInput = FormDefinitionInput["fields"][number];

/**
 * A field carrying a plain option list (select / radio / checkboxes).
 * `picturechoice` also has `options`, but with color/photo keys and its own
 * editor — it is deliberately NOT part of this union (and `isOptionFieldInput`
 * is false for it) so the generic options editor never renders for it.
 */
export type OptionFieldInput = Extract<
  FieldInput,
  { type: (typeof FORM_CHOICE_FIELD_TYPES)[number] }
>;

export type OptionInput = OptionFieldInput["options"][number];

/** A picture-choice field (tiles of swatches / photos / label chips). */
export type PictureChoiceFieldInput = Extract<
  FieldInput,
  { type: "picturechoice" }
>;

export type PictureOptionInput = PictureChoiceFieldInput["options"][number];

export function isChoiceFieldType(
  type: FormFieldType,
): type is (typeof FORM_CHOICE_FIELD_TYPES)[number] {
  return (FORM_CHOICE_FIELD_TYPES as readonly string[]).includes(type);
}

export function isOptionFieldInput(
  field: FieldInput,
): field is OptionFieldInput {
  return isChoiceFieldType(field.type);
}

export function isPictureChoiceFieldInput(
  field: FieldInput,
): field is PictureChoiceFieldInput {
  return field.type === "picturechoice";
}

/** Fields whose answer feeds `settings.confirmationFieldId`. */
export function isEmailFieldInput(
  field: FieldInput,
): field is Extract<FieldInput, { type: "email" }> {
  return field.type === "email";
}

// ─── Field type metadata ────────────────────────────────────────────────────

/**
 * Menu order for "Add field". Same members as the validator's
 * `FORM_FIELD_TYPE_VALUES`, with picture choice grouped beside the other
 * choice types.
 */
export const FIELD_TYPE_ORDER: readonly FormFieldType[] = [
  "text",
  "longtext",
  "email",
  "phone",
  "number",
  "select",
  "radio",
  "checkboxes",
  "picturechoice",
  "checkbox",
  "date",
  "time",
];

export const FIELD_TYPE_META: Record<
  FormFieldType,
  { label: string; hint: string }
> = {
  text: {
    label: "Short text",
    hint: "One line of free text.",
  },
  longtext: {
    label: "Long text",
    hint: "A multi-line text area.",
  },
  email: {
    label: "Email",
    hint: "Validated as an email address. Can receive a confirmation copy.",
  },
  phone: {
    label: "Phone",
    hint: "A phone number, loosely validated.",
  },
  number: {
    label: "Number",
    hint: "A number the visitor types, with optional min/max.",
  },
  select: {
    label: "Dropdown",
    hint: "One answer from a menu.",
  },
  radio: {
    label: "Multiple choice",
    hint: "One answer, shown as radio buttons.",
  },
  checkboxes: {
    label: "Checkboxes",
    hint: "Any number of answers.",
  },
  picturechoice: {
    label: "Picture choice",
    hint: "Color swatches or photos — optionally with quantities",
  },
  checkbox: {
    label: "Single checkbox",
    hint: "A single yes/no box — the label is the statement, e.g. “I agree to…”.",
  },
  date: {
    label: "Date",
    hint: "A calendar date, optionally restricted to today or later.",
  },
  time: {
    label: "Time",
    hint: "A time of day, shown in the visitor's clock format.",
  },
};

// ─── Factories ───────────────────────────────────────────────────────────────

function newId(): string {
  return crypto.randomUUID();
}

export function makeOption(): OptionInput {
  return { id: newId(), label: "" };
}

export function makePictureOption(label = ""): PictureOptionInput {
  return { id: newId(), label, color: null, imageUrl: null };
}

/**
 * A fresh field of the given type.
 *
 * Written out per type on purpose, same reasoning as `makeQuestion` in the
 * quote calculator builder: each arm has to satisfy exactly one member of the
 * discriminated union, and a union-typed `type` property would satisfy none
 * of them.
 */
export function makeField(type: FormFieldType): FieldInput {
  const base = {
    id: newId(),
    label: "",
    description: "",
    required: false,
    placeholder: "",
  };

  switch (type) {
    case "text":
      return { ...base, type: "text", maxLength: 500 };
    case "longtext":
      return { ...base, type: "longtext", maxLength: 5000 };
    case "email":
      return { ...base, type: "email" };
    case "phone":
      return { ...base, type: "phone" };
    case "number":
      return {
        ...base,
        type: "number",
        min: null,
        max: null,
        step: null,
      };
    case "select":
      return { ...base, type: "select", options: [makeOption(), makeOption()] };
    case "radio":
      return { ...base, type: "radio", options: [makeOption(), makeOption()] };
    case "checkboxes":
      return {
        ...base,
        type: "checkboxes",
        options: [makeOption(), makeOption()],
      };
    case "picturechoice":
      return {
        ...base,
        type: "picturechoice",
        options: [makePictureOption("Option 1"), makePictureOption("Option 2")],
        selection: "one",
        tileSize: "small",
        showLabels: true,
        referenceImageUrl: null,
        minTotal: null,
        maxTotal: null,
      };
    case "checkbox":
      return { ...base, type: "checkbox" };
    case "date":
      return { ...base, type: "date", minDate: "none" };
    case "time":
      return { ...base, type: "time" };
  }
}

/**
 * The same field, as another type.
 *
 * Carries over everything the destination type can hold: `id`, `label`,
 * `description`, `required`, and `placeholder` where the destination type
 * supports one. `options` carry across the three choice types with their ids
 * intact — a `select` becoming a `radio` keeps every option's identity. A
 * type gaining options for the first time starts from two blank ones, same
 * as a freshly added field.
 *
 * The `id` in particular MUST survive — it is what
 * `settings.confirmationFieldId` and react-hook-form's field array both
 * point at.
 *
 * Pure: the field passed in is never mutated, and an unchanged type returns
 * the very same object so callers can compare by identity.
 */
export function convertFieldType(
  field: FieldInput,
  nextType: FormFieldType,
): FieldInput {
  if (field.type === nextType) return field;

  const base = {
    id: field.id,
    label: field.label,
    description: field.description,
    required: field.required,
    placeholder: field.placeholder,
  };

  // Plain options carry across select/radio/checkboxes AND to/from picture
  // choice, ids + labels intact; color/imageUrl exist only on picture choice.
  const options: OptionInput[] =
    isOptionFieldInput(field) || isPictureChoiceFieldInput(field)
      ? field.options.map((option) => ({ id: option.id, label: option.label }))
      : [makeOption(), makeOption()];
  const pictureOptions: PictureOptionInput[] = isPictureChoiceFieldInput(field)
    ? field.options
    : isOptionFieldInput(field)
      ? field.options.map((option) => ({
          id: option.id,
          label: option.label,
          color: null,
          imageUrl: null,
        }))
      : [makePictureOption("Option 1"), makePictureOption("Option 2")];

  switch (nextType) {
    case "text":
      return { ...base, type: "text", maxLength: 500 };
    case "longtext":
      return { ...base, type: "longtext", maxLength: 5000 };
    case "email":
      return { ...base, type: "email" };
    case "phone":
      return { ...base, type: "phone" };
    case "number":
      return { ...base, type: "number", min: null, max: null, step: null };
    case "select":
      return { ...base, type: "select", options };
    case "radio":
      return { ...base, type: "radio", options };
    case "checkboxes":
      return { ...base, type: "checkboxes", options };
    case "picturechoice":
      return {
        ...base,
        type: "picturechoice",
        options: pictureOptions,
        selection: "one",
        tileSize: "small",
        showLabels: true,
        referenceImageUrl: null,
        minTotal: null,
        maxTotal: null,
      };
    case "checkbox":
      return { ...base, type: "checkbox" };
    case "date":
      return { ...base, type: "date", minDate: "none" };
    case "time":
      return { ...base, type: "time" };
  }
}

/**
 * Whether changing `field` to `nextType` would discard its options or its
 * eligibility as the confirmation-email field. Reported BEFORE the change so
 * a confirmation dialog can name the consequence; `convertFieldType` performs
 * exactly what this describes.
 */
export type FieldTypeChangeImpact = {
  optionsDiscarded: boolean;
  /** Leaving picture choice for a choice type drops tile colors and photos. */
  picturesDiscarded: boolean;
  /** This field is the form's confirmation-email target and the new type isn't email. */
  wasConfirmationTarget: boolean;
};

export function describeFieldTypeChangeImpact(
  field: FieldInput,
  nextType: FormFieldType,
  confirmationFieldId: string | null | undefined,
): FieldTypeChangeImpact {
  const hasOptions =
    isOptionFieldInput(field) || isPictureChoiceFieldInput(field);
  const keepsOptions =
    isChoiceFieldType(nextType) || nextType === "picturechoice";
  return {
    optionsDiscarded: hasOptions && !keepsOptions,
    picturesDiscarded:
      isPictureChoiceFieldInput(field) && isChoiceFieldType(nextType),
    wasConfirmationTarget:
      confirmationFieldId === field.id && nextType !== "email",
  };
}

/** A fresh definition for the builder — mirrors `makeEmptyFormDefinition`. */
export function makeEmptyBuilderDefinition(): FormDefinitionInput {
  return {
    version: 1,
    fields: [],
    settings: {
      submitLabel: "Submit",
      successMessage: "Thanks! We received your submission.",
      confirmationFieldId: null,
      confirmationSubject: "We received your submission",
      confirmationMessage:
        "Thanks for reaching out! This is a quick note to confirm we received your submission. We'll be in touch soon.",
      notifyEmail: "",
    },
  };
}

/**
 * Fill every optional key the builder's inputs register, so RHF's defaults
 * and its registered values have the same shape. Stored JSON drops
 * `undefined` keys (e.g. `settings.notifyEmail`), and RHF's form-level
 * `isDirty` deep-compare counts keys — a key that exists only on the
 * registered side flips the builder to "Unsaved Changes" with nothing
 * actually changed (and arms the leave-page guard).
 */
export function normalizeBuilderDefinition(
  definition: FormDefinitionInput,
): FormDefinitionInput {
  return {
    ...definition,
    fields: definition.fields.map((field) => {
      const withBase = {
        ...field,
        description: field.description ?? "",
        placeholder: field.placeholder ?? "",
      };
      if (withBase.type === "picturechoice") {
        return {
          ...withBase,
          options: withBase.options.map((option) => ({
            ...option,
            color: option.color ?? null,
            imageUrl: option.imageUrl ?? null,
          })),
          selection: withBase.selection ?? "one",
          tileSize: withBase.tileSize ?? "small",
          showLabels: withBase.showLabels ?? true,
          referenceImageUrl: withBase.referenceImageUrl ?? null,
          minTotal: withBase.minTotal ?? null,
          maxTotal: withBase.maxTotal ?? null,
        };
      }
      if (withBase.type === "number") {
        return {
          ...withBase,
          min: withBase.min ?? null,
          max: withBase.max ?? null,
          step: withBase.step ?? null,
        };
      }
      return withBase;
    }),
    settings: {
      ...definition.settings,
      confirmationFieldId: definition.settings?.confirmationFieldId ?? null,
      notifyEmail: definition.settings?.notifyEmail ?? "",
    },
  };
}
