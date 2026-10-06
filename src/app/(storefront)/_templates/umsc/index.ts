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
    key: "umsc.global.google-review-url",
    label: "Google review link",
    description:
      "Link to your Google review page. Adds a 'Leave a Google review' strip to the footer and a review link to the reviews sections. Leave blank to hide them.",
    type: "url",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: "",
  },
  {
    key: "umsc.global.footer-review-heading",
    label: "Footer review heading",
    description:
      "Heading in the footer's Google review strip. The strip shows only when the Google review link is filled in.",
    type: "text",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: "Loved your order?",
  },
  {
    key: "umsc.global.footer-review-body",
    label: "Footer review message",
    description:
      "One short line beside the heading in the footer's Google review strip. Leave blank to hide it.",
    type: "textarea",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue:
      "A quick Google review helps a small Detroit shop more than you'd think.",
  },
  {
    key: "umsc.global.footer-review-label",
    label: "Footer review button text",
    description: "Text on the button in the footer's Google review strip.",
    type: "text",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: "Leave a Google review",
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
      "Links in the footer's Shop column. Leave empty to list your first four published collections (Admin → Collections order); add rows to choose your own links instead.",
    type: "list",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-full",
    maxItems: 8,
    itemLabel: "link",
    summaryKey: "label",
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
