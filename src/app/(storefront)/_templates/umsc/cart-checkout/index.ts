import type { TemplateSection } from "~/lib/template-sections";

/**
 * Curated section rail entries for the umsc cart/checkout domain — pink's
 * `cart-checkout/index.ts` and olive's equivalent are the reference for this
 * shape. `cart` and `checkout` are absent from `PAGE_PREVIEW_PATHS` (the
 * `/editor` live preview iframe's cart is always empty — see
 * `cart-fields.ts`'s file doc comment), so none of these appear there; they
 * are still registered so the platform-admin advanced editor can list and
 * toggle them. Field data/groups are not re-exported here — the template
 * root `index.ts` imports them directly from `cart-fields.ts`,
 * `checkout-fields.ts`, `unavailable-fields.ts` and `order-fields.ts`.
 */
export const umscCartCheckoutSections: TemplateSection[] = [
  {
    id: "cart.main",
    page: "cart",
    title: "Cart page",
    description: "Heading, empty-state messaging, doors, and button labels.",
    groupIds: ["cart.main"],
    order: 0,
    hideable: false,
  },
  {
    id: "checkout.main",
    page: "checkout",
    title: "Checkout",
    description:
      "Headings, button labels, and the empty-bag messaging on the checkout form.",
    groupIds: ["checkout.main"],
    order: 0,
    hideable: false,
  },
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
  {
    id: "checkout.success",
    page: "checkout",
    title: "Order confirmation",
    description:
      "Thank-you heading, next-steps copy, and loading / no-order messaging.",
    groupIds: ["checkout.success"],
    order: 2,
    hideable: false,
  },
];
