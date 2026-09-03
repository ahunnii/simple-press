import type { TemplateSection } from "~/lib/template-sections";
import { SECTION_LINKS } from "~/lib/section-links";

export const bambooSections: Record<string, TemplateSection[]> = {
  bamboo: [
    // Homepage
    {
      id: "homepage.hero",
      page: "homepage",
      title: "Hero",
      description: "Main banner at the top of the homepage.",
      groupIds: ["homepage.hero"],
      order: 0,
    },
    {
      id: "homepage.featured",
      page: "homepage",
      title: "Featured Products",
      groupIds: ["homepage.featured"],
      order: 1,
      links: [SECTION_LINKS.products],
    },
    {
      id: "homepage.sustainability",
      page: "homepage",
      title: "Sustainability Banner",
      description:
        "Three feature highlights below the featured products (e.g. Premium Quality, Competitive Prices).",
      groupIds: ["homepage.sustainability"],
      order: 2,
      hideable: true,
    },
    {
      id: "homepage.aboutTeaser",
      page: "homepage",
      title: "About Teaser",
      description: "Short business introduction block on the homepage.",
      groupIds: ["homepage.aboutTeaser"],
      order: 3,
    },
    {
      id: "homepage.testimonials",
      page: "homepage",
      title: "Testimonials",
      description:
        "Three customer testimonials with a link to the testimonials page.",
      groupIds: ["homepage.testimonials"],
      order: 4,
      hideable: true,
      links: [SECTION_LINKS.testimonials],
    },
    {
      id: "homepage.location",
      page: "homepage",
      title: "Location",
      description: "Store location heading and interactive map.",
      groupIds: ["homepage.location"],
      order: 5,
      hideable: true,
    },

    // About
    {
      id: "about.hero",
      page: "about",
      title: "Hero",
      description: "Tagline, heading, and intro at the top of the about page.",
      groupIds: ["about.hero"],
      order: 0,
    },
    {
      id: "about.mission",
      page: "about",
      title: "Why We Started",
      groupIds: ["about.mission"],
      order: 1,
    },
    {
      id: "about.values",
      page: "about",
      title: "What We Stand For",
      description: "Value cards below the mission section.",
      groupIds: ["about.values"],
      order: 2,
    },
    {
      id: "about.supplier",
      page: "about",
      title: "Supplier",
      description: "More Than a Supplier section.",
      groupIds: ["about.supplier"],
      order: 3,
    },
    {
      id: "about.whyBamboo",
      page: "about",
      title: "Why Bamboo",
      description: "Bamboo benefit facts cards.",
      groupIds: ["about.whyBamboo"],
      order: 4,
      hideable: true,
    },
    {
      id: "about.nationwide",
      page: "about",
      title: "Nationwide Distribution",
      description: "Nationwide reach heading, text, and fact cards.",
      groupIds: ["about.nationwide"],
      order: 5,
      hideable: true,
    },
    {
      id: "about.detroit",
      page: "about",
      title: "Rooted in Detroit",
      groupIds: ["about.detroit"],
      order: 6,
    },
    {
      id: "about.cta",
      page: "about",
      title: "CTA Banner",
      description: "Bottom call-to-action on the about page.",
      groupIds: ["about.cta"],
      order: 7,
      hideable: true,
    },

    // Contact
    {
      id: "contact.info",
      page: "contact",
      title: "Contact Info",
      description: "Header, subheader, and business hours on the contact page.",
      groupIds: ["contact.info"],
      order: 0,
    },
    {
      id: "contact.map",
      page: "contact",
      title: "Location Map",
      description:
        "Interactive map with directions, shown below the contact form.",
      groupIds: ["contact.map"],
      order: 1,
      hideable: true,
    },

    // Collections
    {
      id: "collections.listing",
      page: "collections",
      title: "Collections Listing",
      groupIds: ["collections.listing"],
      order: 0,
      links: [SECTION_LINKS.collections],
    },

    // Products (shop)
    {
      id: "products.listing",
      page: "products",
      title: "Shop Listing",
      groupIds: ["products.listing"],
      order: 0,
      links: [SECTION_LINKS.products],
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
      title: "Blog Post CTA",
      description: "Call-to-action shown at the end of every blog article.",
      groupIds: ["blog.post"],
      order: 1,
      hideable: true,
    },

    // Testimonials
    {
      id: "testimonials.page",
      page: "testimonials",
      title: "Testimonials Page",
      description: "Heading and subheading on the testimonials page.",
      groupIds: ["testimonials.page"],
      order: 0,
      links: [SECTION_LINKS.testimonials],
    },

    // Global
    {
      id: "global.location",
      page: "global",
      title: "Map Location",
      description:
        "Coordinates for the map pin used by the homepage and contact page maps.",
      groupIds: ["global.location"],
      order: 0,
    },
  ],
};
