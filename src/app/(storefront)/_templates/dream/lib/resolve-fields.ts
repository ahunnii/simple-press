import type { TemplateField } from "~/lib/template-fields";
import { resolveTemplateFields } from "~/lib/resolve-template-fields";

import { dreamGlobalData } from "../global";

/**
 * Reads `dream.global.*` custom fields for the chrome (layout, header, nav
 * overlay, footer, maintenance page). The declarations — and so the
 * defaults — live in `../global/index.ts`, which imports no page modules, so
 * chrome can resolve them without importing the root `../index.ts` registry.
 *
 * Delegates to the shared `resolveTemplateFields`: an unset key gets its
 * declared default, a saved blank stays blank (the owner cleared it, so the
 * element hides), and `type: "url"` values go through `safeHref`.
 */
const DREAM_GLOBAL_FIELD_MAP = new Map<string, TemplateField>(
  dreamGlobalData.map((field) => [field.key, field]),
);

export function resolveDreamFields(
  customFields: unknown,
  keys: string[],
): Record<string, string> {
  return resolveTemplateFields(customFields, keys, DREAM_GLOBAL_FIELD_MAP);
}
