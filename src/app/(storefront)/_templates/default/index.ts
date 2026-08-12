import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import { resolveTemplateFields } from "~/lib/resolve-template-fields";

import { defaultAboutData, defaultAboutFieldGroups } from "./about";
import { defaultBlogData, defaultBlogFieldGroups } from "./blog";
import {
  defaultCollectionsData,
  defaultCollectionsFieldGroups,
} from "./collections";
import { defaultContactData, defaultContactFieldGroups } from "./contact";
import { defaultEventsData, defaultEventsFieldGroups } from "./events";
import { defaultHomepageData, defaultHomepageFieldGroups } from "./homepage";
import { defaultServicesData, defaultServicesFieldGroups } from "./services";
import { defaultShopData, defaultShopFieldGroups } from "./shop";
import {
  defaultTestimonialsData,
  defaultTestimonialsFieldGroups,
} from "./testimonials";
import { defaultVideosData, defaultVideosFieldGroups } from "./videos";

export { defaultTemplateSections } from "./sections";

const globalAuthenticationData: TemplateField[] = [
  {
    key: "default.global.authentication-image",
    label: "Authentication Image",
    description: "Image shown in the authentication section",
    type: "image",
    page: "global",
    group: "global.authentication",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },

  {
    key: "default.global.logo-size-width",
    label: "Logo Size Width",
    description: "Size of the logo in the authentication section",
    type: "number",
    page: "global",
    group: "global.authentication",
    gridColumn: "col-span-1",
    defaultValue: "80",
    placeholder: "80",
  },
  {
    key: "default.global.logo-size-height",
    label: "Logo Size Height",
    description: "Size of the logo in the authentication section",
    type: "number",
    page: "global",
    group: "global.authentication",
    gridColumn: "col-span-1",
    defaultValue: "80",
    placeholder: "80",
  },

  {
    key: "default.global.image-overlay-color",
    label: "Image Overlay Color",
    description: "Color of the image overlay in the authentication section",
    type: "color",
    page: "global",
    group: "global.authentication",
    gridColumn: "col-span-1",
    defaultValue: "#000000",
    placeholder: "#000000",
  },
];

/**
 * Product-page defaults, applied to every product. These fields moved from
 * page `"global"` to page `"product"` so the visual editor can preview them on
 * a real product page — their KEYS intentionally keep the legacy
 * `default.global.product-*` prefix, because `customFields` values are keyed
 * purely by field key and renaming would orphan every owner-saved value.
 */
const productDetailsData: TemplateField[] = [
  {
    key: "default.global.product-shipping-description",
    label: "Product Shipping Description",
    description: "Description of the product shipping",
    type: "textarea",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-full",
    defaultValue:
      "Ships within 1-2 business days. US orders over $75 ship free. International rates calculated at checkout. 30-day returns, no questions asked.",
  },

  {
    key: "default.global.product-question-description",
    label: "Product Question Description",
    description: "Description of the product question",
    type: "textarea",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-full",
    defaultValue:
      "We answer most questions within a day. Contact us and we'll get back to you.",
  },
  {
    key: "default.global.product-trust-badges",
    label: "Product Trust Badges",
    description:
      "Default trust badges that get applied to all products, comes before the product's trust badges",
    type: "list",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-full",
    itemSchema: [
      {
        key: "icon",
        label: "Icon",
        type: "icon",
      },
      {
        key: "title",
        label: "Title",
        type: "text",
      },
    ],
    minItems: 0,
    maxItems: 4,
  },
];

const fieldGroups: TemplateFieldGroup[] = [
  ...defaultHomepageFieldGroups,
  ...defaultAboutFieldGroups,
  ...defaultBlogFieldGroups,
  ...defaultCollectionsFieldGroups,
  ...defaultContactFieldGroups,
  ...defaultEventsFieldGroups,
  ...defaultServicesFieldGroups,
  ...defaultShopFieldGroups,
  ...defaultTestimonialsFieldGroups,
  ...defaultVideosFieldGroups,
  {
    id: "global.authentication",
    title: "Authentication",
    description: "Authentication settings for your business",
    icon: "🔑",
    columns: 2,
  },
  {
    id: "product.details",
    title: "Product",
    description: "Product settings for your business",
    icon: "🏪",
    columns: 2,
  },
];

export const defaultTemplateData = {
  default: [
    ...defaultHomepageData,
    ...defaultAboutData,
    ...defaultBlogData,
    ...defaultCollectionsData,
    ...defaultContactData,
    ...defaultEventsData,
    ...defaultServicesData,
    ...defaultShopData,
    ...defaultTestimonialsData,
    ...defaultVideosData,
    ...globalAuthenticationData,
    ...productDetailsData,
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
