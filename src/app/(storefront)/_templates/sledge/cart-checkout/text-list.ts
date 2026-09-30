import {
  getListFieldValue,
  parseTemplateListRows,
} from "~/lib/template-fields";

/**
 * Kept out of `cart-fields.ts` on purpose: `~/lib/template-fields` imports
 * the template root, which imports `cart-fields.ts`, so the field module
 * must not import runtime values from it.
 */

/** One rendered row of a text list, keeping its saved-list position. */
export type SledgeTextRow = { text: string; index: number };

/**
 * Resolves a `{ text }` list field to plain rows. Matches the shared parse
 * helpers' `defaultsWhenEmpty` semantics: nothing saved, or a saved list
 * with no usable rows, falls back to the built-in rows. `index` is the row's
 * position in the SAVED list (for `listItemAttr`); built-in rows use their
 * own position, which the editor ignores as out of range.
 */
export function resolveSledgeTextList(
  customFields: unknown,
  key: string,
  defaults: readonly string[],
): SledgeTextRow[] {
  const saved = parseTemplateListRows(getListFieldValue(customFields, key))
    .map((row, index) => ({
      text: typeof row.text === "string" ? row.text.trim() : "",
      index,
    }))
    .filter((row) => row.text.length > 0);
  if (saved.length > 0) return saved;
  return defaults.map((text, index) => ({ text, index }));
}
