import { describe, expect, it } from "vitest";

import { escapeCsvCell, sanitizeCsvRows } from "./escape-cell";

describe("escapeCsvCell — full mode (default)", () => {
  it.each([
    ["=SUM(A1:A2)", "'=SUM(A1:A2)"],
    ["+HYPERLINK(...)", "'+HYPERLINK(...)"],
    ["-HYPERLINK(...)", "'-HYPERLINK(...)"],
    ["@SUM(1+1)", "'@SUM(1+1)"],
    ["\tcmd", "'\tcmd"],
    ["\rcmd", "'\rcmd"],
  ])("escapes a value starting with %j", (input, expected) => {
    expect(escapeCsvCell(input)).toBe(expected);
  });

  it("leaves a pure negative decimal amount untouched", () => {
    expect(escapeCsvCell("-5.00")).toBe("-5.00");
  });

  it("leaves a pure negative integer untouched", () => {
    expect(escapeCsvCell("-12")).toBe("-12");
  });

  it("escapes a space-separated phone number even though it starts with +", () => {
    expect(escapeCsvCell("+1 555 123 4567")).toBe("'+1 555 123 4567");
  });

  it("escapes a lone hyphen", () => {
    expect(escapeCsvCell("-")).toBe("'-");
  });

  it("escapes a double hyphen", () => {
    expect(escapeCsvCell("--")).toBe("'--");
  });

  it("escapes a dangerous value with leading whitespace", () => {
    expect(escapeCsvCell("  =cmd")).toBe("'  =cmd");
  });

  it("leaves an ordinary string untouched", () => {
    expect(escapeCsvCell("Jane Doe")).toBe("Jane Doe");
  });

  it("leaves an empty string untouched", () => {
    expect(escapeCsvCell("")).toBe("");
  });

  it.each([42, -3.5, null, undefined, true, false])(
    "passes non-string value %j through unchanged",
    (value) => {
      expect(escapeCsvCell(value)).toBe(value);
    },
  );
});

describe("escapeCsvCell — wordpress mode", () => {
  it.each([
    ["=SUM(A1:A2)", "'=SUM(A1:A2)"],
    ["@SUM(1+1)", "'@SUM(1+1)"],
    ["\tcmd", "'\tcmd"],
    ["\rcmd", "'\rcmd"],
  ])("still escapes %j", (input, expected) => {
    expect(escapeCsvCell(input, { mode: "wordpress" })).toBe(expected);
  });

  it("never escapes a value starting with +", () => {
    expect(escapeCsvCell("+1 555 123 4567", { mode: "wordpress" })).toBe(
      "+1 555 123 4567",
    );
  });

  it("never escapes a value starting with -", () => {
    expect(escapeCsvCell("-5.00", { mode: "wordpress" })).toBe("-5.00");
    expect(escapeCsvCell("-HYPERLINK(...)", { mode: "wordpress" })).toBe(
      "-HYPERLINK(...)",
    );
  });

  it("passes non-string values through unchanged", () => {
    expect(escapeCsvCell(42, { mode: "wordpress" })).toBe(42);
    expect(escapeCsvCell(null, { mode: "wordpress" })).toBe(null);
  });
});

describe("sanitizeCsvRows", () => {
  it("escapes dangerous string fields while preserving keys and row order", () => {
    const rows = [
      { name: "=cmd", email: "a@example.com", count: 3 },
      { name: "Jane", email: "jane@example.com", count: 1 },
    ];
    const result = sanitizeCsvRows(rows);
    expect(result).toEqual([
      { name: "'=cmd", email: "a@example.com", count: 3 },
      { name: "Jane", email: "jane@example.com", count: 1 },
    ]);
    expect(Object.keys(result[0]!)).toEqual(["name", "email", "count"]);
  });

  it("preserves non-string values (numbers, null, booleans) untouched", () => {
    const rows = [
      { qty: 5, active: true, note: null as string | null, label: "-9" },
    ];
    const result = sanitizeCsvRows(rows);
    expect(result[0]!.qty).toBe(5);
    expect(result[0]!.active).toBe(true);
    expect(result[0]!.note).toBe(null);
    // "-9" is purely numeric, so full mode leaves it untouched too.
    expect(result[0]!.label).toBe("-9");
  });

  it("respects wordpress mode across a full row", () => {
    const rows = [{ phone: "+15551234567", note: "=cmd" }];
    const result = sanitizeCsvRows(rows, { mode: "wordpress" });
    expect(result[0]!.phone).toBe("+15551234567");
    expect(result[0]!.note).toBe("'=cmd");
  });

  it("does not mutate the input rows", () => {
    const rows = [{ name: "=cmd" }];
    sanitizeCsvRows(rows);
    expect(rows[0]!.name).toBe("=cmd");
  });
});
