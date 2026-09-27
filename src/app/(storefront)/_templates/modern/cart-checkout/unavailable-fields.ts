import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

/**
 * Checkout-unavailable fields. `checkout/page.tsx` renders
 * `<t.CheckoutUnavailable />` with NO props at all when the store hasn't
 * connected Stripe, so `ModernCheckoutUnavailable` self-fetches the business
 * via the tRPC server caller to resolve owner copy when no `customFields`
 * prop is given — see `modern-checkout-unavailable.tsx`.
 */
export const modernCheckoutUnavailableData: TemplateField[] = [
  {
    key: "modern.checkout.unavailable-heading",
    label: "Heading",
    description:
      "Heading shown on the checkout page when the store hasn't set up online payments yet.",
    type: "text",
    page: "checkout",
    group: "checkout.unavailable",
    gridColumn: "col-span-1",
    defaultValue: "Checkout isn't available yet",
    placeholder: "A short heading",
  },
  {
    key: "modern.checkout.unavailable-body",
    label: "Body text",
    description: "Message shown below the heading. Leave blank to hide.",
    type: "textarea",
    page: "checkout",
    group: "checkout.unavailable",
    gridColumn: "col-span-full",
    defaultValue:
      "This store isn't taking online payments yet. Please check back soon or get in touch.",
    placeholder: "One or two sentences",
  },
  {
    key: "modern.checkout.unavailable-cta",
    label: "Button text",
    description:
      "Label on the button below the message. Leave blank to hide the button.",
    type: "text",
    page: "checkout",
    group: "checkout.unavailable",
    gridColumn: "col-span-1",
    defaultValue: "Continue browsing",
    placeholder: "Continue browsing",
  },
  {
    key: "modern.checkout.unavailable-cta-link",
    label: "Button link",
    description: "Where the button goes, such as /shop or /contact.",
    type: "url",
    page: "checkout",
    group: "checkout.unavailable",
    gridColumn: "col-span-1",
    defaultValue: "/shop",
    placeholder: "/shop",
  },
];

export const modernCheckoutUnavailableFieldGroups: TemplateFieldGroup[] = [
  {
    id: "checkout.unavailable",
    title: "Checkout unavailable",
    description:
      "Shown on the checkout page when online payments aren't set up yet.",
    icon: "⏸️",
    columns: 2,
  } satisfies TemplateFieldGroup,
];
