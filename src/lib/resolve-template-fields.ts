import type { TemplateField } from "~/lib/template-fields";
import { safeHref } from "~/lib/safe-href";

/**
 * `SiteContent.customFields` is `z.any()` on the wire by design (its shape
 * varies per template), so it is the one owner-editable surface with no
 * write-time link validation. This is the read-time gate for it: every field
 * the registry declares as `type: "url"` — 100+ of them across the templates —
 * is run through the scheme allowlist before a template can render it as an
 * `href`, and an unsafe value collapses to `""` so the usual
 * `f["key"] || "/fallback"` pattern picks up the fallback.
 *
 * Platform-authored `defaultValue`s go through the same call. They are
 * trusted, but running them uniformly keeps the rule in one branch.
 */
export function resolveTemplateFields(
  customFields: unknown,
  keys: string[],
  fieldMap: Map<string, TemplateField>,
): Record<string, string> {
  const raw =
    customFields != null &&
    typeof customFields === "object" &&
    !Array.isArray(customFields)
      ? (customFields as Record<string, string>)
      : {};
  const out: Record<string, string> = {};
  for (const key of keys) {
    const value = raw[key];
    const custom = typeof value === "string" ? value.trim() : undefined;
    const field = fieldMap.get(key);
    const resolved = custom ?? field?.defaultValue ?? "";
    out[key] = field?.type === "url" ? (safeHref(resolved) ?? "") : resolved;
  }
  return out;
}
