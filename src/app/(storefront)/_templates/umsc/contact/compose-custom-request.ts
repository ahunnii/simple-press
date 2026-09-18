/**
 * Pure composition helpers for the Custom Order request form (design.md
 * "Per-page section concepts › Contact"). `useContactForm` registers
 * `name`/`email`/`phone`/`preferredContactMethod`/`message`, but the
 * custom-order-specific answers (product type, quantity, date needed,
 * occasion, scent-or-colour notes) are local React state, NOT part of that
 * schema. This module folds those extras into a fixed-format prefix ahead of
 * the free-text `message`, so the one `message` field the platform's
 * `contact.send` mutation understands still carries every structured answer.
 *
 * Modeled directly on
 * `../../dream/contact/compose-quote-message.ts` — no React, no DOM, so it's
 * trivially unit-testable and safe to call from both the client form
 * (composing the submission) and its live character-budget display (sizing
 * the message textarea's remaining-chars counter off the prefix length,
 * before any message text exists).
 */

export type CustomRequestProductType =
  | ""
  | "candles"
  | "wax-melts"
  | "soaps"
  | "body-care"
  | "home-care"
  | "bundle-or-favors"
  | "not-sure";

export type CustomRequestExtras = {
  productType: CustomRequestProductType;
  quantity: string;
  dateNeeded: string;
  occasion: string;
  scentColourNotes: string;
};

export const EMPTY_CUSTOM_REQUEST_EXTRAS: CustomRequestExtras = {
  productType: "",
  quantity: "",
  dateNeeded: "",
  occasion: "",
  scentColourNotes: "",
};

const PRODUCT_TYPE_LABELS: Record<
  Exclude<CustomRequestProductType, "">,
  string
> = {
  candles: "Candles",
  "wax-melts": "Wax melts",
  soaps: "Soaps",
  "body-care": "Body care",
  "home-care": "Home care",
  "bundle-or-favors": "Bundle or favors",
  "not-sure": "Not sure",
};

function isProductType(
  value: CustomRequestProductType,
): value is Exclude<CustomRequestProductType, ""> {
  return value !== "";
}

/**
 * The fixed-format block describing the structured custom-order answers,
 * WITHOUT the trailing blank line + free-text message. Blank optional
 * fields (quantity, date needed, occasion, scent-or-colour notes) drop
 * their line entirely rather than rendering an empty value.
 *
 * Exported on its own (not just via `composeCustomRequestMessage`) because
 * the form also uses its `.length` to size the live character budget for
 * the free-text message before any message text is typed.
 */
export function composeCustomRequestPrefix(
  extras: CustomRequestExtras,
): string {
  const lines: string[] = ["Custom order request"];

  if (isProductType(extras.productType)) {
    lines.push(`Product type: ${PRODUCT_TYPE_LABELS[extras.productType]}`);
  }

  const detailSegments: string[] = [];
  if (extras.quantity.trim()) {
    detailSegments.push(`Quantity: ${extras.quantity.trim()}`);
  }
  if (extras.dateNeeded.trim()) {
    detailSegments.push(`Date needed: ${extras.dateNeeded.trim()}`);
  }
  if (detailSegments.length > 0) {
    lines.push(detailSegments.join(" · "));
  }

  if (extras.occasion.trim()) {
    lines.push(`Occasion: ${extras.occasion.trim()}`);
  }

  if (extras.scentColourNotes.trim()) {
    lines.push(`Scent or colour notes: ${extras.scentColourNotes.trim()}`);
  }

  return lines.join("\n");
}

/**
 * The full composed `message` submitted to `contact.send` in custom-order
 * mode: the structured prefix, a blank line, then the free-text message.
 * When `message` is blank the prefix is returned alone (the base form still
 * requires 10+ characters before this is reachable in practice).
 */
export function composeCustomRequestMessage(
  extras: CustomRequestExtras,
  message: string,
): string {
  const prefix = composeCustomRequestPrefix(extras);
  const trimmedMessage = message.trim();
  return trimmedMessage ? `${prefix}\n\n${trimmedMessage}` : prefix;
}
