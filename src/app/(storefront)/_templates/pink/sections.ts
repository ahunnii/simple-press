import type { TemplateSection } from "~/lib/template-sections";

import { pinkAboutSections } from "./about";
import { pinkAccountSections } from "./account";
import { pinkBlogSections } from "./blog";
import { pinkCartCheckoutSections } from "./cart-checkout";
import { pinkCollectionsSections } from "./collections";
import { pinkContactSections } from "./contact";
import { pinkGenericSections } from "./generic";
import { pinkHomepageSections } from "./homepage";
import { pinkGlobalSections } from "./layout";
import { pinkProductSections } from "./products";
import { pinkServicesSections } from "./services";
import { pinkShopSections } from "./shop";
import { pinkTestimonialsSections } from "./testimonials";

/**
 * Curated section registry for the `pink` template, merged in page order:
 * homepage → about → shop → product (page "global") → collections → services →
 * blog → testimonials → contact → cart/checkout → global chrome.
 *
 * Every field group defined under `index.ts` must be covered by exactly one
 * section here (the triple-match invariant: section `id` === field-group `id`
 * === the `data-sp-group` attribute === `"${page}.${group}"`). Asserted by
 * `src/lib/template-sections.test.ts`, which also checks pink's `blog.post-*`
 * sections carry `renderContext: "blog-post"`.
 *
 * `generic` and `account` contribute nothing — the generic page's chrome lives
 * in the `global.*` sections, and account pages have no fields at all.
 */
export const pinkSections: Record<string, TemplateSection[]> = {
  pink: [
    ...pinkHomepageSections,
    ...pinkAboutSections,
    ...pinkShopSections,
    ...pinkProductSections,
    ...pinkCollectionsSections,
    ...pinkServicesSections,
    ...pinkBlogSections,
    ...pinkTestimonialsSections,
    ...pinkContactSections,
    ...pinkCartCheckoutSections,
    ...pinkGenericSections,
    ...pinkAccountSections,
    ...pinkGlobalSections,
  ],
};
