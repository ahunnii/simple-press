import type { TemplateSection } from "~/lib/template-sections";

export const darkTrendSections: Record<string, TemplateSection[]> = {
  "dark-trend": [
    // Homepage
    {
      id: "homepage.hero",
      page: "homepage",
      title: "Hero",
      description: "Full-bleed banner at the top of the homepage.",
      groupIds: ["homepage.hero"],
      order: 0,
    },
    {
      id: "homepage.gallery",
      page: "homepage",
      title: "Photo Gallery",
      description: "Optional image gallery shown just below the hero.",
      groupIds: ["homepage.gallery"],
      order: 1,
      hideable: true,
    },
    {
      id: "homepage.first-section",
      page: "homepage",
      title: "First Feature Section",
      description: "Numbered story section (01.) with image and description.",
      groupIds: ["homepage.first-section"],
      order: 2,
      hideable: true,
    },
    {
      id: "homepage.second-section",
      page: "homepage",
      title: "Featured Product Section",
      description:
        "Numbered spotlight section (02.) pairing your heading with the first product.",
      groupIds: ["homepage.second-section"],
      order: 3,
      hideable: true,
    },
    {
      id: "homepage.cta",
      page: "homepage",
      title: "CTA Banner",
      description: "Bottom call-to-action banner (04.) on the homepage.",
      groupIds: ["homepage.cta"],
      order: 4,
      hideable: true,
    },

    // About
    {
      id: "about.features",
      page: "about",
      title: "Features Section",
      description: "Story header plus up to four feature cards.",
      groupIds: ["about.features"],
      order: 0,
    },
    {
      id: "about.cta",
      page: "about",
      title: "CTA Section",
      description: "Bottom call-to-action banner on the about page.",
      groupIds: ["about.cta"],
      order: 1,
      hideable: true,
    },

    // Contact
    {
      id: "contact.info",
      page: "contact",
      title: "Contact Info",
      description: "Header, description, image, and form on the contact page.",
      groupIds: ["contact.info"],
      order: 0,
    },

    // Blog
    {
      id: "blog.listing",
      page: "blog",
      title: "Blog Listing",
      description: "Heading and intro for the blog index page.",
      groupIds: ["blog.listing"],
      order: 0,
    },
  ],
};
