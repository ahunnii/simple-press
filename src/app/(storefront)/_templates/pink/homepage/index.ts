import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";
import { SECTION_LINKS } from "~/lib/section-links";

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
    label: "Small label",
    description:
      "Short line above the headline, shown in the brighter of the hero's two text colors.",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "Sewn one at a time",
  },
  {
    key: "pink.homepage.hero-kicker-trailing",
    label: "Small label — second part",
    description:
      "Continues the small label above, e.g. 'in a Detroit studio.' Leave blank to show only the first part.",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "in a Detroit studio.",
  },
  {
    key: "pink.homepage.hero-heading-line-1",
    label: "Headline — line 1",
    description: "First line of the hero headline.",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "Made to be",
  },
  {
    key: "pink.homepage.hero-heading-line-2",
    label: "Headline — line 2 (accent)",
    description: "Second line of the hero headline, shown in the accent color.",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "kept.",
  },
  {
    key: "pink.homepage.hero-body",
    label: "Body text",
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
    label: "Button text",
    description: "Text on the hero's main button.",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "Shop the collection",
  },
  {
    key: "pink.homepage.hero-cta-primary-link",
    label: "Button link",
    type: "url",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "/shop",
    description: "Where the main button goes.",
  },
  {
    key: "pink.homepage.hero-cta-secondary-label",
    label: "Button text — second button",
    description:
      "Text on the hero's second, outlined button. Leave blank to hide it.",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "See the make & takes",
  },
  {
    key: "pink.homepage.hero-cta-secondary-link",
    label: "Button link — second button",
    type: "url",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "#make-and-takes",
    description: "Where the second button goes.",
  },
  {
    key: "pink.homepage.hero-image",
    label: "Family home photo",
    description:
      "The family home where it all began, washed into the hero background behind the wordmark. Not shown as a standalone image.",
    type: "image",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
    defaultValue: "/templates/pink/images/hero-family-home.webp",
  },
  {
    key: "pink.homepage.hero-maker-1",
    label: "Maker — left",
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
    label: "Maker — left (photo description)",
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
    label: "Maker — center",
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
    label: "Maker — center (photo description)",
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
    label: "Maker — right",
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
    label: "Maker — right (photo description)",
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
    label: "Maker — far left",
    description:
      "A person holding what they made at a make & take, standing at the hero's far left, outside the trio. A photo with its background removed (transparent PNG/WebP) works best — the lower part sinks behind the bottom band. Shown on desktop only — five figures cannot fit a phone or tablet stage, which keep the middle three.",
    type: "image",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
    defaultValue: "/templates/pink/images/hero-maker-4.webp",
  },
  {
    key: "pink.homepage.hero-maker-4-alt",
    label: "Maker — far left (photo description)",
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
    label: "Maker — far right",
    description:
      "A person holding what they made at a make & take, standing at the hero's far right, outside the trio. A photo with its background removed (transparent PNG/WebP) works best — the lower part sinks behind the bottom band. Shown on desktop only — five figures cannot fit a phone or tablet stage, which keep the middle three.",
    type: "image",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
    defaultValue: "/templates/pink/images/hero-maker-5.webp",
  },
  {
    key: "pink.homepage.hero-maker-5-alt",
    label: "Maker — far right (photo description)",
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
    label: "Corner doll — top left",
    description:
      "Small tilted doll cutout pinned in the hero's top-left corner like taped-up artwork — smaller and cropped by the edge on phones. A photo with its background removed (transparent PNG/WebP) works best.",
    type: "image",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
    defaultValue: "/templates/pink/images/hero-doll-mudcloth.webp",
  },
  {
    key: "pink.homepage.hero-doll-2",
    label: "Corner doll — top right",
    description:
      "Small tilted doll cutout pinned in the hero's top-right corner like taped-up artwork — smaller and cropped by the edge on phones. A photo with its background removed (transparent PNG/WebP) works best.",
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
    label: "Promise cards",
    description:
      "Short promises shown in a grid of up to 6 cards — the plain facts a new visitor should know. Leave empty to use the defaults.",
    type: "list",
    page: "homepage",
    group: "homepage.promises",
    gridColumn: "col-span-full",
    maxItems: 6,
    itemLabel: "promise",
    defaultsWhenEmpty: true,
    itemSchema: [
      {
        key: "title",
        label: "Title",
        type: "text",
        description: "Short heading for the promise.",
        placeholder: "e.g. One of a kind",
      },
      {
        key: "body",
        label: "Body",
        type: "textarea",
        description: "One sentence explaining the promise.",
        placeholder: "e.g. Every piece is made on its own, never in runs.",
      },
    ],
    defaultValue: "",
  },
];

// ── homepage.collection ─────────────────────────────────────────────────────

const homepageCollectionData: TemplateField[] = [
  {
    key: "pink.homepage.collection-heading",
    label: "Heading",
    type: "text",
    page: "homepage",
    group: "homepage.collection",
    gridColumn: "col-span-1",
    defaultValue: "New from the table",
    description: "Heading above the product grid.",
  },
  {
    key: "pink.homepage.collection-note",
    label: "Note",
    description:
      "Short line beside the heading, aligned to the opposite side. Leave blank to hide.",
    type: "text",
    page: "homepage",
    group: "homepage.collection",
    gridColumn: "col-span-full",
    defaultValue: "One of a kind. Once a piece is gone, it's gone.",
  },
  {
    key: "pink.homepage.collection-cta-label",
    label: "Button text",
    type: "text",
    page: "homepage",
    group: "homepage.collection",
    gridColumn: "col-span-1",
    defaultValue: "See all pieces",
    description:
      "Centered button below the product grid. Leave blank to hide it.",
  },
  {
    key: "pink.homepage.collection-cta-link",
    label: "Button link",
    type: "url",
    page: "homepage",
    group: "homepage.collection",
    gridColumn: "col-span-1",
    defaultValue: "/shop",
    description: "Where the button goes.",
  },
];

// ── homepage.upcoming ───────────────────────────────────────────────────────

const homepageUpcomingData: TemplateField[] = [
  {
    key: "pink.homepage.upcoming-eyebrow",
    label: "Small label",
    description: "Short line above the heading.",
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
    label: "Intro text",
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
    label: "How many to show",
    description:
      "How many upcoming dates to put on the homepage. Three fills the row; anything over six is capped.",
    type: "number",
    page: "homepage",
    group: "homepage.upcoming",
    gridColumn: "col-span-1",
    defaultValue: "3",
    min: 1,
    max: 6,
    step: 1,
  },
  {
    key: "pink.homepage.upcoming-cta-label",
    label: "Link text",
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
    label: "Link target",
    description: "Where that link goes.",
    type: "url",
    page: "homepage",
    group: "homepage.upcoming",
    gridColumn: "col-span-1",
    defaultValue: "/events",
  },
  {
    key: "pink.homepage.upcoming-empty-heading",
    label: "Heading — nothing scheduled",
    description:
      "Shown in place of the cards when nothing is scheduled. Clear this and the body below to drop the whole section until you add a date.",
    type: "text",
    page: "homepage",
    group: "homepage.upcoming",
    gridColumn: "col-span-1",
    defaultValue: "Nothing on the calendar yet",
  },
  {
    key: "pink.homepage.upcoming-empty-body",
    label: "Body text — nothing scheduled",
    description: "One line under the heading above.",
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
    label: "Heading",
    type: "text",
    page: "homepage",
    group: "homepage.events",
    gridColumn: "col-span-1",
    defaultValue: "Come sit at the table",
    description: "Heading for the make & takes section.",
  },
  {
    key: "pink.homepage.events-note",
    label: "Intro text",
    description: "One short line under the heading.",
    type: "textarea",
    page: "homepage",
    group: "homepage.events",
    gridColumn: "col-span-full",
    defaultValue: "Small groups, all materials included. No experience needed.",
  },
  {
    key: "pink.homepage.events-body",
    label: "Body text",
    description:
      "A short paragraph explaining what actually happens at a make & take. This is the only place on the homepage that says what you are offering, so keep it plain.",
    type: "textarea",
    page: "homepage",
    group: "homepage.events",
    gridColumn: "col-span-full",
    defaultValue:
      "A make & take is a hands-on session brought to your room — a church, a school, a library, a workplace, a back yard. Everyone at the table sews, stuffs and finishes a small piece by hand, and leaves holding it. Nobody needs to have sewn a stitch before.",
  },
  {
    key: "pink.homepage.events-mosaic",
    label: "Photos and fliers",
    description:
      "Up to 5 photos in a fixed layout — the first shows large, the other four fill the grid around it.",
    type: "list",
    page: "homepage",
    group: "homepage.events",
    gridColumn: "col-span-full",
    maxItems: 5,
    itemLabel: "photo",
    itemSchema: [
      {
        key: "image",
        label: "Image",
        type: "image",
        description: "One photo or flier for the grid.",
      },
      {
        key: "alt",
        label: "Alt text",
        type: "text",
        description:
          "Read aloud by screen readers. Fliers carry words, so if it says the date and the room, say that here too.",
        placeholder: "Describe the photo, or read out what the flier says",
        optional: true,
      },
    ],
    defaultValue: "",
  },
  {
    key: "pink.homepage.events-facts",
    label: "How they're hosted",
    description:
      "Up to 4 label/value rows describing how a make & take typically runs — where, group size, what's included. Leave empty to use the defaults.",
    type: "list",
    page: "homepage",
    group: "homepage.events",
    gridColumn: "col-span-full",
    maxItems: 4,
    itemLabel: "fact",
    defaultsWhenEmpty: true,
    itemSchema: [
      {
        key: "label",
        label: "Label",
        type: "text",
        description: "Short name for the fact, e.g. 'Where'.",
        placeholder: "e.g. Where",
      },
      {
        key: "value",
        label: "Value",
        type: "text",
        description: "The fact itself.",
        placeholder:
          "e.g. Your space — school, church, library, workplace or back yard",
      },
    ],
    defaultValue: "",
  },
  {
    key: "pink.homepage.events-cta-note",
    label: "Note — button",
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
    label: "Button text",
    description: "Leave blank to hide the button.",
    type: "text",
    page: "homepage",
    group: "homepage.events",
    gridColumn: "col-span-1",
    defaultValue: "Ask about hosting one",
  },
  {
    key: "pink.homepage.events-cta-link",
    label: "Button link",
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
    label: "Intro text",
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
    label: "How many to show",
    description:
      "How many videos to put on the homepage. Three fills the row; anything over six is capped.",
    type: "number",
    page: "homepage",
    group: "homepage.videos",
    gridColumn: "col-span-1",
    defaultValue: "3",
    min: 1,
    max: 6,
    step: 1,
  },
  {
    key: "pink.homepage.videos-cta-label",
    label: "Link text",
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
    label: "Link target",
    description: "Where that link goes.",
    type: "url",
    page: "homepage",
    group: "homepage.videos",
    gridColumn: "col-span-1",
    defaultValue: "/videos",
  },
  {
    key: "pink.homepage.videos-empty-heading",
    label: "Heading — nothing posted",
    description:
      "Shown in place of the videos when nothing has been published yet. Clear this and the body below to drop the whole section until you add one.",
    type: "text",
    page: "homepage",
    group: "homepage.videos",
    gridColumn: "col-span-1",
    defaultValue: "Nothing up yet",
  },
  {
    key: "pink.homepage.videos-empty-body",
    label: "Body text — nothing posted",
    description: "One line under the heading above.",
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
    label: "Image",
    description: "Portrait image beside the pull-quote — a studio or working photo.",
    type: "image",
    page: "homepage",
    group: "homepage.story",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "pink.homepage.story-image-alt",
    label: "Image alt text",
    type: "text",
    page: "homepage",
    group: "homepage.story",
    gridColumn: "col-span-full",
    defaultValue: "Evelyn Pinkard working at her studio table in Detroit.",
    description: "Read aloud by screen readers to describe the image above.",
  },
  {
    key: "pink.homepage.story-quote-before",
    label: "Pull-quote — before",
    description: "Text before the accent word.",
    type: "text",
    page: "homepage",
    group: "homepage.story",
    gridColumn: "col-span-1",
    defaultValue: "Every piece is made",
  },
  {
    key: "pink.homepage.story-quote-accent",
    label: "Pull-quote — accent word",
    description: "One word shown in the accent color.",
    type: "text",
    page: "homepage",
    group: "homepage.story",
    gridColumn: "col-span-1",
    defaultValue: "slow",
  },
  {
    key: "pink.homepage.story-quote-after",
    label: "Pull-quote — after",
    description: "Text after the accent word.",
    type: "text",
    page: "homepage",
    group: "homepage.story",
    gridColumn: "col-span-1",
    defaultValue: "on purpose.",
  },
  {
    key: "pink.homepage.story-body",
    label: "Body text",
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
      "Full-width hero — small label, two-line headline, body, and buttons over the family home photo washed into the background, with a giant wordmark, five makers holding their finished pieces rising over the bottom band (the outer pair on desktop only), and two small doll cutouts pinned in the top corners. The wordmark itself isn't set here — it follows your business name (Settings → General) split on the accent word in the global Branding group, same as the header and footer.",
    icon: "🏰",
    columns: 2,
  } satisfies TemplateFieldGroup,
  {
    id: "homepage.promises",
    title: "Promises",
    description: "Three short, plain-spoken promises shown in a grid.",
    icon: "🪡",
    columns: 2,
  } satisfies TemplateFieldGroup,
  {
    id: "homepage.collection",
    title: "Featured collection",
    description: "Heading and buttons framing your featured products.",
    icon: "🧵",
    columns: 2,
  } satisfies TemplateFieldGroup,
  {
    id: "homepage.events",
    title: "Make & takes",
    description:
      "The workshop section — your photos and fliers, what a make & take is, how they're hosted, and one enquiry button.",
    icon: "🪡",
    columns: 2,
  } satisfies TemplateFieldGroup,
  {
    id: "homepage.upcoming",
    title: "Upcoming events",
    description:
      "The next few real dates from your Events list — heading, how many to show, and the empty-state copy.",
    icon: "🗓️",
    columns: 2,
  } satisfies TemplateFieldGroup,
  {
    id: "homepage.videos",
    title: "Videos",
    description:
      "The first few videos from your Videos list — heading, how many to show, and the empty-state copy.",
    icon: "📺",
    columns: 2,
  } satisfies TemplateFieldGroup,
  {
    id: "homepage.story",
    title: "The artist",
    description: "Portrait, pull-quote and body copy.",
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
      "Washed family home photo background, giant wordmark, five makers holding their finished pieces over the bottom band (the outer pair on desktop only), and two doll cutouts pinned in the top corners",
    groupIds: ["homepage.hero"],
    order: 0,
    hideable: false,
  },
  {
    id: "homepage.promises",
    page: "homepage",
    title: "Promises",
    description: "Grid of three short promises",
    groupIds: ["homepage.promises"],
    order: 1,
    hideable: true,
  },
  {
    id: "homepage.collection",
    page: "homepage",
    title: "Featured collection",
    description: "Featured products from the shop",
    groupIds: ["homepage.collection"],
    order: 2,
    hideable: true,
    links: [SECTION_LINKS.products],
  },
  // Array position, not just `order`, is what the editor rail renders — this
  // entry sits third so the rail matches the page: the Make & Takes explainer
  // band makes the case first (what a make & take is + hire-me CTA); the dated
  // Upcoming band follows as proof — the actual calendar of sessions.
  {
    id: "homepage.events",
    page: "homepage",
    title: "Make & takes",
    description: "Photo/flier layout, how they're hosted, and the enquiry button",
    groupIds: ["homepage.events"],
    order: 3,
    hideable: true,
  },
  {
    id: "homepage.upcoming",
    page: "homepage",
    title: "Upcoming events",
    description: "The next few dated events from your Events list",
    groupIds: ["homepage.upcoming"],
    order: 4,
    hideable: true,
    links: [SECTION_LINKS.events],
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
    links: [SECTION_LINKS.videos],
  },
  {
    id: "homepage.story",
    page: "homepage",
    title: "The artist",
    description: "Portrait, pull-quote and body copy",
    groupIds: ["homepage.story"],
    order: 6,
    hideable: true,
  },
];
