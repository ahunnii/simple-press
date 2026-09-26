import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

// ─── Order success page field definitions ────────────────────────────────────

export const viiOrderData: TemplateField[] = [
  // ── Success state ──────────────────────────────────────────────────────────
  {
    key: "vii.order.overline",
    label: "Small label",
    description:
      "Small label shown above the thank-you heading in the order confirmation section.",
    type: "text",
    page: "cart",
    group: "order.main",
    gridColumn: "col-span-1",
    defaultValue: "Order confirmed",
  },
  {
    key: "vii.order.thank-you-heading",
    label: "Heading",
    description: "The main heading shown in the order confirmation section.",
    type: "text",
    page: "cart",
    group: "order.main",
    gridColumn: "col-span-1",
    defaultValue: "Thank",
  },
  {
    key: "vii.order.thank-you-accent",
    label: "Heading, highlighted words",
    description: "Shown in italics after the heading (e.g. 'you').",
    type: "text",
    page: "cart",
    group: "order.main",
    gridColumn: "col-span-1",
    defaultValue: "you.",
  },
  {
    key: "vii.order.next-steps",
    label: "What happens next",
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
    label: "Continue shopping button text",
    description:
      "Text for the primary button that returns the customer to the shop.",
    type: "text",
    page: "cart",
    group: "order.main",
    gridColumn: "col-span-1",
    defaultValue: "Continue Shopping",
  },
  // ── Loading state ──────────────────────────────────────────────────────────
  {
    key: "vii.order.loading-text",
    label: "Loading text",
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
    label: "No order heading",
    description: "Heading shown when no order session is present in the URL.",
    type: "text",
    page: "cart",
    group: "order.main",
    gridColumn: "col-span-1",
    defaultValue: "No order found",
  },
  {
    key: "vii.order.no-order-body",
    label: "No order message",
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
    title: "Order confirmation",
    description:
      "Thank-you heading, highlighted words, next-steps copy, button text, and loading / no-order messaging.",
    icon: "✓",
    columns: 2,
  },
];
