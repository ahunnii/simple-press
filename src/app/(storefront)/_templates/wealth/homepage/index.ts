import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";

/**
 * Field + section definitions for the wealth homepage. Copy defaults are
 * verbatim from the compiled DCWF clone
 * (`detroitcommunitywealth/app/src/app/page.tsx`) per design.md's "Copy
 * voice" must-keep-verbatim list. Image defaults point at the real
 * `/templates/wealth/images/*` assets named in the build brief.
 *
 * `homepage.news-items` (a `list` field) intentionally carries no
 * `defaultValue` — the schema doesn't support one for list fields. Its
 * fallback rows live in `./wealth-homepage-news.ts` instead (kept out of
 * this module so the field registry stays free of the `~/lib/template-fields`
 * *runtime* import that a list-row parser needs — see that file's header
 * comment for why that import would be circular here).
 */

// ─── Mission (not hideable) ─────────────────────────────────────────────────

const missionData: TemplateField[] = [
  {
    key: "wealth.homepage.mission-image",
    label: "Mission Photo",
    description: "Photo of community members for the mission overlap hero.",
    type: "image",
    page: "homepage",
    group: "homepage.mission",
    gridColumn: "col-span-full",
    defaultValue: "/templates/wealth/images/mission-hero.png",
  },
  {
    key: "wealth.homepage.mission-image-alt",
    label: "Mission Photo Alt Text",
    description: "Describes the mission photo for screen readers.",
    type: "text",
    page: "homepage",
    group: "homepage.mission",
    gridColumn: "col-span-1",
    defaultValue:
      "Members of the Detroit Community Wealth Fund community gathered around a table",
  },
  {
    key: "wealth.homepage.mission-eyebrow",
    label: "Eyebrow",
    description: "Small italic label above the mission statement.",
    type: "text",
    page: "homepage",
    group: "homepage.mission",
    gridColumn: "col-span-1",
    defaultValue: "Our Mission",
  },
  {
    key: "wealth.homepage.mission-statement",
    label: "Mission Statement",
    description: "The organization's mission statement, set in italic.",
    type: "textarea",
    page: "homepage",
    group: "homepage.mission",
    gridColumn: "col-span-full",
    defaultValue:
      "DCWF exists to build equitable employment and community-controlled wealth among Black and historically marginalized Detroiters through accessible financing and ongoing support.",
  },
];

// ─── Support DCWF (hideable — auto-hidden when the `donations` flag is off) ─

const supportData: TemplateField[] = [
  {
    key: "wealth.homepage.support-heading",
    label: "Heading",
    description: "Italic heading for the Support DCWF band.",
    type: "text",
    page: "homepage",
    group: "homepage.support",
    gridColumn: "col-span-1",
    defaultValue: "Support DCWF",
  },
  {
    key: "wealth.homepage.support-body",
    label: "Body",
    description: "Short paragraph explaining what a contribution funds.",
    type: "textarea",
    page: "homepage",
    group: "homepage.support",
    gridColumn: "col-span-full",
    defaultValue:
      "Your contribution will enable DCWF to provide free technical assistance, educational programming and resources to emerging and existing democratically owned businesses in Detroit, to support Black business ownership, community wealth building, and community economic control.",
  },
  {
    key: "wealth.homepage.support-button-label",
    label: "Donate Button Label",
    description: "Label for the button linking to the donate page.",
    type: "text",
    page: "homepage",
    group: "homepage.support",
    gridColumn: "col-span-1",
    defaultValue: "Donate",
  },
];

// ─── Our Programs (hideable) ────────────────────────────────────────────────

const programsData: TemplateField[] = [
  {
    key: "wealth.homepage.programs-heading",
    label: "Heading",
    description: "Italic heading for the programs section.",
    type: "text",
    page: "homepage",
    group: "homepage.programs",
    gridColumn: "col-span-1",
    defaultValue: "Our Programs",
  },
  {
    key: "wealth.homepage.programs-intro",
    label: "Intro",
    description: "Short paragraph describing the programs offered.",
    type: "textarea",
    page: "homepage",
    group: "homepage.programs",
    gridColumn: "col-span-full",
    defaultValue:
      "We provide non-extractive financing for start-ups, existing businesses, and for ownership transitions. We also run ongoing workshops and an annual Co-op Incubator, and opportunities for co-ops to build community with one another.",
  },
  {
    key: "wealth.homepage.programs-leadin",
    label: "Lead-in Line",
    description: "Underlined line just above the program tiles.",
    type: "text",
    page: "homepage",
    group: "homepage.programs",
    gridColumn: "col-span-full",
    defaultValue: "Click the icons below to learn more about our programs.",
  },
  {
    key: "wealth.homepage.programs-tile-lending-image",
    label: "Tile 1 Image — Non-Extractive Financing",
    description: "Square image for the lending program tile.",
    type: "image",
    page: "homepage",
    group: "homepage.programs",
    gridColumn: "col-span-1",
    defaultValue: "/templates/wealth/images/tile-lending.png",
  },
  {
    key: "wealth.homepage.programs-tile-lending-label",
    label: "Tile 1 Label — Non-Extractive Financing",
    description: "Used for the tile's alt text and accessible label.",
    type: "text",
    page: "homepage",
    group: "homepage.programs",
    gridColumn: "col-span-1",
    defaultValue: "Non-Extractive Financing",
  },
  {
    key: "wealth.homepage.programs-tile-lending-url",
    label: "Tile 1 Link — Non-Extractive Financing",
    description: "Where the lending tile links to.",
    type: "url",
    page: "homepage",
    group: "homepage.programs",
    gridColumn: "col-span-1",
    defaultValue: "/services",
  },
  {
    key: "wealth.homepage.programs-tile-incubator-image",
    label: "Tile 2 Image — Co-op Incubator",
    description: "Square image for the incubator program tile.",
    type: "image",
    page: "homepage",
    group: "homepage.programs",
    gridColumn: "col-span-1",
    defaultValue: "/templates/wealth/images/tile-incubator.png",
  },
  {
    key: "wealth.homepage.programs-tile-incubator-label",
    label: "Tile 2 Label — Co-op Incubator",
    description: "Used for the tile's alt text and accessible label.",
    type: "text",
    page: "homepage",
    group: "homepage.programs",
    gridColumn: "col-span-1",
    defaultValue: "Co-op Incubator",
  },
  {
    key: "wealth.homepage.programs-tile-incubator-url",
    label: "Tile 2 Link — Co-op Incubator",
    description: "Where the incubator tile links to.",
    type: "url",
    page: "homepage",
    group: "homepage.programs",
    gridColumn: "col-span-1",
    defaultValue: "/services",
  },
  {
    key: "wealth.homepage.programs-tile-transitions-image",
    label: "Tile 3 Image — Ownership Transitions",
    description: "Square image for the ownership-transitions program tile.",
    type: "image",
    page: "homepage",
    group: "homepage.programs",
    gridColumn: "col-span-1",
    defaultValue: "/templates/wealth/images/tile-transitions.png",
  },
  {
    key: "wealth.homepage.programs-tile-transitions-label",
    label: "Tile 3 Label — Ownership Transitions",
    description: "Used for the tile's alt text and accessible label.",
    type: "text",
    page: "homepage",
    group: "homepage.programs",
    gridColumn: "col-span-1",
    defaultValue: "Ownership Transitions",
  },
  {
    key: "wealth.homepage.programs-tile-transitions-url",
    label: "Tile 3 Link — Ownership Transitions",
    description: "Where the ownership-transitions tile links to.",
    type: "url",
    page: "homepage",
    group: "homepage.programs",
    gridColumn: "col-span-1",
    defaultValue: "/services",
  },
  {
    key: "wealth.homepage.programs-tile-cend-image",
    label: "Tile 4 Image — CEND",
    description: "Square image for the CEND partner tile.",
    type: "image",
    page: "homepage",
    group: "homepage.programs",
    gridColumn: "col-span-1",
    defaultValue: "/templates/wealth/images/tile-cend.png",
  },
  {
    key: "wealth.homepage.programs-tile-cend-label",
    label: "Tile 4 Label — CEND",
    description: "Used for the tile's alt text and accessible label.",
    type: "text",
    page: "homepage",
    group: "homepage.programs",
    gridColumn: "col-span-1",
    defaultValue: "CEND",
  },
  {
    key: "wealth.homepage.programs-tile-cend-url",
    label: "Tile 4 Link — CEND",
    description: "External CEND Detroit website.",
    type: "url",
    page: "homepage",
    group: "homepage.programs",
    gridColumn: "col-span-1",
    defaultValue: "https://www.cendetroit.com/",
  },
];

// ─── Photo band (hideable) ──────────────────────────────────────────────────

const bandData: TemplateField[] = [
  {
    key: "wealth.homepage.band-image",
    label: "Photo",
    description: "Full-bleed community-event photo.",
    type: "image",
    page: "homepage",
    group: "homepage.band",
    gridColumn: "col-span-full",
    defaultValue: "/templates/wealth/images/event-band.jpg",
  },
  {
    key: "wealth.homepage.band-image-alt",
    label: "Photo Alt Text",
    description: "Describes the photo for screen readers.",
    type: "text",
    page: "homepage",
    group: "homepage.band",
    gridColumn: "col-span-full",
    defaultValue: "Community members gathered at a DCWF event",
  },
];

// ─── What Is a Cooperative? (hideable) ──────────────────────────────────────

const cooperativeData: TemplateField[] = [
  {
    key: "wealth.homepage.cooperative-heading",
    label: "Heading",
    description: "Italic heading introducing the definition.",
    type: "text",
    page: "homepage",
    group: "homepage.cooperative",
    gridColumn: "col-span-1",
    defaultValue: "What Is a Cooperative?",
  },
  {
    key: "wealth.homepage.cooperative-body",
    label: "Body",
    description: "Definition of a cooperative.",
    type: "textarea",
    page: "homepage",
    group: "homepage.cooperative",
    gridColumn: "col-span-full",
    defaultValue:
      "Cooperatives are people-centered enterprises owned, controlled and run by and for their members to realize their common economic, social, and cultural needs and aspirations. (ica.coop)",
  },
  {
    key: "wealth.homepage.cooperative-link-label",
    label: "Link Label",
    description: "Label for the link to the resources page.",
    type: "text",
    page: "homepage",
    group: "homepage.cooperative",
    gridColumn: "col-span-1",
    defaultValue: "Resources »",
  },
  {
    key: "wealth.homepage.cooperative-link-url",
    label: "Link URL",
    description: "Where the resources link points to.",
    type: "url",
    page: "homepage",
    group: "homepage.cooperative",
    gridColumn: "col-span-1",
    defaultValue: "/resources",
  },
];

// ─── Meet the Co-ops (hideable) ─────────────────────────────────────────────

const coopsData: TemplateField[] = [
  {
    key: "wealth.homepage.coops-image",
    label: "Photo",
    description: "Photo for the mirrored Meet the Co-ops overlap hero.",
    type: "image",
    page: "homepage",
    group: "homepage.coops",
    gridColumn: "col-span-full",
    defaultValue: "/templates/wealth/images/coops-hero.jpg",
  },
  {
    key: "wealth.homepage.coops-image-alt",
    label: "Photo Alt Text",
    description: "Describes the photo for screen readers.",
    type: "text",
    page: "homepage",
    group: "homepage.coops",
    gridColumn: "col-span-1",
    defaultValue: "A carpenter working in a co-op woodworking shop",
  },
  {
    key: "wealth.homepage.coops-heading",
    label: "Heading",
    description: "Large italic display heading.",
    type: "text",
    page: "homepage",
    group: "homepage.coops",
    gridColumn: "col-span-1",
    defaultValue: "Meet the Co-ops",
  },
  {
    key: "wealth.homepage.coops-body",
    label: "Body",
    description: "Short line introducing the co-ops directory.",
    type: "textarea",
    page: "homepage",
    group: "homepage.coops",
    gridColumn: "col-span-full",
    defaultValue:
      "Get to know loan recipients and graduates\nof the Co-op Incubator",
  },
  {
    key: "wealth.homepage.coops-button-label",
    label: "Button Label",
    description: "Label for the button linking to the co-ops directory.",
    type: "text",
    page: "homepage",
    group: "homepage.coops",
    gridColumn: "col-span-1",
    defaultValue: "Meet the Co-ops",
  },
  {
    key: "wealth.homepage.coops-button-url",
    label: "Button URL",
    description: "Where the button links to.",
    type: "url",
    page: "homepage",
    group: "homepage.coops",
    gridColumn: "col-span-1",
    defaultValue: "/testimonials",
  },
];

// ─── In the News (hideable) ─────────────────────────────────────────────────

const newsData: TemplateField[] = [
  {
    key: "wealth.homepage.news-heading",
    label: "Heading",
    description: "Bold italic heading for the press section.",
    type: "text",
    page: "homepage",
    group: "homepage.news",
    gridColumn: "col-span-1",
    defaultValue: "In the News",
  },
  {
    key: "wealth.homepage.news-items",
    label: "Press Items",
    description:
      "Up to 8 press mentions, each with a title, source/date citation, and external link. Leave empty to use DCWF's real press coverage.",
    type: "list",
    page: "homepage",
    group: "homepage.news",
    gridColumn: "col-span-full",
    maxItems: 8,
    itemSchema: [
      {
        key: "title",
        label: "Title",
        type: "text",
        placeholder: "e.g. Six Ways to Make Workers Business Owners",
      },
      {
        key: "source",
        label: "Source & Date",
        type: "text",
        placeholder: "e.g. Non-Profit Quarterly, October 24, 2025",
      },
      {
        key: "url",
        label: "URL",
        type: "url",
        placeholder: "https://…",
      },
    ],
  },
];

export const wealthHomepageData: TemplateField[] = [
  ...missionData,
  ...supportData,
  ...programsData,
  ...bandData,
  ...cooperativeData,
  ...coopsData,
  ...newsData,
];

export const wealthHomepageFieldGroups: TemplateFieldGroup[] = [
  {
    id: "homepage.mission",
    title: "Mission",
    description: "Overlap hero with the mission statement — always shown.",
    icon: "🌱",
    columns: 2,
  },
  {
    id: "homepage.support",
    title: "Support DCWF",
    description:
      "Narrow donate callout. Hidden automatically when donations are turned off.",
    icon: "💚",
    columns: 1,
  },
  {
    id: "homepage.programs",
    title: "Our Programs",
    description: "Intro copy plus the four program tiles.",
    icon: "🧩",
    columns: 2,
  },
  {
    id: "homepage.band",
    title: "Photo Band",
    description: "Full-bleed community photo.",
    icon: "🖼️",
    columns: 1,
  },
  {
    id: "homepage.cooperative",
    title: "What Is a Cooperative?",
    description: "Definition copy and a link to Resources.",
    icon: "🤝",
    columns: 2,
  },
  {
    id: "homepage.coops",
    title: "Meet the Co-ops",
    description: "Mirrored overlap hero linking to the co-ops directory.",
    icon: "🧑‍🤝‍🧑",
    columns: 2,
  },
  {
    id: "homepage.news",
    title: "In the News",
    description: "Heading plus up to 8 press mentions.",
    icon: "📰",
    columns: 1,
  },
];

export const wealthHomepageSections: TemplateSection[] = [
  {
    id: "homepage.mission",
    page: "homepage",
    title: "Mission",
    description: "Overlap hero with the mission statement",
    groupIds: ["homepage.mission"],
    order: 0,
    hideable: false,
  },
  {
    id: "homepage.support",
    page: "homepage",
    title: "Support DCWF",
    description: "Narrow donate callout with a link to /donate",
    groupIds: ["homepage.support"],
    order: 1,
    hideable: true,
  },
  {
    id: "homepage.programs",
    page: "homepage",
    title: "Our Programs",
    description: "Intro copy and the four program tiles",
    groupIds: ["homepage.programs"],
    order: 2,
    hideable: true,
  },
  {
    id: "homepage.band",
    page: "homepage",
    title: "Photo Band",
    description: "Full-bleed community photo",
    groupIds: ["homepage.band"],
    order: 3,
    hideable: true,
  },
  {
    id: "homepage.cooperative",
    page: "homepage",
    title: "What Is a Cooperative?",
    description: "Definition copy and a Resources link",
    groupIds: ["homepage.cooperative"],
    order: 4,
    hideable: true,
  },
  {
    id: "homepage.coops",
    page: "homepage",
    title: "Meet the Co-ops",
    description: "Mirrored overlap hero linking to the co-ops directory",
    groupIds: ["homepage.coops"],
    order: 5,
    hideable: true,
  },
  {
    id: "homepage.news",
    page: "homepage",
    title: "In the News",
    description: "Heading plus stacked press mentions",
    groupIds: ["homepage.news"],
    order: 6,
    hideable: true,
  },
];
