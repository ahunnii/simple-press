import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";

/**
 * `GenericPage` slot for pink — deliberately EMPTY. Per design.md →
 * "Generic page — generalized from Circles.dc.html", this slot renders
 * arbitrary CMS `Page` records: everything content-shaped comes straight off
 * the `Page` record (title, excerpt, content, image), and the only
 * owner-editable chrome around it — the header's fact rows
 * (`global.page-facts`) and the sidebar CTA + contact note
 * (`global.page-sidebar`) — already lives in `_templates/pink/layout/index.ts`
 * (declared `page: "global"` because the `TemplatePage` union has no
 * `generic` member; the generic page just consumes those fields).
 *
 * This module exists only so the root aggregator has a consistent
 * `pinkGeneric*` name to spread in, per the export contract — it
 * contributes no new fields, groups, or sections. Mirrors
 * `coop/generic/index.ts`'s CMS-mode half.
 */
export const pinkGenericData: TemplateField[] = [];
export const pinkGenericFieldGroups: TemplateFieldGroup[] = [];
export const pinkGenericSections: TemplateSection[] = [];
