import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

// ─── Order success page field definitions ────────────────────────────────────

export const viiOrderData: TemplateField[] = [
  // ── Success state ──────────────────────────────────────────────────────────
  {
    key: "vii.order.overline",
    label: "Success Overline",
    description:
      "Small uppercase kicker shown above the thank-you heading in the navy confirmation section.",
    type: "text",
    page: "cart",
    group: "order.main",
    gridColumn: "col-span-1",
    defaultValue: "Order confirmed",
  },
  {
    key: "vii.order.thank-you-heading",
    label: "Thank You Heading",
    description:
      "The main serif display heading shown in the navy confirmation room. The accent word renders in copper-light italic.",
    type: "text",
    page: "cart",
    group: "order.main",
    gridColumn: "col-span-1",
    defaultValue: "Thank",
  },
  {
    key: "vii.order.thank-you-accent",
    label: "Thank You Accent Word",
    description:
      "The italic copper-light accent word that follows the heading (e.g. 'you'). Renders as italic serif in copper-light on the navy background.",
    type: "text",
    page: "cart",
    group: "order.main",
    gridColumn: "col-span-1",
    defaultValue: "you.",
  },
  {
    key: "vii.order.next-steps",
    label: "What Happens Next Body",
    description:
      "Short paragraph or list shown below the confirmation details — e.g. email confirmation, shipping notice, order tracking. Use line breaks to create separate items.",
    type: "textarea",
    page: "cart",
    group: "order.main",
    gridColumn: "col-span-full",
    defaultValue:
      "You'll receive an email confirmation shortly.\nWe'll notify you as soon as your order ships.\nTrack your order status via your confirmation email.",
  },
  {
    key: "vii.order.continue-cta",
    label: "Continue Shopping CTA Label",
    description:
      "Label for the primary CTA button that returns the customer to the shop.",
    type: "text",
    page: "cart",
    group: "order.main",
    gridColumn: "col-span-1",
    defaultValue: "Continue Shopping",
  },
  // ── Loading state ──────────────────────────────────────────────────────────
  {
    key: "vii.order.loading-text",
    label: "Loading Text",
    description:
      "Calm message shown while the order confirmation is being fetched from Stripe.",
    type: "text",
    page: "cart",
    group: "order.main",
    gridColumn: "col-span-1",
    defaultValue: "Confirming your order…",
  },
  // ── No-session / error state ───────────────────────────────────────────────
  {
    key: "vii.order.no-order-heading",
    label: "No Order Heading",
    description: "Heading shown when no order session is present in the URL.",
    type: "text",
    page: "cart",
    group: "order.main",
    gridColumn: "col-span-1",
    defaultValue: "No order found",
  },
  {
    key: "vii.order.no-order-body",
    label: "No Order Body",
    description:
      "Short explanatory copy shown beneath the no-order heading — e.g. directing the customer back to the shop.",
    type: "text",
    page: "cart",
    group: "order.main",
    gridColumn: "col-span-full",
    defaultValue:
      "It looks like this page was opened without an active order. Head back to the shop to explore our collection.",
  },
];

// ─── Field groups ─────────────────────────────────────────────────────────────

export const viiOrderFieldGroups: TemplateFieldGroup[] = [
  {
    id: "order.main",
    title: "Order Confirmation",
    description:
      "Thank-you heading, accent word, next-steps copy, CTA labels, and loading / no-order messaging.",
    icon: "✓",
    columns: 2,
  },
];
