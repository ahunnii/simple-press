import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import { resolveTemplateFields } from "~/lib/resolve-template-fields";

import { defaultAboutData, defaultAboutFieldGroups } from "./about";
import { defaultBlogData, defaultBlogFieldGroups } from "./blog";
import {
  defaultCollectionsData,
  defaultCollectionsFieldGroups,
} from "./collections";
import { defaultContactData, defaultContactFieldGroups } from "./contact";
import { defaultHomepageData, defaultHomepageFieldGroups } from "./homepage";
import {
  defaultServicesData,
  defaultServicesFieldGroups,
} from "./services";
import { defaultShopData, defaultShopFieldGroups } from "./shop";
import {
  defaultTestimonialsData,
  defaultTestimonialsFieldGroups,
} from "./testimonials";

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

const globalProductData: TemplateField[] = [
  {
    key: "default.global.product-shipping-description",
    label: "Product Shipping Description",
    description: "Description of the product shipping",
    type: "textarea",
    page: "global",
    group: "global.product",
    gridColumn: "col-span-full",
    defaultValue:
      "Ships within 1-2 business days. US orders over $75 ship free. International rates calculated at checkout. 30-day returns, no questions asked.",
  },

  {
    key: "default.global.product-question-description",
    label: "Product Question Description",
    description: "Description of the product question",
    type: "textarea",
    page: "global",
    group: "global.product",
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
    page: "global",
    group: "global.product",
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
  ...defaultServicesFieldGroups,
  ...defaultShopFieldGroups,
  ...defaultTestimonialsFieldGroups,
  {
    id: "global.authentication",
    title: "Authentication",
    description: "Authentication settings for your business",
    icon: "🔑",
    columns: 2,
  },
  {
    id: "global.product",
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
    ...defaultServicesData,
    ...defaultShopData,
    ...defaultTestimonialsData,
    ...globalAuthenticationData,
    ...globalProductData,
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
