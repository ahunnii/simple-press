import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";
import { SECTION_LINKS } from "~/lib/section-links";

/**
 * Field + section definitions for the wealth homepage (2026-10-12 redesign).
 *
 * Section order (== group order == render order):
 *   mission (split hero) · intro · programs · quotes · stats · coops · news ·
 *   support.
 *
 * Copy defaults are DCWF's real copy (verbatim from the compiled site clone
 * `detroitcommunitywealth/app/src/app/page.tsx` and the approved mock
 * `checkpoint/redesign/_pages/home.body.html`). Image defaults point at the
 * real `/templates/wealth/images/*` assets.
 *
 * Two lists:
 * - `homepage.news-items` (press fallback rows) intentionally carries no
 *   `defaultValue`; its fallback rows live in `./wealth-homepage-news.ts`.
 * - `homepage.stats-items` ships NO rows at all: the By-the-numbers section
 *   renders only once the owner enters a real figure (no sample numbers).
 *
 * Runtime parsers for both lists live in `./wealth-homepage-news.ts` and
 * `./wealth-homepage-rows.ts` — NOT here — so this module stays type-only
 * toward `~/lib/template-fields` (a runtime import would be circular: that
 * module aggregates every template's root `index.ts`, which imports this one).
 * `~/lib/section-links` is a leaf module and safe to import.
 *
 * `**double asterisks**` markup is supported in the intro paragraph and the
 * cooperative footnote (see `./wealth-bold-markup.tsx`); those two fields say
 * so in their descriptions.
 */

// ─── Split hero (not hideable) ──────────────────────────────────────────────

const missionData: TemplateField[] = [
  {
    key: "wealth.homepage.mission-image",
    label: "Photo",
    description:
      "Large photo on the left of the opening banner. It is tinted green so the text beside it stays readable.",
    type: "image",
    page: "homepage",
    group: "homepage.mission",
    gridColumn: "col-span-full",
    defaultValue: "/templates/wealth/images/mission-hero.png",
  },
  {
    key: "wealth.homepage.mission-image-alt",
    label: "Photo alt text",
    description: "Describes the photo for screen readers.",
    type: "text",
    page: "homepage",
    group: "homepage.mission",
    gridColumn: "col-span-full",
    defaultValue:
      "Members of the Detroit Community Wealth Fund community gathered around a table",
  },
  {
    key: "wealth.homepage.mission-eyebrow",
    label: "Label above statement",
    description: "Small label above the mission statement.",
    type: "text",
    page: "homepage",
    group: "homepage.mission",
    gridColumn: "col-span-1",
    defaultValue: "Our Mission",
  },
  {
    key: "wealth.homepage.mission-statement",
    label: "Mission statement",
    description: "The organization's mission statement, set in italic.",
    type: "textarea",
    page: "homepage",
    group: "homepage.mission",
    gridColumn: "col-span-full",
    defaultValue:
      "DCWF exists to build equitable employment and community-controlled wealth among Black and historically marginalized Detroiters through accessible financing and ongoing support.",
  },
  {
    key: "wealth.homepage.mission-cta-label",
    label: "Button label",
    description: "Label for the button under the mission statement.",
    type: "text",
    page: "homepage",
    group: "homepage.mission",
    gridColumn: "col-span-1",
    defaultValue: "Learn more",
  },
  {
    key: "wealth.homepage.mission-cta-url",
    label: "Button link",
    description:
      "Where the button goes. The button hides if this points at a part of the site that is switched off.",
    type: "url",
    page: "homepage",
    group: "homepage.mission",
    gridColumn: "col-span-1",
    defaultValue: "/about",
  },
  {
    key: "wealth.homepage.mission-link-label",
    label: "Second link label",
    description:
      "Text link beside the button. Leave blank to show only the button.",
    type: "text",
    page: "homepage",
    group: "homepage.mission",
    gridColumn: "col-span-1",
    defaultValue: "Our programs",
  },
  {
    key: "wealth.homepage.mission-link-url",
    label: "Second link address",
    description:
      "Where the text link goes. It hides if this points at a part of the site that is switched off.",
    type: "url",
    page: "homepage",
    group: "homepage.mission",
    gridColumn: "col-span-1",
    defaultValue: "/services",
  },
];

// ─── Intro (hideable) ───────────────────────────────────────────────────────

const introData: TemplateField[] = [
  {
    key: "wealth.homepage.intro-eyebrow",
    label: "Label above heading",
    description: "Small label centered above the heading. Leave blank to hide.",
    type: "text",
    page: "homepage",
    group: "homepage.intro",
    gridColumn: "col-span-1",
    defaultValue: "What we do",
  },
  {
    key: "wealth.homepage.intro-heading",
    label: "Heading",
    description: "Italic heading above the introduction.",
    type: "text",
    page: "homepage",
    group: "homepage.intro",
    gridColumn: "col-span-full",
    defaultValue: "Building community-controlled wealth",
  },
  {
    // Key predates the redesign (it used to sit in "Our Programs"); kept so
    // saved owner copy carries over.
    key: "wealth.homepage.programs-intro",
    label: "Introduction",
    description:
      "Short paragraph under the heading. Wrap a phrase in **double asterisks** to make it bold, for example **non-extractive financing**.",
    type: "textarea",
    page: "homepage",
    group: "homepage.intro",
    gridColumn: "col-span-full",
    defaultValue:
      "We provide **non-extractive financing** for start-ups, existing businesses, and for **ownership transitions**. We also run ongoing workshops and an annual **Co-op Incubator**, and opportunities for co-ops to **build community with one another**.",
  },
];

// ─── Programs: 4 cards + cooperative footnote (hideable) ────────────────────

const programsData: TemplateField[] = [
  // Card 1 — forest
  {
    key: "wealth.homepage.programs-tile-lending-label",
    label: "Card 1 title",
    description: "Title of the first program card.",
    type: "text",
    page: "homepage",
    group: "homepage.programs",
    gridColumn: "col-span-1",
    defaultValue: "Non-Extractive Financing",
  },
  {
    key: "wealth.homepage.programs-tile-lending-copy",
    label: "Card 1 description",
    description: "One or two sentences under the first card's title.",
    type: "textarea",
    page: "homepage",
    group: "homepage.programs",
    gridColumn: "col-span-full",
    defaultValue:
      "Loans for start-ups, existing businesses and ownership transitions, on terms built around the business — not the lender.",
  },
  {
    key: "wealth.homepage.programs-tile-lending-url",
    label: "Card 1 link",
    description:
      "Where the first card's button goes. The button hides if this points at a part of the site that is switched off.",
    type: "url",
    page: "homepage",
    group: "homepage.programs",
    gridColumn: "col-span-1",
    defaultValue: "/services",
  },
  // Card 2 — primary
  {
    key: "wealth.homepage.programs-tile-incubator-label",
    label: "Card 2 title",
    description: "Title of the second program card.",
    type: "text",
    page: "homepage",
    group: "homepage.programs",
    gridColumn: "col-span-1",
    defaultValue: "Co-op Incubator",
  },
  {
    key: "wealth.homepage.programs-tile-incubator-copy",
    label: "Card 2 description",
    description: "One or two sentences under the second card's title.",
    type: "textarea",
    page: "homepage",
    group: "homepage.programs",
    gridColumn: "col-span-full",
    defaultValue:
      "An annual cohort that takes founding teams from a shared idea to a democratically governed, incorporated business.",
  },
  {
    key: "wealth.homepage.programs-tile-incubator-url",
    label: "Card 2 link",
    description:
      "Where the second card's button goes. The button hides if this points at a part of the site that is switched off.",
    type: "url",
    page: "homepage",
    group: "homepage.programs",
    gridColumn: "col-span-1",
    defaultValue: "/services",
  },
  // Card 3 — sage
  {
    key: "wealth.homepage.programs-tile-transitions-label",
    label: "Card 3 title",
    description: "Title of the third program card.",
    type: "text",
    page: "homepage",
    group: "homepage.programs",
    gridColumn: "col-span-1",
    defaultValue: "Ownership Transitions",
  },
  {
    key: "wealth.homepage.programs-tile-transitions-copy",
    label: "Card 3 description",
    description: "One or two sentences under the third card's title.",
    type: "textarea",
    page: "homepage",
    group: "homepage.programs",
    gridColumn: "col-span-full",
    defaultValue:
      "Helping retiring owners sell to the people who already run the business, so jobs and wealth stay in Detroit.",
  },
  {
    key: "wealth.homepage.programs-tile-transitions-url",
    label: "Card 3 link",
    description:
      "Where the third card's button goes. The button hides if this points at a part of the site that is switched off.",
    type: "url",
    page: "homepage",
    group: "homepage.programs",
    gridColumn: "col-span-1",
    defaultValue: "/services",
  },
  // Card 4 — surface
  {
    key: "wealth.homepage.programs-tile-cend-label",
    label: "Card 4 title",
    description: "Title of the fourth program card.",
    type: "text",
    page: "homepage",
    group: "homepage.programs",
    gridColumn: "col-span-1",
    defaultValue: "CEND",
  },
  {
    key: "wealth.homepage.programs-tile-cend-copy",
    label: "Card 4 description",
    description: "One or two sentences under the fourth card's title.",
    type: "textarea",
    page: "homepage",
    group: "homepage.programs",
    gridColumn: "col-span-full",
    defaultValue:
      "Workshops, gatherings and peer community for Detroit’s cooperators and the people starting the next co-op.",
  },
  {
    key: "wealth.homepage.programs-tile-cend-url",
    label: "Card 4 link",
    description:
      "Where the fourth card's button goes (opens in a new tab when it is a full web address).",
    type: "url",
    page: "homepage",
    group: "homepage.programs",
    gridColumn: "col-span-1",
    defaultValue: "https://www.cendetroit.com/",
  },
  {
    key: "wealth.homepage.programs-cta-label",
    label: "Button label (cards 1–3)",
    description: "Label on the buttons of the first three cards.",
    type: "text",
    page: "homepage",
    group: "homepage.programs",
    gridColumn: "col-span-1",
    defaultValue: "Learn more",
  },
  {
    key: "wealth.homepage.programs-cend-cta-label",
    label: "Button label (card 4)",
    description: "Label on the fourth card's button.",
    type: "text",
    page: "homepage",
    group: "homepage.programs",
    gridColumn: "col-span-1",
    defaultValue: "Visit CEND",
  },
  // Footnote
  {
    key: "wealth.homepage.cooperative-heading",
    label: "Footnote lead-in",
    description:
      "Bold words that open the line under the cards. Leave blank to start with the text below.",
    type: "text",
    page: "homepage",
    group: "homepage.programs",
    gridColumn: "col-span-1",
    defaultValue: "What Is a Cooperative?",
  },
  {
    key: "wealth.homepage.cooperative-body",
    label: "Footnote text",
    description:
      "Definition shown under the cards. Wrap a phrase in **double asterisks** to make it bold. Leave blank to hide the whole footnote.",
    type: "textarea",
    page: "homepage",
    group: "homepage.programs",
    gridColumn: "col-span-full",
    defaultValue:
      "Cooperatives are **people-centered enterprises** owned, controlled and run by and for their members to realize their common economic, social, and cultural needs and aspirations. (ica.coop)",
  },
  {
    key: "wealth.homepage.cooperative-link-label",
    label: "Footnote link label",
    description: "Label for the link at the end of the footnote.",
    type: "text",
    page: "homepage",
    group: "homepage.programs",
    gridColumn: "col-span-1",
    defaultValue: "Resources »",
  },
  {
    key: "wealth.homepage.cooperative-link-url",
    label: "Footnote link address",
    description:
      "Where the footnote link goes. It hides if this points at a part of the site that is switched off.",
    type: "url",
    page: "homepage",
    group: "homepage.programs",
    gridColumn: "col-span-1",
    defaultValue: "/resources",
  },
];

// ─── From our co-ops: approved testimonials (hideable) ──────────────────────

const quotesData: TemplateField[] = [
  {
    key: "wealth.homepage.quotes-eyebrow",
    label: "Label above heading",
    description: "Small label above the heading. Leave blank to hide.",
    type: "text",
    page: "homepage",
    group: "homepage.quotes",
    gridColumn: "col-span-1",
    defaultValue: "In their words",
  },
  {
    key: "wealth.homepage.quotes-heading",
    label: "Heading",
    description:
      "Heading above the quotes. The quotes themselves are your approved testimonials (Admin → Testimonials); the section stays hidden until you have at least one.",
    type: "text",
    page: "homepage",
    group: "homepage.quotes",
    gridColumn: "col-span-1",
    defaultValue: "From our co-ops",
  },
];

// ─── By the numbers: stats split (hideable; hidden until a figure exists) ───

const statsData: TemplateField[] = [
  {
    key: "wealth.homepage.band-image",
    label: "Photo",
    description:
      "Community-event photo beside the numbers. It is toned to match the site's greens.",
    type: "image",
    page: "homepage",
    group: "homepage.stats",
    gridColumn: "col-span-full",
    defaultValue: "/templates/wealth/images/event-band.jpg",
  },
  {
    key: "wealth.homepage.band-image-alt",
    label: "Photo alt text",
    description: "Describes the photo for screen readers.",
    type: "text",
    page: "homepage",
    group: "homepage.stats",
    gridColumn: "col-span-full",
    defaultValue: "Community members gathered at a DCWF event",
  },
  {
    key: "wealth.homepage.stats-eyebrow",
    label: "Label above heading",
    description: "Small label above the heading. Leave blank to hide.",
    type: "text",
    page: "homepage",
    group: "homepage.stats",
    gridColumn: "col-span-1",
    defaultValue: "By the numbers",
  },
  {
    key: "wealth.homepage.stats-heading",
    label: "Heading",
    description: "Large italic heading above the numbers.",
    type: "text",
    page: "homepage",
    group: "homepage.stats",
    gridColumn: "col-span-1",
    defaultValue: "Capital that stays in Detroit.",
  },
  {
    key: "wealth.homepage.stats-items",
    label: "Numbers",
    description:
      "Up to 3 figures, each a big number and a short caption. This section stays hidden until at least one number is entered, so nothing placeholder ever shows on your site.",
    type: "list",
    page: "homepage",
    group: "homepage.stats",
    gridColumn: "col-span-full",
    maxItems: 3,
    itemLabel: "number",
    summaryKey: "value",
    itemSchema: [
      {
        key: "value",
        label: "Number",
        type: "text",
        placeholder: "e.g. a dollar amount, a count, or a percentage",
      },
      {
        key: "caption",
        label: "Caption",
        type: "text",
        placeholder: "What the number measures",
        optional: true,
      },
    ],
  },
  {
    key: "wealth.homepage.stats-link-label",
    label: "Button label",
    description: "Label for the button under the numbers. Leave blank to hide.",
    type: "text",
    page: "homepage",
    group: "homepage.stats",
    gridColumn: "col-span-1",
    defaultValue: "See our impact report",
  },
  {
    key: "wealth.homepage.stats-link-url",
    label: "Button link",
    description: "Where the button goes.",
    type: "url",
    page: "homepage",
    group: "homepage.stats",
    gridColumn: "col-span-1",
    defaultValue: "/impact",
  },
];

// ─── Meet the Co-ops: mirrored overlap card + logo strip (hideable) ─────────

const coopsData: TemplateField[] = [
  {
    key: "wealth.homepage.coops-image",
    label: "Photo",
    description: "Photo beside the Meet the Co-ops card.",
    type: "image",
    page: "homepage",
    group: "homepage.coops",
    gridColumn: "col-span-full",
    defaultValue: "/templates/wealth/images/coops-hero.jpg",
  },
  {
    key: "wealth.homepage.coops-image-alt",
    label: "Photo alt text",
    description: "Describes the photo for screen readers.",
    type: "text",
    page: "homepage",
    group: "homepage.coops",
    gridColumn: "col-span-full",
    defaultValue: "A carpenter working in a co-op woodworking shop",
  },
  {
    key: "wealth.homepage.coops-eyebrow",
    label: "Label above heading",
    description: "Small label above the card's heading. Leave blank to hide.",
    type: "text",
    page: "homepage",
    group: "homepage.coops",
    gridColumn: "col-span-1",
    defaultValue: "Co-ops we support",
  },
  {
    key: "wealth.homepage.coops-heading",
    label: "Heading",
    description: "Large italic heading on the card.",
    type: "text",
    page: "homepage",
    group: "homepage.coops",
    gridColumn: "col-span-1",
    defaultValue: "Meet the Co-ops",
  },
  {
    key: "wealth.homepage.coops-body",
    label: "Description",
    description:
      "Short line under the heading. A new line in this text becomes a line break.",
    type: "textarea",
    page: "homepage",
    group: "homepage.coops",
    gridColumn: "col-span-full",
    defaultValue:
      "Get to know loan recipients and graduates\nof the Co-op Incubator",
  },
  {
    key: "wealth.homepage.coops-button-label",
    label: "Button label",
    description: "Label for the button on the card.",
    type: "text",
    page: "homepage",
    group: "homepage.coops",
    gridColumn: "col-span-1",
    defaultValue: "Meet the Co-ops",
  },
  {
    key: "wealth.homepage.coops-button-url",
    label: "Button link",
    description:
      "Where the button goes. It hides if the Testimonials page is switched off.",
    type: "url",
    page: "homepage",
    group: "homepage.coops",
    gridColumn: "col-span-1",
    defaultValue: "/testimonials",
  },
];

// ─── News & Notes (hideable) ────────────────────────────────────────────────

const newsData: TemplateField[] = [
  {
    key: "wealth.homepage.news-eyebrow",
    label: "Label above heading",
    description: "Small label above the heading. Leave blank to hide.",
    type: "text",
    page: "homepage",
    group: "homepage.news",
    gridColumn: "col-span-1",
    defaultValue: "Stories & press",
  },
  {
    // Key predates the redesign ("In the News"); kept so a saved heading
    // carries over.
    key: "wealth.homepage.news-heading",
    label: "Heading",
    description: "Heading above the three news cards.",
    type: "text",
    page: "homepage",
    group: "homepage.news",
    gridColumn: "col-span-1",
    defaultValue: "News & Notes",
  },
  {
    key: "wealth.homepage.news-link-label",
    label: "All-news link label",
    description:
      "Text link to the full blog, on the right of the heading. Leave blank to hide. It also hides when the Blog is switched off.",
    type: "text",
    page: "homepage",
    group: "homepage.news",
    gridColumn: "col-span-1",
    defaultValue: "All news",
  },
  {
    key: "wealth.homepage.news-link-url",
    label: "All-news link address",
    description: "Where the all-news link goes.",
    type: "url",
    page: "homepage",
    group: "homepage.news",
    gridColumn: "col-span-1",
    defaultValue: "/blog",
  },
  {
    key: "wealth.homepage.news-button-label",
    label: "Card button label",
    description: "Label on each news card's button.",
    type: "text",
    page: "homepage",
    group: "homepage.news",
    gridColumn: "col-span-1",
    defaultValue: "Read more",
  },
  {
    key: "wealth.homepage.news-items",
    label: "Press mentions",
    description:
      "Shown as cards only while you have no published blog posts (your three newest posts take over as soon as there are any). The first three rows are shown. Leave empty to use DCWF's real press coverage.",
    type: "list",
    page: "homepage",
    group: "homepage.news",
    gridColumn: "col-span-full",
    maxItems: 8,
    itemLabel: "press mention",
    itemSchema: [
      {
        key: "title",
        label: "Title",
        type: "text",
        placeholder: "e.g. Headline of the article",
      },
      {
        key: "source",
        label: "Source and date",
        type: "text",
        placeholder: "e.g. Publication name, month and year",
      },
      {
        key: "url",
        label: "Link",
        type: "url",
        placeholder: "https://…",
      },
    ],
  },
];

// ─── Support band (hideable; auto-hidden when donations are off) ────────────

const supportData: TemplateField[] = [
  {
    key: "wealth.homepage.support-eyebrow",
    label: "Label above heading",
    description: "Small label above the heading. Leave blank to hide.",
    type: "text",
    page: "homepage",
    group: "homepage.support",
    gridColumn: "col-span-1",
    defaultValue: "Support DCWF",
  },
  {
    key: "wealth.homepage.support-heading",
    label: "Heading",
    description: "Large italic line on the donate band.",
    type: "text",
    page: "homepage",
    group: "homepage.support",
    gridColumn: "col-span-full",
    defaultValue: "Support worker-ownership in and around metro Detroit.",
  },
  {
    key: "wealth.homepage.support-body",
    label: "Description",
    description: "Short paragraph explaining what a gift pays for.",
    type: "textarea",
    page: "homepage",
    group: "homepage.support",
    gridColumn: "col-span-full",
    defaultValue:
      "Your donation goes directly towards educational workshops, trainings, public programming, co-op game nights, and providing technical assistance and loan development to cooperatives.",
  },
  {
    key: "wealth.homepage.support-button-label",
    label: "Button label",
    description:
      "Label for the button that opens your donate page. The button follows your donation settings.",
    type: "text",
    page: "homepage",
    group: "homepage.support",
    gridColumn: "col-span-1",
    defaultValue: "Donate",
  },
  {
    key: "wealth.homepage.support-image",
    label: "Background photo",
    description:
      "Faint grayscale photo behind the band. It is decorative, so it has no alt text. Leave blank for a plain band.",
    type: "image",
    page: "homepage",
    group: "homepage.support",
    gridColumn: "col-span-full",
    defaultValue: "/templates/wealth/images/program-hero.jpg",
  },
];

export const wealthHomepageData: TemplateField[] = [
  ...missionData,
  ...introData,
  ...programsData,
  ...quotesData,
  ...statsData,
  ...coopsData,
  ...newsData,
  ...supportData,
];

export const wealthHomepageFieldGroups: TemplateFieldGroup[] = [
  {
    id: "homepage.mission",
    title: "Opening banner",
    description:
      "Photo and mission statement at the very top of the page, with two links. Always shown.",
    icon: "🌱",
    columns: 2,
  },
  {
    id: "homepage.intro",
    title: "What we do",
    description: "Centered heading and introduction above the program cards.",
    icon: "✍️",
    columns: 1,
  },
  {
    id: "homepage.programs",
    title: "Programs",
    description:
      "Four color cards (financing, incubator, transitions, CEND) and a short cooperative footnote.",
    icon: "🧩",
    columns: 2,
  },
  {
    id: "homepage.quotes",
    title: "From our co-ops",
    description:
      "A quote carousel built from your approved testimonials. Hidden until you have at least one.",
    icon: "💬",
    columns: 2,
  },
  {
    id: "homepage.stats",
    title: "By the numbers",
    description:
      "Photo plus up to three big numbers. Hidden until you enter at least one number.",
    icon: "📊",
    columns: 2,
  },
  {
    id: "homepage.coops",
    title: "Meet the Co-ops",
    description:
      "Photo card linking to the co-ops page, with a strip of co-op logos beneath.",
    icon: "🧑‍🤝‍🧑",
    columns: 2,
  },
  {
    id: "homepage.news",
    title: "News & Notes",
    description:
      "Your three newest blog posts, or press mentions when there are no posts yet.",
    icon: "📰",
    columns: 2,
  },
  {
    id: "homepage.support",
    title: "Support band",
    description:
      "Donate band near the bottom of the page. Hidden automatically when donations are turned off.",
    icon: "💚",
    columns: 2,
  },
];

export const wealthHomepageSections: TemplateSection[] = [
  {
    id: "homepage.mission",
    page: "homepage",
    title: "Opening banner",
    description: "Mission photo and statement with two links",
    groupIds: ["homepage.mission"],
    order: 0,
    hideable: false,
  },
  {
    id: "homepage.intro",
    page: "homepage",
    title: "What we do",
    description: "Centered heading and introduction",
    groupIds: ["homepage.intro"],
    order: 1,
    hideable: true,
  },
  {
    id: "homepage.programs",
    page: "homepage",
    title: "Programs",
    description: "Four program cards and the cooperative footnote",
    groupIds: ["homepage.programs"],
    order: 2,
    hideable: true,
  },
  {
    id: "homepage.quotes",
    page: "homepage",
    title: "From our co-ops",
    description: "Quote carousel from approved testimonials",
    groupIds: ["homepage.quotes"],
    order: 3,
    hideable: true,
    links: [SECTION_LINKS.testimonials],
  },
  {
    id: "homepage.stats",
    page: "homepage",
    title: "By the numbers",
    description: "Photo and big numbers; hidden until a number is entered",
    groupIds: ["homepage.stats"],
    order: 4,
    hideable: true,
  },
  {
    id: "homepage.coops",
    page: "homepage",
    title: "Meet the Co-ops",
    description: "Photo card plus co-op logo strip",
    groupIds: ["homepage.coops"],
    order: 5,
    hideable: true,
  },
  {
    id: "homepage.news",
    page: "homepage",
    title: "News & Notes",
    description: "Three newest blog posts, or press mentions as a fallback",
    groupIds: ["homepage.news"],
    order: 6,
    hideable: true,
    links: [SECTION_LINKS.blog],
  },
  {
    id: "homepage.support",
    page: "homepage",
    title: "Support band",
    description: "Donate band with a link to /donate",
    groupIds: ["homepage.support"],
    order: 7,
    hideable: true,
    links: [SECTION_LINKS.donations],
  },
];
