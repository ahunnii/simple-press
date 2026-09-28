import type { TemplateSection } from "~/lib/template-sections";
import { SECTION_LINKS } from "~/lib/section-links";

import { umscAboutSections } from "./about";
import { umscAccountSections } from "./account";
import { umscCartCheckoutSections } from "./cart-checkout";
import { umscCollectionsSections } from "./collections";
import { umscContactSections } from "./contact";
import { umscFaqSections } from "./faq";
import { umscBlogSections } from "./blog";
import { umscEventsSections } from "./events";
import { umscVideosSections } from "./videos";
import { umscDonateSections } from "./donate";
import { umscServicesSections } from "./services";
import { umscHomepageSections } from "./homepage";
import { umscProductSections } from "./products";
import { umscShopSections } from "./shop";
import { umscTestimonialsSections } from "./testimonials";

/**
 * Curated visual-editor section rail for umsc (Tier 5). Each page domain
 * exports its own fragment in true render order; they are merged here in page
 * order. The product page's editable copy lives in `product.details`
 * (`products/`, page "product"); `generic/`, `account/` and `maintenance/`
 * contribute nothing — they have no fields. Cart / checkout / order fields
 * are defined but not editor-reachable (see page-playbooks.md) so they carry
 * no sections.
 */
const globalSections: TemplateSection[] = [
  {
    id: "global.branding",
    page: "global",
    title: "Header and footer",
    description:
      "Header tagline, mobile menu button, store visits link, Google review link, and the footer's shop links — shown on every page. Phone comes from Settings; the footer tagline and social links from Content → Branding; the announcement bar from Content → Announcements.",
    groupIds: ["global.branding"],
    order: 0,
    hideable: false,
    links: [
      SECTION_LINKS.branding,
      SECTION_LINKS.businessContact,
      SECTION_LINKS.announcements,
    ],
  },
  {
    id: "global.authentication",
    page: "global",
    title: "Sign-in screens",
    description: "Image shown on the sign-in and sign-up screens",
    groupIds: ["global.authentication"],
    order: 1,
    hideable: false,
  },
];

export const umscSections: Record<string, TemplateSection[]> = {
  umsc: [
    ...globalSections,
    ...umscHomepageSections,
    ...umscShopSections,
    ...umscProductSections,
    ...umscCollectionsSections,
    ...umscAboutSections,
    ...umscContactSections,
    ...umscTestimonialsSections,
    ...umscFaqSections,
    ...umscBlogSections,
    ...umscEventsSections,
    ...umscVideosSections,
    ...umscDonateSections,
    ...umscServicesSections,
    ...umscAccountSections,
    ...umscCartCheckoutSections,
  ],
};
