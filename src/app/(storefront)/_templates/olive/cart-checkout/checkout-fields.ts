import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";

/**
 * Checkout fields — design.md → "Per-page section concepts → CheckoutPage /
 * CheckoutUnavailable / OrderSuccessPage". Four groups, all `page: "checkout"`
 * (the decisions log, 2026-09-12: order-success and unavailable copy lives
 * under `checkout.*` following pink, not vii's `order.main`-under-`cart`):
 *
 *  - `checkout.main`        — the form column: title, the four semantic
 *                             section headings, submit, empty-bag copy.
 *  - `checkout.summary`     — the sticky slate-tint bag card beside it.
 *  - `checkout.unavailable` — the ghost card shown when the store has not
 *                             connected payments.
 *  - `checkout.success`     — the order confirmation page.
 *
 * The section headings are semantic on purpose, never numbered: the delivery
 * block only exists when the store offers pickup and the address block
 * disappears on pickup, so "Step 2" would be a lie half the time.
 *
 * `checkout` is deliberately absent from `PAGE_PREVIEW_PATHS`, so these are
 * edited in the platform-admin advanced editor rather than in `/editor`.
 */
export const oliveCheckoutData: TemplateField[] = [
  // ── checkout.main ─────────────────────────────────────────────────────────
  {
    key: "olive.checkout.heading",
    label: "Checkout Heading",
    description: "The page title above the checkout form.",
    type: "text",
    page: "checkout",
    group: "checkout.main",
    gridColumn: "col-span-1",
    defaultValue: "Checkout",
  },
  {
    key: "olive.checkout.intro",
    label: "Checkout Intro Line",
    description:
      "One line under the checkout heading. Leave blank to show the heading on its own.",
    type: "textarea",
    page: "checkout",
    group: "checkout.main",
    gridColumn: "col-span-full",
    defaultValue:
      "A few details and we will hand you to our payment page. Nothing is charged until you confirm there.",
  },
  {
    key: "olive.checkout.details-heading",
    label: "Contact Section Heading",
    description: "Heading over the email, name and phone fields.",
    type: "text",
    page: "checkout",
    group: "checkout.main",
    gridColumn: "col-span-1",
    defaultValue: "Your details",
  },
  {
    key: "olive.checkout.delivery-heading",
    label: "Delivery Section Heading",
    description:
      "Heading over the ship-or-pick-up choice. Only shown when the store offers in-store pickup.",
    type: "text",
    page: "checkout",
    group: "checkout.main",
    gridColumn: "col-span-1",
    defaultValue: "Delivery",
  },
  {
    key: "olive.checkout.shipping-heading",
    label: "Address Section Heading",
    description:
      "Heading over the shipping address fields. Hidden when the shopper chooses in-store pickup.",
    type: "text",
    page: "checkout",
    group: "checkout.main",
    gridColumn: "col-span-1",
    defaultValue: "Where it ships",
  },
  {
    key: "olive.checkout.payment-heading",
    label: "Payment Section Heading",
    description: "Heading over the submit button and the payment note.",
    type: "text",
    page: "checkout",
    group: "checkout.main",
    gridColumn: "col-span-1",
    defaultValue: "Payment",
  },
  {
    key: "olive.checkout.payment-note",
    label: "Payment Note",
    description:
      "One line above the submit button explaining what happens on the next screen. Leave blank to hide.",
    type: "textarea",
    page: "checkout",
    group: "checkout.main",
    gridColumn: "col-span-full",
    defaultValue:
      "Card details are entered on our secure payment page, never here.",
  },
  {
    key: "olive.checkout.submit-label",
    label: "Submit Button Label",
    description: "Label on the primary button that opens the payment page.",
    type: "text",
    page: "checkout",
    group: "checkout.main",
    gridColumn: "col-span-1",
    defaultValue: "Continue to payment",
  },
  {
    key: "olive.checkout.back-label",
    label: "Back Link Label",
    description: "The quiet text link back to the bag.",
    type: "text",
    page: "checkout",
    group: "checkout.main",
    gridColumn: "col-span-1",
    defaultValue: "Back to bag",
  },
  {
    key: "olive.checkout.empty-heading",
    label: "Empty Bag Heading",
    description: "Heading shown if checkout is opened with an empty bag.",
    type: "text",
    page: "checkout",
    group: "checkout.main",
    gridColumn: "col-span-1",
    defaultValue: "Your bag is empty",
  },
  {
    key: "olive.checkout.empty-body",
    label: "Empty Bag Body",
    description: "One line under the empty-bag heading on checkout.",
    type: "textarea",
    page: "checkout",
    group: "checkout.main",
    gridColumn: "col-span-full",
    defaultValue: "Add something you love and we will take it from there.",
  },
  {
    key: "olive.checkout.empty-cta",
    label: "Empty Bag Button Label",
    description: "Label on the button back to the shop from an empty checkout.",
    type: "text",
    page: "checkout",
    group: "checkout.main",
    gridColumn: "col-span-1",
    defaultValue: "Shop new",
  },

  // ── checkout.summary ──────────────────────────────────────────────────────
  {
    key: "olive.checkout.summary-heading",
    label: "Bag Card Heading",
    description: "Heading at the top of the sticky bag card beside the form.",
    type: "text",
    page: "checkout",
    group: "checkout.summary",
    gridColumn: "col-span-1",
    defaultValue: "Your bag",
  },
  {
    key: "olive.checkout.summary-discount-label",
    label: "Discount Field Label",
    description:
      "Label above the discount-code box in the bag card. Only shown when discount codes are turned on.",
    type: "text",
    page: "checkout",
    group: "checkout.summary",
    gridColumn: "col-span-1",
    defaultValue: "Discount code",
  },
  {
    key: "olive.checkout.summary-apply-label",
    label: "Discount Apply Button Label",
    description: "Label on the button that applies a discount code.",
    type: "text",
    page: "checkout",
    group: "checkout.summary",
    gridColumn: "col-span-1",
    defaultValue: "Apply",
  },
  {
    key: "olive.checkout.summary-note",
    label: "Bag Card Note",
    description:
      "Quiet line at the bottom of the bag card. Leave blank to hide.",
    type: "textarea",
    page: "checkout",
    group: "checkout.summary",
    gridColumn: "col-span-full",
    defaultValue: "Tax and the final total are confirmed on the payment page.",
  },

  // ── checkout.unavailable ──────────────────────────────────────────────────
  {
    key: "olive.checkout.unavailable-heading",
    label: "Checkout Unavailable Heading",
    description:
      "Heading shown instead of the form when the store has not connected payments yet.",
    type: "text",
    page: "checkout",
    group: "checkout.unavailable",
    gridColumn: "col-span-1",
    defaultValue: "Checkout is almost ready",
  },
  {
    key: "olive.checkout.unavailable-body",
    label: "Checkout Unavailable Body",
    description: "Body copy on the checkout-unavailable card.",
    type: "textarea",
    page: "checkout",
    group: "checkout.unavailable",
    gridColumn: "col-span-full",
    defaultValue:
      "We are not taking payments online just yet. Send us a note and we will sort it out with you directly.",
  },
  {
    key: "olive.checkout.unavailable-cta",
    label: "Checkout Unavailable Button Label",
    description: "Label on the button back to the shop.",
    type: "text",
    page: "checkout",
    group: "checkout.unavailable",
    gridColumn: "col-span-1",
    defaultValue: "Back to shop",
  },

  // ── checkout.success ──────────────────────────────────────────────────────
  {
    key: "olive.checkout.success-heading",
    label: "Thank-You Heading",
    description: "The heading on the order confirmation page.",
    type: "text",
    page: "checkout",
    group: "checkout.success",
    gridColumn: "col-span-1",
    defaultValue: "Thank you — it's yours.",
  },
  {
    key: "olive.checkout.success-body",
    label: "Thank-You Body",
    description: "One line under the thank-you heading. Leave blank to hide.",
    type: "textarea",
    page: "checkout",
    group: "checkout.success",
    gridColumn: "col-span-full",
    defaultValue: "We have your order and we are already on it.",
  },
  {
    key: "olive.checkout.success-next-heading",
    label: "Next Steps Heading",
    description: "Heading over the list of what happens after the order.",
    type: "text",
    page: "checkout",
    group: "checkout.success",
    gridColumn: "col-span-1",
    defaultValue: "What happens next",
  },
  {
    key: "olive.checkout.success-next-steps",
    label: "Next Steps",
    description:
      "One step per line. Each line becomes a row in the list. Leave blank to hide the list.",
    type: "textarea",
    page: "checkout",
    group: "checkout.success",
    gridColumn: "col-span-full",
    defaultValue:
      "A confirmation email is on its way.\nWe pack every order by hand here in Detroit.\nYou will get a tracking link the moment it leaves.",
  },
  {
    key: "olive.checkout.success-continue-label",
    label: "Keep Shopping Button Label",
    description:
      "Label on the button back to the shop from the thank-you page.",
    type: "text",
    page: "checkout",
    group: "checkout.success",
    gridColumn: "col-span-1",
    defaultValue: "Keep shopping",
  },
  {
    key: "olive.checkout.success-loading",
    label: "Confirming Text",
    description:
      "Shown while the order is being read back from the payment provider.",
    type: "text",
    page: "checkout",
    group: "checkout.success",
    gridColumn: "col-span-1",
    defaultValue: "Confirming your order…",
  },
  {
    key: "olive.checkout.success-no-order-heading",
    label: "No Order Heading",
    description:
      "Heading shown when the thank-you page is opened without an order attached.",
    type: "text",
    page: "checkout",
    group: "checkout.success",
    gridColumn: "col-span-1",
    defaultValue: "No order to show",
  },
  {
    key: "olive.checkout.success-no-order-body",
    label: "No Order Body",
    description: "One line under the no-order heading.",
    type: "textarea",
    page: "checkout",
    group: "checkout.success",
    gridColumn: "col-span-full",
    defaultValue:
      "This page opened without an order attached. Head back to the shop and pick up where you left off.",
  },
];

export const oliveCheckoutFieldGroups: TemplateFieldGroup[] = [
  {
    id: "checkout.main",
    title: "Checkout Form",
    description:
      "Title, the four section headings, submit button and empty-bag copy",
    icon: "💳",
    columns: 2,
  } satisfies TemplateFieldGroup,
  {
    id: "checkout.summary",
    title: "Checkout Bag Card",
    description:
      "Heading, discount label and closing note on the sticky bag card",
    icon: "🧾",
    columns: 2,
  } satisfies TemplateFieldGroup,
  {
    id: "checkout.unavailable",
    title: "Checkout Unavailable",
    description: "The card shown when the store has not connected payments yet",
    icon: "🚫",
    columns: 2,
  } satisfies TemplateFieldGroup,
  {
    id: "checkout.success",
    title: "Order Confirmation",
    description:
      "Thank-you heading, what-happens-next list, and the loading and no-order states",
    icon: "🌿",
    columns: 2,
  } satisfies TemplateFieldGroup,
];

/**
 * None of the four are hideable. Each one IS the whole page in the state that
 * renders it — hiding the form, the unavailable card or the confirmation
 * would strand a shopper mid-purchase — and the bag card is the only place
 * the totals and the discount box live.
 */
export const oliveCheckoutSections: TemplateSection[] = [
  {
    id: "checkout.main",
    page: "checkout",
    title: "Checkout Form",
    description:
      "Title block, contact, delivery, address and payment sections, plus the empty-bag state",
    groupIds: ["checkout.main"],
    order: 0,
    hideable: false,
  },
  {
    id: "checkout.summary",
    page: "checkout",
    title: "Checkout Bag Card",
    description:
      "The sticky slate bag card: line items, discount code and totals",
    groupIds: ["checkout.summary"],
    order: 1,
    hideable: false,
  },
  {
    id: "checkout.unavailable",
    page: "checkout",
    title: "Checkout Unavailable",
    description:
      "Shown instead of the form when the store has not connected payments yet",
    groupIds: ["checkout.unavailable"],
    order: 2,
    hideable: false,
  },
  {
    id: "checkout.success",
    page: "checkout",
    title: "Order Confirmation",
    description: "The thank-you page shown after a successful payment",
    groupIds: ["checkout.success"],
    order: 3,
    hideable: false,
  },
];
