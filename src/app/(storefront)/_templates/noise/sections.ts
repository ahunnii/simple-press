import type { TemplateSection } from "~/lib/template-sections";
import { SECTION_LINKS } from "~/lib/section-links";

export const noiseSections: Record<string, TemplateSection[]> = {
  noise: [
    // Homepage
    {
      id: "homepage.intro",
      page: "homepage",
      title: "Intro Animation",
      description:
        "Optional gallery shown as tiles in the full-screen intro animation that plays before the homepage. Leave the gallery unset to use the default color-tile palette.",
      groupIds: ["homepage.intro"],
      order: 0,
    },
    {
      id: "homepage.hero",
      page: "homepage",
      title: "Hero",
      description:
        "Full-viewport banner at the top of the homepage — background image or video, headline, and primary CTA.",
      groupIds: ["homepage.hero"],
      order: 1,
    },
    {
      id: "homepage.editorial",
      page: "homepage",
      title: "Editorial Marquee",
      description: "Scrolling tagline band beneath the hero.",
      groupIds: ["homepage.editorial"],
      order: 2,
      hideable: true,
    },
    {
      id: "homepage.philosophy",
      page: "homepage",
      title: "Philosophy",
      description: "Short brand philosophy quote section.",
      groupIds: ["homepage.philosophy"],
      order: 3,
    },
    {
      id: "homepage.aboutTeaser",
      page: "homepage",
      title: "Brand Story Teaser",
      description: "Portrait image + brand story excerpt ('The Art of Noise').",
      groupIds: ["homepage.aboutTeaser"],
      order: 4,
      hideable: true,
    },
    {
      id: "homepage.collections",
      page: "homepage",
      title: "Collections",
      description:
        "Showcase of your first few collections (admin sort order) with cover images. Collections with no published products are skipped.",
      groupIds: ["homepage.collections"],
      order: 5,
      links: [SECTION_LINKS.collections],
    },
    {
      id: "homepage.featured",
      page: "homepage",
      title: "Latest Arrivals",
      description:
        "Your newest published products, newest first. A short row is centered.",
      groupIds: ["homepage.featured"],
      order: 6,
      links: [SECTION_LINKS.products],
    },
    {
      id: "homepage.guarantee",
      page: "homepage",
      title: "Guarantee",
      description: "Guarantee/trust band with image and supporting copy.",
      groupIds: ["homepage.guarantee"],
      order: 7,
    },
    {
      id: "homepage.testimonials",
      page: "homepage",
      title: "Testimonials",
      description: "Rotating customer quote strip.",
      groupIds: ["homepage.testimonials"],
      order: 8,
      hideable: true,
      links: [SECTION_LINKS.testimonials],
    },

    // About
    {
      id: "about.main",
      page: "about",
      title: "About Content",
      description: "Hero heading and full brand story body.",
      groupIds: ["about.main"],
      order: 0,
    },

    // Contact
    {
      id: "contact.info",
      page: "contact",
      title: "Contact Info",
      description: "Contact page header, subheader, and editorial image.",
      groupIds: ["contact.info"],
      order: 0,
    },
    {
      id: "contact.faq",
      page: "contact",
      title: "FAQ",
      description: "Frequently asked questions accordion.",
      groupIds: ["contact.faq"],
      order: 1,
      hideable: true,
      links: [SECTION_LINKS.faq],
    },

    // Blog
    {
      id: "blog.listing",
      page: "blog",
      title: "Blog Listing",
      groupIds: ["blog.listing"],
      order: 0,
      links: [SECTION_LINKS.blog],
    },
    {
      id: "blog.post",
      page: "blog",
      renderContext: "blog-post",
      title: "Blog Post — Shop CTA",
      description:
        "Call-to-action band shown at the bottom of every blog post.",
      groupIds: ["blog.post"],
      order: 1,
      hideable: true,
    },

    // Shop
    {
      id: "shop.listing",
      page: "shop",
      title: "Shop Listing",
      groupIds: ["shop.listing"],
      order: 0,
      links: [SECTION_LINKS.products],
    },

    // Collections
    {
      id: "collections.listing",
      page: "collections",
      title: "Collections Listing",
      description:
        "Overline, heading, CTA, and empty state on the collections index.",
      groupIds: ["collections.listing"],
      order: 0,
      links: [SECTION_LINKS.collections],
    },
    {
      id: "collections.detail",
      page: "collections",
      title: "Collection Detail",
      description:
        'Overline, empty state, back link, and "more collections" heading on a collection detail page.',
      groupIds: ["collections.detail"],
      order: 1,
      links: [SECTION_LINKS.collections],
    },

    // Testimonials
    {
      id: "testimonials.page",
      page: "testimonials",
      title: "Testimonials Page",
      description:
        "Full testimonials page — header, masonry grid, and bottom CTA band.",
      groupIds: ["testimonials.page"],
      order: 0,
      links: [SECTION_LINKS.testimonials],
    },

    // Global
    {
      id: "global.branding",
      page: "global",
      title: "Global Branding",
      description:
        "Location tag, footer tagline, and shop CTA used in the header, footer, and other bands across the site.",
      groupIds: ["global.branding"],
      order: 0,
    },
    {
      id: "global.authentication",
      page: "global",
      title: "Authentication",
      description:
        "Background image field for sign-in/sign-up pages. Not currently rendered by this template (falls back to the platform default auth screens).",
      groupIds: ["global.authentication"],
      order: 1,
    },
  ],
};
