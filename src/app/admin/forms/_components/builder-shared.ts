import type { FieldPath, UseFormReturn } from "react-hook-form";
import type { z } from "zod";

import type { formCreateSchema, FormFieldType } from "~/lib/validators/form";
import {
  FORM_CHOICE_FIELD_TYPES,
  FORM_MAX_OPTIONS,
  makeEmptyFormScreening,
} from "~/lib/validators/form";

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

export type PictureGroupInput = NonNullable<
  PictureChoiceFieldInput["groups"]
>[number];

export type ScreeningInput = NonNullable<
  NonNullable<FormDefinitionInput["settings"]>["screening"]
>;

export type ScreeningQuestionInput = NonNullable<
  ScreeningInput["questions"]
>[number];

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

/**
 * A fresh tile. `groupId` is only written when there is one, so a tile added
 * to an ungrouped field has exactly the pre-groups shape.
 */
export function makePictureOption(
  label = "",
  groupId: string | null = null,
): PictureOptionInput {
  return {
    id: newId(),
    label,
    color: null,
    imageUrl: null,
    ...(groupId ? { groupId } : {}),
  };
}

/**
 * A fresh screening question. Every key is written (even the empty message)
 * so the registered inputs and RHF's defaults agree on the row's shape.
 */
export function makeScreeningQuestion(): ScreeningQuestionInput {
  return {
    id: newId(),
    prompt: "",
    passAnswer: "yes",
    failContent: null,
  };
}

/** A fresh picture-choice group (a finish tab, e.g. "Pearl"). */
export function makePictureGroup(label: string): PictureGroupInput {
  return { id: newId(), label };
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
  // choice, ids + labels intact. Everything tile-only (color, imageUrl, code,
  // family, groupId, hidden) and the field-level groups/imageFit exist only
  // on picture choice, so leaving it drops them — hidden tiles become plain,
  // visible options. A long palette can exceed `FORM_MAX_OPTIONS`; that is
  // left to the validator (and named by the change-type dialog) rather than
  // silently truncated.
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
  /**
   * Leaving picture choice for a choice type drops tile colors, photos,
   * codes, families and groups.
   */
  picturesDiscarded: boolean;
  /** Hidden tiles would come back as ordinary, visible options. */
  hiddenRevealed: boolean;
  /**
   * The tiles outnumber what the destination choice type allows
   * (`FORM_MAX_OPTIONS`); the owner must remove some before saving.
   */
  tooManyOptions: boolean;
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
  const leavingPicturesForChoice =
    isPictureChoiceFieldInput(field) && isChoiceFieldType(nextType);
  return {
    optionsDiscarded: hasOptions && !keepsOptions,
    picturesDiscarded: leavingPicturesForChoice,
    hiddenRevealed:
      leavingPicturesForChoice &&
      field.options.some((option) => option.hidden === true),
    tooManyOptions:
      leavingPicturesForChoice && field.options.length > FORM_MAX_OPTIONS,
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
      screening: makeEmptyFormScreening(),
    },
  };
}

/**
 * Fill every optional key the builder's inputs register, so RHF's defaults
 * and its registered values have the same shape. Stored JSON drops
 * `undefined` keys (e.g. `settings.notifyEmail`, and `settings.screening` on
 * every form saved before screening existed), and RHF's form-level
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
      screening: normalizeScreening(definition.settings?.screening),
    },
  };
}

/** Every screening key present, so a form that predates it loads clean. */
function normalizeScreening(
  screening: ScreeningInput | undefined,
): ScreeningInput {
  const empty = makeEmptyFormScreening();
  return {
    enabled: screening?.enabled ?? empty.enabled,
    intro: screening?.intro ?? empty.intro,
    questions: (screening?.questions ?? empty.questions).map((question) => ({
      ...question,
      passAnswer: question.passAnswer ?? "yes",
      failContent: question.failContent ?? null,
    })),
    // `null` is a real value here (the owner emptied the default message), so
    // only a missing key gets the stock paragraph.
    defaultFailContent:
      screening?.defaultFailContent === undefined
        ? empty.defaultFailContent
        : screening.defaultFailContent,
    unlockContent: screening?.unlockContent ?? empty.unlockContent,
  };
}

// ─── Picture-choice groups (pure helpers for the tile editor) ───────────────

/** The section key for tiles outside every (existing) group. */
export const UNGROUPED_KEY = "";

/**
 * Which editor section a tile is listed under: its group, or ungrouped when
 * it has none or points at a group that no longer exists (the validator
 * flags the dangling id; the tile must still be reachable to fix it).
 */
export function pictureSectionKey(
  option: Pick<PictureOptionInput, "groupId">,
  groupIds: ReadonlySet<string>,
): string {
  return option.groupId && groupIds.has(option.groupId)
    ? option.groupId
    : UNGROUPED_KEY;
}

/** TRUE indexes (into the full options array) of one section, in order. */
export function pictureSectionIndexes(
  options: readonly Pick<PictureOptionInput, "groupId">[],
  sectionKey: string,
  groupIds: ReadonlySet<string>,
): number[] {
  return options.flatMap((option, index) =>
    pictureSectionKey(option, groupIds) === sectionKey ? [index] : [],
  );
}

/**
 * The `move(from, to)` that swaps a tile with its previous (`-1`) or next
 * (`+1`) neighbour of the SAME section — tiles of other groups in between
 * keep their relative order. `null` at either end of the section.
 */
export function pictureMoveWithinSection(
  options: readonly Pick<PictureOptionInput, "groupId">[],
  index: number,
  direction: -1 | 1,
  groupIds: ReadonlySet<string>,
): { from: number; to: number } | null {
  const option = options[index];
  if (!option) return null;
  const section = pictureSectionIndexes(
    options,
    pictureSectionKey(option, groupIds),
    groupIds,
  );
  const position = section.indexOf(index);
  const neighbour = section[position + direction];
  return neighbour === undefined ? null : { from: index, to: neighbour };
}

/**
 * Where a tile moving into `targetKey` should land so it ends up LAST in
 * that section's run: right after the section's current last tile, or at the
 * very end when the section is empty. Returns the `to` for `move(index, to)`
 * (equal to `index` when no move is needed). Computed on the array as it is
 * before the move; the tile itself is never counted as a member.
 */
export function pictureGroupChangeDestination(
  options: readonly Pick<PictureOptionInput, "groupId">[],
  index: number,
  targetKey: string,
  groupIds: ReadonlySet<string>,
): number {
  const members = pictureSectionIndexes(options, targetKey, groupIds).filter(
    (member) => member !== index,
  );
  const last = members.at(-1);
  if (last === undefined) return options.length - 1;
  return last > index ? last : last + 1;
}

/** Case-insensitive match of the editor's filter box on label or code. */
export function pictureOptionMatches(
  option: Pick<PictureOptionInput, "label" | "code">,
  query: string,
): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  if (option.label.toLowerCase().includes(needle)) return true;
  const code = option.code?.toLowerCase();
  if (!code) return false;
  const bare = needle.replace(/^#/, "");
  return bare.length > 0 && code.includes(bare);
}

/**
 * Write an OPTIONAL key of the builder form (tile `code`/`family`/`groupId`/
 * `hidden`, group `description`, field `imageFit`) without arming the
 * "Unsaved Changes" guard for nothing.
 *
 * These keys are deliberately NOT `FormField`-registered and NOT filled by
 * `normalizeBuilderDefinition`: registering an absent key makes RHF create it
 * as `undefined`, and its form-level `isDirty` deep-compare counts keys, so
 * an untouched legacy form would read as dirty. Instead a real value is
 * `setValue`d, and an EMPTY value (`undefined`/`null`/`""`/`false`) deletes
 * the key outright, so turning a tile's "hide" on and back off returns the
 * form to clean. Re-validates the whole field after submit so cross-tile
 * rules (duplicate answer labels, dangling groups) clear as soon as fixed;
 * bulk callers pass `revalidate: false` and trigger once themselves.
 */
export function writeOptionalBuilderValue(
  form: UseFormReturn<FormBuilderValues>,
  fieldBase: `definition.fields.${number}`,
  path: string,
  value: string | boolean | null | undefined,
  { revalidate = true }: { revalidate?: boolean } = {},
): void {
  const name = path as FieldPath<FormBuilderValues>;
  const empty =
    value === undefined || value === null || value === "" || value === false;
  if (empty) {
    form.unregister(name, {
      keepDefaultValue: true,
      keepDirty: true,
      keepTouched: true,
    });
  } else {
    form.setValue(name, value as never, { shouldDirty: true });
  }
  if (revalidate && form.formState.isSubmitted) void form.trigger(fieldBase);
}
