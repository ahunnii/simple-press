import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import { resolveTemplateFields } from "~/lib/resolve-template-fields";

import { noiseAboutData, noiseAboutFieldGroups } from "./about";
import { noiseBlogData, noiseBlogFieldGroups } from "./blog";
import { sledgeContactData, sledgeContactFieldGroups } from "./contact";
import { noiseHomepageData, noiseHomepageFieldGroups } from "./homepage";

// ─── Shop Page ────────────────────────────────────────────────────────────────

const shopListingData: TemplateField[] = [
  {
    key: "sledge.shop-listing-heading",
    label: "Shop Page Heading",
    description: "Heading for the shop listing page",
    type: "text",
    page: "shop",
    group: "shop.listing",
    gridColumn: "col-span-1",
    defaultValue: "What's New",
  },
  {
    key: "sledge.shop-listing-intro",
    label: "Shop Page Intro",
    description: "Optional intro text below the shop heading",
    type: "textarea",
    page: "shop",
    group: "shop.listing",
    gridColumn: "col-span-full",
  },
];

// ─── Global: Branding ─────────────────────────────────────────────────────────

const globalBrandingData: TemplateField[] = [
  {
    key: "sledge.global.location-tag",
    label: "Location Tag",
    description:
      "Short location or brand identifier shown below your wordmark (e.g. · DETROIT ·). Leave blank to hide.",
    type: "text",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: "",
  },
  {
    key: "sledge.global.footer-tagline",
    label: "Footer Notice (“Heads Up”)",
    description:
      "Short notice shown in the dark footer beside the “Heads Up” heading.",
    type: "textarea",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue:
      "All sales are final. No returns — we value your time and ours. Each piece is handcrafted with care, and accepting returns would increase costs, which we'd rather avoid. Please order only if you truly love it!",
  },
  {
    key: "sledge.global.shop-cta-text",
    label: "Shop CTA Text",
    description:
      "Text for the main 'shop' call-to-action used in the blog post band, cart empty state, and orders empty state.",
    type: "text",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: "What's New",
  },
  {
    key: "sledge.global.shop-cta-link",
    label: "Shop CTA Link",
    description: "URL for the main shop call-to-action.",
    type: "url",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: "/shop",
  },
];

// ─── Global: Authentication ───────────────────────────────────────────────────

const globalAuthenticationData: TemplateField[] = [
  {
    key: "sledge.global.authentication-image",
    label: "Authentication Page Image",
    description: "Image shown on sign-in/sign-up pages",
    type: "image",
    page: "global",
    group: "global.authentication",
    gridColumn: "col-span-full",
  },
];

// ─── Global: Product Page ─────────────────────────────────────────────────────

const globalProductData: TemplateField[] = [
  {
    key: "sledge.global.product-trust-badges",
    label: "Product Trust Badges",
    description:
      "Bold trust lines shown on every product page (e.g. 'One size fits most!', '30-day returns')",
    type: "list",
    page: "global",
    group: "global.product",
    gridColumn: "col-span-full",
    maxItems: 6,
    itemSchema: [
      {
        key: "label",
        label: "Badge Text",
        type: "text",
        placeholder: "e.g. Free shipping on orders over $100!",
      },
    ],
  },
  {
    key: "sledge.global.product-shipping-description",
    label: "Shipping Description",
    description:
      "Short shipping note shown in bold on every product page below the description",
    type: "text",
    page: "global",
    group: "global.product",
    gridColumn: "col-span-1",
    defaultValue: "",
  },
  {
    key: "sledge.global.product-question-description",
    label: "Ask a Question Link Text",
    description: "Contact prompt shown below the product description",
    type: "text",
    page: "global",
    group: "global.product",
    gridColumn: "col-span-1",
    defaultValue: "",
  },
  {
    key: "sledge.global.product-care-instructions",
    label: "Care Instructions",
    description:
      "Care instructions shown in a 'Details' accordion on every product page",
    type: "textarea",
    page: "global",
    group: "global.product",
    gridColumn: "col-span-full",
    defaultValue: "",
  },
  {
    key: "sledge.global.product-shipping-details",
    label: "Shipping Details",
    description:
      "Shipping policy shown in a 'Shipping & Returns' accordion on every product page",
    type: "textarea",
    page: "global",
    group: "global.product",
    gridColumn: "col-span-full",
    defaultValue: "",
  },
];

// ─── Field Groups ─────────────────────────────────────────────────────────────

const fieldGroups: TemplateFieldGroup[] = [
  ...noiseHomepageFieldGroups,
  ...noiseAboutFieldGroups,
  ...noiseBlogFieldGroups,
  ...sledgeContactFieldGroups,
  {
    id: "global.product",
    title: "Product Page",
    description: "Trust badges and shipping note shown on every product page",
    icon: "🛍️",
    columns: 2,
  },
  {
    id: "global.branding",
    title: "Global Branding",
    description:
      "Location tag, footer tagline, and shop CTA used throughout the template",
    icon: "🏷️",
    columns: 2,
  },
  {
    id: "shop.listing",
    title: "Shop Page",
    description: "Heading and intro for the shop listing page",
    icon: "🏪",
    columns: 1,
  },
  {
    id: "global.authentication",
    title: "Authentication",
    description: "Image shown on sign-in and sign-up pages",
    icon: "🔑",
    columns: 1,
  },
];

// ─── Exports ──────────────────────────────────────────────────────────────────

export const sledgeData = {
  sledge: [
    ...noiseHomepageData,
    ...noiseAboutData,
    ...sledgeContactData,
    ...shopListingData,
    ...noiseBlogData,
    ...globalBrandingData,
    ...globalAuthenticationData,
    ...globalProductData,
  ],
};

export const sledgeFieldGroups = {
  sledge: fieldGroups,
};

const _sledgeFieldMap = new Map(
  sledgeData.sledge.map((field) => [field.key, field]),
);

export function resolveFields(
  customFields: unknown,
  keys: string[],
): Record<string, string> {
  return resolveTemplateFields(customFields, keys, _sledgeFieldMap);
}
