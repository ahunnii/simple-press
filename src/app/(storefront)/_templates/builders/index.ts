import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import { resolveTemplateFields } from "~/lib/resolve-template-fields";

import {
  buildersHomepageData,
  buildersHomepageFieldGroups,
} from "./homepage";
import { buildersAboutData, buildersAboutFieldGroups } from "./about";
import { buildersContactData, buildersContactFieldGroups } from "./contact";

// ─── Exports ──────────────────────────────────────────────────────────────────

export const buildersData: { builders: TemplateField[] } = {
  builders: [
    ...buildersHomepageData,
    ...buildersAboutData,
    ...buildersContactData,
  ],
};

export const buildersFieldGroups: { builders: TemplateFieldGroup[] } = {
  builders: [
    ...buildersHomepageFieldGroups,
    ...buildersAboutFieldGroups,
    ...buildersContactFieldGroups,
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
