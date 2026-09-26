import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

/**
 * Order-success fields — design.md → "Order success [extrapolated]". Group
 * `checkout.success`, kept on the `checkout` page key per the assignment.
 *
 * Data reality: `/api/stripe/session` returns `customer_email`,
 * `amount_total`, `currency`, `payment_status` and `delivery_method` (no
 * order number or shipping address). Pickup orders swap in the pickup body
 * and next steps and show the Settings pickup location.
 * The item list is reconstructed from the shopper's own cart state (captured
 * the instant the page mounts, before `clearCart()` runs) rather than from
 * the session, so "shipping address" and "delivery method" rows from the
 * design are replaced with what's actually available: order total, email,
 * payment status and (for pickup orders) the pickup location, in the same
 * summary-panel language as checkout.
 */
export const pinkOrderData: TemplateField[] = [
  {
    key: "pink.order.heading",
    label: "Thank-you heading",
    description: "The first word of the two-part thank-you heading.",
    type: "text",
    page: "checkout",
    group: "checkout.success",
    gridColumn: "col-span-1",
    defaultValue: "Thank",
  },
  {
    key: "pink.order.heading-accent",
    label: "Thank-you heading accent",
    description:
      "The rest of the thank-you heading, shown in the accent color.",
    type: "text",
    page: "checkout",
    group: "checkout.success",
    gridColumn: "col-span-1",
    defaultValue: "you.",
  },
  {
    key: "pink.order.body",
    label: "Shipping message",
    description:
      "One line under the thank-you heading for orders being shipped. Leave blank to hide.",
    type: "textarea",
    page: "checkout",
    group: "checkout.success",
    gridColumn: "col-span-full",
    defaultValue:
      "Thanks for your order. We'll email you as soon as it's on its way.",
    placeholder: "e.g. We'll email you when your order ships.",
  },
  {
    key: "pink.order.pickup-body",
    label: "Pickup message",
    description:
      "Shown instead of the shipping message above when the shopper chose to pick up their order. The pickup location from Settings appears in the order summary. Leave blank to hide.",
    type: "textarea",
    page: "checkout",
    group: "checkout.success",
    gridColumn: "col-span-full",
    defaultValue:
      "Thanks for your order. We'll email you when it's ready to pick up.",
    placeholder: "e.g. We'll email you when your order is ready.",
  },
  {
    key: "pink.order.items-heading",
    label: "Items heading",
    description: "Heading over the ordered-items list on the left.",
    type: "text",
    page: "checkout",
    group: "checkout.success",
    gridColumn: "col-span-1",
    defaultValue: "What you ordered",
  },
  {
    key: "pink.order.summary-heading",
    label: "Summary heading",
    description: "Heading at the top of the order summary panel.",
    type: "text",
    page: "checkout",
    group: "checkout.success",
    gridColumn: "col-span-1",
    defaultValue: "Order summary",
  },
  {
    key: "pink.checkout.next-steps-label",
    label: "Next steps label",
    description:
      "Small label shown above the next-steps list in the order summary panel.",
    type: "text",
    page: "checkout",
    group: "checkout.success",
    gridColumn: "col-span-1",
    defaultValue: "What happens next",
  },
  {
    key: "pink.order.next-steps",
    label: "Next steps",
    description:
      "One step per line, shown as a small list in the summary panel. Leave blank to hide the list.",
    type: "textarea",
    page: "checkout",
    group: "checkout.success",
    gridColumn: "col-span-full",
    defaultValue:
      "A confirmation email is on its way.\nWe'll email you again the moment your order ships.\nQuestions? Just reply to that email.",
  },
  {
    key: "pink.order.next-steps-pickup",
    label: "Pickup next steps",
    description:
      "Shown instead of the next steps above when the shopper chose to pick up their order. One step per line. Leave blank to hide the list.",
    type: "textarea",
    page: "checkout",
    group: "checkout.success",
    gridColumn: "col-span-full",
    defaultValue:
      "A confirmation email is on its way.\nWe'll email you when your order is ready to pick up.\nQuestions? Just reply to that email.",
    placeholder: "One step per line",
  },
  {
    key: "pink.checkout.success-note",
    label: "Purchase note",
    description:
      "Optional message in the order summary, such as when orders ship or how pickup works. Leave blank to hide.",
    type: "textarea",
    page: "checkout",
    group: "checkout.success",
    gridColumn: "col-span-full",
    defaultValue: "",
    placeholder: "e.g. Orders usually ship within 3 business days.",
  },
  {
    key: "pink.order.receipt-note",
    label: "Receipt note",
    description:
      "Shown in place of the item list when the ordered items can't be shown, for example after a page refresh.",
    type: "text",
    page: "checkout",
    group: "checkout.success",
    gridColumn: "col-span-full",
    defaultValue: "Your receipt is on its way by email.",
    placeholder: "e.g. Check your email for your receipt.",
  },
  {
    key: "pink.order.continue-cta",
    label: "Continue shopping button text",
    description: "Text on the primary button back to the shop.",
    type: "text",
    page: "checkout",
    group: "checkout.success",
    gridColumn: "col-span-1",
    defaultValue: "Continue shopping",
  },
  {
    key: "pink.order.loading-text",
    label: "Loading text",
    description: "Message shown while the order is being confirmed.",
    type: "text",
    page: "checkout",
    group: "checkout.success",
    gridColumn: "col-span-1",
    defaultValue: "Confirming your order…",
  },
  {
    key: "pink.order.no-order-heading",
    label: "No order heading",
    description: "Heading shown when no order session is present in the URL.",
    type: "text",
    page: "checkout",
    group: "checkout.success",
    gridColumn: "col-span-1",
    defaultValue: "No order found",
  },
  {
    key: "pink.order.no-order-body",
    label: "No order message",
    description: "Text shown beneath the no-order heading.",
    type: "textarea",
    page: "checkout",
    group: "checkout.success",
    gridColumn: "col-span-full",
    defaultValue:
      "This page needs an order to show. If you just checked out, check your email for a receipt.",
  },
  {
    key: "pink.order.no-order-cta",
    label: "No order button text",
    description: "Text on the button shown on the no-order state.",
    type: "text",
    page: "checkout",
    group: "checkout.success",
    gridColumn: "col-span-1",
    defaultValue: "Back to shop",
  },
  {
    key: "pink.order.cta-heading",
    label: "Closing heading",
    description: "Heading in the closing panel at the bottom of the page.",
    type: "text",
    page: "checkout",
    group: "checkout.success",
    gridColumn: "col-span-full",
    defaultValue: "There's always something new on the table.",
  },
  {
    key: "pink.order.cta-body",
    label: "Closing text",
    description: "One line under the closing heading.",
    type: "textarea",
    page: "checkout",
    group: "checkout.success",
    gridColumn: "col-span-full",
    defaultValue:
      "New pieces post to the shop first. Make & takes are booked by request.",
  },
  {
    key: "pink.order.cta-button",
    label: "Button text",
    description:
      "Text on the primary button in the closing panel. Leave blank to hide the button.",
    type: "text",
    page: "checkout",
    group: "checkout.success",
    gridColumn: "col-span-1",
    defaultValue: "Keep browsing",
  },
  {
    key: "pink.order.cta-link",
    label: "Button link",
    description: "Where the closing panel's primary button goes.",
    type: "url",
    page: "checkout",
    group: "checkout.success",
    gridColumn: "col-span-1",
    defaultValue: "/shop",
  },
  {
    key: "pink.order.cta-secondary-label",
    label: "Second button text",
    description: "Text on the secondary button. Leave blank to hide it.",
    type: "text",
    page: "checkout",
    group: "checkout.success",
    gridColumn: "col-span-1",
    defaultValue: "See the make & takes",
  },
  {
    key: "pink.order.cta-secondary-link",
    label: "Second button link",
    description: "Where the secondary button goes.",
    type: "url",
    page: "checkout",
    group: "checkout.success",
    gridColumn: "col-span-1",
    defaultValue: "/services",
  },
];

export const pinkOrderFieldGroups: TemplateFieldGroup[] = [
  {
    id: "checkout.success",
    title: "Order confirmation",
    description:
      "Thank-you heading, next steps, order summary labels, and the closing panel on the order success page",
    icon: "✓",
    columns: 2,
  } satisfies TemplateFieldGroup,
];
