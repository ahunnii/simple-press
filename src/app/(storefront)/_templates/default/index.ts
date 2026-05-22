import type { TemplateFieldGroup } from "~/lib/template-fields";
import { resolveTemplateFields } from "~/lib/resolve-template-fields";

import { defaultAboutData, defaultAboutFieldGroups } from "./about";
import { defaultBlogData, defaultBlogFieldGroups } from "./blog";
import {
  defaultCollectionsData,
  defaultCollectionsFieldGroups,
} from "./collections";
import { defaultContactData, defaultContactFieldGroups } from "./contact";
import {
  defaultHomepageData,
  defaultHomepageFieldGroups,
} from "./homepage";
import { defaultShopData, defaultShopFieldGroups } from "./shop";
import {
  defaultTestimonialsData,
  defaultTestimonialsFieldGroups,
} from "./testimonials";

const fieldGroups: TemplateFieldGroup[] = [
  ...defaultHomepageFieldGroups,
  ...defaultAboutFieldGroups,
  ...defaultBlogFieldGroups,
  ...defaultCollectionsFieldGroups,
  ...defaultContactFieldGroups,
  ...defaultShopFieldGroups,
  ...defaultTestimonialsFieldGroups,
];

export const defaultTemplateData = {
  default: [
    ...defaultHomepageData,
    ...defaultAboutData,
    ...defaultBlogData,
    ...defaultCollectionsData,
    ...defaultContactData,
    ...defaultShopData,
    ...defaultTestimonialsData,
  ],
};

export const defaultTemplateFieldGroups = {
  default: fieldGroups,
};

const _defaultFieldMap = new Map(
  defaultTemplateData.default.map((field) => [field.key, field]),
);

export function resolveFields(
  customFields: unknown,
  keys: string[],
): Record<string, string> {
  return resolveTemplateFields(customFields, keys, _defaultFieldMap);
}
