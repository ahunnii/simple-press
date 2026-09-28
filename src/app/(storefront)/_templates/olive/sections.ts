import type { TemplateSection } from "~/lib/template-sections";
import { SECTION_LINKS } from "~/lib/section-links";

import { oliveAboutSections } from "./about";
import { oliveBlogSections } from "./blog";
import { oliveCartSections, oliveCheckoutSections } from "./cart-checkout";
import { oliveCollectionsSections } from "./collections";
import { oliveContactSections } from "./contact";
import { oliveDonateSections } from "./donate";
import { oliveEventsSections } from "./events";
import { oliveFaqSections } from "./faq";
import { oliveHomepageSections } from "./homepage";
import { oliveServicesSections } from "./services";
import { oliveShopSections } from "./shop";
import { oliveTestimonialsSections } from "./testimonials";
import { oliveVideosSections } from "./videos";

/**
 * Curated section registry for the `olive` template, merged in page order:
 * global chrome → homepage → shop → product → collections → about →
 * contact → testimonials → blog → services → events → videos → donate →
 * faq → cart → checkout.
 *
 * Every field group defined under `index.ts` must be covered by exactly one
 * section here (the triple-match invariant: section `id` === field-group `id`
 * === the `data-sp-group` attribute === `"${page}.${group}"`). Asserted by
 * `src/lib/template-sections.test.ts`.
 *
 * The product page's copy lives in `product.details` plus the hideable
 * `product.shipping` / `product.returns` / `product.questions` rows (fields in
 * `products/index.ts`, keys still `olive.global.product-*`); `generic/`,
 * `account/` and `maintenance/` contribute nothing — they have no fields.
 *
 * Each domain's fragment carries local `order` values; they are renumbered
 * here so the merged list is monotonic.
 */
const globalSections: TemplateSection[] = [
  {
    id: "global.branding",
    page: "global",
    title: "Footer",
    description:
      "Wordmark tagline and the footer call-to-action card. The footer tagline and social links come from Content → Branding.",
    groupIds: ["global.branding"],
    order: 0,
    hideable: false,
    links: [SECTION_LINKS.branding],
  },
  {
    id: "global.authentication",
    page: "global",
    title: "Sign-in screens",
    description: "Image and logo size on the sign-in and sign-up screens",
    groupIds: ["global.authentication"],
    order: 1,
    hideable: false,
  },
];

// Every product page; previewed on a representative published product.
const productSections: TemplateSection[] = [
  {
    id: "product.details",
    page: "product",
    title: "Product page",
    description:
      "Reviews heading, related products, coming-soon copy and trust badges on every product page",
    groupIds: ["product.details"],
    order: 0,
    hideable: false,
    links: [SECTION_LINKS.products],
  },
  {
    id: "product.shipping",
    page: "product",
    title: "Shipping row",
    description:
      "Shipping text and policy link, shown in its own row on every product page.",
    groupIds: ["product.shipping"],
    order: 1,
    hideable: true,
    links: [SECTION_LINKS.products],
  },
  {
    id: "product.returns",
    page: "product",
    title: "Returns row",
    description:
      "Returns text and policy link, shown in its own row on every product page.",
    groupIds: ["product.returns"],
    order: 2,
    hideable: true,
    links: [SECTION_LINKS.products],
  },
  {
    id: "product.questions",
    page: "product",
    title: "Questions row",
    description: "Contact link, shown in its own row on every product page.",
    groupIds: ["product.questions"],
    order: 3,
    hideable: true,
    links: [SECTION_LINKS.products],
  },
];

const merged: TemplateSection[] = [
  ...globalSections,
  ...oliveHomepageSections,
  ...oliveShopSections,
  ...productSections,
  ...oliveCollectionsSections,
  ...oliveAboutSections,
  ...oliveContactSections,
  ...oliveTestimonialsSections,
  ...oliveBlogSections,
  ...oliveServicesSections,
  ...oliveEventsSections,
  ...oliveVideosSections,
  ...oliveDonateSections,
  ...oliveFaqSections,
  ...oliveCartSections,
  ...oliveCheckoutSections,
].map((section, order) => ({ ...section, order }));

export const oliveSections: Record<string, TemplateSection[]> = {
  olive: merged,
};
