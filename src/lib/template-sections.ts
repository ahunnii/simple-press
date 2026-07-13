import type { TemplateField, TemplatePage } from "~/lib/template-fields";
import {
  getGroupMetadata,
  groupFieldsByGroup,
  groupFieldsByPage,
} from "~/lib/template-fields";
import { coopSections } from "~/app/(storefront)/_templates/coop/sections";
import { defaultTemplateSections } from "~/app/(storefront)/_templates/default/sections";
import { happyBambooSections } from "~/app/(storefront)/_templates/happy-bamboo/sections";
import { viiSections } from "~/app/(storefront)/_templates/vii/sections";

/**
 * A "section" is an owner-facing, hideable/orderable unit of a storefront
 * page — usually one field group rendered inside one page. Section `id`
 * MUST equal the corresponding `data-sp-group` value (see
 * `~/lib/preview/section-attrs.ts`), i.e. `"${page}.${group}"`, so the
 * preview overlay and the section registry stay in sync.
 */
export type TemplateSection = {
  id: string;
  page: TemplatePage;
  title: string;
  description?: string;
  /** TemplateFieldGroup ids rendered in the field panel (usually [id]). */
  groupIds: string[];
  /** Template-default order. Reorder UI is deferred to a later phase. */
  order: number;
  /** Whether the owner may toggle this section's visibility. Default false. */
  hideable?: boolean;
  defaultHidden?: boolean;
};

/**
 * Curated section registries per template. Templates absent from this map
 * fall back to derivation from the existing field-group system (see
 * `getSectionsForTemplate`).
 */
export const TEMPLATE_SECTIONS: Record<string, TemplateSection[]> = {
  ...defaultTemplateSections,
  ...happyBambooSections,
  ...viiSections,
  ...coopSections,
};

function humanizeGroupKey(key: string): string {
  if (!key) return "";
  return key.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Derives one section per field group per page, in declaration order.
 * Fields on a page with no `group` are collected into a trailing synthetic
 * "Other" section (`"${page}.__other"`).
 */
function deriveSectionsForTemplate(templateId: string): TemplateSection[] {
  const byPage = groupFieldsByPage(templateId);
  const sections: TemplateSection[] = [];

  for (const pageKey of Object.keys(byPage)) {
    const fields: TemplateField[] = byPage[pageKey] ?? [];
    if (fields.length === 0) continue;

    const page = pageKey as TemplatePage;
    const byGroup = groupFieldsByGroup(fields);

    let order = 0;
    for (const groupKey of Object.keys(byGroup)) {
      const groupFields = byGroup[groupKey];
      if (!groupFields || groupFields.length === 0) continue;

      if (groupKey === "ungrouped") {
        // Handled below as the trailing synthetic "Other" section, once,
        // after all real groups, to preserve declaration order semantics.
        continue;
      }

      // `field.group` values are already fully qualified ("${page}.${group}"),
      // matching both TemplateFieldGroup.id and data-sp-group hotspot values.
      const groupId = groupKey;
      const metadata = getGroupMetadata(templateId, groupId);
      const bareKey = groupKey.startsWith(`${page}.`)
        ? groupKey.slice(page.length + 1)
        : groupKey;
      sections.push({
        id: groupId,
        page,
        title: metadata?.title ?? humanizeGroupKey(bareKey),
        description: metadata?.description,
        groupIds: [groupId],
        order: order++,
        hideable: false,
      });
    }

    const ungrouped = byGroup.ungrouped;
    if (ungrouped && ungrouped.length > 0) {
      const otherId = `${page}.__other`;
      sections.push({
        id: otherId,
        page,
        title: "Other",
        groupIds: [otherId],
        order: order++,
        hideable: false,
      });
    }
  }

  return sections;
}

/**
 * Returns the sections for a template. Curated `TEMPLATE_SECTIONS` entries
 * take precedence; derived sections (one per field group per page) fill in
 * any groups the curation does not cover, so partially-curated templates can
 * never orphan editable fields. Templates with no curated entry get the
 * fully derived set.
 */
export function getSectionsForTemplate(templateId: string): TemplateSection[] {
  const derived = deriveSectionsForTemplate(templateId);
  const curated = TEMPLATE_SECTIONS[templateId];
  if (!curated || curated.length === 0) return derived;

  const curatedGroupIds = new Set(curated.flatMap((s) => s.groupIds));
  const maxOrderByPage = new Map<string, number>();
  for (const s of curated) {
    maxOrderByPage.set(
      s.page,
      Math.max(maxOrderByPage.get(s.page) ?? -1, s.order),
    );
  }

  // Derived fillers slot in after the curated sections of their page.
  const extras = derived
    .filter((s) => s.groupIds.some((g) => !curatedGroupIds.has(g)))
    .map((s) => {
      const base = (maxOrderByPage.get(s.page) ?? -1) + 1;
      maxOrderByPage.set(s.page, base);
      return { ...s, order: base };
    });

  return [...curated, ...extras];
}

/** Looks up a single section by id within a template's section list. */
export function getSectionById(
  templateId: string,
  sectionId: string,
): TemplateSection | undefined {
  return getSectionsForTemplate(templateId).find((s) => s.id === sectionId);
}
