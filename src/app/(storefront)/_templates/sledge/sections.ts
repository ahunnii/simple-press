import type { TemplateSection } from "~/lib/template-sections";
import { SECTION_LINKS } from "~/lib/section-links";

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
      title: "Hero Mosaic",
      description: "Animated photo mosaic, tagline, and button at the top.",
      groupIds: ["homepage.hero"],
      order: 0,
      hideable: false,
    },
    {
      id: "homepage.getToKnow",
      page: "homepage",
      title: "Get to Know Judy",
      description: "Intro section with image, heading, and body text.",
      groupIds: ["homepage.getToKnow"],
      order: 1,
      hideable: false,
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
    },

    // ── About ─────────────────────────────────────────────────────────────
    {
      id: "about.hero",
      page: "about",
      title: "About Hero",
      description: "Editorial image shown in the split hero banner.",
      groupIds: ["about.hero"],
      order: 0,
      hideable: false,
    },
    {
      id: "about.main",
      page: "about",
      title: "About Content",
      description: "Page heading and three labeled content rows.",
      groupIds: ["about.main"],
      order: 1,
      hideable: false,
    },

    // ── Contact ───────────────────────────────────────────────────────────
    {
      id: "contact.info",
      page: "contact",
      title: "Contact Page",
      description:
        "Hero image, contact info headings, form title, and trending section heading.",
      groupIds: ["contact.info"],
      order: 0,
      hideable: false,
    },

    // ── Shop ──────────────────────────────────────────────────────────────
    {
      id: "shop.listing",
      page: "shop",
      title: "Shop Page",
      description: "Heading and intro for the shop listing page.",
      groupIds: ["shop.listing"],
      order: 0,
      hideable: false,
      links: [SECTION_LINKS.products],
    },

    // ── Blog ──────────────────────────────────────────────────────────────
    {
      id: "blog.listing",
      page: "blog",
      title: "Blog Page",
      description: "Heading and intro for the blog listing page.",
      groupIds: ["blog.listing"],
      order: 0,
      hideable: false,
      links: [SECTION_LINKS.blog],
    },
    {
      id: "blog.post",
      page: "blog",
      renderContext: "blog-post",
      title: "Blog Post — Shop CTA",
      description: "Call-to-action band at the bottom of every blog post.",
      groupIds: ["blog.post"],
      order: 1,
      hideable: true,
    },

    // ── Testimonials ──────────────────────────────────────────────────────
    {
      id: "testimonials.page",
      page: "testimonials",
      title: "Testimonials Page",
      description: "Heading, intro, trending section, and empty state.",
      groupIds: ["testimonials.page"],
      order: 0,
      hideable: false,
      links: [SECTION_LINKS.testimonials],
    },

    // ── Global ────────────────────────────────────────────────────────────
    {
      id: "global.branding",
      page: "global",
      title: "Global Branding",
      description:
        "Location tag and footer notice shown in the site footer, plus the shop CTA text/link reused across pages.",
      groupIds: ["global.branding"],
      order: 0,
      hideable: false,
    },
    {
      id: "global.product",
      page: "global",
      title: "Product Page",
      description:
        "Trust badges, shipping/question copy, and care instructions applied to every product page.",
      groupIds: ["global.product"],
      order: 1,
      hideable: false,
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
  ],
};
