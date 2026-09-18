import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

// ─── Cart page field definitions ─────────────────────────────────────────────
//
// Cart/checkout fields are not reachable in `/editor` (cart/checkout are
// intentionally absent from PAGE_PREVIEW_PATHS — the preview iframe's cart is
// always empty). Owners edit them in the platform-admin advanced editor.

export const umscCartData: TemplateField[] = [
  {
    key: "umsc.cart.heading",
    label: "Cart Page Heading",
    description: "The heading shown at the top of the cart page.",
    type: "text",
    page: "cart",
    group: "cart.main",
    gridColumn: "col-span-1",
    defaultValue: "Your Bag",
  },
  {
    key: "umsc.cart.empty-heading",
    label: "Empty Bag Heading",
    description: "Heading shown when the bag has no items.",
    type: "text",
    page: "cart",
    group: "cart.main",
    gridColumn: "col-span-1",
    defaultValue: "Your bag is empty",
  },
  {
    key: "umsc.cart.empty-body",
    label: "Empty Bag Body",
    description: "Short line shown under the empty-bag heading.",
    type: "textarea",
    page: "cart",
    group: "cart.main",
    gridColumn: "col-span-full",
    defaultValue: "Pick a door below and find something for your shelf.",
  },
  {
    key: "umsc.cart.continue-shopping",
    label: "Continue Shopping Label",
    description:
      "Quiet link label under the checkout button in the summary card.",
    type: "text",
    page: "cart",
    group: "cart.main",
    gridColumn: "col-span-1",
    defaultValue: "Continue shopping",
  },
  {
    key: "umsc.cart.checkout-cta",
    label: "Checkout Button Label",
    description: "Label on the gold pill button that continues to checkout.",
    type: "text",
    page: "cart",
    group: "cart.main",
    gridColumn: "col-span-1",
    defaultValue: "Checkout",
  },
  {
    key: "umsc.cart.empty-doors",
    label: "Empty Bag Doors",
    description:
      "The product-type doors shown on the empty-bag state, each with an image, title, and link. Leave all rows blank to use the four default doors (Candles, Soaps, Body Care, Home Care).",
    type: "list",
    page: "cart",
    group: "cart.main",
    gridColumn: "col-span-full",
    maxItems: 4,
    itemSchema: [
      {
        key: "image",
        label: "Image",
        type: "image",
        placeholder: "Upload a door image",
      },
      {
        key: "title",
        label: "Title",
        type: "text",
        placeholder: "e.g. Candles",
      },
      {
        key: "link",
        label: "Link",
        type: "text",
        placeholder: "e.g. /collections/candles",
      },
    ],
  },
];

// ─── Field groups ─────────────────────────────────────────────────────────────

export const umscCartFieldGroups: TemplateFieldGroup[] = [
  {
    id: "cart.main",
    title: "Cart Page",
    description: "Heading, empty-state messaging, doors, and button labels.",
    icon: "🛍️",
    columns: 2,
  },
];
