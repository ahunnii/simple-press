import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";
import { SECTION_LINKS } from "~/lib/section-links";

// ─── Hero ─────────────────────────────────────────────────────────────────────

const contactHeroData: TemplateField[] = [
  {
    key: "olive.contact.hero-heading",
    label: "Hero Heading",
    description: "The page title on the contact page's slate band.",
    type: "text",
    page: "contact",
    group: "contact.hero",
    gridColumn: "col-span-1",
    defaultValue: "Say hello",
  },
  {
    key: "olive.contact.hero-body",
    label: "Hero Body",
    description: "One line under the heading.",
    type: "textarea",
    page: "contact",
    group: "contact.hero",
    gridColumn: "col-span-1",
    defaultValue:
      "Questions about an order, a fit, or a fabric — we're a quick message away.",
  },
];

// ─── Main: form + info card ───────────────────────────────────────────────────

const contactMainData: TemplateField[] = [
  {
    key: "olive.contact.form-heading",
    label: "Form Heading",
    description: "Heading above the contact form.",
    type: "text",
    page: "contact",
    group: "contact.main",
    gridColumn: "col-span-1",
    defaultValue: "Send us a note",
  },
  {
    key: "olive.contact.form-body",
    label: "Form Intro",
    description: "One line above the contact form. Leave blank to hide.",
    type: "textarea",
    page: "contact",
    group: "contact.main",
    gridColumn: "col-span-1",
    defaultValue:
      "Tell us what's on your mind. We read every message and write back within a day or two.",
  },
  {
    key: "olive.contact.info-visit-heading",
    label: "Visit Heading",
    description:
      "Small label above the visit details. Shown only when Visit Details below is filled in.",
    type: "text",
    page: "contact",
    group: "contact.main",
    gridColumn: "col-span-1",
    defaultValue: "Visit",
  },
  {
    key: "olive.contact.info-visit-body",
    label: "Visit Details",
    description:
      "Your address or visiting notes, shown in the contact page's info card. Leave blank to hide.",
    type: "textarea",
    page: "contact",
    group: "contact.main",
    gridColumn: "col-span-1",
    defaultValue: "",
  },
  {
    key: "olive.contact.info-hours-heading",
    label: "Hours Heading",
    description:
      "Small label above your hours. Shown only when Hours below is filled in.",
    type: "text",
    page: "contact",
    group: "contact.main",
    gridColumn: "col-span-1",
    defaultValue: "Hours",
  },
  {
    key: "olive.contact.info-hours-body",
    label: "Hours",
    description:
      "Your open hours, shown in the contact page's info card. Leave blank to hide.",
    type: "textarea",
    page: "contact",
    group: "contact.main",
    gridColumn: "col-span-1",
    defaultValue: "",
  },
];

// ─── FAQ ──────────────────────────────────────────────────────────────────────

const contactFaqData: TemplateField[] = [
  {
    key: "olive.contact.faq-heading",
    label: "FAQ Heading",
    description: "Heading above the frequently-asked-questions accordion.",
    type: "text",
    page: "contact",
    group: "contact.faq",
    gridColumn: "col-span-full",
    defaultValue: "Questions we hear a lot",
  },
  {
    key: "olive.contact.faq",
    label: "Questions",
    description:
      "Pick questions from Content → FAQ. Leave empty to show the first 6 published questions.",
    type: "faq",
    page: "contact",
    group: "contact.faq",
    gridColumn: "col-span-full",
    minItems: 0,
    maxItems: 6,
  },
];

// ─── Promo ────────────────────────────────────────────────────────────────────

const contactPromoData: TemplateField[] = [
  {
    key: "olive.contact.promo-takeover",
    label: "Full-Photo Takeover",
    description:
      "On: the promo photo fills the width of the page with the copy on a card in its corner. Off: a photo-and-text band. Needs a photo to take effect.",
    type: "boolean",
    page: "contact",
    group: "contact.promo",
    gridColumn: "col-span-full",
    defaultValue: "false",
  },
  {
    key: "olive.contact.promo-image",
    label: "Promo Photo",
    description:
      "The photograph for the promo. Leave blank for a copy-only band.",
    type: "image",
    page: "contact",
    group: "contact.promo",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "olive.contact.promo-heading",
    label: "Promo Heading",
    description:
      "Heading of the promo. Leave heading and text blank to hide the whole section.",
    type: "text",
    page: "contact",
    group: "contact.promo",
    gridColumn: "col-span-1",
    defaultValue: "Earn points every time you shop",
  },
  {
    key: "olive.contact.promo-body",
    label: "Promo Text",
    description: "A line or two under the promo heading.",
    type: "textarea",
    page: "contact",
    group: "contact.promo",
    gridColumn: "col-span-1",
    defaultValue:
      "Join our rewards program and collect points on every order, your birthday and a follow. Trade them for money off at checkout.",
  },
  {
    key: "olive.contact.promo-button-label",
    label: "Promo Button Label",
    description: "Label of the promo button. Leave blank to hide the button.",
    type: "text",
    page: "contact",
    group: "contact.promo",
    gridColumn: "col-span-1",
    defaultValue: "Join rewards",
  },
  {
    key: "olive.contact.promo-button-link",
    label: "Promo Button Link",
    description:
      "Where the promo button goes — the rewards page by default, but it can point anywhere.",
    type: "url",
    page: "contact",
    group: "contact.promo",
    gridColumn: "col-span-1",
    defaultValue: "/account/rewards",
  },
];

// ─── Map ──────────────────────────────────────────────────────────────────────

const contactMapData: TemplateField[] = [
  {
    key: "olive.contact.map-heading",
    label: "Map Heading",
    description:
      "Heading above the map. The map only shows once both coordinates below are set.",
    type: "text",
    page: "contact",
    group: "contact.map",
    gridColumn: "col-span-full",
    defaultValue: "Find us",
  },
  {
    key: "olive.contact.map-lat",
    label: "Latitude",
    description:
      "Your shop's latitude (e.g. 42.3314). Leave blank to hide the map.",
    type: "number",
    page: "contact",
    group: "contact.map",
    gridColumn: "col-span-1",
    defaultValue: "",
  },
  {
    key: "olive.contact.map-lng",
    label: "Longitude",
    description:
      "Your shop's longitude (e.g. -83.0458). Leave blank to hide the map.",
    type: "number",
    page: "contact",
    group: "contact.map",
    gridColumn: "col-span-1",
    defaultValue: "",
  },
];

// ─── Aggregated export ────────────────────────────────────────────────────────

export const oliveContactData: TemplateField[] = [
  ...contactHeroData,
  ...contactMainData,
  ...contactFaqData,
  ...contactPromoData,
  ...contactMapData,
];

export const oliveContactFieldGroups: TemplateFieldGroup[] = [
  {
    id: "contact.hero",
    title: "Contact Hero",
    description: "Page heading and intro line on the slate band",
    icon: "👋",
    columns: 2,
  },
  {
    id: "contact.main",
    title: "Form & Info",
    description:
      "Contact form heading/intro plus the visit and hours info card",
    icon: "✉️",
    columns: 2,
  },
  {
    id: "contact.faq",
    title: "Frequently Asked Questions",
    description: "Heading and a question/answer accordion",
    icon: "❓",
    columns: 1,
  },
  {
    id: "contact.promo",
    title: "Promo",
    description:
      "Photo-and-text band, or a full-photo takeover, between the FAQ and the map — the rewards program by default, but it can point anywhere",
    icon: "🎁",
    columns: 2,
  },
  {
    id: "contact.map",
    title: "Map",
    description: "Heading and coordinates for the location map",
    icon: "📍",
    columns: 2,
  },
];

export const oliveContactSections: TemplateSection[] = [
  {
    id: "contact.hero",
    page: "contact",
    title: "Hero",
    description: "Page heading and intro line on the slate band",
    groupIds: ["contact.hero"],
    order: 0,
    hideable: false,
  },
  {
    id: "contact.main",
    page: "contact",
    title: "Form & Info",
    description: "Contact form and the visit/hours info card",
    groupIds: ["contact.main"],
    order: 1,
    hideable: false,
  },
  {
    id: "contact.faq",
    page: "contact",
    title: "FAQ",
    description: "Frequently asked questions accordion",
    groupIds: ["contact.faq"],
    order: 2,
    hideable: true,
    links: [SECTION_LINKS.faq],
  },
  {
    id: "contact.promo",
    page: "contact",
    title: "Promo",
    description:
      "Promo band or full-photo takeover between the FAQ and the map",
    groupIds: ["contact.promo"],
    order: 3,
    hideable: true,
  },
  {
    id: "contact.map",
    page: "contact",
    title: "Map",
    description: "Location map with view/directions links",
    groupIds: ["contact.map"],
    order: 4,
    hideable: true,
  },
];
