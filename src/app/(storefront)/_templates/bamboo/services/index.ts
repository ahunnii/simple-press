import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";

/**
 * Services index page (`/services`) fields for the `bamboo` template.
 *
 * Ported per docs/templates/bamboo/parity-plan-2026-09-27.md finding PF16
 * (package TP6) from the sibling storefront's `services/index.ts` — same
 * group-id convention: `"<page>.<group>"`, not prefixed with the template
 * id — this is what makes the sectionGroupAttr/fieldAttr/isSectionVisible
 * triple match `sections.ts` and the rendered `data-sp-group` attribute.
 *
 * NOTE: the page component is deliberately NOT re-exported here (circular-
 * import guard — same reasoning as the reference source and
 * `dream/services/index.ts`). The registry imports
 * `BambooServicesIndexPage` directly from
 * "./bamboo-services-index-page".
 *
 * Visual identity diverges from the reference source's split "page shelf"
 * header on purpose: the index page opens on the shared
 * `shared/bamboo-page-hero.tsx` arch-portrait band
 * (docs/templates/bamboo/design.md signature moment #5), so the hero fields
 * below map onto that component's props (eyebrow/title/lede/image/bgImage)
 * rather than the reference source's own hero shape.
 */

// ─── services.hero ──────────────────────────────────────────────────────────
// Not hideable — this is the page's sole <h1> and its lead-in copy.

const servicesHeroData: TemplateField[] = [
  {
    key: "bamboo.services.hero-tagline",
    label: "Small label",
    description: "Short text above the heading. Leave blank to hide.",
    type: "text",
    page: "services",
    group: "services.hero",
    gridColumn: "col-span-1",
    defaultValue: "What We Offer",
    placeholder: "What We Offer",
  },
  {
    key: "bamboo.services.hero-heading",
    label: "Heading",
    description: "Main heading at the top of the services page.",
    type: "text",
    page: "services",
    group: "services.hero",
    gridColumn: "col-span-1",
    defaultValue: "Our Services",
    placeholder: "Our Services",
  },
  {
    key: "bamboo.services.hero-intro",
    label: "Intro text",
    description: "Paragraph below the heading. Leave blank to hide.",
    type: "textarea",
    page: "services",
    group: "services.hero",
    gridColumn: "col-span-full",
    defaultValue:
      "Thoughtful services from our Detroit team, delivered with the same purpose and care behind every roll we make.",
    placeholder: "Thoughtful services from our team...",
  },
  {
    key: "bamboo.services.hero-image",
    label: "Portrait photo",
    description:
      "Arch-framed portrait photo shown beside the heading and intro text.",
    type: "image",
    page: "services",
    group: "services.hero",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "bamboo.services.hero-bg-image",
    label: "Background image override",
    description:
      "Overrides the site-wide Page Hero Background for this page only. Blank = use the site-wide image, or the flat band if none is set.",
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
    key: "bamboo.services.list-heading",
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
    key: "bamboo.services.card-link-text",
    label: "Card link text",
    description: "Label for the link on each service card.",
    type: "text",
    page: "services",
    group: "services.list",
    gridColumn: "col-span-1",
    defaultValue: "Learn More",
    placeholder: "Learn More",
  },
  {
    key: "bamboo.services.empty-heading",
    label: "Empty state heading",
    description:
      "Shown in place of the grid when no services are published yet.",
    type: "text",
    page: "services",
    group: "services.list",
    gridColumn: "col-span-1",
    defaultValue: "Services Coming Soon",
    placeholder: "Services Coming Soon",
  },
  {
    key: "bamboo.services.empty-body",
    label: "Empty state message",
    description: "Line below the empty-state heading. Leave blank to hide.",
    type: "textarea",
    page: "services",
    group: "services.list",
    gridColumn: "col-span-full",
    defaultValue:
      "We're putting together something special — check back soon.",
    placeholder: "We're putting together something special...",
  },
  {
    key: "bamboo.services.empty-button-text",
    label: "Empty state button text",
    description:
      "Label for the button in the empty state, linking to your contact page.",
    type: "text",
    page: "services",
    group: "services.list",
    gridColumn: "col-span-1",
    defaultValue: "Get in Touch",
    placeholder: "Get in Touch",
  },
];

// ─── services.cta ───────────────────────────────────────────────────────────

const servicesCtaData: TemplateField[] = [
  {
    key: "bamboo.services.cta-heading",
    label: "Heading",
    description: "Heading for the closing banner at the bottom of the page.",
    type: "text",
    page: "services",
    group: "services.cta",
    gridColumn: "col-span-full",
    defaultValue: "Not Sure Which Service Fits?",
    placeholder: "Not Sure Which Service Fits?",
  },
  {
    key: "bamboo.services.cta-body",
    label: "Body text",
    description: "Paragraph below the heading. Leave blank to hide.",
    type: "textarea",
    page: "services",
    group: "services.cta",
    gridColumn: "col-span-full",
    defaultValue:
      "Reach out and our team will help you find the right fit for your family.",
    placeholder: "Reach out and we'll help you find the right fit...",
  },
  {
    key: "bamboo.services.cta-button-text",
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
    key: "bamboo.services.cta-button-link",
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

export const bambooServicesData: TemplateField[] = [
  ...servicesHeroData,
  ...servicesListData,
  ...servicesCtaData,
];

export const bambooServicesFieldGroups: TemplateFieldGroup[] = [
  {
    id: "services.hero",
    title: "Page header",
    description:
      "Small label, heading, intro text, and portrait photo at the top of the services page.",
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

export const bambooServicesSections: TemplateSection[] = [
  {
    id: "services.hero",
    page: "services",
    title: "Page header",
    description:
      "Small label, heading, intro, and portrait photo at the top of the page.",
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
