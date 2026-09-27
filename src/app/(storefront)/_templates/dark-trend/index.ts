import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import { resolveTemplateFields } from "~/lib/resolve-template-fields";

import { aboutDarkTrendFieldGroups, aboutDarkTrendPageData } from "./about";
import { darkTrendBlogData, darkTrendBlogFieldGroups } from "./blog";
import {
  darkTrendCartData,
  darkTrendCartFieldGroups,
} from "./cart-checkout/cart-fields";
import {
  darkTrendOrderData,
  darkTrendOrderFieldGroups,
} from "./cart-checkout/order-fields";
import {
  darkTrendCheckoutUnavailableData,
  darkTrendCheckoutUnavailableFieldGroups,
} from "./cart-checkout/unavailable-fields";
import {
  darkTrendCollectionsData,
  darkTrendCollectionsFieldGroups,
} from "./collections";
import { darkTrendContactData, darkTrendContactFieldGroups } from "./contact";
import {
  darkTrendHomepageData,
  darkTrendHomepageFieldGroups,
} from "./homepage";
import { darkTrendProductData, darkTrendProductFieldGroups } from "./products";
import { darkTrendShopData, darkTrendShopFieldGroups } from "./shop";
import {
  darkTrendTestimonialsData,
  darkTrendTestimonialsFieldGroups,
} from "./testimonials";

// ─── Global: Footer ───────────────────────────────────────────────────────────

const globalFooterData: TemplateField[] = [
  {
    key: "dark-trend.global.footer-nav-heading",
    label: "Links heading",
    description:
      "Heading above the page links in the footer on every page. Leave blank to hide.",
    type: "text",
    page: "global",
    group: "global.footer",
    gridColumn: "col-span-1",
    defaultValue: "Navigate",
    placeholder: "e.g. Explore",
  },
  {
    key: "dark-trend.global.footer-contact-heading",
    label: "Contact heading",
    description:
      "Heading above your address, phone, and email in the footer (from Settings → General). Leave blank to hide.",
    type: "text",
    page: "global",
    group: "global.footer",
    gridColumn: "col-span-1",
    defaultValue: "Reach Out",
    placeholder: "e.g. Get in touch",
  },
  {
    key: "dark-trend.global.footer-social-heading",
    label: "Social heading",
    description:
      "Heading above your social media icons in the footer (from Content → Branding). Leave blank to hide.",
    type: "text",
    page: "global",
    group: "global.footer",
    gridColumn: "col-span-1",
    defaultValue: "Follow Us On",
    placeholder: "e.g. Find us online",
  },
];

// ─── Global: Authentication ───────────────────────────────────────────────────

const globalAuthenticationData: TemplateField[] = [
  {
    key: "dark-trend.global.authentication-image",
    label: "Authentication image",
    description:
      "Image shown beside the sign-in and sign-up forms on larger screens.",
    type: "image",
    page: "global",
    group: "global.authentication",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },
];

// ─── Field Groups ─────────────────────────────────────────────────────────────

const fieldGroups: TemplateFieldGroup[] = [
  ...darkTrendHomepageFieldGroups,
  ...aboutDarkTrendFieldGroups,
  ...darkTrendContactFieldGroups,
  ...darkTrendBlogFieldGroups,
  ...darkTrendProductFieldGroups,
  ...darkTrendCheckoutUnavailableFieldGroups,
  ...darkTrendShopFieldGroups,
  ...darkTrendCollectionsFieldGroups,
  ...darkTrendTestimonialsFieldGroups,
  ...darkTrendCartFieldGroups,
  ...darkTrendOrderFieldGroups,
  {
    id: "global.footer",
    title: "Footer",
    description:
      "Column headings in the footer on every page. The tagline and social links come from Content → Branding; the address, phone, and email from Settings.",
    icon: "🦶",
    columns: 2,
  },
  {
    id: "global.authentication",
    title: "Authentication",
    description: "Image shown on the sign-in and sign-up pages.",
    icon: "🔑",
    columns: 1,
  },
];

// ─── Exports ──────────────────────────────────────────────────────────────────

export const darkTrendData = {
  "dark-trend": [
    ...aboutDarkTrendPageData,
    ...darkTrendHomepageData,
    ...darkTrendContactData,
    ...darkTrendBlogData,
    ...darkTrendProductData,
    ...darkTrendCheckoutUnavailableData,
    ...darkTrendShopData,
    ...darkTrendCollectionsData,
    ...darkTrendTestimonialsData,
    ...darkTrendCartData,
    ...darkTrendOrderData,
    ...globalFooterData,
    ...globalAuthenticationData,
  ],
};

export const darkTrendFieldGroups = {
  "dark-trend": fieldGroups,
};

const _darkTrendFieldMap = new Map(
  darkTrendData["dark-trend"].map((field) => [field.key, field]),
);

export function resolveFields(
  customFields: unknown,
  keys: string[],
): Record<string, string> {
  return resolveTemplateFields(customFields, keys, _darkTrendFieldMap);
}
