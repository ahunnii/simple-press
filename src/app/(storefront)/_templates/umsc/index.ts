import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import { resolveTemplateFields } from "~/lib/resolve-template-fields";

import { umscAboutData, umscAboutFieldGroups } from "./about";
import { umscAccountData, umscAccountFieldGroups } from "./account";
import { umscCartData, umscCartFieldGroups } from "./cart-checkout/cart-fields";
import {
  umscCheckoutData,
  umscCheckoutFieldGroups,
} from "./cart-checkout/checkout-fields";
import {
  umscOrderData,
  umscOrderFieldGroups,
} from "./cart-checkout/order-fields";
import { umscCollectionsData, umscCollectionsFieldGroups } from "./collections";
import { umscContactData, umscContactFieldGroups } from "./contact";
import { umscFaqData, umscFaqFieldGroups } from "./faq";
import { umscHomepageData, umscHomepageFieldGroups } from "./homepage";
import { umscShopData, umscShopFieldGroups } from "./shop";
import {
  umscTestimonialsData,
  umscTestimonialsFieldGroups,
} from "./testimonials";

// ─── Global: Branding ─────────────────────────────────────────────────────

const globalBrandingData: TemplateField[] = [
  {
    key: "umsc.global.announcement-text",
    label: "Announcement Bar Text",
    description:
      "Text shown in the black announcement bar above the header. Leave blank to hide the bar entirely.",
    type: "text",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: "Handcrafted home + body essentials",
  },
  {
    key: "umsc.global.announcement-link-label",
    label: "Announcement Bar Link Text",
    description:
      "Bold gold link text shown at the end of the announcement bar. Leave blank to hide the link.",
    type: "text",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: "Shop small batch favorites",
  },
  {
    key: "umsc.global.announcement-link-url",
    label: "Announcement Bar Link URL",
    description: "URL the announcement bar link points to.",
    type: "url",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: "/shop",
  },
  {
    key: "umsc.global.header-tagline",
    label: "Header Tagline",
    description:
      "Small uppercase line shown beneath the wordmark in the header.",
    type: "text",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: "Home essentials",
  },
  {
    key: "umsc.global.nav-cta-label",
    label: "Mobile Menu Button Text",
    description:
      "Gold button pinned at the bottom of the mobile navigation menu. Leave blank to hide the button.",
    type: "text",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: "Custom order",
  },
  {
    key: "umsc.global.nav-cta-url",
    label: "Mobile Menu Button URL",
    description: "URL the mobile menu button points to.",
    type: "url",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: "/contact?type=custom",
  },
  {
    key: "umsc.global.footer-tagline",
    label: "Footer Tagline",
    description:
      "Short brand statement shown in the footer beneath the wordmark.",
    type: "textarea",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-full",
    defaultValue:
      "Small-batch soy candles, soaps, and body care, poured and packed by hand in Detroit.",
  },
  {
    key: "umsc.global.visit-stores-label",
    label: "Visit Our Stores Label",
    description: "Text for the 'Visit Our Stores' link in the footer.",
    type: "text",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: "Visit Our Stores",
  },
  {
    key: "umsc.global.visit-stores-url",
    label: "Visit Our Stores Link",
    description:
      "URL the 'Visit Our Stores' link points to (markets, pop-ups, or a locations page). Leave blank to hide the link.",
    type: "url",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: "",
  },
  {
    key: "umsc.global.customer-service-phone",
    label: "Customer Service Phone",
    description:
      "Phone number shown in the footer as 'Customer service: …'. Leave blank to use the value from your business settings.",
    type: "text",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: "",
  },
  {
    key: "umsc.global.google-review-url",
    label: "Google Review Link",
    description:
      "Link to your Google review page. Shown as 'Click to leave us a Google Review' in the footer and the reviews section. Leave blank to hide.",
    type: "url",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: "",
  },
  {
    key: "umsc.global.instagram-url",
    label: "Instagram URL",
    description:
      "Link to your Instagram profile. Leave blank to use the value from your business settings.",
    type: "url",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: "",
  },
  {
    key: "umsc.global.facebook-url",
    label: "Facebook URL",
    description:
      "Link to your Facebook page. Leave blank to use the value from your business settings.",
    type: "url",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: "",
  },
  {
    key: "umsc.global.tiktok-url",
    label: "TikTok URL",
    description:
      "Link to your TikTok profile. Leave blank to use the value from your business settings.",
    type: "url",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: "",
  },
];

// ─── Global: Product Page ─────────────────────────────────────────────────

const globalProductData: TemplateField[] = [
  {
    key: "umsc.global.product-shipping-description",
    label: "Product Shipping & Pickup Text",
    description:
      "Shown in the 'Shipping & pickup' accordion on every product page. Leave blank to hide that accordion.",
    type: "textarea",
    page: "global",
    group: "global.product",
    gridColumn: "col-span-full",
    defaultValue:
      "We ship within 1–2 business days. Local pickup is available — we'll email you when it's ready.",
  },
  {
    key: "umsc.global.product-question-description",
    label: "Product 'Ask a Question' Text",
    description:
      "Shown in the 'Ask a question' accordion on every product page. Leave blank to hide that accordion.",
    type: "textarea",
    page: "global",
    group: "global.product",
    gridColumn: "col-span-full",
    defaultValue:
      "Have a question about scent, size, or ingredients? Monique is happy to help.",
  },
  {
    key: "umsc.global.product-trust-badges",
    label: "Product Trust Badges",
    description:
      "Short reassurance lines shown beneath the add-to-cart button on every product page.",
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
        placeholder: "e.g. Hand-poured in Detroit",
      },
    ],
  },
];

// ─── Global: Authentication ───────────────────────────────────────────────

const globalAuthenticationData: TemplateField[] = [
  {
    key: "umsc.global.authentication-image",
    label: "Authentication Image",
    description: "Image shown on the sign-in and sign-up screens.",
    type: "image",
    page: "global",
    group: "global.authentication",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },
];

// ─── Exports ────────────────────────────────────────────────────────────────

export const umscData: Record<string, TemplateField[]> = {
  umsc: [
    ...umscHomepageData,
    ...umscAboutData,
    ...umscShopData,
    ...umscCollectionsData,
    ...umscContactData,
    ...umscTestimonialsData,
    ...umscFaqData,
    ...umscCartData,
    ...umscCheckoutData,
    ...umscOrderData,
    ...umscAccountData,
    ...globalBrandingData,
    ...globalProductData,
    ...globalAuthenticationData,
  ],
};

export const umscFieldGroups: Record<string, TemplateFieldGroup[]> = {
  umsc: [
    ...umscHomepageFieldGroups,
    ...umscAboutFieldGroups,
    ...umscShopFieldGroups,
    ...umscCollectionsFieldGroups,
    ...umscContactFieldGroups,
    ...umscTestimonialsFieldGroups,
    ...umscFaqFieldGroups,
    ...umscCartFieldGroups,
    ...umscCheckoutFieldGroups,
    ...umscOrderFieldGroups,
    ...umscAccountFieldGroups,
    {
      id: "global.branding",
      title: "Global Branding",
      description:
        "Announcement bar, header tagline, footer tagline, store visits, customer service, and social links used throughout the template",
      icon: "🏷️",
      columns: 2,
    } satisfies TemplateFieldGroup,
    {
      id: "global.product",
      title: "Global Product Page",
      description:
        "Shipping/pickup text, 'ask a question' text, and trust badges shown on every product page",
      icon: "📦",
      columns: 1,
    } satisfies TemplateFieldGroup,
    {
      id: "global.authentication",
      title: "Authentication",
      description: "Image shown on the sign-in and sign-up screens",
      icon: "🔐",
      columns: 1,
    } satisfies TemplateFieldGroup,
  ],
};

const _umscFieldMap = new Map(
  (umscData.umsc ?? []).map((field) => [field.key, field]),
);

export function resolveFields(
  customFields: unknown,
  keys: string[],
): Record<string, string> {
  return resolveTemplateFields(customFields, keys, _umscFieldMap);
}
