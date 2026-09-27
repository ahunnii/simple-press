import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import { resolveTemplateFields } from "~/lib/resolve-template-fields";

import { defaultAboutData, defaultAboutFieldGroups } from "./about";
import { defaultBlogData, defaultBlogFieldGroups } from "./blog";
import {
  defaultCartData,
  defaultCartFieldGroups,
} from "./cart-checkout/cart-fields";
import {
  defaultOrderData,
  defaultOrderFieldGroups,
} from "./cart-checkout/order-fields";
import {
  defaultCheckoutUnavailableData,
  defaultCheckoutUnavailableFieldGroups,
} from "./cart-checkout/unavailable-fields";
import {
  defaultCollectionsData,
  defaultCollectionsFieldGroups,
} from "./collections";
import { defaultContactData, defaultContactFieldGroups } from "./contact";
import { defaultDonateData, defaultDonateFieldGroups } from "./donate";
import { defaultEventsData, defaultEventsFieldGroups } from "./events";
import { defaultFaqData, defaultFaqFieldGroups } from "./faq";
import { defaultHomepageData, defaultHomepageFieldGroups } from "./homepage";
import {
  defaultFooterData,
  defaultFooterFieldGroups,
} from "./layout/footer-fields";
import {
  defaultProductData,
  defaultProductFieldGroups,
} from "./products";
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
    label: "Sign-in background image",
    description:
      "Image shown behind the sign-in and sign-up panel on wide screens. Leave blank to hide that side panel.",
    type: "image",
    page: "global",
    group: "global.authentication",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },

  {
    key: "default.global.logo-size-width",
    label: "Logo width (px)",
    description: "Width of the logo on the sign-in and sign-up screens.",
    type: "number",
    page: "global",
    group: "global.authentication",
    gridColumn: "col-span-1",
    defaultValue: "80",
    placeholder: "80",
    min: 20,
    max: 400,
    step: 1,
    unit: "px",
  },
  {
    key: "default.global.logo-size-height",
    label: "Logo height (px)",
    description: "Height of the logo on the sign-in and sign-up screens.",
    type: "number",
    page: "global",
    group: "global.authentication",
    gridColumn: "col-span-1",
    defaultValue: "80",
    placeholder: "80",
    min: 20,
    max: 400,
    step: 1,
    unit: "px",
  },
];

const fieldGroups: TemplateFieldGroup[] = [
  ...defaultHomepageFieldGroups,
  ...defaultAboutFieldGroups,
  ...defaultBlogFieldGroups,
  ...defaultCollectionsFieldGroups,
  ...defaultContactFieldGroups,
  ...defaultDonateFieldGroups,
  ...defaultEventsFieldGroups,
  ...defaultServicesFieldGroups,
  ...defaultShopFieldGroups,
  ...defaultTestimonialsFieldGroups,
  ...defaultVideosFieldGroups,
  ...defaultProductFieldGroups,
  ...defaultCheckoutUnavailableFieldGroups,
  ...defaultOrderFieldGroups,
  ...defaultCartFieldGroups,
  ...defaultFaqFieldGroups,
  ...defaultFooterFieldGroups,
  {
    id: "global.authentication",
    title: "Authentication",
    description:
      "Background image and logo size on the sign-in and sign-up screens.",
    icon: "🔑",
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
    ...defaultDonateData,
    ...defaultEventsData,
    ...defaultServicesData,
    ...defaultShopData,
    ...defaultTestimonialsData,
    ...defaultVideosData,
    ...defaultProductData,
    ...defaultCheckoutUnavailableData,
    ...defaultOrderData,
    ...defaultCartData,
    ...defaultFaqData,
    ...defaultFooterData,
    ...globalAuthenticationData,
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
