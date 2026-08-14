import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";

/**
 * Global (chrome) fields for the `pink` template — header, footer,
 * announcement bar, and the shared chrome of the CMS generic page.
 *
 * Everything here is `page: "global"` so it is reachable from every page tab
 * in the visual editor. The generic page's chrome lives here too because the
 * `TemplatePage` union has no `generic` member (same convention as `coop`).
 *
 * Authority: docs/templates/pink/design.md → "Per-page section concepts → Global".
 */
export const pinkGlobalData: TemplateField[] = [
  // ── global.branding ──────────────────────────────────────────────────────
  {
    key: "pink.global.accent-word",
    label: "Wordmark Accent Word",
    description:
      "The part of your business name shown in the accent color, e.g. the 'Art' in 'PinkArt'. Leave blank to render the whole name in one color.",
    type: "text",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: "Art",
    placeholder: "Art",
  },
  {
    key: "pink.global.footer-brand-mark",
    label: "Use the PinkArt Logo Mark in the Footer",
    description:
      "On: the footer shows the PinkArt logo's own letterforms, recolored to stay readable on the dark footer (and on the light one used by The Artist and blog posts). Off: it falls back to your footer logo image below, then to the logo in Admin → Branding, then to your business name as text.",
    type: "boolean",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: "true",
  },
  {
    key: "pink.global.footer-logo",
    label: "Footer Logo Image",
    description:
      "Used only when the logo mark above is off. Upload a version that reads on a DARK background — the footer is dark on every page except The Artist and blog posts. Leave blank to reuse the logo from Admin → Branding.",
    type: "image",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: "",
  },
  {
    key: "pink.global.footer-blurb",
    label: "Footer Blurb",
    description:
      "One or two sentences under the wordmark in the footer, on every page.",
    type: "textarea",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-full",
    defaultValue:
      "Handmade dolls, magnets, jewelry and small pieces — each one made on its own in Detroit. Studio visits by appointment.",
  },
  // NOTE: social links are no longer a template field. They read straight
  // from `SiteContent.socialLinks` (Admin → Branding) via the shared
  // `~/lib/social-links` registry, like `elegant`/`pollen`/`builders`/
  // `happy-bamboo` — see `PinkSocialLinks` in `../shared/pink-social-links`.

  // ── global.header ────────────────────────────────────────────────────────
  {
    key: "pink.global.nav-shop",
    label: "Nav Label — Shop",
    description: "Header link to /shop.",
    type: "text",
    page: "global",
    group: "global.header",
    gridColumn: "col-span-1",
    defaultValue: "Shop",
  },
  {
    key: "pink.global.nav-collections",
    label: "Nav Label — Collections",
    description: "Header link to /collections.",
    type: "text",
    page: "global",
    group: "global.header",
    gridColumn: "col-span-1",
    defaultValue: "Collections",
  },
  {
    key: "pink.global.nav-services",
    label: "Nav Label — Services",
    description:
      "Header link to /services. Only shown when the Services feature is on.",
    type: "text",
    page: "global",
    group: "global.header",
    gridColumn: "col-span-1",
    defaultValue: "Make & Takes",
  },
  {
    key: "pink.global.nav-blog",
    label: "Nav Label — Journal",
    description:
      "Header link to /blog. Only shown when the Blog feature is on.",
    type: "text",
    page: "global",
    group: "global.header",
    gridColumn: "col-span-1",
    defaultValue: "Journal",
  },
  {
    key: "pink.global.nav-events",
    label: "Nav Label — Events",
    description:
      "Header link to /events. Only shown when the Events feature is on.",
    type: "text",
    page: "global",
    group: "global.header",
    gridColumn: "col-span-1",
    defaultValue: "Events",
  },
  {
    key: "pink.global.nav-videos",
    label: "Nav Label — Videos",
    description:
      "Header link to /videos. Only shown when the Videos feature is on.",
    type: "text",
    page: "global",
    group: "global.header",
    gridColumn: "col-span-1",
    defaultValue: "Videos",
  },
  {
    key: "pink.global.nav-about",
    label: "Nav Label — About",
    description: "Header link to /about.",
    type: "text",
    page: "global",
    group: "global.header",
    gridColumn: "col-span-1",
    defaultValue: "The artist",
  },
  {
    key: "pink.global.header-cta-text",
    label: "Header Secondary CTA Text",
    description:
      "Optional bordered button beside the basket — e.g. a link to a sale, a class signup, or your Instagram. Empty by default, which hides the button entirely; set both this and the link below to show it.",
    type: "text",
    page: "global",
    group: "global.header",
    gridColumn: "col-span-1",
    defaultValue: "",
  },
  {
    key: "pink.global.header-cta-link",
    label: "Header Secondary CTA Link",
    description:
      "Where the bordered header button goes. Only used once you set the text above — defaults to your Contact page so the button never points somewhere that doesn't exist.",
    type: "url",
    page: "global",
    group: "global.header",
    gridColumn: "col-span-1",
    defaultValue: "/contact",
  },
  {
    key: "pink.global.basket-label",
    label: "Basket Button Label",
    description: "The filled button at the right of the header.",
    type: "text",
    page: "global",
    group: "global.header",
    gridColumn: "col-span-1",
    defaultValue: "Basket",
  },

  // ── global.footer-links ──────────────────────────────────────────────────
  {
    key: "pink.global.footer-col1-title",
    label: "Footer Column 1 Title",
    description: "Small uppercase label above the first footer link column.",
    type: "text",
    page: "global",
    group: "global.footer-links",
    gridColumn: "col-span-1",
    defaultValue: "Shop",
  },
  {
    key: "pink.global.footer-col1-links",
    label: "Footer Column 1 Links",
    description: "Links in the first footer column.",
    type: "list",
    page: "global",
    group: "global.footer-links",
    gridColumn: "col-span-full",
    maxItems: 8,
    itemSchema: [
      { key: "label", label: "Label", type: "text", placeholder: "Everything" },
      { key: "url", label: "URL", type: "url", placeholder: "/shop" },
    ],
    defaultValue: "",
  },
  {
    key: "pink.global.footer-col2-title",
    label: "Footer Column 2 Title",
    description: "Small uppercase label above the second footer link column.",
    type: "text",
    page: "global",
    group: "global.footer-links",
    gridColumn: "col-span-1",
    defaultValue: "Studio",
  },
  {
    key: "pink.global.footer-col2-links",
    label: "Footer Column 2 Links",
    description: "Links in the second footer column.",
    type: "list",
    page: "global",
    group: "global.footer-links",
    gridColumn: "col-span-full",
    maxItems: 8,
    itemSchema: [
      { key: "label", label: "Label", type: "text", placeholder: "Journal" },
      { key: "url", label: "URL", type: "url", placeholder: "/blog" },
    ],
    defaultValue: "",
  },

  // ── global.footer-legal ──────────────────────────────────────────────────
  {
    key: "pink.global.footer-copyright",
    label: "Footer Copyright Line",
    description:
      "Bottom-left of the footer. The year is added automatically if you leave it out.",
    type: "text",
    page: "global",
    group: "global.footer-legal",
    gridColumn: "col-span-full",
    defaultValue: "PinkArt LLC — Detroit, Michigan",
  },
  {
    key: "pink.global.footer-legal-links",
    label: "Footer Legal Links",
    description: "Bottom-right of the footer. Leave empty to hide.",
    type: "list",
    page: "global",
    group: "global.footer-legal",
    gridColumn: "col-span-full",
    maxItems: 5,
    itemSchema: [
      { key: "label", label: "Label", type: "text", placeholder: "Privacy" },
      {
        key: "url",
        label: "URL",
        type: "url",
        placeholder: "/pages/privacy-policy",
      },
    ],
    defaultValue: "",
  },

  // NOTE: there is deliberately no announcement-bar field group. The bar renders
  // the platform-wide site banner (`SiteContent.bannerConfig`, gated by the
  // `banners` feature flag and resolved with `resolveBanner`) so a banner the
  // owner configures once in the admin appears on whatever template they run.
  // Duplicating it as template fields would give owners two competing controls.

  // ── global.page-facts (CMS generic pages) ────────────────────────────────
  {
    key: "pink.global.page-facts",
    label: "Page Header Facts",
    description:
      "Small label/value rows in the dark header of your custom pages — e.g. 'Where / 8412 Main St'. Leave empty to hide.",
    type: "list",
    page: "global",
    group: "global.page-facts",
    gridColumn: "col-span-full",
    maxItems: 4,
    itemSchema: [
      { key: "label", label: "Label", type: "text", placeholder: "Where" },
      { key: "value", label: "Value", type: "text", placeholder: "The studio" },
    ],
    defaultValue: "",
  },

  // ── global.page-sidebar (CMS generic pages) ──────────────────────────────
  {
    key: "pink.global.page-cta-heading",
    label: "Page Sidebar CTA Heading",
    description:
      "Boxed callout in the sidebar of your custom pages. Leave blank to hide the whole box.",
    type: "text",
    page: "global",
    group: "global.page-sidebar",
    gridColumn: "col-span-full",
    defaultValue: "Come sit at the table",
  },
  {
    key: "pink.global.page-cta-body",
    label: "Page Sidebar CTA Text",
    description: "One or two lines under the sidebar heading.",
    type: "textarea",
    page: "global",
    group: "global.page-sidebar",
    gridColumn: "col-span-full",
    defaultValue:
      "We bring make & takes to your room — school, church, library, workplace or back yard. Materials are included.",
  },
  {
    key: "pink.global.page-cta-button",
    label: "Page Sidebar CTA Button Text",
    description: "Leave blank to hide the button.",
    type: "text",
    page: "global",
    group: "global.page-sidebar",
    gridColumn: "col-span-1",
    defaultValue: "Ask about a make & take",
  },
  {
    key: "pink.global.page-cta-link",
    label: "Page Sidebar CTA Button Link",
    description: "Where the sidebar button goes.",
    type: "url",
    page: "global",
    group: "global.page-sidebar",
    gridColumn: "col-span-1",
    defaultValue: "/contact",
  },
  {
    key: "pink.global.page-contact-note",
    label: "Page Sidebar Contact Note",
    description:
      "Small line at the bottom of the sidebar on custom pages. Leave blank to hide.",
    type: "textarea",
    page: "global",
    group: "global.page-sidebar",
    gridColumn: "col-span-full",
    defaultValue: "Questions? Send a note and we'll get back to you.",
  },

  // ── global.authentication ────────────────────────────────────────────────
  {
    key: "pink.global.authentication-image",
    label: "Authentication Image",
    description: "Image shown beside the sign-in and sign-up forms.",
    type: "image",
    page: "global",
    group: "global.authentication",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },
];

export const pinkGlobalFieldGroups: TemplateFieldGroup[] = [
  {
    id: "global.branding",
    title: "Site Branding",
    description:
      "Wordmark accent, the footer logo, and the footer blurb — shown on every page",
    icon: "🏷️",
    columns: 2,
  } satisfies TemplateFieldGroup,
  {
    id: "global.header",
    title: "Header",
    description:
      "Navigation labels, the bordered secondary button, and the basket button",
    icon: "🧭",
    columns: 2,
  } satisfies TemplateFieldGroup,
  {
    id: "global.footer-links",
    title: "Footer Links",
    description: "The two link columns in the middle of the footer",
    icon: "🔗",
    columns: 2,
  } satisfies TemplateFieldGroup,
  {
    id: "global.footer-legal",
    title: "Footer Legal Strip",
    description: "Copyright line and policy links at the very bottom",
    icon: "⚖️",
    columns: 1,
  } satisfies TemplateFieldGroup,
  {
    id: "global.page-facts",
    title: "Custom Page Facts",
    description: "Label/value rows in the dark header of your custom CMS pages",
    icon: "📋",
    columns: 1,
  } satisfies TemplateFieldGroup,
  {
    id: "global.page-sidebar",
    title: "Custom Page Sidebar",
    description:
      "The callout box and contact note in the sidebar of your custom CMS pages",
    icon: "📄",
    columns: 2,
  } satisfies TemplateFieldGroup,
  {
    id: "global.authentication",
    title: "Authentication",
    description: "Image shown on the sign-in and sign-up screens",
    icon: "🔐",
    columns: 1,
  } satisfies TemplateFieldGroup,
];

export const pinkGlobalSections: TemplateSection[] = [
  {
    id: "global.branding",
    page: "global",
    title: "Site Branding",
    description:
      "Wordmark accent, the footer logo, and the footer blurb — shown on every page",
    groupIds: ["global.branding"],
    order: 0,
    hideable: false,
  },
  {
    id: "global.header",
    page: "global",
    title: "Header",
    description: "Navigation labels and the two header buttons",
    groupIds: ["global.header"],
    order: 1,
    hideable: false,
  },
  {
    id: "global.footer-links",
    page: "global",
    title: "Footer Links",
    description: "The two link columns in the footer",
    groupIds: ["global.footer-links"],
    order: 2,
    hideable: false,
  },
  {
    id: "global.footer-social",
    page: "global",
    title: "Footer Social",
    description:
      "Social icons shown in the footer (configured in Admin → Branding)",
    groupIds: ["global.footer-social"],
    order: 3,
    hideable: true,
  },
  {
    id: "global.footer-legal",
    page: "global",
    title: "Footer Legal Strip",
    description: "Copyright line and policy links",
    groupIds: ["global.footer-legal"],
    order: 4,
    hideable: false,
  },
  {
    id: "global.page-facts",
    page: "global",
    title: "Custom Page Facts",
    description: "Label/value rows in the header of your custom CMS pages",
    groupIds: ["global.page-facts"],
    order: 5,
    hideable: true,
    defaultHidden: true,
  },
  {
    id: "global.page-sidebar",
    page: "global",
    title: "Custom Page Sidebar",
    description: "Callout box and contact note on your custom CMS pages",
    groupIds: ["global.page-sidebar"],
    order: 6,
    hideable: true,
  },
  {
    id: "global.authentication",
    page: "global",
    title: "Authentication",
    description: "Image shown on the sign-in and sign-up screens",
    groupIds: ["global.authentication"],
    order: 7,
    hideable: false,
  },
];
