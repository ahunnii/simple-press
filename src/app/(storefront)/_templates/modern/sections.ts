import type { TemplateSection } from "~/lib/template-sections";
import { SECTION_LINKS } from "~/lib/section-links";

export const modernSections: Record<string, TemplateSection[]> = {
  modern: [
    // Homepage (src/app/(storefront)/_templates/modern/homepage/modern-home-page.tsx)
    {
      id: "homepage.hero",
      page: "homepage",
      title: "Hero",
      description: "Banner photo and heading at the top of the homepage.",
      groupIds: ["homepage.hero"],
      order: 0,
    },
    {
      id: "homepage.values",
      page: "homepage",
      title: "Values",
      description: "Short value statements shown under the hero.",
      groupIds: ["homepage.values"],
      order: 1,
      hideable: true,
    },
    {
      id: "homepage.products",
      page: "homepage",
      title: "Featured products",
      description:
        "Grid of featured products below the hero, pulled from your catalog.",
      groupIds: ["homepage.products"],
      order: 2,
      hideable: true,
      links: [SECTION_LINKS.products],
    },
    {
      id: "homepage.about",
      page: "homepage",
      title: "About teaser",
      description: "Photo and short story linking to the About page.",
      groupIds: ["homepage.about"],
      order: 3,
      hideable: true,
    },

    // About (src/app/(storefront)/_templates/modern/about/modern-about-page.tsx)
    {
      id: "about.main",
      page: "about",
      title: "Intro",
      description: "Small label and heading at the top of the About page.",
      groupIds: ["about.main"],
      order: 0,
    },
    {
      id: "about.mission",
      page: "about",
      title: "Mission",
      description: "Mission statement with a supporting photo.",
      groupIds: ["about.mission"],
      order: 1,
      hideable: true,
    },
    {
      id: "about.values",
      page: "about",
      title: "What we stand for",
      description: "Grid of value cards describing what drives the business.",
      groupIds: ["about.values"],
      order: 2,
      hideable: true,
    },
    {
      id: "about.story",
      page: "about",
      title: "Our story",
      description: "Story section with a supporting photo.",
      groupIds: ["about.story"],
      order: 3,
      hideable: true,
    },
    {
      id: "about.cta",
      page: "about",
      title: "Closing banner",
      description:
        "Banner with a heading, text, and button at the bottom of the About page.",
      groupIds: ["about.cta"],
      order: 4,
      hideable: true,
    },

    // Contact (src/app/(storefront)/_templates/modern/contact/modern-contact-page.tsx)
    {
      id: "contact.main",
      page: "contact",
      title: "Intro",
      description:
        "Small label, heading, and intro at the top of the Contact page.",
      groupIds: ["contact.main"],
      order: 0,
    },
    {
      id: "contact.info",
      page: "contact",
      title: "Contact info",
      description:
        "Heading and intro for the contact details column. Your email, phone, address, and hours come from Settings.",
      groupIds: ["contact.info"],
      order: 1,
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
        "Heading and intro above the contact form, plus the message shown after it's sent.",
      groupIds: ["contact.form"],
      order: 2,
    },
    {
      id: "contact.questions",
      page: "contact",
      title: "FAQ",
      description:
        "Frequently asked questions at the bottom of the Contact page.",
      groupIds: ["contact.questions"],
      order: 3,
      hideable: true,
      links: [SECTION_LINKS.faq],
    },

    // Collections (src/app/(storefront)/_templates/modern/collections/modern-collections-page.tsx)
    {
      id: "collections.main",
      page: "collections",
      title: "Intro",
      description:
        "Small label, heading, and intro above the collections grid.",
      groupIds: ["collections.main"],
      order: 0,
      links: [SECTION_LINKS.collections],
    },

    // Products / Shop (src/app/(storefront)/_templates/modern/shop/modern-products-page.tsx)
    {
      id: "products.main",
      page: "products",
      title: "Intro",
      description:
        "Small label, heading, and intro above the shop's product grid.",
      groupIds: ["products.main"],
      order: 0,
      links: [SECTION_LINKS.products],
    },

    // Product page (src/app/(storefront)/_templates/modern/products/modern-product-page.tsx)
    {
      id: "product.details",
      page: "product",
      title: "Product page",
      description:
        "Text shown on every product page, around the add to cart button.",
      groupIds: ["product.details"],
      order: 0,
      links: [SECTION_LINKS.products],
    },

    // Checkout (src/app/(storefront)/_templates/modern/cart-checkout/)
    {
      id: "checkout.success",
      page: "checkout",
      title: "Order confirmation",
      description: "Page shoppers see right after paying.",
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

    // Cart (src/app/(storefront)/_templates/modern/cart-checkout/modern-cart-page.tsx)
    {
      id: "global.cart",
      page: "global",
      title: "Cart",
      description: "Heading and empty-state wording on the cart page.",
      groupIds: ["global.cart"],
      order: 0,
    },

    // Testimonials (src/app/(storefront)/_templates/modern/testimonials/modern-testimonials-page.tsx)
    {
      id: "testimonials.page",
      page: "testimonials",
      title: "Intro",
      description:
        "Small label, heading, and intro above the testimonial cards.",
      groupIds: ["testimonials.page"],
      order: 0,
      links: [SECTION_LINKS.testimonials],
    },
    {
      id: "testimonials.call-to-action",
      page: "testimonials",
      title: "Share your experience",
      description: "Band inviting customers to leave a testimonial.",
      groupIds: ["testimonials.call-to-action"],
      order: 1,
      hideable: true,
    },

    // Blog (src/app/(storefront)/_templates/modern/blog/modern-blog-page.tsx)
    {
      id: "blog.header",
      page: "blog",
      title: "Intro",
      description: "Small label, heading, and intro above the blog listing.",
      groupIds: ["blog.header"],
      order: 0,
      links: [SECTION_LINKS.blog],
    },
  ],
};
