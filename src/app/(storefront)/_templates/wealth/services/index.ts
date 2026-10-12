import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";

/**
 * Services index page (`/services`, the "Programs" landing) fields for the
 * `wealth` template.
 *
 * Authority: docs/templates/wealth/design.md → "Inner pages — REDESIGN pass 2
 * → Programs (ServicesIndexPage)". Individual service *detail*
 * pages (wealth-essay / wealth-program) are a separate mechanism — see
 * `./service-pages/fields.ts` — their fields live on `Service.customFields`,
 * not here.
 *
 * Group-id convention follows `pink/services/index.ts` (the most current
 * Tier-5 reference): `"<page>.<group>"`, NOT prefixed with the template id —
 * this is what makes the sectionGroupAttr/fieldAttr/isSectionVisible triple
 * match `sections.ts` and the rendered `data-sp-group` attribute. (vii's own
 * services/index.ts predates this convention and uses `"vii.services.hero"`
 * — do not copy that part of vii; pink is the one to mirror here.)
 */

// ── services.hero ────────────────────────────────────────────────────────
// Not hideable — this is the page's sole <h1> and its lead-in copy.

const servicesHeroData: TemplateField[] = [
  {
    key: "wealth.services.hero-heading",
    label: "Hero Heading",
    description: "The page's main heading, shown large at the top of the page.",
    type: "text",
    page: "services",
    group: "services.hero",
    gridColumn: "col-span-1",
    defaultValue: "Our Programs",
  },
  {
    key: "wealth.services.hero-intro",
    label: "Hero Intro",
    description: "Short italic paragraph shown beneath the heading.",
    type: "textarea",
    page: "services",
    group: "services.hero",
    gridColumn: "col-span-full",
    defaultValue:
      "We provide non-extractive financing for start-ups, existing businesses, and for ownership transitions. We also run ongoing workshops and an annual Co-op Incubator, and opportunities for co-ops to build community with one another.",
  },
  {
    key: "wealth.services.hero-leadin",
    label: "Hero Lead-in",
    description:
      "Centered intro line above the program cards. Wrap words in **double asterisks** to bold them. Leave blank to hide.",
    type: "textarea",
    page: "services",
    group: "services.hero",
    gridColumn: "col-span-full",
    defaultValue: "Learn more about each program below.",
  },
  {
    key: "wealth.services.hero-image",
    label: "Hero Image",
    description:
      "Optional photo beside the heading. Leave blank for a full-width plain color panel.",
    type: "image",
    page: "services",
    group: "services.hero",
    gridColumn: "col-span-full",
    defaultValue: "",
  },
  {
    key: "wealth.services.hero-image-alt",
    label: "Hero Image Alt Text",
    description:
      "Describes the hero image for screen readers. Only used when a hero image is set.",
    type: "text",
    page: "services",
    group: "services.hero",
    gridColumn: "col-span-full",
    defaultValue: "",
    placeholder: "e.g. Members of a co-op at work",
  },
];

// ── services.grid ────────────────────────────────────────────────────────

const servicesGridData: TemplateField[] = [
  {
    key: "wealth.services.grid-empty-message",
    label: "Empty State Message",
    description:
      "Shown in place of the program cards when no programs are published yet.",
    type: "textarea",
    page: "services",
    group: "services.grid",
    gridColumn: "col-span-full",
    defaultValue: "Programs are being updated — contact us to learn more.",
  },
  {
    key: "wealth.services.grid-empty-cta-label",
    label: "Empty State Button Text",
    description: "Link shown beneath the empty-state message.",
    type: "text",
    page: "services",
    group: "services.grid",
    gridColumn: "col-span-1",
    defaultValue: "Contact us",
  },
  {
    key: "wealth.services.grid-empty-cta-url",
    label: "Empty State Button Link",
    description: "Where the empty-state link goes.",
    type: "url",
    page: "services",
    group: "services.grid",
    gridColumn: "col-span-1",
    defaultValue: "/contact",
  },
];

// ── services.cta ─────────────────────────────────────────────────────────

const servicesCtaData: TemplateField[] = [
  {
    key: "wealth.services.cta-heading",
    label: "Closing CTA Heading",
    description: "Closing line in the band beneath the program cards.",
    type: "text",
    page: "services",
    group: "services.cta",
    gridColumn: "col-span-1",
    defaultValue: "Have a question about a program?",
  },
  {
    key: "wealth.services.cta-label",
    label: "Closing CTA Button Label",
    description: "Label for the closing CTA button.",
    type: "text",
    page: "services",
    group: "services.cta",
    gridColumn: "col-span-1",
    defaultValue: "Contact us",
  },
  {
    key: "wealth.services.cta-url",
    label: "Closing CTA Button URL",
    description: "Where the closing CTA button links to.",
    type: "url",
    page: "services",
    group: "services.cta",
    gridColumn: "col-span-1",
    defaultValue: "/contact",
  },
];

// ── Aggregated exports ───────────────────────────────────────────────────

export const wealthServicesData: TemplateField[] = [
  ...servicesHeroData,
  ...servicesGridData,
  ...servicesCtaData,
];

export const wealthServicesFieldGroups: TemplateFieldGroup[] = [
  {
    id: "services.hero",
    title: "Hero",
    description:
      "Page heading, intro paragraph, optional hero image and the centered lead-in above the program cards.",
    icon: "🌱",
    columns: 2,
  },
  {
    id: "services.grid",
    title: "Program Cards",
    description:
      "One solid color card per published program, driven by your Services. Empty-state copy shown when none are published.",
    icon: "🗂️",
    columns: 1,
  },
  {
    id: "services.cta",
    title: "Closing Call to Action",
    description: "Closing heading and button band beneath the program cards.",
    icon: "📞",
    columns: 2,
  },
];

export const wealthServicesSections: TemplateSection[] = [
  {
    id: "services.hero",
    page: "services",
    title: "Hero",
    description: "Page heading, intro copy, optional photo and lead-in.",
    groupIds: ["services.hero"],
    order: 0,
    hideable: false,
  },
  {
    id: "services.grid",
    page: "services",
    title: "Program Cards",
    description: "A card for every published program, or its empty state.",
    groupIds: ["services.grid"],
    order: 1,
    hideable: false,
  },
  {
    id: "services.cta",
    page: "services",
    title: "Closing Call to Action",
    description: "Closing band with a heading and button beneath the cards.",
    groupIds: ["services.cta"],
    order: 2,
    hideable: true,
  },
];

// NOTE: the page component is deliberately NOT re-exported here. This module
// is imported by the template's root index.ts and sections.ts (field/section
// data only); re-exporting the component would pull the component graph —
// which imports `resolveFields` from ".." — into that evaluation and create
// a circular-import TDZ crash (wealthServicesSections undefined at spread
// time, seen via src/lib/sp-meta.ts import order). The registry imports
// `WealthServicesIndexPage` directly from "./wealth-services-index-page".
