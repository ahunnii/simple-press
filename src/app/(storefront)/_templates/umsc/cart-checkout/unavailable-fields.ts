import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

// ─── Checkout-unavailable field definitions ──────────────────────────────────
//
// Split out of `checkout-fields.ts` into its own group/section
// (`checkout.unavailable`) so the hotspot in `umsc-checkout-unavailable.tsx`
// no longer shares `checkout.main` with the live checkout form — see
// bamboo's `cart-checkout/unavailable-fields.tsx` for the same split.

export const umscCheckoutUnavailableData: TemplateField[] = [
  {
    key: "umsc.checkout.unavailable-heading",
    label: "Heading",
    description:
      "Heading shown when the store hasn't connected online payment yet.",
    type: "text",
    page: "checkout",
    group: "checkout.unavailable",
    gridColumn: "col-span-1",
    defaultValue: "Checkout unavailable",
  },
  {
    key: "umsc.checkout.unavailable-body",
    label: "Body text",
    description:
      "Body copy shown when checkout is unavailable. The phone number from your business settings is shown separately, under this message. Leave blank to hide.",
    type: "textarea",
    page: "checkout",
    group: "checkout.unavailable",
    gridColumn: "col-span-full",
    defaultValue:
      "This shop hasn't connected online payment yet. Call or message and Monique will take your order directly.",
  },
  {
    key: "umsc.checkout.unavailable-cta",
    label: "Button text",
    description:
      "Label on the button that returns the shopper to the shop. Leave blank to hide the button.",
    type: "text",
    page: "checkout",
    group: "checkout.unavailable",
    gridColumn: "col-span-1",
    defaultValue: "Back to shop",
  },
  {
    key: "umsc.checkout.unavailable-contact-label",
    label: "Contact link text",
    description:
      "Label on the link to the contact page, shown next to the back-to-shop button. Leave blank to hide the link.",
    type: "text",
    page: "checkout",
    group: "checkout.unavailable",
    gridColumn: "col-span-1",
    defaultValue: "Contact us",
  },
];

// ─── Field group ──────────────────────────────────────────────────────────────

export const umscCheckoutUnavailableFieldGroups: TemplateFieldGroup[] = [
  {
    id: "checkout.unavailable",
    title: "Checkout unavailable",
    description:
      "Shown on the checkout page when online payments aren't set up yet.",
    icon: "⏸️",
    columns: 2,
  },
];
