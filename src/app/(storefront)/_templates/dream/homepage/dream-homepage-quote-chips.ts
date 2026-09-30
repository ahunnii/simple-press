import { parseTemplateListRows } from "~/lib/template-fields";

import { DREAM_QUOTE_CHIPS_DEFAULT_ROWS } from "./index";

/**
 * List-row parser for `dream.homepage.quote-chips`.
 *
 * Split out of `./index.ts` on purpose: `parseTemplateListRows` is a RUNTIME
 * import from `~/lib/template-fields`, and that module aggregates every
 * template's field registry — including this template's root `../index.ts`,
 * which imports `./index.ts`. Keeping the runtime helper import in the field
 * module would create a circular-evaluation TDZ crash (same reasoning as
 * `wealth/homepage/wealth-homepage-news.ts`).
 *
 * The fallback checklist (design.md "Per-page section concepts › Homepage"
 * #5) is declared once, in the field itself, via
 * `DREAM_QUOTE_CHIPS_DEFAULT_ROWS` (`dream.homepage.quote-chips`'s
 * `defaultRows` in `./index.ts`) — this constant just reshapes those rows
 * into the flat string list this module's callers use.
 */
export const DREAM_QUOTE_CHIPS_FALLBACK: string[] =
  DREAM_QUOTE_CHIPS_DEFAULT_ROWS.map((row) => row.label ?? "");

function readLabel(row: Record<string, unknown>): string {
  const value = row.label;
  return typeof value === "string" ? value.trim() : "";
}

export function toDreamQuoteChips(raw: unknown): string[] {
  const labels = parseTemplateListRows(raw)
    .map(readLabel)
    .filter((label) => label !== "");
  return labels.length > 0 ? labels : DREAM_QUOTE_CHIPS_FALLBACK;
}
