import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

const productsPageData: TemplateField[] = [
  {
    key: "bamboo.products.listing-eyebrow",
    label: "Small label",
    description: "Short text above the heading. Leave blank to hide.",
    type: "text",
    page: "products",
    group: "products.listing",
    gridColumn: "col-span-1",
    defaultValue: "Shop",
    placeholder: "Shop",
  },
  {
    key: "bamboo.products.listing-title",
    label: "Heading",
    description: "Main heading at the top of the shop page.",
    type: "text",
    page: "products",
    group: "products.listing",
    gridColumn: "col-span-full",
    defaultValue: "Our Products",
    placeholder: "Our Products",
  },
  {
    key: "bamboo.products.listing-intro",
    label: "Intro text",
    description: "Line below the heading. Leave blank for no text.",
    type: "textarea",
    page: "products",
    group: "products.listing",
    gridColumn: "col-span-full",
    defaultValue: "Explore our collection of premium bamboo products.",
    placeholder: "Explore our collection of products.",
  },
];

export const bambooProductsData = [...productsPageData];

export const bambooProductsFieldGroups: TemplateFieldGroup[] = [
  {
    id: "products.listing",
    title: "Shop page",
    description: "Heading and intro at the top of the shop page.",
    icon: "📝",
    columns: 2,
  },
];
