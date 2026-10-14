/**
 * What `order.markAsFulfilled` told the customer, and the owner-facing toast
 * that reports it — pure and client-safe.
 *
 * The mutation sends at most one KIND of email per request:
 *
 *  - "shipped" — one per shipment created in this request that has tracking;
 *  - "fulfilled" — no tracking, but the order just became fully fulfilled;
 *  - nothing — a partial shipment without tracking. The customer hears about
 *    it later, when a shipment with tracking is added or the order completes.
 *
 * The toast used to claim "email sent to customer" in every case, including
 * the one where no email exists and the one where the send failed.
 */

export type FulfillmentEmailKind = "shipped" | "fulfilled";

export type FulfillmentEmailOutcome = {
  /** The email that actually went out; null when none was sent or the send failed. */
  customerEmailSent: FulfillmentEmailKind | null;
  /** True when an email was due and the send failed (the fulfillment still saved). */
  customerEmailFailed: boolean;
};

export type FulfillmentToast = {
  tone: "success" | "warning";
  title: string;
  description?: string;
};

export function fulfillmentToast(
  outcome: FulfillmentEmailOutcome & { fullyFulfilled: boolean },
): FulfillmentToast {
  const recorded = outcome.fullyFulfilled
    ? "Order fulfilled"
    : "Shipment recorded";

  if (outcome.customerEmailFailed) {
    return {
      tone: "warning",
      title: `${recorded}, but the email to the customer didn't send`,
      description: "It can be resent from More Options on this order.",
    };
  }

  switch (outcome.customerEmailSent) {
    case "shipped":
      return {
        tone: "success",
        title: `${recorded} and shipping email sent to customer`,
      };
    case "fulfilled":
      return {
        tone: "success",
        title: `${recorded} and email sent to customer`,
      };
    case null:
      return outcome.fullyFulfilled
        ? // Unreachable today (a fully fulfilled order always gets one of the
          // two emails) — kept so the copy never claims an email that wasn't sent.
          { tone: "success", title: `${recorded} — no email sent` }
        : {
            tone: "success",
            title: "Partial shipment recorded. No email sent",
            description:
              "The customer is emailed when a shipment with tracking is added or the order is fully fulfilled.",
          };
  }
}
