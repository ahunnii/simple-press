import { listRowsFromDefaults } from "~/lib/lucide-template-icons";
import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";

// ─── Built-in list defaults ─────────────────────────────────────────────────

// Built-in example story rows, shown by the editor as real rows and copied
// into the saved value on the first edit (copy-on-write). Text copied
// verbatim from the pre-migration `DEFAULT_STORY` constant in
// `olive-about-page.tsx`.
const OLIVE_ABOUT_STORY_DEFAULT_ROWS = [
  {
    image: "",
    heading: "Started on a card table",
    body: "We began as a folding table at a weekend market — a rack of dresses and a handwritten sign. We sold out by noon and ordered more the next week.",
  },
  {
    image: "",
    heading: "Every fabric, chosen by hand",
    body: "We touch every fabric before it goes on the floor. If it wrinkles wrong or doesn't feel right against your skin, it doesn't make the cut.",
  },
  {
    image: "",
    heading: "A shop that remembers you",
    body: "We keep notes — your size, the dress you almost bought last spring, the color you always reach for. Walk in and we'll likely have something pulled already.",
  },
  {
    image: "",
    heading: "Still here, still local",
    body: "We've grown from one folding table to a real shop on a real block, and neither has changed much. Come try things on and stay as long as you like.",
  },
] satisfies Record<string, string>[];

// Built-in example CTA tiles, shown by the editor as real rows and copied
// into the saved value on the first edit (copy-on-write). Text copied
// verbatim from the pre-migration `DEFAULT_CTA_TILES` constant in
// `olive-about-page.tsx`.
const OLIVE_ABOUT_CTA_DEFAULT_ROWS = [
  { image: "", label: "Shop new", link: "/shop" },
  { image: "", label: "Read the journal", link: "/blog" },
  { image: "", label: "Say hello", link: "/contact" },
] satisfies Record<string, string>[];

// ─── Hero ─────────────────────────────────────────────────────────────────────

const aboutHeroData: TemplateField[] = [
  {
    key: "olive.about.hero-image",
    label: "Photo",
    description:
      "Full-bleed photo at the top of the About page, with the page title on a card over it.",
    type: "image",
    page: "about",
    group: "about.hero",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "olive.about.hero-heading",
    label: "Heading",
    description: "The page title, shown on a card over the photo.",
    type: "text",
    page: "about",
    group: "about.hero",
    gridColumn: "col-span-1",
    defaultValue: "About us",
  },
];

// ─── Manifesto ────────────────────────────────────────────────────────────────

const aboutManifestoData: TemplateField[] = [
  {
    key: "olive.about.manifesto-heading",
    label: "Heading",
    description: "Centred display heading below the hero.",
    type: "text",
    page: "about",
    group: "about.manifesto",
    gridColumn: "col-span-full",
    defaultValue: "Made for people who dress on purpose.",
  },
  {
    key: "olive.about.manifesto-body",
    label: "Body",
    description: "One short paragraph under the manifesto heading.",
    type: "textarea",
    page: "about",
    group: "about.manifesto",
    gridColumn: "col-span-full",
    defaultValue:
      "We stock pieces we'd wear ourselves — the kind of dress that works for a Tuesday and a wedding, in colors you can picture in your own closet. Every buy starts with one question: would we reach for this on a day we needed to feel like ourselves?",
  },
];

// ─── Story ────────────────────────────────────────────────────────────────────

const aboutStoryData: TemplateField[] = [
  {
    key: "olive.about.story",
    label: "Our story",
    description:
      "Alternating photo-and-text rows telling the shop's story, up to 4. Leave empty to use the built-in example story.",
    type: "list",
    page: "about",
    group: "about.story",
    gridColumn: "col-span-full",
    maxItems: 4,
    itemLabel: "row",
    defaultsWhenEmpty: true,
    itemSchema: [
      {
        key: "image",
        label: "Photo",
        type: "image",
        description: "Photo for this row. Shown at 4:3, alternating sides.",
        placeholder: "Upload a photo for this row",
        optional: true,
      },
      {
        key: "heading",
        label: "Heading",
        type: "text",
        description: "Short heading for this row. Leave blank to skip it.",
        placeholder: "e.g. Started on a card table",
      },
      {
        key: "body",
        label: "Body",
        type: "textarea",
        description: "A short paragraph for this row.",
        placeholder: "A short paragraph for this row",
        optional: true,
      },
    ],
    defaultRows: OLIVE_ABOUT_STORY_DEFAULT_ROWS,
  },
];

// ─── Founding line ────────────────────────────────────────────────────────────

const aboutFoundingData: TemplateField[] = [
  {
    key: "olive.about.founding-line",
    label: "Line",
    description:
      "One centred, tracked-uppercase line between two hairlines (e.g. your founding year and city). Leave blank to hide.",
    type: "text",
    page: "about",
    group: "about.founding",
    gridColumn: "col-span-full",
    defaultValue: "",
  },
];

// ─── CTA tiles ────────────────────────────────────────────────────────────────

const aboutCtaData: TemplateField[] = [
  {
    key: "olive.about.cta",
    label: "Tiles",
    description:
      "Up to 3 photo tiles linking elsewhere on the site, shown at the bottom of the About page. Leave empty to use the built-in defaults.",
    type: "list",
    page: "about",
    group: "about.cta",
    gridColumn: "col-span-full",
    maxItems: 3,
    itemLabel: "tile",
    defaultsWhenEmpty: true,
    itemSchema: [
      {
        key: "image",
        label: "Photo",
        type: "image",
        description: "Photo for this tile.",
        placeholder: "Upload a photo for this tile",
        optional: true,
      },
      {
        key: "label",
        label: "Label",
        type: "text",
        description: "The word or two printed on the tile's card.",
        placeholder: "e.g. Shop new",
      },
      {
        key: "link",
        label: "Link",
        type: "url",
        description: "Where the tile goes.",
        placeholder: "e.g. /shop",
        optional: true,
      },
    ],
    defaultRows: OLIVE_ABOUT_CTA_DEFAULT_ROWS,
  },
];

// ─── Aggregated export ────────────────────────────────────────────────────────

export const oliveAboutData: TemplateField[] = [
  ...aboutHeroData,
  ...aboutManifestoData,
  ...aboutStoryData,
  ...aboutFoundingData,
  ...aboutCtaData,
];

export const oliveAboutFieldGroups: TemplateFieldGroup[] = [
  {
    id: "about.hero",
    title: "Hero",
    description: "Full-bleed photo with the page title on a card",
    icon: "🌿",
    columns: 2,
  },
  {
    id: "about.manifesto",
    title: "Manifesto",
    description: "Centred brand statement below the hero",
    icon: "✒️",
    columns: 1,
  },
  {
    id: "about.story",
    title: "Our story",
    description: "Alternating photo-and-text rows telling the shop's story",
    icon: "📖",
    columns: 1,
  },
  {
    id: "about.founding",
    title: "Founding line",
    description: "One small centred line between two hairlines",
    icon: "🏷️",
    columns: 1,
  },
  {
    id: "about.cta",
    title: "Where to next",
    description: "Up to three photo tiles linking elsewhere on the site",
    icon: "🔗",
    columns: 1,
  },
];

export const oliveAboutSections: TemplateSection[] = [
  {
    id: "about.hero",
    page: "about",
    title: "Hero",
    description: "Full-bleed photo with the page title",
    groupIds: ["about.hero"],
    order: 0,
    hideable: false,
  },
  {
    id: "about.manifesto",
    page: "about",
    title: "Manifesto",
    description: "Centred brand statement",
    groupIds: ["about.manifesto"],
    order: 1,
    hideable: true,
  },
  {
    id: "about.story",
    page: "about",
    title: "Our story",
    description: "Alternating photo-and-text story rows",
    groupIds: ["about.story"],
    order: 2,
    hideable: true,
  },
  {
    id: "about.founding",
    page: "about",
    title: "Founding line",
    description: "Small centred line between two hairlines",
    groupIds: ["about.founding"],
    order: 3,
    hideable: true,
  },
  {
    id: "about.cta",
    page: "about",
    title: "Where to next",
    description: "Up to three photo tiles linking elsewhere on the site",
    groupIds: ["about.cta"],
    order: 4,
    hideable: true,
  },
];

// ─── Derived storefront constants ──────────────────────────────────────────────

export const DEFAULT_OLIVE_ABOUT_STORY = listRowsFromDefaults(
  OLIVE_ABOUT_STORY_DEFAULT_ROWS,
  "default-story",
);

export const DEFAULT_OLIVE_ABOUT_CTA_TILES = listRowsFromDefaults(
  OLIVE_ABOUT_CTA_DEFAULT_ROWS,
  "default-cta",
);
