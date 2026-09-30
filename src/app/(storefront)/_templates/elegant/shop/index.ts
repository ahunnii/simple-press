import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

export const elegantShopFieldGroups: TemplateFieldGroup[] = [
  {
    id: "shop.header",
    title: "Shop page",
    description: "Heading, intro, and empty states on the shop page",
    icon: "🛍️",
    columns: 1,
  },
];

export const elegantShopData: TemplateField[] = [
  {
    key: "elegant.shop.small-label",
    label: "Small label",
    description: "Small label above the shop heading.",
    type: "text",
    page: "shop",
    group: "shop.header",
    defaultValue: "The shop",
    placeholder: "The shop",
  },
  {
    key: "elegant.shop.heading",
    label: "Heading, first line",
    description: "First line of the shop page heading.",
    type: "text",
    page: "shop",
    group: "shop.header",
    defaultValue: "Everything,",
    placeholder: "Everything,",
  },
  {
    key: "elegant.shop.heading-accent",
    label: "Heading, second line",
    description: "Second, emphasized line of the shop page heading.",
    type: "text",
    page: "shop",
    group: "shop.header",
    defaultValue: "quietly considered.",
    placeholder: "quietly considered.",
  },
  {
    key: "elegant.shop.empty-heading",
    label: "Empty catalog heading",
    description: "Shown when your shop has no products yet.",
    type: "text",
    page: "shop",
    group: "shop.header",
    defaultValue: "Nothing here yet.",
    placeholder: "Nothing here yet.",
  },
  {
    key: "elegant.shop.empty-body",
    label: "Empty catalog text",
    description: "Shown below the empty-catalog heading.",
    type: "text",
    page: "shop",
    group: "shop.header",
    defaultValue: "Products will appear here once added.",
    placeholder: "Products will appear here once added.",
  },
  {
    key: "elegant.shop.no-results-heading",
    label: "No search results heading",
    description: "Shown when a search or filter matches no products.",
    type: "text",
    page: "shop",
    group: "shop.header",
    defaultValue: "Nothing matches.",
    placeholder: "Nothing matches.",
  },
];
