import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

/**
 * Checkout-unavailable fields for the Default template. `checkout/page.tsx`
 * renders `<t.CheckoutUnavailable />` with NO props at all when the store
 * hasn't connected Stripe, so `DefaultCheckoutUnavailable` self-fetches the
 * business via the tRPC server caller to resolve owner copy when no
 * `customFields` prop is given — see `default-checkout-unavailable.tsx`.
 *
 * `DefaultCheckoutUnavailable` is also the fallback for every template
 * without its own (builders, coop, relocation, wealth, …), always reading
 * these `default.*` keys, so the heading/body defaults are the exact copy
 * that was hardcoded before. The screen had no button, so the button text
 * defaults to blank (hidden).
 */
export const defaultCheckoutUnavailableData: TemplateField[] = [
  {
    key: "default.checkout.unavailable-heading",
    label: "Heading",
    description:
      "Heading shown on the checkout page when the store hasn't set up online payments yet.",
    type: "text",
    page: "checkout",
    group: "checkout.unavailable",
    gridColumn: "col-span-1",
    defaultValue: "Checkout Unavailable",
    placeholder: "Checkout Unavailable",
  },
  {
    key: "default.checkout.unavailable-body",
    label: "Body text",
    description: "Message shown below the heading. Leave blank to hide it.",
    type: "textarea",
    page: "checkout",
    group: "checkout.unavailable",
    gridColumn: "col-span-full",
    defaultValue:
      "This store hasn't set up payment processing yet. Please contact the store owner.",
    placeholder: "e.g. Online checkout is coming soon. Call us to order.",
  },
  {
    key: "default.checkout.unavailable-button-text",
    label: "Button text",
    description:
      "Label on a button below the message, e.g. back to your shop. Leave blank to hide the button.",
    type: "text",
    page: "checkout",
    group: "checkout.unavailable",
    gridColumn: "col-span-1",
    defaultValue: "",
    placeholder: "e.g. Back to shop",
  },
  {
    key: "default.checkout.unavailable-button-link",
    label: "Button link",
    description: "Where the button goes. Only used when button text is set.",
    type: "url",
    page: "checkout",
    group: "checkout.unavailable",
    gridColumn: "col-span-1",
    defaultValue: "/shop",
    placeholder: "/shop",
  },
];

export const defaultCheckoutUnavailableFieldGroups: TemplateFieldGroup[] = [
  {
    id: "checkout.unavailable",
    title: "Checkout unavailable",
    description:
      "Shown on the checkout page when online payments aren't set up yet.",
    icon: "⏸️",
    columns: 2,
  } satisfies TemplateFieldGroup,
];
