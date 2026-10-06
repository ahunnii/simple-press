import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";

import { DREAM_QUOTE_HREF } from "../shared/dream-quote-href";

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

/**
 * Built-in package-idea rows — the single source for both the
 * `dream.services.packages` field's `defaultRows` and the services index
 * page's render fallback when the saved list is empty
 * (`dream-services-index-page.tsx`). Row shape matches the field's
 * `itemSchema` (`includes` is one item per line).
 */
export const DREAM_PACKAGES_DEFAULT_ROWS: Record<string, string>[] = [
  {
    name: "Essence",
    tagline: "A simple, elegant start.",
    includes: "1 panel\n3 colors\n2 layers\n2 tie backs",
    note: "",
  },
  {
    name: "Deluxe",
    tagline: "Full and finished with a theme.",
    includes: "1 panel\nA theme\n3–5 colors\n2 layers\n2 tie backs\nValance",
    note: "",
  },
  {
    name: "Premium",
    tagline: "Deluxe, plus a throne chair moment.",
    includes: "Deluxe package\n2 panels\nThrone chair",
    note: "",
  },
  {
    name: "Lavish",
    tagline: "Up to 50 guests.",
    includes:
      "Deluxe package\nChair cover & sash\nTablecloths for guest tables",
    note: "",
  },
  {
    name: "Yasss!",
    tagline: "Big, bright, and ready to celebrate.",
    includes:
      "Backdrop of your choice\nBalloon garland (select up to 3 balloon colors)\nThrone chair (silver with silver trim)\nGift table(s)\nGift table decorations",
    note: "",
  },
];

// ─── services.hero ──────────────────────────────────────────────────────────
// Not hideable — this is the page's sole <h1> and its lead-in copy.

const servicesHeroData: TemplateField[] = [
  {
    key: "dream.services.hero-heading",
    label: "Heading",
    description: "The page's H1, shown before the highlighted word.",
    type: "text",
    page: "services",
    group: "services.hero",
    gridColumn: "col-span-1",
    defaultValue: "Decor, rentals, and",
  },
  {
    key: "dream.services.hero-accent",
    label: "Highlighted word",
    description:
      "One script-styled word after the heading. Never more than one word.",
    type: "text",
    page: "services",
    group: "services.hero",
    gridColumn: "col-span-1",
    defaultValue: "draping",
  },
  {
    key: "dream.services.hero-lede",
    label: "Intro",
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
    label: "See details link label",
    description: "Label for the link at the end of each service row.",
    type: "text",
    page: "services",
    group: "services.lanes",
    gridColumn: "col-span-1",
    defaultValue: "See details",
  },
  {
    key: "dream.services.lanes-empty-heading",
    label: "Empty state heading",
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
    label: "Empty state message",
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
    label: "Empty state button label",
    description: "Label for the empty-state button.",
    type: "text",
    page: "services",
    group: "services.lanes",
    gridColumn: "col-span-1",
    defaultValue: "Request an Estimate Quote",
  },
  {
    key: "dream.services.lanes-empty-cta-url",
    label: "Empty state button link",
    description: "Where the empty-state button links to.",
    type: "url",
    page: "services",
    group: "services.lanes",
    gridColumn: "col-span-1",
    defaultValue: DREAM_QUOTE_HREF,
  },
];

// ─── services.packages ──────────────────────────────────────────────────────

const servicesPackagesData: TemplateField[] = [
  {
    key: "dream.services.packages-heading",
    label: "Heading",
    description: "Heading above the package ideas grid.",
    type: "text",
    page: "services",
    group: "services.packages",
    gridColumn: "col-span-1",
    defaultValue: "Package ideas",
  },
  {
    key: "dream.services.packages-lede",
    label: "Intro",
    description: "Short line under the packages heading.",
    type: "textarea",
    page: "services",
    group: "services.packages",
    gridColumn: "col-span-full",
    defaultValue:
      "Every event is different — these are starting points Selest can dress up or down for your day. Packages are customized to your theme; delivery, setup, and teardown are quoted separately. We also drape event halls, back yards, tents and garages — you name it, we drape it!",
  },
  {
    key: "dream.services.packages",
    label: "Package ideas",
    description:
      "Up to 6 package cards. Includes are entered one per line. No prices — inquiries only.",
    type: "list",
    page: "services",
    group: "services.packages",
    gridColumn: "col-span-full",
    maxItems: 6,
    itemLabel: "package",
    summaryKey: "name",
    itemSchema: [
      {
        key: "name",
        label: "Name",
        type: "text",
        description: "Name of the package.",
        placeholder: "e.g. Essence",
      },
      {
        key: "tagline",
        label: "Tagline",
        type: "text",
        description: "Short line shown under the package name.",
        optional: true,
        placeholder: "e.g. A simple, elegant start.",
      },
      {
        key: "includes",
        label: "Includes (one per line)",
        type: "textarea",
        description: "What's included in the package, one item per line.",
        placeholder: "1 panel\n3 colors\n2 layers\n2 tie backs",
      },
      {
        key: "note",
        label: "Note",
        type: "text",
        description:
          "Short note shown under the package, e.g. an inquiry disclaimer.",
        optional: true,
        placeholder:
          "Inquiry-only; delivery, setup, and teardown quoted separately.",
      },
    ],
    defaultsWhenEmpty: true,
    defaultRows: DREAM_PACKAGES_DEFAULT_ROWS,
  },
];

// ─── services.cta ───────────────────────────────────────────────────────────

const servicesCtaData: TemplateField[] = [
  {
    key: "dream.services.cta-heading",
    label: "Heading",
    description: "Heading shown before the highlighted word.",
    type: "text",
    page: "services",
    group: "services.cta",
    gridColumn: "col-span-1",
    defaultValue: "Request an",
  },
  {
    key: "dream.services.cta-accent",
    label: "Highlighted word",
    description: "Script-styled word after the heading.",
    type: "text",
    page: "services",
    group: "services.cta",
    gridColumn: "col-span-1",
    defaultValue: "Estimate Quote",
  },
  {
    key: "dream.services.cta-lede",
    label: "Intro",
    description: "Short line under this section's heading.",
    type: "textarea",
    page: "services",
    group: "services.cta",
    gridColumn: "col-span-full",
    defaultValue:
      "Tell Selest about your event and she'll help you choose the right lanes, packages, and rentals.",
  },
  {
    key: "dream.services.cta-label",
    label: "Button label",
    description: "Label for this section's button.",
    type: "text",
    page: "services",
    group: "services.cta",
    gridColumn: "col-span-1",
    defaultValue: "Request an Estimate Quote",
  },
  {
    key: "dream.services.cta-url",
    label: "Button link",
    description: "Where this section's button links to.",
    type: "url",
    page: "services",
    group: "services.cta",
    gridColumn: "col-span-1",
    defaultValue: DREAM_QUOTE_HREF,
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
    title: "Page header",
    description: "Page heading, highlighted word, and intro.",
    icon: "☁️",
    columns: 2,
  },
  {
    id: "services.lanes",
    title: "Services",
    description:
      "Alternating rows, one per published service. Designed empty-state copy shown when none are published.",
    icon: "🎀",
    columns: 2,
  },
  {
    id: "services.packages",
    title: "Package ideas",
    description:
      "Heading, intro, and up to 6 package cards — no prices, inquiry-only.",
    icon: "🎁",
    columns: 2,
  },
  {
    id: "services.cta",
    title: "Closing banner",
    description:
      "Quiet closing heading, intro, and button beneath the packages.",
    icon: "💌",
    columns: 2,
  },
];

export const dreamServicesSections: TemplateSection[] = [
  {
    id: "services.hero",
    page: "services",
    title: "Page header",
    description: "Page heading, intro, and logo over the hero background.",
    groupIds: ["services.hero"],
    order: 0,
    hideable: false,
  },
  {
    id: "services.lanes",
    page: "services",
    title: "Services",
    description:
      "The alternating row for every published service, or its empty state.",
    groupIds: ["services.lanes"],
    order: 1,
    hideable: false,
  },
  {
    id: "services.packages",
    page: "services",
    title: "Package ideas",
    description: "Grid of package cards beneath the service lanes.",
    groupIds: ["services.packages"],
    order: 2,
    hideable: true,
  },
  {
    id: "services.cta",
    page: "services",
    title: "Closing banner",
    description: "Quote request band beneath the packages.",
    groupIds: ["services.cta"],
    order: 3,
    hideable: true,
  },
];

// NOTE: the page component is deliberately NOT re-exported here (circular-
// import guard — same reasoning as wealth/services/index.ts). The registry
// imports `DreamServicesIndexPage` directly from "./dream-services-index-page".
