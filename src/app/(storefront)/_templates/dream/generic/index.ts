import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";

/**
 * GenericPage renders arbitrary CMS `Page` records (any published page not
 * covered by a dedicated slot), not owner-editable template fields. Per the
 * GenericPage playbook entry ("Typical sections + field groups: none —
 * purely CMS content, no template fields") and design.md's own GenericPage
 * note, this domain contributes no fields/groups/sections — exported as
 * empty arrays only so Phase 4's aggregation stays uniform across every
 * domain (mirrors `wealth/generic/index.ts`).
 */

export const dreamGenericData: TemplateField[] = [];

export const dreamGenericFieldGroups: TemplateFieldGroup[] = [];

export const dreamGenericSections: TemplateSection[] = [];
