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
    label: "Item list label",
    description:
      "Screen-reader label for the list of items in the cart (not shown on screen).",
    type: "text",
    page: "cart",
    group: "cart.main",
    gridColumn: "col-span-1",
    defaultValue: "Product",
    placeholder: "e.g. Item",
  },
  {
    key: "glove.cart.column-price",
    label: "Price label",
    description:
      "Screen-reader label for each item's unit price (not shown on screen).",
    type: "text",
    page: "cart",
    group: "cart.main",
    gridColumn: "col-span-1",
    defaultValue: "Price",
    placeholder: "e.g. Each",
  },
  {
    key: "glove.cart.column-quantity",
    label: "Quantity label",
    description:
      "Screen-reader label for each item's quantity stepper (not shown on screen).",
    type: "text",
    page: "cart",
    group: "cart.main",
    gridColumn: "col-span-1",
    defaultValue: "Quantity",
    placeholder: "e.g. Qty",
  },
  {
    key: "glove.cart.column-subtotal",
    label: "Subtotal label",
    description:
      "Label for each line's total (screen readers) and for the subtotal row in the order summary.",
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
      "Button under the cart items that goes back to the shop. Leave blank to hide it.",
    type: "text",
    page: "cart",
    group: "cart.main",
    gridColumn: "col-span-1",
    defaultValue: "Keep shopping",
    placeholder: "e.g. Back to the shop",
  },
  {
    key: "glove.cart.totals-heading",
    label: "Order summary heading",
    description: "Heading on the card that sums up the cart.",
    type: "text",
    page: "cart",
    group: "cart.main",
    gridColumn: "col-span-1",
    defaultValue: "Order summary",
    placeholder: "e.g. Order total",
  },
  {
    key: "glove.cart.totals-note",
    label: "Order summary note",
    description:
      "Small line under the total, explaining what is still to come. Leave blank to hide it.",
    type: "textarea",
    page: "cart",
    group: "cart.main",
    gridColumn: "col-span-full",
    defaultValue: "Tax and any promo code are added at checkout.",
    placeholder: "e.g. Final total is confirmed at payment.",
  },
  {
    key: "glove.cart.checkout-label",
    label: "Checkout button label",
    description:
      "Button on the order summary that starts checkout (repeated above the items on phones). It is hidden when checkout is switched off for the store.",
    type: "text",
    page: "cart",
    group: "cart.main",
    gridColumn: "col-span-1",
    defaultValue: "Check out",
    placeholder: "e.g. Check out",
  },
  {
    key: "glove.cart.empty-heading",
    label: "Empty bag heading",
    description: "Heading shown when there is nothing in the bag.",
    type: "text",
    page: "cart",
    group: "cart.main",
    gridColumn: "col-span-1",
    defaultValue: "Your bag is waiting for its first pair",
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
    defaultValue:
      "Every woman's hands tell a story. Find the pair that tells yours.",
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
    defaultValue: "Start shopping",
    placeholder: "e.g. Browse the shop",
  },
];

export const gloveCartFieldGroups: TemplateFieldGroup[] = [
  {
    id: "cart.main",
    title: "Cart",
    description:
      "Item labels, order summary copy and the empty cart message on the cart page",
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
    description: "Line items, the order summary and the empty cart message",
    groupIds: ["cart.main"],
    order: 0,
    hideable: false,
  },
];
