import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

const productsData: TemplateField[] = [
  {
    key: "modern.products.tagline",
    label: "Small label",
    description: "Short label above the heading at the top of the Shop page.",
    type: "text",
    page: "products",
    group: "products.main",
    gridColumn: "col-span-full",
    defaultValue: "Shop",
    placeholder: "e.g. Shop",
  },
  {
    key: "modern.products.title",
    label: "Heading",
    description: "Main heading at the top of the Shop page.",
    type: "text",
    page: "products",
    group: "products.main",
    gridColumn: "col-span-full",
    defaultValue: "Our Products",
    placeholder: "e.g. Our Products",
  },
  {
    key: "modern.products.description",
    label: "Intro text",
    description: "Short paragraph below the heading.",
    type: "textarea",
    page: "products",
    group: "products.main",
    gridColumn: "col-span-full",
    defaultValue:
      "Browse our curated products, each assembled with care around a distinct theme or purpose.",
    placeholder: "A sentence or two describing what shoppers will find here.",
  },
];

export const modernProductsData = [...productsData];

export const modernProductsFieldGroups: TemplateFieldGroup[] = [
  {
    id: "products.main",
    title: "Intro",
    description:
      "Small label, heading, and intro above the shop's product grid.",
    icon: "🛍️",
    columns: 2,
  },
];
