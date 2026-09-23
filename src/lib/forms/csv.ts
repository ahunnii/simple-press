import Papa from "papaparse";

import type { FormAnswerSnapshot, FormAnswerValue } from "~/lib/forms/answers";
import type { FormDefinition, FormStatus } from "~/lib/validators/form";
import { sanitizeCsvMatrix } from "~/lib/csv/escape-cell";
import {
  formatAnswerForDisplay,
  validateFormAnswers,
} from "~/lib/forms/answers";
import {
  FORM_CSV_RESERVED_COLUMNS,
  FORM_STATUS_VALUES,
  labelKey,
  normalizeTags,
} from "~/lib/validators/form";

/**
 * CSV export/import for form entries. Pure — the router does the DB work.
 *
 * Layout (export and import agree on it):
 *
 *   Submitted at | Status | Tags | <current field labels…> | <legacy labels…>
 *
 * - "Submitted at" is ISO 8601 (UTC) — the only format that round-trips
 *   without a time-zone guess.
 * - "Tags" and multi-choice answers are "; "-joined.
 * - Every cell (headers included) goes through `sanitizeCsvMatrix` ("full"
 *   mode), which prefixes formula-looking text with `'`. `parseFormCsv`
 *   reverses exactly that (see `unescapeCsvCell`).
 */

const [SUBMITTED_AT_COLUMN, STATUS_COLUMN, TAGS_COLUMN] =
  FORM_CSV_RESERVED_COLUMNS;

/** Status given to an imported row whose Status cell is blank or absent. */
export const FORM_IMPORT_DEFAULT_STATUS: FormStatus = "READ";
export const FORM_IMPORT_DEFAULT_MAX_ROWS = 5000;

export type FormCsvRow = {
  submittedAt: Date;
  status: string;
  tags: string[];
  answers: FormAnswerSnapshot[];
};

/**
 * Build the export CSV.
 *
 * Current fields map by `fieldId` (so an entry saved before a label rename
 * still lands under the renamed column). Snapshot answers whose field no
 * longer exists become trailing "legacy" columns, grouped by label in order
 * of first appearance; a legacy label that collides with a current/reserved
 * column is suffixed " (previous)" so headers stay unique.
 */
export function buildFormCsv(
  definition: FormDefinition,
  rows: FormCsvRow[],
): string {
  const currentIds = new Set(definition.fields.map((field) => field.id));
  const usedHeaders = new Set<string>(
    [
      ...FORM_CSV_RESERVED_COLUMNS,
      ...definition.fields.map((f) => f.label),
    ].map(labelKey),
  );

  // legacy label key → header text
  const legacyColumns = new Map<string, string>();
  for (const row of rows) {
    for (const snapshot of row.answers) {
      if (currentIds.has(snapshot.fieldId)) continue;
      const key = labelKey(snapshot.label);
      if (legacyColumns.has(key)) continue;
      let header = snapshot.label.trim();
      if (usedHeaders.has(labelKey(header))) {
        header = `${snapshot.label.trim()} (previous)`;
        let counter = 2;
        while (usedHeaders.has(labelKey(header))) {
          header = `${snapshot.label.trim()} (previous ${counter})`;
          counter += 1;
        }
      }
      usedHeaders.add(labelKey(header));
      legacyColumns.set(key, header);
    }
  }

  const headers = [
    ...FORM_CSV_RESERVED_COLUMNS,
    ...definition.fields.map((field) => field.label),
    ...legacyColumns.values(),
  ];
  const legacyKeys = [...legacyColumns.keys()];

  const data = rows.map((row) => {
    const byId = new Map<string, FormAnswerSnapshot>();
    const legacyByLabel = new Map<string, FormAnswerSnapshot>();
    for (const snapshot of row.answers) {
      if (currentIds.has(snapshot.fieldId)) {
        byId.set(snapshot.fieldId, snapshot);
      } else if (!legacyByLabel.has(labelKey(snapshot.label))) {
        legacyByLabel.set(labelKey(snapshot.label), snapshot);
      }
    }
    return [
      row.submittedAt.toISOString(),
      row.status,
      row.tags.join("; "),
      ...definition.fields.map((field) =>
        formatAnswerForDisplay(byId.get(field.id)?.value ?? null),
      ),
      ...legacyKeys.map((key) =>
        formatAnswerForDisplay(legacyByLabel.get(key)?.value ?? null),
      ),
    ];
  });

  const [safeHeaders, ...safeData] = sanitizeCsvMatrix([headers, ...data]);
  return Papa.unparse(
    { fields: safeHeaders as string[], data: safeData },
    { quotes: true, header: true },
  );
}

/** `"Contact Us!"` + today → `contact-us-entries-2026-09-23.csv`. */
export function generateFormCsvFilename(
  formName: string,
  now: Date = new Date(),
): string {
  const slug =
    formName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60)
      .replace(/-+$/g, "") || "form";
  const date = now.toISOString().split("T")[0];
  return `${slug}-entries-${date}.csv`;
}

// ─── Import ─────────────────────────────────────────────────────────────────

/**
 * Inverse of `escapeCsvCell` in "full" mode (~/lib/csv/escape-cell). That
 * function prefixes `'` onto a string whose first non-space character is one
 * of `= + - @ \t \r`, unless the whole string is purely numeric. So strip a
 * leading `'` only when what follows would have been escaped — an apostrophe
 * a person genuinely typed (`'90s music`) survives.
 *
 * Known ambiguity: a value that was literally `'=x` before export is not
 * escaped (it starts with `'`) and comes back as `=x`. Acceptable.
 *
 * Kept in sync with escape-cell.ts by hand — its prefix list is private.
 */
const ESCAPED_PREFIXES = ["=", "+", "-", "@", "\t", "\r"];
export function unescapeCsvCell(value: string): string {
  if (!value.startsWith("'")) return value;
  const rest = value.slice(1);
  const check = rest.replace(/^ +/, "");
  if (!ESCAPED_PREFIXES.some((prefix) => check.startsWith(prefix))) {
    return value;
  }
  if (Number.isFinite(Number(rest.trim()))) return value;
  return rest;
}

export type FormCsvImportRow = {
  submittedAt: Date;
  status: FormStatus;
  tags: string[];
  values: Record<string, FormAnswerValue>;
};

export type FormCsvImportError = {
  /**
   * Spreadsheet-style row number: the header is row 1, so the first data row
   * is 2. `0` means a file-level problem (no rows imported). Counts parsed
   * records — a stray blank line, or a quoted cell spanning lines, can make
   * this drift from the editor's physical line number.
   */
  row: number;
  message: string;
};

export type FormCsvImportResult = {
  matchedColumns: { header: string; fieldId: string; label: string }[];
  ignoredColumns: string[];
  /** Labels of current fields with no matching column. */
  missingFields: string[];
  validRows: FormCsvImportRow[];
  errors: FormCsvImportError[];
  /** Data rows in the file (blank lines excluded). */
  totalRows: number;
  /** Rows skipped because every matched field cell was blank. */
  skippedEmptyRows: number;
};

export type ParseFormCsvOptions = {
  /** Default 5000. Over the cap → one `row: 0` error and no valid rows. */
  maxRows?: number;
  /** `submittedAt` for rows with no "Submitted at" value. Default: now. */
  now?: Date;
};

/**
 * Parse an uploaded CSV against a form. Never throws; every problem is an
 * entry in `errors`, and a row with any error is excluded from `validRows`
 * (one message per row: "Label: problem; Label2: problem").
 *
 * Headers match field labels trimmed + case-insensitively; the reserved
 * columns are optional. Answers are validated with
 * `{ relaxRequired: true, optionMatch: "label" }` — historical rows may lack
 * required fields and may carry past dates.
 */
export function parseFormCsv(
  definition: FormDefinition,
  csvText: string,
  opts: ParseFormCsvOptions = {},
): FormCsvImportResult {
  const maxRows = opts.maxRows ?? FORM_IMPORT_DEFAULT_MAX_ROWS;
  const now = opts.now ?? new Date();
  const text = csvText.replace(/^﻿/, "");

  const result: FormCsvImportResult = {
    matchedColumns: [],
    ignoredColumns: [],
    missingFields: [],
    validRows: [],
    errors: [],
    totalRows: 0,
    skippedEmptyRows: 0,
  };

  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (header) => unescapeCsvCell(header).trim(),
  });

  const headers = (parsed.meta.fields ?? []).filter((h) => h !== "");
  result.totalRows = parsed.data.length;

  // ── Header mapping ──
  const fieldsByLabel = new Map(
    definition.fields.map((field) => [labelKey(field.label), field]),
  );
  let submittedAtHeader: string | null = null;
  let statusHeader: string | null = null;
  let tagsHeader: string | null = null;
  const fieldHeaders = new Map<string, string>(); // fieldId → header

  for (const header of headers) {
    const key = labelKey(header);
    if (key === labelKey(SUBMITTED_AT_COLUMN) && !submittedAtHeader) {
      submittedAtHeader = header;
      continue;
    }
    if (key === labelKey(STATUS_COLUMN) && !statusHeader) {
      statusHeader = header;
      continue;
    }
    if (key === labelKey(TAGS_COLUMN) && !tagsHeader) {
      tagsHeader = header;
      continue;
    }
    const field = fieldsByLabel.get(key);
    if (field && !fieldHeaders.has(field.id)) {
      fieldHeaders.set(field.id, header);
      result.matchedColumns.push({
        header,
        fieldId: field.id,
        label: field.label,
      });
    } else {
      result.ignoredColumns.push(header);
    }
  }
  result.missingFields = definition.fields
    .filter((field) => !fieldHeaders.has(field.id))
    .map((field) => field.label);

  if (headers.length === 0 || result.totalRows === 0) {
    result.errors.push({
      row: 0,
      message: "This file has no entries to import.",
    });
    return result;
  }
  if (result.matchedColumns.length === 0) {
    result.errors.push({
      row: 0,
      message:
        "None of the column headers match this form's field labels. Export the form to CSV to get a template.",
    });
    return result;
  }
  if (result.totalRows > maxRows) {
    result.errors.push({
      row: 0,
      message: `This file has ${result.totalRows} entries — import at most ${maxRows} at a time.`,
    });
    return result;
  }

  // Structural parse errors (bad quoting) poison their row. Field-count
  // mismatches are tolerated: missing trailing cells just read as blank.
  const brokenRows = new Map<number, string>();
  for (const error of parsed.errors) {
    if (error.type === "Quotes" && typeof error.row === "number") {
      brokenRows.set(error.row, "This row has mismatched quotes.");
    }
  }

  const fieldLabelById = new Map(
    definition.fields.map((field) => [field.id, field.label]),
  );
  const cell = (row: Record<string, string>, header: string | null) =>
    header ? unescapeCsvCell(row[header] ?? "").trim() : "";

  parsed.data.forEach((row, index) => {
    const rowNumber = index + 2;
    const broken = brokenRows.get(index);
    if (broken) {
      result.errors.push({ row: rowNumber, message: broken });
      return;
    }

    const raw: Record<string, unknown> = {};
    let hasAnswer = false;
    for (const [fieldId, header] of fieldHeaders) {
      const value = cell(row, header);
      raw[fieldId] = value;
      if (value !== "") hasAnswer = true;
    }
    if (!hasAnswer) {
      result.skippedEmptyRows += 1;
      return;
    }

    const problems: string[] = [];

    let submittedAt = now;
    const submittedAtText = cell(row, submittedAtHeader);
    if (submittedAtText !== "") {
      const date = new Date(submittedAtText);
      if (Number.isNaN(date.getTime())) {
        problems.push(
          `${SUBMITTED_AT_COLUMN}: "${submittedAtText}" isn't a date we can read`,
        );
      } else {
        submittedAt = date;
      }
    }

    let status: FormStatus = FORM_IMPORT_DEFAULT_STATUS;
    const statusText = cell(row, statusHeader);
    if (statusText !== "") {
      const match = FORM_STATUS_VALUES.find(
        (value) => value === statusText.toUpperCase(),
      );
      if (match) status = match;
      else {
        problems.push(
          `${STATUS_COLUMN}: "${statusText}" must be New, Read, or Archived`,
        );
      }
    }

    const tags = normalizeTags(cell(row, tagsHeader).split(";"));

    const validation = validateFormAnswers(definition.fields, raw, {
      relaxRequired: true,
      optionMatch: "label",
    });
    if (!validation.ok) {
      for (const field of definition.fields) {
        const message = validation.errors[field.id];
        if (message) {
          problems.push(`${fieldLabelById.get(field.id)}: ${message}`);
        }
      }
    }

    if (problems.length > 0 || !validation.ok) {
      result.errors.push({ row: rowNumber, message: problems.join("; ") });
      return;
    }

    result.validRows.push({
      submittedAt,
      status,
      tags,
      values: validation.values,
    });
  });

  return result;
}
