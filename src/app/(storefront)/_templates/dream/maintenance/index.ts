import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";

/**
 * MaintenancePage reads `StorefrontMaintenance` (the platform's
 * business-scope maintenance config, edited in the platform admin, not the
 * visual editor) plus email/phone/hours from Settings — it defines no
 * template fields of its own. Exported as empty arrays only so Phase 4's
 * aggregation stays uniform across every domain (mirrors
 * `wealth/maintenance/index.ts`).
 */

export const dreamMaintenanceData: TemplateField[] = [];

export const dreamMaintenanceFieldGroups: TemplateFieldGroup[] = [];

export const dreamMaintenanceSections: TemplateSection[] = [];
