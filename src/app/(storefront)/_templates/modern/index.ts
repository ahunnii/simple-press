import type { TemplateFieldGroup } from "~/lib/template-fields";
import { resolveTemplateFields } from "~/lib/resolve-template-fields";

import { modernAboutData, modernAboutFieldGroups } from "./about";
import { modernBlogData, modernBlogFieldGroups } from "./blog";
import {
  modernCollectionsData,
  modernCollectionsFieldGroups,
} from "./collections";
import { modernContactData, modernContactFieldGroups } from "./contact";
import { modernHomepageData, modernHomepageFieldGroups } from "./homepage";
import { modernProductsData, modernProductsFieldGroups } from "./shop";
import {
  modernTestimonialsData,
  modernTestimonialsFieldGroups,
} from "./testimonials";

const fieldGroups: TemplateFieldGroup[] = [
  ...modernHomepageFieldGroups,
  ...modernTestimonialsFieldGroups,
  ...modernProductsFieldGroups,
  ...modernAboutFieldGroups,
  ...modernCollectionsFieldGroups,
  ...modernContactFieldGroups,
  ...modernBlogFieldGroups,
];

export const modernData = {
  modern: [
    ...modernAboutData,
    ...modernCollectionsData,
    ...modernContactData,
    ...modernHomepageData,
    ...modernBlogData,
    ...modernTestimonialsData,
    ...modernProductsData,
  ],
};

export const modernFieldGroups = {
  modern: fieldGroups,
};

const _modernFieldMap = new Map(
  modernData.modern.map((field) => [field.key, field]),
);

export function resolveFields(
  customFields: unknown,
  keys: string[],
): Record<string, string> {
  return resolveTemplateFields(customFields, keys, _modernFieldMap);
}
