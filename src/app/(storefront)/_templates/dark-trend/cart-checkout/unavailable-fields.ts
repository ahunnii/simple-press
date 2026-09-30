import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

/**
 * Checkout-unavailable fields. `checkout/page.tsx` renders
 * `<t.CheckoutUnavailable />` with NO props at all when the store hasn't
 * connected Stripe, so `DarkTrendCheckoutUnavailable` self-fetches the
 * business via the tRPC server caller to resolve owner copy when no
 * `customFields` prop is given — see `dark-trend-checkout-unavailable.tsx`.
 *
 * Defaults are the strings the inline block in `dark-trend-checkout-page.tsx`
 * hardcoded before these fields existed, so live stores see no change.
 */
export const darkTrendCheckoutUnavailableData: TemplateField[] = [
  {
    key: "dark-trend.checkout.unavailable-heading",
    label: "Heading",
    description:
      "Heading shown on the checkout page when the store hasn't set up online payments yet.",
    type: "text",
    page: "checkout",
    group: "checkout.unavailable",
    gridColumn: "col-span-1",
    defaultValue: "Checkout Unavailable",
    placeholder: "e.g. Checkout is closed",
  },
  {
    key: "dark-trend.checkout.unavailable-body",
    label: "Message",
    description: "Message shown below the heading. Leave blank to hide it.",
    type: "textarea",
    page: "checkout",
    group: "checkout.unavailable",
    gridColumn: "col-span-full",
    defaultValue:
      "This store hasn't set up payment processing yet. Please contact the store owner.",
    placeholder: "One or two sentences telling shoppers what to do instead.",
  },
  {
    key: "dark-trend.checkout.unavailable-cta",
    label: "Button text",
    description:
      "Label on the button back to the shop. Leave blank to hide the button.",
    type: "text",
    page: "checkout",
    group: "checkout.unavailable",
    gridColumn: "col-span-1",
    defaultValue: "Back to shop",
    placeholder: "e.g. Keep browsing",
  },
];

export const darkTrendCheckoutUnavailableFieldGroups: TemplateFieldGroup[] = [
  {
    id: "checkout.unavailable",
    title: "Checkout unavailable",
    description:
      "Shown on the checkout page when online payments aren't set up yet.",
    icon: "⏸️",
    columns: 2,
  } satisfies TemplateFieldGroup,
];
