import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

/**
 * Empty-cart + order-summary copy (page "cart"). Rendered by
 * `DefaultCartContents`, resolved server-side in `DefaultCartPage` and passed
 * down as plain string props (never a function across the server/client
 * boundary). Copy defaults are exported so the render site can fall back to
 * the same string this module declares as `defaultValue` (single source of
 * truth) while these keys aren't in the root field map yet.
 */
export const CART_EMPTY_HEADING_DEFAULT = "Your cart is empty";
export const CART_EMPTY_BODY_DEFAULT = "Add some products to get started.";
export const CART_EMPTY_BUTTON_DEFAULT = "Shop products";
export const CART_SUMMARY_HEADING_DEFAULT = "Order summary";
export const CART_SUMMARY_CHECKOUT_BUTTON_DEFAULT = "Continue to checkout";

const cartEmptyData: TemplateField[] = [
  {
    key: "default.cart.empty-heading",
    label: "Empty cart heading",
    description:
      "Heading shown on the cart page when the cart has nothing in it.",
    type: "text",
    page: "cart",
    group: "cart.empty",
    gridColumn: "col-span-1",
    defaultValue: CART_EMPTY_HEADING_DEFAULT,
    placeholder: "e.g. Nothing here yet",
  },
  {
    key: "default.cart.empty-body",
    label: "Empty cart message",
    description:
      "Line below the heading on the empty cart page. Leave blank to hide.",
    type: "text",
    page: "cart",
    group: "cart.empty",
    gridColumn: "col-span-full",
    defaultValue: CART_EMPTY_BODY_DEFAULT,
    placeholder: "e.g. Browse the shop to find something you'll love.",
  },
  {
    key: "default.cart.empty-button",
    label: "Shop products button",
    description:
      "Label on the button that links to the shop from the empty cart page. Leave blank to hide.",
    type: "text",
    page: "cart",
    group: "cart.empty",
    gridColumn: "col-span-1",
    defaultValue: CART_EMPTY_BUTTON_DEFAULT,
    placeholder: "e.g. Browse the shop",
  },
];

const cartSummaryData: TemplateField[] = [
  {
    key: "default.cart.summary-heading",
    label: "Heading",
    description: "Heading above the order summary panel on the cart page.",
    type: "text",
    page: "cart",
    group: "cart.summary",
    gridColumn: "col-span-1",
    defaultValue: CART_SUMMARY_HEADING_DEFAULT,
    placeholder: "e.g. Your order",
  },
  {
    key: "default.cart.summary-checkout-button",
    label: "Continue to checkout button",
    description: "Label on the button that starts checkout from the cart page.",
    type: "text",
    page: "cart",
    group: "cart.summary",
    gridColumn: "col-span-1",
    defaultValue: CART_SUMMARY_CHECKOUT_BUTTON_DEFAULT,
    placeholder: "e.g. Go to checkout",
  },
];

export const defaultCartData: TemplateField[] = [
  ...cartEmptyData,
  ...cartSummaryData,
];

export const defaultCartFieldGroups: TemplateFieldGroup[] = [
  {
    id: "cart.empty",
    title: "Empty cart",
    description: "Heading, message, and button shown when the cart is empty.",
    icon: "🛒",
    columns: 2,
  },
  {
    id: "cart.summary",
    title: "Order summary",
    description:
      "Heading and checkout button on the cart page's order summary panel.",
    icon: "🧾",
    columns: 2,
  },
];
