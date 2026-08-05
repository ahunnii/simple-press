import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";

/**
 * Homepage fields for the `pink` template.
 *
 * Authority: docs/templates/pink/design.md → "Per-page section concepts →
 * Homepage". Seven sections: hero (signature moment, not hideable), promises,
 * collection, events (the make & takes — an evergreen explainer driven by list
 * fields, deliberately date-free), upcoming (real dated `Event` records from
 * the DB), videos (real `Video` records from the DB), and story.
 *
 * `homepage.upcoming` and `homepage.events` are separate sections on purpose
 * and must stay separately hideable: one says WHEN you can come, the other
 * says WHAT a make & take is.
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
    label: "Family Home Photo",
    description:
      "The family home where it all began — washed into the hero background behind the wordmark, not shown as a standalone tile.",
    type: "image",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
    defaultValue: "/templates/pink/images/hero-family-home.webp",
  },
  {
    key: "pink.homepage.hero-wordmark-accent",
    label: "Wordmark — First Half",
    description:
      "The first half of the giant two-part wordmark that anchors the hero. While both halves are left at their defaults (\"PINK\" / \"ART\") the hero shows the PinkArt logo's actual traced letterforms; typing anything else switches the wordmark to live text set in the display font, in the accent color.",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "PINK",
  },
  {
    key: "pink.homepage.hero-wordmark-ink",
    label: "Wordmark — Second Half",
    description:
      "The second half of the wordmark. While both halves are left at their defaults (\"PINK\" / \"ART\") the hero shows the PinkArt logo's actual traced letterforms; typing anything else switches the wordmark to live text set in the display font, in the ink color.",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "ART",
  },
  {
    key: "pink.homepage.hero-maker-1",
    label: "Maker — Left",
    description:
      "A person holding what they made at a make & take, standing at the hero's left. A photo with its background removed (transparent PNG/WebP) works best — the lower part sinks behind the bottom band.",
    type: "image",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
    defaultValue: "/templates/pink/images/hero-maker-1.webp",
  },
  {
    key: "pink.homepage.hero-maker-1-alt",
    label: "Maker — Left (photo description)",
    description:
      "Read aloud by screen readers; describe the person and what they're holding.",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
    defaultValue:
      "A workshop guest smiling and holding up the collaged art journal she made at a make & take.",
  },
  {
    key: "pink.homepage.hero-maker-2",
    label: "Maker — Center",
    description:
      "A person holding what they made at a make & take, standing at the hero's center. A photo with its background removed (transparent PNG/WebP) works best — the lower part sinks behind the bottom band.",
    type: "image",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
    defaultValue: "/templates/pink/images/hero-maker-2.webp",
  },
  {
    key: "pink.homepage.hero-maker-2-alt",
    label: "Maker — Center (photo description)",
    description:
      "Read aloud by screen readers; describe the person and what they're holding.",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
    defaultValue:
      "A maker in sunglasses holding up her finished fabric-collage affirmation board outside a make & take.",
  },
  {
    key: "pink.homepage.hero-maker-3",
    label: "Maker — Right",
    description:
      "A person holding what they made at a make & take, standing at the hero's right. A photo with its background removed (transparent PNG/WebP) works best — the lower part sinks behind the bottom band.",
    type: "image",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
    defaultValue: "/templates/pink/images/hero-maker-3.webp",
  },
  {
    key: "pink.homepage.hero-maker-3-alt",
    label: "Maker — Right (photo description)",
    description:
      "Read aloud by screen readers; describe the person and what they're holding.",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
    defaultValue:
      "A guest at an Idlewild make & take holding the wide collage panel she finished, honoring Black women in history.",
  },
  {
    key: "pink.homepage.hero-maker-4",
    label: "Maker — Far Left",
    description:
      "A person holding what they made at a make & take, standing at the hero's far left, outside the trio. A photo with its background removed (transparent PNG/WebP) works best — the lower part sinks behind the bottom band. Hidden on phones — five figures cannot fit that narrow a stage.",
    type: "image",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
    defaultValue: "/templates/pink/images/hero-maker-4.webp",
  },
  {
    key: "pink.homepage.hero-maker-4-alt",
    label: "Maker — Far Left (photo description)",
    description:
      "Read aloud by screen readers; describe the person and what they're holding.",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
    defaultValue:
      "A guest in her 'Dream Often' shirt holding the collage board she made at a make & take.",
  },
  {
    key: "pink.homepage.hero-maker-5",
    label: "Maker — Far Right",
    description:
      "A person holding what they made at a make & take, standing at the hero's far right, outside the trio. A photo with its background removed (transparent PNG/WebP) works best — the lower part sinks behind the bottom band. Hidden on phones — five figures cannot fit that narrow a stage.",
    type: "image",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
    defaultValue: "/templates/pink/images/hero-maker-5.webp",
  },
  {
    key: "pink.homepage.hero-maker-5-alt",
    label: "Maker — Far Right (photo description)",
    description:
      "Read aloud by screen readers; describe the person and what they're holding.",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
    defaultValue:
      "A maker holding up the orange collage banner she finished at an Idlewild make & take.",
  },
  {
    key: "pink.homepage.hero-doll-1",
    label: "Corner Doll — Top Left",
    description:
      "Small tilted doll cutout pinned in the hero's top-left corner like taped-up artwork. Hidden on phones; a photo with its background removed (transparent PNG/WebP) works best.",
    type: "image",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
    defaultValue: "/templates/pink/images/hero-doll-mudcloth.webp",
  },
  {
    key: "pink.homepage.hero-doll-2",
    label: "Corner Doll — Top Right",
    description:
      "Small tilted doll cutout pinned in the hero's top-right corner like taped-up artwork. Hidden on phones; a photo with its background removed (transparent PNG/WebP) works best.",
    type: "image",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
    defaultValue: "/templates/pink/images/hero-doll-red.webp",
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

// ── homepage.upcoming ───────────────────────────────────────────────────────

const homepageUpcomingData: TemplateField[] = [
  {
    key: "pink.homepage.upcoming-eyebrow",
    label: "Eyebrow",
    description: "Small uppercase line above the heading.",
    type: "text",
    page: "homepage",
    group: "homepage.upcoming",
    gridColumn: "col-span-1",
    defaultValue: "On the calendar",
  },
  {
    key: "pink.homepage.upcoming-heading",
    label: "Heading",
    description: "Heading for the row of real, dated events.",
    type: "text",
    page: "homepage",
    group: "homepage.upcoming",
    gridColumn: "col-span-1",
    defaultValue: "What's coming up",
  },
  {
    key: "pink.homepage.upcoming-note",
    label: "Lead-In",
    description:
      "One short line under the heading. Hidden automatically while nothing is scheduled.",
    type: "textarea",
    page: "homepage",
    group: "homepage.upcoming",
    gridColumn: "col-span-full",
    defaultValue: "The next few dates. Tap a flier to see it full size.",
  },
  {
    key: "pink.homepage.upcoming-limit",
    label: "How Many To Show",
    description:
      "How many upcoming dates to put on the homepage. Three fills the row; anything over six is capped.",
    type: "number",
    page: "homepage",
    group: "homepage.upcoming",
    gridColumn: "col-span-1",
    defaultValue: "3",
    placeholder: "3",
  },
  {
    key: "pink.homepage.upcoming-cta-label",
    label: "“See All” Label",
    description:
      "Link beside the heading, through to the full events page. Leave blank to hide it.",
    type: "text",
    page: "homepage",
    group: "homepage.upcoming",
    gridColumn: "col-span-1",
    defaultValue: "See all events",
  },
  {
    key: "pink.homepage.upcoming-cta-link",
    label: "“See All” Link",
    description: "Where that link goes.",
    type: "url",
    page: "homepage",
    group: "homepage.upcoming",
    gridColumn: "col-span-1",
    defaultValue: "/events",
  },
  {
    key: "pink.homepage.upcoming-empty-heading",
    label: "Empty Heading",
    description:
      "Shown in place of the cards when nothing is scheduled. Clear this and the body to drop the whole band until you add a date.",
    type: "text",
    page: "homepage",
    group: "homepage.upcoming",
    gridColumn: "col-span-1",
    defaultValue: "Nothing on the calendar yet",
  },
  {
    key: "pink.homepage.upcoming-empty-body",
    label: "Empty Body",
    description: "One line under the empty-state heading.",
    type: "textarea",
    page: "homepage",
    group: "homepage.upcoming",
    gridColumn: "col-span-full",
    defaultValue: "New dates go up here as soon as they're set.",
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
      "Five photos — the first shows large; the other four fill the grid around it. The layout is arranged for you.",
    type: "list",
    page: "homepage",
    group: "homepage.events",
    gridColumn: "col-span-full",
    maxItems: 5,
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

// ── homepage.videos ─────────────────────────────────────────────────────────

const homepageVideosData: TemplateField[] = [
  {
    key: "pink.homepage.videos-heading",
    label: "Heading",
    description: "Heading for the row of videos.",
    type: "text",
    page: "homepage",
    group: "homepage.videos",
    gridColumn: "col-span-1",
    defaultValue: "See it happening",
  },
  {
    key: "pink.homepage.videos-note",
    label: "Lead-In",
    description:
      "One short line under the heading. Hidden automatically while there are no videos to describe.",
    type: "textarea",
    page: "homepage",
    group: "homepage.videos",
    gridColumn: "col-span-full",
    defaultValue:
      "Clips from make & takes and the studio table — some ours, some posted by the people who hosted us.",
  },
  {
    key: "pink.homepage.videos-limit",
    label: "How Many To Show",
    description:
      "How many videos to put on the homepage. Three fills the row; anything over six is capped.",
    type: "number",
    page: "homepage",
    group: "homepage.videos",
    gridColumn: "col-span-1",
    defaultValue: "3",
    placeholder: "3",
  },
  {
    key: "pink.homepage.videos-cta-label",
    label: "“See All” Label",
    description:
      "Link beside the heading, through to the full videos page. Leave blank to hide it.",
    type: "text",
    page: "homepage",
    group: "homepage.videos",
    gridColumn: "col-span-1",
    defaultValue: "See all videos",
  },
  {
    key: "pink.homepage.videos-cta-link",
    label: "“See All” Link",
    description: "Where that link goes.",
    type: "url",
    page: "homepage",
    group: "homepage.videos",
    gridColumn: "col-span-1",
    defaultValue: "/videos",
  },
  {
    key: "pink.homepage.videos-empty-heading",
    label: "Empty Heading",
    description:
      "Shown in place of the videos when nothing has been published yet. Clear this and the body to drop the whole band until you add one.",
    type: "text",
    page: "homepage",
    group: "homepage.videos",
    gridColumn: "col-span-1",
    defaultValue: "Nothing up yet",
  },
  {
    key: "pink.homepage.videos-empty-body",
    label: "Empty Body",
    description: "One line under the empty-state heading.",
    type: "textarea",
    page: "homepage",
    group: "homepage.videos",
    gridColumn: "col-span-full",
    defaultValue: "New clips go up here as they're posted.",
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
  ...homepageUpcomingData,
  ...homepageVideosData,
  ...homepageStoryData,
];

export const pinkHomepageFieldGroups: TemplateFieldGroup[] = [
  {
    id: "homepage.hero",
    title: "Hero",
    description:
      "Full-bleed hero — kicker, two-line headline, body, and CTAs over the family home photo washed into the background, with a giant wordmark, five makers holding their finished pieces rising over the bottom band (the outer pair hidden on phones), and two small doll cutouts pinned in the top corners",
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
      "The workshop band — your photos and fliers as a five-photo mosaic, what a make & take is, how they're hosted, and one enquiry CTA",
    icon: "🪡",
    columns: 2,
  } satisfies TemplateFieldGroup,
  {
    id: "homepage.upcoming",
    title: "Upcoming Events",
    description:
      "The next few real dates from your Events list — heading, how many to show, and the empty-state copy",
    icon: "🗓️",
    columns: 2,
  } satisfies TemplateFieldGroup,
  {
    id: "homepage.videos",
    title: "Videos",
    description:
      "The first few videos from your Videos list — heading, how many to show, and the empty-state copy",
    icon: "📺",
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
    description:
      "Washed family home photo background, giant wordmark, five makers holding their finished pieces over the bottom band (the outer pair hidden on phones), and two doll cutouts pinned in the top corners",
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
  // Array position, not just `order`, is what the editor rail renders — this
  // entry sits third so the rail matches the page: the Make & Takes explainer
  // band makes the case first (what a make & take is + hire-me CTA); the dated
  // Upcoming band follows as proof — the actual calendar of sessions.
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
    id: "homepage.upcoming",
    page: "homepage",
    title: "Upcoming Events",
    description: "The next few dated events from your Events list",
    groupIds: ["homepage.upcoming"],
    order: 4,
    hideable: true,
  },
  // Below the Make & Takes and Upcoming bands, not above them: the clips are
  // the evidence for the claims those bands make, so the page argues and then
  // shows.
  {
    id: "homepage.videos",
    page: "homepage",
    title: "Videos",
    description: "The first few videos from your Videos list",
    groupIds: ["homepage.videos"],
    order: 5,
    hideable: true,
  },
  {
    id: "homepage.story",
    page: "homepage",
    title: "The Artist",
    description: "Portrait, pull-quote and stat row",
    groupIds: ["homepage.story"],
    order: 6,
    hideable: true,
  },
];
