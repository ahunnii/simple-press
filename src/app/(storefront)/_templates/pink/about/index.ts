import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";
import { listRowsFromDefaults } from "~/lib/lucide-template-icons";

/**
 * Field / group / section module for the `pink` template's About page.
 *
 * Authority: docs/templates/pink/design.md → "Per-page section concepts →
 * About". Uses `PinkPortraitHeader` (pale wash + a 4:5 portrait) for the hero
 * and the light footer tone (handled automatically by `PinkFooter`'s
 * route-based `isLightFooterRoute` check — no action needed here).
 *
 * Tone (2026-07-31, client direction): the hero and the values section are on
 * the pale wash; the custom-orders section stays dark on purpose as the
 * page's closing note, echoing the footer beneath it.
 */

// ─── Built-in list defaults ─────────────────────────────────────────────────
// Text copied verbatim from the pre-migration `DEFAULT_VALUES` constant in
// `pink-about-page.tsx`.

const PINK_VALUES_DEFAULT_ROWS = [
  {
    title: "One of a kind",
    body: "Made one at a time, never in runs. No two pieces are exactly alike.",
  },
  {
    title: "Made by hand",
    body: "Every piece passes through Evelyn's hands start to finish.",
  },
] satisfies Record<string, string>[];

// ── about.hero ──────────────────────────────────────────────────────────────

const aboutHeroData: TemplateField[] = [
  {
    key: "pink.about.hero-image",
    label: "Portrait",
    description:
      "Tall photo (4:5) beside the heading — a portrait of the maker works best. Leave blank to show the heading on a plain band.",
    type: "image",
    page: "about",
    group: "about.hero",
    gridColumn: "col-span-full",
    // Light-surface convention: `/placeholder.svg` rather than `""` (the empty
    // default belongs to the dark bands, where a light placeholder would read
    // as a grey slab). `hasCustomImage` treats `/placeholder.svg` as "not set",
    // so `PinkPortraitHeader` drops the image column and renders the wash-only
    // band until the owner uploads a real photo.
    defaultValue: "/placeholder.svg",
  },
  {
    key: "pink.about.hero-heading",
    label: "Heading",
    description: "The page's main heading.",
    type: "text",
    page: "about",
    group: "about.hero",
    gridColumn: "col-span-full",
    defaultValue: "Every piece starts on the same table.",
  },
  {
    key: "pink.about.hero-intro",
    label: "Intro text",
    description: "One or two sentences under the heading.",
    type: "textarea",
    page: "about",
    group: "about.hero",
    gridColumn: "col-span-full",
    defaultValue:
      "Evelyn Pinkard sews in Detroit. PinkArt is her studio — dolls, magnets, jewelry and small pieces, made to be kept, not just bought.",
  },
];

// ── about.story ──────────────────────────────────────────────────────────────

const aboutStoryData: TemplateField[] = [
  {
    key: "pink.about.story-heading",
    label: "Heading",
    description: "Heading over the studio story.",
    type: "text",
    page: "about",
    group: "about.story",
    gridColumn: "col-span-full",
    defaultValue: "How the work gets made",
  },
  {
    key: "pink.about.story-body",
    label: "Story (rich text)",
    description:
      "The studio story — the only place it is written. Formatted text: headings, links and lists all render.",
    type: "richtext",
    page: "about",
    group: "about.story",
    gridColumn: "col-span-full",
    defaultValue: "",
  },
  {
    key: "pink.about.story-image-main",
    label: "Image — large",
    description: "The large image in the trio beside the story text (3:2).",
    type: "image",
    page: "about",
    group: "about.story",
    gridColumn: "col-span-1",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "pink.about.story-image-2",
    label: "Image — small 1",
    description: "First small square image (1:1).",
    type: "image",
    page: "about",
    group: "about.story",
    gridColumn: "col-span-1",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "pink.about.story-image-3",
    label: "Image — small 2",
    description: "Second small square image (1:1).",
    type: "image",
    page: "about",
    group: "about.story",
    gridColumn: "col-span-1",
    defaultValue: "/placeholder.svg",
  },
];

// ── about.values ─────────────────────────────────────────────────────────────

const aboutValuesData: TemplateField[] = [
  {
    key: "pink.about.values-heading",
    label: "Heading",
    type: "text",
    page: "about",
    group: "about.values",
    gridColumn: "col-span-1",
    description: "Heading over the values section.",
    defaultValue: "What doesn't change",
  },
  {
    key: "pink.about.values-note",
    label: "Note",
    description: "Supporting line beside the heading.",
    type: "textarea",
    page: "about",
    group: "about.values",
    gridColumn: "col-span-1",
    defaultValue: "A short list, held to on every piece.",
  },
  {
    key: "pink.about.values-items",
    label: "Values",
    description: "Up to 4 short principles. Leave empty to use the defaults.",
    type: "list",
    page: "about",
    group: "about.values",
    gridColumn: "col-span-full",
    maxItems: 4,
    itemLabel: "value",
    defaultsWhenEmpty: true,
    defaultRows: PINK_VALUES_DEFAULT_ROWS,
    itemSchema: [
      {
        key: "title",
        label: "Title",
        type: "text",
        description: "Short name for the value.",
        placeholder: "e.g. One of a kind",
      },
      {
        key: "body",
        label: "Body",
        type: "textarea",
        description: "One sentence on what this means in practice.",
        placeholder: "e.g. Every piece is made on its own.",
      },
    ],
    defaultValue: "",
  },
];

// ── about.timeline ───────────────────────────────────────────────────────────

const aboutTimelineData: TemplateField[] = [
  {
    key: "pink.about.timeline-heading",
    label: "Heading",
    type: "text",
    page: "about",
    group: "about.timeline",
    gridColumn: "col-span-1",
    description: "Heading over the timeline.",
    defaultValue: "How PinkArt got here",
  },
  {
    key: "pink.about.timeline-note",
    label: "Note",
    description: "Supporting line under the heading.",
    type: "textarea",
    page: "about",
    group: "about.timeline",
    gridColumn: "col-span-full",
    defaultValue: "The short version.",
  },
  {
    key: "pink.about.timeline-items",
    label: "Timeline rows",
    description:
      "Up to 8 year/title/body rows. Ships empty — the whole section stays hidden until you add at least one row.",
    type: "list",
    page: "about",
    group: "about.timeline",
    gridColumn: "col-span-full",
    maxItems: 8,
    itemLabel: "milestone",
    itemSchema: [
      {
        key: "year",
        label: "Year",
        type: "text",
        description: "The year this milestone happened.",
        placeholder: "e.g. 2004",
      },
      {
        key: "title",
        label: "Title",
        type: "text",
        description: "Short name for the milestone.",
        placeholder: "e.g. First stitches",
      },
      {
        key: "body",
        label: "Body",
        type: "textarea",
        description: "A sentence or two on what happened.",
        placeholder: "What happened.",
      },
    ],
    defaultValue: "",
  },
];

// ── about.gallery ────────────────────────────────────────────────────────────

const aboutGalleryData: TemplateField[] = [
  {
    key: "pink.about.gallery-items",
    label: "Gallery images",
    description:
      "Up to 8 photos in a full-width layout. The section stays hidden until at least one photo is set.",
    type: "list",
    page: "about",
    group: "about.gallery",
    gridColumn: "col-span-full",
    maxItems: 8,
    itemLabel: "photo",
    itemSchema: [
      {
        key: "image",
        label: "Image",
        type: "image",
        description: "One photo for the layout.",
      },
      {
        key: "colSpan",
        label: "Column span",
        type: "text",
        description:
          "How many columns this photo fills — 1 or 2. Leave blank for 1.",
        placeholder: "1",
        optional: true,
      },
      {
        key: "rowSpan",
        label: "Row span",
        type: "text",
        description:
          "How many rows this photo fills — 1 or 2. Leave blank for 1.",
        placeholder: "1",
        optional: true,
      },
    ],
    defaultValue: "",
  },
];

// ── about.commissions ────────────────────────────────────────────────────────
// Field keys keep the `commissions-` prefix (changing them would orphan every
// owner-saved value), but the copy is about custom orders — the client takes
// those, not commissions (2026-07-31 client direction).

const aboutCommissionsData: TemplateField[] = [
  {
    key: "pink.about.commissions-heading",
    label: "Heading",
    type: "text",
    page: "about",
    group: "about.commissions",
    gridColumn: "col-span-full",
    description: "Heading for the custom orders section.",
    defaultValue: "Order something made for you",
  },
  {
    key: "pink.about.commissions-body",
    label: "Body text",
    type: "textarea",
    page: "about",
    group: "about.commissions",
    gridColumn: "col-span-full",
    description: "Explains how custom orders work.",
    defaultValue:
      "Tell me who it's for and what you have in mind. We'll work out the details together before anything gets made.",
  },
  {
    key: "pink.about.commissions-cta-label",
    label: "Button text",
    type: "text",
    page: "about",
    group: "about.commissions",
    gridColumn: "col-span-1",
    description: "Leave blank to hide the button.",
    defaultValue: "Start a custom order",
  },
  {
    key: "pink.about.commissions-cta-link",
    label: "Button link",
    type: "url",
    page: "about",
    group: "about.commissions",
    gridColumn: "col-span-1",
    description: "Where the button goes.",
    defaultValue: "/contact",
  },
  {
    key: "pink.about.commissions-secondary-label",
    label: "Button text — second button",
    type: "text",
    page: "about",
    group: "about.commissions",
    gridColumn: "col-span-1",
    description: "Leave blank to hide the button.",
    defaultValue: "See finished pieces",
  },
  {
    key: "pink.about.commissions-secondary-link",
    label: "Button link — second button",
    type: "url",
    page: "about",
    group: "about.commissions",
    gridColumn: "col-span-1",
    description: "Where the second button goes.",
    defaultValue: "/shop",
  },
  {
    key: "pink.about.commissions-facts",
    label: "Custom order facts",
    description:
      "Up to 4 label/value rows — anything a customer should know before asking. Ships empty; the rows only appear once you add them.",
    type: "list",
    page: "about",
    group: "about.commissions",
    gridColumn: "col-span-full",
    maxItems: 4,
    itemLabel: "fact",
    itemSchema: [
      {
        key: "label",
        label: "Label",
        type: "text",
        description: "Short name for the fact, e.g. 'Turnaround'.",
        placeholder: "e.g. Turnaround",
      },
      {
        key: "value",
        label: "Value",
        type: "text",
        description: "The fact itself.",
        placeholder: "e.g. Ask for a quote",
      },
    ],
    defaultValue: "",
  },
];

// ── Aggregated export ────────────────────────────────────────────────────────

export const pinkAboutData: TemplateField[] = [
  ...aboutHeroData,
  ...aboutStoryData,
  ...aboutValuesData,
  ...aboutTimelineData,
  ...aboutGalleryData,
  ...aboutCommissionsData,
];

export const pinkAboutFieldGroups: TemplateFieldGroup[] = [
  {
    id: "about.hero",
    title: "Hero",
    description: "Portrait photo, heading and intro on the pale band.",
    icon: "🎨",
    columns: 2,
  },
  {
    id: "about.story",
    title: "Studio story",
    description:
      "The main story and an image trio. The signature under it comes from Owner / Artist.",
    icon: "🧵",
    columns: 2,
  },
  {
    id: "about.values",
    title: "Values",
    description: "Up to 4 short principles on the pale band.",
    icon: "✦",
    columns: 2,
  },
  {
    id: "about.timeline",
    title: "Timeline",
    description: "A short year-by-year history.",
    icon: "🕰️",
    columns: 2,
  },
  {
    id: "about.gallery",
    title: "Gallery",
    description: "Full-width photo layout.",
    icon: "🖼️",
    columns: 1,
  },
  {
    id: "about.commissions",
    title: "Custom orders",
    description: "Closing section explaining custom order work.",
    icon: "✉️",
    columns: 2,
  },
];

export const pinkAboutSections: TemplateSection[] = [
  {
    id: "about.hero",
    page: "about",
    title: "Hero",
    description: "Portrait header with the artist's introduction.",
    groupIds: ["about.hero"],
    order: 0,
    hideable: false,
  },
  {
    id: "about.story",
    page: "about",
    title: "Studio story",
    description: "Main story and image trio.",
    groupIds: ["about.story"],
    order: 1,
    hideable: true,
  },
  {
    id: "about.values",
    page: "about",
    title: "Values",
    description: "Band of short principles.",
    groupIds: ["about.values"],
    order: 2,
    hideable: true,
  },
  {
    id: "about.timeline",
    page: "about",
    title: "Timeline",
    description: "Short year-by-year history.",
    groupIds: ["about.timeline"],
    order: 3,
    hideable: true,
  },
  {
    id: "about.gallery",
    page: "about",
    title: "Gallery",
    description: "Full-width photo layout.",
    groupIds: ["about.gallery"],
    order: 4,
    hideable: true,
  },
  {
    id: "about.commissions",
    page: "about",
    title: "Custom orders",
    description: "Closing section about custom order work.",
    groupIds: ["about.commissions"],
    order: 5,
    hideable: true,
  },
];

// ─── Derived storefront constants ──────────────────────────────────────────

export const DEFAULT_PINK_VALUES = listRowsFromDefaults(
  PINK_VALUES_DEFAULT_ROWS,
  "default-value",
);
