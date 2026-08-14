import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";

import { pinkCartData, pinkCartFieldGroups } from "./cart-fields";
import { pinkCheckoutData, pinkCheckoutFieldGroups } from "./checkout-fields";
import { pinkOrderData, pinkOrderFieldGroups } from "./order-fields";
import {
  pinkUnavailableData,
  pinkUnavailableFieldGroups,
} from "./unavailable-fields";

/**
 * Aggregated field registry for the `pink` cart/checkout domain — consumed
 * by the template root `_templates/pink/index.ts` (owned by another agent;
 * do not import there yourself, just export this shape).
 */
export const pinkCartCheckoutData: TemplateField[] = [
  ...pinkCartData,
  ...pinkCheckoutData,
  ...pinkUnavailableData,
  ...pinkOrderData,
];

export const pinkCartCheckoutFieldGroups: TemplateFieldGroup[] = [
  ...pinkCartFieldGroups,
  ...pinkCheckoutFieldGroups,
  ...pinkUnavailableFieldGroups,
  ...pinkOrderFieldGroups,
];

/**
 * Curated section rail entries for the cart/checkout domain — design.md →
 * "Per-page section concepts → Cart / Checkout / Checkout unavailable /
 * Order success". `cart` and `checkout` are intentionally absent from
 * `PAGE_PREVIEW_PATHS`, so none of these appear in `/editor`'s live preview;
 * they're still registered so the platform-admin advanced editor can list
 * and toggle them.
 */
export const pinkCartCheckoutSections: TemplateSection[] = [
  {
    id: "cart.main",
    page: "cart",
    title: "Cart Page",
    description:
      "Heading, intro, basket summary panel, line items and empty state",
    groupIds: ["cart.main"],
    order: 0,
    hideable: false,
  },
  {
    id: "checkout.main",
    page: "checkout",
    title: "Checkout Form",
    description: "Contact and shipping fieldsets, submit button, messaging",
    groupIds: ["checkout.main"],
    order: 0,
    hideable: false,
  },
  {
    id: "checkout.summary",
    page: "checkout",
    title: "Checkout Basket Panel",
    description: "The sticky ink basket summary beside the checkout form",
    groupIds: ["checkout.summary"],
    order: 1,
    hideable: true,
  },
  {
    id: "checkout.unavailable",
    page: "checkout",
    title: "Checkout Unavailable",
    description:
      "Shown instead of the checkout form when the store hasn't connected payments yet",
    groupIds: ["checkout.unavailable"],
    order: 2,
    hideable: true,
  },
  {
    id: "checkout.success",
    page: "checkout",
    title: "Order Confirmation",
    description: "The thank-you page shown after a successful Stripe checkout",
    groupIds: ["checkout.success"],
    order: 3,
    hideable: false,
  },
];
