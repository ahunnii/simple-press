import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";

/**
 * Field/group/section module for the relocation `GenericPage` slot (CMS
 * pages rendered at `/[slug]`).
 *
 * design.md → "Generic (CMS pages)" is deliberately minimal: "1. Compact wave
 * hero — page title. 2. Prose body (Tiptap content), `PlatformPolicyNotice`
 * where applicable." There is no owner-editable copy beyond what the CMS
 * `Page` record itself already provides (title/excerpt/content — edited in
 * `/admin/content`, not the visual editor) — matching the `GenericPage`
 * playbook's baseline ("Typical sections + field groups: none — purely CMS
 * content, no template fields") and every other template's GenericPage
 * (coop's CMS-mode branch, builders, default, vii all ship zero fields for
 * this slot too).
 *
 * Exported empty per the house export contract so the orchestrator's future
 * root aggregation can spread these in uniformly with every other page module
 * without a special case.
 */

export const relocationGenericData: TemplateField[] = [];

export const relocationGenericFieldGroups: TemplateFieldGroup[] = [];

export const relocationGenericSections: TemplateSection[] = [];
