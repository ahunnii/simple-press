import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";
import { SECTION_LINKS } from "~/lib/section-links";

// ─── Shop: navy title band + collection tabs ────────────────────────────────

const heroData: TemplateField[] = [
  {
    key: "glove.shop.heading",
    label: "Heading",
    description: "The page title in the band at the top of the shop.",
    type: "text",
    page: "shop",
    group: "shop.hero",
    gridColumn: "col-span-1",
    defaultValue: "Shop",
  },
  {
    key: "glove.shop.all-label",
    label: "All products tab",
    description:
      "First tab under the heading, showing every product. The other tabs are your collections.",
    type: "text",
    page: "shop",
    group: "shop.hero",
    gridColumn: "col-span-1",
    defaultValue: "All Products",
  },
];

// ─── Shop: toolbar, grid, load more, empty states ──────────────────────────

const gridData: TemplateField[] = [
  {
    key: "glove.shop.results-label",
    label: "Search results label",
    description:
      "Shown above the grid when someone searches from the header, followed by their search in quotes.",
    type: "text",
    page: "shop",
    group: "shop.grid",
    gridColumn: "col-span-1",
    defaultValue: "Results for",
  },
  {
    key: "glove.shop.clear-search-label",
    label: "Clear search link",
    description: "Link that clears a header search and shows every product.",
    type: "text",
    page: "shop",
    group: "shop.grid",
    gridColumn: "col-span-1",
    defaultValue: "Clear search",
  },
  {
    key: "glove.shop.load-more-label",
    label: "Load more button",
    description:
      "Button under the grid that shows the next products. Hidden when everything is already showing.",
    type: "text",
    page: "shop",
    group: "shop.grid",
    gridColumn: "col-span-1",
    defaultValue: "Load more products",
  },
  {
    key: "glove.shop.empty-heading",
    label: "Empty shop heading",
    description: "Shown in place of the grid when no products are published.",
    type: "text",
    page: "shop",
    group: "shop.grid",
    gridColumn: "col-span-1",
    defaultValue: "New LuvGluv styles are on their way",
  },
  {
    key: "glove.shop.empty-body",
    label: "Empty shop text",
    description: "One line under the empty-shop heading.",
    type: "textarea",
    page: "shop",
    group: "shop.grid",
    gridColumn: "col-span-1",
    defaultValue:
      "Every pair is made special for the woman you're honoring. Check back soon, or reach out and we'll help you plan the perfect gift.",
  },
  {
    key: "glove.shop.empty-button-label",
    label: "Empty shop button",
    description: "Button under the empty-shop text. Leave blank to hide.",
    type: "text",
    page: "shop",
    group: "shop.grid",
    gridColumn: "col-span-1",
    defaultValue: "Contact us",
  },
  {
    key: "glove.shop.empty-button-link",
    label: "Empty shop button link",
    description: "Where the empty-shop button goes.",
    type: "url",
    page: "shop",
    group: "shop.grid",
    gridColumn: "col-span-1",
    defaultValue: "/contact",
  },
  {
    key: "glove.shop.no-results-heading",
    label: "No matches heading",
    description: "Shown when a search or collection tab matches no products.",
    type: "text",
    page: "shop",
    group: "shop.grid",
    gridColumn: "col-span-1",
    defaultValue: "No products match that search",
  },
  {
    key: "glove.shop.no-results-body",
    label: "No matches text",
    description: "One line under the no-matches heading.",
    type: "textarea",
    page: "shop",
    group: "shop.grid",
    gridColumn: "col-span-1",
    defaultValue:
      "Try another word, or browse every glove, chain and charm in the shop.",
  },
];

export const gloveShopData: TemplateField[] = [...heroData, ...gridData];

export const gloveShopFieldGroups: TemplateFieldGroup[] = [
  {
    id: "shop.hero",
    title: "Shop title",
    description:
      "Heading in the band at the top of the shop and the first collection tab",
    icon: "🛍️",
    columns: 2,
  },
  {
    id: "shop.grid",
    title: "Product grid",
    description:
      "Search results line, load more button, and the messages shown when the grid is empty",
    icon: "🧤",
    columns: 2,
  },
];

export const gloveShopSections: TemplateSection[] = [
  {
    id: "shop.hero",
    page: "shop",
    title: "Shop title",
    description:
      "Title band with a tab for every collection. Collections come from Products → Collections.",
    groupIds: ["shop.hero"],
    order: 0,
    hideable: false,
    links: [SECTION_LINKS.products, SECTION_LINKS.collections],
  },
  {
    id: "shop.grid",
    page: "shop",
    title: "Product grid",
    description:
      "Breadcrumb, sort, product grid and load more button, plus the empty and no-match messages",
    groupIds: ["shop.grid"],
    order: 1,
    hideable: false,
    links: [SECTION_LINKS.products],
  },
];
