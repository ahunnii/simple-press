import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";

/**
 * Cart page fields — design.md → "Per-page section concepts → CartPage".
 *
 * One group, `cart.main`, and it is the whole page: the title block, the
 * summary card beside the line items, and the empty-bag copy. Line items
 * themselves are cart data, not owner copy, so nothing about them is a field.
 *
 * `cart` is deliberately absent from `PAGE_PREVIEW_PATHS` (the preview
 * iframe's bag is always empty), so these are edited in the platform-admin
 * advanced editor rather than in `/editor`.
 */
export const oliveCartData: TemplateField[] = [
  {
    key: "olive.cart.heading",
    label: "Cart Heading",
    description: "The page title at the top of the cart.",
    type: "text",
    page: "cart",
    group: "cart.main",
    gridColumn: "col-span-1",
    defaultValue: "Your bag",
  },
  {
    key: "olive.cart.intro",
    label: "Cart Intro Line",
    description:
      "One line under the cart heading. Leave blank to show the heading on its own.",
    type: "textarea",
    page: "cart",
    group: "cart.main",
    gridColumn: "col-span-full",
    defaultValue:
      "Everything you have picked, in one place. Nothing is charged until the last step.",
  },
  {
    key: "olive.cart.summary-heading",
    label: "Summary Card Heading",
    description: "Heading on the summary card beside the line items.",
    type: "text",
    page: "cart",
    group: "cart.main",
    gridColumn: "col-span-1",
    defaultValue: "Order summary",
  },
  {
    key: "olive.cart.summary-note",
    label: "Summary Card Note",
    description:
      "Quiet line under the subtotal explaining what is still to come. Leave blank to hide.",
    type: "textarea",
    page: "cart",
    group: "cart.main",
    gridColumn: "col-span-full",
    defaultValue: "Shipping and tax are worked out at checkout.",
  },
  {
    key: "olive.cart.checkout-label",
    label: "Checkout Button Label",
    description: "Label on the primary button that starts checkout.",
    type: "text",
    page: "cart",
    group: "cart.main",
    gridColumn: "col-span-1",
    defaultValue: "Continue to checkout",
  },
  {
    key: "olive.cart.continue-shopping",
    label: "Keep Shopping Link Label",
    description: "The quiet text link back to the shop, above the line items.",
    type: "text",
    page: "cart",
    group: "cart.main",
    gridColumn: "col-span-1",
    defaultValue: "Keep shopping",
  },
  {
    key: "olive.cart.empty-heading",
    label: "Empty Bag Heading",
    description: "Heading on the card shown when the bag has nothing in it.",
    type: "text",
    page: "cart",
    group: "cart.main",
    gridColumn: "col-span-1",
    defaultValue: "Nothing in your bag yet",
  },
  {
    key: "olive.cart.empty-body",
    label: "Empty Bag Body",
    description: "One line under the empty-bag heading.",
    type: "textarea",
    page: "cart",
    group: "cart.main",
    gridColumn: "col-span-full",
    defaultValue: "The new arrivals are this way.",
  },
  {
    key: "olive.cart.empty-cta",
    label: "Empty Bag Button Label",
    description: "Label on the button back to the shop from the empty bag.",
    type: "text",
    page: "cart",
    group: "cart.main",
    gridColumn: "col-span-1",
    defaultValue: "Shop new",
  },
];

export const oliveCartFieldGroups: TemplateFieldGroup[] = [
  {
    id: "cart.main",
    title: "Cart",
    description:
      "Heading, intro line, summary card copy and the empty-bag card",
    icon: "🛍️",
    columns: 2,
  } satisfies TemplateFieldGroup,
];

/**
 * The cart is a single section and it is the page, so it is not hideable —
 * hiding it would leave a shopper with a bag and no way to see it.
 */
export const oliveCartSections: TemplateSection[] = [
  {
    id: "cart.main",
    page: "cart",
    title: "Cart",
    description:
      "Title block, line-item cards, the summary card and the empty-bag state",
    groupIds: ["cart.main"],
    order: 0,
    hideable: false,
  },
];
