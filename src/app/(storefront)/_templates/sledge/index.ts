import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import { resolveTemplateFields } from "~/lib/resolve-template-fields";

import { sledgeAboutData, sledgeAboutFieldGroups } from "./about";
import { sledgeBlogData, sledgeBlogFieldGroups } from "./blog";
import {
  sledgeCartData,
  sledgeCartFieldGroups,
} from "./cart-checkout/cart-fields";
import {
  sledgeCheckoutUnavailableData,
  sledgeCheckoutUnavailableFieldGroups,
} from "./cart-checkout/unavailable-fields";
import {
  sledgeCollectionsData,
  sledgeCollectionsFieldGroups,
} from "./collections";
import { sledgeContactData, sledgeContactFieldGroups } from "./contact";
import { sledgeHomepageData, sledgeHomepageFieldGroups } from "./homepage";
import { sledgeProductData, sledgeProductFieldGroups } from "./products";
import {
  sledgeTestimonialsData,
  sledgeTestimonialsFieldGroups,
} from "./testimonials";

// ─── Shop Page ────────────────────────────────────────────────────────────────

const shopListingData: TemplateField[] = [
  {
    key: "sledge.shop-listing-heading",
    label: "Heading",
    description: "Heading at the top of the shop page.",
    type: "text",
    page: "shop",
    group: "shop.listing",
    gridColumn: "col-span-1",
    defaultValue: "What's New",
  },
  {
    key: "sledge.shop-listing-intro",
    label: "Intro text",
    description: "Line below the heading. Leave blank to hide.",
    type: "textarea",
    page: "shop",
    group: "shop.listing",
    gridColumn: "col-span-full",
  },
];

// ─── Global: Branding ─────────────────────────────────────────────────────────

const globalBrandingData: TemplateField[] = [
  {
    key: "sledge.global.footer-notice-heading",
    label: "Notice heading",
    description:
      "Heading above the footer notice, shown at the bottom of every page. Leave blank to hide.",
    type: "text",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: "Heads Up!",
  },
  {
    key: "sledge.global.footer-tagline",
    label: "Footer notice",
    description:
      "Short store notice shown in the footer under the notice heading above (e.g. a returns policy). Separate from the footer tagline in Content → Branding. Leave blank to hide.",
    type: "textarea",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue:
      "All sales are final. No returns — we value your time and ours. Each piece is handcrafted with care, and accepting returns would increase costs, which we'd rather avoid. Please order only if you truly love it!",
  },
  {
    key: "sledge.global.shop-cta-text",
    label: "Shop button text",
    description:
      "Text for the shared shop button used in the blog post banner, empty cart, and empty orders list.",
    type: "text",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: "Browse Shop",
  },
  {
    key: "sledge.global.shop-cta-link",
    label: "Shop button link",
    description: "Where the shared shop button points.",
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
    label: "Authentication image",
    description: "Image shown on the sign-in and sign-up pages.",
    type: "image",
    page: "global",
    group: "global.authentication",
    gridColumn: "col-span-full",
  },
];

// ─── Field Groups ─────────────────────────────────────────────────────────────

const fieldGroups: TemplateFieldGroup[] = [
  ...sledgeHomepageFieldGroups,
  ...sledgeAboutFieldGroups,
  ...sledgeBlogFieldGroups,
  ...sledgeContactFieldGroups,
  ...sledgeCollectionsFieldGroups,
  ...sledgeTestimonialsFieldGroups,
  ...sledgeProductFieldGroups,
  ...sledgeCartFieldGroups,
  ...sledgeCheckoutUnavailableFieldGroups,
  {
    id: "global.branding",
    title: "Site branding",
    description:
      "Footer notice heading and text, plus the shop button text and link reused across pages.",
    icon: "🏷️",
    columns: 2,
  },
  {
    id: "shop.listing",
    title: "Shop page",
    description: "Heading and intro for the shop page.",
    icon: "🏪",
    columns: 1,
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

export const sledgeData = {
  sledge: [
    ...sledgeHomepageData,
    ...sledgeAboutData,
    ...sledgeContactData,
    ...sledgeCollectionsData,
    ...shopListingData,
    ...sledgeBlogData,
    ...globalBrandingData,
    ...globalAuthenticationData,
    ...sledgeProductData,
    ...sledgeCartData,
    ...sledgeCheckoutUnavailableData,
    ...sledgeTestimonialsData,
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
