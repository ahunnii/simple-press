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
 * The whole footer is ONE group/section (`global.footer`) — brand mark, blurb,
 * both link columns, and the bottom strip — so every part of it opens the same
 * panel from the editor. `global.branding` carries the wordmark accent word
 * alone: it is the only field the header and the footer share.
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

  // ── global.header ────────────────────────────────────────────────────────
  // Nav labels/links are no longer template fields — they are managed in
  // Content → Navigation (`SiteContent.navigationItems`), like every other
  // template.
  {
    key: "pink.global.basket-label",
    label: "Cart Button Label",
    description:
      "The filled cart button at the right of the header, and the cart button in the mobile menu drawer.",
    type: "text",
    page: "global",
    group: "global.header",
    gridColumn: "col-span-1",
    defaultValue: "Basket",
  },

  // ── global.footer ────────────────────────────────────────────────────────
  // NOTE: social links are no longer a template field. They read straight
  // from `SiteContent.socialLinks` (Content → Branding) via the shared
  // `~/lib/social-links` registry, like `elegant`/`pollen`/`builders`/
  // `happy-bamboo` — see `PinkSocialLinks` in `../shared/pink-social-links`.
  {
    key: "pink.global.footer-brand-mark",
    label: "Use the PinkArt Logo Mark in the Footer",
    description:
      "On: the footer shows the PinkArt logo's own letterforms, recolored to stay readable on the dark footer (and on the light one used by The Artist and blog posts). Off: it falls back to your footer logo image below, then to the logo in Content → Branding, then to your business name as text.",
    type: "boolean",
    page: "global",
    group: "global.footer",
    gridColumn: "col-span-1",
    defaultValue: "true",
  },
  {
    key: "pink.global.footer-logo",
    label: "Footer Logo Image",
    description:
      "Used only when the logo mark above is off. Upload a version that reads on a DARK background — the footer is dark on every page except The Artist and blog posts. Leave blank to reuse the logo from Content → Branding.",
    type: "image",
    page: "global",
    group: "global.footer",
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
    group: "global.footer",
    gridColumn: "col-span-full",
    defaultValue:
      "Handmade dolls, magnets, jewelry and small pieces — each one made on its own in Detroit. Studio visits by appointment.",
  },
  {
    key: "pink.global.footer-col1-title",
    label: "Footer Column 1 Title",
    description: "Small uppercase label above the first footer link column.",
    type: "text",
    page: "global",
    group: "global.footer",
    gridColumn: "col-span-1",
    defaultValue: "Shop",
  },
  {
    key: "pink.global.footer-col1-links",
    label: "Footer Column 1 Links",
    description: "Links in the first footer column.",
    type: "list",
    page: "global",
    group: "global.footer",
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
    group: "global.footer",
    gridColumn: "col-span-1",
    defaultValue: "Studio",
  },
  {
    key: "pink.global.footer-col2-links",
    label: "Footer Column 2 Links",
    description: "Links in the second footer column.",
    type: "list",
    page: "global",
    group: "global.footer",
    gridColumn: "col-span-full",
    maxItems: 8,
    itemSchema: [
      { key: "label", label: "Label", type: "text", placeholder: "Journal" },
      { key: "url", label: "URL", type: "url", placeholder: "/blog" },
    ],
    defaultValue: "",
  },
  // Copyright line is not a template field — it renders as
  // `© {year} {business.name}` directly, so it always matches Settings →
  // General instead of drifting out of sync with a separately-typed value.
  {
    key: "pink.global.footer-legal-links",
    label: "Footer Legal Links",
    description:
      "Extra links in the bottom strip of the footer. Your published Privacy Policy and Terms of Service are added automatically — list these only if you have more.",
    type: "list",
    page: "global",
    group: "global.footer",
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
  // One shared set for every custom page — there is no per-page override.
  {
    key: "pink.global.page-facts",
    label: "Page Header Facts",
    description:
      "One set of small label/value rows — e.g. 'Where / 8412 Main St' — shown in the dark header of every custom page, including your policy pages. Leave empty to hide.",
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
  // One shared sidebar for every custom page — there is no per-page override.
  {
    key: "pink.global.page-cta-heading",
    label: "Page Sidebar CTA Heading",
    description:
      "Boxed callout in the sidebar of every custom page. Leave blank to hide the whole box.",
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
      "Small line at the bottom of the sidebar on every custom page. Leave blank to hide.",
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
  {
    key: "pink.global.logo-size-width",
    label: "Logo Size Width",
    description:
      "Width (in pixels) of the logo on the sign-in and sign-up pages.",
    type: "number",
    page: "global",
    group: "global.authentication",
    gridColumn: "col-span-1",
    defaultValue: "80",
  },
  {
    key: "pink.global.logo-size-height",
    label: "Logo Size Height",
    description:
      "Height (in pixels) of the logo on the sign-in and sign-up pages.",
    type: "number",
    page: "global",
    group: "global.authentication",
    gridColumn: "col-span-1",
    defaultValue: "80",
  },
];

export const pinkGlobalFieldGroups: TemplateFieldGroup[] = [
  {
    id: "global.branding",
    title: "Wordmark",
    description:
      "The two-color wordmark in the header and footer is built from your business name in Settings → General, split on the accent word below — 'Pink' + 'Art'. Change the name there, and the wordmark follows.",
    icon: "🏷️",
    columns: 2,
  } satisfies TemplateFieldGroup,
  {
    id: "global.header",
    title: "Header",
    description:
      "The cart button at the right of the header. Nav labels and links are managed in Content → Navigation.",
    icon: "🧭",
    columns: 2,
  } satisfies TemplateFieldGroup,
  {
    id: "global.footer",
    title: "Footer",
    description:
      "The whole footer on every page: brand mark or logo, blurb, the two link columns, and the bottom strip. Social icons appear automatically from the links in Content → Branding, and the bottom strip already includes your published policy pages plus a copyright line built from Settings → General.",
    icon: "🔗",
    columns: 2,
  } satisfies TemplateFieldGroup,
  {
    id: "global.page-facts",
    title: "Custom Pages — Header Facts",
    description:
      "One shared set of label/value rows, rendered in the header of every custom CMS page (policy pages included) — not per page",
    icon: "📋",
    columns: 1,
  } satisfies TemplateFieldGroup,
  {
    id: "global.page-sidebar",
    title: "Custom Pages — Sidebar",
    description:
      "One shared callout box and contact note, rendered in the sidebar of every custom CMS page — not per page",
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
    title: "Wordmark",
    description:
      "The two-color wordmark in the header and footer, built from your business name in Settings → General and split on the accent word.",
    groupIds: ["global.branding"],
    order: 0,
    hideable: false,
    links: [
      { label: "Branding", href: "/admin/content/branding" },
      { label: "Business info", href: "/admin/settings/general" },
    ],
  },
  {
    id: "global.header",
    page: "global",
    title: "Header",
    description:
      "The cart button at the right of the header. Nav labels and links live in Content → Navigation.",
    groupIds: ["global.header"],
    order: 1,
    hideable: false,
    links: [
      { label: "Navigation", href: "/admin/content/navigation" },
      { label: "Business info", href: "/admin/settings/general" },
    ],
  },
  {
    id: "global.footer",
    page: "global",
    title: "Footer",
    description:
      "Brand mark, blurb, link columns, and the bottom strip — on every page. Social icons appear automatically from the links in Content → Branding, and the bottom strip already includes your published policy pages.",
    groupIds: ["global.footer"],
    order: 2,
    hideable: false,
    links: [
      { label: "Branding", href: "/admin/content/branding" },
      { label: "Business info", href: "/admin/settings/general" },
    ],
  },
  {
    id: "global.page-facts",
    page: "global",
    title: "Custom Pages — Header Facts",
    description:
      "One shared set of label/value rows, rendered in the header of every custom CMS page (policy pages included) — not per page.",
    groupIds: ["global.page-facts"],
    order: 3,
    hideable: true,
    defaultHidden: true,
  },
  {
    id: "global.page-sidebar",
    page: "global",
    title: "Custom Pages — Sidebar",
    description:
      "One shared callout box and contact note, rendered in the sidebar of every custom CMS page — not per page.",
    groupIds: ["global.page-sidebar"],
    order: 4,
    hideable: true,
  },
  {
    id: "global.authentication",
    page: "global",
    title: "Authentication",
    description: "Image shown on the sign-in and sign-up screens",
    groupIds: ["global.authentication"],
    order: 5,
    hideable: false,
  },
];
