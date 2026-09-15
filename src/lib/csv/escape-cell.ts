/**
 * CSV formula-injection guard.
 *
 * Spreadsheet apps (Excel, Google Sheets, LibreOffice) evaluate a cell as a
 * formula when it begins with `=`, `+`, `-`, `@`, a tab, or a carriage return
 * — even when the cell is quoted, since the quoting only affects CSV parsing,
 * not the spreadsheet app's own formula detection once the cell is opened.
 * Every CSV export in this app can embed customer-supplied free text (names,
 * notes, addresses, review comments), so a malicious customer name like
 * `=HYPERLINK(...)` or `@SUM(1+1)*cmd|' /C calc'!A0` can execute in the
 * owner's (or, for WordPress exports, the receiving site admin's) spreadsheet
 * the moment the export is opened.
 *
 * The standard mitigation is to prefix a dangerous cell with a single `'`
 * (apostrophe), which every major spreadsheet app treats as "render this
 * literally as text" without the character itself becoming part of the
 * displayed value.
 */

/** Prefixes spreadsheet apps treat as the start of a formula. */
const DANGEROUS_PREFIXES_FULL = ["=", "+", "-", "@", "\t", "\r"] as const;

/**
 * WordPress/WooCommerce import mode omits `+`/`-`: a phone number, a
 * negative quantity, or a "+15551234567"-style value is common and
 * legitimate in that pipeline, and prefixing it with `'` would carry a
 * literal apostrophe into the imported field on the new site (WordPress's
 * importer has no spreadsheet-formula concept to strip it back out).
 */
const DANGEROUS_PREFIXES_WORDPRESS = ["=", "@", "\t", "\r"] as const;

export interface EscapeCsvCellOptions {
  /**
   * `"full"` (default) — escape all six dangerous prefixes; used for exports
   * an owner opens directly in a spreadsheet app (admin order/customer
   * exports, marketing list exports).
   *
   * `"wordpress"` — escape only `=`/`@`/tab/CR, never `+`/`-`; used for
   * exports whose destination is the WordPress/WooCommerce CSV importer,
   * where a leading `'` would be carried through as a literal character
   * rather than stripped by a spreadsheet app.
   */
  mode?: "full" | "wordpress";
}

/**
 * Returns `true` when `value` is nothing but a number once parsed — leading
 * `+`/`-`, a decimal point, and surrounding whitespace are fine, but any
 * other non-numeric content (including internal whitespace, as in a
 * space-separated phone number) makes it `false`.
 */
function isPurelyNumeric(value: string): boolean {
  return Number.isFinite(Number(value.trim()));
}

/**
 * Escape a single CSV cell value against formula injection.
 *
 * Only string values are ever touched — numbers, booleans, `null`,
 * `undefined`, dates, etc. pass through unchanged, since Papa Parse only
 * formula-evaluates cells that render as leading-`=`/`+`/`-`/`@`/tab/CR text
 * in the first place.
 *
 * The dangerous-prefix check strips leading whitespace first (`  =cmd` is
 * still a live formula in Excel, which trims before evaluating), but the `'`
 * guard is prefixed onto the ORIGINAL string — including any leading
 * whitespace — so the whole cell round-trips as literal text.
 */
export function escapeCsvCell(
  value: unknown,
  opts?: EscapeCsvCellOptions,
): unknown {
  if (typeof value !== "string") return value;

  const mode = opts?.mode ?? "full";
  const dangerousPrefixes =
    mode === "wordpress"
      ? DANGEROUS_PREFIXES_WORDPRESS
      : DANGEROUS_PREFIXES_FULL;

  // Strip only leading ASCII spaces here — tab and CR are themselves two of
  // the dangerous prefixes being checked for, so a general `\s` strip would
  // eat them before the `startsWith` check ever saw them.
  const checkValue = value.replace(/^ +/, "");
  const isDangerous = dangerousPrefixes.some((prefix) =>
    checkValue.startsWith(prefix),
  );
  if (!isDangerous) return value;

  // A pure number that happens to start with `+`/`-` (a signed amount, a
  // phone number with no separators) is not a formula and must round-trip
  // unchanged — only in "full" mode, since "wordpress" mode never treats
  // `+`/`-` as dangerous to begin with.
  if (isPurelyNumeric(value)) return value;

  return `'${value}`;
}

/**
 * Map every string value of every row through `escapeCsvCell`, preserving
 * keys, row order, and every non-string value untouched. Call this
 * immediately before `Papa.unparse(rows, ...)`.
 */
export function sanitizeCsvRows<T extends Record<string, unknown>>(
  rows: T[],
  opts?: EscapeCsvCellOptions,
): T[] {
  return rows.map((row) => {
    const sanitized = { ...row };
    for (const key of Object.keys(sanitized) as Array<keyof T>) {
      sanitized[key] = escapeCsvCell(sanitized[key], opts) as T[keyof T];
    }
    return sanitized;
  });
}

/**
 * Array-of-arrays counterpart to `sanitizeCsvRows`, for any `Papa.unparse`
 * call site that passes rows as arrays of cell values rather than row
 * objects.
 */
export function sanitizeCsvMatrix(
  rows: unknown[][],
  opts?: EscapeCsvCellOptions,
): unknown[][] {
  return rows.map((row) => row.map((cell) => escapeCsvCell(cell, opts)));
}
