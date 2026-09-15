import type { TemplateSection } from "~/lib/template-sections";

import { oliveAboutSections } from "./about";
import { oliveBlogSections } from "./blog";
import { oliveCartSections, oliveCheckoutSections } from "./cart-checkout";
import { oliveCollectionsSections } from "./collections";
import { oliveContactSections } from "./contact";
import { oliveHomepageSections } from "./homepage";
import { oliveShopSections } from "./shop";
import { oliveTestimonialsSections } from "./testimonials";

/**
 * Curated section registry for the `olive` template, merged in page order:
 * global chrome → homepage → shop → collections → about → contact →
 * testimonials → blog → cart → checkout.
 *
 * Every field group defined under `index.ts` must be covered by exactly one
 * section here (the triple-match invariant: section `id` === field-group `id`
 * === the `data-sp-group` attribute === `"${page}.${group}"`). Asserted by
 * `src/lib/template-sections.test.ts`.
 *
 * `products/`, `generic/`, `account/` and `maintenance/` contribute nothing —
 * the product page's copy lives in `global.product`, the rest have no fields.
 *
 * Each domain's fragment carries local `order` values; they are renumbered
 * here so the merged list is monotonic.
 */
const globalSections: TemplateSection[] = [
  {
    id: "global.branding",
    page: "global",
    title: "Branding & Footer",
    description:
      "Wordmark tagline, footer cover panel, call-to-action card and social links",
    groupIds: ["global.branding"],
    order: 0,
    hideable: false,
  },
  {
    id: "global.product",
    page: "global",
    title: "Product Page Copy",
    description:
      "Shipping / returns accordions, the questions line and trust badges on every product page",
    groupIds: ["global.product"],
    order: 1,
    hideable: false,
  },
  {
    id: "global.authentication",
    page: "global",
    title: "Sign-in Screens",
    description: "Image and logo size on the sign-in and sign-up screens",
    groupIds: ["global.authentication"],
    order: 2,
    hideable: false,
  },
];

const merged: TemplateSection[] = [
  ...globalSections,
  ...oliveHomepageSections,
  ...oliveShopSections,
  ...oliveCollectionsSections,
  ...oliveAboutSections,
  ...oliveContactSections,
  ...oliveTestimonialsSections,
  ...oliveBlogSections,
  ...oliveCartSections,
  ...oliveCheckoutSections,
].map((section, order) => ({ ...section, order }));

export const oliveSections: Record<string, TemplateSection[]> = {
  olive: merged,
};
