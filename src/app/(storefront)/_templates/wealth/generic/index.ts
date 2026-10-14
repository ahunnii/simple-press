import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";

/**
 * Fields / groups / sections for wealth's GenericPage (the redesigned
 * content page: split hero, `.wealth-prose` body, closing forest band).
 *
 * The page body itself is CMS rich text, not template fields. What the
 * template owns is the chrome around it, and that chrome is shared by EVERY
 * content page, so the fields live on `page: "global"` (not a page key of
 * their own, which would not map to any editor preview route):
 *   - `global.page-hero`: the optional button in the hero panel
 *   - `global.page-cta`: the closing forest band (hideable)
 * Both are skipped on policy pages. The section ids equal the group ids and
 * the `data-sp-group` values rendered by wealth-generic-page.tsx.
 *
 * Do not import runtime values from `~/lib/template-fields` here: it
 * aggregates every template's root index.ts, which imports this module.
 */

export const WEALTH_PAGE_HERO_KEYS = {
  buttonLabel: "wealth.global.page-hero-button-label",
  buttonUrl: "wealth.global.page-hero-button-url",
} as const;

export const WEALTH_PAGE_CTA_KEYS = {
  heading: "wealth.global.page-cta-heading",
  body: "wealth.global.page-cta-body",
  buttonLabel: "wealth.global.page-cta-button-label",
  buttonUrl: "wealth.global.page-cta-button-url",
  image: "wealth.global.page-cta-image",
} as const;

export const wealthGenericData: TemplateField[] = [
  // ── global.page-hero ──────────────────────────────────────────────────────
  {
    key: WEALTH_PAGE_HERO_KEYS.buttonLabel,
    label: "Page header button label",
    description:
      "Optional button in the colored header panel of every content page (not policy pages). Leave blank to hide.",
    type: "text",
    page: "global",
    group: "global.page-hero",
    gridColumn: "col-span-1",
    defaultValue: "",
    placeholder: "A short call to action",
  },
  {
    key: WEALTH_PAGE_HERO_KEYS.buttonUrl,
    label: "Page header button link",
    description:
      "Where the page header button goes. Only used when the label above is filled in.",
    type: "url",
    page: "global",
    group: "global.page-hero",
    gridColumn: "col-span-1",
    defaultValue: "/contact",
    placeholder: "/contact or https://…",
  },

  // ── global.page-cta ───────────────────────────────────────────────────────
  {
    key: WEALTH_PAGE_CTA_KEYS.heading,
    label: "Closing banner heading",
    description:
      "The line in the colored banner at the bottom of every content page (not policy pages). Hide the whole banner with the eye icon.",
    type: "text",
    page: "global",
    group: "global.page-cta",
    gridColumn: "col-span-full",
    defaultValue: "Let's talk co-ops & community ownership.",
    placeholder: "One sentence that invites a next step",
  },
  {
    key: WEALTH_PAGE_CTA_KEYS.body,
    label: "Closing banner text",
    description:
      "Optional supporting sentence under the heading. Leave blank to hide.",
    type: "textarea",
    page: "global",
    group: "global.page-cta",
    gridColumn: "col-span-full",
    defaultValue: "",
    placeholder: "A line or two of context",
  },
  {
    key: WEALTH_PAGE_CTA_KEYS.buttonLabel,
    label: "Closing banner button label",
    description: "Text on the banner's button.",
    type: "text",
    page: "global",
    group: "global.page-cta",
    gridColumn: "col-span-1",
    defaultValue: "Book a consult",
    placeholder: "A short call to action",
  },
  {
    key: WEALTH_PAGE_CTA_KEYS.buttonUrl,
    label: "Closing banner button link",
    description: "Where the banner's button goes.",
    type: "url",
    page: "global",
    group: "global.page-cta",
    gridColumn: "col-span-1",
    defaultValue: "/contact",
    placeholder: "/contact or https://…",
  },
  {
    key: WEALTH_PAGE_CTA_KEYS.image,
    label: "Closing banner photo",
    description:
      "Optional photo shown faintly behind the banner (decorative, so it needs no description). Leave blank for a plain solid band.",
    type: "image",
    page: "global",
    group: "global.page-cta",
    gridColumn: "col-span-full",
    defaultValue: "",
  },
];

export const wealthGenericFieldGroups: TemplateFieldGroup[] = [
  {
    id: "global.page-hero",
    title: "Page Header Button",
    description:
      "Optional button in the header of every content page (the pages you create under Content → Pages)",
    icon: "🔘",
    columns: 2,
  },
  {
    id: "global.page-cta",
    title: "Closing Banner",
    description:
      "The call-to-action banner at the bottom of every content page (not shown on policy pages)",
    icon: "📣",
    columns: 2,
  },
];

export const wealthGenericSections: TemplateSection[] = [
  {
    id: "global.page-hero",
    page: "global",
    title: "Page Header Button",
    description: "Optional button in the colored header of every content page",
    groupIds: ["global.page-hero"],
    order: 2,
    hideable: false,
  },
  {
    id: "global.page-cta",
    page: "global",
    title: "Closing Banner",
    description:
      "Call-to-action banner at the bottom of every content page (policy pages never show it)",
    groupIds: ["global.page-cta"],
    order: 3,
    hideable: true,
  },
];
