import type { TemplateField } from "~/lib/template-fields";
import { resolveTemplateFields } from "~/lib/resolve-template-fields";

import { dreamAboutData, dreamAboutFieldGroups } from "./about";
import { dreamAccountData, dreamAccountFieldGroups } from "./account";
import {
  dreamCheckoutUnavailableData,
  dreamCheckoutUnavailableFieldGroups,
} from "./cart-checkout/unavailable-fields";
import { dreamContactData, dreamContactFieldGroups } from "./contact";
import { dreamGlobalData, dreamGlobalFieldGroups } from "./global";
import { dreamHomepageData, dreamHomepageFieldGroups } from "./homepage";
import { dreamProductData, dreamProductFieldGroups } from "./products";
import { dreamServicesData, dreamServicesFieldGroups } from "./services";
import {
  dreamTestimonialsData,
  dreamTestimonialsFieldGroups,
} from "./testimonials";

// ─── Exports ──────────────────────────────────────────────────────────────────

export const dreamData = {
  dream: [
    ...dreamHomepageData,
    ...dreamAboutData,
    ...dreamServicesData,
    ...dreamContactData,
    ...dreamTestimonialsData,
    ...dreamProductData,
    ...dreamCheckoutUnavailableData,
    ...dreamGlobalData,
    ...dreamAccountData,
  ],
};

export const dreamFieldGroups = {
  dream: [
    ...dreamHomepageFieldGroups,
    ...dreamAboutFieldGroups,
    ...dreamServicesFieldGroups,
    ...dreamContactFieldGroups,
    ...dreamTestimonialsFieldGroups,
    ...dreamProductFieldGroups,
    ...dreamCheckoutUnavailableFieldGroups,
    ...dreamGlobalFieldGroups,
    ...dreamAccountFieldGroups,
  ],
};

const _dreamFieldMap = new Map<string, TemplateField>(
  dreamData.dream.map((field) => [field.key, field]),
);

export function resolveFields(
  customFields: unknown,
  keys: string[],
): Record<string, string> {
  return resolveTemplateFields(customFields, keys, _dreamFieldMap);
}
