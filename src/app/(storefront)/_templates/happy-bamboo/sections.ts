import type { TemplateSection } from "~/lib/template-sections";
import { SECTION_LINKS } from "~/lib/section-links";

import { happyBambooServicesSections } from "./services";

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
      title: "Our story",
      description:
        "Video or photo block introducing your business, with a link to the full About page.",
      groupIds: ["homepage.aboutTeaser"],
      order: 1,
      hideable: true,
    },
    {
      id: "homepage.featured",
      page: "homepage",
      title: "Featured products",
      groupIds: ["homepage.featured"],
      order: 2,
      hideable: true,
      links: [SECTION_LINKS.products],
    },
    {
      id: "homepage.benefits",
      page: "homepage",
      title: "Benefits",
      description: "Benefit cards explaining why customers choose bamboo.",
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
      links: [SECTION_LINKS.testimonials],
    },
    {
      id: "homepage.cta",
      page: "homepage",
      title: "Closing banner",
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
      title: "Mission banner",
      groupIds: ["about.mission"],
      order: 1,
      hideable: true,
    },
    {
      id: "about.services",
      page: "about",
      title: "Services",
      description: "What We Offer cards.",
      groupIds: ["about.services"],
      order: 2,
      hideable: true,
    },
    {
      id: "about.bamboo",
      page: "about",
      title: "Why bamboo",
      description: "Bamboo benefit facts and supporting photos.",
      groupIds: ["about.bamboo"],
      order: 3,
      hideable: true,
    },
    {
      id: "about.cta",
      page: "about",
      title: "Image banner",
      description: "Full-width photo banner.",
      groupIds: ["about.cta"],
      order: 4,
      hideable: true,
    },
    {
      id: "about.connect-with-us",
      page: "about",
      title: "Connect with us",
      description: "Google review prompt and social-follow cards.",
      groupIds: ["about.connect-with-us"],
      order: 5,
      hideable: true,
    },

    // Contact
    {
      id: "contact.info",
      page: "contact",
      title: "Contact details",
      description:
        "Heading, intro text, and photo at the top of the contact page. Your email, phone, address, and hours come from Settings.",
      groupIds: ["contact.info"],
      order: 0,
      links: [
        SECTION_LINKS.businessContact,
        SECTION_LINKS.businessLocation,
        SECTION_LINKS.businessHours,
      ],
    },
    {
      id: "contact.form",
      page: "contact",
      title: "Contact form",
      description:
        "Message shown after someone sends the contact form. Your email address comes from Settings.",
      groupIds: ["contact.form"],
      order: 1,
    },
    {
      id: "contact.faq",
      page: "contact",
      title: "FAQ",
      groupIds: ["contact.faq"],
      order: 2,
      hideable: true,
      links: [SECTION_LINKS.faq],
    },

    // Collections
    {
      id: "collections.listing",
      page: "collections",
      title: "Collections page",
      groupIds: ["collections.listing"],
      order: 0,
      links: [SECTION_LINKS.collections],
    },
    {
      id: "collections.cta",
      page: "collections",
      title: "Closing banner",
      description: "Bottom call-to-action on the collections page.",
      groupIds: ["collections.cta"],
      order: 1,
      hideable: true,
    },

    // Shop
    {
      id: "shop.listing",
      page: "shop",
      title: "Shop page",
      groupIds: ["shop.listing"],
      order: 0,
      links: [SECTION_LINKS.products],
    },

    // Services
    ...happyBambooServicesSections,

    // Product (every product page; previewed on a representative product)
    {
      id: "product.details",
      page: "product",
      title: "Product page",
      description: "Text shown on every product page, around the buy button.",
      groupIds: ["product.details"],
      order: 0,
      links: [SECTION_LINKS.products],
    },
    {
      id: "product.shipping",
      page: "product",
      title: "Shipping row",
      description:
        "Shipping note under the buy button on every product page. Hide it without hiding returns or questions.",
      groupIds: ["product.shipping"],
      order: 1,
      hideable: true,
    },
    {
      id: "product.returns",
      page: "product",
      title: "Returns row",
      description:
        "Returns note under the buy button on every product page. Hide it without hiding shipping or questions.",
      groupIds: ["product.returns"],
      order: 2,
      hideable: true,
    },
    {
      id: "product.questions",
      page: "product",
      title: "Questions row",
      description:
        "Contact link under the buy button on every product page. Hide it without hiding shipping or returns.",
      groupIds: ["product.questions"],
      order: 3,
      hideable: true,
    },

    // Blog
    {
      id: "blog.listing",
      page: "blog",
      title: "Blog page",
      groupIds: ["blog.listing"],
      order: 0,
      links: [SECTION_LINKS.blog],
    },
    {
      id: "blog.post",
      page: "blog",
      renderContext: "blog-post",
      title: "End of post",
      description: "Closing banner shown at the end of every blog post.",
      groupIds: ["blog.post"],
      order: 1,
      hideable: true,
    },

    // Testimonials
    {
      id: "testimonials.page",
      page: "testimonials",
      title: "Testimonials page",
      description:
        "Small label and intro text at the top of the testimonials page.",
      groupIds: ["testimonials.page"],
      order: 0,
      links: [SECTION_LINKS.testimonials],
    },

    // Checkout
    {
      id: "checkout.unavailable",
      page: "checkout",
      title: "Checkout unavailable",
      description:
        "Shown on the checkout page when online payments aren't set up yet.",
      groupIds: ["checkout.unavailable"],
      order: 0,
    },

    // Global
    {
      id: "global.cart",
      page: "global",
      title: "Cart",
      description:
        "Wording inside the cart panel that slides out from the side.",
      groupIds: ["global.cart"],
      order: 0,
    },
    {
      id: "global.authentication",
      page: "global",
      title: "Sign-in screens",
      description: "Background image shown on sign-in/sign-up pages.",
      groupIds: ["global.authentication"],
      order: 1,
    },

    // ── Optional pages (Default's `default.*` groups, happy-bamboo markup) ──
    // Events/videos/donate/FAQ render Default's field groups on the shared
    // page shelf, so these mirror `default/sections.ts`. Events and Donate end
    // with their own section.
    {
      id: "events.hero",
      page: "events",
      title: "Hero",
      groupIds: ["events.hero"],
      order: 0,
      hideable: false,
    },
    {
      id: "events.list",
      page: "events",
      title: "List",
      description: "Upcoming event rows and empty-state copy",
      groupIds: ["events.list"],
      order: 1,
      hideable: false,
      links: [SECTION_LINKS.events],
    },
    {
      id: "events.cta",
      page: "events",
      title: "Closing banner",
      description: "Bottom banner inviting visitors to get in touch",
      groupIds: ["events.cta"],
      order: 2,
      hideable: true,
    },
    {
      id: "videos.hero",
      page: "videos",
      title: "Hero",
      groupIds: ["videos.hero"],
      order: 0,
      hideable: false,
    },
    {
      id: "videos.list",
      page: "videos",
      title: "List",
      description: "Video grid and empty-state copy",
      groupIds: ["videos.list"],
      order: 1,
      hideable: false,
      links: [SECTION_LINKS.videos],
    },
    {
      id: "donate.hero",
      page: "donate",
      title: "Hero",
      groupIds: ["donate.hero"],
      order: 0,
      hideable: false,
    },
    {
      id: "donate.thank-you",
      page: "donate",
      title: "Thank You",
      description: "Copy shown after a successful donation",
      groupIds: ["donate.thank-you"],
      order: 1,
      hideable: false,
    },
    {
      id: "donate.other-ways",
      page: "donate",
      title: "Other Ways to Give",
      description: "Heading for the Venmo/Cash App section",
      groupIds: ["donate.other-ways"],
      order: 2,
      hideable: true,
      links: [SECTION_LINKS.donations],
    },
    {
      id: "faq.page",
      page: "faq",
      title: "FAQ page",
      description: "Heading and empty state on the FAQ page",
      groupIds: ["faq.page"],
      order: 0,
      hideable: false,
      links: [SECTION_LINKS.faq],
    },
  ],
};
