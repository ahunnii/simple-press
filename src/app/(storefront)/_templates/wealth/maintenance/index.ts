import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";

/**
 * MaintenancePage renders the platform-configured maintenance/coming-soon
 * message and CTA (`StorefrontMaintenance`, resolved server-side from
 * `Business.maintenanceMessage`/`maintenanceCta` — a platform settings
 * surface, not a template field). vii's maintenance slot declares no
 * template fields either. Exported as empty arrays only so Phase 4's
 * aggregation stays uniform across every domain.
 */

export const wealthMaintenanceData: TemplateField[] = [];

export const wealthMaintenanceFieldGroups: TemplateFieldGroup[] = [];

export const wealthMaintenanceSections: TemplateSection[] = [];
