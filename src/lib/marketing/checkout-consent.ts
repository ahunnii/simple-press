import type { DbClient } from "~/server/db";

import { marketingOptInData } from "./consent";
import { recordConsentEvent } from "./consent-log";
import { checkoutMarketingOptInWording } from "./consent-wording";
import { isOnDoNotEmailList, removeFromDoNotEmail } from "./do-not-email";

/** The Checkout Session metadata key/value the create-session routes stamp when the box was ticked. */
export const MARKETING_OPT_IN_METADATA_KEY = "marketingOptIn";
export const MARKETING_OPT_IN_METADATA_VALUE = "1";
/**
 * The shopper's IP, stamped next to the marker above as consent evidence. It is
 * the ONLY consent evidence that travels through Stripe metadata: the user
 * agent (and anything else) is deliberately never put there.
 */
export const MARKETING_OPT_IN_IP_METADATA_KEY = "marketingOptInIp";

/** True when a completed Checkout Session carries the ticked-newsletter marker. */
export function sessionMarketingOptIn(
  metadata: Record<string, string> | null | undefined,
): boolean {
  return (
    metadata?.[MARKETING_OPT_IN_METADATA_KEY] ===
    MARKETING_OPT_IN_METADATA_VALUE
  );
}

export type CheckoutOptInDb = Pick<
  DbClient,
  "customer" | "business" | "$transaction"
>;

/**
 * Record a checkout newsletter opt-in for a customer (new or existing).
 *
 * Shared by the one-time and subscription webhooks so the semantics can't
 * drift. All in one transaction (the Customer write and its consent event
 * commit together):
 *  - only opts in a customer who is not already opted in, so the original
 *    consent source/date survive a later order (and a Stripe redelivery is a
 *    no-op, because the first delivery already flipped `acceptsMarketing`);
 *  - only an unsuppressed customer: a bounce/complaint/provider block on the
 *    customer row stays in force (checkout carries no inbox proof);
 *  - the store's do-not-email list is honoured: a COMPLAINT entry is never
 *    lifted by a checkbox and blocks the opt-in; any other entry (unsubscribed,
 *    bounce, provider) is removed and an UNSUPPRESSED event logged, since the
 *    shopper has just ticked the box themselves;
 *  - never writes `acceptsMarketing: false` for an unticked box — an unticked
 *    box must not undo an earlier opt-in;
 *  - records OPT_IN / CHECKOUT with the exact checkbox wording and the IP from
 *    `opts.metadata[marketingOptInIp]` (user agent is not available here).
 *
 * Always scoped by `businessId`. Identify the customer by `customerId` or by
 * (already normalized) `email`. Returns whether the opt-in was recorded.
 */
export async function applyCheckoutMarketingOptIn(
  db: CheckoutOptInDb,
  target: { businessId: string } & (
    | { customerId: string; email?: never }
    | { email: string; customerId?: never }
  ),
  opts: { metadata?: Record<string, string> | null } = {},
): Promise<boolean> {
  const ip = opts.metadata?.[MARKETING_OPT_IN_IP_METADATA_KEY];
  const { businessId } = target;

  return db.$transaction(async (tx) => {
    const row = await tx.customer.findFirst({
      where: {
        businessId,
        ...(target.customerId
          ? { id: target.customerId }
          : { email: target.email }),
      },
      select: {
        id: true,
        email: true,
        acceptsMarketing: true,
        marketingSuppressedAt: true,
      },
    });
    if (!row || row.marketingSuppressedAt) return false;

    // Already opted in: keep the original consent source/date (and a Stripe
    // redelivery is a no-op).
    if (row.acceptsMarketing) return false;

    const listed = await isOnDoNotEmailList(tx, businessId, row.email);
    if (listed?.reason === "COMPLAINT") return false;

    const { count } = await tx.customer.updateMany({
      where: {
        id: row.id,
        businessId,
        acceptsMarketing: false,
        marketingSuppressedAt: null,
      },
      data: marketingOptInData("CHECKOUT", { clearSuppression: false }),
    });
    if (count === 0) return false;

    if (listed) {
      await removeFromDoNotEmail(tx, businessId, row.email);
      await recordConsentEvent(tx, {
        businessId,
        customerId: row.id,
        type: "UNSUPPRESSED",
        source: "CHECKOUT",
        ip,
      });
    }

    const business = await tx.business.findUnique({
      where: { id: businessId },
      select: { name: true },
    });
    await recordConsentEvent(tx, {
      businessId,
      customerId: row.id,
      type: "OPT_IN",
      source: "CHECKOUT",
      ip,
      userAgent: null,
      wording: checkoutMarketingOptInWording(business?.name ?? "this store"),
    });
    return true;
  });
}
