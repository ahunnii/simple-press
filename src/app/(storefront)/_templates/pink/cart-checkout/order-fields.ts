import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

/**
 * Order-success fields — design.md → "Order success [extrapolated]". Group
 * `checkout.success`, kept on the `checkout` page key per the assignment.
 *
 * Data reality: `/api/stripe/session` returns only `customer_email`,
 * `amount_total`, `currency` and `payment_status` (no order number, shipping
 * address or delivery method — see `page-playbooks.md` → OrderSuccessPage).
 * The item list is reconstructed from the shopper's own cart state (captured
 * the instant the page mounts, before `clearCart()` runs) rather than from
 * the session, so "shipping address" and "delivery method" rows from the
 * design are replaced with what's actually available: order total, email,
 * and payment status, in the same ink-panel language as checkout.
 */
export const pinkOrderData: TemplateField[] = [
  {
    key: "pink.order.eyebrow",
    label: "Confirmation Eyebrow",
    description: "Small uppercase label above the thank-you heading.",
    type: "text",
    page: "checkout",
    group: "checkout.success",
    gridColumn: "col-span-1",
    defaultValue: "Order confirmed",
  },
  {
    key: "pink.order.heading",
    label: "Thank You Heading",
    description: "The first word of the thank-you heading, in ink.",
    type: "text",
    page: "checkout",
    group: "checkout.success",
    gridColumn: "col-span-1",
    defaultValue: "Thank",
  },
  {
    key: "pink.order.heading-accent",
    label: "Thank You Accent",
    description:
      "The rest of the thank-you heading, shown in the rose accent color.",
    type: "text",
    page: "checkout",
    group: "checkout.success",
    gridColumn: "col-span-1",
    defaultValue: "you.",
  },
  {
    key: "pink.order.body",
    label: "Confirmation Body",
    description: "One line under the heading.",
    type: "textarea",
    page: "checkout",
    group: "checkout.success",
    gridColumn: "col-span-full",
    defaultValue:
      "Your piece is already being wrapped by hand. We'll be in touch the moment it ships.",
  },
  {
    key: "pink.order.items-heading",
    label: "Items List Heading",
    description: "Heading over the ordered-items list on the left.",
    type: "text",
    page: "checkout",
    group: "checkout.success",
    gridColumn: "col-span-1",
    defaultValue: "What you ordered",
  },
  {
    key: "pink.order.summary-heading",
    label: "Order Summary Heading",
    description: "Heading at the top of the ink summary panel.",
    type: "text",
    page: "checkout",
    group: "checkout.success",
    gridColumn: "col-span-1",
    defaultValue: "Order summary",
  },
  {
    key: "pink.order.next-steps",
    label: "What Happens Next",
    description:
      "One step per line — shown as a small list in the summary panel.",
    type: "textarea",
    page: "checkout",
    group: "checkout.success",
    gridColumn: "col-span-full",
    defaultValue:
      "A confirmation email is on its way.\nWe'll email you again the moment your order ships.\nQuestions? Just reply to that email.",
  },
  {
    key: "pink.order.continue-cta",
    label: "Continue Shopping CTA",
    description: "Label on the primary button back to the shop.",
    type: "text",
    page: "checkout",
    group: "checkout.success",
    gridColumn: "col-span-1",
    defaultValue: "Continue shopping",
  },
  {
    key: "pink.order.loading-text",
    label: "Loading Text",
    description: "Message shown while the order is being confirmed.",
    type: "text",
    page: "checkout",
    group: "checkout.success",
    gridColumn: "col-span-1",
    defaultValue: "Confirming your order…",
  },
  {
    key: "pink.order.no-order-heading",
    label: "No Order Heading",
    description: "Heading shown when no order session is present in the URL.",
    type: "text",
    page: "checkout",
    group: "checkout.success",
    gridColumn: "col-span-1",
    defaultValue: "No order found",
  },
  {
    key: "pink.order.no-order-body",
    label: "No Order Body",
    description: "Body copy shown beneath the no-order heading.",
    type: "textarea",
    page: "checkout",
    group: "checkout.success",
    gridColumn: "col-span-full",
    defaultValue:
      "This page needs an order to show. If you just checked out, check your email for a receipt.",
  },
  {
    key: "pink.order.no-order-cta",
    label: "No Order CTA Label",
    description: "Button label on the no-order state.",
    type: "text",
    page: "checkout",
    group: "checkout.success",
    gridColumn: "col-span-1",
    defaultValue: "Back to shop",
  },
  {
    key: "pink.order.cta-eyebrow",
    label: "Closing CTA Eyebrow",
    description: "Small label above the closing CTA panel heading.",
    type: "text",
    page: "checkout",
    group: "checkout.success",
    gridColumn: "col-span-1",
    defaultValue: "While you're here",
  },
  {
    key: "pink.order.cta-heading",
    label: "Closing CTA Heading",
    description: "Heading in the closing CTA panel.",
    type: "text",
    page: "checkout",
    group: "checkout.success",
    gridColumn: "col-span-full",
    defaultValue: "There's always something new on the table.",
  },
  {
    key: "pink.order.cta-body",
    label: "Closing CTA Body",
    description: "One line under the closing CTA heading.",
    type: "textarea",
    page: "checkout",
    group: "checkout.success",
    gridColumn: "col-span-full",
    defaultValue: "New pieces post to the shop first. Make & takes run twice a month.",
  },
  {
    key: "pink.order.cta-button",
    label: "Closing CTA Primary Button",
    description: "Label on the primary button in the closing CTA panel.",
    type: "text",
    page: "checkout",
    group: "checkout.success",
    gridColumn: "col-span-1",
    defaultValue: "Keep browsing",
  },
  {
    key: "pink.order.cta-link",
    label: "Closing CTA Primary Link",
    description: "Where the closing CTA's primary button goes.",
    type: "url",
    page: "checkout",
    group: "checkout.success",
    gridColumn: "col-span-1",
    defaultValue: "/shop",
  },
  {
    key: "pink.order.cta-secondary-label",
    label: "Closing CTA Secondary Label",
    description: "Label on the secondary (ghost) button. Leave blank to hide it.",
    type: "text",
    page: "checkout",
    group: "checkout.success",
    gridColumn: "col-span-1",
    defaultValue: "See upcoming make & takes",
  },
  {
    key: "pink.order.cta-secondary-link",
    label: "Closing CTA Secondary Link",
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
    title: "Order Confirmation",
    description:
      "Thank-you heading, next steps, order summary labels, and the closing CTA panel on the order success page",
    icon: "✓",
    columns: 2,
  } satisfies TemplateFieldGroup,
];
