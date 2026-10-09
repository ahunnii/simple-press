import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";

/**
 * Services index (`/services`) fields, groups and sections for glove —
 * parity finding PF1 (package TP2, docs/templates/glove/parity-plan-2026-10-08.md).
 *
 * glove-owned `glove.services.*` keys (olive's pattern), not Default's
 * `default.services.*`: the page reads them through glove's own resolver.
 * Group ids follow `"<page>.<group>"` so field group, sections entry and the
 * rendered `data-sp-group` triple-match.
 *
 * The page component is NOT re-exported here (circular-import guard, same as
 * `olive/services/index.ts`): the registry imports `GloveServicesIndexPage`
 * directly from "./glove-services-index-page".
 */

// ─── services.hero ──────────────────────────────────────────────────────────
// Not hideable — the title band carries the page's only h1.

const servicesHeroData: TemplateField[] = [
  {
    key: "glove.services.hero-heading",
    label: "Heading",
    description:
      "Main heading in the title band at the top of the services page. Also names the page in the breadcrumb on every service.",
    type: "text",
    page: "services",
    group: "services.hero",
    gridColumn: "col-span-full",
    defaultValue: "Services",
    placeholder: "e.g. Book a Fitting",
  },
  {
    key: "glove.services.hero-subtitle",
    label: "Intro text",
    description: "One line under the heading. Leave blank to hide.",
    type: "textarea",
    page: "services",
    group: "services.hero",
    gridColumn: "col-span-full",
    defaultValue:
      "Personal fittings and custom design sessions for the special woman in your life.",
    placeholder: "One short sentence about what you offer",
  },
];

// ─── services.list ──────────────────────────────────────────────────────────
// Not hideable — the page's main content (the services come from Admin).

const servicesListData: TemplateField[] = [
  {
    key: "glove.services.list-card-link",
    label: "Card link text",
    description: "Link text at the bottom of every service card.",
    type: "text",
    page: "services",
    group: "services.list",
    gridColumn: "col-span-1",
    defaultValue: "View service",
    placeholder: "e.g. Learn more",
  },
  {
    key: "glove.services.list-empty-heading",
    label: "Empty state heading",
    description: "Shown in place of the cards while no services are published.",
    type: "text",
    page: "services",
    group: "services.list",
    gridColumn: "col-span-1",
    defaultValue: "No services just yet",
    placeholder: "e.g. Appointments open soon",
  },
  {
    key: "glove.services.list-empty-body",
    label: "Empty state message",
    description: "Line under the empty-state heading. Leave blank to hide.",
    type: "textarea",
    page: "services",
    group: "services.list",
    gridColumn: "col-span-full",
    defaultValue:
      "We're getting our appointments ready. Check back soon, or send us a note in the meantime.",
    placeholder: "One short sentence",
  },
];

// ─── services.cta ───────────────────────────────────────────────────────────
// Hideable closing banner.

const servicesCtaData: TemplateField[] = [
  {
    key: "glove.services.cta-heading",
    label: "Heading",
    description:
      "Heading of the closing banner at the bottom of the page. Leave blank to hide the banner.",
    type: "text",
    page: "services",
    group: "services.cta",
    gridColumn: "col-span-full",
    defaultValue: "Not sure which service is right?",
    placeholder: "e.g. Questions first?",
  },
  {
    key: "glove.services.cta-body",
    label: "Body text",
    description: "One line under the closing heading. Leave blank to hide.",
    type: "textarea",
    page: "services",
    group: "services.cta",
    gridColumn: "col-span-full",
    defaultValue:
      "Tell us what you have in mind and we'll help you find the perfect fit.",
    placeholder: "One short sentence",
  },
  {
    key: "glove.services.cta-button-label",
    label: "Button label",
    description: "Text on the closing banner's button.",
    type: "text",
    page: "services",
    group: "services.cta",
    gridColumn: "col-span-1",
    defaultValue: "Contact Us",
    placeholder: "e.g. Get in touch",
  },
  {
    key: "glove.services.cta-button-link",
    label: "Button link",
    description:
      "Where the closing banner's button goes, e.g. /contact. Leave blank to hide the button.",
    type: "url",
    page: "services",
    group: "services.cta",
    gridColumn: "col-span-1",
    defaultValue: "/contact",
    placeholder: "/contact",
  },
];

// ─── Aggregated exports ─────────────────────────────────────────────────────

export const gloveServicesData: TemplateField[] = [
  ...servicesHeroData,
  ...servicesListData,
  ...servicesCtaData,
];

export const gloveServicesFieldGroups: TemplateFieldGroup[] = [
  {
    id: "services.hero",
    title: "Page header",
    description: "Heading and intro line in the title band.",
    icon: "🧤",
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
      "Heading, line and button in the banner at the bottom of the page.",
    icon: "💌",
    columns: 2,
  },
];

export const gloveServicesSections: TemplateSection[] = [
  {
    id: "services.hero",
    page: "services",
    title: "Page header",
    description: "Heading and intro line in the title band",
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
    description: "Closing banner beneath the services",
    groupIds: ["services.cta"],
    order: 2,
    hideable: true,
  },
];
