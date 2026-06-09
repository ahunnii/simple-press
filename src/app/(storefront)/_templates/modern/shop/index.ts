import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

const productsData: TemplateField[] = [
  {
    key: "modern.products.tagline",
    label: "Tagline",
    description: "Tagline for the products page",
    type: "text",
    page: "products",
    group: "products.main",
    gridColumn: "col-span-full",
    defaultValue: "Shop",
    placeholder: "e.g. Shop",
  },
  {
    key: "modern.products.title",
    label: "Title",
    description: "Title for the products page",
    type: "text",
    page: "products",
    group: "products.main",
    gridColumn: "col-span-full",
    defaultValue: "Our Products",
    placeholder: "e.g. Our Products",
  },
  {
    key: "modern.products.description",
    label: "Description",
    description: "Description for the products page",
    type: "textarea",
    page: "products",
    group: "products.main",
    gridColumn: "col-span-full",
    defaultValue:
      "Browse our curated products, each assembled with care around a distinct theme or purpose.",
    placeholder:
      "e.g. Browse our curated products, each assembled with care around a distinct theme or purpose.",
  },
];

export const modernProductsData = [...productsData];

export const modernProductsFieldGroups: TemplateFieldGroup[] = [
  {
    id: "products.main",
    title: "Products Main",
    description: "Main section for the products page",
    icon: "🛍️",
    columns: 2,
  },
];
