import type { TemplateSection } from "~/lib/template-sections";
import { SECTION_LINKS } from "~/lib/section-links";

import { sledgeCartSections } from "./cart-checkout/cart-fields";
import { sledgeCheckoutUnavailableSections } from "./cart-checkout/unavailable-fields";
import { sledgeProductSections } from "./products";

/**
 * Curated section registry for the `sledge` storefront template.
 *
 * `order` reflects the visual top-to-bottom order sections render in on
 * each page (see the corresponding page component), not field declaration
 * order. `id` values match `TemplateFieldGroup.id` / `data-sp-group`
 * exactly (`"${page}.${group}"`).
 */
export const sledgeSections: Record<string, TemplateSection[]> = {
  sledge: [
    // ── Homepage ──────────────────────────────────────────────────────────
    {
      id: "homepage.hero",
      page: "homepage",
      title: "Hero",
      description: "Animated photo mosaic, tagline, and button at the top.",
      groupIds: ["homepage.hero"],
      order: 0,
      hideable: false,
    },
    {
      id: "homepage.getToKnow",
      page: "homepage",
      title: "Introduction",
      description: "Intro section with image, heading, body text, and buttons.",
      groupIds: ["homepage.getToKnow"],
      order: 1,
      hideable: true,
    },
    {
      id: "homepage.testimonials",
      page: "homepage",
      title: "Testimonials",
      description: "Rotating customer quote carousel.",
      groupIds: ["homepage.testimonials"],
      order: 2,
      hideable: true,
      links: [SECTION_LINKS.testimonials],
    },
    {
      id: "homepage.subscribe",
      page: "homepage",
      title: "Subscribe",
      description: "Newsletter/social block below testimonials.",
      groupIds: ["homepage.subscribe"],
      order: 3,
      hideable: true,
      links: [SECTION_LINKS.branding],
    },

    // ── About ─────────────────────────────────────────────────────────────
    {
      id: "about.hero",
      page: "about",
      title: "Hero",
      description: "Full-width photo at the top of the about page.",
      groupIds: ["about.hero"],
      order: 0,
      hideable: false,
    },
    {
      id: "about.main",
      page: "about",
      title: "Introduction",
      description: "Heading and three labeled rows introducing your story.",
      groupIds: ["about.main"],
      order: 1,
      hideable: false,
    },
    {
      id: "about.trending",
      page: "about",
      title: "Trending products",
      description: "Product rail shown below the about page content.",
      groupIds: ["about.trending"],
      order: 2,
      hideable: true,
      links: [SECTION_LINKS.products],
    },

    // ── Contact ───────────────────────────────────────────────────────────
    {
      id: "contact.info",
      page: "contact",
      title: "Contact details",
      description: "Photo, contact info headings, and form heading.",
      groupIds: ["contact.info"],
      order: 0,
      hideable: false,
      links: [
        SECTION_LINKS.businessContact,
        SECTION_LINKS.businessLocation,
        SECTION_LINKS.businessHours,
      ],
    },
    {
      id: "contact.faq",
      page: "contact",
      title: "FAQ",
      description:
        "Common questions answered at the bottom of the contact page.",
      groupIds: ["contact.faq"],
      order: 1,
      hideable: true,
      links: [SECTION_LINKS.faq],
    },
    {
      id: "contact.trending",
      page: "contact",
      title: "Trending products",
      description: "Product rail shown below the contact form.",
      groupIds: ["contact.trending"],
      order: 2,
      hideable: true,
      links: [SECTION_LINKS.products],
    },

    // ── Collections ───────────────────────────────────────────────────────
    {
      id: "collections.listing",
      page: "collections",
      title: "Collections page",
      description:
        "Heading and intro at the top of the collections index page.",
      groupIds: ["collections.listing"],
      order: 0,
      hideable: false,
      links: [SECTION_LINKS.collections],
    },

    // ── Shop ──────────────────────────────────────────────────────────────
    {
      id: "shop.listing",
      page: "shop",
      title: "Shop page",
      description: "Heading and intro for the shop page.",
      groupIds: ["shop.listing"],
      order: 0,
      hideable: false,
      links: [SECTION_LINKS.products],
    },

    // ── Blog ──────────────────────────────────────────────────────────────
    {
      id: "blog.listing",
      page: "blog",
      title: "Blog page",
      description: "Heading and intro for the blog page.",
      groupIds: ["blog.listing"],
      order: 0,
      hideable: false,
      links: [SECTION_LINKS.blog],
    },
    {
      id: "blog.post",
      page: "blog",
      renderContext: "blog-post",
      title: "Shop banner",
      description: "Banner shown at the bottom of each blog post.",
      groupIds: ["blog.post"],
      order: 1,
      hideable: true,
    },

    // ── Testimonials ──────────────────────────────────────────────────────
    {
      id: "testimonials.page",
      page: "testimonials",
      title: "Testimonials page",
      description: "Heading, intro text, and empty state.",
      groupIds: ["testimonials.page"],
      order: 0,
      hideable: false,
      links: [SECTION_LINKS.testimonials],
    },
    {
      id: "testimonials.trending",
      page: "testimonials",
      title: "Trending products",
      description: "Product rail shown below the testimonials.",
      groupIds: ["testimonials.trending"],
      order: 1,
      hideable: true,
      links: [SECTION_LINKS.products],
    },

    // ── Global ────────────────────────────────────────────────────────────
    {
      id: "global.branding",
      page: "global",
      title: "Site branding",
      description:
        "Footer notice heading/text shown in the site footer, plus the shop button text/link reused across pages. The footer's location tag comes from Settings.",
      groupIds: ["global.branding"],
      order: 0,
      hideable: false,
      links: [SECTION_LINKS.businessLocation],
    },
    {
      id: "global.authentication",
      page: "global",
      title: "Authentication",
      description: "Image shown on sign-in and sign-up pages.",
      groupIds: ["global.authentication"],
      order: 2,
      hideable: false,
    },

    // ── Product / cart / checkout (sections live beside their fields) ─────
    ...sledgeProductSections,
    ...sledgeCartSections,
    ...sledgeCheckoutUnavailableSections,
  ],
};
