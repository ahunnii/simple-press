import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

// ─── Cart page field definitions ─────────────────────────────────────────────

export const viiCartData: TemplateField[] = [
  {
    key: "vii.cart.overline",
    label: "Small label",
    description: "Small label shown above the cart page heading.",
    type: "text",
    page: "cart",
    group: "cart.main",
    gridColumn: "col-span-1",
    defaultValue: "Your Selection",
  },
  {
    key: "vii.cart.heading",
    label: "Heading",
    description: "The main heading on the cart page.",
    type: "text",
    page: "cart",
    group: "cart.main",
    gridColumn: "col-span-1",
    defaultValue: "Your Bag",
  },
  {
    key: "vii.cart.empty-heading",
    label: "Empty cart heading",
    description: "Heading shown when the cart contains no items.",
    type: "text",
    page: "cart",
    group: "cart.main",
    gridColumn: "col-span-1",
    defaultValue: "Your bag is empty",
  },
  {
    key: "vii.cart.empty-body",
    label: "Empty cart message",
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
    label: "Empty cart button text",
    description: "Button text shown on the empty cart state.",
    type: "text",
    page: "cart",
    group: "cart.main",
    gridColumn: "col-span-1",
    defaultValue: "Shop Products",
  },
  {
    key: "vii.cart.continue-shopping",
    label: "Continue shopping link text",
    description:
      "Quiet link text shown below the checkout button in the order summary.",
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
    title: "Cart page",
    description:
      "Small label, page heading, empty-cart messaging, and the continue-shopping link.",
    icon: "🛍️",
    columns: 2,
  },
];
