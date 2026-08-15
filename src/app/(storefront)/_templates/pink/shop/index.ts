import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";
import { SECTION_LINKS } from "~/lib/section-links";

/**
 * Shop-page fields for the `pink` template.
 *
 * Authority: docs/templates/pink/design.md → "Per-page section concepts →
 * Shop". Filters (category/price/availability blocks, sort options) are
 * client-side and derived from the product catalog via the shared
 * `useShopFilters` hook — nothing about *how filtering works* is a field.
 * What IS a field: the header copy, the sidebar's closing CTA box, and the
 * grid's button/empty-state microcopy (every user-visible string per
 * field-conventions.md).
 */
export const pinkShopData: TemplateField[] = [
  // ── shop.header ──────────────────────────────────────────────────────────
  {
    key: "pink.shop.header-heading",
    label: "Header Heading",
    description: "The main H1 on the shop page.",
    type: "text",
    page: "shop",
    group: "shop.header",
    gridColumn: "col-span-1",
    defaultValue: "Every piece, in one place.",
  },
  {
    key: "pink.shop.header-intro",
    label: "Header Intro",
    description: "One or two sentences under the heading.",
    type: "textarea",
    page: "shop",
    group: "shop.header",
    gridColumn: "col-span-full",
    defaultValue:
      "Dolls, magnets, jewelry and small pieces — made by hand in Detroit from wool, cotton and polymer clay. Every one is one of a kind, and new work goes up as it's finished.",
  },

  // ── shop.filters ─────────────────────────────────────────────────────────
  {
    key: "pink.shop.filters-cta-heading",
    label: "Filters CTA Heading",
    description: "Heading in the boxed callout under the filter sidebar.",
    type: "text",
    page: "shop",
    group: "shop.filters",
    gridColumn: "col-span-full",
    defaultValue: "Looking for something specific?",
  },
  {
    key: "pink.shop.filters-cta-body",
    label: "Filters CTA Body",
    description: "One line under the callout heading.",
    type: "textarea",
    page: "shop",
    group: "shop.filters",
    gridColumn: "col-span-full",
    defaultValue: "Custom orders are open. Tell me what you have in mind.",
  },
  {
    key: "pink.shop.filters-cta-label",
    label: "Filters CTA Button Text",
    description: "Leave blank to hide the button.",
    type: "text",
    page: "shop",
    group: "shop.filters",
    gridColumn: "col-span-1",
    defaultValue: "Get in touch",
  },
  {
    key: "pink.shop.filters-cta-href",
    label: "Filters CTA Button Link",
    description: "Where the callout button goes.",
    type: "url",
    page: "shop",
    group: "shop.filters",
    gridColumn: "col-span-1",
    defaultValue: "/contact",
  },

  // ── shop.grid ────────────────────────────────────────────────────────────
  {
    key: "pink.shop.add-to-basket-label",
    label: "Add to Basket Label",
    description: "Button text on each product card for simple products.",
    type: "text",
    page: "shop",
    group: "shop.grid",
    gridColumn: "col-span-1",
    defaultValue: "Add to basket",
  },
  {
    key: "pink.shop.add-to-basket-added-label",
    label: "Added Confirmation Label",
    description: "Button text shown briefly after adding to the basket.",
    type: "text",
    page: "shop",
    group: "shop.grid",
    gridColumn: "col-span-1",
    defaultValue: "Added ✓",
  },
  {
    key: "pink.shop.choose-options-label",
    label: "Choose Options Label",
    description:
      "Button text on cards for products with multiple variants — opens the product page instead of adding directly.",
    type: "text",
    page: "shop",
    group: "shop.grid",
    gridColumn: "col-span-1",
    defaultValue: "Choose options",
  },
  {
    key: "pink.shop.sold-out-label",
    label: "Sold Out Label",
    description: "Button text on out-of-stock cards.",
    type: "text",
    page: "shop",
    group: "shop.grid",
    gridColumn: "col-span-1",
    defaultValue: "Sold out",
  },
  {
    key: "pink.shop.load-more-label",
    label: "Load More Label",
    description:
      "Button text at the bottom of the grid when there are more pieces to show.",
    type: "text",
    page: "shop",
    group: "shop.grid",
    gridColumn: "col-span-1",
    defaultValue: "Load more",
  },
  {
    key: "pink.shop.empty-heading",
    label: "Empty State Heading",
    description:
      "Shown when no pieces match the current filters, or the shop is empty.",
    type: "text",
    page: "shop",
    group: "shop.grid",
    gridColumn: "col-span-full",
    defaultValue: "Nothing here yet.",
  },
  {
    key: "pink.shop.empty-body",
    label: "Empty State Body",
    description: "One or two sentences under the empty-state heading.",
    type: "textarea",
    page: "shop",
    group: "shop.grid",
    gridColumn: "col-span-full",
    defaultValue:
      "New pieces go up as they're finished. Check back soon, or get in touch about a custom order.",
  },
  {
    key: "pink.shop.empty-cta-label",
    label: "Empty State Button Text",
    description: "Leave blank to hide the button.",
    type: "text",
    page: "shop",
    group: "shop.grid",
    gridColumn: "col-span-1",
    defaultValue: "Get in touch",
  },
  {
    key: "pink.shop.empty-cta-href",
    label: "Empty State Button Link",
    description: "Where the empty-state button goes.",
    type: "url",
    page: "shop",
    group: "shop.grid",
    gridColumn: "col-span-1",
    defaultValue: "/contact",
  },
];

export const pinkShopFieldGroups: TemplateFieldGroup[] = [
  {
    id: "shop.header",
    title: "Shop Header",
    description: "Eyebrow, heading and intro at the top of the shop page",
    icon: "🛍️",
    columns: 2,
  } satisfies TemplateFieldGroup,
  {
    id: "shop.filters",
    title: "Shop Filters — Closing CTA",
    description: "The boxed callout at the bottom of the filter sidebar",
    icon: "🧵",
    columns: 2,
  } satisfies TemplateFieldGroup,
  {
    id: "shop.grid",
    title: "Shop Grid & States",
    description: "Add-to-basket labels, load-more, and the empty state",
    icon: "🧺",
    columns: 2,
  } satisfies TemplateFieldGroup,
];

export const pinkShopSections: TemplateSection[] = [
  {
    id: "shop.header",
    page: "shop",
    title: "Shop Header",
    description: "Eyebrow, heading and intro at the top of the shop page",
    groupIds: ["shop.header"],
    order: 0,
    hideable: false,
  },
  {
    id: "shop.filters",
    page: "shop",
    title: "Filter Sidebar",
    description:
      "Category, price and availability filters, plus the closing CTA box",
    groupIds: ["shop.filters"],
    order: 1,
    hideable: true,
  },
  {
    id: "shop.grid",
    page: "shop",
    title: "Product Grid",
    description: "Sort, product cards and the empty state",
    groupIds: ["shop.grid"],
    order: 2,
    hideable: false,
    links: [SECTION_LINKS.products],
  },
];
