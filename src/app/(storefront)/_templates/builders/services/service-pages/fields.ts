/**
 * Builders-specific service-page template field definitions.
 *
 * One template:
 *   builders-craft — Industrial Solidarity service detail page
 *
 * Field key convention: "<def-id>.<field-slug>"
 * page: "homepage" — per-service-field convention (matches vii's pattern).
 */
import type { ServiceTemplateDef } from "~/lib/service-templates";
import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import { resolveTemplateFields } from "~/lib/resolve-template-fields";

// ─── builders-craft ──────────────────────────────────────────────────────────

export const buildersCraftFields: TemplateField[] = [
  {
    key: "builders-craft.cta-heading",
    label: "CTA Heading",
    description:
      "Large uppercase heading in the closing call-to-action section of the service detail page.",
    type: "text",
    page: "homepage",
    group: "builders-craft.cta",
    gridColumn: "col-span-1",
    defaultValue: "Ready to discuss your project?",
    placeholder: "e.g. Ready to discuss your project?",
  },
  {
    key: "builders-craft.cta-button-label",
    label: "CTA Button Label",
    description: "Label for the primary action button in the closing CTA.",
    type: "text",
    page: "homepage",
    group: "builders-craft.cta",
    gridColumn: "col-span-1",
    defaultValue: "Start a Conversation",
    placeholder: "e.g. Start a Conversation",
  },
  {
    key: "builders-craft.cta-button-href",
    label: "CTA Button Link",
    description: "URL the CTA button links to.",
    type: "url",
    page: "homepage",
    group: "builders-craft.cta",
    gridColumn: "col-span-1",
    defaultValue: "/contact",
    placeholder: "/contact",
  },
];

const buildersCraftFieldGroups: TemplateFieldGroup[] = [
  {
    id: "builders-craft.cta",
    title: "Closing Call to Action",
    description:
      "Heading and button for the CTA section at the bottom of every service detail page",
    icon: "📣",
    columns: 1,
  },
];

// ─── Bound resolver ───────────────────────────────────────────────────────────

const _craftFieldMap = new Map<string, TemplateField>(
  buildersCraftFields.map((f) => [f.key, f]),
);

export function resolveCraftFields(
  customFields: unknown,
  keys: string[],
): Record<string, string> {
  return resolveTemplateFields(customFields, keys, _craftFieldMap);
}

// ─── Exported defs ────────────────────────────────────────────────────────────

export const buildersServiceTemplateDefs: ServiceTemplateDef[] = [
  {
    id: "builders-craft",
    label: "Craft (Industrial)",
    description:
      "Industrial Solidarity service detail layout: typographic hero, a two-column sub-services grid (name + description), and a direct CTA.",
    fields: buildersCraftFields,
    fieldGroups: buildersCraftFieldGroups,
  },
];
