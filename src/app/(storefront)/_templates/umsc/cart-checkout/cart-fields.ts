import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

// ─── Cart page field definitions ─────────────────────────────────────────────
//
// Cart/checkout fields are not reachable in `/editor` (cart/checkout are
// intentionally absent from PAGE_PREVIEW_PATHS — the preview iframe's cart is
// always empty). Owners edit them in the platform-admin advanced editor.

export const umscCartData: TemplateField[] = [
  {
    key: "umsc.cart.heading",
    label: "Heading",
    description: "The heading shown at the top of the cart page.",
    type: "text",
    page: "cart",
    group: "cart.main",
    gridColumn: "col-span-1",
    defaultValue: "Your Bag",
  },
  {
    key: "umsc.cart.empty-heading",
    label: "Empty bag heading",
    description: "Heading shown when the bag has no items.",
    type: "text",
    page: "cart",
    group: "cart.main",
    gridColumn: "col-span-1",
    defaultValue: "Your bag is empty",
  },
  {
    key: "umsc.cart.empty-body",
    label: "Empty bag message",
    description: "Short line shown under the empty-bag heading.",
    type: "textarea",
    page: "cart",
    group: "cart.main",
    gridColumn: "col-span-full",
    defaultValue: "Pick a door below and find something for your shelf.",
  },
  {
    key: "umsc.cart.continue-shopping",
    label: "Continue shopping link",
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
    label: "Checkout button text",
    description: "Label on the button that continues to checkout.",
    type: "text",
    page: "cart",
    group: "cart.main",
    gridColumn: "col-span-1",
    defaultValue: "Checkout",
  },
  {
    key: "umsc.cart.empty-shop-all-label",
    label: "Empty bag shop-all button text",
    description:
      "Button shown on the empty-bag state that links to the full shop — the way back when the doors below don't fit.",
    type: "text",
    page: "cart",
    group: "cart.main",
    gridColumn: "col-span-1",
    defaultValue: "Shop all",
  },
  {
    key: "umsc.cart.empty-doors",
    label: "Empty bag doors",
    description:
      "The doors shown on the empty-bag state. Leave empty to show your first four published collections (in Admin → Collections order); add rows to pick your own, each with an image, title, and link.",
    type: "list",
    page: "cart",
    group: "cart.main",
    gridColumn: "col-span-full",
    maxItems: 4,
    itemLabel: "door",
    summaryKey: "title",
    itemSchema: [
      {
        key: "image",
        label: "Image",
        type: "image",
        description: "Image shown on the door.",
        placeholder: "Upload a door image",
      },
      {
        key: "title",
        label: "Title",
        type: "text",
        description: "Short label on the door, e.g. a product category.",
        placeholder: "e.g. Gift sets",
      },
      {
        key: "link",
        label: "Link",
        type: "text",
        description: "Where the door links to.",
        placeholder: "e.g. /collections/your-collection",
      },
    ],
  },
];

// ─── Field groups ─────────────────────────────────────────────────────────────

export const umscCartFieldGroups: TemplateFieldGroup[] = [
  {
    id: "cart.main",
    title: "Cart page",
    description: "Heading, empty-state messaging, doors, and button labels.",
    icon: "🛍️",
    columns: 2,
  },
];
