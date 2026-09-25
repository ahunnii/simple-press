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
      groupIds: ["homepage.hero", "homepage.heroImage"],
      order: 0,
    },
    {
      id: "homepage.valueBand",
      page: "homepage",
      title: "Statements band",
      description:
        "A row of up to four short statements directly below the hero.",
      groupIds: ["homepage.valueBand"],
      order: 1,
      hideable: true,
    },
    {
      id: "homepage.aboutTeaser",
      page: "homepage",
      title: "Our story",
      description:
        "Short introduction to your business on the homepage, with a link to the full About page.",
      groupIds: ["homepage.aboutTeaser"],
      order: 2,
      hideable: true,
    },
    {
      id: "homepage.featured",
      page: "homepage",
      title: "Featured products",
      description:
        "Grid of products from your shop, with a link below to see everything.",
      groupIds: ["homepage.featured"],
      order: 3,
      hideable: true,
      links: [SECTION_LINKS.products],
    },
    {
      id: "homepage.sustainability",
      page: "homepage",
      title: "Sustainability banner",
      description:
        "Up to four highlight cards below the featured products (e.g. Premium Quality, Competitive Prices).",
      groupIds: ["homepage.sustainability"],
      order: 4,
      hideable: true,
    },
    {
      id: "homepage.testimonials",
      page: "homepage",
      title: "Testimonials",
      description:
        "Heading and button text for the testimonials section on the homepage. Testimonials themselves are managed under Admin → Testimonials.",
      groupIds: ["homepage.testimonials"],
      order: 5,
      hideable: true,
      links: [SECTION_LINKS.testimonials],
    },
    {
      id: "homepage.location",
      page: "homepage",
      title: "Location",
      description:
        "Heading above the map of your location. The map appears once you set a map pin in Settings → General.",
      groupIds: ["homepage.location"],
      order: 6,
      hideable: true,
      links: [SECTION_LINKS.businessLocation],
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
      title: "Why we started",
      description:
        "Story text and photo explaining why you started the business.",
      groupIds: ["about.mission"],
      order: 1,
      hideable: true,
    },
    {
      id: "about.values",
      page: "about",
      title: "What we stand for",
      description: "Value cards below the mission section.",
      groupIds: ["about.values"],
      order: 2,
      hideable: true,
    },
    {
      id: "about.supplier",
      page: "about",
      title: "Supplier",
      description: "More Than a Supplier section.",
      groupIds: ["about.supplier"],
      order: 3,
      hideable: true,
    },
    {
      id: "about.whyBamboo",
      page: "about",
      title: "Why bamboo",
      description: "Bamboo benefit facts cards.",
      groupIds: ["about.whyBamboo"],
      order: 4,
      hideable: true,
    },
    {
      id: "about.nationwide",
      page: "about",
      title: "Nationwide reach",
      description: "Nationwide reach heading, text, and fact cards.",
      groupIds: ["about.nationwide"],
      order: 5,
      hideable: true,
    },
    {
      id: "about.detroit",
      page: "about",
      title: "Rooted in Detroit",
      description: "Short story about your local roots and community ties.",
      groupIds: ["about.detroit"],
      order: 6,
      hideable: true,
    },
    {
      id: "about.cta",
      page: "about",
      title: "Closing banner",
      description:
        "Banner with a heading, short text, and up to two buttons at the bottom of the about page.",
      groupIds: ["about.cta"],
      order: 7,
      hideable: true,
    },

    // Contact
    {
      id: "contact.info",
      page: "contact",
      title: "Contact intro",
      description:
        "Heading, intro, and photo at the top of the contact page. Your email, phone, address, and hours come from Settings.",
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
      id: "contact.map",
      page: "contact",
      title: "Map",
      description:
        "Interactive map with directions, shown below the contact form. The map appears once you set a map pin in Settings → General.",
      groupIds: ["contact.map"],
      order: 2,
      hideable: true,
      links: [SECTION_LINKS.businessLocation],
    },
    {
      id: "contact.faq",
      page: "contact",
      title: "FAQ",
      description:
        "Common questions answered at the bottom of the contact page.",
      groupIds: ["contact.faq"],
      order: 3,
      hideable: true,
      links: [SECTION_LINKS.faq],
    },

    // Collections
    {
      id: "collections.listing",
      page: "collections",
      title: "Collections page",
      description:
        "Heading and intro at the top of the collections index page.",
      groupIds: ["collections.listing"],
      order: 0,
      links: [SECTION_LINKS.collections],
    },

    // Products (shop)
    {
      id: "products.listing",
      page: "products",
      title: "Shop page",
      description: "Heading and intro at the top of the shop page.",
      groupIds: ["products.listing"],
      order: 0,
      links: [SECTION_LINKS.products],
    },

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

    // Blog
    {
      id: "blog.listing",
      page: "blog",
      title: "Blog page",
      description:
        "Heading, intro, and photo at the top of the blog index page.",
      groupIds: ["blog.listing"],
      order: 0,
      links: [SECTION_LINKS.blog],
    },
    {
      id: "blog.post",
      page: "blog",
      renderContext: "blog-post",
      title: "End-of-post banner",
      description:
        "Banner with a heading, short text, and a button at the end of every blog post.",
      groupIds: ["blog.post"],
      order: 1,
      hideable: true,
    },

    // Checkout
    {
      id: "checkout.success",
      page: "checkout",
      title: "Order confirmation",
      description:
        "Page shoppers see right after paying. Pickup details come from Settings.",
      groupIds: ["checkout.success"],
      order: 0,
    },
    {
      id: "checkout.unavailable",
      page: "checkout",
      title: "Checkout unavailable",
      description:
        "Shown on the checkout page when online payments aren't set up yet.",
      groupIds: ["checkout.unavailable"],
      order: 1,
    },

    // Testimonials
    {
      id: "testimonials.page",
      page: "testimonials",
      title: "Testimonials page",
      description: "Heading and subheading on the testimonials page.",
      groupIds: ["testimonials.page"],
      order: 0,
      links: [SECTION_LINKS.testimonials],
    },

    // Global
    {
      id: "global.branding",
      page: "global",
      title: "Logo, menu & footer text",
      description:
        "Navigation wordmark, the tagline at the bottom of the phone menu, and the short note in the footer's bottom bar.",
      groupIds: ["global.branding"],
      order: 0,
    },
    {
      id: "global.cart",
      page: "global",
      title: "Cart",
      description:
        "Wording inside the cart panel that slides out from the side.",
      groupIds: ["global.cart"],
      order: 1,
    },
    {
      id: "global.authentication",
      page: "global",
      title: "Sign-in screens",
      description:
        "Background image and logo size on the sign-in and sign-up screens.",
      groupIds: ["global.authentication"],
      order: 2,
    },
    {
      id: "global.pageHero",
      page: "global",
      title: "Page background photo",
      description:
        "Site-wide background photo for the top section of secondary pages (contact, blog, about, and other custom pages). Contact, blog, and about can each use their own photo instead.",
      groupIds: ["global.pageHero"],
      order: 3,
    },
  ],
};
