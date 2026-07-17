import type { TemplateSection } from "~/lib/template-sections";

/**
 * Curated section registry for the `default` storefront template.
 *
 * `order` reflects the visual top-to-bottom order sections render in on
 * each page (see the corresponding page component), not field declaration
 * order. `id` values match `TemplateFieldGroup.id` / `data-sp-group`
 * exactly (`"${page}.${group}"`).
 */
export const defaultTemplateSections: Record<string, TemplateSection[]> = {
  default: [
    // ── Homepage ──────────────────────────────────────────────────────────
    {
      id: "homepage.hero",
      page: "homepage",
      title: "Hero",
      description: "Main banner at the top of the homepage",
      groupIds: ["homepage.hero"],
      order: 0,
      hideable: false,
    },
    {
      id: "homepage.collections",
      page: "homepage",
      title: "Collections Grid",
      description: "3-up collection showcase below the hero",
      groupIds: ["homepage.collections"],
      order: 1,
      hideable: true,
    },
    {
      id: "homepage.rails",
      page: "homepage",
      title: "Product Rails",
      description: "Two collection-based product rails",
      groupIds: ["homepage.rails"],
      order: 2,
      hideable: false,
    },
    {
      id: "homepage.story",
      page: "homepage",
      title: "Story",
      description: "About/story strip with image and text",
      groupIds: ["homepage.story"],
      order: 3,
      hideable: true,
    },
    {
      id: "homepage.testimonial",
      page: "homepage",
      title: "Testimonial",
      description: "A single featured customer quote",
      groupIds: ["homepage.testimonial"],
      order: 4,
      hideable: true,
    },
    {
      id: "homepage.promise",
      page: "homepage",
      title: "Promise Strip",
      description: "Four short trust/benefit promises",
      groupIds: ["homepage.promise"],
      order: 5,
      hideable: true,
    },

    // ── About ─────────────────────────────────────────────────────────────
    {
      id: "about.hero",
      page: "about",
      title: "Hero",
      groupIds: ["about.hero"],
      order: 0,
      hideable: false,
    },
    {
      id: "about.bio",
      page: "about",
      title: "Bio",
      description: "Maker portrait and story",
      groupIds: ["about.bio"],
      order: 1,
      hideable: false,
    },
    {
      id: "about.pillars",
      page: "about",
      title: "Values",
      description: "Pull quote and three value pillars",
      groupIds: ["about.pillars"],
      order: 2,
      hideable: true,
    },
    {
      id: "about.cta",
      page: "about",
      title: "CTA",
      description: "Bottom call-to-action strip",
      groupIds: ["about.cta"],
      order: 3,
      hideable: true,
    },

    // ── Contact ───────────────────────────────────────────────────────────
    {
      id: "contact.header",
      page: "contact",
      title: "Header",
      groupIds: ["contact.header"],
      order: 0,
      hideable: false,
    },
    {
      id: "contact.faq",
      page: "contact",
      title: "FAQ",
      groupIds: ["contact.faq"],
      order: 1,
      hideable: true,
    },

    // ── Services ──────────────────────────────────────────────────────────
    {
      id: "services.hero",
      page: "services",
      title: "Hero",
      groupIds: ["services.hero"],
      order: 0,
      hideable: false,
    },
    {
      id: "services.intro",
      page: "services",
      title: "Intro",
      description: "Optional editorial intro band above the service grid",
      groupIds: ["services.intro"],
      order: 1,
      hideable: true,
    },
    {
      id: "services.cta",
      page: "services",
      title: "CTA",
      description: "Bottom call-to-action strip",
      groupIds: ["services.cta"],
      order: 2,
      hideable: true,
    },

    // ── Blog ──────────────────────────────────────────────────────────────
    {
      id: "blog.header",
      page: "blog",
      title: "Header",
      groupIds: ["blog.header"],
      order: 0,
      hideable: false,
    },

    // ── Global ────────────────────────────────────────────────────────────
    {
      id: "global.authentication",
      page: "global",
      title: "Authentication",
      description: "Image and styling shown on sign-in / sign-up pages",
      groupIds: ["global.authentication"],
      order: 0,
      hideable: false,
    },
    {
      id: "global.product",
      page: "global",
      title: "Product Defaults",
      description:
        "Shipping/question copy and trust badges applied to all products",
      groupIds: ["global.product"],
      order: 1,
      hideable: false,
    },
  ],
};
