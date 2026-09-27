import type { TemplateSection } from "~/lib/template-sections";
import { SECTION_LINKS } from "~/lib/section-links";

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
      title: "Trust badges",
      description: "Scrolling marquee of trust badges just below the hero.",
      groupIds: ["homepage.trust-badges"],
      order: 1,
      hideable: true,
    },
    {
      id: "homepage.products",
      page: "homepage",
      title: "Featured products",
      description: "Product grid pulling from your catalog.",
      groupIds: ["homepage.products"],
      order: 2,
      hideable: true,
      links: [SECTION_LINKS.products],
    },
    {
      id: "homepage.about",
      page: "homepage",
      title: "About",
      description:
        "About blurb and image or video shown below the product grid.",
      groupIds: ["homepage.about"],
      order: 3,
      hideable: true,
    },
    {
      id: "homepage.features",
      page: "homepage",
      title: "Feature cards",
      description:
        "Icon feature cards shown inside the About section. Comes from the Feature cards list.",
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
      links: [SECTION_LINKS.testimonials],
    },
    {
      id: "homepage.cta",
      page: "homepage",
      title: "Banner with bullet points",
      description: "Full-width banner with a heading and short checklist.",
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
      defaultHidden: true,
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
      title: "Story",
      description: "Main story text and image.",
      groupIds: ["about.story"],
      order: 1,
      hideable: true,
    },
    {
      id: "about.values",
      page: "about",
      title: "Mission & Vision",
      description:
        "Mission and vision statements. Auto-hides when both are empty.",
      groupIds: ["about.values"],
      order: 2,
      hideable: true,
    },

    // Contact
    {
      id: "contact.hero",
      page: "contact",
      title: "Hero",
      description: "Small label and heading at the top of the contact page.",
      groupIds: ["contact.hero"],
      order: 0,
    },
    {
      id: "contact.info",
      page: "contact",
      title: "Contact information",
      description:
        "Intro text above your contact details. Your email, phone, address, and hours come from Settings; any row that's blank there is hidden.",
      groupIds: ["contact.info"],
      order: 1,
      hideable: true,
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
        "Heading, button, and the message shown after someone sends the contact form.",
      groupIds: ["contact.form"],
      order: 2,
    },
    {
      id: "contact.faq",
      page: "contact",
      title: "Questions",
      description:
        "Common questions answered below the contact form. Auto-hides when you have no published questions.",
      groupIds: ["contact.faq"],
      order: 3,
      hideable: true,
      links: [SECTION_LINKS.faq],
    },

    // Blog
    {
      id: "blog.header",
      page: "blog",
      title: "Blog listing",
      description: "Heading and intro shown at the top of the blog index.",
      groupIds: ["blog.header"],
      order: 0,
      links: [SECTION_LINKS.blog],
    },
    {
      id: "blog.list",
      page: "blog",
      title: "Blog feed",
      description:
        "Labels shown in the post feed, featured post, and search states on the blog index.",
      groupIds: ["blog.list"],
      order: 1,
      links: [SECTION_LINKS.blog],
    },
    {
      id: "blog.newsletter",
      page: "blog",
      title: "Newsletter",
      description: "Email sign-up band at the bottom of the blog listing.",
      groupIds: ["blog.newsletter"],
      order: 2,
      hideable: true,
      defaultHidden: true,
    },
    {
      id: "blog.post",
      page: "blog",
      title: "Blog post",
      description: "Labels shown on individual blog post pages.",
      groupIds: ["blog.post"],
      order: 3,
      links: [SECTION_LINKS.blog],
    },

    // Testimonials
    {
      id: "testimonials.page",
      page: "testimonials",
      title: "Testimonials page",
      description:
        "Heading and closing band copy on the testimonials page. Quotes come from Admin → Testimonials.",
      groupIds: ["testimonials.page"],
      order: 0,
      links: [SECTION_LINKS.testimonials],
    },

    // Product
    {
      id: "product.details",
      page: "product",
      title: "Product page",
      description: "Text shown on every product page, around the buy button.",
      groupIds: ["product.details"],
      order: 0,
      links: [SECTION_LINKS.products],
    },

    // Shop
    {
      id: "shop.header",
      page: "shop",
      title: "Shop page",
      description: "Heading, intro, and empty states on the shop page.",
      groupIds: ["shop.header"],
      order: 0,
      links: [SECTION_LINKS.products],
    },

    // Collections
    {
      id: "collections.header",
      page: "collections",
      title: "Collections page",
      description:
        "Heading, intro, and closing band on the collections listing.",
      groupIds: ["collections.header"],
      order: 0,
      links: [SECTION_LINKS.collections],
    },
    {
      id: "collections.detail",
      page: "collections",
      title: "Collection page",
      description: "Labels shown on an individual collection page.",
      groupIds: ["collections.detail"],
      order: 1,
      links: [SECTION_LINKS.collections],
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
      id: "checkout.success",
      page: "checkout",
      title: "Order confirmation",
      description: "Text shown on the order confirmation page after checkout.",
      groupIds: ["checkout.success"],
      order: 1,
    },

    // Global
    {
      id: "global.footer",
      page: "global",
      title: "Footer",
      description:
        "Column headings and closing line in the footer on every page. Your email and phone come from Settings; the tagline and social links from Content → Branding.",
      groupIds: ["global.footer"],
      order: 0,
      links: [SECTION_LINKS.businessContact, SECTION_LINKS.branding],
    },
    {
      id: "global.cart",
      page: "global",
      title: "Cart",
      description:
        "Wording inside the cart panel that slides out from the side, and on the cart page.",
      groupIds: ["global.cart"],
      order: 1,
    },
  ],
};
