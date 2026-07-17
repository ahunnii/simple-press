import type { TemplateSection } from "~/lib/template-sections";

export const elegantSections: Record<string, TemplateSection[]> = {
  elegant: [
    // Homepage
    {
      id: "homepage.hero",
      page: "homepage",
      title: "Hero",
      description: "Full-height hero banner at the top of the homepage.",
      groupIds: ["homepage.hero"],
      order: 0,
    },
    {
      id: "homepage.trust-badges",
      page: "homepage",
      title: "Trust Badges",
      description: "Scrolling marquee of trust badges just below the hero.",
      groupIds: ["homepage.trust-badges"],
      order: 1,
      hideable: true,
    },
    {
      id: "homepage.products",
      page: "homepage",
      title: "Featured Products",
      description: "Product grid pulling from your catalog.",
      groupIds: ["homepage.products"],
      order: 2,
    },
    {
      id: "homepage.about",
      page: "homepage",
      title: "About Section",
      description:
        "About blurb and image/video shown below the product grid.",
      groupIds: ["homepage.about"],
      order: 3,
    },
    {
      id: "homepage.features",
      page: "homepage",
      title: "Feature Cards",
      description: "Icon feature cards shown inside the About section.",
      groupIds: ["homepage.features"],
      order: 4,
      hideable: true,
    },
    {
      id: "homepage.testimonials",
      page: "homepage",
      title: "Testimonials",
      description:
        "Scrolling columns of customer reviews. Auto-hides when you have no approved reviews yet.",
      groupIds: ["homepage.testimonials"],
      order: 5,
      hideable: true,
    },
    {
      id: "homepage.cta",
      page: "homepage",
      title: "CTA Banner",
      description: "Full-width call-to-action banner with bullet points.",
      groupIds: ["homepage.cta"],
      order: 6,
      hideable: true,
    },
    {
      id: "homepage.newsletter",
      page: "homepage",
      title: "Newsletter",
      description: "Email sign-up band at the bottom of the homepage.",
      groupIds: ["homepage.newsletter"],
      order: 7,
      hideable: true,
    },

    // About
    {
      id: "about.hero",
      page: "about",
      title: "Hero",
      description:
        "Heading, subtitle, and full-width image at the top of the about page.",
      groupIds: ["about.hero"],
      order: 0,
    },
    {
      id: "about.story",
      page: "about",
      title: "Story Section",
      description: "Main story text and image.",
      groupIds: ["about.story"],
      order: 1,
    },
    {
      id: "about.values",
      page: "about",
      title: "Mission & Vision",
      description:
        "Mission and vision statements. Auto-hides when both are empty.",
      groupIds: ["about.values"],
      order: 2,
    },

    // Contact
    {
      id: "contact.hero",
      page: "contact",
      title: "Contact Hero",
      description: "Heading and subtitle at the top of the contact page.",
      groupIds: ["contact.hero"],
      order: 0,
    },
    {
      id: "contact.info",
      page: "contact",
      title: "Contact Information",
      description:
        "Info panel with your email, phone, and address (falls back to business defaults when left blank).",
      groupIds: ["contact.info"],
      order: 1,
    },
    {
      id: "contact.form",
      page: "contact",
      title: "Contact Form",
      description: "Heading above the contact form.",
      groupIds: ["contact.form"],
      order: 2,
    },

    // Blog
    {
      id: "blog.header",
      page: "blog",
      title: "Blog Listing",
      description: "Heading and intro shown at the top of the blog index.",
      groupIds: ["blog.header"],
      order: 0,
    },
    {
      id: "blog.newsletter",
      page: "blog",
      title: "Newsletter",
      description: "Email sign-up band at the bottom of the blog listing.",
      groupIds: ["blog.newsletter"],
      order: 1,
      hideable: true,
    },
  ],
};
