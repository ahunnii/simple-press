import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";

/**
 * Services index page (`/services`) fields for the `dream` template.
 *
 * Authority: docs/templates/dream/design.md → "Per-page section concepts →
 * Services index". Individual service *detail* pages (dream-lane /
 * dream-package) are a separate mechanism — see `./service-pages/fields.ts`
 * — their fields live on `Service.customFields`, not here.
 *
 * Group-id convention: `"<page>.<group>"`, not prefixed with the template
 * id — this is what makes the sectionGroupAttr/fieldAttr/isSectionVisible
 * triple match `sections.ts` and the rendered `data-sp-group` attribute
 * (mirrors `wealth/services/index.ts` / `pink/services/index.ts`).
 */

// ─── services.hero ──────────────────────────────────────────────────────────
// Not hideable — this is the page's sole <h1> and its lead-in copy.

const servicesHeroData: TemplateField[] = [
  {
    key: "dream.services.hero-heading",
    label: "Hero Heading",
    description: "The page's H1, shown before the script accent word.",
    type: "text",
    page: "services",
    group: "services.hero",
    gridColumn: "col-span-1",
    defaultValue: "Decor, rentals, and",
  },
  {
    key: "dream.services.hero-accent",
    label: "Hero Accent Word",
    description:
      "One script word rendered in rose after the heading (design.md: never more than one accent per heading).",
    type: "text",
    page: "services",
    group: "services.hero",
    gridColumn: "col-span-1",
    defaultValue: "draping",
  },
  {
    key: "dream.services.hero-lede",
    label: "Hero Lede",
    description: "Short line under the hero heading.",
    type: "textarea",
    page: "services",
    group: "services.hero",
    gridColumn: "col-span-full",
    defaultValue:
      "Explore each service below, then send Selest your event details for an Estimate Quote.",
  },
];

// ─── services.lanes ─────────────────────────────────────────────────────────

const servicesLanesData: TemplateField[] = [
  {
    key: "dream.services.lanes-see-details-label",
    label: '"See Details" Link Label',
    description: "Label for the link at the end of each service row.",
    type: "text",
    page: "services",
    group: "services.lanes",
    gridColumn: "col-span-1",
    defaultValue: "See details",
  },
  {
    key: "dream.services.lanes-empty-heading",
    label: "Empty State Heading",
    description:
      "Shown in place of the service list when nothing is published yet.",
    type: "text",
    page: "services",
    group: "services.lanes",
    gridColumn: "col-span-1",
    defaultValue: "Selest is updating her services",
  },
  {
    key: "dream.services.lanes-empty-body",
    label: "Empty State Body",
    description: "Short line under the empty-state heading.",
    type: "textarea",
    page: "services",
    group: "services.lanes",
    gridColumn: "col-span-full",
    defaultValue:
      "Check back soon, or send over your event details and she'll help you find the right fit.",
  },
  {
    key: "dream.services.lanes-empty-cta-label",
    label: "Empty State Button Label",
    description: "Label for the empty-state button.",
    type: "text",
    page: "services",
    group: "services.lanes",
    gridColumn: "col-span-1",
    defaultValue: "Request an Estimate Quote",
  },
  {
    key: "dream.services.lanes-empty-cta-url",
    label: "Empty State Button Link",
    description: "Where the empty-state button links to.",
    type: "url",
    page: "services",
    group: "services.lanes",
    gridColumn: "col-span-1",
    defaultValue: "/contact",
  },
];

// ─── services.packages ──────────────────────────────────────────────────────

const servicesPackagesData: TemplateField[] = [
  {
    key: "dream.services.packages-heading",
    label: "Packages Heading",
    description: "Heading above the package ideas grid.",
    type: "text",
    page: "services",
    group: "services.packages",
    gridColumn: "col-span-1",
    defaultValue: "Package ideas",
  },
  {
    key: "dream.services.packages-lede",
    label: "Packages Lede",
    description: "Short line under the packages heading.",
    type: "textarea",
    page: "services",
    group: "services.packages",
    gridColumn: "col-span-full",
    defaultValue:
      "Every event is different — these are starting points Selest can dress up or down for your day.",
  },
  {
    key: "dream.services.packages",
    label: "Package Ideas",
    description:
      "Up to 6 package cards. Includes are entered one per line. No prices — inquiries only.",
    type: "list",
    page: "services",
    group: "services.packages",
    gridColumn: "col-span-full",
    maxItems: 6,
    itemSchema: [
      { key: "name", label: "Name", type: "text", placeholder: "e.g. Essence" },
      {
        key: "tagline",
        label: "Tagline",
        type: "text",
        placeholder: "e.g. A simple, elegant start.",
      },
      {
        key: "includes",
        label: "Includes (one per line)",
        type: "textarea",
        placeholder: "1 panel\n3 colors\n2 layers\n2 tie backs",
      },
      {
        key: "note",
        label: "Note",
        type: "text",
        placeholder:
          "Inquiry-only; delivery, setup, and teardown quoted separately.",
      },
    ],
    defaultValue: JSON.stringify([
      {
        name: "Essence",
        tagline: "A simple, elegant start.",
        includes: "1 panel\n3 colors\n2 layers\n2 tie backs",
        note: "Inquiry-only; delivery, setup, and teardown quoted separately.",
      },
      {
        name: "Deluxe",
        tagline: "Full and finished with a theme.",
        includes: "1 panel\na theme\n3–5 colors\nvalance",
        note: "Inquiry-only; delivery, setup, and teardown quoted separately.",
      },
      {
        name: "Premium",
        tagline: "Deluxe, plus a throne chair moment.",
        includes: "Deluxe package\n2 panels\nthrone chair",
        note: "Inquiry-only; delivery, setup, and teardown quoted separately.",
      },
      {
        name: "Lavish",
        tagline: "Dressed for a full guest list.",
        includes: "up to 50 guests\nchair covers\ntable cloths",
        note: "Inquiry-only; delivery, setup, and teardown quoted separately.",
      },
      {
        name: "Yasss!",
        tagline: "Big, bright, and ready to celebrate.",
        includes: "backdrop\nballoon garland\nthrone chair\ngift tables",
        note: "Inquiry-only; delivery, setup, and teardown quoted separately.",
      },
    ]),
  },
];

// ─── services.cta ───────────────────────────────────────────────────────────

const servicesCtaData: TemplateField[] = [
  {
    key: "dream.services.cta-heading",
    label: "Closing CTA Heading",
    description: "Heading shown before the script accent word.",
    type: "text",
    page: "services",
    group: "services.cta",
    gridColumn: "col-span-1",
    defaultValue: "Request an",
  },
  {
    key: "dream.services.cta-accent",
    label: "Closing CTA Accent Word",
    description: "Script word rendered in rose after the heading.",
    type: "text",
    page: "services",
    group: "services.cta",
    gridColumn: "col-span-1",
    defaultValue: "Estimate Quote",
  },
  {
    key: "dream.services.cta-lede",
    label: "Closing CTA Lede",
    description: "Short line under the closing CTA heading.",
    type: "textarea",
    page: "services",
    group: "services.cta",
    gridColumn: "col-span-full",
    defaultValue:
      "Tell Selest about your event and she'll help you choose the right lanes, packages, and rentals.",
  },
  {
    key: "dream.services.cta-label",
    label: "Closing CTA Button Label",
    description: "Label for the closing CTA button.",
    type: "text",
    page: "services",
    group: "services.cta",
    gridColumn: "col-span-1",
    defaultValue: "Request an Estimate Quote",
  },
  {
    key: "dream.services.cta-url",
    label: "Closing CTA Button URL",
    description: "Where the closing CTA button links to.",
    type: "url",
    page: "services",
    group: "services.cta",
    gridColumn: "col-span-1",
    defaultValue: "/contact",
  },
];

// ─── Aggregated exports ─────────────────────────────────────────────────────

export const dreamServicesData: TemplateField[] = [
  ...servicesHeroData,
  ...servicesLanesData,
  ...servicesPackagesData,
  ...servicesCtaData,
];

export const dreamServicesFieldGroups: TemplateFieldGroup[] = [
  {
    id: "services.hero",
    title: "Hero",
    description: "Page heading, script accent, and lede.",
    icon: "☁️",
    columns: 2,
  },
  {
    id: "services.lanes",
    title: "Service Lanes",
    description:
      "Alternating rows, one per published service. Designed empty-state copy shown when none are published.",
    icon: "🎀",
    columns: 2,
  },
  {
    id: "services.packages",
    title: "Package Ideas",
    description:
      "Heading, lede, and up to 6 package cards — no prices, inquiry-only.",
    icon: "🎁",
    columns: 2,
  },
  {
    id: "services.cta",
    title: "Closing Call to Action",
    description:
      "Quiet closing heading, lede, and button beneath the packages.",
    icon: "💌",
    columns: 2,
  },
];

export const dreamServicesSections: TemplateSection[] = [
  {
    id: "services.hero",
    page: "services",
    title: "Hero",
    description: "Page heading, lede, and logo over the sky.",
    groupIds: ["services.hero"],
    order: 0,
    hideable: false,
  },
  {
    id: "services.lanes",
    page: "services",
    title: "Service Lanes",
    description:
      "The alternating row for every published service, or its empty state.",
    groupIds: ["services.lanes"],
    order: 1,
    hideable: false,
  },
  {
    id: "services.packages",
    page: "services",
    title: "Package Ideas",
    description: "Grid of package cards beneath the service lanes.",
    groupIds: ["services.packages"],
    order: 2,
    hideable: true,
  },
  {
    id: "services.cta",
    page: "services",
    title: "Closing Call to Action",
    description: "Estimate Quote band beneath the packages.",
    groupIds: ["services.cta"],
    order: 3,
    hideable: true,
  },
];

// NOTE: the page component is deliberately NOT re-exported here (circular-
// import guard — same reasoning as wealth/services/index.ts). The registry
// imports `DreamServicesIndexPage` directly from "./dream-services-index-page".
