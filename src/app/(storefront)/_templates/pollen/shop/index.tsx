import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

const shopPageData: TemplateField[] = [
  {
    key: "pollen.shop.listing-title",
    label: "Shop Page Heading",
    description: "Heading shown at the top of the shop/products page",
    type: "text",
    page: "products",
    group: "products.shop",
    gridColumn: "col-span-1",
    defaultValue: "Our Products",
    placeholder: "Our Products",
  },
  {
    key: "pollen.shop.listing-intro",
    label: "Shop Page Intro",
    description: "Short intro below the shop heading",
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
    title: "Shop Page",
    description: "Heading and intro text for the shop/products listing page",
    icon: "🛍️",
    columns: 2,
  },
];
