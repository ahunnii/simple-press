import { listRowsFromDefaults } from "~/lib/lucide-template-icons";
import {
  getListFieldValue,
  parseTemplateListRows,
} from "~/lib/template-fields";

/** One numbered step, ready to render. Plain strings, safe to pass to a client component. */
export type DreamStepItem = {
  heading: string;
  body: string;
};

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toStep(row: Record<string, unknown>): DreamStepItem {
  return { heading: clean(row.heading), body: clean(row.body) };
}

/**
 * Resolves one of dream's three numbered step lists (homepage "From idea to
 * theme", about "Consultation", contact "What happens next"): the saved list
 * at `key` (rows with a heading or a description are kept, fully blank rows
 * dropped), otherwise the field's built-in `defaultRows`.
 *
 * `defaultRows` is passed in (each field's constant lives in its page's
 * `index.ts`) so this shared module never imports a page registry. The old
 * numbered keys (`...-step-N-heading` / `-body`) are retired (2026-10-05,
 * `RETIRED_TEMPLATE_KEYS`) and deliberately NOT read.
 */
export function resolveDreamStepsList(
  customFields: unknown,
  key: string,
  defaultRows: readonly Record<string, string>[],
): DreamStepItem[] {
  const saved = getListFieldValue(customFields, key);
  if (saved) {
    const kept = parseTemplateListRows(saved)
      .map(toStep)
      .filter((step) => step.heading !== "" || step.body !== "");
    if (kept.length > 0) return kept;
  }

  return listRowsFromDefaults(defaultRows, "step").map(toStep);
}
