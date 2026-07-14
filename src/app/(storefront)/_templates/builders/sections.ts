import type { TemplateSection } from "~/lib/template-sections";

/**
 * Curated section registry for the `builders` template (Industrial
 * Solidarity — service/brochure template). Covers the pages builders
 * renders with its own components and that are reachable in `/editor`
 * (see `PAGE_PREVIEW_PATHS`): homepage, about, contact, services,
 * testimonials. Commerce pages fall back to the `default` template and are
 * intentionally absent here.
 */
export const buildersSections: Record<string, TemplateSection[]> = {
  builders: [
    // ── Homepage ──────────────────────────────────────────────────────────
    {
      id: "homepage.hero",
      page: "homepage",
      title: "Hero",
      description:
        "Full-viewport hero with background image, headline, and dual CTAs.",
      groupIds: ["homepage.hero"],
      order: 0,
    },
    {
      id: "homepage.story",
      page: "homepage",
      title: "Story / Ownership",
      description: "Split-layout brand story with image and body copy.",
      groupIds: ["homepage.story"],
      order: 1,
    },
    {
      id: "homepage.projects",
      page: "homepage",
      title: "Recent Projects",
      description:
        "Bento-style grid of recent projects (first item is the large feature card).",
      groupIds: ["homepage.projects"],
      order: 2,
    },
    {
      id: "homepage.cta",
      page: "homepage",
      title: "CTA Banner",
      description: "Bottom call-to-action banner on the homepage.",
      groupIds: ["homepage.cta"],
      order: 3,
      hideable: true,
    },

    // ── About ─────────────────────────────────────────────────────────────
    {
      id: "about.hero",
      page: "about",
      title: "Hero",
      description: "Large headline, intro paragraph, and optional hero image.",
      groupIds: ["about.hero"],
      order: 0,
    },
    {
      id: "about.story",
      page: "about",
      title: "Our Story",
      description: "Two-column brand narrative section.",
      groupIds: ["about.story"],
      order: 1,
    },
    {
      id: "about.team",
      page: "about",
      title: "Team Members",
      description:
        "Cooperative member card grid. Falls back to built-in defaults when empty.",
      groupIds: ["about.team"],
      order: 2,
    },

    // ── Contact ───────────────────────────────────────────────────────────
    {
      id: "contact.info",
      page: "contact",
      title: "Contact Info",
      description:
        "Page header, intro copy, address block, hours, and social links.",
      groupIds: ["contact.info"],
      order: 0,
    },

    // ── Services ──────────────────────────────────────────────────────────
    {
      id: "services.hero",
      page: "services",
      title: "Services Hero",
      description: "Headline and intro paragraph for the services index page.",
      groupIds: ["services.hero"],
      order: 0,
    },
    {
      id: "services.cta",
      page: "services",
      title: "Services CTA",
      description: "Call-to-action band at the bottom of the services index.",
      groupIds: ["services.cta"],
      order: 1,
      hideable: true,
    },

    // ── Testimonials ──────────────────────────────────────────────────────
    {
      id: "testimonials.page",
      page: "testimonials",
      title: "Testimonials Page",
      description:
        "Heading, intro, empty state, and the submit call-to-action band.",
      groupIds: ["testimonials.page"],
      order: 0,
    },
  ],
};
