import type { TemplateSection } from "~/lib/template-sections";
import { SECTION_LINKS } from "~/lib/section-links";

export const darkTrendSections: Record<string, TemplateSection[]> = {
  "dark-trend": [
    // Homepage
    {
      id: "homepage.hero",
      page: "homepage",
      title: "Hero",
      description: "Large banner at the top of the homepage.",
      groupIds: ["homepage.hero"],
      order: 0,
    },
    {
      id: "homepage.gallery",
      page: "homepage",
      title: "Photo gallery",
      description: "Optional image gallery shown just below the hero.",
      groupIds: ["homepage.gallery"],
      order: 1,
      hideable: true,
      links: [SECTION_LINKS.galleries],
    },
    {
      id: "homepage.first-section",
      page: "homepage",
      title: "Feature story",
      description: "Numbered story section with image and description.",
      groupIds: ["homepage.first-section"],
      order: 2,
      hideable: true,
    },
    {
      id: "homepage.second-section",
      page: "homepage",
      title: "Featured product",
      description:
        "Numbered spotlight section pairing your heading with your first product.",
      groupIds: ["homepage.second-section"],
      order: 3,
      hideable: true,
      links: [SECTION_LINKS.products],
    },
    {
      id: "homepage.products",
      page: "homepage",
      title: "Products",
      description:
        "Numbered product grid with a button to the full shop. The products come from your catalog.",
      groupIds: ["homepage.products"],
      order: 4,
      hideable: true,
      links: [SECTION_LINKS.products],
    },
    {
      id: "homepage.cta",
      page: "homepage",
      title: "Closing banner",
      description: "Numbered banner at the bottom of the homepage.",
      groupIds: ["homepage.cta"],
      order: 5,
      hideable: true,
    },

    // About
    {
      id: "about.features",
      page: "about",
      title: "Story",
      description: "Story heading plus up to four numbered cards.",
      groupIds: ["about.features"],
      order: 0,
    },
    {
      id: "about.cta",
      page: "about",
      title: "Closing banner",
      description: "Banner at the bottom of the about page.",
      groupIds: ["about.cta"],
      order: 1,
      hideable: true,
    },

    // Contact
    {
      id: "contact.info",
      page: "contact",
      title: "Contact info",
      description:
        "Page title, contact cards, heading, description, and image on the contact page. Your address, email, phone, and hours come from Settings.",
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
      description: "Message shown after someone sends the contact form.",
      groupIds: ["contact.form"],
      order: 1,
    },

    // Blog
    {
      id: "blog.listing",
      page: "blog",
      title: "Blog listing",
      description: "Heading and intro for the blog index page.",
      groupIds: ["blog.listing"],
      order: 0,
      links: [SECTION_LINKS.blog],
    },
    {
      id: "blog.post",
      page: "blog",
      renderContext: "blog-post",
      title: "More stories",
      description:
        "Heading above related posts at the bottom of every blog post.",
      groupIds: ["blog.post"],
      order: 1,
    },

    // Product
    {
      id: "product.details",
      page: "product",
      title: "Product page",
      description: "Text shown on every product page, around the buy button.",
      groupIds: ["product.details"],
      links: [SECTION_LINKS.products],
      order: 0,
    },

    // Shop
    {
      id: "shop.listing",
      page: "shop",
      title: "Shop listing",
      description: "Heading and empty state at the top of the shop page.",
      groupIds: ["shop.listing"],
      order: 0,
      links: [SECTION_LINKS.products],
    },

    // Collections
    {
      id: "collections.listing",
      page: "collections",
      title: "Collections listing",
      description:
        "Heading and empty state at the top of the collections index page.",
      groupIds: ["collections.listing"],
      order: 0,
      links: [SECTION_LINKS.collections],
    },
    {
      id: "collections.detail",
      page: "collections",
      title: "Collection page",
      description:
        "Back link, empty state, and related-collections heading on an individual collection page.",
      groupIds: ["collections.detail"],
      order: 1,
      links: [SECTION_LINKS.collections],
    },

    // Testimonials
    {
      id: "testimonials.listing",
      page: "testimonials",
      title: "Testimonials",
      description:
        "Heading, intro, empty state, and back-to-home link on the testimonials page.",
      groupIds: ["testimonials.listing"],
      order: 0,
      links: [SECTION_LINKS.testimonials],
    },
    {
      id: "testimonials.share",
      page: "testimonials",
      title: "Share your experience",
      description: "Banner inviting customers to submit a testimonial.",
      groupIds: ["testimonials.share"],
      order: 1,
      hideable: true,
      links: [SECTION_LINKS.testimonials],
    },

    // Cart
    {
      id: "cart.empty",
      page: "cart",
      title: "Empty cart",
      description:
        "Heading, message, and button shown when the cart has nothing in it.",
      groupIds: ["cart.empty"],
      order: 0,
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
    {
      id: "checkout.confirmation",
      page: "checkout",
      title: "Order confirmation",
      description:
        "Heading, next-steps list, and button on the order confirmation page.",
      groupIds: ["checkout.confirmation"],
      order: 1,
    },
    {
      id: "checkout.form",
      page: "checkout",
      title: "Checkout form",
      description:
        "Secure-payment note under the payment button on the checkout page.",
      groupIds: ["checkout.form"],
      order: 2,
    },

    // Global
    {
      id: "global.footer",
      page: "global",
      title: "Footer",
      description:
        "Column headings in the footer on every page. Your address, phone, and email come from Settings; the tagline and social links from Content → Branding.",
      groupIds: ["global.footer"],
      order: 0,
      links: [SECTION_LINKS.businessContact, SECTION_LINKS.branding],
    },
    {
      id: "global.authentication",
      page: "global",
      title: "Authentication",
      description: "Image shown on the sign-in and sign-up pages.",
      groupIds: ["global.authentication"],
      order: 1,
    },
  ],
};
