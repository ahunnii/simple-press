import type { TemplateSection } from "~/lib/template-sections";
import { SECTION_LINKS } from "~/lib/section-links";

/**
 * Curated section registry for the `default` storefront template.
 *
 * `order` reflects the visual top-to-bottom order sections render in on
 * each page (see the corresponding page component), not field declaration
 * order. `id` values match `TemplateFieldGroup.id` / `data-sp-group`
 * exactly (`"${page}.${group}"`).
 */
export const defaultTemplateSections: Record<string, TemplateSection[]> = {
  default: [
    // ── Homepage ──────────────────────────────────────────────────────────
    {
      id: "homepage.hero",
      page: "homepage",
      title: "Hero",
      description: "Main banner at the top of the homepage",
      groupIds: ["homepage.hero"],
      order: 0,
      hideable: false,
    },
    {
      id: "homepage.collections",
      page: "homepage",
      title: "Collections grid",
      description: "3-up collection showcase below the hero",
      groupIds: ["homepage.collections"],
      order: 1,
      hideable: true,
      links: [SECTION_LINKS.collections],
    },
    {
      id: "homepage.rails",
      page: "homepage",
      title: "Product Rails",
      description: "Two collection-based product rails",
      groupIds: ["homepage.rails"],
      order: 2,
      hideable: false,
      links: [SECTION_LINKS.products, SECTION_LINKS.collections],
    },
    {
      id: "homepage.story",
      page: "homepage",
      title: "Story",
      description: "About/story strip with image and text",
      groupIds: ["homepage.story"],
      order: 3,
      hideable: true,
    },
    {
      id: "homepage.testimonial",
      page: "homepage",
      title: "Testimonial",
      description: "A single featured customer quote",
      groupIds: ["homepage.testimonial"],
      order: 4,
      hideable: true,
      links: [SECTION_LINKS.testimonials],
    },
    {
      id: "homepage.promise",
      page: "homepage",
      title: "Promise Strip",
      description: "Four short trust/benefit promises",
      groupIds: ["homepage.promise"],
      order: 5,
      hideable: true,
    },

    // ── About ─────────────────────────────────────────────────────────────
    {
      id: "about.hero",
      page: "about",
      title: "Hero",
      groupIds: ["about.hero"],
      order: 0,
      hideable: false,
    },
    {
      id: "about.bio",
      page: "about",
      title: "Bio",
      description: "Maker portrait and story",
      groupIds: ["about.bio"],
      order: 1,
      hideable: false,
    },
    {
      id: "about.pillars",
      page: "about",
      title: "Values",
      description: "Pull quote and three value pillars",
      groupIds: ["about.pillars"],
      order: 2,
      hideable: true,
    },
    {
      id: "about.cta",
      page: "about",
      title: "Closing banner",
      description: "Bottom banner inviting visitors to get in touch",
      groupIds: ["about.cta"],
      order: 3,
      hideable: true,
    },

    // ── Contact ───────────────────────────────────────────────────────────
    {
      id: "contact.header",
      page: "contact",
      title: "Header",
      groupIds: ["contact.header"],
      order: 0,
      hideable: false,
    },
    {
      id: "contact.form",
      page: "contact",
      title: "Form",
      description: "Success-message copy and submit button on the contact form",
      groupIds: ["contact.form"],
      order: 1,
      hideable: false,
    },
    {
      id: "contact.info",
      page: "contact",
      title: "Info cards",
      description:
        "Labels and body copy for the email, phone, address, and hours cards in the contact sidebar",
      groupIds: ["contact.info"],
      order: 2,
      hideable: false,
      links: [
        SECTION_LINKS.businessContact,
        SECTION_LINKS.businessLocation,
        SECTION_LINKS.businessHours,
      ],
    },
    {
      id: "contact.faq",
      page: "contact",
      title: "FAQ",
      groupIds: ["contact.faq"],
      order: 3,
      hideable: true,
      links: [SECTION_LINKS.faq],
    },

    // ── Donate ────────────────────────────────────────────────────────────
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

    // ── Services ──────────────────────────────────────────────────────────
    {
      id: "services.hero",
      page: "services",
      title: "Hero",
      groupIds: ["services.hero"],
      order: 0,
      hideable: false,
    },
    {
      id: "services.intro",
      page: "services",
      title: "Intro",
      description: "Optional editorial intro band above the service grid",
      groupIds: ["services.intro"],
      order: 1,
      hideable: true,
    },
    {
      id: "services.cta",
      page: "services",
      title: "Closing banner",
      description: "Bottom banner inviting visitors to get in touch",
      groupIds: ["services.cta"],
      order: 2,
      hideable: true,
    },

    // ── Events ────────────────────────────────────────────────────────────
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

    // ── Videos ────────────────────────────────────────────────────────────
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

    // ── Blog ──────────────────────────────────────────────────────────────
    {
      id: "blog.header",
      page: "blog",
      title: "Blog listing",
      description: "Heading and intro on the blog index",
      groupIds: ["blog.header"],
      order: 0,
      hideable: false,
      links: [SECTION_LINKS.blog],
    },
    {
      id: "blog.post",
      page: "blog",
      renderContext: "blog-post",
      title: "Blog post",
      description: "Related-posts label and heading at the bottom of a post",
      groupIds: ["blog.post"],
      order: 1,
      hideable: false,
      links: [SECTION_LINKS.blog],
    },

    // ── Shop ──────────────────────────────────────────────────────────────
    {
      id: "shop.listing",
      page: "shop",
      title: "Shop listing",
      description: "Label, heading, and empty state on the shop page",
      groupIds: ["shop.listing"],
      order: 0,
      hideable: false,
      links: [SECTION_LINKS.products],
    },

    // ── Collections ───────────────────────────────────────────────────────
    {
      id: "collections.listing",
      page: "collections",
      title: "Collections listing",
      description: "Label, heading, and empty state on the collections index page",
      groupIds: ["collections.listing"],
      order: 0,
      hideable: false,
      links: [SECTION_LINKS.collections],
    },
    {
      id: "collections.detail",
      page: "collections",
      title: "Collection page",
      description:
        "Empty state and related-collections heading on an individual collection page",
      groupIds: ["collections.detail"],
      order: 1,
      hideable: false,
      links: [SECTION_LINKS.collections],
    },

    // ── Testimonials ──────────────────────────────────────────────────────
    {
      id: "testimonials.listing",
      page: "testimonials",
      title: "Testimonials",
      description: "Label, heading, intro, and empty state on the testimonials page",
      groupIds: ["testimonials.listing"],
      order: 0,
      hideable: false,
      links: [SECTION_LINKS.testimonials],
    },
    {
      id: "testimonials.share",
      page: "testimonials",
      title: "Share your experience",
      description: "Banner inviting customers to submit a review",
      groupIds: ["testimonials.share"],
      order: 1,
      hideable: false,
      links: [SECTION_LINKS.testimonials],
    },

    // ── FAQ ───────────────────────────────────────────────────────────────
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

    // ── Cart ──────────────────────────────────────────────────────────────
    {
      id: "cart.empty",
      page: "cart",
      title: "Empty cart",
      description: "Heading, message, and button shown when the cart is empty",
      groupIds: ["cart.empty"],
      order: 0,
      hideable: false,
    },
    {
      id: "cart.summary",
      page: "cart",
      title: "Order summary",
      description:
        "Heading and checkout button on the cart page's order summary panel",
      groupIds: ["cart.summary"],
      order: 1,
      hideable: false,
    },

    // ── Checkout ──────────────────────────────────────────────────────────
    {
      id: "checkout.unavailable",
      page: "checkout",
      title: "Checkout unavailable",
      description:
        "Shown on the checkout page when online payments aren't set up yet",
      groupIds: ["checkout.unavailable"],
      order: 0,
      hideable: false,
    },
    {
      id: "checkout.confirmation",
      page: "checkout",
      title: "Order confirmation",
      description:
        "Heading, thank-you line, next-steps list, and button on the order confirmation page",
      groupIds: ["checkout.confirmation"],
      order: 1,
      hideable: false,
    },

    // ── Product ───────────────────────────────────────────────────────────
    // Previewed on a representative product; the fields apply to EVERY
    // product page (their keys keep the legacy `global.product-` prefix —
    // see the note in ./index.ts).
    {
      id: "product.details",
      page: "product",
      title: "Product page",
      description:
        "Shipping/question copy and trust badges applied to all products",
      groupIds: ["product.details"],
      order: 0,
      hideable: false,
      links: [SECTION_LINKS.products],
    },

    // ── Global ────────────────────────────────────────────────────────────
    {
      id: "global.authentication",
      page: "global",
      title: "Authentication",
      description: "Image and styling shown on sign-in / sign-up pages",
      groupIds: ["global.authentication"],
      order: 0,
      hideable: false,
    },
    {
      id: "global.footer",
      page: "global",
      title: "Footer",
      description: "Column headings shown in the site footer",
      groupIds: ["global.footer"],
      order: 1,
      hideable: false,
      links: [SECTION_LINKS.branding],
    },
  ],
};
