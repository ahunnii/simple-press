import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";

/**
 * Order confirmation copy (page "checkout", group "checkout.confirmation").
 * Rendered by `GloveOrderConfirmation`, resolved server-side in
 * `GloveOrderSuccessPage`. The "next steps" fields are newline-separated
 * lists (one step per line); the pickup variant is used when the order was
 * placed for in-store pickup.
 */
export const gloveOrderData: TemplateField[] = [
  {
    key: "glove.checkout.confirmation-heading",
    label: "Heading",
    description: "Main heading on the order confirmation page.",
    type: "text",
    page: "checkout",
    group: "checkout.confirmation",
    gridColumn: "col-span-full",
    defaultValue: "Thank you. Your order has been received.",
    placeholder: "e.g. Thanks, we have it!",
  },
  {
    key: "glove.checkout.confirmation-body",
    label: "Intro text",
    description: "Line under the heading. Leave blank to hide it.",
    type: "textarea",
    page: "checkout",
    group: "checkout.confirmation",
    gridColumn: "col-span-full",
    defaultValue: "A receipt is on its way to your inbox.",
    placeholder: "e.g. We will be in touch soon.",
  },
  {
    key: "glove.checkout.confirmation-items-heading",
    label: "Order details heading",
    description:
      "Heading above the list of items that were just bought. The list only appears when the items are still in the customer's cart on arrival.",
    type: "text",
    page: "checkout",
    group: "checkout.confirmation",
    gridColumn: "col-span-1",
    defaultValue: "Order details",
    placeholder: "e.g. What you ordered",
  },
  {
    key: "glove.checkout.confirmation-next-heading",
    label: "Next steps heading",
    description: "Heading above the list of what happens next.",
    type: "text",
    page: "checkout",
    group: "checkout.confirmation",
    gridColumn: "col-span-1",
    defaultValue: "What happens next?",
    placeholder: "e.g. What to expect",
  },
  {
    key: "glove.checkout.confirmation-next-steps",
    label: "Next steps for shipped orders",
    description:
      "One step per line. Shown under the next steps heading for orders that ship. Leave blank to hide the list.",
    type: "textarea",
    page: "checkout",
    group: "checkout.confirmation",
    gridColumn: "col-span-full",
    defaultValue:
      "You'll receive an email confirmation shortly\nWe'll notify you when your order ships\nTrack your order status via email",
    placeholder: "One step per line",
  },
  {
    key: "glove.checkout.confirmation-next-steps-pickup",
    label: "Next steps for pickup orders",
    description:
      "One step per line. Shown instead of the shipped list when the customer chose in-store pickup.",
    type: "textarea",
    page: "checkout",
    group: "checkout.confirmation",
    gridColumn: "col-span-full",
    defaultValue:
      "You'll receive an email confirmation shortly\nWe'll let you know when your order is ready for pickup",
    placeholder: "One step per line",
  },
  {
    key: "glove.checkout.confirmation-track-label",
    label: "Track order button label",
    description:
      "Button that goes to the order tracking page. Leave blank to hide it.",
    type: "text",
    page: "checkout",
    group: "checkout.confirmation",
    gridColumn: "col-span-1",
    defaultValue: "Track Your Order",
    placeholder: "e.g. Where is my order?",
  },
  {
    key: "glove.checkout.confirmation-continue-label",
    label: "Continue shopping button label",
    description: "Button that goes back to the shop. Leave blank to hide it.",
    type: "text",
    page: "checkout",
    group: "checkout.confirmation",
    gridColumn: "col-span-1",
    defaultValue: "Continue shopping",
    placeholder: "e.g. Keep browsing",
  },
  {
    key: "glove.checkout.confirmation-loading",
    label: "Loading text",
    description: "Shown briefly while the order details load.",
    type: "text",
    page: "checkout",
    group: "checkout.confirmation",
    gridColumn: "col-span-1",
    defaultValue: "Confirming your order…",
    placeholder: "e.g. One moment…",
  },
  {
    key: "glove.checkout.confirmation-no-order-heading",
    label: "No order heading",
    description:
      "Heading shown if the page is opened without an order to display.",
    type: "text",
    page: "checkout",
    group: "checkout.confirmation",
    gridColumn: "col-span-1",
    defaultValue: "We couldn't find that order",
    placeholder: "e.g. No order here",
  },
  {
    key: "glove.checkout.confirmation-no-order-body",
    label: "No order text",
    description: "Message under the no order heading. Leave blank to hide it.",
    type: "textarea",
    page: "checkout",
    group: "checkout.confirmation",
    gridColumn: "col-span-full",
    defaultValue:
      "This page needs an order to show. If you just checked out, check your email for a receipt.",
    placeholder: "e.g. Try your email receipt instead.",
  },
];

export const gloveOrderFieldGroups: TemplateFieldGroup[] = [
  {
    id: "checkout.confirmation",
    title: "Order confirmation",
    description:
      "Heading, next steps and buttons on the page customers land on after paying",
    icon: "✅",
    columns: 2,
  } satisfies TemplateFieldGroup,
];

export const gloveOrderSections: TemplateSection[] = [
  {
    id: "checkout.confirmation",
    page: "checkout",
    title: "Order confirmation",
    description:
      "Thank you message, order details, next steps and account link",
    groupIds: ["checkout.confirmation"],
    order: 3,
    hideable: false,
  },
];
