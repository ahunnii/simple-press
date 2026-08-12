import type { TemplateSection } from "~/lib/template-sections";
import { SECTION_LINKS } from "~/lib/section-links";

export const modernSections: Record<string, TemplateSection[]> = {
  modern: [
    // Homepage (src/app/(storefront)/_templates/modern/homepage/modern-home-page.tsx)
    {
      id: "homepage.hero",
      page: "homepage",
      title: "Hero",
      description: "Full-bleed banner image with headline at the top of the homepage.",
      groupIds: ["homepage.hero"],
      order: 0,
    },
    {
      id: "homepage.values",
      page: "homepage",
      title: "Values Strip",
      description: "Three-column strip of short value props under the hero.",
      groupIds: ["homepage.values"],
      order: 1,
      hideable: true,
    },
    {
      id: "homepage.products",
      page: "homepage",
      title: "Featured Products",
      description: "Featured product grid pulled from your catalog.",
      groupIds: ["homepage.products"],
      order: 2,
      links: [SECTION_LINKS.products],
    },
    {
      id: "homepage.about",
      page: "homepage",
      title: "About Teaser",
      description: "Image + story teaser linking through to the About page.",
      groupIds: ["homepage.about"],
      order: 3,
    },
    {
      id: "homepage.services",
      page: "homepage",
      title: "Services",
      description:
        "Reserved for a services section — defined in the field panel but not currently rendered on the homepage.",
      groupIds: ["homepage.services"],
      order: 4,
    },

    // About (src/app/(storefront)/_templates/modern/about/modern-about-page.tsx)
    {
      id: "about.main",
      page: "about",
      title: "Header",
      description: "Page title and tagline at the top of the About page.",
      groupIds: ["about.main"],
      order: 0,
    },
    {
      id: "about.mission",
      page: "about",
      title: "Mission",
      description: "Mission statement with a supporting image.",
      groupIds: ["about.mission"],
      order: 1,
    },
    {
      id: "about.values",
      page: "about",
      title: "What We Stand For",
      description: "Grid of value cards describing what drives the business.",
      groupIds: ["about.values"],
      order: 2,
      hideable: true,
    },
    {
      id: "about.story",
      page: "about",
      title: "Our Story",
      description: "Narrative story block with a supporting image.",
      groupIds: ["about.story"],
      order: 3,
    },
    {
      id: "about.cta",
      page: "about",
      title: "CTA Banner",
      description: "Bottom call-to-action banner on the About page.",
      groupIds: ["about.cta"],
      order: 4,
      hideable: true,
    },

    // Contact (src/app/(storefront)/_templates/modern/contact/modern-contact-page.tsx)
    {
      id: "contact.main",
      page: "contact",
      title: "Header",
      description: "Page title and intro at the top of the Contact page.",
      groupIds: ["contact.main"],
      order: 0,
    },
    {
      id: "contact.info",
      page: "contact",
      title: "Contact Info",
      description: "Contact details column next to the contact form.",
      groupIds: ["contact.info"],
      order: 1,
    },
    {
      id: "contact.form",
      page: "contact",
      title: "Contact Form",
      description: "Form title/description shown above the contact form.",
      groupIds: ["contact.form"],
      order: 2,
    },
    {
      id: "contact.questions",
      page: "contact",
      title: "FAQ",
      description: "Frequently asked questions at the bottom of the Contact page.",
      groupIds: ["contact.questions"],
      order: 3,
      hideable: true,
    },

    // Collections (src/app/(storefront)/_templates/modern/collections/modern-collections-page.tsx)
    {
      id: "collections.main",
      page: "collections",
      title: "Header",
      description: "Page title and intro above the collections grid.",
      groupIds: ["collections.main"],
      order: 0,
      links: [SECTION_LINKS.collections],
    },

    // Products / Shop (src/app/(storefront)/_templates/modern/shop/modern-products-page.tsx)
    {
      id: "products.main",
      page: "products",
      title: "Header",
      description: "Page title and intro above the shop's product grid.",
      groupIds: ["products.main"],
      order: 0,
      links: [SECTION_LINKS.products],
    },

    // Testimonials (src/app/(storefront)/_templates/modern/testimonials/modern-testimonials-page.tsx)
    {
      id: "testimonials.page",
      page: "testimonials",
      title: "Header",
      description: "Page title and intro above the testimonial cards.",
      groupIds: ["testimonials.page"],
      order: 0,
      links: [SECTION_LINKS.testimonials],
    },
    {
      id: "testimonials.call-to-action",
      page: "testimonials",
      title: "Share Your Experience CTA",
      description: "Call-to-action band inviting customers to leave a testimonial.",
      groupIds: ["testimonials.call-to-action"],
      order: 1,
      hideable: true,
    },

    // Blog (src/app/(storefront)/_templates/modern/blog/modern-blog-page.tsx)
    {
      id: "blog.header",
      page: "blog",
      title: "Header",
      description: "Page title and intro above the blog listing.",
      groupIds: ["blog.header"],
      order: 0,
      links: [SECTION_LINKS.blog],
    },
  ],
};
