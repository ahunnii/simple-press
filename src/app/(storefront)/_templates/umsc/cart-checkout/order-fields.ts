import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

// ─── Order success page field definitions ────────────────────────────────────
//
// `page` is "checkout" per the assignment (there is no "order" entry in the
// page-key enum — checkout is where an order confirmation belongs). Group
// is `checkout.success` (moved from `order.main`, same keys) so the hotspot
// in `umsc-order-confirmation.tsx` reads `sectionGroupAttr("checkout",
// "success")` — see pink's `cart-checkout/order-fields.ts` for the same
// group placement.

export const umscOrderData: TemplateField[] = [
  {
    key: "umsc.order.thank-you-heading",
    label: "Thank-you heading",
    description: "The heading shown on the order-confirmation page.",
    type: "text",
    page: "checkout",
    group: "checkout.success",
    gridColumn: "col-span-1",
    defaultValue: "Thank you.",
  },
  {
    key: "umsc.order.next-steps-heading",
    label: "Next steps heading",
    description:
      "Small label shown above the next-steps list. Leave blank to hide it.",
    type: "text",
    page: "checkout",
    group: "checkout.success",
    gridColumn: "col-span-1",
    defaultValue: "What happens next",
  },
  {
    key: "umsc.order.next-steps",
    label: "Next steps",
    description:
      "Short lines shown under the next-steps heading — one per line — e.g. email confirmation, shipping notice, contact info. Leave blank to hide the list.",
    type: "textarea",
    page: "checkout",
    group: "checkout.success",
    gridColumn: "col-span-full",
    defaultValue:
      "You'll receive an email confirmation shortly.\nWe'll let you know as soon as your order ships.\nQuestions? Call or text 313-826-9688.",
  },
  {
    key: "umsc.order.continue-cta",
    label: "Continue shopping button text",
    description: "Label on the button that returns the shopper to the shop.",
    type: "text",
    page: "checkout",
    group: "checkout.success",
    gridColumn: "col-span-1",
    defaultValue: "Continue shopping",
  },
  {
    key: "umsc.order.home-link-label",
    label: "Back to home link text",
    description:
      "Text on the link back to the homepage, shown under the continue-shopping button. Leave blank to hide the link.",
    type: "text",
    page: "checkout",
    group: "checkout.success",
    gridColumn: "col-span-1",
    defaultValue: "Back to home",
  },
  {
    key: "umsc.order.loading-text",
    label: "Loading text",
    description:
      "Message shown while the order confirmation loads from Stripe.",
    type: "text",
    page: "checkout",
    group: "checkout.success",
    gridColumn: "col-span-1",
    defaultValue: "Confirming your order…",
  },
  {
    key: "umsc.order.no-order-heading",
    label: "No order heading",
    description: "Heading shown when no order session is present in the URL.",
    type: "text",
    page: "checkout",
    group: "checkout.success",
    gridColumn: "col-span-1",
    defaultValue: "No order found",
  },
  {
    key: "umsc.order.no-order-body",
    label: "No order message",
    description: "Short explanation shown beneath the no-order heading.",
    type: "textarea",
    page: "checkout",
    group: "checkout.success",
    gridColumn: "col-span-full",
    defaultValue:
      "This page needs an order session to show your confirmation. Head back to the shop to keep browsing.",
  },
];

// ─── Field groups ─────────────────────────────────────────────────────────────

export const umscOrderFieldGroups: TemplateFieldGroup[] = [
  {
    id: "checkout.success",
    title: "Order confirmation",
    description:
      "Thank-you heading, next-steps copy, and loading / no-order messaging.",
    icon: "✓",
    columns: 2,
  },
];
