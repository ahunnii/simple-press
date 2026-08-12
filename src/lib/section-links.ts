/**
 * A deep link from a section's field panel into the admin surface that owns
 * the section's underlying entities (products, blog posts, …). Rendered as a
 * "Related content" block at the bottom of the field panel; opened in a new
 * tab so an un-flushed editor draft is never lost.
 */
export type SectionLink = {
  label: string;
  /** Admin path, always same-origin and `/admin`-rooted. */
  href: string;
  description?: string;
  /** Feature-registry key (`~/lib/features/registry`); hidden when disabled. */
  featureKey?: string;
};

/**
 * Central catalog of admin deep links, referenced from per-template
 * `sections.ts` curation (`links: [SECTION_LINKS.products]`). Keeping every
 * href in one place means an admin route move is a one-line change instead of
 * a 14-template sweep. Every href must correspond to a real admin route in
 * `~/app/admin/_lib/admin-nav.ts`, and every `featureKey` to a key in
 * `~/lib/features/registry.ts` (both asserted in template-sections.test.ts).
 *
 * This lives in its own leaf module (rather than in `template-sections.ts`)
 * because every template's `sections.ts` reads it while building its section
 * array at module-init time, and `template-sections.ts` imports those same
 * modules — a cycle that would leave `SECTION_LINKS` undefined at the moment
 * the template modules evaluate.
 */
export const SECTION_LINKS = {
  products: {
    label: "Products",
    href: "/admin/products",
    description: "Add products, edit their photos, prices, and descriptions.",
    featureKey: "products",
  },
  collections: {
    label: "Collections",
    href: "/admin/collections",
    description: "Group products into collections and choose what they show.",
    featureKey: "collections",
  },
  testimonials: {
    label: "Testimonials",
    href: "/admin/testimonials",
    description: "Add, edit, and reorder customer testimonials.",
    featureKey: "testimonials",
  },
  blog: {
    label: "Blog posts",
    href: "/admin/content/blog",
    description: "Write and publish the posts that appear here.",
    featureKey: "blog",
  },
  events: {
    label: "Events",
    href: "/admin/events",
    description: "Add upcoming events with dates, locations, and fliers.",
    featureKey: "events",
  },
  videos: {
    label: "Videos",
    href: "/admin/videos",
    description: "Manage the YouTube videos shown on your site.",
    featureKey: "videos",
  },
  reviews: {
    label: "Product reviews",
    href: "/admin/reviews",
    description: "Approve, hide, or add product reviews.",
    featureKey: "reviews",
  },
  // No featureKey: /admin/content/announcements owns both the `banners` and
  // `popups` flags, so gating the link on either one alone would be wrong
  // (matches the `content-announcements` hub card, which is also ungated).
  announcements: {
    label: "Banner & popup",
    href: "/admin/content/announcements",
    description: "Edit your announcement bar and homepage popup.",
  },
} as const satisfies Record<string, SectionLink>;
