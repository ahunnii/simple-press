import type { TemplateSection } from "~/lib/template-sections";

import { umscAboutSections } from "./about";
import { umscAccountSections } from "./account";
import { umscCollectionsSections } from "./collections";
import { umscContactSections } from "./contact";
import { umscFaqSections } from "./faq";
import { umscHomepageSections } from "./homepage";
import { umscShopSections } from "./shop";
import { umscTestimonialsSections } from "./testimonials";

/**
 * Curated visual-editor section rail for umsc (Tier 5). Each page domain
 * exports its own fragment in true render order; they are merged here in page
 * order. `products/`, `generic/`, `account/` and `maintenance/` contribute
 * nothing — the product page's editable copy lives in `global.product`, the
 * rest have no fields. Cart / checkout / order fields are defined but not
 * editor-reachable (see page-playbooks.md) so they carry no sections.
 */
const globalSections: TemplateSection[] = [
  {
    id: "global.branding",
    page: "global",
    title: "Site Branding",
    description:
      "Announcement bar, header tagline, footer tagline, store visits, customer service, Google review and social links — shown on every page",
    groupIds: ["global.branding"],
    order: 0,
    hideable: false,
  },
  {
    id: "global.product",
    page: "global",
    title: "Product Page Copy",
    description:
      "Shipping & pickup text, the ask-a-question line and trust badges shown on every product page",
    groupIds: ["global.product"],
    order: 1,
    hideable: false,
  },
  {
    id: "global.authentication",
    page: "global",
    title: "Sign-in Screens",
    description: "Image shown on the sign-in and sign-up screens",
    groupIds: ["global.authentication"],
    order: 2,
    hideable: false,
  },
];

export const umscSections: Record<string, TemplateSection[]> = {
  umsc: [
    ...globalSections,
    ...umscHomepageSections,
    ...umscShopSections,
    ...umscCollectionsSections,
    ...umscAboutSections,
    ...umscContactSections,
    ...umscTestimonialsSections,
    ...umscFaqSections,
    ...umscAccountSections,
  ],
};
