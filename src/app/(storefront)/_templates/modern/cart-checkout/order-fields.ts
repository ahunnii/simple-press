import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

/**
 * Order-confirmation fields. The confirmation itself is the shared
 * `DefaultOrderConfirmation`; modern only adds an optional owner note
 * beneath it — see `modern-order-success-page.tsx`.
 */
export const modernOrderData: TemplateField[] = [
  {
    key: "modern.checkout.success-note",
    label: "Note after purchase",
    description:
      "Optional message below the order details on the order confirmation page, such as when orders ship. Leave blank to hide.",
    type: "textarea",
    page: "checkout",
    group: "checkout.success",
    gridColumn: "col-span-full",
    defaultValue: "",
    placeholder: "e.g. Orders usually ship within 2 business days.",
  },
];

export const modernOrderFieldGroups: TemplateFieldGroup[] = [
  {
    id: "checkout.success",
    title: "Order confirmation",
    description: "Page shoppers see right after paying.",
    icon: "✅",
    columns: 1,
  } satisfies TemplateFieldGroup,
];
