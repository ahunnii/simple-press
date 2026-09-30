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
    label: "Heading",
    description: "The page's main heading.",
    type: "text",
    page: "shop",
    group: "shop.header",
    gridColumn: "col-span-1",
    defaultValue: "Every piece, in one place.",
  },
  {
    key: "pink.shop.header-intro",
    label: "Intro text",
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
    label: "Heading — sidebar callout",
    description: "Heading in the boxed callout under the filter sidebar.",
    type: "text",
    page: "shop",
    group: "shop.filters",
    gridColumn: "col-span-full",
    defaultValue: "Looking for something specific?",
  },
  {
    key: "pink.shop.filters-cta-body",
    label: "Body text — sidebar callout",
    description: "One line under the callout heading.",
    type: "textarea",
    page: "shop",
    group: "shop.filters",
    gridColumn: "col-span-full",
    defaultValue: "Custom orders are open. Tell me what you have in mind.",
  },
  {
    key: "pink.shop.filters-cta-label",
    label: "Button text — sidebar callout",
    description: "Leave blank to hide the button.",
    type: "text",
    page: "shop",
    group: "shop.filters",
    gridColumn: "col-span-1",
    defaultValue: "Get in touch",
  },
  {
    key: "pink.shop.filters-cta-href",
    label: "Button link — sidebar callout",
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
    label: "Add to basket label",
    description: "Button text on each product card for simple products.",
    type: "text",
    page: "shop",
    group: "shop.grid",
    gridColumn: "col-span-1",
    defaultValue: "Add to basket",
  },
  {
    key: "pink.shop.add-to-basket-added-label",
    label: "Added confirmation label",
    description: "Button text shown briefly after adding to the basket.",
    type: "text",
    page: "shop",
    group: "shop.grid",
    gridColumn: "col-span-1",
    defaultValue: "Added ✓",
  },
  {
    key: "pink.shop.choose-options-label",
    label: "Choose options label",
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
    label: "Sold out label",
    description: "Button text on out-of-stock cards.",
    type: "text",
    page: "shop",
    group: "shop.grid",
    gridColumn: "col-span-1",
    defaultValue: "Sold out",
  },
  {
    key: "pink.shop.load-more-label",
    label: "Load more label",
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
    label: "Heading — nothing found",
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
    label: "Body text — nothing found",
    description: "One or two sentences under the heading above.",
    type: "textarea",
    page: "shop",
    group: "shop.grid",
    gridColumn: "col-span-full",
    defaultValue:
      "New pieces go up as they're finished. Check back soon, or get in touch about a custom order.",
  },
  {
    key: "pink.shop.empty-cta-label",
    label: "Button text — nothing found",
    description: "Leave blank to hide the button.",
    type: "text",
    page: "shop",
    group: "shop.grid",
    gridColumn: "col-span-1",
    defaultValue: "Get in touch",
  },
  {
    key: "pink.shop.empty-cta-href",
    label: "Button link — nothing found",
    description: "Where the button above goes.",
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
    title: "Shop header",
    description: "Heading and intro at the top of the shop page.",
    icon: "🛍️",
    columns: 2,
  } satisfies TemplateFieldGroup,
  {
    id: "shop.filters",
    title: "Filter sidebar",
    description: "The boxed callout at the bottom of the filter sidebar.",
    icon: "🧵",
    columns: 2,
  } satisfies TemplateFieldGroup,
  {
    id: "shop.grid",
    title: "Product grid",
    description: "Add-to-basket labels, load-more, and the empty state.",
    icon: "🧺",
    columns: 2,
  } satisfies TemplateFieldGroup,
];

export const pinkShopSections: TemplateSection[] = [
  {
    id: "shop.header",
    page: "shop",
    title: "Shop header",
    description: "Heading and intro at the top of the shop page",
    groupIds: ["shop.header"],
    order: 0,
    hideable: false,
  },
  {
    id: "shop.filters",
    page: "shop",
    title: "Filter sidebar",
    description:
      "Category, price and availability filters, plus the closing callout box",
    groupIds: ["shop.filters"],
    order: 1,
    hideable: true,
  },
  {
    id: "shop.grid",
    page: "shop",
    title: "Product grid",
    description: "Sort, product cards and the empty state",
    groupIds: ["shop.grid"],
    order: 2,
    hideable: false,
    links: [SECTION_LINKS.products],
  },
];
