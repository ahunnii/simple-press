import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";

/**
 * Full homepage build (design.md "Per-page section concepts › Homepage"):
 * hero (living sky), What We Do (alternating lanes), Gallery, From
 * idea to theme (process), and the Estimate Quote band. Five sections, in
 * design.md's render order.
 *
 * "Dream it. Selest themes it." is split across three fields so the script
 * word ("Selest") sits mid-heading via `DreamH1`'s `after` prop — see
 * `dream-homepage-hero.tsx`. This replaces the phase-2 tracer, which
 * duplicated "Selest" by rendering the full must-keep line AND a separate
 * accent field (see chrome-phase2.md Deviation #3).
 */

// ─── Hero (not hideable) ────────────────────────────────────────────────────

/**
 * Built-in hero shelf rows (`dream.homepage.hero-shelf`'s `defaultRows`).
 * Images are empty so each frame renders the warm fallback tile until the
 * owner picks a photo. Declared here (not in the runtime resolver) so the
 * resolver can import it without a circular import — see
 * `dream-homepage-shelf.ts`. Alt sentences and captions are the retired
 * numbered fields' old defaults, verbatim.
 */
export const DREAM_HERO_SHELF_DEFAULT_ROWS: Record<string, string>[] = [
  {
    image: "",
    alt: "A white draped arbor set up outdoors by Selest",
    caption: "Outdoor draping",
  },
  {
    image: "",
    alt: "A wall of pastel balloons styled by Selest",
    caption: "Balloon wall",
  },
  {
    image: "",
    alt: "A tablescape with centerpieces styled by Selest",
    caption: "Tablescape",
  },
  {
    image: "",
    alt: "White throne chairs framed by draping at a Selest event",
    caption: "Throne chairs",
  },
  {
    image: "",
    alt: "A floral backdrop with candlelight styled by Selest",
    caption: "Floral backdrop",
  },
  {
    image: "",
    alt: "A table dressed with balloons at a Selest event",
    caption: "Balloon table",
  },
];

const heroData: TemplateField[] = [
  {
    key: "dream.homepage.hero-heading",
    label: "Heading",
    description:
      "First part of the hero headline, before the highlighted word.",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "Dream it.",
  },
  {
    key: "dream.homepage.hero-accent",
    label: "Highlighted word",
    description:
      "One script-styled word in the middle of the hero headline. Never more than one word.",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "Selest",
  },
  {
    key: "dream.homepage.hero-heading-after",
    label: "Heading (continued)",
    description: "Rest of the hero headline, after the highlighted word.",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "themes it.",
  },
  {
    key: "dream.homepage.hero-lede",
    label: "Intro",
    description: "Short line under the hero headline.",
    type: "textarea",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
    defaultValue:
      "Elegant decor, rentals, draping, and backdrops for celebrations that need a beautiful focal point.",
  },
  {
    key: "dream.homepage.hero-cta-label",
    label: "Primary button label",
    description: "Label for the hero's primary button.",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "Request an Estimate Quote",
  },
  {
    key: "dream.homepage.hero-cta-url",
    label: "Primary button link",
    description: "Where the hero's primary button links to.",
    type: "url",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "/contact",
  },
  {
    key: "dream.homepage.hero-cta-secondary-label",
    label: "Secondary button label",
    description: "Label for the hero's outlined secondary button.",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "What We Do",
  },
  {
    key: "dream.homepage.hero-cta-secondary-url",
    label: "Secondary button link",
    description: "Where the hero's secondary button links to.",
    type: "url",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "#what-we-do",
  },
  {
    key: "dream.homepage.hero-shelf",
    label: "Shelf photos",
    description:
      "The photos that drift slowly across the bottom of the hero. Add, remove, or drag to reorder. Frames cycle wide, tall, then square. On wide screens, photos repeat as needed to keep the strip full.",
    type: "list",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
    minItems: 3,
    maxItems: 12,
    defaultsWhenEmpty: true,
    itemLabel: "photo",
    summaryKey: "caption",
    itemSchema: [
      {
        key: "image",
        label: "Photo",
        type: "image",
        description:
          "The photo for this frame. Leave empty to show a soft placeholder tile.",
      },
      {
        key: "caption",
        label: "Label",
        type: "text",
        description: "Short label shown in a pill over the photo.",
        placeholder: "e.g. Balloon wall",
      },
      {
        key: "alt",
        label: "Photo description",
        type: "text",
        optional: true,
        description:
          "Describe the photo for screen readers. Leave blank to use the label.",
      },
    ],
    defaultRows: DREAM_HERO_SHELF_DEFAULT_ROWS,
  },
];

// ─── What We Do (hideable) ──────────────────────────────────────────────────

/**
 * Built-in "What we do" rows (`dream.homepage.what-we-do-rows`'s
 * `defaultRows`). Images are empty so each row renders the designed
 * placeholder composition until the owner picks photos. Copy and alt
 * sentences are the retired numbered `row-{1..3}-*` fields' old defaults,
 * verbatim. Declared here (not in the resolver) to avoid a circular import —
 * see `dream-homepage-what-we-do-rows.ts`.
 */
export const DREAM_WHAT_WE_DO_DEFAULT_ROWS: Record<string, string>[] = [
  {
    heading: "Event Decor",
    body: "Selest builds the room around your occasion — backdrops, florals, and focal points designed to be photographed.",
    linkLabel: "See Event Decor",
    linkUrl: "/services",
    image: "",
    alt: "A fully styled event decor setup by Selest",
    sideImage: "",
    sideAlt: "Detail of an event decor accent piece",
  },
  {
    heading: "Event Rentals",
    body: "Chairs, linens, and statement furniture — rented and delivered so every seat matches the mood.",
    linkLabel: "See Event Rentals",
    linkUrl: "/services",
    image: "",
    alt: "Rental chairs and table settings styled by Selest",
    sideImage: "",
    sideAlt: "Detail of a rental linen and place setting",
  },
  {
    heading: "Customized Draping",
    body: "Fabric shaped around your space — ceilings, walls, and thrones draped to fit the theme exactly.",
    linkLabel: "See Customized Draping",
    linkUrl: "/services",
    image: "",
    alt: "A draped ceiling and throne chair styled by Selest",
    sideImage: "",
    sideAlt: "Detail of draped fabric along a wall",
  },
];

const whatWeDoData: TemplateField[] = [
  {
    key: "dream.homepage.what-we-do-heading",
    label: "Heading",
    description: "Heading for the What we do section.",
    type: "text",
    page: "homepage",
    group: "homepage.what-we-do",
    gridColumn: "col-span-1",
    defaultValue: "What we do",
  },
  {
    key: "dream.homepage.what-we-do-lede",
    label: "Intro",
    description: "Short line under the What we do heading.",
    type: "textarea",
    page: "homepage",
    group: "homepage.what-we-do",
    gridColumn: "col-span-full",
    defaultValue:
      "Three ways Selest brings a celebration together, from the room itself to the smallest detail.",
  },
  {
    key: "dream.homepage.what-we-do-rows",
    label: "Rows",
    description:
      "The alternating rows under the intro, each with a heading, a short paragraph, a link, and photos. Add, remove, or drag to reorder. Rows swap sides on wide screens, starting with the text on the left.",
    type: "list",
    page: "homepage",
    group: "homepage.what-we-do",
    gridColumn: "col-span-full",
    minItems: 1,
    maxItems: 6,
    defaultsWhenEmpty: true,
    itemLabel: "row",
    summaryKey: "heading",
    itemSchema: [
      {
        key: "heading",
        label: "Heading",
        type: "text",
        description: "Heading for this row.",
        placeholder: "e.g. Event Decor",
      },
      {
        key: "body",
        label: "Paragraph",
        type: "textarea",
        description: "Short paragraph describing this part of what you do.",
      },
      {
        key: "linkLabel",
        label: "Link label",
        type: "text",
        optional: true,
        description:
          "Words for the link under the paragraph. Leave blank to hide the link.",
        placeholder: "e.g. See Event Decor",
      },
      {
        key: "linkUrl",
        label: "Link",
        type: "url",
        optional: true,
        description: "Where the link goes.",
      },
      {
        key: "image",
        label: "Main photo",
        type: "image",
        description:
          "The large photo for this row. Leave empty to show a soft placeholder.",
      },
      {
        key: "alt",
        label: "Main photo description",
        type: "text",
        optional: true,
        description:
          "Describe the main photo for screen readers. Leave blank to use the heading.",
      },
      {
        key: "sideImage",
        label: "Side photo",
        type: "image",
        optional: true,
        description: "A smaller companion photo that overlaps the main photo.",
      },
      {
        key: "sideAlt",
        label: "Side photo description",
        type: "text",
        optional: true,
        description:
          "Describe the side photo for screen readers. Leave blank if it is purely decorative.",
      },
    ],
    defaultRows: DREAM_WHAT_WE_DO_DEFAULT_ROWS,
  },
];

// ─── Gallery (hideable) ─────────────────────────────────────────────────────

const galleryData: TemplateField[] = [
  {
    key: "dream.homepage.gallery-heading",
    label: "Heading",
    description: "Heading for the gallery section.",
    type: "text",
    page: "homepage",
    group: "homepage.gallery",
    gridColumn: "col-span-1",
    defaultValue: "Gallery",
  },
  {
    key: "dream.homepage.gallery-lede",
    label: "Intro",
    description: "Short line beside the gallery heading.",
    type: "textarea",
    page: "homepage",
    group: "homepage.gallery",
    gridColumn: "col-span-full",
    defaultValue: "A look at recent setups, straight from Selest's events.",
  },
  {
    key: "dream.homepage.gallery",
    label: "Gallery",
    description:
      "Pick a photo gallery to show here. Leave unset to show the designed empty state.",
    type: "gallery",
    page: "homepage",
    group: "homepage.gallery",
    gridColumn: "col-span-full",
    defaultValue: "",
  },
  {
    key: "dream.homepage.gallery-empty-message",
    label: "Empty state text",
    description:
      "Shown when no gallery is set (or it has no photos yet), above the link to the contact page.",
    type: "text",
    page: "homepage",
    group: "homepage.gallery",
    gridColumn: "col-span-full",
    defaultValue: "Photos of recent setups are on their way.",
  },
  {
    key: "dream.homepage.gallery-empty-link-label",
    label: "Empty state link text",
    description: "Label for the empty state's link to the contact page.",
    type: "text",
    page: "homepage",
    group: "homepage.gallery",
    gridColumn: "col-span-1",
    defaultValue: "Request an Estimate Quote",
  },
];

// ─── From idea to theme (hideable) ──────────────────────────────────────────

/**
 * Built-in "From idea to theme" steps (`dream.homepage.process-steps`'s
 * `defaultRows`) — the retired numbered `process-step-{1..3}-*` fields' old
 * defaults, verbatim. Also the resolver's fallback (`resolveDreamStepsList`).
 */
export const DREAM_PROCESS_STEPS_DEFAULT_ROWS: Record<string, string>[] = [
  {
    heading: "Share the occasion",
    body: "Tell Selest the date, the space, and the feeling you want the day to have.",
  },
  {
    heading: "Choose the decor path",
    body: "Selest recommends the decor, rentals, and draping that fit your event and space.",
  },
  {
    heading: "Build the look",
    body: "The pieces come together on-site, styled and ready before your guests arrive.",
  },
];

const processData: TemplateField[] = [
  {
    key: "dream.homepage.process-heading",
    label: "Heading",
    description: "Heading for the process section.",
    type: "text",
    page: "homepage",
    group: "homepage.process",
    gridColumn: "col-span-1",
    defaultValue: "From idea to theme",
  },
  {
    key: "dream.homepage.process-lede",
    label: "Intro",
    description: "Short line under the process heading.",
    type: "textarea",
    page: "homepage",
    group: "homepage.process",
    gridColumn: "col-span-full",
    defaultValue: "How a conversation with Selest becomes an event.",
  },
  {
    key: "dream.homepage.process-steps",
    label: "Steps",
    description:
      "The numbered steps beside the heading, in order. Add, remove, or drag to reorder.",
    type: "list",
    page: "homepage",
    group: "homepage.process",
    gridColumn: "col-span-full",
    minItems: 1,
    maxItems: 6,
    defaultsWhenEmpty: true,
    itemLabel: "step",
    summaryKey: "heading",
    itemSchema: [
      {
        key: "heading",
        label: "Heading",
        type: "text",
        description: "Short heading for this step.",
        placeholder: "e.g. Share the occasion",
      },
      {
        key: "body",
        label: "Description",
        type: "textarea",
        description: "A line or two describing this step.",
      },
    ],
    defaultRows: DREAM_PROCESS_STEPS_DEFAULT_ROWS,
  },
];

// ─── Estimate Quote band (hideable) ─────────────────────────────────────────

/**
 * Built-in checklist-chip rows — the single source for the
 * `dream.homepage.quote-chips` field's `defaultRows` and (via
 * `DREAM_QUOTE_CHIPS_FALLBACK` in `./dream-homepage-quote-chips.ts`) the
 * storefront's render fallback when the saved list is empty.
 */
export const DREAM_QUOTE_CHIPS_DEFAULT_ROWS: Record<string, string>[] = [
  { label: "Date + time" },
  { label: "Location" },
  { label: "Theme" },
  { label: "Colors" },
  { label: "Draping" },
  { label: "Rentals" },
  { label: "Space photos" },
  { label: "Full decor?" },
];

const quoteData: TemplateField[] = [
  {
    key: "dream.homepage.quote-heading",
    label: "Heading",
    description:
      "First part of this section's heading, before the highlighted words.",
    type: "text",
    page: "homepage",
    group: "homepage.quote",
    gridColumn: "col-span-1",
    defaultValue: "Request an",
  },
  {
    key: "dream.homepage.quote-accent",
    label: "Highlighted words",
    description: 'Script-styled rest of the heading (e.g. "Estimate Quote").',
    type: "text",
    page: "homepage",
    group: "homepage.quote",
    gridColumn: "col-span-1",
    defaultValue: "Estimate Quote",
  },
  {
    key: "dream.homepage.quote-lede",
    label: "Intro",
    description: "Short line under this section's heading.",
    type: "textarea",
    page: "homepage",
    group: "homepage.quote",
    gridColumn: "col-span-full",
    defaultValue:
      "Send Selest a few details and she'll recommend the right setup for your event.",
  },
  {
    key: "dream.homepage.quote-chips",
    label: "Checklist chips",
    description:
      "Up to 10 short chips listing what to have ready. Leave empty to use the default checklist.",
    type: "list",
    page: "homepage",
    group: "homepage.quote",
    gridColumn: "col-span-full",
    maxItems: 10,
    defaultsWhenEmpty: true,
    itemLabel: "detail",
    summaryKey: "label",
    itemSchema: [
      {
        key: "label",
        label: "Label",
        type: "text",
        description: "Short checklist detail, e.g. a date or a headcount.",
        placeholder: "e.g. Date + time",
      },
    ],
    defaultRows: DREAM_QUOTE_CHIPS_DEFAULT_ROWS,
  },
  {
    key: "dream.homepage.quote-cta-label",
    label: "Button label",
    description: "Label for this section's button.",
    type: "text",
    page: "homepage",
    group: "homepage.quote",
    gridColumn: "col-span-1",
    defaultValue: "Request an Estimate Quote",
  },
  {
    key: "dream.homepage.quote-cta-url",
    label: "Button link",
    description: "Where this section's button links to.",
    type: "url",
    page: "homepage",
    group: "homepage.quote",
    gridColumn: "col-span-1",
    defaultValue: "/contact",
  },
];

export const dreamHomepageData: TemplateField[] = [
  ...heroData,
  ...whatWeDoData,
  ...galleryData,
  ...processData,
  ...quoteData,
];

export const dreamHomepageFieldGroups: TemplateFieldGroup[] = [
  {
    id: "homepage.hero",
    title: "Hero",
    description:
      "Headline, intro, buttons, and the drifting photo shelf beneath them.",
    icon: "☁️",
    columns: 2,
  },
  {
    id: "homepage.what-we-do",
    title: "What we do",
    description:
      "Heading, intro, and the alternating rows for decor, rentals, and draping.",
    icon: "🪄",
    columns: 2,
  },
  {
    id: "homepage.gallery",
    title: "Gallery",
    description: "Heading, intro, and the picked photo gallery.",
    icon: "🖼️",
    columns: 2,
  },
  {
    id: "homepage.process",
    title: "From idea to theme",
    description: "Heading, intro, and the numbered steps.",
    icon: "🧭",
    columns: 2,
  },
  {
    id: "homepage.quote",
    title: "Quote request",
    description:
      "Closing section with the checklist chips and quote request button.",
    icon: "✉️",
    columns: 2,
  },
];

export const dreamHomepageSections: TemplateSection[] = [
  {
    id: "homepage.hero",
    page: "homepage",
    title: "Hero",
    description:
      "Animated hero background with the business logo, headline, buttons, and the photo shelf",
    groupIds: ["homepage.hero"],
    order: 0,
    hideable: false,
  },
  {
    id: "homepage.what-we-do",
    page: "homepage",
    title: "What we do",
    description:
      "Alternating rows: Event Decor, Event Rentals, Customized Draping",
    groupIds: ["homepage.what-we-do"],
    order: 1,
    hideable: true,
  },
  {
    id: "homepage.gallery",
    page: "homepage",
    title: "Gallery",
    description: "The owner-picked photo gallery, or a designed empty state",
    groupIds: ["homepage.gallery"],
    order: 2,
    hideable: true,
  },
  {
    id: "homepage.process",
    page: "homepage",
    title: "From idea to theme",
    description: "Numbered steps from first message to styled event",
    groupIds: ["homepage.process"],
    order: 3,
    hideable: true,
  },
  {
    id: "homepage.quote",
    page: "homepage",
    title: "Quote request",
    description: "Closing checklist section linking to the contact page",
    groupIds: ["homepage.quote"],
    order: 4,
    hideable: true,
  },
];
