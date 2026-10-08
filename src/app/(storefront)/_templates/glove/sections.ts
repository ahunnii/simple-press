import type { TemplateSection } from "~/lib/template-sections";
import { SECTION_LINKS } from "~/lib/section-links";

import { gloveAboutSections } from "./about";
import { gloveAccountSections } from "./account";
import { gloveBlogSections } from "./blog";
import {
  gloveCartSections,
  gloveCheckoutSections,
  gloveOrderSections,
} from "./cart-checkout";
import { gloveCollectionsSections } from "./collections";
import { gloveContactSections } from "./contact";
import { gloveDonateSections } from "./donate";
import { gloveEventsSections } from "./events";
import { gloveFaqSections } from "./faq";
import { gloveHomepageSections } from "./homepage";
import { gloveProductSections } from "./products";
import { gloveShopSections } from "./shop";
import { gloveTestimonialsSections } from "./testimonials";
import { gloveVideosSections } from "./videos";

/**
 * Curated section registry for the `glove` template, merged in page order:
 * global chrome first, then each page domain's fragment. `id` equals the
 * `data-sp-group` value (`${page}.${group}`); `order` is re-numbered below.
 */
const globalSections: TemplateSection[] = [
  {
    id: "global.header",
    page: "global",
    title: "Header",
    description:
      "Order tracking link and account button. Email and phone in the top strip come from Settings; the logo and menu come from Content → Branding and Navigation.",
    groupIds: ["global.header"],
    order: 0,
    hideable: false,
    links: [SECTION_LINKS.branding, SECTION_LINKS.businessContact],
  },
  {
    id: "global.footer",
    page: "global",
    title: "Footer",
    description:
      "Badge, blurb, column headings, contact text and payment logos. Social links come from Content → Branding.",
    groupIds: ["global.footer"],
    order: 1,
    hideable: false,
    links: [SECTION_LINKS.branding, SECTION_LINKS.businessContact],
  },
  {
    id: "global.authentication",
    page: "global",
    title: "Sign-in screens",
    description: "Image shown beside the sign-in and sign-up forms.",
    groupIds: ["global.authentication"],
    order: 2,
    hideable: false,
  },
];

const allSections: TemplateSection[] = [
  ...globalSections,
  ...gloveHomepageSections,
  ...gloveShopSections,
  ...gloveProductSections,
  ...gloveCollectionsSections,
  ...gloveAboutSections,
  ...gloveContactSections,
  ...gloveTestimonialsSections,
  ...gloveBlogSections,
  ...gloveEventsSections,
  ...gloveVideosSections,
  ...gloveDonateSections,
  ...gloveFaqSections,
  ...gloveCartSections,
  ...gloveCheckoutSections,
  ...gloveOrderSections,
  ...gloveAccountSections,
].map((section, order) => ({ ...section, order }));

export const gloveSections: Record<string, TemplateSection[]> = {
  glove: allSections,
};
