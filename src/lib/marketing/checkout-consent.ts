import type { DbClient } from "~/server/db";

import { marketingOptInData } from "./consent";

/** The Checkout Session metadata key/value the create-session routes stamp when the box was ticked. */
export const MARKETING_OPT_IN_METADATA_KEY = "marketingOptIn";
export const MARKETING_OPT_IN_METADATA_VALUE = "1";

/** True when a completed Checkout Session carries the ticked-newsletter marker. */
export function sessionMarketingOptIn(
  metadata: Record<string, string> | null | undefined,
): boolean {
  return (
    metadata?.[MARKETING_OPT_IN_METADATA_KEY] ===
    MARKETING_OPT_IN_METADATA_VALUE
  );
}

/**
 * Record a checkout newsletter opt-in for an EXISTING customer.
 *
 * Shared by the one-time and subscription webhooks so the semantics can't
 * drift. The conditional `updateMany` is the whole contract:
 *  - only matches a customer who is not already opted in, so the original
 *    consent source/date survive a later order (and a Stripe redelivery is a
 *    no-op, because the first delivery already flipped `acceptsMarketing`);
 *  - only matches an unsuppressed customer: a bounce/complaint/provider block
 *    stays in force (checkout carries no inbox proof, so it never clears one);
 *  - never writes `acceptsMarketing: false` — an unticked box must not undo an
 *    earlier opt-in.
 *
 * Always scoped by `businessId`. Identify the customer by `customerId` or by
 * (already normalized) `email`. Returns whether a row was changed.
 */
export async function applyCheckoutMarketingOptIn(
  db: Pick<DbClient, "customer">,
  target: { businessId: string } & (
    | { customerId: string; email?: never }
    | { email: string; customerId?: never }
  ),
): Promise<boolean> {
  const { count } = await db.customer.updateMany({
    where: {
      businessId: target.businessId,
      ...(target.customerId
        ? { id: target.customerId }
        : { email: target.email }),
      acceptsMarketing: false,
      marketingSuppressedAt: null,
    },
    data: marketingOptInData("CHECKOUT", { clearSuppression: false }),
  });
  return count > 0;
}
