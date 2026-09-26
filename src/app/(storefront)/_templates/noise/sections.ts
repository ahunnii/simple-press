import type { TemplateSection } from "~/lib/template-sections";
import { SECTION_LINKS } from "~/lib/section-links";

export const noiseSections: Record<string, TemplateSection[]> = {
  noise: [
    // Homepage
    {
      id: "homepage.intro",
      page: "homepage",
      title: "Intro animation",
      description:
        "Optional gallery shown as tiles in the full-screen intro animation that plays before the homepage. Leave the gallery unset to use the default color-tile palette.",
      groupIds: ["homepage.intro"],
      order: 0,
    },
    {
      id: "homepage.hero",
      page: "homepage",
      title: "Hero",
      description:
        "Full-viewport banner at the top of the homepage — background image or video, headline, and primary button.",
      groupIds: ["homepage.hero"],
      order: 1,
    },
    {
      id: "homepage.editorial",
      page: "homepage",
      title: "Scrolling text",
      description: "Scrolling tagline band beneath the hero.",
      groupIds: ["homepage.editorial"],
      order: 2,
      hideable: true,
    },
    {
      id: "homepage.philosophy",
      page: "homepage",
      title: "Our philosophy",
      description: "Short brand philosophy quote section.",
      groupIds: ["homepage.philosophy"],
      order: 3,
      hideable: true,
    },
    {
      id: "homepage.aboutTeaser",
      page: "homepage",
      title: "Brand story",
      description: "Portrait image and brand story excerpt.",
      groupIds: ["homepage.aboutTeaser"],
      order: 4,
      hideable: true,
    },
    {
      id: "homepage.collections",
      page: "homepage",
      title: "Collections",
      description:
        "Showcase of your first few collections (admin sort order) with cover images. Collections with no published products are skipped.",
      groupIds: ["homepage.collections"],
      order: 5,
      hideable: true,
      links: [SECTION_LINKS.collections],
    },
    {
      id: "homepage.blogTeaser",
      page: "homepage",
      title: "Blog",
      description:
        "Two-panel band linking to your blog, shown while the Blog feature is on.",
      groupIds: ["homepage.blogTeaser"],
      order: 6,
      hideable: true,
      links: [SECTION_LINKS.blog],
    },
    {
      id: "homepage.featured",
      page: "homepage",
      title: "Latest arrivals",
      description:
        "Your newest published products, newest first. A short row is centered.",
      groupIds: ["homepage.featured"],
      order: 7,
      hideable: true,
      links: [SECTION_LINKS.products],
    },
    {
      id: "homepage.guarantee",
      page: "homepage",
      title: "Guarantee",
      description: "Guarantee/trust band with image and supporting copy.",
      groupIds: ["homepage.guarantee"],
      order: 8,
      hideable: true,
    },
    {
      id: "homepage.testimonials",
      page: "homepage",
      title: "Testimonials",
      description: "Rotating customer quote strip.",
      groupIds: ["homepage.testimonials"],
      order: 9,
      hideable: true,
      links: [SECTION_LINKS.testimonials],
    },

    // About
    {
      id: "about.main",
      page: "about",
      title: "About page",
      description: "Small label, heading, and full brand story.",
      groupIds: ["about.main"],
      order: 0,
    },

    // Contact
    {
      id: "contact.info",
      page: "contact",
      title: "Contact details",
      description:
        "Small label, heading, intro text, and image at the top of the contact page. Your address, phone, and email come from Settings.",
      groupIds: ["contact.info"],
      order: 0,
      links: [SECTION_LINKS.businessContact, SECTION_LINKS.businessLocation],
    },
    {
      id: "contact.form",
      page: "contact",
      title: "Contact form",
      description:
        "Message shown after someone sends the contact form. Messages go to your email address from Settings.",
      groupIds: ["contact.form"],
      order: 1,
      links: [SECTION_LINKS.businessContact],
    },
    {
      id: "contact.faq",
      page: "contact",
      title: "FAQ",
      description: "Frequently asked questions accordion.",
      groupIds: ["contact.faq"],
      order: 2,
      hideable: true,
      links: [SECTION_LINKS.faq],
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
      title: "Blog post shop banner",
      description: "Shop banner shown at the bottom of every blog post.",
      groupIds: ["blog.post"],
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

    // Product (every product page; previewed on a representative product)
    {
      id: "product.details",
      page: "product",
      title: "Product page",
      description:
        "Text shown on every product page — around the buy button and above related products.",
      groupIds: ["product.details"],
      order: 0,
      links: [SECTION_LINKS.products],
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

    // Collections
    {
      id: "collections.listing",
      page: "collections",
      title: "Collections page",
      description:
        "Small label, heading, button, and empty state on the collections index.",
      groupIds: ["collections.listing"],
      order: 0,
      links: [SECTION_LINKS.collections],
    },
    {
      id: "collections.detail",
      page: "collections",
      title: "Collection page",
      description:
        'Small label, empty state, back link, and "more collections" heading on a collection detail page.',
      groupIds: ["collections.detail"],
      order: 1,
      links: [SECTION_LINKS.collections],
    },

    // Testimonials
    {
      id: "testimonials.page",
      page: "testimonials",
      title: "Testimonials page",
      description:
        "Full testimonials page — header, masonry grid, and bottom section.",
      groupIds: ["testimonials.page"],
      order: 0,
      links: [SECTION_LINKS.testimonials],
    },

    // Global
    {
      id: "global.branding",
      page: "global",
      title: "Site branding",
      description:
        "Shop button shown in the blog post banner. The small label under the wordmark is your city from Settings; the footer tagline and social links come from Content → Branding.",
      groupIds: ["global.branding"],
      order: 0,
      links: [SECTION_LINKS.branding, SECTION_LINKS.businessLocation],
    },
    {
      id: "global.cart",
      page: "global",
      title: "Cart",
      description:
        "Wording in the cart panel and on the cart page, plus the notes shown under the checkout button.",
      groupIds: ["global.cart"],
      order: 1,
    },
    {
      id: "global.authentication",
      page: "global",
      title: "Sign-in pages",
      description: "Image shown beside the sign-in and sign-up forms.",
      groupIds: ["global.authentication"],
      order: 2,
    },
  ],
};
