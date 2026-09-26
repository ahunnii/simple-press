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
    label: "Heading",
    description: "Main heading at the top of the services page.",
    type: "text",
    page: "services",
    group: "services.header",
    gridColumn: "col-span-1",
    defaultValue: "Work with the studio",
  },
  {
    key: "pink.services.header-intro",
    label: "Intro text",
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
    label: "Badge text",
    description:
      "Corner badge on the featured service card — the one marked as your signature offering. Keep it neutral; it isn't a popularity claim.",
    type: "text",
    page: "services",
    group: "services.featured",
    gridColumn: "col-span-1",
    defaultValue: "Featured",
  },
  {
    key: "pink.services.featured-cta-label",
    label: "Button text",
    description:
      "Text shown as the link on the featured service card, pointing to its detail page.",
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
    label: "Heading suffix",
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
    label: "One-to-one badge text",
    description: "Badge shown on cards for one-to-one / private offerings.",
    type: "text",
    page: "services",
    group: "services.grid",
    gridColumn: "col-span-1",
    defaultValue: "One-to-one",
  },
  {
    key: "pink.services.audience-group-label",
    label: "Group badge text",
    description: "Badge shown on cards for group offerings.",
    type: "text",
    page: "services",
    group: "services.grid",
    gridColumn: "col-span-1",
    defaultValue: "Group",
  },
  {
    key: "pink.services.grid-empty-heading",
    label: "Empty list heading",
    description: "Shown when no services are published yet.",
    type: "text",
    page: "services",
    group: "services.grid",
    gridColumn: "col-span-full",
    defaultValue: "Nothing listed yet",
  },
  {
    key: "pink.services.grid-empty-body",
    label: "Empty list body",
    description: "One or two lines under the empty-list heading.",
    type: "textarea",
    page: "services",
    group: "services.grid",
    gridColumn: "col-span-full",
    defaultValue:
      "Make & takes are booked by enquiry. Send a note with your group and your room, and we'll take it from there.",
  },
  {
    key: "pink.services.grid-empty-cta-label",
    label: "Empty list button text",
    description: "Leave blank to hide the button.",
    type: "text",
    page: "services",
    group: "services.grid",
    gridColumn: "col-span-1",
    defaultValue: "Ask about a date",
  },
  {
    key: "pink.services.grid-empty-cta-link",
    label: "Empty list button link",
    description: "Where the empty-list button goes.",
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
    label: "Heading",
    description: "Heading for the how-it-works band.",
    type: "text",
    page: "services",
    group: "services.steps",
    gridColumn: "col-span-1",
    defaultValue: "How a make & take comes together",
  },
  {
    key: "pink.services.steps-note",
    label: "Note",
    description: "Short line beside the heading.",
    type: "text",
    page: "services",
    group: "services.steps",
    gridColumn: "col-span-1",
    defaultValue: "Four steps, start to finish.",
  },
  {
    key: "pink.services.steps-list",
    label: "Steps",
    description:
      "Up to four steps in the how-it-works band, each with a step number, title and short description. Falls back to built-in steps when left empty.",
    type: "list",
    page: "services",
    group: "services.steps",
    gridColumn: "col-span-full",
    maxItems: 4,
    itemLabel: "step",
    defaultsWhenEmpty: true,
    itemSchema: [
      {
        key: "ordinal",
        label: "Step number",
        type: "text",
        placeholder: "01",
        description: "Two-digit step number, e.g. 01.",
      },
      {
        key: "title",
        label: "Title",
        type: "text",
        placeholder: "You reach out",
        description: "Short title for this step.",
      },
      {
        key: "body",
        label: "Body",
        type: "textarea",
        description: "One or two sentences describing this step.",
      },
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
    label: "Heading",
    description: "Heading in the closing panel at the bottom of the page.",
    type: "text",
    page: "services",
    group: "services.cta",
    gridColumn: "col-span-1",
    defaultValue: "Let's find a date.",
  },
  {
    key: "pink.services.cta-body",
    label: "Body text",
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
    label: "Primary button text",
    type: "text",
    page: "services",
    group: "services.cta",
    gridColumn: "col-span-1",
    defaultValue: "Ask about a date",
    description: "Text on the closing panel's primary button.",
  },
  {
    key: "pink.services.cta-primary-link",
    label: "Primary button link",
    type: "url",
    page: "services",
    group: "services.cta",
    gridColumn: "col-span-1",
    defaultValue: "/contact",
    description: "Where the primary button goes.",
  },
  {
    key: "pink.services.cta-secondary-label",
    label: "Secondary button text",
    description: "Leave blank to hide the second button.",
    type: "text",
    page: "services",
    group: "services.cta",
    gridColumn: "col-span-1",
    defaultValue: "See finished pieces",
  },
  {
    key: "pink.services.cta-secondary-link",
    label: "Secondary button link",
    type: "url",
    page: "services",
    group: "services.cta",
    gridColumn: "col-span-1",
    defaultValue: "/shop",
    description: "Where the secondary button goes.",
  },
  {
    key: "pink.services.cta-image-1",
    label: "Image 1",
    description:
      "Left image in the closing panel's image pair. Leave both images blank to run the panel as text only.",
    type: "image",
    page: "services",
    group: "services.cta",
    gridColumn: "col-span-1",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "pink.services.cta-image-2",
    label: "Image 2",
    description:
      "Right image in the closing panel's image pair. Leave both images blank to run the panel as text only.",
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
    title: "Header",
    description: "Heading and intro text at the top of the services page.",
    icon: "🧵",
    columns: 2,
  },
  {
    id: "services.featured",
    title: "Featured service",
    description:
      "Badge and button text for the card built from the service you've marked as your signature offering.",
    icon: "⭐",
    columns: 2,
  },
  {
    id: "services.grid",
    title: "Services grid",
    description:
      "Heading suffix, badge text, and the empty-list copy for the grid of published services.",
    icon: "🗂️",
    columns: 2,
  },
  {
    id: "services.steps",
    title: "How it works",
    description: "Heading, note, and up to four steps in the how-it-works band.",
    icon: "🪡",
    columns: 1,
  },
  {
    id: "services.cta",
    title: "Closing banner",
    description:
      "Heading, body, two buttons, and an optional image pair for the closing panel at the bottom of the page.",
    icon: "📣",
    columns: 2,
  },
];

export const pinkServicesSections: TemplateSection[] = [
  {
    id: "services.header",
    page: "services",
    title: "Header",
    description: "Heading and intro text at the top of the services page.",
    groupIds: ["services.header"],
    order: 0,
    hideable: false,
  },
  {
    id: "services.featured",
    page: "services",
    title: "Featured service",
    description: "Card for your signature service.",
    groupIds: ["services.featured"],
    order: 1,
    hideable: true,
  },
  {
    id: "services.grid",
    page: "services",
    title: "Services grid",
    description: "The filterable grid of every published service.",
    groupIds: ["services.grid"],
    order: 2,
    hideable: false,
  },
  {
    id: "services.steps",
    page: "services",
    title: "How it works",
    description: "Up to four steps explaining how it works.",
    groupIds: ["services.steps"],
    order: 3,
    hideable: true,
  },
  {
    id: "services.cta",
    page: "services",
    title: "Closing banner",
    description: "Closing panel with an optional image pair.",
    groupIds: ["services.cta"],
    order: 4,
    hideable: true,
  },
];
