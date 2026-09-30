import type { TemplateFieldGroup } from "~/lib/template-fields";
import { resolveTemplateFields } from "~/lib/resolve-template-fields";

import { modernAboutData, modernAboutFieldGroups } from "./about";
import { modernBlogData, modernBlogFieldGroups } from "./blog";
import { modernCheckoutData, modernCheckoutFieldGroups } from "./cart-checkout";
import {
  modernCartData,
  modernCartFieldGroups,
} from "./cart-checkout/cart-fields";
import {
  modernCollectionsData,
  modernCollectionsFieldGroups,
} from "./collections";
import { modernContactData, modernContactFieldGroups } from "./contact";
import { modernHomepageData, modernHomepageFieldGroups } from "./homepage";
import { modernProductData, modernProductFieldGroups } from "./products";
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
  ...modernProductFieldGroups,
  ...modernCheckoutFieldGroups,
  ...modernCartFieldGroups,
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
    ...modernProductData,
    ...modernCheckoutData,
    ...modernCartData,
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
