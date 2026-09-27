import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

/**
 * Cart copy — shared between the slide-out cart panel
 * (`elegant-cart-drawer.tsx`), the cart page's item list
 * (`elegant-cart-content.tsx`), and the cart page shell
 * (`elegant-cart-page.tsx`). Grouped under `page: "global"` /
 * `group: "global.cart"` like bamboo's cart panel fields, since the panel
 * itself is reachable from every page. Structural labels (Subtotal, Remove,
 * Checkout, Order summary, aria-labels) stay hardcoded.
 *
 * The panel/content empty states and checkout notes were two different
 * strings each ("Nothing here yet." vs "Your bag is empty.", "Shipping and
 * taxes calculated at checkout." vs "Tax & shipping at checkout") — kept as
 * separate fields rather than unified, so today's copy round-trips exactly.
 */
export const elegantCartData: TemplateField[] = [
  {
    key: "elegant.global.cart-title",
    label: "Cart panel title",
    description:
      "Small heading at the top of the cart panel that slides out from the side, shown before the item count.",
    type: "text",
    page: "global",
    group: "global.cart",
    gridColumn: "col-span-1",
    defaultValue: "Your bag",
    placeholder: "Your bag",
  },
  {
    key: "elegant.global.cart-drawer-empty-heading",
    label: "Cart panel empty heading",
    description: "Heading shown in the cart panel when it has no items.",
    type: "text",
    page: "global",
    group: "global.cart",
    gridColumn: "col-span-1",
    defaultValue: "Nothing here yet.",
    placeholder: "Nothing here yet.",
  },
  {
    key: "elegant.global.cart-page-empty-heading",
    label: "Cart page empty heading",
    description: "Heading shown on the cart page when it has no items.",
    type: "text",
    page: "global",
    group: "global.cart",
    gridColumn: "col-span-1",
    defaultValue: "Your bag is empty.",
    placeholder: "Your bag is empty.",
  },
  {
    key: "elegant.global.cart-empty-body",
    label: "Empty cart message",
    description:
      "Line shown below the empty heading in both the cart panel and the cart page. Leave blank to hide.",
    type: "text",
    page: "global",
    group: "global.cart",
    gridColumn: "col-span-1",
    defaultValue: "Find something to take home.",
    placeholder: "Find something to take home.",
  },
  {
    key: "elegant.global.cart-browse-button",
    label: "Browse button text",
    description:
      "Button shown when the cart is empty, in both the cart panel and the cart page, linking to the shop.",
    type: "text",
    page: "global",
    group: "global.cart",
    gridColumn: "col-span-1",
    defaultValue: "Browse shop",
    placeholder: "Browse shop",
  },
  {
    key: "elegant.global.cart-drawer-note",
    label: "Cart panel checkout note",
    description:
      "Small line above the checkout button in the cart panel. Leave blank to hide.",
    type: "text",
    page: "global",
    group: "global.cart",
    gridColumn: "col-span-1",
    defaultValue: "Shipping and taxes calculated at checkout.",
    placeholder: "e.g. Free shipping on orders over $50.",
  },
  {
    key: "elegant.global.cart-page-note",
    label: "Cart page checkout note",
    description:
      "Small line below the checkout button on the cart page. Leave blank to hide.",
    type: "text",
    page: "global",
    group: "global.cart",
    gridColumn: "col-span-1",
    defaultValue: "Tax & shipping at checkout",
    placeholder: "Tax & shipping at checkout",
  },
  {
    key: "elegant.global.cart-page-label",
    label: "Cart page small label",
    description: "Small label shown above the heading on the cart page.",
    type: "text",
    page: "global",
    group: "global.cart",
    gridColumn: "col-span-1",
    defaultValue: "Review",
    placeholder: "Review",
  },
  {
    key: "elegant.global.cart-page-heading",
    label: "Cart page heading",
    description: "Large heading at the top of the cart page.",
    type: "text",
    page: "global",
    group: "global.cart",
    gridColumn: "col-span-1",
    defaultValue: "Your bag.",
    placeholder: "Your bag.",
  },
];

export const elegantCartFieldGroups: TemplateFieldGroup[] = [
  {
    id: "global.cart",
    title: "Cart",
    description:
      "Wording inside the cart panel that slides out from the side, and on the cart page.",
    icon: "🛒",
  } satisfies TemplateFieldGroup,
];
