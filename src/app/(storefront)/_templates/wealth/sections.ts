import type { TemplateSection } from "~/lib/template-sections";

import { wealthAboutSections } from "./about";
import { wealthBlogSections } from "./blog";
import { wealthContactSections } from "./contact";
import { wealthDonateSections } from "./donate";
import { wealthGenericSections } from "./generic";
import { wealthHomepageSections } from "./homepage";
import { wealthServicesSections } from "./services";
import { wealthTestimonialsSections } from "./testimonials";

/**
 * Curated section registry for the `wealth` template (Detroit Community
 * Wealth Fund). Each page domain authors its own fragment next to its
 * components (visual render order, hideable flags); this file only merges
 * them and adds the global chrome sections. `id` matches the
 * `data-sp-group` value used by the preview overlay (`${page}.${group}`).
 */
export const wealthSections: Record<string, TemplateSection[]> = {
  wealth: [
    // ─── Global (chrome) ──────────────────────────────────────────────────
    {
      id: "global.branding",
      page: "global",
      title: "Footer & Navigation",
      description:
        "Footer contact block, partner logo, and the menu's Resources link — shown on every page",
      groupIds: ["global.branding"],
      order: 0,
      hideable: false,
    },
    {
      id: "global.newsletter",
      page: "global",
      title: "Footer Newsletter",
      description:
        "The footer Subscribe block shown on every page (sign-ups show a coming-soon note until a mailing list is connected)",
      groupIds: ["global.newsletter"],
      order: 1,
      hideable: false,
    },

    ...wealthHomepageSections,
    ...wealthAboutSections,
    ...wealthContactSections,
    ...wealthTestimonialsSections,
    ...wealthServicesSections,
    ...wealthDonateSections,
    ...wealthBlogSections,
    ...wealthGenericSections,
  ],
};
