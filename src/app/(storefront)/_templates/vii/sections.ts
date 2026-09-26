import type { TemplateSection } from "~/lib/template-sections";
import { SECTION_LINKS } from "~/lib/section-links";

/**
 * Curated section registry for the `vii` template — homepage, about, contact,
 * shop, blog, testimonials, services (index), and global (header/footer
 * branding) pages. `id` matches the `data-sp-group` value used by the
 * preview overlay (`${page}.${group}`); `order` reflects the visual
 * top-to-bottom order in the rendered page.
 *
 * Product/collections/cart/checkout pages are intentionally not covered here
 * yet — they fall back to the derived (auto-generated) section list via
 * `getSectionsForTemplate` until a later pass curates them too.
 */
export const viiSections: Record<string, TemplateSection[]> = {
  vii: [
    // ─── Global ───────────────────────────────────────────────────────────
    {
      id: "global.branding",
      page: "global",
      title: "Site branding",
      description:
        "Booking button shown in the header on every page. The small label under the wordmark is your city from Settings; the footer tagline and social links come from Content → Branding.",
      groupIds: ["global.branding"],
      order: 0,
      hideable: false,
      links: [SECTION_LINKS.branding, SECTION_LINKS.businessLocation],
    },

    // ─── Homepage ─────────────────────────────────────────────────────────
    {
      id: "homepage.hero",
      page: "homepage",
      title: "Hero",
      description:
        "Full-viewport hero with a background photo or video and a booking button",
      groupIds: ["homepage.hero"],
      order: 0,
      hideable: false,
    },
    {
      id: "homepage.categories",
      page: "homepage",
      title: "Categories",
      description: "Small label, heading, and category tiles",
      groupIds: ["homepage.categories"],
      order: 1,
      hideable: true,
    },
    {
      id: "homepage.video",
      page: "homepage",
      title: "Video",
      description: "Split text-and-video section",
      groupIds: ["homepage.video"],
      order: 2,
      hideable: true,
    },
    {
      id: "homepage.band",
      page: "homepage",
      title: "Photo banner",
      description: "Full-width photo break between the video and product sections",
      groupIds: ["homepage.band"],
      order: 3,
      hideable: true,
    },
    {
      id: "homepage.productRail",
      page: "homepage",
      title: "Featured products",
      description: "Featured product row — core commerce section",
      groupIds: ["homepage.productRail"],
      order: 4,
      hideable: false,
      links: [SECTION_LINKS.products, SECTION_LINKS.collections],
    },
    {
      id: "homepage.testimonial",
      page: "homepage",
      title: "Testimonial",
      description:
        "Quote section — shows a random approved testimonial from Admin → Testimonials",
      groupIds: ["homepage.testimonial"],
      order: 5,
      hideable: true,
      links: [SECTION_LINKS.testimonials],
    },
    {
      id: "homepage.brands",
      page: "homepage",
      title: "Brands we carry",
      description: "Row of brand logos",
      groupIds: ["homepage.brands"],
      order: 6,
      hideable: true,
    },
    {
      id: "homepage.blog",
      page: "homepage",
      title: "Blog preview",
      description: "Latest published blog posts",
      groupIds: ["homepage.blog"],
      order: 7,
      hideable: true,
      links: [SECTION_LINKS.blog],
    },
    {
      id: "homepage.instagram",
      page: "homepage",
      title: "Instagram",
      description:
        "Photo strip and follow button. The handle and link come from your Instagram link in Content → Branding.",
      groupIds: ["homepage.instagram"],
      order: 8,
      hideable: true,
      links: [SECTION_LINKS.branding],
    },
    {
      id: "homepage.detroit",
      page: "homepage",
      title: "Local roots",
      description:
        "Section pairing a local photo with roots copy. Without a photo, the panel shows your city from Settings.",
      groupIds: ["homepage.detroit"],
      order: 9,
      hideable: true,
      links: [SECTION_LINKS.businessLocation],
    },
    {
      id: "homepage.contact",
      page: "homepage",
      title: "Contact",
      description:
        "Closing booking section with heading, body text, phone, and email. Your phone and email come from Settings.",
      groupIds: ["homepage.contact"],
      order: 10,
      hideable: true,
      links: [SECTION_LINKS.businessContact],
    },

    // ─── About ────────────────────────────────────────────────────────────
    {
      id: "about.hero",
      page: "about",
      title: "Page header",
      description: "Full-width banner photo with a small label and page title",
      groupIds: ["about.hero"],
      order: 0,
      hideable: false,
    },
    {
      id: "about.mission",
      page: "about",
      title: "Mission",
      description: "Centered two-part heading and opening paragraph",
      groupIds: ["about.mission"],
      order: 1,
      hideable: true,
    },
    {
      id: "about.steps",
      page: "about",
      title: "Steps",
      description: "Heading, intro, and alternating photo-and-text rows",
      groupIds: ["about.steps"],
      order: 2,
      hideable: true,
    },
    {
      id: "about.band",
      page: "about",
      title: "Statement banner",
      description: "Full-width photo banner with a short statement overlaid",
      groupIds: ["about.band"],
      order: 3,
      hideable: true,
    },
    {
      id: "about.owner",
      page: "about",
      title: "Meet the owner",
      description: "Two-column owner spotlight: heading, role, bio, portrait",
      groupIds: ["about.owner"],
      order: 4,
      hideable: true,
    },
    {
      id: "about.team",
      page: "about",
      title: "Meet the team",
      description: "Heading, intro, and a grid of staff cards",
      groupIds: ["about.team"],
      order: 5,
      hideable: true,
    },
    {
      id: "about.cta",
      page: "about",
      title: "Contact",
      description:
        "Closing contact/booking section. Your phone and email come from Settings.",
      groupIds: ["about.cta"],
      order: 6,
      hideable: true,
      links: [SECTION_LINKS.businessContact],
    },

    // ─── Contact ──────────────────────────────────────────────────────────
    {
      id: "contact.hero",
      page: "contact",
      title: "Page header",
      description: "Full-width banner photo with a small label and page title",
      groupIds: ["contact.hero"],
      order: 0,
      hideable: false,
    },
    {
      id: "contact.main",
      page: "contact",
      title: "Intro and contact details",
      description:
        "Intro heading, info blocks, and the contact form. Your address, phone, email, and hours come from Settings; social links from Content → Branding.",
      groupIds: ["contact.main"],
      order: 1,
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
      description: "Message shown after someone sends the contact form.",
      groupIds: ["contact.form"],
      order: 2,
      hideable: false,
    },
    {
      id: "contact.map",
      page: "contact",
      title: "Map",
      description:
        "Interactive map with directions. The map appears once you set a map pin in Settings → General.",
      groupIds: ["contact.map"],
      order: 3,
      hideable: true,
      links: [SECTION_LINKS.businessLocation],
    },
    {
      id: "contact.review",
      page: "contact",
      title: "Leave a review",
      description: "Section inviting Google/Facebook reviews",
      groupIds: ["contact.review"],
      order: 4,
      hideable: true,
    },

    // ─── Shop ─────────────────────────────────────────────────────────────
    {
      id: "shop.intro",
      page: "shop",
      title: "Shop page",
      description:
        "Editorial intro (small label, heading, body) and the collections strip shown on the shop page",
      groupIds: ["shop.intro"],
      order: 0,
      hideable: false,
    },
    {
      id: "shop.beyond",
      page: "shop",
      title: "Promo panels",
      description:
        "Two-panel promo band shown below the product grid — e.g. one panel for gift cards and one for a featured category. Also controls the brand logos at the bottom of the page.",
      groupIds: ["shop.beyond"],
      order: 1,
      hideable: false,
    },

    // ─── Blog ─────────────────────────────────────────────────────────────
    {
      id: "blog.hero",
      page: "blog",
      title: "Blog page",
      description:
        "Masthead heading, highlighted words, intro text, and an optional cover-story photo for the blog listing page",
      groupIds: ["blog.hero"],
      order: 0,
      hideable: false,
    },
    {
      id: "blog.cta",
      page: "blog",
      title: "Blog post footer",
      description:
        "A block shown at the bottom of every blog post. Configure the small label, heading, body text, and button.",
      groupIds: ["blog.cta"],
      order: 1,
      hideable: false,
      links: [SECTION_LINKS.blog],
    },

    // ─── Testimonials ─────────────────────────────────────────────────────
    {
      id: "testimonials.hero",
      page: "testimonials",
      title: "Page header",
      description:
        "Small label, heading, intro paragraph, and empty-state message for the testimonials page",
      groupIds: ["testimonials.hero"],
      order: 0,
      hideable: false,
    },
    {
      id: "testimonials.cta",
      page: "testimonials",
      title: "Review invite",
      description:
        "Section at the bottom of the testimonials page encouraging clients to submit a review",
      groupIds: ["testimonials.cta"],
      order: 1,
      hideable: false,
      links: [SECTION_LINKS.testimonials],
    },

    // ─── Services (index) ────────────────────────────────────────────────
    {
      id: "services.hero",
      page: "services",
      title: "Page header",
      description:
        "Small label, split heading, optional intro paragraph, and optional background photo or video for the services page hero",
      groupIds: ["services.hero"],
      order: 0,
      hideable: false,
    },
    {
      id: "services.intro",
      page: "services",
      title: "Intro",
      description:
        "Centered small label, split heading, and paragraph shown between the hero and the service cards. Leave all fields blank to hide the section.",
      groupIds: ["services.intro"],
      order: 1,
      hideable: false,
    },
    {
      id: "services.gallery",
      page: "services",
      title: "Photo gallery",
      description:
        "Choose an existing gallery to show as a photo strip beneath the service cards. Hidden when none is selected.",
      groupIds: ["services.gallery"],
      order: 2,
      hideable: false,
      links: [SECTION_LINKS.galleries],
    },
    {
      id: "services.cta",
      page: "services",
      title: "Contact",
      description:
        "Background photo, heading, body text, button, booking widget, and contact details for the closing contact section",
      groupIds: ["services.cta"],
      order: 3,
      hideable: false,
      links: [SECTION_LINKS.businessContact],
    },

    // ─── Collections ──────────────────────────────────────────────────────
    {
      id: "collections.listing",
      page: "collections",
      title: "Collections page",
      description: "Heading at the top of the collections page.",
      groupIds: ["collections.listing"],
      order: 0,
      hideable: false,
      links: [SECTION_LINKS.collections],
    },

    // ─── Product ──────────────────────────────────────────────────────────
    {
      id: "product.details",
      page: "product",
      title: "Product page",
      description:
        "Text shown on every product page around the buy button. Product photos, prices, and descriptions are edited in Products.",
      groupIds: ["product.details"],
      order: 0,
      hideable: false,
      links: [SECTION_LINKS.products],
    },
  ],
};
