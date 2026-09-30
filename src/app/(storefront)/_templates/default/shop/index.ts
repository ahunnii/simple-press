import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

/**
 * Copy defaults, exported so `default-shop-page.tsx` can fall back to the
 * same string this field module declares as `defaultValue` (single source of
 * truth) — needed while these keys aren't in the root field map yet, since
 * `resolveFields` can't substitute a `defaultValue` it doesn't know about.
 */
export const SHOP_LISTING_LABEL_DEFAULT = "Catalog";
export const SHOP_LISTING_HEADING_DEFAULT = "All products";
export const SHOP_LISTING_EMPTY_DEFAULT = "No products available at this time.";

const shopListingData: TemplateField[] = [
  {
    key: "default.shop.listing-label",
    label: "Label above the heading",
    description:
      "Small uppercase text shown above the main heading on the shop page.",
    type: "text",
    page: "shop",
    group: "shop.listing",
    gridColumn: "col-span-1",
    defaultValue: SHOP_LISTING_LABEL_DEFAULT,
    placeholder: "e.g. Shop",
  },
  {
    key: "default.shop.listing-heading",
    label: "Heading",
    description: "Main heading on the shop page.",
    type: "text",
    page: "shop",
    group: "shop.listing",
    gridColumn: "col-span-1",
    defaultValue: SHOP_LISTING_HEADING_DEFAULT,
    placeholder: "e.g. Our products",
  },
  {
    key: "default.shop.listing-empty",
    label: "Empty state message",
    description: "Shown on the shop page when there are no products yet.",
    type: "text",
    page: "shop",
    group: "shop.listing",
    gridColumn: "col-span-full",
    defaultValue: SHOP_LISTING_EMPTY_DEFAULT,
    placeholder: "e.g. New products coming soon.",
  },
];

export const defaultShopData: TemplateField[] = [...shopListingData];

export const defaultShopFieldGroups: TemplateFieldGroup[] = [
  {
    id: "shop.listing",
    title: "Shop listing",
    description: "Label, heading, and empty state on the shop page.",
    icon: "🛍️",
    columns: 2,
  },
];
