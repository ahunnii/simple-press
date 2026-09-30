import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";
import { resolveTemplateFields } from "~/lib/resolve-template-fields";

/**
 * Checkout-unavailable fields. `checkout/page.tsx` renders
 * `<t.CheckoutUnavailable />` with NO props when the store hasn't connected
 * online payments, so `DreamCheckoutUnavailable` self-fetches the business
 * to resolve the owner's copy — see `dream-checkout-unavailable.tsx`.
 *
 * Dream is a service template, so the way forward from here is an estimate
 * request (`/contact`, the Estimate Quote page), not back to a shop.
 *
 * The orchestrator spreads `dreamCheckoutUnavailableData` /
 * `dreamCheckoutUnavailableFieldGroups` into the root `index.ts` and
 * `dreamCheckoutUnavailableSections` into `sections.ts`; the component reads
 * through the local `resolveDreamCheckoutUnavailableFields` so it never has
 * to import the template root.
 */
export const dreamCheckoutUnavailableData: TemplateField[] = [
  {
    key: "dream.checkout.unavailable-heading",
    label: "Heading",
    description:
      "Heading shown on the checkout page when online payments aren't set up yet.",
    type: "text",
    page: "checkout",
    group: "checkout.unavailable",
    gridColumn: "col-span-full",
    defaultValue: "Checkout unavailable",
    placeholder: "A few words",
  },
  {
    key: "dream.checkout.unavailable-body",
    label: "Message",
    description: "Short message below the heading. Leave blank to hide.",
    type: "textarea",
    page: "checkout",
    group: "checkout.unavailable",
    gridColumn: "col-span-full",
    defaultValue:
      "Online checkout isn't set up yet. Request an estimate and we'll take it from there.",
    placeholder: "One or two short sentences",
  },
  {
    key: "dream.checkout.unavailable-cta",
    label: "Button text",
    description:
      "Label on the button to your estimate request page. Leave blank to hide the button.",
    type: "text",
    page: "checkout",
    group: "checkout.unavailable",
    gridColumn: "col-span-full",
    defaultValue: "Request an estimate",
    placeholder: "A short action",
  },
];

export const dreamCheckoutUnavailableFieldGroups: TemplateFieldGroup[] = [
  {
    id: "checkout.unavailable",
    title: "Checkout unavailable",
    description:
      "Shown on the checkout page when online payments aren't set up yet.",
    icon: "⏸️",
    columns: 1,
  },
];

export const dreamCheckoutUnavailableSections: TemplateSection[] = [
  {
    id: "checkout.unavailable",
    page: "checkout",
    title: "Checkout unavailable",
    description:
      "Shown on the checkout page when online payments aren't set up yet.",
    groupIds: ["checkout.unavailable"],
    order: 1,
    hideable: false,
  },
];

const _fieldMap = new Map(
  dreamCheckoutUnavailableData.map((field) => [field.key, field]),
);

export function resolveDreamCheckoutUnavailableFields(
  customFields: unknown,
  keys: string[],
): Record<string, string> {
  return resolveTemplateFields(customFields, keys, _fieldMap);
}
