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
    label: "Checkout Heading",
    description: "The heading shown in the checkout header band.",
    type: "text",
    page: "checkout",
    group: "checkout.main",
    gridColumn: "col-span-1",
    defaultValue: "Checkout",
  },
  {
    key: "umsc.checkout.contact-heading",
    label: "Contact Information Heading",
    description: "Heading for the contact-information card.",
    type: "text",
    page: "checkout",
    group: "checkout.main",
    gridColumn: "col-span-1",
    defaultValue: "Contact information",
  },
  {
    key: "umsc.checkout.delivery-heading",
    label: "Delivery Heading",
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
    label: "Shipping Address Heading",
    description: "Heading for the shipping-address card.",
    type: "text",
    page: "checkout",
    group: "checkout.main",
    gridColumn: "col-span-1",
    defaultValue: "Shipping address",
  },
  {
    key: "umsc.checkout.summary-heading",
    label: "Order Summary Heading",
    description: "Heading on the sticky order-summary card.",
    type: "text",
    page: "checkout",
    group: "checkout.main",
    gridColumn: "col-span-1",
    defaultValue: "Order summary",
  },
  {
    key: "umsc.checkout.discount-label",
    label: "Discount Code Label",
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
    label: "Submit Button Label",
    description: "Label on the gold pill that places the order.",
    type: "text",
    page: "checkout",
    group: "checkout.main",
    gridColumn: "col-span-1",
    defaultValue: "Pay securely",
  },
  {
    key: "umsc.checkout.empty-heading",
    label: "Empty Bag Heading",
    description: "Heading shown when checkout is reached with an empty bag.",
    type: "text",
    page: "checkout",
    group: "checkout.main",
    gridColumn: "col-span-1",
    defaultValue: "Your bag is empty",
  },
  {
    key: "umsc.checkout.empty-cta",
    label: "Empty Bag CTA Label",
    description:
      "Label on the button shown when checkout is reached with an empty bag.",
    type: "text",
    page: "checkout",
    group: "checkout.main",
    gridColumn: "col-span-1",
    defaultValue: "Continue shopping",
  },
  {
    key: "umsc.checkout.unavailable-heading",
    label: "Checkout Unavailable Heading",
    description:
      "Heading shown when the store hasn't connected online payment yet.",
    type: "text",
    page: "checkout",
    group: "checkout.main",
    gridColumn: "col-span-1",
    defaultValue: "Checkout unavailable",
  },
  {
    key: "umsc.checkout.unavailable-body",
    label: "Checkout Unavailable Body",
    description:
      "Body copy shown when checkout is unavailable. The phone number from your business settings is shown separately, under this message.",
    type: "textarea",
    page: "checkout",
    group: "checkout.main",
    gridColumn: "col-span-full",
    defaultValue:
      "This shop hasn't connected online payment yet. Call or message and Monique will take your order directly.",
  },
  {
    key: "umsc.checkout.unavailable-cta",
    label: "Checkout Unavailable CTA Label",
    description: "Label on the pill that returns the shopper to the shop.",
    type: "text",
    page: "checkout",
    group: "checkout.main",
    gridColumn: "col-span-1",
    defaultValue: "Back to shop",
  },
];

// ─── Field group ──────────────────────────────────────────────────────────────

export const umscCheckoutFieldGroups: TemplateFieldGroup[] = [
  {
    id: "checkout.main",
    title: "Checkout",
    description:
      "Headings, button labels, and the unavailable-checkout message.",
    icon: "💳",
    columns: 2,
  },
];
