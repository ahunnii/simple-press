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
    label: "Cart Heading",
    description: "The main heading at the top of the cart page.",
    type: "text",
    page: "cart",
    group: "cart.main",
    gridColumn: "col-span-1",
    defaultValue: "Your basket",
  },
  {
    key: "pink.cart.intro",
    label: "Cart Intro",
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
    label: "Basket Summary Note",
    description:
      "Small line under the totals in the ink basket panel — explains that discounts and shipping are handled at the next step.",
    type: "textarea",
    page: "cart",
    group: "cart.main",
    gridColumn: "col-span-full",
    defaultValue: "Discount codes and shipping are added at checkout.",
  },
  {
    key: "pink.cart.checkout-label",
    label: "Checkout Button Label",
    description: "Label on the button that continues from cart to checkout.",
    type: "text",
    page: "cart",
    group: "cart.main",
    gridColumn: "col-span-1",
    defaultValue: "Continue to checkout",
  },
  {
    key: "pink.cart.continue-shopping-label",
    label: "Continue Shopping Label",
    description:
      "Quiet link label back to the shop, under the checkout button.",
    type: "text",
    page: "cart",
    group: "cart.main",
    gridColumn: "col-span-1",
    defaultValue: "Keep shopping",
  },
  {
    key: "pink.cart.empty-heading",
    label: "Empty Basket Heading",
    description: "Heading shown when the basket has no items.",
    type: "text",
    page: "cart",
    group: "cart.main",
    gridColumn: "col-span-1",
    defaultValue: "Your basket is empty.",
  },
  {
    key: "pink.cart.empty-body",
    label: "Empty Basket Body",
    description: "Short line under the empty-basket heading.",
    type: "textarea",
    page: "cart",
    group: "cart.main",
    gridColumn: "col-span-full",
    defaultValue:
      "Anything you add will start here — a doll, a magnet, a piece of jewelry.",
  },
  {
    key: "pink.cart.empty-cta",
    label: "Empty Basket CTA Label",
    description: "Button label on the empty-basket state.",
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
    title: "Cart Page",
    description:
      "Heading, intro, basket summary copy, and empty-state messaging for the cart page",
    icon: "🧺",
    columns: 2,
  } satisfies TemplateFieldGroup,
];
