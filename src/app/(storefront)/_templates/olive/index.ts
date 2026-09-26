import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import { resolveTemplateFields } from "~/lib/resolve-template-fields";

import { oliveAboutData, oliveAboutFieldGroups } from "./about";
import { oliveBlogData, oliveBlogFieldGroups } from "./blog";
import {
  oliveCartData,
  oliveCartFieldGroups,
  oliveCheckoutData,
  oliveCheckoutFieldGroups,
} from "./cart-checkout";
import {
  oliveCollectionsData,
  oliveCollectionsFieldGroups,
} from "./collections";
import { oliveContactData, oliveContactFieldGroups } from "./contact";
import { oliveHomepageData, oliveHomepageFieldGroups } from "./homepage";
import { oliveProductData, oliveProductFieldGroups } from "./products";
import { oliveShopData, oliveShopFieldGroups } from "./shop";
import {
  oliveTestimonialsData,
  oliveTestimonialsFieldGroups,
} from "./testimonials";

// Page domains (homepage, shop, products, …) are aggregated below;
// `generic/`, `account/` and `maintenance/` define no fields of their own —
// they are chrome-only.
//
// Footer tagline and social links are NOT template fields: they come from
// Content → Branding (`SiteContent.footerText` / `socialLinks`). The retired
// `olive.global.footer-tagline` / `olive.global.social-*` keys are read only
// as a silent fallback (see RETIRED_TEMPLATE_KEYS in ~/lib/template-fields).

// ─── Global: Branding ─────────────────────────────────────────────────────────

const globalBrandingData: TemplateField[] = [
  {
    key: "olive.global.wordmark-tagline",
    label: "Wordmark tagline",
    description:
      "Short line under the wordmark in the footer. Leave blank to hide.",
    type: "text",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: "",
  },
  {
    key: "olive.global.footer-cta-heading",
    label: "Heading",
    description:
      "Heading of the footer's call-to-action card. Leave the link blank to hide the whole card.",
    type: "text",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: "First look at what's new",
  },
  {
    key: "olive.global.footer-cta-body",
    label: "Body",
    description: "One line under the footer call-to-action heading.",
    type: "textarea",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue:
      "Follow along for new arrivals, restocks and the occasional pop-up.",
  },
  {
    key: "olive.global.footer-cta-label",
    label: "Button label",
    description: "Label of the footer call-to-action button.",
    type: "text",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: "Follow along",
  },
  {
    key: "olive.global.footer-cta-link",
    label: "Button link",
    description:
      "Where the footer call-to-action button goes (an Instagram profile, a newsletter page, anything). Leave blank to hide the card.",
    type: "url",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: "",
  },
];

// ─── Global: Authentication ───────────────────────────────────────────────────
// Consumed by the Default auth shell (default/auth/default-auth-shell.tsx), which
// resolves `${templateId}.global.authentication-image` + the logo-size fields.

const globalAuthenticationData: TemplateField[] = [
  {
    key: "olive.global.authentication-image",
    label: "Image",
    description: "Image shown beside the sign-in and sign-up forms.",
    type: "image",
    page: "global",
    group: "global.authentication",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "olive.global.logo-size-width",
    label: "Logo width",
    description: "Width of the logo on the sign-in and sign-up screens.",
    type: "number",
    page: "global",
    group: "global.authentication",
    gridColumn: "col-span-1",
    defaultValue: "120",
    min: 24,
    max: 400,
    step: 1,
    unit: "px",
  },
  {
    key: "olive.global.logo-size-height",
    label: "Logo height",
    description: "Height of the logo on the sign-in and sign-up screens.",
    type: "number",
    page: "global",
    group: "global.authentication",
    gridColumn: "col-span-1",
    defaultValue: "40",
    min: 24,
    max: 400,
    step: 1,
    unit: "px",
  },
];

// ─── Exports ──────────────────────────────────────────────────────────────────

export const oliveData: Record<string, TemplateField[]> = {
  olive: [
    ...oliveHomepageData,
    ...oliveShopData,
    ...oliveCollectionsData,
    ...oliveAboutData,
    ...oliveContactData,
    ...oliveTestimonialsData,
    ...oliveBlogData,
    ...oliveCartData,
    ...oliveCheckoutData,
    ...globalBrandingData,
    ...oliveProductData,
    ...globalAuthenticationData,
  ],
};

export const oliveFieldGroups: Record<string, TemplateFieldGroup[]> = {
  olive: [
    ...oliveHomepageFieldGroups,
    ...oliveShopFieldGroups,
    ...oliveCollectionsFieldGroups,
    ...oliveAboutFieldGroups,
    ...oliveContactFieldGroups,
    ...oliveTestimonialsFieldGroups,
    ...oliveBlogFieldGroups,
    ...oliveCartFieldGroups,
    ...oliveCheckoutFieldGroups,
    ...oliveProductFieldGroups,
    {
      id: "global.branding",
      title: "Footer",
      description:
        "Wordmark tagline and the footer call-to-action card. Footer tagline and social links live in Content → Branding.",
      icon: "🏷️",
      columns: 2,
    } satisfies TemplateFieldGroup,
    {
      id: "global.authentication",
      title: "Sign-in screens",
      description: "Image and logo size on the sign-in and sign-up screens",
      icon: "🔐",
      columns: 2,
    } satisfies TemplateFieldGroup,
  ],
};

const _oliveFieldMap = new Map(
  (oliveData.olive ?? []).map((field) => [field.key, field]),
);

export function resolveFields(
  customFields: unknown,
  keys: string[],
): Record<string, string> {
  return resolveTemplateFields(customFields, keys, _oliveFieldMap);
}
