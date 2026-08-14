import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";

/**
 * Field / group / section module for the `pink` template's About page.
 *
 * Authority: docs/templates/pink/design.md → "Per-page section concepts →
 * About". Uses `PinkPortraitHeader` (pale wash + a 4:5 portrait) for the hero
 * and the light footer tone (handled automatically by `PinkFooter`'s
 * route-based `isLightFooterRoute` check — no action needed here).
 *
 * Tone (2026-07-31, client direction): the hero and the values band are on
 * the pale pink wash; the commissions band stays dark on purpose as the
 * page's closing note, echoing the footer beneath it.
 */

// ── about.hero ──────────────────────────────────────────────────────────────

const aboutHeroData: TemplateField[] = [
  {
    key: "pink.about.hero-image",
    label: "Hero Portrait",
    description:
      "Tall photo (4:5) beside the heading — a portrait of the maker works best. Leave blank to show the heading on a plain pink band.",
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
    label: "Hero Heading",
    description: "The page's H1.",
    type: "text",
    page: "about",
    group: "about.hero",
    gridColumn: "col-span-full",
    defaultValue: "Every piece starts on the same table.",
  },
  {
    key: "pink.about.hero-intro",
    label: "Hero Intro",
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
    label: "Story Heading",
    description: "Heading over the studio story.",
    type: "text",
    page: "about",
    group: "about.story",
    gridColumn: "col-span-full",
    defaultValue: "How the work gets made",
  },
  {
    key: "pink.about.story-body",
    label: "Story Body (rich text)",
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
    label: "Story Image — Large",
    description: "The large image in the trio beside the story text (3:2).",
    type: "image",
    page: "about",
    group: "about.story",
    gridColumn: "col-span-1",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "pink.about.story-image-2",
    label: "Story Image — Small 1",
    description: "First small square image (1:1).",
    type: "image",
    page: "about",
    group: "about.story",
    gridColumn: "col-span-1",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "pink.about.story-image-3",
    label: "Story Image — Small 2",
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
    label: "Values Heading",
    type: "text",
    page: "about",
    group: "about.values",
    gridColumn: "col-span-1",
    description: "Heading over the values band.",
    defaultValue: "What doesn't change",
  },
  {
    key: "pink.about.values-note",
    label: "Values Note",
    description: "Muted supporting line beside the heading.",
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
    itemSchema: [
      {
        key: "title",
        label: "Title",
        type: "text",
        placeholder: "One of a kind",
      },
      {
        key: "body",
        label: "Body",
        type: "textarea",
        placeholder: "One sentence on what this means in practice.",
      },
    ],
    defaultValue: "",
  },
];

// ── about.timeline ───────────────────────────────────────────────────────────

const aboutTimelineData: TemplateField[] = [
  {
    key: "pink.about.timeline-heading",
    label: "Timeline Heading",
    type: "text",
    page: "about",
    group: "about.timeline",
    gridColumn: "col-span-1",
    description: "Heading over the timeline.",
    defaultValue: "How PinkArt got here",
  },
  {
    key: "pink.about.timeline-note",
    label: "Timeline Note",
    description: "Supporting line under the heading.",
    type: "textarea",
    page: "about",
    group: "about.timeline",
    gridColumn: "col-span-full",
    defaultValue: "The short version.",
  },
  {
    key: "pink.about.timeline-items",
    label: "Timeline Rows",
    description:
      "Year / title / body rows. Ships empty — the whole section stays hidden until you add at least one row.",
    type: "list",
    page: "about",
    group: "about.timeline",
    gridColumn: "col-span-full",
    maxItems: 8,
    itemSchema: [
      { key: "year", label: "Year", type: "text", placeholder: "2004" },
      {
        key: "title",
        label: "Title",
        type: "text",
        placeholder: "First stitches",
      },
      {
        key: "body",
        label: "Body",
        type: "textarea",
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
    label: "Gallery Images",
    description:
      "Full-width photo mosaic. Column/row span accept 1 or 2 — leave empty to use the defaults.",
    type: "list",
    page: "about",
    group: "about.gallery",
    gridColumn: "col-span-full",
    maxItems: 8,
    itemSchema: [
      { key: "image", label: "Image", type: "image" },
      {
        key: "colSpan",
        label: "Column span (1 or 2)",
        type: "text",
        placeholder: "1",
      },
      {
        key: "rowSpan",
        label: "Row span (1 or 2)",
        type: "text",
        placeholder: "1",
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
    label: "Custom Orders Heading",
    type: "text",
    page: "about",
    group: "about.commissions",
    gridColumn: "col-span-full",
    description: "Heading for the custom orders band.",
    defaultValue: "Order something made for you",
  },
  {
    key: "pink.about.commissions-body",
    label: "Custom Orders Body",
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
    label: "Primary Button Text",
    type: "text",
    page: "about",
    group: "about.commissions",
    gridColumn: "col-span-1",
    description: "Leave blank to hide the button.",
    defaultValue: "Start a custom order",
  },
  {
    key: "pink.about.commissions-cta-link",
    label: "Primary Button Link",
    type: "url",
    page: "about",
    group: "about.commissions",
    gridColumn: "col-span-1",
    description: "Where the primary button goes.",
    defaultValue: "/contact",
  },
  {
    key: "pink.about.commissions-secondary-label",
    label: "Secondary Button Text",
    type: "text",
    page: "about",
    group: "about.commissions",
    gridColumn: "col-span-1",
    description: "Leave blank to hide the button.",
    defaultValue: "See finished pieces",
  },
  {
    key: "pink.about.commissions-secondary-link",
    label: "Secondary Button Link",
    type: "url",
    page: "about",
    group: "about.commissions",
    gridColumn: "col-span-1",
    description: "Where the secondary button goes.",
    defaultValue: "/shop",
  },
  {
    key: "pink.about.commissions-facts",
    label: "Custom Order Facts",
    description:
      "Label/value rows on the right — anything a customer should know before asking. Ships empty; the rows only appear once you add them.",
    type: "list",
    page: "about",
    group: "about.commissions",
    gridColumn: "col-span-full",
    maxItems: 4,
    itemSchema: [
      { key: "label", label: "Label", type: "text", placeholder: "Turnaround" },
      {
        key: "value",
        label: "Value",
        type: "text",
        placeholder: "Ask for a quote",
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
    title: "About — Hero",
    description: "Portrait photo, heading and intro on the pink band.",
    icon: "🎨",
    columns: 2,
  },
  {
    id: "about.story",
    title: "About — Studio Story",
    description:
      "The main story and an image trio. The signature under it comes from Owner / Artist.",
    icon: "🧵",
    columns: 2,
  },
  {
    id: "about.values",
    title: "About — Values",
    description: "Up to 4 short principles on the pink band.",
    icon: "✦",
    columns: 2,
  },
  {
    id: "about.timeline",
    title: "About — Timeline",
    description: "A short year-by-year history.",
    icon: "🕰️",
    columns: 2,
  },
  {
    id: "about.gallery",
    title: "About — Gallery",
    description: "Full-width photo mosaic.",
    icon: "🖼️",
    columns: 1,
  },
  {
    id: "about.commissions",
    title: "About — Custom Orders",
    description: "Closing band explaining custom order work.",
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
    title: "Studio Story",
    description: "Main story and image trio.",
    groupIds: ["about.story"],
    order: 1,
    hideable: false,
  },
  {
    id: "about.values",
    page: "about",
    title: "Values",
    description: "Pink band of short principles.",
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
    description: "Full-width photo mosaic.",
    groupIds: ["about.gallery"],
    order: 4,
    hideable: true,
  },
  {
    id: "about.commissions",
    page: "about",
    title: "Custom Orders",
    description: "Closing band about custom order work.",
    groupIds: ["about.commissions"],
    order: 5,
    hideable: true,
  },
];
