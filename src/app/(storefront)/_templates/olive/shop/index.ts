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
    label: "Shop Heading",
    description: "The page title above the product grid.",
    type: "text",
    page: "shop",
    group: "shop.intro",
    gridColumn: "col-span-1",
    defaultValue: "Shop",
  },
  {
    key: "olive.shop.intro-body",
    label: "Shop Intro Line",
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
    label: "Empty Shop Heading",
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
    label: "Empty Shop Text",
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
    label: "No Matches Heading",
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
    label: "No Matches Text",
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
// Two tiles on the sage wash below the grid — a photograph and a short pitch.
// Hideable: a store that has nothing to cross-sell should not invent one.

const shopPromoData: TemplateField[] = [
  {
    key: "olive.shop.promo-image",
    label: "Promo Photo",
    description: "The photograph in the left tile of the promo band.",
    type: "image",
    page: "shop",
    group: "shop.promo",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "olive.shop.promo-heading",
    label: "Promo Heading",
    description: "Heading of the promo band below the product grid.",
    type: "text",
    page: "shop",
    group: "shop.promo",
    gridColumn: "col-span-1",
    defaultValue: "Shop by collection",
  },
  {
    key: "olive.shop.promo-body",
    label: "Promo Text",
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
    label: "Promo Button Label",
    description: "Label of the promo button. Leave blank to hide the button.",
    type: "text",
    page: "shop",
    group: "shop.promo",
    gridColumn: "col-span-1",
    defaultValue: "Browse collections",
  },
  {
    key: "olive.shop.promo-button-link",
    label: "Promo Button Link",
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
    title: "Shop Header",
    description:
      "Page title, the line under it, and the copy shown when the grid comes back empty",
    icon: "🛍️",
    columns: 2,
  },
  {
    id: "shop.promo",
    title: "Promo Band",
    description:
      "Photo-and-text band on the sage wash below the product grid — a place to point shoppers at collections or a sister line",
    icon: "🌿",
    columns: 2,
  },
];

export const oliveShopSections: TemplateSection[] = [
  {
    id: "shop.intro",
    page: "shop",
    title: "Header & Grid",
    description:
      "Shop title, the filter toolbar (collections, stock, sort) and the product grid",
    groupIds: ["shop.intro"],
    order: 0,
    hideable: false,
  },
  {
    id: "shop.promo",
    page: "shop",
    title: "Promo Band",
    description: "Photo-and-text band below the product grid",
    groupIds: ["shop.promo"],
    order: 1,
    hideable: true,
  },
];
