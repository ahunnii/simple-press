import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";
import { SECTION_LINKS } from "~/lib/section-links";

/**
 * Field / group / section module for the `pink` template's Testimonials
 * page.
 *
 * Authority: docs/templates/pink/design.md → "Per-page section concepts →
 * Testimonials". Testimonial content itself (`testimonials.featured`,
 * `testimonials.grid`) is DB-driven via `api.testimonial.list`, not fields
 * — the `Testimonial` model has no `category`/`rating`/`featured` column,
 * so the grid's category chips are derived from `source` ("customer" vs.
 * "owner") and the featured card is simply the first record returned.
 */

// ── testimonials.header ──────────────────────────────────────────────────────

const testimonialsHeaderData: TemplateField[] = [
  {
    key: "pink.testimonials.header-heading",
    label: "Heading",
    type: "text",
    page: "testimonials",
    group: "testimonials.header",
    gridColumn: "col-span-full",
    description: "Main heading at the top of the testimonials page.",
    defaultValue: "What people say",
  },
  {
    key: "pink.testimonials.header-intro",
    label: "Intro text",
    type: "textarea",
    page: "testimonials",
    group: "testimonials.header",
    gridColumn: "col-span-full",
    description: "One or two sentences under the heading.",
    defaultValue:
      "People who've bought a piece, booked a make & take, or ordered something custom — in their own words.",
  },
];

// ── testimonials.featured ────────────────────────────────────────────────────

const testimonialsFeaturedData: TemplateField[] = [
  {
    key: "pink.testimonials.featured-link-label",
    label: "Link text",
    type: "text",
    page: "testimonials",
    group: "testimonials.featured",
    gridColumn: "col-span-1",
    description:
      "Text for the link under the featured quote card, built from your most recent testimonial. Leave blank to hide the link.",
    defaultValue: "Read more notes →",
  },
];

// ── testimonials.grid ─────────────────────────────────────────────────────────

const testimonialsGridData: TemplateField[] = [
  {
    key: "pink.testimonials.grid-heading-suffix",
    label: "Heading suffix",
    description: "Appended after the live count, e.g. '12 notes back'.",
    type: "text",
    page: "testimonials",
    group: "testimonials.grid",
    gridColumn: "col-span-1",
    defaultValue: "notes back",
  },
  {
    key: "pink.testimonials.grid-filter-all-label",
    label: "All filter text",
    description: "Label for the filter chip that shows every note.",
    type: "text",
    page: "testimonials",
    group: "testimonials.grid",
    gridColumn: "col-span-1",
    defaultValue: "All",
  },
  {
    key: "pink.testimonials.grid-filter-keeper-label",
    label: "Customer filter text",
    description: "Label for the filter chip showing customer-submitted notes.",
    type: "text",
    page: "testimonials",
    group: "testimonials.grid",
    gridColumn: "col-span-1",
    defaultValue: "From customers",
  },
  {
    key: "pink.testimonials.grid-filter-studio-label",
    label: "Studio filter text",
    description:
      "Label for the filter chip showing owner-added notes. Only shown when at least one exists.",
    type: "text",
    page: "testimonials",
    group: "testimonials.grid",
    gridColumn: "col-span-1",
    defaultValue: "From the studio",
  },
  {
    key: "pink.testimonials.grid-empty-heading",
    label: "Empty list heading",
    description: "Shown when there are no testimonials yet.",
    type: "text",
    page: "testimonials",
    group: "testimonials.grid",
    gridColumn: "col-span-1",
    defaultValue: "No notes yet",
  },
  {
    key: "pink.testimonials.grid-empty-body",
    label: "Empty list body",
    description: "Supporting line under the empty-list heading.",
    type: "textarea",
    page: "testimonials",
    group: "testimonials.grid",
    gridColumn: "col-span-full",
    defaultValue: "Be the first to write one after your piece arrives.",
  },
];

// ── testimonials.press ───────────────────────────────────────────────────────

const testimonialsPressData: TemplateField[] = [
  {
    key: "pink.testimonials.press-heading",
    label: "Heading",
    description: "Heading over the press band.",
    type: "text",
    page: "testimonials",
    group: "testimonials.press",
    gridColumn: "col-span-1",
    defaultValue: "As seen",
  },
  {
    key: "pink.testimonials.press-note",
    label: "Note",
    description: "Supporting line beside the heading.",
    type: "textarea",
    page: "testimonials",
    group: "testimonials.press",
    gridColumn: "col-span-1",
    defaultValue: "A few write-ups, for the record.",
  },
  {
    key: "pink.testimonials.press-items",
    label: "Press mentions",
    description:
      "Up to 4 press mentions. Ships empty — the whole band stays hidden until you add a real one.",
    type: "list",
    page: "testimonials",
    group: "testimonials.press",
    gridColumn: "col-span-full",
    maxItems: 4,
    itemLabel: "press mention",
    itemSchema: [
      {
        key: "outlet",
        label: "Outlet",
        type: "text",
        placeholder: "Local Makers Weekly",
        description: "Name of the publication or site that mentioned you.",
      },
      {
        key: "date",
        label: "Date",
        type: "text",
        placeholder: "March 2024",
        description: "When it ran.",
        optional: true,
      },
      {
        key: "quote",
        label: "Quote",
        type: "textarea",
        placeholder: "A short excerpt from the piece.",
        description: "Short excerpt from the piece.",
      },
      {
        key: "href",
        label: "Link",
        type: "url",
        placeholder: "https://…",
        description: "Where the mention links, if it's online.",
        optional: true,
      },
    ],
    defaultValue: "",
  },
];

// ── testimonials.cta ─────────────────────────────────────────────────────────

const testimonialsCtaData: TemplateField[] = [
  {
    key: "pink.testimonials.cta-heading",
    label: "Heading",
    description: "Heading for the closing panel.",
    type: "text",
    page: "testimonials",
    group: "testimonials.cta",
    gridColumn: "col-span-full",
    defaultValue: "Tell us how it's holding up",
  },
  {
    key: "pink.testimonials.cta-body",
    label: "Body text",
    description: "Supporting line under the heading.",
    type: "textarea",
    page: "testimonials",
    group: "testimonials.cta",
    gridColumn: "col-span-full",
    defaultValue:
      "We read every note. The honest ones are how we know what to keep making.",
  },
  {
    key: "pink.testimonials.cta-button-label",
    label: "Button text",
    description: "Leave blank to hide the button.",
    type: "text",
    page: "testimonials",
    group: "testimonials.cta",
    gridColumn: "col-span-1",
    defaultValue: "Write in",
  },
  {
    key: "pink.testimonials.cta-button-link",
    label: "Button link",
    description:
      "Where the closing button goes — defaults to the shared testimonial submission page.",
    type: "url",
    page: "testimonials",
    group: "testimonials.cta",
    gridColumn: "col-span-1",
    defaultValue: "/testimonials/submit",
  },
];

// ── Aggregated export ────────────────────────────────────────────────────────

export const pinkTestimonialsData: TemplateField[] = [
  ...testimonialsHeaderData,
  ...testimonialsFeaturedData,
  ...testimonialsGridData,
  ...testimonialsPressData,
  ...testimonialsCtaData,
];

export const pinkTestimonialsFieldGroups: TemplateFieldGroup[] = [
  {
    id: "testimonials.header",
    title: "Header",
    description: "Heading and intro text at the top of the testimonials page.",
    icon: "💬",
    columns: 2,
  },
  {
    id: "testimonials.featured",
    title: "Featured note",
    description: "Link text for the featured quote card.",
    icon: "🌟",
    columns: 1,
  },
  {
    id: "testimonials.grid",
    title: "Notes grid",
    description:
      "Heading suffix, filter text, and the empty-list copy for the notes grid.",
    icon: "🧾",
    columns: 2,
  },
  {
    id: "testimonials.press",
    title: "Press",
    description:
      "Heading, note, and up to four press mentions, shown once at least one is added.",
    icon: "📰",
    columns: 2,
  },
  {
    id: "testimonials.cta",
    title: "Closing banner",
    description: "Closing panel inviting a note.",
    icon: "✍️",
    columns: 2,
  },
];

export const pinkTestimonialsSections: TemplateSection[] = [
  {
    id: "testimonials.header",
    page: "testimonials",
    title: "Header",
    description: "Heading and intro text at the top of the testimonials page.",
    groupIds: ["testimonials.header"],
    order: 0,
    hideable: false,
  },
  {
    id: "testimonials.featured",
    page: "testimonials",
    title: "Featured note",
    description: "Large quote card for the first testimonial.",
    groupIds: ["testimonials.featured"],
    order: 1,
    hideable: true,
    links: [SECTION_LINKS.testimonials],
  },
  {
    id: "testimonials.grid",
    page: "testimonials",
    title: "Notes grid",
    description: "Filterable masonry grid of every testimonial.",
    groupIds: ["testimonials.grid"],
    order: 2,
    hideable: false,
    links: [SECTION_LINKS.testimonials],
  },
  {
    id: "testimonials.press",
    page: "testimonials",
    title: "Press",
    description: "Band of press mentions.",
    groupIds: ["testimonials.press"],
    order: 3,
    hideable: true,
  },
  {
    id: "testimonials.cta",
    page: "testimonials",
    title: "Closing banner",
    description: "Closing panel inviting a note.",
    groupIds: ["testimonials.cta"],
    order: 4,
    hideable: true,
  },
];
