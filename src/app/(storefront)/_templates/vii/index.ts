import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import { resolveTemplateFields } from "~/lib/resolve-template-fields";

import { viiAboutData, viiAboutFieldGroups } from "./about";
import { viiBlogCtaFieldGroup, viiBlogFieldGroup, viiBlogFields } from "./blog";
import { viiCartData, viiCartFieldGroups } from "./cart-checkout/cart-fields";
import {
  viiCheckoutData,
  viiCheckoutFieldGroups,
} from "./cart-checkout/checkout-fields";
import {
  viiOrderData,
  viiOrderFieldGroups,
} from "./cart-checkout/order-fields";
import { viiCollectionsData, viiCollectionsFieldGroups } from "./collections";
import { viiContactData, viiContactFieldGroups } from "./contact";
import { viiHomepageData, viiHomepageFieldGroups } from "./homepage";
import { viiProductData, viiProductFieldGroups } from "./products";
import { viiServicesData, viiServicesFieldGroups } from "./services";
import { viiShopData, viiShopFieldGroups } from "./shop";
import {
  viiTestimonialsData,
  viiTestimonialsFieldGroups,
} from "./testimonials";

// ─── Global: Branding ─────────────────────────────────────────────────────────

const globalBrandingData: TemplateField[] = [
  {
    key: "vii.global.book-cta-text",
    label: "Booking button text",
    description:
      "Text for the button in the header that links to your booking page.",
    type: "text",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: "Book Now",
  },
  {
    key: "vii.global.book-cta-link",
    label: "Booking button link",
    description:
      "Where the header booking button sends visitors — your booking page or an external scheduling tool.",
    type: "url",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: "/contact",
  },
];

// ─── Global: Authentication ───────────────────────────────────────────────────

const globalAuthenticationData: TemplateField[] = [
  {
    key: "vii.global.authentication-image",
    label: "Sign-in image",
    description: "Image shown beside the sign-in and sign-up forms.",
    type: "image",
    page: "global",
    group: "global.authentication",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },
];

// ─── Exports ──────────────────────────────────────────────────────────────────

export const viiData = {
  vii: [
    ...viiHomepageData,
    ...viiShopData,
    ...viiProductData,
    ...viiCollectionsData,
    ...viiAboutData,
    ...viiTestimonialsData,
    ...viiBlogFields,
    ...viiContactData,
    ...viiServicesData,
    ...viiCartData,
    ...viiCheckoutData,
    ...viiOrderData,
    ...globalBrandingData,
    ...globalAuthenticationData,
  ],
};

export const viiFieldGroups = {
  vii: [
    ...viiHomepageFieldGroups,
    ...viiShopFieldGroups,
    ...viiProductFieldGroups,
    ...viiCollectionsFieldGroups,
    ...viiAboutFieldGroups,
    ...viiTestimonialsFieldGroups,
    viiBlogFieldGroup,
    viiBlogCtaFieldGroup,
    ...viiContactFieldGroups,
    ...viiServicesFieldGroups,
    ...viiCartFieldGroups,
    ...viiCheckoutFieldGroups,
    ...viiOrderFieldGroups,
    {
      id: "global.branding",
      title: "Site branding",
      description:
        "Header booking button, shown on every page. The small label under the wordmark comes from your city in Settings; the footer tagline and social links come from Content → Branding.",
      icon: "🏷️",
      columns: 2,
    } satisfies TemplateFieldGroup,
    {
      id: "global.authentication",
      title: "Sign-in screens",
      description: "Image shown beside the sign-in and sign-up forms.",
      icon: "🔐",
      columns: 1,
    } satisfies TemplateFieldGroup,
  ],
};

const _viiFieldMap = new Map(viiData.vii.map((field) => [field.key, field]));

export function resolveFields(
  customFields: unknown,
  keys: string[],
): Record<string, string> {
  return resolveTemplateFields(customFields, keys, _viiFieldMap);
}
