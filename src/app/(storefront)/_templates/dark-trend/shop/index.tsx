import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

const shopListingData: TemplateField[] = [
  {
    key: "dark-trend.shop.listing-heading",
    label: "Heading",
    description: "Main heading at the top of the shop page.",
    type: "text",
    page: "shop",
    group: "shop.listing",
    gridColumn: "col-span-full",
    defaultValue: "All Products",
    placeholder: "e.g. Shop the collection",
  },
  {
    key: "dark-trend.shop.listing-empty",
    label: "Empty state message",
    description: "Shown on the shop page when there are no products yet.",
    type: "text",
    page: "shop",
    group: "shop.listing",
    gridColumn: "col-span-full",
    defaultValue: "No products available at this time.",
    placeholder: "e.g. New products coming soon.",
  },
];

export const darkTrendShopData: TemplateField[] = [...shopListingData];

export const darkTrendShopFieldGroups: TemplateFieldGroup[] = [
  {
    id: "shop.listing",
    title: "Shop listing",
    description: "Heading and empty state at the top of the shop page.",
    icon: "🛍️",
    columns: 2,
  } satisfies TemplateFieldGroup,
];
