import type {
  TemplateField,
  TemplateFieldGroup,
} from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";

/**
 * Field / group / section module for the `pink` template's About page.
 *
 * Authority: docs/templates/pink/design.md → "Per-page section concepts →
 * About". Uses `PinkPhotoHeader` (min-height 66vh) for the hero and the
 * light footer tone (handled automatically by `PinkFooter`'s route-based
 * `isLightFooterRoute` check — no action needed here).
 */

// ── about.hero ──────────────────────────────────────────────────────────────

const aboutHeroData: TemplateField[] = [
  {
    key: "pink.about.hero-image",
    label: "Hero Background Image",
    description: "Full-bleed photo behind the About page header.",
    type: "image",
    page: "about",
    group: "about.hero",
    gridColumn: "col-span-full",
    // Empty on purpose — see the homepage hero-image field. `PinkPhotoHeader`
    // keeps the bare dark band + scrims when this is unset.
    defaultValue: "",
  },
  {
    key: "pink.about.hero-eyebrow",
    label: "Hero Eyebrow",
    description: "Small label above the heading.",
    type: "text",
    page: "about",
    group: "about.hero",
    gridColumn: "col-span-1",
    defaultValue: "The artist",
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
      "Evelyn Pinkard has been sewing in Detroit for more than twenty years. PinkArt is her studio — spirit dolls, magnets, and pieces made to be kept, not just bought.",
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
      "Optional formatted version of the studio story. When set, this replaces the three plain paragraphs below.",
    type: "richtext",
    page: "about",
    group: "about.story",
    gridColumn: "col-span-full",
    defaultValue: "",
  },
  {
    key: "pink.about.story-paragraph-1",
    label: "Story Paragraph 1",
    description: "Used when the rich text field above is left empty.",
    type: "textarea",
    page: "about",
    group: "about.story",
    gridColumn: "col-span-full",
    defaultValue:
      "Every doll starts with fabric on the table and no fixed plan. Evelyn works the shape out by hand, one piece at a time, the same way she's worked since she started sewing.",
  },
  {
    key: "pink.about.story-paragraph-2",
    label: "Story Paragraph 2",
    description: "Second paragraph of the studio story.",
    type: "textarea",
    page: "about",
    group: "about.story",
    gridColumn: "col-span-full",
    defaultValue:
      "Materials come from estate sales, remnant bins, and a handful of suppliers she trusts. Nothing is printed or molded. If a seam shows, it's because a person made it.",
  },
  {
    key: "pink.about.story-paragraph-3",
    label: "Story Paragraph 3",
    description: "Third paragraph of the studio story.",
    type: "textarea",
    page: "about",
    group: "about.story",
    gridColumn: "col-span-full",
    defaultValue:
      "The studio runs on the same rhythm it always has: make, mend, teach, repeat. Commissions and make & takes fill the gaps between collections.",
  },
  {
    key: "pink.about.story-signature-image",
    label: "Signature Photo",
    description: "Small square photo beside the name and role.",
    type: "image",
    page: "about",
    group: "about.story",
    gridColumn: "col-span-1",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "pink.about.story-signature-name",
    label: "Signature Name",
    type: "text",
    page: "about",
    group: "about.story",
    gridColumn: "col-span-1",
    description: "Name shown under the story.",
    defaultValue: "Evelyn Pinkard",
  },
  {
    key: "pink.about.story-signature-role",
    label: "Signature Role",
    description: "Title shown under the name.",
    type: "text",
    page: "about",
    group: "about.story",
    gridColumn: "col-span-1",
    defaultValue: "Owner & maker, PinkArt LLC",
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
      { key: "title", label: "Title", type: "text", placeholder: "Made by hand" },
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
    key: "pink.about.timeline-eyebrow",
    label: "Timeline Eyebrow",
    type: "text",
    page: "about",
    group: "about.timeline",
    gridColumn: "col-span-1",
    description: "Small label above the timeline heading.",
    defaultValue: "Some history",
  },
  {
    key: "pink.about.timeline-heading",
    label: "Timeline Heading",
    type: "text",
    page: "about",
    group: "about.timeline",
    gridColumn: "col-span-1",
    description: "Heading over the timeline.",
    defaultValue: "Twenty years, roughly",
  },
  {
    key: "pink.about.timeline-note",
    label: "Timeline Note",
    description: "Supporting line under the heading.",
    type: "textarea",
    page: "about",
    group: "about.timeline",
    gridColumn: "col-span-full",
    defaultValue: "The short version of how PinkArt got here.",
  },
  {
    key: "pink.about.timeline-items",
    label: "Timeline Rows",
    description: "Year / title / body rows. Leave empty to use the defaults.",
    type: "list",
    page: "about",
    group: "about.timeline",
    gridColumn: "col-span-full",
    maxItems: 8,
    itemSchema: [
      { key: "year", label: "Year", type: "text", placeholder: "2004" },
      { key: "title", label: "Title", type: "text", placeholder: "First stitches" },
      { key: "body", label: "Body", type: "textarea", placeholder: "What happened." },
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
      { key: "colSpan", label: "Column span (1 or 2)", type: "text", placeholder: "1" },
      { key: "rowSpan", label: "Row span (1 or 2)", type: "text", placeholder: "1" },
    ],
    defaultValue: "",
  },
];

// ── about.commissions ────────────────────────────────────────────────────────

const aboutCommissionsData: TemplateField[] = [
  {
    key: "pink.about.commissions-eyebrow",
    label: "Commissions Eyebrow",
    type: "text",
    page: "about",
    group: "about.commissions",
    gridColumn: "col-span-1",
    description: "Small label above the commissions heading.",
    defaultValue: "By request",
  },
  {
    key: "pink.about.commissions-heading",
    label: "Commissions Heading",
    type: "text",
    page: "about",
    group: "about.commissions",
    gridColumn: "col-span-full",
    description: "Heading for the commissions band.",
    defaultValue: "Commission a piece of your own",
  },
  {
    key: "pink.about.commissions-body",
    label: "Commissions Body",
    type: "textarea",
    page: "about",
    group: "about.commissions",
    gridColumn: "col-span-full",
    description: "Explains how commissions work.",
    defaultValue:
      "Tell me who it's for and what it's for. Most commissions take three to six weeks, depending on the season.",
  },
  {
    key: "pink.about.commissions-cta-label",
    label: "Primary Button Text",
    type: "text",
    page: "about",
    group: "about.commissions",
    gridColumn: "col-span-1",
    description: "Leave blank to hide the button.",
    defaultValue: "Start a commission",
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
    defaultValue: "See past commissions",
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
    label: "Commission Facts",
    description:
      "Label/value rows on the right — turnaround time, starting price, and so on. Leave empty to use the defaults.",
    type: "list",
    page: "about",
    group: "about.commissions",
    gridColumn: "col-span-full",
    maxItems: 4,
    itemSchema: [
      { key: "label", label: "Label", type: "text", placeholder: "Turnaround" },
      { key: "value", label: "Value", type: "text", placeholder: "3–6 weeks" },
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
    description: "Background photo, eyebrow, heading and intro.",
    icon: "🎨",
    columns: 2,
  },
  {
    id: "about.story",
    title: "About — Studio Story",
    description: "The main story, a signature block, and an image trio.",
    icon: "🧵",
    columns: 2,
  },
  {
    id: "about.values",
    title: "About — Values",
    description: "Up to 4 short principles on a dark band.",
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
    title: "About — Commissions",
    description: "Closing band explaining custom commission work.",
    icon: "✉️",
    columns: 2,
  },
];

export const pinkAboutSections: TemplateSection[] = [
  {
    id: "about.hero",
    page: "about",
    title: "Hero",
    description: "Photo header with the artist's introduction.",
    groupIds: ["about.hero"],
    order: 0,
    hideable: false,
  },
  {
    id: "about.story",
    page: "about",
    title: "Studio Story",
    description: "Main story, signature block, and image trio.",
    groupIds: ["about.story"],
    order: 1,
    hideable: false,
  },
  {
    id: "about.values",
    page: "about",
    title: "Values",
    description: "Dark band of short principles.",
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
    title: "Commissions",
    description: "Closing band about custom commission work.",
    groupIds: ["about.commissions"],
    order: 5,
    hideable: true,
  },
];
