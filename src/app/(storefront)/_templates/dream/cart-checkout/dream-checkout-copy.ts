import {
  resolveDreamCartCheckoutFields,
  resolveDreamCartCheckoutRequired,
} from "./index";

/** Resolved `checkout.details` / `checkout.empty` copy for the form. */
export type DreamCheckoutCopy = {
  contactHeading: string;
  deliveryHeading: string;
  shipBody: string;
  pickupBody: string;
  addressHeading: string;
  addressNote: string;
  summaryHeading: string;
  submitLabel: string;
  /** B8.7 — never hidden: a saved blank falls back to the built-in line. */
  taxNote: string;
  emptyHeading: string;
  emptyBody: string;
  emptyCtaLabel: string;
};

/**
 * Pure (no server imports), so the client checkout form can resolve its own
 * copy from `business.siteContent.customFields`. Headings, the payment
 * button, and the tax note never hide; notes and the empty-state message /
 * button hide when saved blank.
 */
export function resolveDreamCheckoutCopy(
  customFields: unknown,
): DreamCheckoutCopy {
  const req = resolveDreamCartCheckoutRequired(customFields, [
    "dream.checkout.contact-heading",
    "dream.checkout.delivery-heading",
    "dream.checkout.address-heading",
    "dream.checkout.summary-heading",
    "dream.checkout.submit-label",
    "dream.checkout.tax-note",
    "dream.checkout.empty-heading",
  ]);
  const opt = resolveDreamCartCheckoutFields(customFields, [
    "dream.checkout.ship-body",
    "dream.checkout.pickup-body",
    "dream.checkout.address-note",
    "dream.checkout.empty-body",
    "dream.checkout.empty-cta-label",
  ]);
  return {
    contactHeading: req["dream.checkout.contact-heading"] ?? "",
    deliveryHeading: req["dream.checkout.delivery-heading"] ?? "",
    shipBody: opt["dream.checkout.ship-body"] ?? "",
    pickupBody: opt["dream.checkout.pickup-body"] ?? "",
    addressHeading: req["dream.checkout.address-heading"] ?? "",
    addressNote: opt["dream.checkout.address-note"] ?? "",
    summaryHeading: req["dream.checkout.summary-heading"] ?? "",
    submitLabel: req["dream.checkout.submit-label"] ?? "",
    taxNote: req["dream.checkout.tax-note"] ?? "",
    emptyHeading: req["dream.checkout.empty-heading"] ?? "",
    emptyBody: opt["dream.checkout.empty-body"] ?? "",
    emptyCtaLabel: opt["dream.checkout.empty-cta-label"] ?? "",
  };
}
