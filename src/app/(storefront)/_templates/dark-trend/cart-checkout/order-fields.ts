import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

/**
 * Order confirmation + checkout form copy (page "checkout"). Kept free of
 * runtime imports from `~/lib/template-fields` — that module imports the
 * template root, which imports this file — so the list field's rows are
 * parsed by the separate leaf module `./text-list.ts` instead (see
 * `field-conventions.md` → "List defaults", and sledge's
 * `cart-checkout/cart-fields.ts` for the precedent).
 */

export const DARK_TREND_CONFIRMATION_STEPS_KEY =
  "dark-trend.checkout.confirmation-next-steps";

/**
 * Built-in rows shown until the owner saves their own (`defaultsWhenEmpty`).
 * These are also the field's `defaultRows` below — the editor shows them as
 * real, editable rows and copies them into the saved value on first edit.
 */
export const DARK_TREND_CONFIRMATION_STEPS_DEFAULT_ROWS = [
  { text: "You'll receive an email confirmation shortly" },
  { text: "We'll notify you when your order ships" },
  { text: "Track your order status via email" },
] satisfies Record<string, string>[];

export const DARK_TREND_CONFIRMATION_STEPS_DEFAULTS =
  DARK_TREND_CONFIRMATION_STEPS_DEFAULT_ROWS.map((row) => row.text);

const confirmationData: TemplateField[] = [
  {
    key: "dark-trend.checkout.confirmation-heading",
    label: "Heading",
    description: "Heading at the top of the order confirmation page.",
    type: "text",
    page: "checkout",
    group: "checkout.confirmation",
    gridColumn: "col-span-1",
    defaultValue: "Order Confirmed!",
    placeholder: "e.g. Thank you for your order",
  },
  {
    key: "dark-trend.checkout.confirmation-next-heading",
    label: "Next-steps heading",
    description: "Heading above the list of next steps.",
    type: "text",
    page: "checkout",
    group: "checkout.confirmation",
    gridColumn: "col-span-1",
    defaultValue: "What happens next?",
    placeholder: "e.g. Here's what to expect",
  },
  {
    key: DARK_TREND_CONFIRMATION_STEPS_KEY,
    label: "Next steps",
    description:
      "Short lines listed under the next-steps heading. Leave empty to show the built-in steps.",
    type: "list",
    page: "checkout",
    group: "checkout.confirmation",
    gridColumn: "col-span-full",
    itemLabel: "step",
    summaryKey: "text",
    maxItems: 6,
    defaultsWhenEmpty: true,
    defaultRows: DARK_TREND_CONFIRMATION_STEPS_DEFAULT_ROWS,
    itemSchema: [
      {
        key: "text",
        label: "Text",
        type: "text",
        description: "One short sentence.",
        placeholder: "e.g. Orders ship within 3 business days.",
      },
    ],
  },
  {
    key: "dark-trend.checkout.confirmation-continue-button",
    label: "Button text",
    description:
      "Label on the button back to the shop. Leave blank to hide the button.",
    type: "text",
    page: "checkout",
    group: "checkout.confirmation",
    gridColumn: "col-span-1",
    defaultValue: "Continue Shopping",
    placeholder: "e.g. Keep browsing",
  },
];

const checkoutFormData: TemplateField[] = [
  {
    key: "dark-trend.checkout.secure-payment-note",
    label: "Secure payment note",
    description:
      "Text under the payment button on the checkout page. Leave blank to hide.",
    type: "textarea",
    page: "checkout",
    group: "checkout.form",
    gridColumn: "col-span-full",
    defaultValue:
      "All transactions are secure and encrypted via Stripe. 100% Secure and Encrypted Payments.",
    placeholder: "One or two short sentences about payment security.",
  },
];

export const darkTrendOrderData: TemplateField[] = [
  ...confirmationData,
  ...checkoutFormData,
];

export const darkTrendOrderFieldGroups: TemplateFieldGroup[] = [
  {
    id: "checkout.confirmation",
    title: "Order confirmation",
    description:
      "Heading, next-steps list, and button on the order confirmation page.",
    icon: "✅",
    columns: 2,
  } satisfies TemplateFieldGroup,
  {
    id: "checkout.form",
    title: "Checkout form",
    description:
      "Secure-payment note under the payment button on the checkout page.",
    icon: "🔒",
    columns: 1,
  } satisfies TemplateFieldGroup,
];
