import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import { resolveTemplateFields } from "~/lib/resolve-template-fields";

import {
  buildersHomepageData,
  buildersHomepageFieldGroups,
} from "./homepage";
import { buildersAboutData, buildersAboutFieldGroups } from "./about";
import { buildersContactData, buildersContactFieldGroups } from "./contact";
import {
  buildersServicesData,
  buildersServicesFieldGroups,
} from "./services";
import {
  buildersTestimonialsData,
  buildersTestimonialsFieldGroups,
} from "./testimonials";
import { buildersGlobalData, buildersGlobalFieldGroups } from "./global";

// ─── Exports ──────────────────────────────────────────────────────────────────

export const buildersData: { builders: TemplateField[] } = {
  builders: [
    ...buildersHomepageData,
    ...buildersAboutData,
    ...buildersContactData,
    ...buildersServicesData,
    ...buildersTestimonialsData,
    ...buildersGlobalData,
  ],
};

export const buildersFieldGroups: { builders: TemplateFieldGroup[] } = {
  builders: [
    ...buildersHomepageFieldGroups,
    ...buildersAboutFieldGroups,
    ...buildersContactFieldGroups,
    ...buildersServicesFieldGroups,
    ...buildersTestimonialsFieldGroups,
    ...buildersGlobalFieldGroups,
  ],
};

const _buildersFieldMap = new Map(
  buildersData.builders.map((field) => [field.key, field]),
);

export function resolveFields(
  customFields: unknown,
  keys: string[],
): Record<string, string> {
  return resolveTemplateFields(customFields, keys, _buildersFieldMap);
}
