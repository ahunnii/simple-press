import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";

/**
 * MaintenancePage reads `StorefrontMaintenance` (the platform's
 * business-scope maintenance config, edited in the platform admin, not the
 * visual editor) plus email/phone/address and social links from Settings and
 * Branding — it defines no template fields of its own. Exported as empty
 * arrays only so the registry's aggregation stays uniform across every domain
 * (mirrors `dream/maintenance/index.ts`). The one field it reads,
 * `bamboo.homepage.hero-bg-image`, is declared by the homepage domain.
 */

export const bambooMaintenanceData: TemplateField[] = [];

export const bambooMaintenanceFieldGroups: TemplateFieldGroup[] = [];

export const bambooMaintenanceSections: TemplateSection[] = [];
