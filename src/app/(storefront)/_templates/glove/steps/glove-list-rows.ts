import { listRowsFromDefaults } from "~/lib/lucide-template-icons";
import {
  getListFieldValue,
  parseTemplateListRows,
} from "~/lib/template-fields";

/** One list row with every cell coerced to a trimmed string. */
export type GloveRow = Record<string, string> & { _id: string };

/**
 * Resolves a `list` template field to plain string rows: the saved rows when
 * the owner has any, otherwise the field's own `defaultRows`.
 *
 * `defaultRows` live in each page's field module (not here) so this resolver
 * can import them without a circular import back through the field registry.
 */
export function resolveGloveListRows(
  customFields: unknown,
  key: string,
  defaultRows: readonly Record<string, string>[],
  idPrefix: string,
): GloveRow[] {
  const saved = getListFieldValue(customFields, key);
  if (saved && saved.length > 0) {
    return parseTemplateListRows(saved).map((row, index) => {
      const out: Record<string, string> = {};
      for (const [cell, value] of Object.entries(row)) {
        out[cell] = typeof value === "string" ? value.trim() : "";
      }
      return { ...out, _id: row._id ?? `${idPrefix}-${index + 1}` };
    });
  }
  return listRowsFromDefaults(defaultRows, idPrefix);
}
