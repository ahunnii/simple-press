import type { TemplateSection } from "~/lib/template-sections";

import { pinkAboutSections } from "./about";
import { pinkAccountSections } from "./account";
import { pinkBlogSections, pinkOwnerSections } from "./blog";
import { pinkCartCheckoutSections } from "./cart-checkout";
import { pinkCollectionsSections } from "./collections";
import { pinkContactSections } from "./contact";
import { pinkEventsSections } from "./events";
import { pinkGenericSections } from "./generic";
import { pinkHomepageSections } from "./homepage";
import { pinkGlobalSections } from "./layout";
import { pinkProductSections } from "./products";
import { pinkServicesSections } from "./services";
import { pinkShopSections } from "./shop";
import { pinkTestimonialsSections } from "./testimonials";
import { pinkVideosSections } from "./videos";

/**
 * Curated section registry for the `pink` template, merged in page order:
 * homepage → about → shop → product → collections → services →
 * events → videos → blog → testimonials → contact → cart/checkout → global
 * chrome.
 *
 * `videos.*` covers the `/videos` page (published `Video` records synced from
 * YouTube); its homepage teaser is the separate `homepage.videos` section.
 *
 * `events.*` covers the `/events` page (real, dated `Event` records). The
 * homepage's two calendar-adjacent bands are distinct sections and must stay
 * that way: `homepage.upcoming` renders the same DB records as a teaser,
 * `homepage.events` is the evergreen, date-free "Make & Takes" explainer.
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
    ...pinkEventsSections,
    ...pinkVideosSections,
    ...pinkBlogSections,
    ...pinkTestimonialsSections,
    ...pinkContactSections,
    ...pinkCartCheckoutSections,
    ...pinkGenericSections,
    ...pinkAccountSections,
    ...pinkGlobalSections,
    ...pinkOwnerSections,
  ],
};
