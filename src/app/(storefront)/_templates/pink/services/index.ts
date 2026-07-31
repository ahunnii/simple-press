import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";

/**
 * Services index page (`/services`) fields for the `pink` template.
 *
 * Authority: docs/templates/pink/design.md → "Per-page section concepts →
 * Services index". Individual service *detail* pages (`pink-table`) are a
 * separate mechanism — see `./service-pages/fields.ts` — their fields live
 * on `Service.customFields`, not here.
 */

// ── services.header ──────────────────────────────────────────────────────

const servicesHeaderData: TemplateField[] = [
  {
    key: "pink.services.header-heading",
    label: "Header Heading",
    description: "The H1 for the services index page.",
    type: "text",
    page: "services",
    group: "services.header",
    gridColumn: "col-span-1",
    defaultValue: "Work with the studio",
  },
  {
    key: "pink.services.header-intro",
    label: "Header Intro",
    description: "One or two sentences under the heading.",
    type: "textarea",
    page: "services",
    group: "services.header",
    gridColumn: "col-span-full",
    defaultValue:
      "Bring a make & take into your classroom, sanctuary, library, break room or back yard. Or order a doll made just for you.",
  },
];

// ── services.featured ────────────────────────────────────────────────────

const servicesFeaturedData: TemplateField[] = [
  {
    key: "pink.services.featured-badge",
    label: "Featured Badge Label",
    description:
      "Corner badge on the featured service card (the one marked as your signature offering). Keep it neutral — it is not a popularity claim.",
    type: "text",
    page: "services",
    group: "services.featured",
    gridColumn: "col-span-1",
    defaultValue: "Featured",
  },
  {
    key: "pink.services.featured-cta-label",
    label: "Featured CTA Label",
    description: "Link text on the featured card.",
    type: "text",
    page: "services",
    group: "services.featured",
    gridColumn: "col-span-1",
    defaultValue: "See how it works →",
  },
];

// ── services.grid ────────────────────────────────────────────────────────

const servicesGridData: TemplateField[] = [
  {
    key: "pink.services.grid-heading-suffix",
    label: "Grid Heading",
    description:
      "Shown after the live count, e.g. '6 ways to work together'. Enter just the part after the number.",
    type: "text",
    page: "services",
    group: "services.grid",
    gridColumn: "col-span-1",
    defaultValue: "ways to work together",
  },
  {
    key: "pink.services.audience-one-label",
    label: "One-to-One Badge Label",
    description: "Badge shown on cards for one-to-one / private offerings.",
    type: "text",
    page: "services",
    group: "services.grid",
    gridColumn: "col-span-1",
    defaultValue: "One-to-one",
  },
  {
    key: "pink.services.audience-group-label",
    label: "Group Badge Label",
    description: "Badge shown on cards for group offerings.",
    type: "text",
    page: "services",
    group: "services.grid",
    gridColumn: "col-span-1",
    defaultValue: "Group",
  },
  {
    key: "pink.services.grid-empty-heading",
    label: "Empty State Heading",
    description: "Shown when no services are published yet.",
    type: "text",
    page: "services",
    group: "services.grid",
    gridColumn: "col-span-full",
    defaultValue: "Nothing listed yet",
  },
  {
    key: "pink.services.grid-empty-body",
    label: "Empty State Body",
    description: "One or two lines under the empty-state heading.",
    type: "textarea",
    page: "services",
    group: "services.grid",
    gridColumn: "col-span-full",
    defaultValue:
      "Make & takes are booked by enquiry. Send a note with your group and your room, and we'll take it from there.",
  },
  {
    key: "pink.services.grid-empty-cta-label",
    label: "Empty State Button Text",
    description: "Leave blank to hide the button.",
    type: "text",
    page: "services",
    group: "services.grid",
    gridColumn: "col-span-1",
    defaultValue: "Ask about a date",
  },
  {
    key: "pink.services.grid-empty-cta-link",
    label: "Empty State Button Link",
    description: "Where the empty-state button goes.",
    type: "url",
    page: "services",
    group: "services.grid",
    gridColumn: "col-span-1",
    defaultValue: "/contact",
  },
];

// ── services.steps ───────────────────────────────────────────────────────

const servicesStepsData: TemplateField[] = [
  {
    key: "pink.services.steps-heading",
    label: "Steps Heading",
    description: "Heading for the 'how it works' band.",
    type: "text",
    page: "services",
    group: "services.steps",
    gridColumn: "col-span-1",
    defaultValue: "How a make & take comes together",
  },
  {
    key: "pink.services.steps-note",
    label: "Steps Note",
    description: "Short muted line beside the heading.",
    type: "text",
    page: "services",
    group: "services.steps",
    gridColumn: "col-span-1",
    defaultValue: "Four steps, start to finish.",
  },
  {
    key: "pink.services.steps-list",
    label: "Steps",
    description: "Up to four ordinal + title + body cells.",
    type: "list",
    page: "services",
    group: "services.steps",
    gridColumn: "col-span-full",
    maxItems: 4,
    itemSchema: [
      { key: "ordinal", label: "Ordinal", type: "text", placeholder: "01" },
      {
        key: "title",
        label: "Title",
        type: "text",
        placeholder: "You reach out",
      },
      { key: "body", label: "Body", type: "textarea" },
    ],
    defaultValue: JSON.stringify([
      {
        ordinal: "01",
        title: "You reach out",
        body: "Tell us the room — a classroom, a sanctuary, a break room, a back yard — and how many hands.",
      },
      {
        ordinal: "02",
        title: "We pick a project",
        body: "Something that fits the time you have and travels well.",
      },
      {
        ordinal: "03",
        title: "Materials show up",
        body: "Everything's cut, sorted and ready before anyone sits down.",
      },
      {
        ordinal: "04",
        title: "Everyone leaves with something",
        body: "Sewn, glued or knotted by their own hands.",
      },
    ]),
  },
];

// ── services.cta ─────────────────────────────────────────────────────────

const servicesCtaData: TemplateField[] = [
  {
    key: "pink.services.cta-heading",
    label: "CTA Heading",
    description: "Closing call-to-action heading.",
    type: "text",
    page: "services",
    group: "services.cta",
    gridColumn: "col-span-1",
    defaultValue: "Let's find a date.",
  },
  {
    key: "pink.services.cta-body",
    label: "CTA Body",
    description: "One or two sentences under the heading.",
    type: "textarea",
    page: "services",
    group: "services.cta",
    gridColumn: "col-span-full",
    defaultValue:
      "Ask about a make & take for your school, church, library, workplace or back yard. Materials, timing and group size all flex to fit the room.",
  },
  {
    key: "pink.services.cta-primary-label",
    label: "Primary Button Text",
    type: "text",
    page: "services",
    group: "services.cta",
    gridColumn: "col-span-1",
    defaultValue: "Ask about a date",
    description: "Primary CTA button label.",
  },
  {
    key: "pink.services.cta-primary-link",
    label: "Primary Button Link",
    type: "url",
    page: "services",
    group: "services.cta",
    gridColumn: "col-span-1",
    defaultValue: "/contact",
    description: "Primary CTA button destination.",
  },
  {
    key: "pink.services.cta-secondary-label",
    label: "Secondary Button Text",
    description: "Leave blank to hide the second button.",
    type: "text",
    page: "services",
    group: "services.cta",
    gridColumn: "col-span-1",
    defaultValue: "See finished pieces",
  },
  {
    key: "pink.services.cta-secondary-link",
    label: "Secondary Button Link",
    type: "url",
    page: "services",
    group: "services.cta",
    gridColumn: "col-span-1",
    defaultValue: "/shop",
    description: "Secondary CTA button destination.",
  },
  {
    key: "pink.services.cta-image-1",
    label: "CTA Image 1",
    description: "Left image in the closing CTA's 2-up pair.",
    type: "image",
    page: "services",
    group: "services.cta",
    gridColumn: "col-span-1",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "pink.services.cta-image-2",
    label: "CTA Image 2",
    description: "Right image in the closing CTA's 2-up pair.",
    type: "image",
    page: "services",
    group: "services.cta",
    gridColumn: "col-span-1",
    defaultValue: "/placeholder.svg",
  },
];

// ── Exports ───────────────────────────────────────────────────────────────

export const pinkServicesData: TemplateField[] = [
  ...servicesHeaderData,
  ...servicesFeaturedData,
  ...servicesGridData,
  ...servicesStepsData,
  ...servicesCtaData,
];

export const pinkServicesFieldGroups: TemplateFieldGroup[] = [
  {
    id: "services.header",
    title: "Services Header",
    description: "Eyebrow, heading, intro and stat tiles",
    icon: "🧵",
    columns: 2,
  },
  {
    id: "services.featured",
    title: "Featured Service",
    description:
      "Badge and link text for the card sourced from your signature ServiceItem",
    icon: "⭐",
    columns: 2,
  },
  {
    id: "services.grid",
    title: "Services Grid",
    description:
      "Heading suffix, audience badge labels, and the empty-state copy",
    icon: "🗂️",
    columns: 2,
  },
  {
    id: "services.steps",
    title: "How It Works",
    description: "Heading, note, and up to four numbered steps",
    icon: "🪡",
    columns: 1,
  },
  {
    id: "services.cta",
    title: "Closing Call to Action",
    description: "Eyebrow, heading, body, two buttons and a 2-up image pair",
    icon: "📣",
    columns: 2,
  },
];

export const pinkServicesSections: TemplateSection[] = [
  {
    id: "services.header",
    page: "services",
    title: "Services Header",
    description: "Eyebrow, heading, intro and stat tiles",
    groupIds: ["services.header"],
    order: 0,
    hideable: false,
  },
  {
    id: "services.featured",
    page: "services",
    title: "Featured Service",
    description: "Card for your signature ServiceItem",
    groupIds: ["services.featured"],
    order: 1,
    hideable: true,
  },
  {
    id: "services.grid",
    page: "services",
    title: "Services Grid",
    description: "The filterable grid of every published service",
    groupIds: ["services.grid"],
    order: 2,
    hideable: false,
  },
  {
    id: "services.steps",
    page: "services",
    title: "How It Works",
    description: "Four-step process band",
    groupIds: ["services.steps"],
    order: 3,
    hideable: true,
  },
  {
    id: "services.cta",
    page: "services",
    title: "Closing Call to Action",
    description: "Closing CTA panel with a 2-up image pair",
    groupIds: ["services.cta"],
    order: 4,
    hideable: true,
  },
];
