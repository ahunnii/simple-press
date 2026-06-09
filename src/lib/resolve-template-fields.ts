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
    const custom = raw[key]?.trim();
    out[key] = custom ?? fieldMap.get(key)?.defaultValue ?? "";
  }
  return out;
}
