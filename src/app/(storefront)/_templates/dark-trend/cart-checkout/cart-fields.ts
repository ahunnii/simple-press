import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

/**
 * Empty-cart copy (page "cart", group "cart.empty"). Rendered by
 * `DarkTrendCartContents` on the cart page. `DarkTrendCheckoutForm`'s own
 * empty-cart guard reuses only the heading field — its button links to the
 * same place but has always carried different copy ("Continue Shopping" vs
 * "Shop Products"), so introducing one shared button field would silently
 * change one of the two screens' text.
 */
export const darkTrendCartData: TemplateField[] = [
  {
    key: "dark-trend.cart.empty-heading",
    label: "Empty cart heading",
    description:
      "Heading shown on the cart page (and reused on the checkout page) when the cart has nothing in it.",
    type: "text",
    page: "cart",
    group: "cart.empty",
    gridColumn: "col-span-1",
    defaultValue: "Your cart is empty",
    placeholder: "e.g. Nothing here yet",
  },
  {
    key: "dark-trend.cart.empty-body",
    label: "Empty cart message",
    description:
      "Line below the heading on the cart page. Leave blank to hide.",
    type: "text",
    page: "cart",
    group: "cart.empty",
    gridColumn: "col-span-full",
    defaultValue: "Add some products to get started!",
    placeholder: "e.g. Browse the shop to find something you'll love.",
  },
  {
    key: "dark-trend.cart.empty-button",
    label: "Button text",
    description:
      "Label on the button that links to the shop from the empty cart page. Leave blank to hide.",
    type: "text",
    page: "cart",
    group: "cart.empty",
    gridColumn: "col-span-1",
    defaultValue: "Shop Products",
    placeholder: "e.g. Browse the shop",
  },
];

export const darkTrendCartFieldGroups: TemplateFieldGroup[] = [
  {
    id: "cart.empty",
    title: "Empty cart",
    description: "Heading, message, and button shown when the cart is empty.",
    icon: "🛒",
    columns: 2,
  } satisfies TemplateFieldGroup,
];
