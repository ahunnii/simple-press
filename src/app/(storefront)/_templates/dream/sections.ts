import type { TemplateSection } from "~/lib/template-sections";

import { dreamAboutSections } from "./about";
import { dreamContactSections } from "./contact";
import { dreamHomepageSections } from "./homepage";
import { dreamServicesSections } from "./services";
import { dreamTestimonialsSections } from "./testimonials";

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
      title: "Topbar, Navigation & Footer",
      description:
        "Announcement bar, header CTA, gallery link, and the footer's brand/contact copy — shown on every page",
      groupIds: ["global.branding"],
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

    ...dreamHomepageSections,
    ...dreamAboutSections,
    ...dreamServicesSections,
    ...dreamContactSections,
    ...dreamTestimonialsSections,
  ],
};
