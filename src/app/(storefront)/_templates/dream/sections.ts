import type { TemplateSection } from "~/lib/template-sections";
import { SECTION_LINKS } from "~/lib/section-links";

import { dreamAboutSections } from "./about";
import { dreamAccountSections } from "./account";
import { dreamBlogSections } from "./blog";
import { dreamCartCheckoutSections } from "./cart-checkout";
import { dreamCheckoutUnavailableSections } from "./cart-checkout/unavailable-fields";
import { dreamCollectionsSections } from "./collections";
import { dreamContactSections } from "./contact";
import { dreamDonateSections } from "./donate";
import { dreamEventsSections } from "./events";
import { dreamFaqSections } from "./faq";
import { dreamHomepageSections } from "./homepage";
import { dreamProductSections } from "./products";
import { dreamServicesSections } from "./services";
import { dreamShopSections } from "./shop";
import { dreamTestimonialsSections } from "./testimonials";
import { dreamVideosSections } from "./videos";

/**
 * Curated section registry for the `dream` template (Dream Your Theme —
 * event decor). Each page domain authors its own fragment next to its
 * components; this file only merges them and adds the global chrome
 * sections. `id` matches the `data-sp-group` value used by the preview
 * overlay (`${page}.${group}`) — see `wealth/sections.ts` for the pattern.
 */
export const dreamSections: Record<string, TemplateSection[]> = {
  dream: [
    // ─── Global (chrome) ──────────────────────────────────────────────────
    {
      id: "global.branding",
      page: "global",
      title: "Header and footer",
      description:
        "Header button, footer sign-off, and service area — shown on every page. Email, phone, and hours come from Settings; the footer tagline and social links from Content → Branding; the announcement bar from Content → Announcements",
      groupIds: ["global.branding"],
      links: [
        SECTION_LINKS.branding,
        SECTION_LINKS.businessContact,
        SECTION_LINKS.businessHours,
        SECTION_LINKS.announcements,
      ],
      order: 0,
      hideable: false,
    },
    {
      id: "global.authentication",
      page: "global",
      title: "Authentication",
      description:
        "Background image and logo size on the sign-in and sign-up screens",
      groupIds: ["global.authentication"],
      order: 1,
      hideable: false,
    },
    ...dreamAccountSections,

    ...dreamHomepageSections,
    ...dreamAboutSections,
    ...dreamServicesSections,
    ...dreamContactSections,
    ...dreamTestimonialsSections,
    ...dreamProductSections,
    ...dreamShopSections,
    ...dreamCartCheckoutSections,
    ...dreamCheckoutUnavailableSections,
    ...dreamCollectionsSections,
    ...dreamBlogSections,
    ...dreamEventsSections,
    ...dreamVideosSections,
    ...dreamDonateSections,
    ...dreamFaqSections,
  ],
};
