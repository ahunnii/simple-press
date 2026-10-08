import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";

/**
 * Cart page fields (page "cart", group "cart.main"). The cart is cart data
 * plus a handful of labels, so the whole page is one group. Cart and checkout
 * fields are not reachable in /editor (the preview cart is always empty); they
 * are edited in the platform-admin advanced editor.
 */
export const gloveCartData: TemplateField[] = [
  {
    key: "glove.cart.column-product",
    label: "Product column heading",
    description: "Heading above the product names in the cart table.",
    type: "text",
    page: "cart",
    group: "cart.main",
    gridColumn: "col-span-1",
    defaultValue: "Product",
    placeholder: "e.g. Item",
  },
  {
    key: "glove.cart.column-price",
    label: "Price column heading",
    description: "Heading above each item's unit price in the cart table.",
    type: "text",
    page: "cart",
    group: "cart.main",
    gridColumn: "col-span-1",
    defaultValue: "Price",
    placeholder: "e.g. Each",
  },
  {
    key: "glove.cart.column-quantity",
    label: "Quantity column heading",
    description: "Heading above the quantity steppers in the cart table.",
    type: "text",
    page: "cart",
    group: "cart.main",
    gridColumn: "col-span-1",
    defaultValue: "Quantity",
    placeholder: "e.g. Qty",
  },
  {
    key: "glove.cart.column-subtotal",
    label: "Subtotal column heading",
    description:
      "Heading above each line's total in the cart table, also used as the subtotal label in the totals card.",
    type: "text",
    page: "cart",
    group: "cart.main",
    gridColumn: "col-span-1",
    defaultValue: "Subtotal",
    placeholder: "e.g. Line total",
  },
  {
    key: "glove.cart.continue-label",
    label: "Continue shopping label",
    description:
      "Button under the cart table that goes back to the shop. Leave blank to hide it.",
    type: "text",
    page: "cart",
    group: "cart.main",
    gridColumn: "col-span-1",
    defaultValue: "Continue shopping",
    placeholder: "e.g. Keep browsing",
  },
  {
    key: "glove.cart.totals-heading",
    label: "Totals card heading",
    description: "Heading on the card that sums up the cart.",
    type: "text",
    page: "cart",
    group: "cart.main",
    gridColumn: "col-span-1",
    defaultValue: "Cart totals",
    placeholder: "e.g. Order total",
  },
  {
    key: "glove.cart.totals-note",
    label: "Totals card note",
    description:
      "Small line under the total, explaining what is still to come. Leave blank to hide it.",
    type: "textarea",
    page: "cart",
    group: "cart.main",
    gridColumn: "col-span-full",
    defaultValue: "Taxes and discount codes are worked out at checkout.",
    placeholder: "e.g. Final total is confirmed at payment.",
  },
  {
    key: "glove.cart.checkout-label",
    label: "Checkout button label",
    description:
      "Button on the totals card that starts checkout. It is hidden when checkout is switched off for the store.",
    type: "text",
    page: "cart",
    group: "cart.main",
    gridColumn: "col-span-1",
    defaultValue: "Proceed to checkout",
    placeholder: "e.g. Check out",
  },
  {
    key: "glove.cart.empty-heading",
    label: "Empty cart heading",
    description: "Heading shown when there is nothing in the cart.",
    type: "text",
    page: "cart",
    group: "cart.main",
    gridColumn: "col-span-1",
    defaultValue: "Your cart is currently empty.",
    placeholder: "e.g. Nothing here yet",
  },
  {
    key: "glove.cart.empty-body",
    label: "Empty cart text",
    description:
      "One line under the empty cart heading. Leave blank to hide it.",
    type: "textarea",
    page: "cart",
    group: "cart.main",
    gridColumn: "col-span-full",
    defaultValue: "Browse our glove styles and find a pair she will love.",
    placeholder: "e.g. Your next favorite is a few clicks away.",
  },
  {
    key: "glove.cart.empty-cta",
    label: "Empty cart button label",
    description:
      "Button under the empty cart message that goes back to the shop. Leave blank to hide it.",
    type: "text",
    page: "cart",
    group: "cart.main",
    gridColumn: "col-span-1",
    defaultValue: "Return to shop",
    placeholder: "e.g. Start shopping",
  },
];

export const gloveCartFieldGroups: TemplateFieldGroup[] = [
  {
    id: "cart.main",
    title: "Cart",
    description:
      "Table headings, totals card copy and the empty cart message on the cart page",
    icon: "🛒",
    columns: 2,
  } satisfies TemplateFieldGroup,
];

/** The cart is the whole page, so it is not hideable. */
export const gloveCartSections: TemplateSection[] = [
  {
    id: "cart.main",
    page: "cart",
    title: "Cart",
    description: "Line items table, the totals card and the empty cart message",
    groupIds: ["cart.main"],
    order: 0,
    hideable: false,
  },
];
