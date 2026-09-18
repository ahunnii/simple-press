import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

// ─── Order success page field definitions ────────────────────────────────────
//
// `page` is "checkout" per the assignment (there is no "order" entry in the
// page-key enum — checkout is where an order confirmation belongs).

export const umscOrderData: TemplateField[] = [
  {
    key: "umsc.order.thank-you-heading",
    label: "Thank You Heading",
    description: "The heading shown on the order-confirmation band.",
    type: "text",
    page: "checkout",
    group: "order.main",
    gridColumn: "col-span-1",
    defaultValue: "Thank you.",
  },
  {
    key: "umsc.order.next-steps",
    label: "What Happens Next",
    description:
      "Short lines shown under the confirmation details — one per line — e.g. email confirmation, shipping notice, contact info.",
    type: "textarea",
    page: "checkout",
    group: "order.main",
    gridColumn: "col-span-full",
    defaultValue:
      "You'll receive an email confirmation shortly.\nWe'll let you know as soon as your order ships.\nQuestions? Call or text 313-826-9688.",
  },
  {
    key: "umsc.order.continue-cta",
    label: "Continue Shopping CTA Label",
    description: "Label on the button that returns the shopper to the shop.",
    type: "text",
    page: "checkout",
    group: "order.main",
    gridColumn: "col-span-1",
    defaultValue: "Continue shopping",
  },
  {
    key: "umsc.order.loading-text",
    label: "Loading Text",
    description:
      "Message shown while the order confirmation loads from Stripe.",
    type: "text",
    page: "checkout",
    group: "order.main",
    gridColumn: "col-span-1",
    defaultValue: "Confirming your order…",
  },
  {
    key: "umsc.order.no-order-heading",
    label: "No Order Heading",
    description: "Heading shown when no order session is present in the URL.",
    type: "text",
    page: "checkout",
    group: "order.main",
    gridColumn: "col-span-1",
    defaultValue: "No order found",
  },
  {
    key: "umsc.order.no-order-body",
    label: "No Order Body",
    description: "Short explanation shown beneath the no-order heading.",
    type: "textarea",
    page: "checkout",
    group: "order.main",
    gridColumn: "col-span-full",
    defaultValue:
      "This page needs an order session to show your confirmation. Head back to the shop to keep browsing.",
  },
];

// ─── Field groups ─────────────────────────────────────────────────────────────

export const umscOrderFieldGroups: TemplateFieldGroup[] = [
  {
    id: "order.main",
    title: "Order Confirmation",
    description:
      "Thank-you heading, next-steps copy, and loading / no-order messaging.",
    icon: "✓",
    columns: 2,
  },
];
