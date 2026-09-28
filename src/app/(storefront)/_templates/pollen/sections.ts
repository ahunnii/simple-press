import type { TemplateSection } from "~/lib/template-sections";
import { SECTION_LINKS } from "~/lib/section-links";

/**
 * Curated section registry for the `pollen` storefront template.
 *
 * Covers homepage, about, contact, and services — the pages with the
 * richest section structure — plus the optional events/videos/donate/FAQ
 * pages (Default's groups, see the bottom of the list). Other reachable pages (blog, collections,
 * shop, testimonials) have a single field group each, so the derived
 * fallback (one section per group, titled from `TemplateFieldGroup`
 * metadata) already gives owners a clean rail with no curation needed.
 *
 * `global.*` groups (header, authentication) render across several pages
 * and are left to the derived fallback — `TEMPLATE_FIELD_GROUPS.pollen`
 * already gives them titles/descriptions/icons, and they're pinned in the
 * rail's "Global" page. `global.testimonials` (services-page testimonials
 * band), `global.cart` (full cart page), and `global.cta` (the CTA band
 * shown at the bottom of most pages) are curated below to make them
 * hideable and/or link Admin → Testimonials. Each keeps `page: "global"`:
 * the field panel resolves a section's fields by `section.page`, and their
 * fields are `page: "global"`, so a page-specific section would render
 * empty (this is also why the about-page testimonials band below gets its
 * own `about.testimonials` group instead of reusing `global.testimonials`).
 *
 * `order` reflects the visual top-to-bottom order sections render in on
 * each page (see the corresponding page component), not field declaration
 * order. `id` values match `TemplateFieldGroup.id` / `data-sp-group`
 * exactly (`"${page}.${group}"` in the common case; the services page
 * groups keep their literal `products.*` group ids even though the field
 * `page` was retagged to `"services"` — see
 * `docs/design/visual-editor-template-rollout.md`).
 */
export const pollenSections: Record<string, TemplateSection[]> = {
  pollen: [
    // ── Homepage ──────────────────────────────────────────────────────────
    {
      id: "homepage.hero",
      page: "homepage",
      title: "Hero",
      description: "Full-screen banner at the top of the homepage.",
      groupIds: ["homepage.hero"],
      order: 0,
      hideable: false,
    },
    {
      id: "homepage.services",
      page: "homepage",
      title: "Services",
      description: '"About Our Services" band with service cards.',
      groupIds: ["homepage.services"],
      order: 1,
      hideable: true,
    },
    {
      id: "homepage.gallery",
      page: "homepage",
      title: "Gallery",
      description: "Portfolio/gallery image grid with a view-all button.",
      groupIds: ["homepage.gallery"],
      order: 2,
      hideable: true,
    },

    // ── About ─────────────────────────────────────────────────────────────
    {
      id: "about.hero",
      page: "about",
      title: "Page heading",
      description: "Heading and small label at the top of the about page.",
      groupIds: ["about.hero"],
      order: 0,
      hideable: false,
    },
    {
      id: "about.main",
      page: "about",
      title: "About Us",
      description: "Intro heading, story text, and image.",
      groupIds: ["about.main"],
      order: 1,
      hideable: false,
    },
    {
      id: "about.owner",
      page: "about",
      title: "Owner",
      description: "Featured owner section with photo and bio.",
      groupIds: ["about.owner"],
      order: 2,
      hideable: true,
    },
    {
      id: "about.testimonials",
      page: "about",
      title: "Testimonials band",
      description:
        "Small label and heading above the customer quotes on the about page. The quotes themselves come from Admin → Testimonials.",
      groupIds: ["about.testimonials"],
      order: 3,
      hideable: true,
      links: [SECTION_LINKS.testimonials],
    },

    // ── Contact ───────────────────────────────────────────────────────────
    {
      id: "contact.main",
      page: "contact",
      title: "Page heading",
      description:
        "Heading at the top of the contact page. Your address, email, phone, and hours come from Settings.",
      groupIds: ["contact.main"],
      order: 0,
      hideable: false,
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
        "Title, intro, and photo beside the contact form, plus the message shown after it's sent.",
      groupIds: ["contact.form"],
      order: 1,
      hideable: false,
    },

    // ── Services ──────────────────────────────────────────────────────────
    // `products.list` renders only on the Services index (services feature
    // on); `products.main`'s cards render only on the legacy page (feature
    // off). The hero title/subtitle in `products.main` render on both.
    {
      id: "products.list",
      page: "services",
      title: "Service listings",
      description:
        "Heading, intro, and card/empty-state copy for the grid of real services from Admin → Services.",
      groupIds: ["products.list"],
      order: 0,
      hideable: false,
    },
    {
      id: "products.main",
      page: "services",
      title: "Services overview",
      description: "Page hero, intro copy, and service cards.",
      groupIds: ["products.main"],
      order: 1,
      hideable: false,
    },
    {
      id: "products.faq",
      page: "services",
      title: "FAQ",
      description: "Frequently asked questions accordion with an image.",
      groupIds: ["products.faq"],
      order: 2,
      hideable: true,
      links: [SECTION_LINKS.faq],
    },
    {
      id: "products.resources",
      page: "services",
      title: "Helpful Resources",
      description: "Optional free-resource links band.",
      groupIds: ["products.resources"],
      order: 3,
      hideable: true,
    },

    // ── Product (every product page; previewed on a representative product) ─
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

    // ── Checkout ──────────────────────────────────────────────────────────
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
        "The page shoppers land on after paying: heading, next steps and buttons.",
      groupIds: ["checkout.confirmation"],
      order: 1,
    },
    {
      id: "checkout.no-order",
      page: "checkout",
      title: "Order not found",
      description:
        "Shown on the order confirmation page when there's no order to show.",
      groupIds: ["checkout.no-order"],
      order: 2,
    },

    // ── Global ────────────────────────────────────────────────────────────
    {
      id: "global.testimonials",
      page: "global",
      title: "Testimonials band",
      description:
        "Heading and link text for the customer quotes shown on the services page. The quotes themselves come from Admin → Testimonials.",
      groupIds: ["global.testimonials"],
      order: 0,
      hideable: true,
      links: [SECTION_LINKS.testimonials],
    },
    {
      id: "global.cart",
      page: "global",
      title: "Cart",
      description:
        "Wording shown on the full cart page, and on checkout when the cart is empty.",
      groupIds: ["global.cart"],
      order: 1,
    },
    {
      id: "global.cta",
      page: "global",
      title: "Closing banner",
      description:
        "Heading, text, image, and button for the banner shown near the bottom of most pages.",
      groupIds: ["global.cta"],
      order: 2,
      hideable: true,
    },

    // ── Optional pages (Default's `default.*` groups, pollen markup) ─────
    // Pollen's events/videos/donate/FAQ pages render Default's field groups
    // inside PollenGeneralLayout, so these mirror `default/sections.ts`.
    // Events and Donate end with their own section (global CTA off there).
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
