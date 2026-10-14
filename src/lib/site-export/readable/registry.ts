/**
 * Bridge to the storefront template registries (`~/lib/template-fields`,
 * `~/lib/service-templates`, `~/lib/template-themes`). These modules are plain
 * data + pure helpers (the same ones the admin editor and the store-transfer
 * code import), so they are safe to load from a server-side builder. They are
 * isolated here so every renderer stays registry-free and unit-testable with
 * tiny literals.
 */
import { getThemeSelection } from "~/lib/sp-meta";
import {
  SERVICE_TEMPLATE_FIELD_GROUPS,
  SERVICE_TEMPLATE_FIELDS,
} from "~/lib/service-templates";
import {
  PAGE_METADATA,
  RETIRED_TEMPLATE_KEYS,
  TEMPLATE_FIELD_GROUPS,
  TEMPLATE_FIELDS,
} from "~/lib/template-fields";
import { getTemplateTheme } from "~/lib/template-themes";
import { humanize } from "./shared";
import type { FieldDef, FieldRegistry, SiteDetailsInput } from "./types";

export function templateLabel(templateId: string): string {
  return humanize(templateId);
}

/** Field definitions + labels for a storefront template. */
export function getFieldRegistry(templateId: string): FieldRegistry {
  const fields = TEMPLATE_FIELDS[templateId];
  const groupTitles: Record<string, string> = {};
  for (const g of TEMPLATE_FIELD_GROUPS[templateId] ?? []) {
    groupTitles[g.id] = g.title;
  }
  const pageTitles: Record<string, string> = {};
  for (const [key, meta] of Object.entries(PAGE_METADATA)) {
    pageTitles[key] = meta.title;
  }
  return {
    templateId,
    templateLabel: templateLabel(templateId),
    fields: (fields ?? []) as FieldDef[],
    groupTitles,
    pageTitles,
    resolved: Boolean(fields),
    retiredKeys: RETIRED_TEMPLATE_KEYS,
  };
}

/** Field definitions for a service page template (by `Service.serviceTemplateId`). */
export function getServiceFieldInfo(serviceTemplateId: string): {
  fields: FieldDef[];
  groupTitles: Record<string, string>;
} {
  const groupTitles: Record<string, string> = {};
  for (const g of SERVICE_TEMPLATE_FIELD_GROUPS[serviceTemplateId] ?? []) {
    groupTitles[g.id] = g.title;
  }
  return {
    fields: (SERVICE_TEMPLATE_FIELDS[serviceTemplateId] ?? []) as FieldDef[],
    groupTitles,
  };
}

/** The palette/font pairing the owner picked in the visual editor, as labels. */
export function resolveThemeLabels(
  templateId: string,
  customFields: unknown,
): SiteDetailsInput["theme"] {
  const empty = {
    paletteLabel: null,
    paletteColors: [] as string[],
    fontsLabel: null,
    fontVars: {} as Record<string, string>,
  };
  const theme = getTemplateTheme(templateId);
  if (!theme) return empty;
  const sel = getThemeSelection(customFields);
  const palette = sel.palette
    ? theme.palettes.find((p) => p.id === sel.palette)
    : undefined;
  const fonts = sel.fonts ? theme.fonts.find((f) => f.id === sel.fonts) : undefined;
  return {
    paletteLabel: palette?.label ?? null,
    paletteColors: palette ? [...palette.swatch] : [],
    fontsLabel: fonts?.label ?? null,
    fontVars: fonts?.cssVars ?? {},
  };
}
