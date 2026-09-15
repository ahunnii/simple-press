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
import { oliveShopData, oliveShopFieldGroups } from "./shop";
import {
  oliveTestimonialsData,
  oliveTestimonialsFieldGroups,
} from "./testimonials";

// Page domains (homepage, shop, …) are aggregated below; `products/`,
// `generic/`, `account/` and `maintenance/` define no fields of their own —
// the product page reads the `global.product` group, the rest are chrome-only.

// ─── Global: Branding ─────────────────────────────────────────────────────────

const globalBrandingData: TemplateField[] = [
  {
    key: "olive.global.wordmark-tagline",
    label: "Wordmark Tagline",
    description:
      "Short line under the wordmark in the footer (e.g. 'Detroit · Est. 2020'). Leave blank to hide.",
    type: "text",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: "Detroit · Est. 2020",
  },
  {
    key: "olive.global.footer-tagline",
    label: "Footer Tagline",
    description: "One-sentence brand line shown in the footer's cover panel.",
    type: "textarea",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue:
      "Apparel, beauty and home for the woman who dresses on purpose.",
  },
  {
    key: "olive.global.footer-cta-heading",
    label: "Footer CTA Heading",
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
    label: "Footer CTA Body",
    description: "One line under the footer CTA heading.",
    type: "textarea",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue:
      "Follow along for new arrivals, restocks and the occasional Detroit pop-up.",
  },
  {
    key: "olive.global.footer-cta-label",
    label: "Footer CTA Button Label",
    description: "Label of the footer CTA button.",
    type: "text",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: "Follow Olive Mode",
  },
  {
    key: "olive.global.footer-cta-link",
    label: "Footer CTA Button Link",
    description:
      "Where the footer CTA button goes (an Instagram profile, a newsletter page, anything). Leave blank to hide the CTA card.",
    type: "url",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: "",
  },
  {
    key: "olive.global.social-instagram",
    label: "Instagram URL",
    description:
      "Full URL to your Instagram profile. Leave blank to hide the icon.",
    type: "url",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: "",
  },
  {
    key: "olive.global.social-tiktok",
    label: "TikTok URL",
    description:
      "Full URL to your TikTok profile. Leave blank to hide the icon.",
    type: "url",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: "",
  },
  {
    key: "olive.global.social-facebook",
    label: "Facebook URL",
    description:
      "Full URL to your Facebook page. Leave blank to hide the icon.",
    type: "url",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: "",
  },
  {
    key: "olive.global.social-pinterest",
    label: "Pinterest URL",
    description:
      "Full URL to your Pinterest profile. Leave blank to hide the icon.",
    type: "url",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: "",
  },
];

// ─── Global: Product Page ─────────────────────────────────────────────────────

const globalProductData: TemplateField[] = [
  {
    key: "olive.global.product-shipping-description",
    label: "Product Shipping Text",
    description:
      "Shown in the 'Shipping' accordion on every product page. Leave blank to hide that accordion.",
    type: "textarea",
    page: "global",
    group: "global.product",
    gridColumn: "col-span-full",
    defaultValue:
      "Everything ships from Detroit. You'll get a tracking link the moment your order leaves.",
  },
  {
    key: "olive.global.product-returns-description",
    label: "Product Returns Text",
    description:
      "Shown in the 'Returns' accordion on every product page. Leave blank to hide that accordion.",
    type: "textarea",
    page: "global",
    group: "global.product",
    gridColumn: "col-span-full",
    defaultValue:
      "Unworn pieces with tags can come back — message us and we'll sort out an exchange or store credit.",
  },
  {
    key: "olive.global.product-question-text",
    label: "Product 'Questions?' Line",
    description:
      "Short line under the accordions inviting a question; it links to the contact page. Leave blank to hide.",
    type: "text",
    page: "global",
    group: "global.product",
    gridColumn: "col-span-full",
    defaultValue: "Not sure about the fit or shade? Ask us.",
  },
  {
    key: "olive.global.product-related-heading",
    label: "Related Products Heading",
    description:
      "Heading above the related-products rail on every product page.",
    type: "text",
    page: "global",
    group: "global.product",
    gridColumn: "col-span-1",
    defaultValue: "Complete the look",
  },
  {
    key: "olive.global.product-related-link-label",
    label: "Related Products Link",
    description:
      "Text link beside the related-products heading; points to the shop.",
    type: "text",
    page: "global",
    group: "global.product",
    gridColumn: "col-span-1",
    defaultValue: "See everything",
  },
  {
    key: "olive.global.product-coming-soon-heading",
    label: "Coming Soon Heading",
    description:
      "Shown instead of the buy controls when a product is marked coming soon.",
    type: "text",
    page: "global",
    group: "global.product",
    gridColumn: "col-span-1",
    defaultValue: "Coming soon",
  },
  {
    key: "olive.global.product-coming-soon-body",
    label: "Coming Soon Body",
    description: "One line under the coming-soon heading.",
    type: "textarea",
    page: "global",
    group: "global.product",
    gridColumn: "col-span-1",
    defaultValue:
      "This one isn't in the shop yet. Check back soon, or ask us when it lands.",
  },
  {
    key: "olive.global.product-trust-badges",
    label: "Product Trust Badges",
    description:
      "Short reassurance lines shown beneath the add-to-bag button on every product page (max 4).",
    type: "list",
    page: "global",
    group: "global.product",
    gridColumn: "col-span-full",
    maxItems: 4,
    itemSchema: [
      {
        key: "label",
        label: "Badge Text",
        type: "text",
        placeholder: "e.g. Ships from Detroit in 1–2 days",
      },
    ],
  },
];

// ─── Global: Authentication ───────────────────────────────────────────────────
// Consumed by the Default auth shell (default/auth/default-auth-shell.tsx), which
// resolves `${templateId}.global.authentication-image` + the logo-size fields.

const globalAuthenticationData: TemplateField[] = [
  {
    key: "olive.global.authentication-image",
    label: "Authentication Image",
    description: "Image shown beside the sign-in and sign-up forms.",
    type: "image",
    page: "global",
    group: "global.authentication",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "olive.global.logo-size-width",
    label: "Auth Logo Width (px)",
    description: "Width of the logo on the sign-in and sign-up screens.",
    type: "number",
    page: "global",
    group: "global.authentication",
    gridColumn: "col-span-1",
    defaultValue: "120",
  },
  {
    key: "olive.global.logo-size-height",
    label: "Auth Logo Height (px)",
    description: "Height of the logo on the sign-in and sign-up screens.",
    type: "number",
    page: "global",
    group: "global.authentication",
    gridColumn: "col-span-1",
    defaultValue: "40",
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
    ...globalProductData,
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
    {
      id: "global.branding",
      title: "Global Branding",
      description:
        "Wordmark tagline, footer tagline, footer call-to-action card and social links",
      icon: "🏷️",
      columns: 2,
    } satisfies TemplateFieldGroup,
    {
      id: "global.product",
      title: "Global Product Page",
      description:
        "Shipping and returns text, the 'questions?' line and trust badges shown on every product page",
      icon: "📦",
      columns: 1,
    } satisfies TemplateFieldGroup,
    {
      id: "global.authentication",
      title: "Authentication",
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
