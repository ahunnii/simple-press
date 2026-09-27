import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

// ─── Cart page field definitions ─────────────────────────────────────────────
//
// Modern has no cart drawer — /cart is a full page — but these fields live
// under `page: "global"` / group `global.cart` (bamboo's convention for its
// cart-panel wording) rather than a dedicated `cart` page/section, since the
// cart route sits outside `PAGE_PREVIEW_PATHS` either way.

const globalCartData: TemplateField[] = [
  {
    key: "modern.global.cart-heading",
    label: "Cart page heading",
    description: "Heading shown at the top of the cart page.",
    type: "text",
    page: "global",
    group: "global.cart",
    gridColumn: "col-span-1",
    defaultValue: "Your Cart",
    placeholder: "Your Cart",
  },
  {
    key: "modern.global.cart-empty-heading",
    label: "Empty cart heading",
    description: "Heading shown on the cart page when there are no items.",
    type: "text",
    page: "global",
    group: "global.cart",
    gridColumn: "col-span-1",
    defaultValue: "Your cart is empty",
    placeholder: "Your cart is empty",
  },
  {
    key: "modern.global.cart-empty-text",
    label: "Empty cart message",
    description: "Line shown under the empty cart heading.",
    type: "textarea",
    page: "global",
    group: "global.cart",
    gridColumn: "col-span-full",
    defaultValue: "Looks like you have not added any items yet.",
    placeholder: "A short line letting shoppers know the cart is empty.",
  },
  {
    key: "modern.global.cart-empty-button",
    label: "Empty cart button text",
    description: "Text on the button shown on the empty cart page.",
    type: "text",
    page: "global",
    group: "global.cart",
    gridColumn: "col-span-1",
    defaultValue: "Start Shopping",
    placeholder: "Start Shopping",
  },
];

export const modernCartData = [...globalCartData];

export const modernCartFieldGroups: TemplateFieldGroup[] = [
  {
    id: "global.cart",
    title: "Cart",
    description: "Heading and empty-state wording on the cart page.",
    icon: "🛒",
    columns: 2,
  },
];
