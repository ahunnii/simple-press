import type { Customer } from "generated/prisma";

import type { DbClient } from "~/server/db";
import { upsertLocalCustomer } from "~/lib/subscriptions/customer";

import { isOnDoNotEmailList } from "./do-not-email";

/**
 * Who may receive an abandoned-checkout reminder.
 *
 * The reminder goes to shoppers who never subscribed (the store opted in, not
 * the shopper), so it is a commercial email that must honor every opt-out:
 * the store's do-not-email list, the customer's unsubscribe, a hard bounce /
 * complaint suppression, and erasure. A later re-subscribe (consent given
 * AFTER the unsubscribe) lifts the unsubscribe block.
 */

export type AbandonedReminderSkipReason =
  | "do-not-email"
  | "anonymized"
  | "suppressed"
  | "unsubscribed";

type ReminderCustomerState = Pick<
  Customer,
  | "anonymizedAt"
  | "marketingSuppressedAt"
  | "marketingUnsubscribedAt"
  | "marketingConsentAt"
>;

/** Why this customer must not get the reminder, or null when they may. */
export function abandonedReminderBlock(
  customer: ReminderCustomerState,
): Exclude<AbandonedReminderSkipReason, "do-not-email"> | null {
  if (customer.anonymizedAt) return "anonymized";
  if (customer.marketingSuppressedAt) return "suppressed";
  if (
    customer.marketingUnsubscribedAt &&
    (!customer.marketingConsentAt ||
      customer.marketingConsentAt < customer.marketingUnsubscribedAt)
  ) {
    return "unsubscribed";
  }
  return null;
}

/**
 * Resolves the reminder's recipient: checks the store's do-not-email list
 * first (so an opted-out address never gets a Customer row re-created), then
 * finds or creates the store-scoped Customer (new rows start with
 * `acceptsMarketing: false`; an existing row's marketing fields are never
 * touched) and applies `abandonedReminderBlock`.
 */
export async function resolveAbandonedCheckoutRecipient(
  db: DbClient,
  input: { businessId: string; email: string; name?: string | null },
): Promise<
  | { ok: true; customerId: string }
  | { ok: false; reason: AbandonedReminderSkipReason }
> {
  if (await isOnDoNotEmailList(db, input.businessId, input.email)) {
    return { ok: false, reason: "do-not-email" };
  }
  const customer = await upsertLocalCustomer(db, input);
  const block = abandonedReminderBlock(customer);
  if (block) return { ok: false, reason: block };
  return { ok: true, customerId: customer.id };
}
