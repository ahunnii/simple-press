import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";
import { SECTION_LINKS } from "~/lib/section-links";

/**
 * Global (chrome) fields for the `pink` template — header, footer,
 * announcement bar, and the shared chrome of the CMS generic page.
 *
 * Everything here is `page: "global"` so it is reachable from every page tab
 * in the visual editor. The generic page's chrome lives here too because the
 * `TemplatePage` union has no `generic` member (same convention as `coop`).
 *
 * The whole footer is ONE group/section (`global.footer`) — logo, tagline,
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
    label: "Accent word",
    description:
      "The part at the end of your business name shown in a second color — it can be more than one word. Leave blank to show the whole name in one color.",
    type: "text",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: "Art",
  },

  // ── global.header ────────────────────────────────────────────────────────
  // Nav labels/links are no longer template fields — they are managed in
  // Content → Navigation (`SiteContent.navigationItems`), like every other
  // template.
  {
    key: "pink.global.basket-label",
    label: "Cart button text",
    description:
      "The cart button at the right of the header, and the cart button in the mobile menu drawer.",
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
    label: "Show the drawn logo mark",
    description:
      "On: the footer shows the drawn PinkArt letterforms, recolored to stay readable on every page. Off: the footer shows the footer logo image below, then the logo from Content → Branding, then your business name as text.",
    type: "boolean",
    page: "global",
    group: "global.footer",
    gridColumn: "col-span-1",
    // Off by default since 2026-09-26 (pink cleanup): the drawn mark spells
    // one specific business's name, so a fresh store shows its own logo or
    // name instead. The original owner re-enables it here.
    defaultValue: "false",
  },
  {
    key: "pink.global.footer-logo",
    label: "Footer logo",
    description:
      "Used only when the logo mark above is off. Upload a version that reads well on a dark background — the footer is dark on every page except The Artist and blog posts. Leave blank to reuse the logo from Content → Branding.",
    type: "image",
    page: "global",
    group: "global.footer",
    gridColumn: "col-span-1",
    defaultValue: "",
    visibleWhen: { key: "pink.global.footer-brand-mark", equals: "false" },
  },
  // `pink.global.footer-blurb` was retired 2026-09-26 (pink cleanup): the
  // footer tagline now comes from Content → Branding (`SiteContent.footerText`).
  // A value saved before the move is still read as a silent fallback in
  // `pink-footer.tsx` — see `RETIRED_TEMPLATE_KEYS` in `~/lib/template-fields`.
  {
    key: "pink.global.footer-col1-title",
    label: "Column 1 title",
    description: "Small label above the first footer link column.",
    type: "text",
    page: "global",
    group: "global.footer",
    gridColumn: "col-span-1",
    defaultValue: "Shop",
  },
  {
    key: "pink.global.footer-col1-links",
    label: "Column 1 links",
    description:
      "Links in the first footer column. Leave empty and it shows Shop all, plus Collections and Services once those features are turned on.",
    type: "list",
    page: "global",
    group: "global.footer",
    gridColumn: "col-span-full",
    maxItems: 8,
    itemLabel: "link",
    itemSchema: [
      {
        key: "label",
        label: "Label",
        description: "Text on the link.",
        type: "text",
        placeholder: "Everything",
      },
      {
        key: "url",
        label: "URL",
        description: "Where the link goes.",
        type: "url",
        placeholder: "/shop",
      },
    ],
    defaultValue: "",
  },
  {
    key: "pink.global.footer-col2-title",
    label: "Column 2 title",
    description: "Small label above the second footer link column.",
    type: "text",
    page: "global",
    group: "global.footer",
    gridColumn: "col-span-1",
    defaultValue: "Studio",
  },
  {
    key: "pink.global.footer-col2-links",
    label: "Column 2 links",
    description:
      "Links in the second footer column. Content → Navigation's footer quick links take over this column when set. Otherwise, leave this empty and it shows About, plus Journal, Events, Videos and Testimonials once those features are turned on, then Contact.",
    type: "list",
    page: "global",
    group: "global.footer",
    gridColumn: "col-span-full",
    maxItems: 8,
    itemLabel: "link",
    itemSchema: [
      {
        key: "label",
        label: "Label",
        description: "Text on the link.",
        type: "text",
        placeholder: "Journal",
      },
      {
        key: "url",
        label: "URL",
        description: "Where the link goes.",
        type: "url",
        placeholder: "/blog",
      },
    ],
    defaultValue: "",
  },
  // Copyright line is not a template field — it renders as
  // `© {year} {business.name}` directly, so it always matches Settings →
  // General instead of drifting out of sync with a separately-typed value.
  {
    key: "pink.global.footer-legal-links",
    label: "Legal links",
    description:
      "Extra links in the bottom strip of the footer. Your published Privacy Policy and Terms of Service are added automatically — list these only if you have more.",
    type: "list",
    page: "global",
    group: "global.footer",
    gridColumn: "col-span-full",
    maxItems: 5,
    itemLabel: "link",
    itemSchema: [
      {
        key: "label",
        label: "Label",
        description: "Text on the link.",
        type: "text",
        placeholder: "Privacy",
      },
      {
        key: "url",
        label: "URL",
        description: "Where the link goes.",
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
    label: "Facts",
    description:
      "One set of small label/value rows — e.g. 'Where / 8412 Main St' — shown in the dark header of every custom page, including your policy pages. Leave empty to hide.",
    type: "list",
    page: "global",
    group: "global.page-facts",
    gridColumn: "col-span-full",
    maxItems: 4,
    itemLabel: "fact",
    itemSchema: [
      {
        key: "label",
        label: "Label",
        description: "The small label on the left of the row.",
        type: "text",
        placeholder: "Where",
      },
      {
        key: "value",
        label: "Value",
        description: "The text on the right of the row.",
        type: "text",
        placeholder: "The studio",
      },
    ],
    defaultValue: "",
  },

  // ── global.page-sidebar (CMS generic pages) ──────────────────────────────
  // One shared sidebar for every custom page — there is no per-page override.
  {
    key: "pink.global.page-cta-heading",
    label: "Heading",
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
    label: "Text",
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
    label: "Button text",
    description:
      "Text on the sidebar callout button. Leave blank to hide the button.",
    type: "text",
    page: "global",
    group: "global.page-sidebar",
    gridColumn: "col-span-1",
    defaultValue: "Ask about a make & take",
  },
  {
    key: "pink.global.page-cta-link",
    label: "Button link",
    description: "Where the sidebar button goes.",
    type: "url",
    page: "global",
    group: "global.page-sidebar",
    gridColumn: "col-span-1",
    defaultValue: "/contact",
  },
  {
    key: "pink.global.page-contact-note",
    label: "Contact note",
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
    label: "Image",
    description: "Image shown beside the sign-in and sign-up forms.",
    type: "image",
    page: "global",
    group: "global.authentication",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "pink.global.logo-size-width",
    label: "Logo width",
    description: "Width of the logo on the sign-in and sign-up screens.",
    type: "number",
    page: "global",
    group: "global.authentication",
    gridColumn: "col-span-1",
    defaultValue: "80",
    min: 24,
    max: 400,
    step: 1,
    unit: "px",
  },
  {
    key: "pink.global.logo-size-height",
    label: "Logo height",
    description: "Height of the logo on the sign-in and sign-up screens.",
    type: "number",
    page: "global",
    group: "global.authentication",
    gridColumn: "col-span-1",
    defaultValue: "80",
    min: 24,
    max: 400,
    step: 1,
    unit: "px",
  },
];

export const pinkGlobalFieldGroups: TemplateFieldGroup[] = [
  {
    id: "global.branding",
    title: "Wordmark",
    description:
      "The wordmark in the header and footer is built from your business name in Settings → General; the accent word below picks the part shown in a second color. Change the name there, and the wordmark follows.",
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
      "The whole footer on every page: logo, tagline, the two link columns, and the bottom strip. The tagline and social icons come from Content → Branding, and the bottom strip already includes your published policy pages plus a copyright line built from Settings → General.",
    icon: "🔗",
    columns: 2,
  } satisfies TemplateFieldGroup,
  {
    id: "global.page-facts",
    title: "Custom page facts",
    description:
      "One shared set of label/value rows, rendered in the header of every custom CMS page (policy pages included) — not per page",
    icon: "📋",
    columns: 1,
  } satisfies TemplateFieldGroup,
  {
    id: "global.page-sidebar",
    title: "Custom page sidebar",
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
    links: [SECTION_LINKS.branding, SECTION_LINKS.businessLocation],
  },
  {
    id: "global.header",
    page: "global",
    title: "Header",
    description:
      "The cart button at the right of the header. Nav labels and links live in Content → Navigation. The donate button can be shown, hidden, or relabeled in Settings → Donations.",
    groupIds: ["global.header"],
    order: 1,
    hideable: false,
    links: [
      { label: "Navigation", href: "/admin/content/navigation" },
      { label: "Business info", href: "/admin/settings/general" },
      SECTION_LINKS.donations,
    ],
  },
  {
    id: "global.footer",
    page: "global",
    title: "Footer",
    description:
      "Logo, tagline, link columns, and the bottom strip — on every page. The tagline and social icons come from Content → Branding, and the bottom strip already includes your published policy pages. The footer's donate link can be shown, hidden, or relabeled in Settings → Donations.",
    groupIds: ["global.footer"],
    order: 2,
    hideable: false,
    links: [
      SECTION_LINKS.branding,
      SECTION_LINKS.businessLocation,
      SECTION_LINKS.donations,
    ],
  },
  {
    id: "global.page-facts",
    page: "global",
    title: "Custom page facts",
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
    title: "Custom page sidebar",
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
