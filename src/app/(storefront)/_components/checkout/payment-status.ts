/**
 * Delayed payment methods (US bank account / ACH debit) send the shopper to the
 * order-confirmation page immediately, while the payment takes a few business
 * days to clear. `/api/stripe/session` reports those as `payment_status:
 * "unpaid"`. The order itself (and the real confirmation email) only exists
 * once the payment clears, so every confirmation template must show a
 * "processing" state instead of "Unpaid" or any "confirmed / paid" claim.
 */

/** True when the Checkout Session is still waiting on a delayed payment. */
export function isPaymentProcessing(
  status: string | null | undefined,
): boolean {
  return status === "unpaid";
}

/** Shared notice copy shown on every template's confirmation page. */
export const PAYMENT_PROCESSING_MESSAGE =
  "Your bank payment is processing. This usually takes a few business days — we'll email your order confirmation once it clears.";

/** Short label for a payment-status badge / row while the payment clears. */
export const PAYMENT_PROCESSING_LABEL = "Processing";

/** Neutral headline for the processing state (never claims "confirmed"). */
export const PAYMENT_PROCESSING_HEADING = "Order received";
