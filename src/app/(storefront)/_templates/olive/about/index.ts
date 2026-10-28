import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";
import { listRowsFromDefaults } from "~/lib/lucide-template-icons";

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

// Built-in closing buttons, shown by the editor as real rows and copied into
// the saved value on the first edit (copy-on-write). Since the 2026-10-21
// "three beats" rebuild the page shows at most two buttons and no photos, so
// the old photo tiles ("Shop new", "Read the journal", "Say hello") became
// the first and last of those labels, with no `image` key.
const OLIVE_ABOUT_CTA_DEFAULT_ROWS = [
  { label: "Shop new", link: "/shop" },
  { label: "Say hello", link: "/contact" },
] satisfies Record<string, string>[];

// ─── Opening (group about.hero) ──────────────────────────────────────────────

const aboutHeroData: TemplateField[] = [
  {
    key: "olive.about.hero-image",
    label: "Photo",
    description:
      "Photo beside the statement at the top of the About page, running to the right edge of the screen (above the statement on phones). Leave blank for a text-only opening.",
    type: "image",
    page: "about",
    group: "about.hero",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "olive.about.hero-heading",
    label: "Page title",
    description:
      "The page title, set in small spaced capitals above the statement. Leave blank to show About us.",
    type: "text",
    page: "about",
    group: "about.hero",
    gridColumn: "col-span-1",
    defaultValue: "About us",
  },
];

// ─── Statement (group about.manifesto) ────────────────────────────────────────

const aboutManifestoData: TemplateField[] = [
  {
    key: "olive.about.manifesto-heading",
    label: "Statement",
    description:
      "The large serif statement at the top of the About page, under the page title. Leave blank to hide it.",
    type: "text",
    page: "about",
    group: "about.manifesto",
    gridColumn: "col-span-full",
    defaultValue: "Made for the woman who dresses on purpose.",
  },
  {
    key: "olive.about.manifesto-body",
    label: "Text under the statement",
    description:
      "One short paragraph under the statement. Leave blank to hide it.",
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
    key: "olive.about.story-label",
    label: "Label above heading",
    description:
      "Small spaced capitals above the story heading (e.g. Our story). Leave blank to hide it.",
    type: "text",
    page: "about",
    group: "about.story",
    gridColumn: "col-span-1",
    defaultValue: "Our story",
  },
  {
    key: "olive.about.story-heading",
    label: "Heading",
    description:
      "Serif heading above the story paragraphs. Leave blank to hide it.",
    type: "text",
    page: "about",
    group: "about.story",
    gridColumn: "col-span-1",
    defaultValue: "Style meets convenience.",
  },
  {
    key: "olive.about.story",
    label: "Story paragraphs",
    description:
      "The shop's story, one paragraph per row (up to 4), beside one photo. Leave empty to use the built-in example story.",
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
        description: "Only the first row's photo is shown, beside the story.",
        placeholder: "Upload a photo for this row",
        optional: true,
      },
      {
        key: "heading",
        label: "Heading",
        type: "text",
        description:
          "Small serif heading over this paragraph. Leave blank to skip it.",
        placeholder: "e.g. Started on a card table",
      },
      {
        key: "body",
        label: "Body",
        type: "textarea",
        description: "The paragraph for this row.",
        placeholder: "A short paragraph for this row",
        optional: true,
      },
    ],
    defaultRows: OLIVE_ABOUT_STORY_DEFAULT_ROWS,
  },
];

// ─── Closing line ─────────────────────────────────────────────────────────────

const aboutFoundingData: TemplateField[] = [
  {
    key: "olive.about.founding-line",
    label: "Line",
    description:
      "One centred line in italic serif type at the end of the page, between two short rules (e.g. Est. 2022 · Detroit). Leave blank to hide it.",
    type: "text",
    page: "about",
    group: "about.founding",
    gridColumn: "col-span-full",
    defaultValue: "",
  },
];

// ─── Closing buttons ──────────────────────────────────────────────────────────
// Rows saved before 2026-10-21 still carry an `image` prop from the old photo
// tiles; the page ignores it and the editor drops it on the next save.

const aboutCtaData: TemplateField[] = [
  {
    key: "olive.about.cta",
    label: "Buttons",
    description:
      "Up to two buttons at the end of the page, under the closing line. The first is filled, the second outlined. Leave empty to use the built-in buttons.",
    type: "list",
    page: "about",
    group: "about.cta",
    gridColumn: "col-span-full",
    maxItems: 2,
    itemLabel: "button",
    defaultsWhenEmpty: true,
    itemSchema: [
      {
        key: "label",
        label: "Label",
        type: "text",
        description:
          "The words on the button. A row without a label is skipped.",
        placeholder: "e.g. Shop new",
      },
      {
        key: "link",
        label: "Link",
        type: "url",
        description: "Where the button goes. Leave blank to link to the shop.",
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
    title: "Opening",
    description: "Page title, statement and photo",
    icon: "🌿",
    columns: 2,
  },
  {
    id: "about.manifesto",
    title: "Statement",
    description: "Large serif statement and a short paragraph beside the photo",
    icon: "✒️",
    columns: 1,
  },
  {
    id: "about.story",
    title: "Our story",
    description: "The shop's story in a few paragraphs, beside one photo",
    icon: "📖",
    columns: 2,
  },
  {
    id: "about.founding",
    title: "Closing line",
    description: "One italic line at the end of the page",
    icon: "🏷️",
    columns: 1,
  },
  {
    id: "about.cta",
    title: "Closing buttons",
    description: "Up to two buttons at the end of the page",
    icon: "🔗",
    columns: 1,
  },
];

export const oliveAboutSections: TemplateSection[] = [
  {
    id: "about.hero",
    page: "about",
    title: "Opening",
    description: "Page title, statement and photo",
    groupIds: ["about.hero"],
    order: 0,
    hideable: false,
  },
  {
    id: "about.manifesto",
    page: "about",
    title: "Statement",
    description: "Large serif statement and a short paragraph",
    groupIds: ["about.manifesto"],
    order: 1,
    hideable: true,
  },
  {
    id: "about.story",
    page: "about",
    title: "Our story",
    description: "The shop's story beside one photo",
    groupIds: ["about.story"],
    order: 2,
    hideable: true,
  },
  {
    id: "about.founding",
    page: "about",
    title: "Closing line",
    description: "One italic line at the end of the page",
    groupIds: ["about.founding"],
    order: 3,
    hideable: true,
  },
  {
    id: "about.cta",
    page: "about",
    title: "Closing buttons",
    description: "Up to two buttons at the end of the page",
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
