import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";

/**
 * Homepage fields for the `pink` template.
 *
 * Authority: docs/templates/pink/design.md → "Per-page section concepts →
 * Homepage". Five sections: hero (signature moment, not hideable), promises,
 * collection, events (the make & takes — driven by list fields, not the
 * Services DB, per intake), and story.
 */

// ── homepage.hero ───────────────────────────────────────────────────────────

const homepageHeroData: TemplateField[] = [
  {
    key: "pink.homepage.hero-kicker",
    label: "Hero Kicker",
    description:
      "Small uppercase line above the headline, in the brighter of the two dark-surface text colors.",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "Sewn one at a time",
  },
  {
    key: "pink.homepage.hero-kicker-trailing",
    label: "Hero Kicker — Trailing Clause",
    description:
      "Muted continuation of the kicker line, e.g. 'in a Detroit studio.' Leave blank to show just the kicker.",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "in a Detroit studio.",
  },
  {
    key: "pink.homepage.hero-heading-line-1",
    label: "Headline — Line 1",
    description: "First line of the hero headline.",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "Made to be",
  },
  {
    key: "pink.homepage.hero-heading-line-2",
    label: "Headline — Line 2 (accent)",
    description: "Second line of the hero headline, shown in the accent color.",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "kept.",
  },
  {
    key: "pink.homepage.hero-body",
    label: "Hero Body",
    description: "One or two sentences under the headline.",
    type: "textarea",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
    defaultValue:
      "Handmade dolls, magnets, jewelry and small pieces — wool, cotton and polymer clay, worked by hand in a Detroit studio. Every one is one of a kind.",
  },
  {
    key: "pink.homepage.hero-cta-primary-label",
    label: "Primary CTA Label",
    description: "The solid rose button.",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "Shop the collection",
  },
  {
    key: "pink.homepage.hero-cta-primary-link",
    label: "Primary CTA Link",
    type: "url",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "/shop",
    description: "Where the solid button goes.",
  },
  {
    key: "pink.homepage.hero-cta-secondary-label",
    label: "Secondary CTA Label",
    description: "The ghost (outlined) button. Leave blank to hide it.",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "See the make & takes",
  },
  {
    key: "pink.homepage.hero-cta-secondary-link",
    label: "Secondary CTA Link",
    type: "url",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "#make-and-takes",
    description: "Where the ghost button goes.",
  },
  {
    key: "pink.homepage.hero-image",
    label: "Hero Background Image",
    description: "Full-viewport background image behind the headline.",
    type: "image",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
    // Empty on purpose. This image sits on the hero's DARK band, where the
    // light `/placeholder.svg` reads as a grey slab across the headline.
    // `PinkHeroSection` renders the scrims + glows bare when this is unset.
    defaultValue: "",
  },
  {
    key: "pink.homepage.hero-panels",
    label: "Hero Panel Strip",
    description:
      "The four-panel strip beneath the hero headline. Each panel needs an image, a short caption, and a parallax depth (a plain number like 1.4 — higher drifts further on mouse move). Up to 4 panels.",
    type: "list",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
    maxItems: 4,
    itemSchema: [
      { key: "image", label: "Image", type: "image" },
      {
        key: "caption",
        label: "Caption",
        type: "text",
        placeholder: "Dolls, one at a time",
      },
      { key: "depth", label: "Parallax Depth", type: "text", placeholder: "1.4" },
    ],
    defaultValue: "",
  },
];

// ── homepage.promises ───────────────────────────────────────────────────────

const homepagePromisesData: TemplateField[] = [
  {
    key: "pink.homepage.promises-items",
    label: "Promise Cards",
    description:
      "Three short promises shown in a hairline grid — the plain-spoken facts a new visitor should know. Up to 6.",
    type: "list",
    page: "homepage",
    group: "homepage.promises",
    gridColumn: "col-span-full",
    maxItems: 6,
    itemSchema: [
      { key: "title", label: "Title", type: "text", placeholder: "One of a kind" },
      {
        key: "body",
        label: "Body",
        type: "textarea",
        placeholder: "Every piece is made on its own, never in runs.",
      },
    ],
    defaultValue: "",
  },
];

// ── homepage.collection ─────────────────────────────────────────────────────

const homepageCollectionData: TemplateField[] = [
  {
    key: "pink.homepage.collection-heading",
    label: "Collection Heading",
    type: "text",
    page: "homepage",
    group: "homepage.collection",
    gridColumn: "col-span-1",
    defaultValue: "New from the table",
    description: "Section heading above the product grid.",
  },
  {
    key: "pink.homepage.collection-note",
    label: "Collection Note",
    description: "Short right-aligned line beside the heading. Leave blank to hide.",
    type: "text",
    page: "homepage",
    group: "homepage.collection",
    gridColumn: "col-span-full",
    defaultValue: "One of a kind. Once a piece is gone, it's gone.",
  },
  {
    key: "pink.homepage.collection-cta-label",
    label: "“See All” CTA Label",
    type: "text",
    page: "homepage",
    group: "homepage.collection",
    gridColumn: "col-span-1",
    defaultValue: "See all pieces",
    description: "Centered ghost button below the product grid.",
  },
  {
    key: "pink.homepage.collection-cta-link",
    label: "“See All” CTA Link",
    type: "url",
    page: "homepage",
    group: "homepage.collection",
    gridColumn: "col-span-1",
    defaultValue: "/shop",
    description: "Where the “see all” button goes.",
  },
];

// ── homepage.events ─────────────────────────────────────────────────────────

const homepageEventsData: TemplateField[] = [
  {
    key: "pink.homepage.events-heading",
    label: "Events Heading",
    type: "text",
    page: "homepage",
    group: "homepage.events",
    gridColumn: "col-span-1",
    defaultValue: "Come sit at the table",
    description: "Heading for the make & takes band.",
  },
  {
    key: "pink.homepage.events-note",
    label: "Events Lead-In",
    description: "One short line under the heading.",
    type: "textarea",
    page: "homepage",
    group: "homepage.events",
    gridColumn: "col-span-full",
    defaultValue: "Small groups, all materials included. No experience needed.",
  },
  {
    key: "pink.homepage.events-body",
    label: "What a Make & Take Is",
    description:
      "A short paragraph explaining what actually happens at one. This is the only place on the homepage that says what you are offering, so keep it plain.",
    type: "textarea",
    page: "homepage",
    group: "homepage.events",
    gridColumn: "col-span-full",
    defaultValue:
      "A make & take is a hands-on session brought to your room — a church, a school, a library, a workplace, a back yard. Everyone at the table sews, stuffs and finishes a small piece by hand, and leaves holding it. Nobody needs to have sewn a stitch before.",
  },
  {
    key: "pink.homepage.events-mosaic",
    label: "Make & Take Photos and Fliers",
    description:
      "Your own photos and event fliers, shown as a mosaic. This is where a flier for an upcoming make & take goes. Column and row span are plain numbers (1 or 2). Up to 6 images.",
    type: "list",
    page: "homepage",
    group: "homepage.events",
    gridColumn: "col-span-full",
    maxItems: 6,
    itemSchema: [
      { key: "image", label: "Image", type: "image" },
      {
        key: "alt",
        label: "Alt Text",
        type: "text",
        // Fliers carry words, so this is not decoration — if it says the date
        // and the room, the alt text has to say them too.
        placeholder: "Describe the photo, or read out what the flier says",
      },
      { key: "colSpan", label: "Column Span", type: "text", placeholder: "1" },
      { key: "rowSpan", label: "Row Span", type: "text", placeholder: "1" },
    ],
    defaultValue: "",
  },
  {
    key: "pink.homepage.events-facts",
    label: "How They're Hosted",
    description:
      "Label/value rows describing how a make & take typically runs — where, group size, what's included. Up to 4.",
    type: "list",
    page: "homepage",
    group: "homepage.events",
    gridColumn: "col-span-full",
    maxItems: 4,
    itemSchema: [
      { key: "label", label: "Label", type: "text", placeholder: "Where" },
      {
        key: "value",
        label: "Value",
        type: "text",
        placeholder: "Your space — school, church, library, workplace or back yard",
      },
    ],
    defaultValue: "",
  },
  {
    key: "pink.homepage.events-cta-note",
    label: "Enquiry Note",
    description:
      "The line beside the button. Say that cost is quoted per group once you know what someone needs.",
    type: "textarea",
    page: "homepage",
    group: "homepage.events",
    gridColumn: "col-span-full",
    defaultValue:
      "Cost is quoted per group. Tell us the room and roughly how many people, and we'll send details.",
  },
  {
    key: "pink.homepage.events-cta-label",
    label: "Enquiry Button Text",
    description: "Leave blank to hide the button.",
    type: "text",
    page: "homepage",
    group: "homepage.events",
    gridColumn: "col-span-1",
    defaultValue: "Ask about hosting one",
  },
  {
    key: "pink.homepage.events-cta-link",
    label: "Enquiry Button Link",
    description: "Where the button goes.",
    type: "url",
    page: "homepage",
    group: "homepage.events",
    gridColumn: "col-span-1",
    defaultValue: "/contact",
  },
];

// ── homepage.story ──────────────────────────────────────────────────────────

const homepageStoryData: TemplateField[] = [
  {
    key: "pink.homepage.story-image",
    label: "Story Image",
    description: "Portrait image beside the pull-quote — a studio or working photo.",
    type: "image",
    page: "homepage",
    group: "homepage.story",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "pink.homepage.story-image-alt",
    label: "Story Image Alt Text",
    type: "text",
    page: "homepage",
    group: "homepage.story",
    gridColumn: "col-span-full",
    defaultValue: "Evelyn Pinkard working at her studio table in Detroit.",
    description: "Describes the story image for screen readers.",
  },
  {
    key: "pink.homepage.story-quote-before",
    label: "Pull-Quote — Before",
    description: "Text before the accent word.",
    type: "text",
    page: "homepage",
    group: "homepage.story",
    gridColumn: "col-span-1",
    defaultValue: "Every piece is made",
  },
  {
    key: "pink.homepage.story-quote-accent",
    label: "Pull-Quote — Accent Word",
    description: "One word shown in the accent color.",
    type: "text",
    page: "homepage",
    group: "homepage.story",
    gridColumn: "col-span-1",
    defaultValue: "slow",
  },
  {
    key: "pink.homepage.story-quote-after",
    label: "Pull-Quote — After",
    description: "Text after the accent word.",
    type: "text",
    page: "homepage",
    group: "homepage.story",
    gridColumn: "col-span-1",
    defaultValue: "on purpose.",
  },
  {
    key: "pink.homepage.story-body",
    label: "Story Body",
    type: "textarea",
    page: "homepage",
    group: "homepage.story",
    gridColumn: "col-span-full",
    defaultValue:
      "Evelyn Pinkard started PinkArt LLC out of a spare room in Detroit. Every doll and every magnet still gets made the same way — one at a time, at the same table.",
    description: "Paragraph under the pull-quote.",
  },
];

// ── Aggregated export ───────────────────────────────────────────────────────

export const pinkHomepageData: TemplateField[] = [
  ...homepageHeroData,
  ...homepagePromisesData,
  ...homepageCollectionData,
  ...homepageEventsData,
  ...homepageStoryData,
];

export const pinkHomepageFieldGroups: TemplateFieldGroup[] = [
  {
    id: "homepage.hero",
    title: "Hero",
    description:
      "Full-viewport ink hero — kicker, two-line headline, body, CTAs, background image, and the four-panel parallax strip",
    icon: "🏰",
    columns: 2,
  } satisfies TemplateFieldGroup,
  {
    id: "homepage.promises",
    title: "Promises",
    description: "Three short, plain-spoken promises shown in a hairline grid",
    icon: "🪡",
    columns: 2,
  } satisfies TemplateFieldGroup,
  {
    id: "homepage.collection",
    title: "Featured Collection",
    description: "Heading and CTAs framing your featured products",
    icon: "🧵",
    columns: 2,
  } satisfies TemplateFieldGroup,
  {
    id: "homepage.events",
    title: "Make & Takes",
    description:
      "The workshop band — your photos and fliers, what a make & take is, how they're hosted, and one enquiry CTA",
    icon: "🪡",
    columns: 2,
  } satisfies TemplateFieldGroup,
  {
    id: "homepage.story",
    title: "The Artist",
    description: "Portrait, pull-quote, body copy and a small stat row",
    icon: "✍️",
    columns: 2,
  } satisfies TemplateFieldGroup,
];

export const pinkHomepageSections: TemplateSection[] = [
  {
    id: "homepage.hero",
    page: "homepage",
    title: "Hero",
    description: "Full-viewport hero with the four-panel parallax strip",
    groupIds: ["homepage.hero"],
    order: 0,
    hideable: false,
  },
  {
    id: "homepage.promises",
    page: "homepage",
    title: "Promises",
    description: "Hairline grid of three short promises",
    groupIds: ["homepage.promises"],
    order: 1,
    hideable: true,
  },
  {
    id: "homepage.collection",
    page: "homepage",
    title: "Featured Collection",
    description: "Featured products from the shop",
    groupIds: ["homepage.collection"],
    order: 2,
    hideable: true,
  },
  {
    id: "homepage.events",
    page: "homepage",
    title: "Make & Takes",
    description: "Photo/flier mosaic, how they're hosted, and the enquiry CTA",
    groupIds: ["homepage.events"],
    order: 3,
    hideable: true,
  },
  {
    id: "homepage.story",
    page: "homepage",
    title: "The Artist",
    description: "Portrait, pull-quote and stat row",
    groupIds: ["homepage.story"],
    order: 4,
    hideable: true,
  },
];
