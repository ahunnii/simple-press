import { listRowsFromDefaults } from "~/lib/lucide-template-icons";
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
import {
  umscCheckoutUnavailableData,
  umscCheckoutUnavailableFieldGroups,
} from "./cart-checkout/unavailable-fields";
import { umscCollectionsData, umscCollectionsFieldGroups } from "./collections";
import { umscContactData, umscContactFieldGroups } from "./contact";
import { umscFaqData, umscFaqFieldGroups } from "./faq";
import { umscBlogData, umscBlogFieldGroups } from "./blog";
import { umscEventsData, umscEventsFieldGroups } from "./events";
import { umscVideosData, umscVideosFieldGroups } from "./videos";
import { umscDonateData, umscDonateFieldGroups } from "./donate";
import { umscServicesData, umscServicesFieldGroups } from "./services";
import { umscHomepageData, umscHomepageFieldGroups } from "./homepage";
import { umscProductData, umscProductFieldGroups } from "./products";
import { umscShopData, umscShopFieldGroups } from "./shop";
import {
  umscTestimonialsData,
  umscTestimonialsFieldGroups,
} from "./testimonials";

// ─── Global: Branding ─────────────────────────────────────────────────────

/** Built-in shop-link rows — the four collections that existed on the current site. */
const UMSC_FOOTER_SHOP_LINKS_DEFAULT_ROWS = [
  { label: "Candles", url: "/collections/candles" },
  { label: "Soaps", url: "/collections/soaps" },
  { label: "Body Care", url: "/collections/body-care" },
  { label: "Home Care", url: "/collections/home-care" },
] satisfies Record<string, string>[];

const globalBrandingData: TemplateField[] = [
  {
    key: "umsc.global.header-tagline",
    label: "Header tagline",
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
    label: "Mobile menu button label",
    description:
      "Button pinned at the bottom of the mobile navigation menu. Leave blank to hide the button.",
    type: "text",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: "Custom order",
  },
  {
    key: "umsc.global.nav-cta-url",
    label: "Mobile menu button link",
    description: "Where the mobile menu button points to.",
    type: "url",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: "/contact?type=custom",
  },
  {
    key: "umsc.global.visit-stores-label",
    label: "Store visits link text",
    description:
      "Label for the footer link to where customers can find you in person — markets, pop-ups, etc.",
    type: "text",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: "Visit Our Stores",
  },
  {
    key: "umsc.global.visit-stores-url",
    label: "Store visits link",
    description:
      "Where the store-visits link points to — markets, pop-ups, or a locations page. Leave blank to hide the link.",
    type: "url",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: "",
  },
  {
    key: "umsc.global.google-review-url",
    label: "Google review link",
    description:
      "Link to your Google review page. Shown as 'Click to leave us a Google Review' in the footer and the reviews section. Leave blank to hide.",
    type: "url",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: "",
  },
  {
    key: "umsc.global.footer-shop-heading",
    label: "Footer shop heading",
    description:
      "Heading above the shop links in the footer's first column. Leave blank to hide it.",
    type: "text",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: "Get to know UM Scented Candles",
  },
  {
    key: "umsc.global.footer-shop-links",
    label: "Footer shop links",
    description:
      "Links in the footer's Shop column.",
    type: "list",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-full",
    maxItems: 8,
    itemLabel: "link",
    summaryKey: "label",
    defaultsWhenEmpty: true,
    defaultRows: UMSC_FOOTER_SHOP_LINKS_DEFAULT_ROWS,
    itemSchema: [
      {
        key: "label",
        label: "Label",
        description: "Text on the link.",
        type: "text",
        placeholder: "e.g. Candles",
      },
      {
        key: "url",
        label: "URL",
        description: "Where the link goes.",
        type: "url",
        placeholder: "/collections/candles",
      },
    ],
    defaultValue: "",
  },
];

// ─── Global: Authentication ───────────────────────────────────────────────

const globalAuthenticationData: TemplateField[] = [
  {
    key: "umsc.global.authentication-image",
    label: "Authentication image",
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
    ...umscBlogData,
    ...umscEventsData,
    ...umscVideosData,
    ...umscDonateData,
    ...umscServicesData,
    ...umscCartData,
    ...umscCheckoutData,
    ...umscCheckoutUnavailableData,
    ...umscOrderData,
    ...umscAccountData,
    ...umscProductData,
    ...globalBrandingData,
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
    ...umscBlogFieldGroups,
    ...umscEventsFieldGroups,
    ...umscVideosFieldGroups,
    ...umscDonateFieldGroups,
    ...umscServicesFieldGroups,
    ...umscCartFieldGroups,
    ...umscCheckoutFieldGroups,
    ...umscCheckoutUnavailableFieldGroups,
    ...umscOrderFieldGroups,
    ...umscAccountFieldGroups,
    ...umscProductFieldGroups,
    {
      id: "global.branding",
      title: "Header and footer",
      description:
        "Header tagline, mobile menu button, store visits link, Google review link, and the footer's shop links — shown on every page. Phone comes from Settings; the footer tagline and social links from Content → Branding; the announcement bar from Content → Announcements.",
      icon: "🏷️",
      columns: 2,
    } satisfies TemplateFieldGroup,
    {
      id: "global.authentication",
      title: "Sign-in screens",
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

// ─── Derived storefront constants ──────────────────────────────────────────

export const UMSC_FOOTER_SHOP_LINKS_DEFAULT = listRowsFromDefaults(
  UMSC_FOOTER_SHOP_LINKS_DEFAULT_ROWS,
  "default-link",
);
