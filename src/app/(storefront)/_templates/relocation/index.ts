import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import { resolveTemplateFields } from "~/lib/resolve-template-fields";

import { relocationAboutData, relocationAboutFieldGroups } from "./about";
import { relocationContactData, relocationContactFieldGroups } from "./contact";
import { relocationFaqData, relocationFaqFieldGroups } from "./faq";
import { relocationGenericData, relocationGenericFieldGroups } from "./generic";
import {
  relocationHomepageData,
  relocationHomepageFieldGroups,
} from "./homepage";
import { relocationGlobalData, relocationGlobalFieldGroups } from "./layout";
import {
  relocationServicesData,
  relocationServicesFieldGroups,
} from "./services";
import {
  relocationTestimonialsData,
  relocationTestimonialsFieldGroups,
} from "./testimonials";

/**
 * Field/group registry for the `relocation` template (Handy Relocations — 1:1
 * recreation of handyrelocations.com, fixed brand, no theme presets).
 *
 * Aggregates the global/chrome module (`layout/index.ts` — header/footer
 * chrome, credentials band, auth-screen branding) with each page domain's
 * field module, mirroring coop's aggregation shape. Relocation is a
 * service-archetype template with no commerce slots, so it omits vii's
 * product global baseline — its shop/cart/account routes are Default
 * fallbacks that never read relocation fields. (The `global.authentication`
 * baseline IS declared, since the shared DefaultAuthShell reads those keys
 * for every template.)
 *
 * Page order mirrors sections.ts: homepage → about → testimonials → services
 * → contact → faq → generic, then the global/chrome module.
 */

export const relocationData = {
  relocation: [
    ...relocationHomepageData,
    ...relocationAboutData,
    ...relocationTestimonialsData,
    ...relocationServicesData,
    ...relocationContactData,
    ...relocationFaqData,
    ...relocationGenericData,
    ...relocationGlobalData,
  ],
} satisfies Record<string, TemplateField[]>;

export const relocationFieldGroups = {
  relocation: [
    ...relocationHomepageFieldGroups,
    ...relocationAboutFieldGroups,
    ...relocationTestimonialsFieldGroups,
    ...relocationServicesFieldGroups,
    ...relocationContactFieldGroups,
    ...relocationFaqFieldGroups,
    ...relocationGenericFieldGroups,
    ...relocationGlobalFieldGroups,
  ],
} satisfies Record<string, TemplateFieldGroup[]>;

const _relocationFieldMap = new Map(
  relocationData.relocation.map((field) => [field.key, field]),
);

export function resolveFields(
  customFields: unknown,
  keys: string[],
): Record<string, string> {
  return resolveTemplateFields(customFields, keys, _relocationFieldMap);
}
