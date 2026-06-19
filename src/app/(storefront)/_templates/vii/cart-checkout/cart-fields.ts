import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

// ─── Cart page field definitions ─────────────────────────────────────────────

export const viiCartData: TemplateField[] = [
  {
    key: "vii.cart.overline",
    label: "Cart Page Overline",
    description:
      "Small uppercase kicker label shown above the cart page heading.",
    type: "text",
    page: "cart",
    group: "cart.main",
    gridColumn: "col-span-1",
    defaultValue: "Your Selection",
  },
  {
    key: "vii.cart.heading",
    label: "Cart Page Heading",
    description: "The main heading on the cart page.",
    type: "text",
    page: "cart",
    group: "cart.main",
    gridColumn: "col-span-1",
    defaultValue: "Your Bag",
  },
  {
    key: "vii.cart.empty-heading",
    label: "Empty Cart Heading",
    description: "Heading shown when the cart contains no items.",
    type: "text",
    page: "cart",
    group: "cart.main",
    gridColumn: "col-span-1",
    defaultValue: "Your bag is empty",
  },
  {
    key: "vii.cart.empty-body",
    label: "Empty Cart Body",
    description: "Short message shown below the empty cart heading.",
    type: "text",
    page: "cart",
    group: "cart.main",
    gridColumn: "col-span-1",
    defaultValue:
      "Explore our collection and find something made for your skin.",
  },
  {
    key: "vii.cart.empty-cta",
    label: "Empty Cart CTA Label",
    description: "Button label for the call-to-action on the empty cart state.",
    type: "text",
    page: "cart",
    group: "cart.main",
    gridColumn: "col-span-1",
    defaultValue: "Shop Products",
  },
  {
    key: "vii.cart.continue-shopping",
    label: "Continue Shopping Label",
    description:
      "Quiet link label shown below the checkout button in the order summary.",
    type: "text",
    page: "cart",
    group: "cart.main",
    gridColumn: "col-span-1",
    defaultValue: "Continue shopping",
  },
];

// ─── Field groups ─────────────────────────────────────────────────────────────

export const viiCartFieldGroups: TemplateFieldGroup[] = [
  {
    id: "cart.main",
    title: "Cart Page",
    description:
      "Overline, page heading, empty-state messaging, and the continue-shopping label.",
    icon: "🛍️",
    columns: 2,
  },
];
