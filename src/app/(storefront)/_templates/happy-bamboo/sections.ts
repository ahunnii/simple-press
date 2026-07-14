import type { TemplateSection } from "~/lib/template-sections";

export const happyBambooSections: Record<string, TemplateSection[]> = {
  "happy-bamboo": [
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
      id: "homepage.aboutTeaser",
      page: "homepage",
      title: "About Teaser",
      description: "Video/image block introducing the business.",
      groupIds: ["homepage.aboutTeaser"],
      order: 1,
    },
    {
      id: "homepage.featured",
      page: "homepage",
      title: "Featured Products",
      groupIds: ["homepage.featured"],
      order: 2,
    },
    {
      id: "homepage.benefits",
      page: "homepage",
      title: "Benefits",
      description: "Why Choose Bamboo Products benefit cards.",
      groupIds: ["homepage.benefits"],
      order: 3,
      hideable: true,
    },
    {
      id: "homepage.testimonials",
      page: "homepage",
      title: "Testimonials",
      description: "Customer review cards pulled from your reviews.",
      groupIds: ["homepage.testimonials"],
      order: 4,
      hideable: true,
    },
    {
      id: "homepage.cta",
      page: "homepage",
      title: "CTA Banner",
      description: "Bottom call-to-action banner on the homepage.",
      groupIds: ["homepage.cta"],
      order: 5,
      hideable: true,
    },

    // About
    {
      id: "about.hero",
      page: "about",
      title: "Hero",
      description: "Mission and vision statement at the top of the page.",
      groupIds: ["about.hero"],
      order: 0,
    },
    {
      id: "about.mission",
      page: "about",
      title: "Mission Banner",
      groupIds: ["about.mission"],
      order: 1,
    },
    {
      id: "about.services",
      page: "about",
      title: "Services",
      description: "What We Offer cards.",
      groupIds: ["about.services"],
      order: 2,
    },
    {
      id: "about.bamboo",
      page: "about",
      title: "Why Bamboo",
      description: "Bamboo benefit facts and supporting images.",
      groupIds: ["about.bamboo"],
      order: 3,
      hideable: true,
    },
    {
      id: "about.cta",
      page: "about",
      title: "CTA Banner",
      description: "Full-width image banner.",
      groupIds: ["about.cta"],
      order: 4,
      hideable: true,
    },
    {
      id: "about.connect-with-us",
      page: "about",
      title: "Connect With Us",
      description: "Google review prompt and social follow cards.",
      groupIds: ["about.connect-with-us"],
      order: 5,
      hideable: true,
    },

    // Contact
    {
      id: "contact.info",
      page: "contact",
      title: "Contact Info",
      groupIds: ["contact.info"],
      order: 0,
    },
    {
      id: "contact.faq",
      page: "contact",
      title: "FAQ",
      groupIds: ["contact.faq"],
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
    },
    {
      id: "collections.cta",
      page: "collections",
      title: "CTA Banner",
      description: "Bottom call-to-action on the collections page.",
      groupIds: ["collections.cta"],
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
    },

    // Blog
    {
      id: "blog.listing",
      page: "blog",
      title: "Blog Listing",
      groupIds: ["blog.listing"],
      order: 0,
    },
    {
      id: "blog.post",
      page: "blog",
      title: "Blog Post CTA",
      description: "Call-to-action shown at the end of every blog article.",
      groupIds: ["blog.post"],
      order: 1,
      hideable: true,
    },

    // Global
    {
      id: "global.authentication",
      page: "global",
      title: "Authentication",
      description: "Background image shown on sign-in/sign-up pages.",
      groupIds: ["global.authentication"],
      order: 0,
    },
  ],
};
