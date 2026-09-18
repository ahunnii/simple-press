import { parseTemplateListRows } from "~/lib/template-fields";

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
 * `list` fields have no `defaultValue` slot in the schema, so the fallback
 * checklist (design.md "Per-page section concepts › Homepage" #5) lives
 * here, not in `index.ts`.
 */
export const DREAM_QUOTE_CHIPS_FALLBACK: string[] = [
  "Date + time",
  "Location",
  "Theme",
  "Colors",
  "Draping",
  "Rentals",
  "Space photos",
  "Full decor?",
];

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
