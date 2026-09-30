import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

// ─── Checkout field definitions ───────────────────────────────────────────────
//
// No eyebrow/kicker overlines (design.md craft floor: "no eyebrow/kicker
// labels above headings") and no baked-in step numbers — the delivery-method
// section conditionally hides when the store doesn't offer in-store pickup,
// which would break a numbered sequence (field-conventions.md).

export const umscCheckoutData: TemplateField[] = [
  {
    key: "umsc.checkout.heading",
    label: "Heading",
    description: "The heading shown in the checkout header band.",
    type: "text",
    page: "checkout",
    group: "checkout.main",
    gridColumn: "col-span-1",
    defaultValue: "Checkout",
  },
  {
    key: "umsc.checkout.contact-heading",
    label: "Contact information heading",
    description: "Heading for the contact-information card.",
    type: "text",
    page: "checkout",
    group: "checkout.main",
    gridColumn: "col-span-1",
    defaultValue: "Contact information",
  },
  {
    key: "umsc.checkout.delivery-heading",
    label: "Delivery heading",
    description:
      "Heading for the delivery-method card. Only shown when the store offers in-store pickup.",
    type: "text",
    page: "checkout",
    group: "checkout.main",
    gridColumn: "col-span-1",
    defaultValue: "Delivery",
  },
  {
    key: "umsc.checkout.shipping-heading",
    label: "Shipping address heading",
    description: "Heading for the shipping-address card.",
    type: "text",
    page: "checkout",
    group: "checkout.main",
    gridColumn: "col-span-1",
    defaultValue: "Shipping address",
  },
  {
    key: "umsc.checkout.summary-heading",
    label: "Order summary heading",
    description: "Heading on the sticky order-summary card.",
    type: "text",
    page: "checkout",
    group: "checkout.main",
    gridColumn: "col-span-1",
    defaultValue: "Order summary",
  },
  {
    key: "umsc.checkout.discount-label",
    label: "Discount code label",
    description:
      "Label above the discount-code input, when coupons are enabled.",
    type: "text",
    page: "checkout",
    group: "checkout.main",
    gridColumn: "col-span-1",
    defaultValue: "Discount code",
  },
  {
    key: "umsc.checkout.submit-label",
    label: "Submit button label",
    description: "Label on the button that places the order.",
    type: "text",
    page: "checkout",
    group: "checkout.main",
    gridColumn: "col-span-1",
    defaultValue: "Pay securely",
  },
  {
    key: "umsc.checkout.empty-heading",
    label: "Empty bag heading",
    description: "Heading shown when checkout is reached with an empty bag.",
    type: "text",
    page: "checkout",
    group: "checkout.main",
    gridColumn: "col-span-1",
    defaultValue: "Your bag is empty",
  },
  {
    key: "umsc.checkout.empty-cta",
    label: "Empty bag button label",
    description:
      "Label on the button shown when checkout is reached with an empty bag.",
    type: "text",
    page: "checkout",
    group: "checkout.main",
    gridColumn: "col-span-1",
    defaultValue: "Continue shopping",
  },
];

// ─── Field group ──────────────────────────────────────────────────────────────

export const umscCheckoutFieldGroups: TemplateFieldGroup[] = [
  {
    id: "checkout.main",
    title: "Checkout",
    description:
      "Headings, button labels, and the empty-bag messaging on the checkout form.",
    icon: "💳",
    columns: 2,
  },
];
