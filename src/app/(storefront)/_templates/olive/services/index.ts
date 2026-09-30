import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";

/**
 * Services index (`/services`) fields for olive — parity finding PF11
 * (package TP5, docs/templates/olive/parity-plan-2026-09-28.md).
 *
 * Group ids follow the `"<page>.<group>"` convention (never prefixed with
 * the template id) so field group, `sections.ts` entry and the rendered
 * `data-sp-group` triple-match.
 *
 * The page component is NOT re-exported here (circular-import guard, same as
 * `bamboo/services/index.ts`): the registry imports `OliveServicesIndexPage`
 * directly from "./olive-services-index-page".
 */

// ─── services.hero ──────────────────────────────────────────────────────────
// Not hideable — it carries the page's only h1.

const servicesHeroData: TemplateField[] = [
  {
    key: "olive.services.hero-heading",
    label: "Heading",
    description: "Page title at the top of the services page.",
    type: "text",
    page: "services",
    group: "services.hero",
    gridColumn: "col-span-full",
    defaultValue: "Services",
    placeholder: "e.g. Book a fitting",
  },
  {
    key: "olive.services.hero-body",
    label: "Intro text",
    description:
      "One short paragraph under the page title. Leave blank to hide.",
    type: "textarea",
    page: "services",
    group: "services.hero",
    gridColumn: "col-span-full",
    defaultValue:
      "Fittings, alterations and one-on-one styling — book a little time with us.",
    placeholder: "One or two sentences about what you offer",
  },
  {
    key: "olive.services.hero-image",
    label: "Photo",
    description:
      "Optional photo across the top of the page, with the title on a card over it. Leave as the placeholder to show a plain title band instead.",
    type: "image",
    page: "services",
    group: "services.hero",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },
];

// ─── services.list ──────────────────────────────────────────────────────────
// Not hideable — the page's main content (the services come from Admin).

const servicesListData: TemplateField[] = [
  {
    key: "olive.services.card-link-label",
    label: "Card link text",
    description: "Small link at the bottom of every service card.",
    type: "text",
    page: "services",
    group: "services.list",
    gridColumn: "col-span-1",
    defaultValue: "See the details",
    placeholder: "e.g. Learn more",
  },
  {
    key: "olive.services.empty-heading",
    label: "Empty state heading",
    description: "Shown in place of the cards while no services are published.",
    type: "text",
    page: "services",
    group: "services.list",
    gridColumn: "col-span-1",
    defaultValue: "Nothing to book just yet.",
    placeholder: "e.g. Appointments open soon",
  },
  {
    key: "olive.services.empty-body",
    label: "Empty state message",
    description: "Line under the empty-state heading. Leave blank to hide.",
    type: "textarea",
    page: "services",
    group: "services.list",
    gridColumn: "col-span-full",
    defaultValue:
      "We're setting up appointments. Check back soon, or send us a note in the meantime.",
    placeholder: "One short sentence",
  },
];

// ─── services.cta ───────────────────────────────────────────────────────────
// Hideable closing band.

const servicesCtaData: TemplateField[] = [
  {
    key: "olive.services.cta-heading",
    label: "Heading",
    description: "Heading of the closing band at the bottom of the page.",
    type: "text",
    page: "services",
    group: "services.cta",
    gridColumn: "col-span-full",
    defaultValue: "Not sure what to book?",
    placeholder: "e.g. Questions first?",
  },
  {
    key: "olive.services.cta-body",
    label: "Body text",
    description: "One line under the closing heading. Leave blank to hide.",
    type: "textarea",
    page: "services",
    group: "services.cta",
    gridColumn: "col-span-full",
    defaultValue:
      "Tell us what you have in mind and we'll point you to the right appointment.",
    placeholder: "One short sentence",
  },
  {
    key: "olive.services.cta-button-label",
    label: "Button label",
    description: "Text on the closing band's button.",
    type: "text",
    page: "services",
    group: "services.cta",
    gridColumn: "col-span-1",
    defaultValue: "Send us a note",
    placeholder: "e.g. Get in touch",
  },
  {
    key: "olive.services.cta-button-link",
    label: "Button link",
    description:
      "Where the closing band's button goes, e.g. /contact. Leave blank to hide the button.",
    type: "url",
    page: "services",
    group: "services.cta",
    gridColumn: "col-span-1",
    defaultValue: "/contact",
    placeholder: "/contact",
  },
];

// ─── Aggregated exports ─────────────────────────────────────────────────────

export const oliveServicesData: TemplateField[] = [
  ...servicesHeroData,
  ...servicesListData,
  ...servicesCtaData,
];

export const oliveServicesFieldGroups: TemplateFieldGroup[] = [
  {
    id: "services.hero",
    title: "Page header",
    description: "Title, intro text and optional photo at the top of the page.",
    icon: "🪡",
    columns: 1,
  },
  {
    id: "services.list",
    title: "Services",
    description:
      "Card link text and the empty state shown while no services are published.",
    icon: "🗓️",
    columns: 2,
  },
  {
    id: "services.cta",
    title: "Closing banner",
    description:
      "Heading, line and button in the band at the bottom of the page.",
    icon: "💬",
    columns: 2,
  },
];

export const oliveServicesSections: TemplateSection[] = [
  {
    id: "services.hero",
    page: "services",
    title: "Page header",
    description: "Title, intro text and optional photo",
    groupIds: ["services.hero"],
    order: 0,
    hideable: false,
  },
  {
    id: "services.list",
    page: "services",
    title: "Services",
    description: "A card for every published service, or the empty state",
    groupIds: ["services.list"],
    order: 1,
    hideable: false,
  },
  {
    id: "services.cta",
    page: "services",
    title: "Closing banner",
    description: "Closing band beneath the services",
    groupIds: ["services.cta"],
    order: 2,
    hideable: true,
  },
];
