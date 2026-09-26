import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

/**
 * Cart page fields — design.md → "Per-page section concepts → Cart".
 *
 * `cart.main` covers the whole page (heading, intro, the ink summary panel
 * that mirrors the checkout aside, and the empty state) — the design gives
 * cart a single section, not hideable. `cart`/`checkout` are intentionally
 * absent from `PAGE_PREVIEW_PATHS`, so these fields are edited in the
 * platform-admin advanced editor only, never in `/editor`.
 */
export const pinkCartData: TemplateField[] = [
  {
    key: "pink.cart.heading",
    label: "Heading",
    description:
      "The main heading at the top of the cart page and the slide-out cart.",
    type: "text",
    page: "cart",
    group: "cart.main",
    gridColumn: "col-span-1",
    defaultValue: "Your basket",
  },
  {
    key: "pink.cart.intro",
    label: "Intro text",
    description: "One reassuring line under the heading.",
    type: "textarea",
    page: "cart",
    group: "cart.main",
    gridColumn: "col-span-full",
    defaultValue:
      "Every piece is one of a kind, so nothing is set aside until you check out.",
  },
  {
    key: "pink.cart.summary-note",
    label: "Summary note",
    description:
      "Small line under the totals on the cart page and in the slide-out cart. Leave blank to hide.",
    type: "textarea",
    page: "cart",
    group: "cart.main",
    gridColumn: "col-span-full",
    defaultValue: "Discount codes and shipping are added at checkout.",
  },
  {
    key: "pink.cart.checkout-label",
    label: "Checkout button text",
    description:
      "Text on the button that continues to checkout, on the cart page and in the slide-out cart.",
    type: "text",
    page: "cart",
    group: "cart.main",
    gridColumn: "col-span-1",
    defaultValue: "Continue to checkout",
  },
  {
    key: "pink.cart.continue-shopping-label",
    label: "Continue shopping link",
    description:
      "Quiet link back to the shop, under the checkout button.",
    type: "text",
    page: "cart",
    group: "cart.main",
    gridColumn: "col-span-1",
    defaultValue: "Keep shopping",
  },
  {
    key: "pink.cart.empty-heading",
    label: "Empty cart heading",
    description:
      "Heading shown on the cart page and in the slide-out cart when the cart has no items.",
    type: "text",
    page: "cart",
    group: "cart.main",
    gridColumn: "col-span-1",
    defaultValue: "Your basket is empty.",
  },
  {
    key: "pink.cart.empty-body",
    label: "Empty cart message",
    description:
      "Short line under the empty cart heading, on the cart page and in the slide-out cart. Leave blank to hide.",
    type: "textarea",
    page: "cart",
    group: "cart.main",
    gridColumn: "col-span-full",
    defaultValue:
      "Anything you add will start here — a doll, a magnet, a piece of jewelry.",
  },
  {
    key: "pink.cart.empty-cta",
    label: "Empty cart button text",
    description:
      "Text on the link to the shop when the cart is empty, on the cart page and in the slide-out cart. Leave blank to hide it.",
    type: "text",
    page: "cart",
    group: "cart.main",
    gridColumn: "col-span-1",
    defaultValue: "Shop the collection",
  },
];

export const pinkCartFieldGroups: TemplateFieldGroup[] = [
  {
    id: "cart.main",
    title: "Cart page",
    description:
      "Heading, intro, basket summary copy, and empty-state messaging for the cart page",
    icon: "🧺",
    columns: 2,
  } satisfies TemplateFieldGroup,
];
