import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

/**
 * Cart-page wording fields, aggregated into the template root `index.ts`.
 * The `cart-empty-*` fields also drive `/checkout`'s empty state — both pages
 * render the shared `PollenCartEmptyState`.
 */
export const pollenCartData: TemplateField[] = [
  {
    key: "pollen.global.cart-label",
    label: "Cart heading",
    description: "Heading at the top of the full cart page.",
    type: "text",
    page: "global",
    group: "global.cart",
    gridColumn: "col-span-1",
    defaultValue: "Your Cart",
    placeholder: "Your Cart",
  },
  {
    key: "pollen.global.cart-empty-heading",
    label: "Empty cart heading",
    description:
      "Heading shown on the cart page, and on checkout, when there's nothing in the cart.",
    type: "text",
    page: "global",
    group: "global.cart",
    gridColumn: "col-span-1",
    defaultValue: "Your cart is empty",
    placeholder: "e.g. Nothing here yet",
  },
  {
    key: "pollen.global.cart-empty-text",
    label: "Empty cart message",
    description:
      "Line shown under the empty cart heading on the cart and checkout pages. Leave blank to hide.",
    type: "text",
    page: "global",
    group: "global.cart",
    gridColumn: "col-span-full",
    defaultValue: "Looks like you haven't added anything to your cart yet.",
    placeholder: "Add something you love to get started.",
  },
  {
    key: "pollen.global.cart-empty-button",
    label: "Empty cart button",
    description:
      "Label on the button back to the shop when the cart is empty. Leave blank to hide the button.",
    type: "text",
    page: "global",
    group: "global.cart",
    gridColumn: "col-span-1",
    defaultValue: "Continue Shopping",
    placeholder: "e.g. Browse the shop",
  },
];

export const pollenCartFieldGroups: TemplateFieldGroup[] = [
  {
    id: "global.cart",
    title: "Cart",
    description:
      "Wording shown on the full cart page, and on checkout when the cart is empty.",
    icon: "🛒",
    columns: 2,
  },
];
