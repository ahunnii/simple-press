import "server-only";

import type { InvoiceEventType } from "~/lib/validators/invoice";
import type { TxClient } from "~/server/db";

/**
 * The `InvoiceEvent` activity log — append-only, one row per thing that
 * happened to an invoice (created, sent, viewed, paid, cancelled, ...).
 *
 * **Metadata is plaintext JSONB.** It must never carry anything that is
 * encrypted on the invoice itself: no line items, notes, terms, payment
 * instructions, phone, billing address, cancel reason, or a payment's
 * reference/note. Amounts, method KEYS, statuses, the recipient address of an
 * email (already plaintext on `Invoice.customerEmail`) and ids are fine. The
 * value type below is deliberately flat scalars so a whole decrypted object
 * can't be dropped in by accident.
 */
export type InvoiceEventMetadata = Record<
  string,
  string | number | boolean | null
>;

export type LogInvoiceEventInput = {
  invoiceId: string;
  businessId: string;
  type: InvoiceEventType;
  /** The signed-in user who did it; omit for the customer (views) and cron. */
  actorUserId?: string | null;
  metadata?: InvoiceEventMetadata;
};

/**
 * Append one event. Takes either the root client or an interactive
 * transaction client, so a state change and its log row can commit together.
 */
export async function logInvoiceEvent(
  db: TxClient,
  input: LogInvoiceEventInput,
): Promise<void> {
  await db.invoiceEvent.create({
    data: {
      invoiceId: input.invoiceId,
      businessId: input.businessId,
      type: input.type,
      actorUserId: input.actorUserId ?? null,
      ...(input.metadata ? { metadata: input.metadata } : {}),
    },
  });
}
