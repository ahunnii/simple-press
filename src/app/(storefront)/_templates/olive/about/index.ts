import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";

// ─── Hero ─────────────────────────────────────────────────────────────────────

const aboutHeroData: TemplateField[] = [
  {
    key: "olive.about.hero-image",
    label: "Hero Image",
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
    label: "Hero Heading",
    description: "The page title, shown on a white card over the photo.",
    type: "text",
    page: "about",
    group: "about.hero",
    gridColumn: "col-span-1",
    defaultValue: "About Olive Mode",
  },
];

// ─── Manifesto ────────────────────────────────────────────────────────────────

const aboutManifestoData: TemplateField[] = [
  {
    key: "olive.about.manifesto-heading",
    label: "Manifesto Heading",
    description: "Centred display heading below the hero.",
    type: "text",
    page: "about",
    group: "about.manifesto",
    gridColumn: "col-span-full",
    defaultValue: "Made for the woman who dresses on purpose.",
  },
  {
    key: "olive.about.manifesto-body",
    label: "Manifesto Body",
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
    label: "Our Story",
    description:
      "Alternating photo-and-text rows telling the shop's story, up to 4. Leave empty to use the built-in example story.",
    type: "list",
    page: "about",
    group: "about.story",
    gridColumn: "col-span-full",
    maxItems: 4,
    itemSchema: [
      {
        key: "image",
        label: "Photo",
        type: "image",
        placeholder: "Upload a photo for this row",
      },
      {
        key: "heading",
        label: "Heading",
        type: "text",
        placeholder: "e.g. Started on a card table",
      },
      {
        key: "body",
        label: "Body",
        type: "textarea",
        placeholder: "A short paragraph for this row",
      },
    ],
  },
];

// ─── Founding line ────────────────────────────────────────────────────────────

const aboutFoundingData: TemplateField[] = [
  {
    key: "olive.about.founding-line",
    label: "Founding Line",
    description:
      "One centred, tracked-uppercase line between two hairlines (e.g. your founding year and city).",
    type: "text",
    page: "about",
    group: "about.founding",
    gridColumn: "col-span-full",
    defaultValue: "Est. 2020 · Detroit · Designed for you",
  },
];

// ─── CTA tiles ────────────────────────────────────────────────────────────────

const aboutCtaData: TemplateField[] = [
  {
    key: "olive.about.cta",
    label: "Where to Next Tiles",
    description:
      "Up to 3 photo tiles linking elsewhere on the site, shown at the bottom of the About page. Leave empty to use the built-in defaults.",
    type: "list",
    page: "about",
    group: "about.cta",
    gridColumn: "col-span-full",
    maxItems: 3,
    itemSchema: [
      {
        key: "image",
        label: "Photo",
        type: "image",
        placeholder: "Upload a photo for this tile",
      },
      {
        key: "label",
        label: "Label",
        type: "text",
        placeholder: "e.g. Shop new",
      },
      {
        key: "link",
        label: "Link",
        type: "url",
        placeholder: "e.g. /shop",
      },
    ],
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
    title: "About Hero",
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
    title: "Our Story",
    description: "Alternating photo-and-text rows telling the shop's story",
    icon: "📖",
    columns: 1,
  },
  {
    id: "about.founding",
    title: "Founding Line",
    description: "One small centred line between two hairlines",
    icon: "🏷️",
    columns: 1,
  },
  {
    id: "about.cta",
    title: "Where to Next",
    description: "Three photo tiles linking elsewhere on the site",
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
    hideable: false,
  },
  {
    id: "about.story",
    page: "about",
    title: "Our Story",
    description: "Alternating photo-and-text story rows",
    groupIds: ["about.story"],
    order: 2,
    hideable: false,
  },
  {
    id: "about.founding",
    page: "about",
    title: "Founding Line",
    description: "Small centred line between two hairlines",
    groupIds: ["about.founding"],
    order: 3,
    hideable: false,
  },
  {
    id: "about.cta",
    page: "about",
    title: "Where to Next",
    description: "Three photo tiles linking elsewhere on the site",
    groupIds: ["about.cta"],
    order: 4,
    hideable: true,
  },
];
