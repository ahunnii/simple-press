import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

const shopPageData: TemplateField[] = [
  {
    key: "pollen.shop.listing-label",
    label: "Small label",
    description:
      "Small label above the shop heading. Leave blank to hide.",
    type: "text",
    page: "products",
    group: "products.shop",
    gridColumn: "col-span-1",
    defaultValue: "",
    placeholder: "One or two words",
  },
  {
    key: "pollen.shop.listing-title",
    label: "Heading",
    description: "Heading shown at the top of the shop page.",
    type: "text",
    page: "products",
    group: "products.shop",
    gridColumn: "col-span-1",
    defaultValue: "Our Products",
    placeholder: "Our Products",
  },
  {
    key: "pollen.shop.listing-intro",
    label: "Intro text",
    description: "Short line below the shop heading.",
    type: "textarea",
    page: "products",
    group: "products.shop",
    gridColumn: "col-span-full",
    defaultValue: "Browse our selection of quality products.",
    placeholder: "Browse our selection...",
  },
];

export const pollenShopData = [...shopPageData];

export const pollenShopFieldGroups: TemplateFieldGroup[] = [
  {
    id: "products.shop",
    title: "Shop",
    description: "Heading and intro text at the top of the shop page.",
    icon: "🛍️",
    columns: 2,
  },
];
