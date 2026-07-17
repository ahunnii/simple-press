import type { TemplateSection } from "~/lib/template-sections";

/**
 * Curated section registry for the `pollen` storefront template.
 *
 * Covers homepage, about, contact, and services — the pages with the
 * richest section structure. Other reachable pages (blog, collections,
 * shop, testimonials) have a single field group each, so the derived
 * fallback (one section per group, titled from `TemplateFieldGroup`
 * metadata) already gives owners a clean rail with no curation needed.
 *
 * `global.*` groups (header background, CTA band, services-page
 * testimonials heading) render across several of these pages but are left
 * to the derived fallback too — `TEMPLATE_FIELD_GROUPS.pollen` already
 * gives them accurate titles/descriptions/icons, and they're pinned in the
 * rail's "Global" page regardless of curation here.
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
      description: "\"About Our Services\" band with service cards.",
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
      id: "about.main",
      page: "about",
      title: "About Us",
      description: "Intro heading, story text, and image.",
      groupIds: ["about.main"],
      order: 0,
      hideable: false,
    },
    {
      id: "about.owner",
      page: "about",
      title: "Owner",
      description: "Featured owner section with photo and bio.",
      groupIds: ["about.owner"],
      order: 1,
      hideable: false,
    },

    // ── Contact ───────────────────────────────────────────────────────────
    {
      id: "contact.main",
      page: "contact",
      title: "Contact Form",
      description: "Page heading, form title/description, and form image.",
      groupIds: ["contact.main"],
      order: 0,
      hideable: false,
    },

    // ── Services ──────────────────────────────────────────────────────────
    {
      id: "products.main",
      page: "services",
      title: "Services Overview",
      description: "Page hero, intro copy, and service cards.",
      groupIds: ["products.main"],
      order: 0,
      hideable: false,
    },
    {
      id: "products.faq",
      page: "services",
      title: "FAQ",
      description: "Frequently asked questions accordion with an image.",
      groupIds: ["products.faq"],
      order: 1,
      hideable: true,
    },
    {
      id: "products.resources",
      page: "services",
      title: "Helpful Resources",
      description: "Optional free-resource links band.",
      groupIds: ["products.resources"],
      order: 2,
      hideable: true,
    },
  ],
};
