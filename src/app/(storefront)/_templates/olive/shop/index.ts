import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";

// ─── Shop: Intro, toolbar and grid ───────────────────────────────────────────
// The page title, the one line under it, and the copy the ghost card shows when
// the grid comes back empty. Two empty cases, because they need two different
// answers: a store with nothing published yet, and a filter that matched
// nothing.

const shopIntroData: TemplateField[] = [
  {
    key: "olive.shop.intro-heading",
    label: "Heading",
    description: "The page title above the product grid.",
    type: "text",
    page: "shop",
    group: "shop.intro",
    gridColumn: "col-span-1",
    defaultValue: "Shop",
  },
  {
    key: "olive.shop.intro-body",
    label: "Intro line",
    description:
      "One line under the shop heading. Leave blank to show the heading on its own.",
    type: "textarea",
    page: "shop",
    group: "shop.intro",
    gridColumn: "col-span-1",
    defaultValue:
      "Everything in one place. Filter by collection, or sort by what landed most recently.",
  },
  {
    key: "olive.shop.empty-heading",
    label: "Empty shop heading",
    description:
      "Shown on the ghost card when the shop has no published products at all.",
    type: "text",
    page: "shop",
    group: "shop.intro",
    gridColumn: "col-span-1",
    defaultValue: "Nothing in the shop yet",
  },
  {
    key: "olive.shop.empty-body",
    label: "Empty shop text",
    description: "One line under the empty-shop heading.",
    type: "textarea",
    page: "shop",
    group: "shop.intro",
    gridColumn: "col-span-1",
    defaultValue:
      "New pieces land most weeks. Say hello and we'll tell you the moment they do.",
  },
  {
    key: "olive.shop.no-results-heading",
    label: "No matches heading",
    description:
      "Shown on the ghost card when the shopper's filters match nothing.",
    type: "text",
    page: "shop",
    group: "shop.intro",
    gridColumn: "col-span-1",
    defaultValue: "No matches",
  },
  {
    key: "olive.shop.no-results-body",
    label: "No matches text",
    description: "One line under the no-matches heading.",
    type: "textarea",
    page: "shop",
    group: "shop.intro",
    gridColumn: "col-span-1",
    defaultValue:
      "Nothing fits those filters. Clear them to see the whole shop.",
  },
];

// ─── Shop: Promo band ────────────────────────────────────────────────────────
// Two tiles below the grid — a photograph and a short pitch — or, with the
// takeover switch on and a real photo uploaded, the photograph running the
// full width of the page with the copy on a card in its corner.
// Hideable: a store that has nothing to cross-sell should not invent one.

const shopPromoData: TemplateField[] = [
  {
    key: "olive.shop.promo-takeover",
    label: "Full-photo takeover",
    description:
      "On: the promo photo fills the width of the page with the copy on a card in its corner. Off: a photo-and-text band. Needs a photo to take effect.",
    type: "boolean",
    page: "shop",
    group: "shop.promo",
    gridColumn: "col-span-full",
    defaultValue: "false",
  },
  {
    key: "olive.shop.promo-image",
    label: "Photo",
    description:
      "The photograph in the promo band — the left tile, or the whole band with the takeover switch on.",
    type: "image",
    page: "shop",
    group: "shop.promo",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "olive.shop.promo-heading",
    label: "Heading",
    description: "Heading of the promo band below the product grid.",
    type: "text",
    page: "shop",
    group: "shop.promo",
    gridColumn: "col-span-1",
    defaultValue: "Shop by collection",
  },
  {
    key: "olive.shop.promo-body",
    label: "Text",
    description: "A line or two under the promo heading.",
    type: "textarea",
    page: "shop",
    group: "shop.promo",
    gridColumn: "col-span-1",
    defaultValue:
      "The same pieces, sorted the way you actually shop — dresses, tops, bottoms and the rest.",
  },
  {
    key: "olive.shop.promo-button-label",
    label: "Button label",
    description: "Label of the promo button. Leave blank to hide the button.",
    type: "text",
    page: "shop",
    group: "shop.promo",
    gridColumn: "col-span-1",
    defaultValue: "Browse collections",
  },
  {
    key: "olive.shop.promo-button-link",
    label: "Button link",
    description: "Where the promo button goes.",
    type: "url",
    page: "shop",
    group: "shop.promo",
    gridColumn: "col-span-1",
    defaultValue: "/collections",
  },
];

// ─── Exports ─────────────────────────────────────────────────────────────────

export const oliveShopData: TemplateField[] = [
  ...shopIntroData,
  ...shopPromoData,
];

export const oliveShopFieldGroups: TemplateFieldGroup[] = [
  {
    id: "shop.intro",
    title: "Shop header",
    description:
      "Page title, the line under it, and the copy shown when the grid comes back empty",
    icon: "🛍️",
    columns: 2,
  },
  {
    id: "shop.promo",
    title: "Promo",
    description:
      "Photo-and-text band below the product grid, or a full-photo takeover with the copy on a card in its corner — the button can point anywhere: rewards, a collection, an event",
    icon: "🌿",
    columns: 2,
  },
];

export const oliveShopSections: TemplateSection[] = [
  {
    id: "shop.intro",
    page: "shop",
    title: "Shop header",
    description:
      "Shop title, the filter toolbar (collections, stock, sort) and the product grid",
    groupIds: ["shop.intro"],
    order: 0,
    hideable: false,
  },
  {
    id: "shop.promo",
    page: "shop",
    title: "Promo",
    description:
      "Photo-and-text band below the product grid, or an optional full-photo takeover — the button can point anywhere: rewards, a collection, an event",
    groupIds: ["shop.promo"],
    order: 1,
    hideable: true,
  },
];
