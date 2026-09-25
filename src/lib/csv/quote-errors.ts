import type { ParseError } from "papaparse";

/**
 * File-level message for Papa `Quotes` errors, or `null` when there are none.
 *
 * Bad quoting should reject the whole file: an unterminated quote swallows
 * every later line into one cell, so rows would silently go missing. Papa's
 * `error.row` counts the header and skipped blank lines (and a quoted cell
 * spanning lines throws it off further), so the problem is located from the
 * error's character offset into `text` — the exact string given to Papa.
 */
export function mismatchedQuotesMessage(
  text: string,
  errors: ParseError[],
): string | null {
  const quoteErrors = errors.filter((error) => error.type === "Quotes");
  if (quoteErrors.length === 0) return null;
  const offsets = quoteErrors
    .map((error) => error.index)
    .filter((index): index is number => typeof index === "number");
  const near =
    offsets.length > 0
      ? ` near line ${lineNumberAt(text, Math.min(...offsets))}`
      : "";
  return `This file has mismatched quotes${near}. Fix the quoting and upload it again.`;
}

/** 1-based physical line of `text` containing character `offset`. */
function lineNumberAt(text: string, offset: number): number {
  return (text.slice(0, offset).match(/\r\n|\r|\n/g)?.length ?? 0) + 1;
}
