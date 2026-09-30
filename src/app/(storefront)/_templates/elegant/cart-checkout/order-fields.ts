import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

/**
 * Order-confirmation fields. Defaults are the exact copy that used to be
 * hardcoded across `elegant-order-success-page.tsx` and the wrapped
 * `DefaultOrderConfirmation` — see `elegant-order-confirmation.tsx`, which
 * now owns the whole page (built like bamboo's own
 * `bamboo-order-confirmation.tsx` rather than wrapping the default one, so
 * it can stay pickup-aware and avoid rendering the confirmation twice).
 */
export const elegantOrderData: TemplateField[] = [
  {
    key: "elegant.checkout.success-eyebrow",
    label: "Small label",
    description: "Small label above the confirmation heading.",
    type: "text",
    page: "checkout",
    group: "checkout.success",
    gridColumn: "col-span-1",
    defaultValue: "Order confirmed",
    placeholder: "Order confirmed",
  },
  {
    key: "elegant.checkout.success-heading",
    label: "Heading",
    description: "Large heading on the order confirmation page.",
    type: "text",
    page: "checkout",
    group: "checkout.success",
    gridColumn: "col-span-1",
    defaultValue: "Thank you.",
    placeholder: "Thank you.",
  },
  {
    key: "elegant.checkout.success-body",
    label: "Message",
    description: "Line below the heading on the order confirmation page.",
    type: "textarea",
    page: "checkout",
    group: "checkout.success",
    gridColumn: "col-span-full",
    defaultValue:
      "Your order has been received. A confirmation email is on its way to you now.",
  },
  {
    key: "elegant.checkout.success-button",
    label: "Button text",
    description: "Label on the button back to the shop.",
    type: "text",
    page: "checkout",
    group: "checkout.success",
    gridColumn: "col-span-1",
    defaultValue: "Continue shopping",
    placeholder: "Continue shopping",
  },
  {
    key: "elegant.checkout.success-note",
    label: "Extra note",
    description:
      "Optional note shown with the order details, below the shipping/pickup information. Leave blank to hide.",
    type: "textarea",
    page: "checkout",
    group: "checkout.success",
    gridColumn: "col-span-full",
    defaultValue: "",
    placeholder: "e.g. Questions about your order? Contact us any time.",
  },
];

export const elegantOrderFieldGroups: TemplateFieldGroup[] = [
  {
    id: "checkout.success",
    title: "Order confirmation",
    description: "Text shown on the order confirmation page after checkout.",
    icon: "🎉",
    columns: 2,
  } satisfies TemplateFieldGroup,
];
