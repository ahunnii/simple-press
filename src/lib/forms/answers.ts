import { z } from "zod";

import type {
  FormDefinition,
  FormField,
  FormFieldType,
  FormPictureChoiceField,
  PublicFormDefinition,
} from "~/lib/validators/form";
import { isRealCalendarDate, localCalendarDate } from "~/lib/calendar-date";
import {
  FORM_FIELD_TYPE_VALUES,
  FORM_PICTURE_MAX_QUANTITY,
  labelKey,
} from "~/lib/validators/form";

/**
 * Answer validation + snapshot helpers for Forms.
 *
 * ISOMORPHIC: imported by the storefront form (advisory validation), the
 * server `submit` procedure (the authority), and CSV import. No server-only
 * imports here.
 *
 * **Choice answers are stored as option LABELS**, not option ids. A snapshot
 * has to keep reading correctly after the owner deletes or reorders options,
 * and the CSV round-trip is label-based anyway. The trade-off: renaming an
 * option does not rewrite old entries (they keep the label the visitor saw),
 * which is the behavior an owner reading an old entry expects.
 */

/**
 * One tile of a picture-choice answer in `"quantity"` mode. `option` is the
 * option LABEL (like every other choice answer); `quantity` is 1–999. An
 * answer lists items in option order, with no zero items and no repeats.
 */
export type FormQuantityItem = { option: string; quantity: number };

/**
 * A stored answer. Picture choice reuses the radio (`string`) and checkboxes
 * (`string[]`) shapes for its `"one"`/`"many"` modes; `FormQuantityItem[]`
 * is its `"quantity"` mode.
 */
export type FormAnswerValue =
  | string
  | string[]
  | FormQuantityItem[]
  | boolean
  | number
  | null;

export type FormAnswerSnapshot = {
  fieldId: string;
  label: string;
  type: FormFieldType;
  value: FormAnswerValue;
};

export type ValidateFormAnswersOptions = {
  /**
   * Skip "required" checks (incl. a required checkbox having to be ticked) and
   * the `minDate: "today"` bound. Used by CSV import: historical rows may
   * legitimately predate a field or a date.
   */
  relaxRequired?: boolean;
  /**
   * How a choice answer names its option. `"id"` (default) for web submits,
   * `"label"` (trimmed, case-insensitive) for CSV import.
   */
  optionMatch?: "id" | "label";
  /**
   * Today as `YYYY-MM-DD`, for `minDate: "today"`. Defaults to the runtime's
   * local date — the server should pass the business's zoned date
   * (`zonedCalendarDate(now, business.timeZone)`).
   */
  today?: string;
};

export type ValidateFormAnswersResult =
  | { ok: true; values: Record<string, FormAnswerValue> }
  | { ok: false; errors: Record<string, string> };

export const FORM_REQUIRED_MESSAGE = "This field is required.";

const emailSchema = z.string().email().max(254);
const PHONE_RE = /^[0-9+().\-\s]{7,32}$/;
const DATE_YMD_RE = /^\d{4}-\d{2}-\d{2}$/;
const DATE_US_RE = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
// `14:30`, `14:30:00`, `2:30 PM`, `2:30pm`, `2 p.m.` — hours/minutes/seconds,
// then an optional meridiem.
const TIME_RE = /^(\d{1,2})(?::(\d{2}))?(?::(\d{2}))?\s*(?:([ap])\.?m\.?)?$/i;
const TRUE_STRINGS = new Set(["true", "yes", "y", "1", "on", "checked", "x"]);
const FALSE_STRINGS = new Set(["false", "no", "n", "0", "off", "unchecked"]);

type FieldResult = { value: FormAnswerValue } | { error: string };

/** Trimmed string, `null` for blank/absent, `undefined` for a non-string. */
function toTrimmedString(raw: unknown): string | null | undefined {
  if (raw === undefined || raw === null) return null;
  if (typeof raw === "number" && Number.isFinite(raw)) return String(raw);
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  return trimmed === "" ? null : trimmed;
}

/** `YYYY-MM-DD`, or `M/D/YYYY` (spreadsheet apps love to reformat dates). */
function normalizeDate(value: string): string | null {
  if (DATE_YMD_RE.test(value)) return isRealCalendarDate(value) ? value : null;
  const us = DATE_US_RE.exec(value);
  if (us) {
    const ymd = `${us[3]}-${us[1]!.padStart(2, "0")}-${us[2]!.padStart(2, "0")}`;
    return isRealCalendarDate(ymd) ? ymd : null;
  }
  return null;
}

/**
 * 24h `HH:mm`, from the browser's `<input type="time">` value or from text a
 * spreadsheet/person typed ("2:30 PM", "2pm"). Seconds are dropped. Returns
 * `null` for anything that isn't a real time of day.
 */
export function normalizeTime(value: string): string | null {
  const match = TIME_RE.exec(value.trim());
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = match[2] === undefined ? 0 : Number(match[2]);
  const seconds = match[3] === undefined ? 0 : Number(match[3]);
  const meridiem = match[4]?.toLowerCase();
  if (minutes > 59 || seconds > 59) return null;
  if (meridiem) {
    // A bare "14 PM" is nonsense; seconds only come from 24h browser values.
    if (hours < 1 || hours > 12 || match[3] !== undefined) return null;
    hours = (hours % 12) + (meridiem === "p" ? 12 : 0);
  } else if (match[2] === undefined || hours > 23) {
    // Without a meridiem, a bare "14" is ambiguous — require `HH:mm`.
    return null;
  }
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/** `14:30` → `2:30 PM`. Anything that isn't a stored `HH:mm` passes through. */
export function formatTimeForDisplay(value: string): string {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return value;
  const hours = Number(match[1]);
  const minutes = match[2]!;
  if (hours > 23 || Number(minutes) > 59) return value;
  return `${hours % 12 === 0 ? 12 : hours % 12}:${minutes} ${hours < 12 ? "AM" : "PM"}`;
}

/** `true` for a `"quantity"` picture-choice value (a non-empty item list). */
export function isQuantityItems(
  value: FormAnswerValue | undefined,
): value is FormQuantityItem[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((item) => typeof item === "object")
  );
}

/** `[{Red,3},{Gold,2}]` → `"Red × 3; Gold × 2"` (the CSV import reads it back). */
export function formatQuantityItems(items: FormQuantityItem[]): string {
  return items.map((item) => `${item.option} × ${item.quantity}`).join("; ");
}

/**
 * One `"Label x N"` / `"Label × N"` part of a quantity cell. Greedy, so the
 * LAST ` x N` wins and a label that itself contains " x " ("2 x 4 x 3")
 * still parses.
 */
const QUANTITY_PART_RE = /^(.*\S)\s+[x×]\s*(\d+)$/i;

type ResolvedOptions = Required<
  Pick<ValidateFormAnswersOptions, "relaxRequired" | "optionMatch">
> & {
  today: string | undefined;
};

type FieldOption = { id: string; label: string };

function findOption(
  options: FieldOption[],
  value: string,
  optionMatch: "id" | "label",
) {
  if (optionMatch === "id") return options.find((o) => o.id === value);
  const key = labelKey(value);
  return options.find((o) => labelKey(o.label) === key);
}

/** Single-answer choice (select, radio, picture choice "one") → the label. */
function validateOneOption(
  options: FieldOption[],
  raw: unknown,
  opts: ResolvedOptions,
  missing: () => FieldResult,
): FieldResult {
  const value = toTrimmedString(raw);
  if (value === undefined) return { error: "Pick one of the options." };
  if (value === null) return missing();
  const option = findOption(options, value, opts.optionMatch);
  if (!option) {
    return opts.optionMatch === "label"
      ? { error: `"${value}" isn't one of the options.` }
      : { error: "Pick one of the options." };
  }
  return { value: option.label };
}

/**
 * Multi-answer choice (checkboxes, picture choice "many") → labels in
 * definition order, deduped. Accepts an array or a `;`-separated string.
 */
function validateManyOptions(
  options: FieldOption[],
  raw: unknown,
  opts: ResolvedOptions,
  missing: () => FieldResult,
): FieldResult {
  let items: string[];
  if (Array.isArray(raw)) {
    if (!raw.every((item): item is string => typeof item === "string")) {
      return { error: "Pick from the listed options." };
    }
    items = raw;
  } else if (typeof raw === "string") {
    items = raw.split(";");
  } else if (raw === undefined || raw === null) {
    items = [];
  } else {
    return { error: "Pick from the listed options." };
  }
  const trimmed = items.map((item) => item.trim()).filter(Boolean);
  if (trimmed.length === 0) return missing();
  const chosen = new Set<string>();
  for (const item of trimmed) {
    const option = findOption(options, item, opts.optionMatch);
    if (!option) {
      return opts.optionMatch === "label"
        ? { error: `"${item}" isn't one of the options.` }
        : { error: "Pick from the listed options." };
    }
    chosen.add(option.id);
  }
  // Definition order, deduped — independent of click/cell order.
  return {
    value: options
      .filter((option) => chosen.has(option.id))
      .map((option) => option.label),
  };
}

const QUANTITY_SHAPE_ERROR = "Choose quantities from the listed options.";

/**
 * Picture choice in `"quantity"` mode. Accepts:
 * - `{ option, quantity }[]` (what the storefront sends),
 * - a `{ [option]: quantity }` record (zero entries are skipped),
 * - a CSV cell, `"Red x 3; Gold × 2"` (`x` or `×`, as exported).
 * `option` is an id or a label per `optionMatch`; `quantity` a whole number
 * (or digit string) from 0 to `FORM_PICTURE_MAX_QUANTITY`. Zeros are
 * dropped and repeats of one option are SUMMED. Output: items in option
 * order, then the field's `minTotal`/`maxTotal` apply to the summed total.
 */
function validateQuantities(
  field: FormPictureChoiceField,
  raw: unknown,
  opts: ResolvedOptions,
  missing: () => FieldResult,
): FieldResult {
  const pairs: { name: string; quantity: unknown }[] = [];
  if (raw === undefined || raw === null) {
    // No answer.
  } else if (typeof raw === "string") {
    for (const part of raw.split(";")) {
      const text = part.trim();
      if (text === "") continue;
      const match = QUANTITY_PART_RE.exec(text);
      if (!match) {
        return { error: `"${text}" needs a quantity, like "${text} x 2".` };
      }
      pairs.push({ name: match[1]!.trim(), quantity: match[2] });
    }
  } else if (Array.isArray(raw)) {
    for (const item of raw) {
      if (
        item === null ||
        typeof item !== "object" ||
        typeof (item as { option?: unknown }).option !== "string"
      ) {
        return { error: QUANTITY_SHAPE_ERROR };
      }
      const entry = item as { option: string; quantity?: unknown };
      pairs.push({ name: entry.option.trim(), quantity: entry.quantity });
    }
  } else if (typeof raw === "object") {
    for (const [name, quantity] of Object.entries(raw)) {
      pairs.push({ name: name.trim(), quantity });
    }
  } else {
    return { error: QUANTITY_SHAPE_ERROR };
  }

  const totals = new Map<string, number>(); // option id → quantity
  for (const pair of pairs) {
    const option = findOption(field.options, pair.name, opts.optionMatch);
    if (!option) {
      return opts.optionMatch === "label"
        ? { error: `"${pair.name}" isn't one of the options.` }
        : { error: QUANTITY_SHAPE_ERROR };
    }
    const quantity =
      typeof pair.quantity === "number"
        ? pair.quantity
        : typeof pair.quantity === "string" && /^\s*\d+\s*$/.test(pair.quantity)
          ? Number(pair.quantity)
          : NaN;
    if (
      !Number.isInteger(quantity) ||
      quantity < 0 ||
      quantity > FORM_PICTURE_MAX_QUANTITY
    ) {
      return {
        error: `Enter a whole number from 1 to ${FORM_PICTURE_MAX_QUANTITY} for ${option.label}.`,
      };
    }
    const sum = (totals.get(option.id) ?? 0) + quantity;
    if (sum > FORM_PICTURE_MAX_QUANTITY) {
      return {
        error: `Enter ${FORM_PICTURE_MAX_QUANTITY} or fewer for ${option.label}.`,
      };
    }
    totals.set(option.id, sum);
  }

  const items: FormQuantityItem[] = field.options
    .filter((option) => (totals.get(option.id) ?? 0) > 0)
    .map((option) => ({
      option: option.label,
      quantity: totals.get(option.id)!,
    }));
  if (items.length === 0) return missing();

  const total = items.reduce((sum, item) => sum + item.quantity, 0);
  if (field.minTotal != null && total < field.minTotal) {
    return { error: `Choose at least ${field.minTotal} in total.` };
  }
  if (field.maxTotal != null && total > field.maxTotal) {
    return { error: `Choose no more than ${field.maxTotal} in total.` };
  }
  return { value: items };
}

function validateField(
  field: FormField,
  raw: unknown,
  opts: ResolvedOptions,
): FieldResult {
  const required = field.required && !opts.relaxRequired;
  const missing = (): FieldResult =>
    required ? { error: FORM_REQUIRED_MESSAGE } : { value: null };

  switch (field.type) {
    case "text":
    case "longtext":
    case "email":
    case "phone":
    case "date":
    case "time": {
      const value = toTrimmedString(raw);
      if (value === undefined) return { error: "Enter a valid answer." };
      if (value === null) return missing();
      if (field.type === "text" || field.type === "longtext") {
        if (value.length > field.maxLength) {
          return {
            error: `Must be ${field.maxLength} characters or fewer.`,
          };
        }
        return { value };
      }
      if (field.type === "email") {
        return emailSchema.safeParse(value).success
          ? { value }
          : { error: "Enter a valid email address." };
      }
      if (field.type === "phone") {
        const digits = value.replace(/\D/g, "").length;
        return PHONE_RE.test(value) && digits >= 7
          ? { value }
          : { error: "Enter a valid phone number." };
      }
      if (field.type === "time") {
        const time = normalizeTime(value);
        return time ? { value: time } : { error: "Enter a valid time." };
      }
      const date = normalizeDate(value);
      if (!date) return { error: "Enter a valid date." };
      if (field.minDate === "today" && !opts.relaxRequired) {
        const today = opts.today ?? localCalendarDate();
        // ISO YYYY-MM-DD strings sort chronologically.
        if (date < today) return { error: "Pick today or a later date." };
      }
      return { value: date };
    }

    case "number": {
      let parsed: number;
      if (typeof raw === "number") {
        parsed = raw;
      } else {
        const value = toTrimmedString(raw);
        if (value === undefined) return { error: "Enter a number." };
        if (value === null) return missing();
        parsed = Number(value);
      }
      if (!Number.isFinite(parsed)) return { error: "Enter a number." };
      if (field.min != null && parsed < field.min) {
        return { error: `Enter ${field.min} or more.` };
      }
      if (field.max != null && parsed > field.max) {
        return { error: `Enter ${field.max} or less.` };
      }
      if (field.step != null) {
        const steps = (parsed - (field.min ?? 0)) / field.step;
        if (Math.abs(steps - Math.round(steps)) > 1e-9) {
          return { error: `Enter a multiple of ${field.step}.` };
        }
      }
      return { value: parsed };
    }

    case "select":
    case "radio":
      return validateOneOption(field.options, raw, opts, missing);

    case "checkboxes":
      return validateManyOptions(field.options, raw, opts, missing);

    case "picturechoice": {
      if (field.selection === "one") {
        return validateOneOption(field.options, raw, opts, missing);
      }
      if (field.selection === "quantity") {
        return validateQuantities(field, raw, opts, missing);
      }
      const result = validateManyOptions(field.options, raw, opts, missing);
      if ("error" in result || !Array.isArray(result.value)) return result;
      const count = result.value.length;
      if (field.minTotal != null && count < field.minTotal) {
        return {
          error: `Pick at least ${field.minTotal} ${field.minTotal === 1 ? "option" : "options"}.`,
        };
      }
      if (field.maxTotal != null && count > field.maxTotal) {
        return {
          error: `Pick no more than ${field.maxTotal} ${field.maxTotal === 1 ? "option" : "options"}.`,
        };
      }
      return result;
    }

    case "checkbox": {
      let checked: boolean | null;
      if (typeof raw === "boolean") {
        checked = raw;
      } else if (raw === undefined || raw === null) {
        checked = null;
      } else if (typeof raw === "string" || typeof raw === "number") {
        const key = String(raw).trim().toLowerCase();
        if (key === "") checked = null;
        else if (TRUE_STRINGS.has(key)) checked = true;
        else if (FALSE_STRINGS.has(key)) checked = false;
        else return { error: "Answer yes or no." };
      } else {
        return { error: "Answer yes or no." };
      }
      if (required && checked !== true) {
        return { error: "Please check this box to continue." };
      }
      return { value: checked };
    }
  }
}

/**
 * Validate + normalize raw answers (keyed by field id) against a form's
 * fields. Strings are trimmed, blanks become `null`, numbers are coerced,
 * choice answers become option LABELS (`string` for select/radio, `string[]`
 * in definition order for checkboxes; picture choice per its `selection`, see
 * `FormAnswerValue`), dates become `YYYY-MM-DD`, times become 24h `HH:mm`. Keys that aren't field ids are ignored. On failure, every
 * failing field gets one friendly message.
 */
export function validateFormAnswers(
  fields: FormField[],
  raw: Record<string, unknown>,
  opts: ValidateFormAnswersOptions = {},
): ValidateFormAnswersResult {
  const resolved = {
    relaxRequired: opts.relaxRequired ?? false,
    optionMatch: opts.optionMatch ?? "id",
    today: opts.today,
  } as const;
  const values: Record<string, FormAnswerValue> = {};
  const errors: Record<string, string> = {};

  for (const field of fields) {
    const rawValue = Object.prototype.hasOwnProperty.call(raw, field.id)
      ? raw[field.id]
      : undefined;
    const result = validateField(field, rawValue, resolved);
    if ("error" in result) errors[field.id] = result.error;
    else values[field.id] = result.value;
  }

  return Object.keys(errors).length > 0
    ? { ok: false, errors }
    : { ok: true, values };
}

/** Freeze answers against the current fields, in field order. */
export function toAnswerSnapshot(
  fields: FormField[],
  values: Record<string, FormAnswerValue>,
): FormAnswerSnapshot[] {
  return fields.map((field) => ({
    fieldId: field.id,
    label: field.label,
    type: field.type,
    value: values[field.id] ?? null,
  }));
}

/**
 * One answer as plain text: `null` → `""`, booleans → "Yes"/"No", arrays →
 * "; "-joined (the CSV multi-value separator), quantity items →
 * "Red × 3; Gold × 2", numbers → `String(n)`.
 * Accepts a bare value or a whole snapshot. A `time` snapshot reads as 12h
 * ("2:30 PM"); a bare value (CSV export, search) stays the stored `HH:mm`.
 */
export function formatAnswerForDisplay(
  input: FormAnswerSnapshot | FormAnswerValue,
): string {
  const isSnapshot =
    input !== null && typeof input === "object" && !Array.isArray(input);
  const value = isSnapshot ? input.value : input;
  if (value === null || value === undefined) return "";
  if (isSnapshot && input.type === "time" && typeof value === "string") {
    return formatTimeForDisplay(value);
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (isQuantityItems(value)) return formatQuantityItems(value);
  if (Array.isArray(value)) return value.join("; ");
  return String(value);
}

/** `formatAnswerForDisplay`, with an em dash for an unanswered field. */
export function formatAnswerOrDash(
  input: FormAnswerSnapshot | FormAnswerValue,
): string {
  const text = formatAnswerForDisplay(input);
  return text === "" ? "—" : text;
}

// Every `FormAnswerValue` shape must be listed, or `parseAnswersJson`
// silently drops entries that use it.
const answerValueSchema = z.union([
  z.string(),
  z.array(z.string()),
  z.array(z.object({ option: z.string(), quantity: z.number() })),
  z.boolean(),
  z.number(),
  z.null(),
]);

const answerSnapshotSchema = z.object({
  fieldId: z.string(),
  label: z.string(),
  type: z.enum(FORM_FIELD_TYPE_VALUES),
  value: answerValueSchema,
});

/**
 * Parse a stored `FormSubmission.answers` string. Never throws: invalid JSON
 * or a non-array yields `[]`, and individual malformed entries are dropped.
 */
export function parseAnswersJson(
  json: string | null | undefined,
): FormAnswerSnapshot[] {
  if (!json) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const result: FormAnswerSnapshot[] = [];
  for (const entry of parsed) {
    const item = answerSnapshotSchema.safeParse(entry);
    if (item.success) result.push(item.data);
  }
  return result;
}

export function serializeAnswers(snapshots: FormAnswerSnapshot[]): string {
  return JSON.stringify(snapshots);
}

/**
 * The option labels a choice answer names: a single label, a label list, or
 * the options of quantity items. Anything else → `[]`.
 */
export function answerLabels(value: FormAnswerValue): string[] {
  if (typeof value === "string") return [value];
  if (isQuantityItems(value)) return value.map((item) => item.option);
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  return [];
}

/**
 * Case-insensitive substring match over every snapshot's label and formatted
 * value (a time matches on both its stored `14:30` and displayed `2:30 PM`
 * forms). A blank query matches everything.
 */
export function snapshotMatchesSearch(
  snapshots: FormAnswerSnapshot[],
  query: string,
): boolean {
  const needle = query.trim().toLowerCase();
  if (needle === "") return true;
  return snapshots.some(
    (snapshot) =>
      snapshot.label.toLowerCase().includes(needle) ||
      formatAnswerForDisplay(snapshot.value).toLowerCase().includes(needle) ||
      formatAnswerForDisplay(snapshot).toLowerCase().includes(needle),
  );
}

/**
 * Whether the answer to `fieldId` matches a filter value (case-insensitive):
 * select/radio → exact label; checkboxes → contains that label; picture
 * choice → that label was picked (in any mode); checkbox → same yes/no;
 * everything else → substring. A blank filter matches all.
 */
export function snapshotMatchesFieldFilter(
  snapshots: FormAnswerSnapshot[],
  fieldId: string,
  value: string,
): boolean {
  const needle = value.trim().toLowerCase();
  if (needle === "") return true;
  const snapshot = snapshots.find((s) => s.fieldId === fieldId);
  if (snapshot?.value == null) return false;

  switch (snapshot.type) {
    case "select":
    case "radio":
      return formatAnswerForDisplay(snapshot.value).toLowerCase() === needle;
    case "checkboxes":
      return (
        Array.isArray(snapshot.value) &&
        answerLabels(snapshot.value).some(
          (label) => label.toLowerCase() === needle,
        )
      );
    case "picturechoice":
      return answerLabels(snapshot.value).some(
        (label) => label.toLowerCase() === needle,
      );
    case "checkbox": {
      const wanted = TRUE_STRINGS.has(needle)
        ? true
        : FALSE_STRINGS.has(needle)
          ? false
          : null;
      return wanted !== null && snapshot.value === wanted;
    }
    default:
      return (
        formatAnswerForDisplay(snapshot.value).toLowerCase().includes(needle) ||
        formatAnswerForDisplay(snapshot).toLowerCase().includes(needle)
      );
  }
}

/**
 * The address to send a confirmation email to, or `null` when the form has no
 * confirmation field (or it's not an email field / was left blank).
 */
export function getConfirmationEmail(
  definition: FormDefinition | PublicFormDefinition,
  values: Record<string, FormAnswerValue>,
): string | null {
  const fieldId = definition.settings.confirmationFieldId;
  if (!fieldId) return null;
  const field = definition.fields.find((f) => f.id === fieldId);
  if (field?.type !== "email") return null;
  const value = values[fieldId];
  return typeof value === "string" && value !== "" ? value : null;
}
