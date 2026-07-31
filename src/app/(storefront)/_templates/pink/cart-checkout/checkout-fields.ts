import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

/**
 * Checkout page fields — design.md → "Per-page section concepts → Checkout".
 *
 * Two groups, both `page: "checkout"`:
 *  - `checkout.main` — the paper form column. Not hideable (it's the form).
 *  - `checkout.summary` — the sticky ink basket aside. Hideable per design.md,
 *    though the checkout form always keeps a totals readout inline so the
 *    submit button is never orphaned from the price when an owner hides it.
 *
 * `cart`/`checkout` are intentionally absent from `PAGE_PREVIEW_PATHS`, so
 * these fields are edited in the platform-admin advanced editor only.
 */
export const pinkCheckoutData: TemplateField[] = [
  // ── checkout.main ──────────────────────────────────────────────────────
  {
    key: "pink.checkout.heading",
    label: "Checkout Heading",
    description: "The main heading at the top of the checkout page.",
    type: "text",
    page: "checkout",
    group: "checkout.main",
    gridColumn: "col-span-1",
    defaultValue: "Checkout",
  },
  {
    key: "pink.checkout.intro",
    label: "Checkout Reassurance Line",
    description: "One line under the heading explaining what happens next.",
    type: "textarea",
    page: "checkout",
    group: "checkout.main",
    gridColumn: "col-span-full",
    defaultValue:
      "No card is charged until the very last step. You'll see the full total before you pay.",
  },
  {
    key: "pink.checkout.contact-heading",
    label: "Contact Section Heading",
    description: "Heading over the name / email / phone fields.",
    type: "text",
    page: "checkout",
    group: "checkout.main",
    gridColumn: "col-span-1",
    defaultValue: "Who it's for",
  },
  {
    key: "pink.checkout.shipping-heading",
    label: "Shipping Section Heading",
    description: "Heading over the delivery method and address fields.",
    type: "text",
    page: "checkout",
    group: "checkout.main",
    gridColumn: "col-span-1",
    defaultValue: "Where it's going",
  },
  {
    key: "pink.checkout.submit-label",
    label: "Submit Button Label",
    description: "Text on the primary checkout submit button.",
    type: "text",
    page: "checkout",
    group: "checkout.main",
    gridColumn: "col-span-1",
    defaultValue: "Continue to payment",
  },
  {
    key: "pink.checkout.back-link-label",
    label: "Back Link Label",
    description: "The quiet link beside the submit button, back to the basket.",
    type: "text",
    page: "checkout",
    group: "checkout.main",
    gridColumn: "col-span-1",
    defaultValue: "Back to basket",
  },
  {
    key: "pink.checkout.note",
    label: "Payment Note",
    description:
      "Small line explaining that no card is taken on this step — sits beside the submit button.",
    type: "text",
    page: "checkout",
    group: "checkout.main",
    gridColumn: "col-span-full",
    defaultValue: "No card is taken on this step.",
  },
  {
    key: "pink.checkout.empty-heading",
    label: "Empty Basket Heading",
    description: "Heading shown if checkout is reached with an empty basket.",
    type: "text",
    page: "checkout",
    group: "checkout.main",
    gridColumn: "col-span-1",
    defaultValue: "Your basket is empty",
  },
  {
    key: "pink.checkout.empty-body",
    label: "Empty Basket Body",
    description: "Short line under the empty-basket heading.",
    type: "textarea",
    page: "checkout",
    group: "checkout.main",
    gridColumn: "col-span-full",
    defaultValue: "Add a piece before you check out.",
  },
  {
    key: "pink.checkout.empty-cta",
    label: "Empty Basket CTA Label",
    description: "Button label on the empty-basket state.",
    type: "text",
    page: "checkout",
    group: "checkout.main",
    gridColumn: "col-span-1",
    defaultValue: "Shop the collection",
  },

  // ── checkout.summary ───────────────────────────────────────────────────
  {
    key: "pink.checkout.summary-heading",
    label: "Basket Summary Heading",
    description: "Heading at the top of the sticky ink basket panel.",
    type: "text",
    page: "checkout",
    group: "checkout.summary",
    gridColumn: "col-span-1",
    defaultValue: "Your basket",
  },
  {
    key: "pink.checkout.summary-discount-label",
    label: "Discount Field Label",
    description: "Label above the discount-code input in the basket panel.",
    type: "text",
    page: "checkout",
    group: "checkout.summary",
    gridColumn: "col-span-1",
    defaultValue: "Discount code",
  },
  {
    key: "pink.checkout.summary-apply-label",
    label: "Discount Apply Button Label",
    description: "Label on the ghost button that applies a discount code.",
    type: "text",
    page: "checkout",
    group: "checkout.summary",
    gridColumn: "col-span-1",
    defaultValue: "Apply",
  },
  {
    key: "pink.checkout.summary-note",
    label: "Basket Summary Closing Note",
    description: "Small reassurance line at the bottom of the basket panel.",
    type: "textarea",
    page: "checkout",
    group: "checkout.summary",
    gridColumn: "col-span-full",
    defaultValue: "Tax and the final total are confirmed on the next screen.",
  },
];

export const pinkCheckoutFieldGroups: TemplateFieldGroup[] = [
  {
    id: "checkout.main",
    title: "Checkout Form",
    description:
      "Heading, section headings, submit button, and messaging for the checkout form",
    icon: "📝",
    columns: 2,
  } satisfies TemplateFieldGroup,
  {
    id: "checkout.summary",
    title: "Checkout Basket Panel",
    description:
      "Heading and copy for the sticky ink basket summary beside the checkout form",
    icon: "🧾",
    columns: 2,
  } satisfies TemplateFieldGroup,
];
