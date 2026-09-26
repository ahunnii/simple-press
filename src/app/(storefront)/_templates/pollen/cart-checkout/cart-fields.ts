import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

/**
 * Cart-page wording fields, aggregated into the template root `index.ts`.
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
    key: "pollen.global.cart-empty-text",
    label: "Empty cart message",
    description:
      'Line shown under "Your cart is empty" when there\'s nothing in the cart. Leave blank to hide.',
    type: "text",
    page: "global",
    group: "global.cart",
    gridColumn: "col-span-full",
    defaultValue: "Looks like you haven't added anything to your cart yet.",
    placeholder: "Add something you love to get started.",
  },
];

export const pollenCartFieldGroups: TemplateFieldGroup[] = [
  {
    id: "global.cart",
    title: "Cart",
    description: "Wording shown on the full cart page.",
    icon: "🛒",
    columns: 2,
  },
];
