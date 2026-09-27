import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";

/**
 * Services index page (`/services`) fields for the `happy-bamboo` template.
 *
 * Group-id convention: `"<page>.<group>"`, not prefixed with the template
 * id — this is what makes the sectionGroupAttr/fieldAttr/isSectionVisible
 * triple match `sections.ts` and the rendered `data-sp-group` attribute
 * (mirrors `dream/services/index.ts`).
 *
 * NOTE: the page component is deliberately NOT re-exported here (circular-
 * import guard — same reasoning as `dream/services/index.ts`). The registry
 * imports `HappyBambooServicesIndexPage` directly from
 * "./happy-bamboo-services-index-page".
 */

// ─── services.hero ──────────────────────────────────────────────────────────
// Not hideable — this is the page's sole <h1> and its lead-in copy.

const servicesHeroData: TemplateField[] = [
  {
    key: "happy-bamboo.services.hero-small-label",
    label: "Small label",
    description: "Short text above the heading. Leave blank to hide.",
    type: "text",
    page: "services",
    group: "services.hero",
    gridColumn: "col-span-full",
    defaultValue: "What We Offer",
    placeholder: "What We Offer",
  },
  {
    key: "happy-bamboo.services.hero-heading",
    label: "Heading",
    description: "Main heading at the top of the services page.",
    type: "text",
    page: "services",
    group: "services.hero",
    gridColumn: "col-span-full",
    defaultValue: "Our Services",
    placeholder: "Our Services",
  },
  {
    key: "happy-bamboo.services.hero-intro",
    label: "Intro text",
    description: "Paragraph below the heading. Leave blank to hide.",
    type: "textarea",
    page: "services",
    group: "services.hero",
    gridColumn: "col-span-full",
    defaultValue:
      "Thoughtful services from the Happy Bamboo team, crafted with the same care as our products.",
    placeholder: "Thoughtful services from the Happy Bamboo team...",
  },
  {
    key: "happy-bamboo.services.hero-image",
    label: "Photo",
    description:
      "Photo beside the heading and intro text. Leave blank to hide the image column and let the text span the full width.",
    type: "image",
    page: "services",
    group: "services.hero",
    gridColumn: "col-span-full",
    defaultValue: "",
  },
];

// ─── services.list ──────────────────────────────────────────────────────────
// Not hideable — this is the page's main content.

const servicesListData: TemplateField[] = [
  {
    key: "happy-bamboo.services.list-heading",
    label: "Heading",
    description: "Heading above the grid of services.",
    type: "text",
    page: "services",
    group: "services.list",
    gridColumn: "col-span-full",
    defaultValue: "All Services",
    placeholder: "All Services",
  },
  {
    key: "happy-bamboo.services.card-link-text",
    label: "Card link text",
    description: "Label for the link on each service card.",
    type: "text",
    page: "services",
    group: "services.list",
    gridColumn: "col-span-1",
    defaultValue: "Learn more",
    placeholder: "Learn more",
  },
  {
    key: "happy-bamboo.services.empty-heading",
    label: "Empty state heading",
    description:
      "Shown in place of the grid when no services are published yet.",
    type: "text",
    page: "services",
    group: "services.list",
    gridColumn: "col-span-1",
    defaultValue: "Services coming soon",
    placeholder: "Services coming soon",
  },
  {
    key: "happy-bamboo.services.empty-body",
    label: "Empty state message",
    description: "Line below the empty-state heading. Leave blank to hide.",
    type: "textarea",
    page: "services",
    group: "services.list",
    gridColumn: "col-span-full",
    defaultValue: "We're putting together something special — check back soon.",
    placeholder: "We're putting together something special...",
  },
  {
    key: "happy-bamboo.services.empty-button-text",
    label: "Empty state button text",
    description:
      "Label for the button in the empty state, linking to your contact page.",
    type: "text",
    page: "services",
    group: "services.list",
    gridColumn: "col-span-1",
    defaultValue: "Get in touch",
    placeholder: "Get in touch",
  },
];

// ─── services.cta ───────────────────────────────────────────────────────────

const servicesCtaData: TemplateField[] = [
  {
    key: "happy-bamboo.services.cta-heading",
    label: "Heading",
    description: "Heading for the closing banner at the bottom of the page.",
    type: "text",
    page: "services",
    group: "services.cta",
    gridColumn: "col-span-full",
    defaultValue: "Not sure which service fits?",
    placeholder: "Not sure which service fits?",
  },
  {
    key: "happy-bamboo.services.cta-body",
    label: "Body text",
    description: "Paragraph below the heading. Leave blank to hide.",
    type: "textarea",
    page: "services",
    group: "services.cta",
    gridColumn: "col-span-full",
    defaultValue:
      "Reach out and we'll help you find the right fit for your needs.",
    placeholder: "Reach out and we'll help you find the right fit...",
  },
  {
    key: "happy-bamboo.services.cta-button-text",
    label: "Button text",
    description: "Label for the button, e.g. Contact Us.",
    type: "text",
    page: "services",
    group: "services.cta",
    gridColumn: "col-span-1",
    defaultValue: "Contact Us",
    placeholder: "Contact Us",
  },
  {
    key: "happy-bamboo.services.cta-button-link",
    label: "Button link",
    description: "Where the button goes, e.g. /contact.",
    type: "url",
    page: "services",
    group: "services.cta",
    gridColumn: "col-span-1",
    defaultValue: "/contact",
    placeholder: "/contact",
  },
];

// ─── Aggregated exports ─────────────────────────────────────────────────────

export const happyBambooServicesData: TemplateField[] = [
  ...servicesHeroData,
  ...servicesListData,
  ...servicesCtaData,
];

export const happyBambooServicesFieldGroups: TemplateFieldGroup[] = [
  {
    id: "services.hero",
    title: "Page header",
    description:
      "Small label, heading, intro text, and photo at the top of the services page.",
    icon: "🛠️",
    columns: 2,
  },
  {
    id: "services.list",
    title: "Services",
    description:
      "Heading above the grid, card link label, and empty-state copy shown when no services are published yet.",
    icon: "✨",
    columns: 2,
  },
  {
    id: "services.cta",
    title: "Closing banner",
    description: "Heading, body text, and button beneath the services grid.",
    icon: "📣",
    columns: 2,
  },
];

export const happyBambooServicesSections: TemplateSection[] = [
  {
    id: "services.hero",
    page: "services",
    title: "Page header",
    description:
      "Small label, heading, intro, and photo at the top of the page.",
    groupIds: ["services.hero"],
    order: 0,
    hideable: false,
  },
  {
    id: "services.list",
    page: "services",
    title: "Services",
    description: "The grid of every published service, or its empty state.",
    groupIds: ["services.list"],
    order: 1,
    hideable: false,
  },
  {
    id: "services.cta",
    page: "services",
    title: "Closing banner",
    description: "Closing band beneath the services grid.",
    groupIds: ["services.cta"],
    order: 2,
    hideable: true,
  },
];
