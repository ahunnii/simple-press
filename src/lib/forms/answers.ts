import { z } from "zod";

import type {
  FormDefinition,
  FormField,
  FormFieldType,
  PublicFormDefinition,
} from "~/lib/validators/form";
import { isRealCalendarDate, localCalendarDate } from "~/lib/calendar-date";
import { FORM_FIELD_TYPE_VALUES, labelKey } from "~/lib/validators/form";

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

export type FormAnswerValue = string | string[] | boolean | number | null;

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

function findOption(
  options: { id: string; label: string }[],
  value: string,
  optionMatch: "id" | "label",
) {
  if (optionMatch === "id") return options.find((o) => o.id === value);
  const key = labelKey(value);
  return options.find((o) => labelKey(o.label) === key);
}

function validateField(
  field: FormField,
  raw: unknown,
  opts: Required<
    Pick<ValidateFormAnswersOptions, "relaxRequired" | "optionMatch">
  > & {
    today: string | undefined;
  },
): FieldResult {
  const required = field.required && !opts.relaxRequired;
  const missing = (): FieldResult =>
    required ? { error: FORM_REQUIRED_MESSAGE } : { value: null };

  switch (field.type) {
    case "text":
    case "longtext":
    case "email":
    case "phone":
    case "date": {
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
    case "radio": {
      const value = toTrimmedString(raw);
      if (value === undefined) return { error: "Pick one of the options." };
      if (value === null) return missing();
      const option = findOption(field.options, value, opts.optionMatch);
      if (!option) {
        return opts.optionMatch === "label"
          ? { error: `"${value}" isn't one of the options.` }
          : { error: "Pick one of the options." };
      }
      return { value: option.label };
    }

    case "checkboxes": {
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
        const option = findOption(field.options, item, opts.optionMatch);
        if (!option) {
          return opts.optionMatch === "label"
            ? { error: `"${item}" isn't one of the options.` }
            : { error: "Pick from the listed options." };
        }
        chosen.add(option.id);
      }
      // Definition order, deduped — independent of click/cell order.
      return {
        value: field.options
          .filter((option) => chosen.has(option.id))
          .map((option) => option.label),
      };
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
 * in definition order for checkboxes), dates become `YYYY-MM-DD`. Keys that
 * aren't field ids are ignored. On failure, every failing field gets one
 * friendly message.
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
 * "; "-joined (the CSV multi-value separator), numbers → `String(n)`.
 * Accepts a bare value or a whole snapshot.
 */
export function formatAnswerForDisplay(
  input: FormAnswerSnapshot | FormAnswerValue,
): string {
  const value =
    input !== null && typeof input === "object" && !Array.isArray(input)
      ? input.value
      : input;
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
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

const answerValueSchema = z.union([
  z.string(),
  z.array(z.string()),
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
 * Case-insensitive substring match over every snapshot's label and formatted
 * value. A blank query matches everything.
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
      formatAnswerForDisplay(snapshot.value).toLowerCase().includes(needle),
  );
}

/**
 * Whether the answer to `fieldId` matches a filter value (case-insensitive):
 * select/radio → exact label; checkboxes → contains that label; checkbox →
 * same yes/no; everything else → substring. A blank filter matches all.
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
        snapshot.value.some((item) => item.toLowerCase() === needle)
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
      return formatAnswerForDisplay(snapshot.value)
        .toLowerCase()
        .includes(needle);
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
