import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import { resolveTemplateFields } from "~/lib/resolve-template-fields";

import { noiseAboutData, noiseAboutFieldGroups } from "./about";
import { noiseBlogData, noiseBlogFieldGroups } from "./blog";
import {
  noiseCartCheckoutData,
  noiseCartCheckoutFieldGroups,
} from "./cart-checkout";
import {
  noiseCollectionsData,
  noiseCollectionsFieldGroups,
} from "./collections";
import { noiseContactData, noiseContactFieldGroups } from "./contact";
import { noiseHomepageData, noiseHomepageFieldGroups } from "./homepage";
import { noiseProductData, noiseProductFieldGroups } from "./products";

// ─── Shop Page ────────────────────────────────────────────────────────────────

const shopListingData: TemplateField[] = [
  {
    key: "noise.shop-listing-overline",
    label: "Small label",
    description:
      "Small label above the heading on the shop page. Leave blank to hide.",
    type: "text",
    page: "shop",
    group: "shop.listing",
    gridColumn: "col-span-full",
    defaultValue: "Shop",
  },
  {
    key: "noise.shop-listing-heading",
    label: "Heading",
    description: "Heading at the top of the shop page.",
    type: "text",
    page: "shop",
    group: "shop.listing",
    gridColumn: "col-span-1",
    defaultValue: "The Collection",
  },
  {
    key: "noise.shop-listing-intro",
    label: "Intro text",
    description:
      "Optional text below the heading on the shop page. Leave blank to hide.",
    type: "textarea",
    page: "shop",
    group: "shop.listing",
    gridColumn: "col-span-full",
  },
];

// ─── Global: Branding ─────────────────────────────────────────────────────────
// The wordmark's small location label, footer tagline, and footer social
// links no longer live here — they read from Settings → General (address
// city) and Content → Branding (footer tagline, social links). See
// `shared/noise-location-tag.ts` and `RETIRED_TEMPLATE_KEYS` in
// `~/lib/template-fields`. Only the shop button fields remain; the group id
// stays `global.branding` because it's the `data-sp-group` on the header and
// footer.

const globalBrandingData: TemplateField[] = [
  {
    key: "noise.global.shop-cta-text",
    label: "Shop button text",
    description:
      "Text for the button in the shop banner at the bottom of every blog post.",
    type: "text",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: "Shop the Collection",
  },
  {
    key: "noise.global.shop-cta-link",
    label: "Shop button link",
    description: "Where the blog post shop banner button sends visitors.",
    type: "url",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: "/shop",
  },
];

// ─── Testimonials Page ────────────────────────────────────────────────────────

const testimonialsPageData: TemplateField[] = [
  {
    key: "noise.testimonials.page-overline",
    label: "Small label",
    description: "Small label above the heading at the top of the page.",
    type: "text",
    page: "testimonials",
    group: "testimonials.page",
    gridColumn: "col-span-1",
    defaultValue: "From the people wearing it",
  },
  {
    key: "noise.testimonials.page-intro",
    label: "Intro text",
    description: "Short paragraph below the page heading.",
    type: "textarea",
    page: "testimonials",
    group: "testimonials.page",
    gridColumn: "col-span-full",
    defaultValue:
      "Unedited notes from our customers. We publish every review we receive — high and low.",
  },
  {
    key: "noise.testimonials.cta-overline",
    label: "Small label — closing section",
    description:
      "Small label above the closing section at the bottom of the page.",
    type: "text",
    page: "testimonials",
    group: "testimonials.page",
    gridColumn: "col-span-1",
    defaultValue: "Wearing something of ours?",
  },
  {
    key: "noise.testimonials.cta-heading",
    label: "Heading — closing section",
    description: "Heading for the closing section at the bottom of the page.",
    type: "text",
    page: "testimonials",
    group: "testimonials.page",
    gridColumn: "col-span-1",
    defaultValue: "Tell us how it's holding up.",
  },
  {
    key: "noise.testimonials.cta-body",
    label: "Body text — closing section",
    description: "Body text for the closing section at the bottom of the page.",
    type: "textarea",
    page: "testimonials",
    group: "testimonials.page",
    gridColumn: "col-span-full",
    defaultValue:
      "We read every note that comes in. Honest feedback — the awkward kind included — is how we know what to make next.",
  },
  {
    key: "noise.testimonials.empty-state-text",
    label: "Empty state text",
    description: "Text shown when there are no testimonials yet.",
    type: "text",
    page: "testimonials",
    group: "testimonials.page",
    gridColumn: "col-span-full",
    defaultValue: "No voices yet. Check back soon.",
  },
];

// ─── Global: Authentication ───────────────────────────────────────────────────

const globalAuthenticationData: TemplateField[] = [
  {
    key: "noise.global.authentication-image",
    label: "Sign-in image",
    description: "Image shown beside the sign-in and sign-up forms.",
    type: "image",
    page: "global",
    group: "global.authentication",
    gridColumn: "col-span-full",
  },
];

// ─── Field Groups ─────────────────────────────────────────────────────────────

const fieldGroups: TemplateFieldGroup[] = [
  ...noiseHomepageFieldGroups,
  ...noiseAboutFieldGroups,
  ...noiseBlogFieldGroups,
  ...noiseCollectionsFieldGroups,
  ...noiseContactFieldGroups,
  ...noiseProductFieldGroups,
  ...noiseCartCheckoutFieldGroups,
  {
    id: "global.branding",
    title: "Site branding",
    description:
      "Shop button shown in the blog post banner. The small label under the wordmark is your city from Settings; the footer tagline and social links come from Content → Branding.",
    icon: "🏷️",
    columns: 2,
  },
  {
    id: "shop.listing",
    title: "Shop page",
    description: "Small label, heading, and intro text for the shop page.",
    icon: "🏪",
    columns: 1,
  },
  {
    id: "testimonials.page",
    title: "Testimonials page",
    description:
      "Small label, intro, closing section, and empty state for the testimonials page.",
    icon: "💬",
    columns: 2,
  },
  {
    id: "global.authentication",
    title: "Sign-in pages",
    description: "Image shown beside the sign-in and sign-up forms.",
    icon: "🔑",
    columns: 1,
  },
];

// ─── Exports ──────────────────────────────────────────────────────────────────

export const noiseData = {
  noise: [
    ...noiseHomepageData,
    ...noiseAboutData,
    ...noiseContactData,
    ...shopListingData,
    ...noiseCollectionsData,
    ...noiseBlogData,
    ...testimonialsPageData,
    ...noiseProductData,
    ...noiseCartCheckoutData,
    ...globalBrandingData,
    ...globalAuthenticationData,
  ],
};

export const noiseFieldGroups = {
  noise: fieldGroups,
};

const _noiseFieldMap = new Map(
  noiseData.noise.map((field) => [field.key, field]),
);

export function resolveFields(
  customFields: unknown,
  keys: string[],
): Record<string, string> {
  return resolveTemplateFields(customFields, keys, _noiseFieldMap);
}
