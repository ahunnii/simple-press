import type { TemplateListRow } from "~/lib/template-fields";

/** Reads a string prop off a parsed template list row, defaulting to "". */
export function rowStr(row: TemplateListRow, key: string): string {
  const value = row[key];
  return typeof value === "string" ? value : "";
}

/** Reads a numeric-looking string prop off a row, defaulting to `fallback`. */
export function rowNum(
  row: TemplateListRow,
  key: string,
  fallback: number,
): number {
  const parsed = Number.parseFloat(rowStr(row, key));
  return Number.isFinite(parsed) ? parsed : fallback;
}
