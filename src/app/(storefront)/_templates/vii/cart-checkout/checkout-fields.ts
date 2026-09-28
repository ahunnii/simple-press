import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

// ─── Checkout field definitions ───────────────────────────────────────────────

export const viiCheckoutData: TemplateField[] = [
  {
    key: "vii.checkout.heading",
    label: "Heading",
    description: "The heading shown in the checkout header bar.",
    type: "text",
    page: "checkout",
    group: "checkout.main",
    gridColumn: "col-span-1",
    defaultValue: "Checkout",
  },
  {
    key: "vii.checkout.contact-overline",
    label: "Contact information: small label",
    description:
      "Short label shown next to the contact step's automatically-numbered step marker (e.g. 'Step 1').",
    type: "text",
    page: "checkout",
    group: "checkout.main",
    gridColumn: "col-span-1",
    defaultValue: "Your details",
  },
  {
    key: "vii.checkout.contact-heading",
    label: "Contact information: heading",
    description: "Heading for the contact information fields.",
    type: "text",
    page: "checkout",
    group: "checkout.main",
    gridColumn: "col-span-1",
    defaultValue: "Contact Information",
  },
  {
    key: "vii.checkout.delivery-overline",
    label: "Delivery: small label",
    description:
      "Short label shown next to the delivery step's automatically-numbered step marker (e.g. 'Step 2'). This step only appears when in-store pickup is offered, so the number shown adjusts automatically.",
    type: "text",
    page: "checkout",
    group: "checkout.main",
    gridColumn: "col-span-1",
    defaultValue: "Delivery method",
  },
  {
    key: "vii.checkout.delivery-heading",
    label: "Delivery: heading",
    description: "Heading for the delivery method section.",
    type: "text",
    page: "checkout",
    group: "checkout.main",
    gridColumn: "col-span-1",
    defaultValue: "Delivery",
  },
  {
    key: "vii.checkout.shipping-overline",
    label: "Shipping address: small label",
    description:
      "Short label shown next to the shipping-address step's automatically-numbered step marker (e.g. 'Step 2' or 'Step 3', depending on whether the delivery step above is shown). Only shown when the customer chooses shipping over pickup.",
    type: "text",
    page: "checkout",
    group: "checkout.main",
    gridColumn: "col-span-1",
    defaultValue: "Where it ships",
  },
  {
    key: "vii.checkout.shipping-heading",
    label: "Shipping address: heading",
    description: "Heading for the shipping address fields.",
    type: "text",
    page: "checkout",
    group: "checkout.main",
    gridColumn: "col-span-1",
    defaultValue: "Shipping Address",
  },
  {
    key: "vii.checkout.summary-overline",
    label: "Order summary: small label",
    description: "Small label on the order summary panel.",
    type: "text",
    page: "checkout",
    group: "checkout.main",
    gridColumn: "col-span-1",
    defaultValue: "Your Order",
  },
  {
    key: "vii.checkout.summary-heading",
    label: "Order summary: heading",
    description: "Heading for the order summary panel.",
    type: "text",
    page: "checkout",
    group: "checkout.main",
    gridColumn: "col-span-1",
    defaultValue: "Order Summary",
  },
  {
    key: "vii.checkout.submit-label",
    label: "Submit button text",
    description: "Text on the primary checkout submit button.",
    type: "text",
    page: "checkout",
    group: "checkout.main",
    gridColumn: "col-span-1",
    defaultValue: "Continue to payment",
  },
  {
    key: "vii.checkout.empty-heading",
    label: "Empty bag heading",
    description: "Heading shown when the bag is empty.",
    type: "text",
    page: "checkout",
    group: "checkout.main",
    gridColumn: "col-span-1",
    defaultValue: "Your bag is empty",
  },
  {
    key: "vii.checkout.empty-cta",
    label: "Empty bag button text",
    description: "Text on the button shown when the bag is empty.",
    type: "text",
    page: "checkout",
    group: "checkout.main",
    gridColumn: "col-span-1",
    defaultValue: "Continue shopping",
  },
  {
    key: "vii.checkout.unavailable-heading",
    label: "Heading",
    description:
      "Heading shown on the checkout page when the store hasn't set up online payments yet.",
    type: "text",
    page: "checkout",
    group: "checkout.unavailable",
    gridColumn: "col-span-1",
    defaultValue: "Checkout unavailable",
    placeholder: "Checkout unavailable",
  },
  {
    key: "vii.checkout.unavailable-body",
    label: "Body text",
    description: "Message shown below the heading. Leave blank to hide it.",
    type: "textarea",
    page: "checkout",
    group: "checkout.unavailable",
    gridColumn: "col-span-full",
    defaultValue:
      "This store hasn't set up payment processing yet. Please contact the store owner.",
  },
];

// ─── Field groups ─────────────────────────────────────────────────────────────

export const viiCheckoutFieldGroups: TemplateFieldGroup[] = [
  {
    id: "checkout.main",
    title: "Checkout",
    description:
      "Headings, small labels, button text, and messaging for the checkout flow",
    icon: "💳",
    columns: 2,
  },
  {
    id: "checkout.unavailable",
    title: "Checkout unavailable",
    description:
      "Shown on the checkout page when online payments aren't set up yet.",
    icon: "⏸️",
    columns: 2,
  } satisfies TemplateFieldGroup,
];
