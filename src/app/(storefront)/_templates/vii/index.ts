import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import { resolveTemplateFields } from "~/lib/resolve-template-fields";

import { viiAboutData, viiAboutFieldGroups } from "./about";
import { viiBlogFieldGroup, viiBlogFields } from "./blog";
import { viiCartData, viiCartFieldGroups } from "./cart-checkout/cart-fields";
import {
  viiCheckoutData,
  viiCheckoutFieldGroups,
} from "./cart-checkout/checkout-fields";
import {
  viiOrderData,
  viiOrderFieldGroups,
} from "./cart-checkout/order-fields";
import { viiContactData, viiContactFieldGroups } from "./contact";
import { viiHomepageData, viiHomepageFieldGroups } from "./homepage";
import { viiShopData, viiShopFieldGroups } from "./shop";
import {
  viiTestimonialsData,
  viiTestimonialsFieldGroups,
} from "./testimonials";

// ─── Global: Branding ─────────────────────────────────────────────────────────

const globalBrandingData: TemplateField[] = [
  {
    key: "vii.global.announcement-text",
    label: "Announcement Bar Text",
    description:
      "Promotional message shown in the slim announcement bar at the top of every page. Leave blank to hide the bar.",
    type: "text",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: "Complimentary skin consultation with your first facial",
  },
  {
    key: "vii.global.announcement-link-text",
    label: "Announcement Bar Link Text",
    description: "Text of the link inside the announcement bar.",
    type: "text",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: "Book Now",
  },
  {
    key: "vii.global.announcement-link",
    label: "Announcement Bar Link URL",
    description: "URL the announcement bar link points to.",
    type: "url",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: "/contact",
  },
  {
    key: "vii.global.location-tag",
    label: "Location Tag",
    description:
      "Short location shown below the wordmark in the header and footer (e.g. 'Detroit'). Leave blank to hide.",
    type: "text",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: "Detroit",
  },
  {
    key: "vii.global.footer-tagline",
    label: "Footer Tagline",
    description:
      "Short brand statement shown in the footer beneath the wordmark.",
    type: "textarea",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue:
      "A sanctuary for the senses. Personalized wellness experiences crafted for your body, mind, and spirit.",
  },
  {
    key: "vii.global.book-cta-text",
    label: "Header Book CTA Text",
    description: "Text for the prominent 'Book Now' button in the header.",
    type: "text",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: "Book Now",
  },
  {
    key: "vii.global.book-cta-link",
    label: "Header Book CTA Link",
    description: "URL the header 'Book Now' button points to.",
    type: "url",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: "/contact",
  },
];

// ─── Global: Product Page ─────────────────────────────────────────────────────

const globalProductData: TemplateField[] = [
  {
    key: "vii.global.product-shipping-description",
    label: "Product Shipping & Returns Text",
    description:
      "Shown in the 'Shipping & returns' accordion on every product page. Leave blank to hide that accordion.",
    type: "textarea",
    page: "global",
    group: "global.product",
    gridColumn: "col-span-full",
    defaultValue:
      "We ship within 1–2 business days. Returns are accepted within 30 days of delivery on unused items.",
  },
  {
    key: "vii.global.product-question-description",
    label: "Product 'Ask a Question' Text",
    description:
      "Shown in the 'Ask a question' accordion on every product page. Leave blank to hide that accordion.",
    type: "textarea",
    page: "global",
    group: "global.product",
    gridColumn: "col-span-full",
    defaultValue:
      "Have a question about this product? Our team is happy to help.",
  },
  {
    key: "vii.global.product-trust-badges",
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
        placeholder: "e.g. Ships in 1–2 business days",
      },
    ],
  },
];

// ─── Global: Authentication ───────────────────────────────────────────────────

const globalAuthenticationData: TemplateField[] = [
  {
    key: "vii.global.authentication-image",
    label: "Authentication Image",
    description: "Image shown on the sign-in and sign-up screens.",
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
    ...viiAboutData,
    ...viiTestimonialsData,
    ...viiBlogFields,
    ...viiContactData,
    ...viiCartData,
    ...viiCheckoutData,
    ...viiOrderData,
    ...globalBrandingData,
    ...globalProductData,
    ...globalAuthenticationData,
  ],
};

export const viiFieldGroups = {
  vii: [
    ...viiHomepageFieldGroups,
    ...viiShopFieldGroups,
    ...viiAboutFieldGroups,
    ...viiTestimonialsFieldGroups,
    viiBlogFieldGroup,
    ...viiContactFieldGroups,
    ...viiCartFieldGroups,
    ...viiCheckoutFieldGroups,
    ...viiOrderFieldGroups,
    {
      id: "global.branding",
      title: "Global Branding",
      description:
        "Announcement bar, location tag, footer tagline, and booking CTA used throughout the template",
      icon: "🏷️",
      columns: 2,
    } satisfies TemplateFieldGroup,
    {
      id: "global.product",
      title: "Global Product Page",
      description:
        "Shipping/returns text, 'ask a question' text, and trust badges shown on every product page",
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

const _viiFieldMap = new Map(viiData.vii.map((field) => [field.key, field]));

export function resolveFields(
  customFields: unknown,
  keys: string[],
): Record<string, string> {
  return resolveTemplateFields(customFields, keys, _viiFieldMap);
}
