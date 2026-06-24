import type { TemplateField } from "~/lib/template-fields";

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
    out[key] = custom ?? fieldMap.get(key)?.defaultValue ?? "";
  }
  return out;
}
