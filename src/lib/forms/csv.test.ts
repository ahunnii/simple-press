import Papa from "papaparse";
import { describe, expect, it } from "vitest";

import type { FormAnswerSnapshot } from "./answers";
import type { FormCsvRow } from "./csv";
import type { FormDefinition } from "~/lib/validators/form";
import { formDefinitionSchema } from "~/lib/validators/form";

import { toAnswerSnapshot } from "./answers";
import {
  buildFormCsv,
  generateFormCsvFilename,
  parseFormCsv,
  unescapeCsvCell,
} from "./csv";

const definition: FormDefinition = formDefinitionSchema.parse({
  version: 1,
  fields: [
    { id: "name", type: "text", label: "Name", required: true },
    { id: "email", type: "email", label: "Email" },
    { id: "phone", type: "phone", label: "Phone" },
    { id: "qty", type: "number", label: "Qty" },
    {
      id: "color",
      type: "select",
      label: "Color",
      options: [
        { id: "r", label: "Red" },
        { id: "g", label: "Green" },
      ],
    },
    {
      id: "extras",
      type: "checkboxes",
      label: "Extras",
      options: [
        { id: "a", label: "Alpha" },
        { id: "b", label: "Beta" },
        { id: "c", label: "Gamma" },
      ],
    },
    { id: "agree", type: "checkbox", label: "I agree", required: true },
    { id: "when", type: "date", label: "When", minDate: "today" },
    { id: "notes", type: "longtext", label: "Notes" },
  ],
});

const values = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  phone: "+1 555 123 4567", // starts with "+" → escaped on export
  qty: -3,
  color: "Green",
  extras: ["Alpha", "Gamma"],
  agree: false,
  when: "2020-01-01", // past date: import must still accept it
  notes: '=SUM(A1) and a "quote", plus\na newline',
};

function row(overrides: Partial<FormCsvRow> = {}): FormCsvRow {
  return {
    submittedAt: new Date("2026-09-01T12:34:56.000Z"),
    status: "ARCHIVED",
    tags: ["VIP", "follow up"],
    answers: toAnswerSnapshot(definition.fields, values),
    ...overrides,
  };
}

function parseRaw(csv: string) {
  return Papa.parse<Record<string, string>>(csv, { header: true });
}

describe("buildFormCsv", () => {
  it("writes reserved columns then field labels", () => {
    const csv = buildFormCsv(definition, [row()]);
    const parsed = parseRaw(csv);
    expect(parsed.meta.fields).toEqual([
      "Submitted at",
      "Status",
      "Tags",
      ...definition.fields.map((f) => f.label),
    ]);
    const first = parsed.data[0]!;
    expect(first["Submitted at"]).toBe("2026-09-01T12:34:56.000Z");
    expect(first.Tags).toBe("VIP; follow up");
    expect(first.Extras).toBe("Alpha; Gamma");
    expect(first["I agree"]).toBe("No");
    expect(first.Qty).toBe("-3"); // purely numeric → not escaped
  });

  it("escapes formula-looking cells", () => {
    const parsed = parseRaw(buildFormCsv(definition, [row()]));
    expect(parsed.data[0]!.Notes!.startsWith("'=SUM(A1)")).toBe(true);
    expect(parsed.data[0]!.Phone).toBe("'+1 555 123 4567");
  });

  it("maps answers by field id, so renamed labels land in the new column", () => {
    const renamed: FormDefinition = {
      ...definition,
      fields: definition.fields.map((f) =>
        f.id === "name" ? { ...f, label: "Full name" } : f,
      ),
    };
    // Snapshot still carries the OLD label "Name"
    const parsed = parseRaw(buildFormCsv(renamed, [row()]));
    expect(parsed.meta.fields).toContain("Full name");
    expect(parsed.meta.fields).not.toContain("Name");
    expect(parsed.data[0]!["Full name"]).toBe("Ada Lovelace");
  });

  it("appends legacy columns for deleted fields, deduped by label", () => {
    const legacy: FormAnswerSnapshot[] = [
      { fieldId: "old1", label: "Budget", type: "text", value: "$500" },
      { fieldId: "old2", label: "Email", type: "text", value: "old@x.co" },
    ];
    const rows = [
      row({ answers: [...row().answers, legacy[0]!] }),
      row({ answers: [...row().answers, ...legacy] }),
      row({
        answers: [
          ...row().answers,
          { fieldId: "old3", label: "budget", type: "text", value: "$9" },
        ],
      }),
    ];
    const parsed = parseRaw(buildFormCsv(definition, rows));
    const fieldsOut = parsed.meta.fields!;
    expect(fieldsOut.slice(-2)).toEqual(["Budget", "Email (previous)"]);
    expect(parsed.data.map((r) => r.Budget)).toEqual(["$500", "$500", "$9"]);
    expect(parsed.data[1]!["Email (previous)"]).toBe("old@x.co");
    expect(parsed.data[1]!.Email).toBe("ada@example.com");
  });
});

describe("parseFormCsv", () => {
  it("round-trips build → parse", () => {
    const csv = buildFormCsv(definition, [
      row(),
      row({ status: "NEW", tags: [] }),
    ]);
    const result = parseFormCsv(definition, csv);
    expect(result.errors).toEqual([]);
    expect(result.ignoredColumns).toEqual([]);
    expect(result.missingFields).toEqual([]);
    expect(result.matchedColumns).toHaveLength(definition.fields.length);
    expect(result.totalRows).toBe(2);
    expect(result.validRows).toHaveLength(2);
    expect(result.validRows[0]).toEqual({
      submittedAt: new Date("2026-09-01T12:34:56.000Z"),
      status: "ARCHIVED",
      tags: ["VIP", "follow up"],
      values,
    });
    expect(result.validRows[1]).toMatchObject({ status: "NEW", tags: [] });
  });

  it("strips a BOM and matches headers trimmed + case-insensitively", () => {
    const csv = "﻿ name , EMAIL,status,Unknown\nAda,ada@x.co,read,zzz\n";
    const result = parseFormCsv(definition, csv);
    expect(result.matchedColumns.map((c) => c.fieldId)).toEqual([
      "name",
      "email",
    ]);
    expect(result.ignoredColumns).toEqual(["Unknown"]);
    expect(result.missingFields).toContain("Phone");
    expect(result.validRows[0]!.status).toBe("READ");
    expect(result.validRows[0]!.values.name).toBe("Ada");
  });

  it("defaults status to READ and submittedAt to now; accepts non-ISO dates", () => {
    const now = new Date("2026-09-23T00:00:00Z");
    const csv = "Name,Submitted at\nA,\nB,September 5 2026 10:00 UTC\n";
    const result = parseFormCsv(definition, csv, { now });
    expect(result.errors).toEqual([]);
    expect(result.validRows[0]).toMatchObject({
      status: "READ",
      submittedAt: now,
    });
    expect(result.validRows[1]!.submittedAt.toISOString()).toBe(
      "2026-09-05T10:00:00.000Z",
    );
  });

  it("restores a formula-escaped cell but keeps a real leading apostrophe", () => {
    const csv = `Name,Notes\nA,"'=SUM(A1)"\nB,"'90s music"\n`;
    const result = parseFormCsv(definition, csv);
    expect(result.validRows.map((r) => r.values.notes)).toEqual([
      "=SUM(A1)",
      "'90s music",
    ]);
  });

  it("reports one combined message per bad row with spreadsheet row numbers", () => {
    const csv = [
      "Name,Email,Color,Status,Submitted at,Extras",
      "Good,ok@x.co,red,,,",
      "Bad,nope,Purple,Pending,not a date,Alpha;Zeta",
    ].join("\n");
    const result = parseFormCsv(definition, csv);
    expect(result.validRows).toHaveLength(1);
    expect(result.validRows[0]!.values.color).toBe("Red");
    expect(result.errors).toEqual([
      {
        row: 3,
        message: [
          'Submitted at: "not a date" isn\'t a date we can read',
          'Status: "Pending" must be New, Read, or Archived',
          "Email: Enter a valid email address.",
          'Color: "Purple" isn\'t one of the options.',
          'Extras: "Zeta" isn\'t one of the options.',
        ].join("; "),
      },
    ]);
  });

  it("relaxes required fields for imported rows", () => {
    const result = parseFormCsv(definition, "Name,Email\n,only@x.co\n");
    expect(result.errors).toEqual([]);
    expect(result.validRows[0]!.values).toMatchObject({
      name: null,
      agree: null,
      email: "only@x.co",
    });
  });

  it("skips rows that are blank in every matched column", () => {
    const csv = "Name,Email,Status,Other\n,,NEW,x\nAda,,,\n\n,,,\n";
    const result = parseFormCsv(definition, csv);
    expect(result.validRows).toHaveLength(1);
    expect(result.skippedEmptyRows).toBe(1);
    expect(result.totalRows).toBe(2);
  });

  it("refuses files over maxRows with a single file-level error", () => {
    const csv = ["Name", "a", "b", "c"].join("\n");
    const result = parseFormCsv(definition, csv, { maxRows: 2 });
    expect(result.validRows).toEqual([]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]!.row).toBe(0);
    expect(result.errors[0]!.message).toMatch(/at most 2/);
  });

  it("rejects the whole file on an unterminated quote instead of dropping rows", () => {
    const csv = 'Name,Email\nA,a@x.co\n"B,b@x.co\nC,c@x.co\n';
    const result = parseFormCsv(definition, csv);
    expect(result.validRows).toEqual([]);
    expect(result.errors).toEqual([
      {
        row: 0,
        message:
          "This file has mismatched quotes near line 3. Fix the quoting and upload it again.",
      },
    ]);
  });

  it("names the physical line despite blank lines and multi-line cells above it", () => {
    const csv = [
      "Name,Notes",
      "",
      '"Ada","line one',
      'line two"',
      "",
      "Bob,fine",
      '"Cy"x,broken',
      "Dee,after",
    ].join("\r\n");
    const result = parseFormCsv(definition, csv);
    expect(result.validRows).toEqual([]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({ row: 0 });
    expect(result.errors[0]!.message).toMatch(/near line 7\./);
  });

  it("counts lines after stripping a BOM", () => {
    const csv = '\uFEFFName\nA\n"B\n';
    expect(parseFormCsv(definition, csv).errors[0]!.message).toMatch(
      /near line 3\./,
    );
  });

  it("still tolerates field-count mismatches and quoted multi-line cells", () => {
    const csv = 'Name,Email,Notes\nA\nB,b@x.co,"two\nlines",extra\n';
    const result = parseFormCsv(definition, csv);
    expect(result.errors).toEqual([]);
    expect(result.validRows.map((r) => r.values.notes)).toEqual([
      null,
      "two\nlines",
    ]);
  });

  it("errors when no header matches a field, or the file is empty", () => {
    expect(parseFormCsv(definition, "Foo,Bar\n1,2\n").errors[0]).toMatchObject({
      row: 0,
    });
    expect(parseFormCsv(definition, "").errors[0]).toMatchObject({ row: 0 });
    expect(parseFormCsv(definition, "Name\n").errors[0]).toMatchObject({
      row: 0,
    });
  });
});

describe("unescapeCsvCell", () => {
  it("only undoes escapeCsvCell's prefix", () => {
    expect(unescapeCsvCell("'=1+1")).toBe("=1+1");
    expect(unescapeCsvCell("'@x")).toBe("@x");
    expect(unescapeCsvCell("'  -abc")).toBe("  -abc");
    expect(unescapeCsvCell("'-5")).toBe("'-5"); // numbers are never escaped
    expect(unescapeCsvCell("'hello")).toBe("'hello");
    expect(unescapeCsvCell("plain")).toBe("plain");
  });
});

describe("generateFormCsvFilename", () => {
  it("slugs the name and appends the date", () => {
    const now = new Date("2026-09-23T10:00:00Z");
    expect(generateFormCsvFilename("Contact Us!", now)).toBe(
      "contact-us-entries-2026-09-23.csv",
    );
    expect(generateFormCsvFilename("!!!", now)).toBe(
      "form-entries-2026-09-23.csv",
    );
  });
});
