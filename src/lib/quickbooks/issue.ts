import "server-only";

import * as Sentry from "@sentry/nextjs";

import type { InvoiceKind, QboAddress } from "~/lib/quickbooks/types";
import type { DbClient } from "~/server/db";
import { ensureCustomer } from "~/lib/quickbooks/customers";
import {
  QboApiError,
  QboNeedsReconnectError,
  QboNotConnectedError,
} from "~/lib/quickbooks/errors";
import { createQboInvoice, sendQboInvoice } from "~/lib/quickbooks/invoices";
import { ensureServiceItemId, resetItemCache } from "~/lib/quickbooks/items";
import {
  buildInvoicePayload,
  defaultLineDescription,
  dueDateString,
  qboAmountToCents,
  toQboBillAddr,
  truncateError,
} from "~/lib/quickbooks/mapping";
import {
  parseBillingAddressJson,
  QBO_INVOICE_KIND_VALUES,
} from "~/lib/validators/quickbooks";

/**
 * The one orchestration that turns a local `QuickBooksInvoice` row into a real
 * invoice in QuickBooks Online: resolve the references it needs, create it,
 * optionally email it, and record what happened on the row.
 *
 * Everything here is built around being RE-RUNNABLE. The admin "retry" action
 * calls `issueInvoice` again on the same row, and so does an owner who clicks
 * twice. So each step is guarded by what the row already records — an invoice
 * that was created but never sent resumes at the send, not at a second create
 * — and the failure path is careful never to erase the evidence of a step that
 * DID succeed (see the catch at the bottom).
 *
 * ORDER OF ASSIGNMENT IS THE WHOLE SAFETY PROPERTY.
 * `qboInvoiceId` / `qboCustomerId` / `currentStatus` are advanced in memory the
 * INSTANT Intuit confirms the create, BEFORE the row is updated — because the
 * update is itself a step that can fail. If the local variables only advanced
 * after a successful write, a failed write would leave the catch below looking
 * at `qboInvoiceId === null`, mark the row `error`, and offer the owner a Retry
 * that creates a SECOND invoice at Intuit and emails their customer twice. So
 * the catch persists the ids it holds rather than trusting that the first
 * update landed, and only a row with no Intuit invoice at all is ever recorded
 * as `error`.
 */

type QuickBooksInvoiceRow = Awaited<
  ReturnType<DbClient["quickBooksInvoice"]["findUniqueOrThrow"]>
>;

/**
 * Fault codes/details that mean "a reference in this payload doesn't resolve
 * at QBO" — i.e. a cached `ItemRef`/`AccountRef` id has gone stale because the
 * owner deleted or deactivated it. `6000` is Intuit's generic validation
 * fault and `2500` is "referenced object not found", but neither is
 * exclusively about references, so the detail text is checked too.
 */
const STALE_REFERENCE_CODES = new Set(["6000", "2500"]);
const STALE_REFERENCE_DETAIL = /ItemRef|AccountRef|Invalid Reference/i;

/**
 * A rejection caused by asking for online payment on an account that can't
 * offer it. QuickBooks Payments is a separate signup; a tenant without it
 * rejects `AllowOnlineCreditCardPayment`/`AllowOnlineACHPayment` outright.
 * Matched loosely on purpose — Intuit's wording here varies and the recovery
 * (drop the flags and retry) is harmless when the guess is wrong, because the
 * retry either succeeds or fails again with the same error we were going to
 * report anyway.
 */
const ONLINE_PAYMENT_FAULT = /online|payment/i;

function isStaleReferenceFault(err: QboApiError): boolean {
  return (
    (err.code !== undefined && STALE_REFERENCE_CODES.has(err.code)) ||
    (err.detail !== undefined && STALE_REFERENCE_DETAIL.test(err.detail))
  );
}

function isOnlinePaymentFault(err: QboApiError): boolean {
  return (
    ONLINE_PAYMENT_FAULT.test(err.message) ||
    (err.detail !== undefined && ONLINE_PAYMENT_FAULT.test(err.detail))
  );
}

/**
 * Narrows the row's `kind` column (a plain `String` in Postgres) to the
 * `InvoiceKind` union. An unrecognized value falls back to `custom` — the
 * neutral kind — rather than throwing: a row that somehow holds a bad kind
 * should still be invoiceable, and `custom` picks the shared service item and
 * a generic line description.
 */
function asInvoiceKind(value: string): InvoiceKind {
  return (QBO_INVOICE_KIND_VALUES as readonly string[]).includes(value)
    ? (value as InvoiceKind)
    : "custom";
}

/**
 * The message persisted to `QuickBooksInvoice.lastError`, which is shown to
 * the OWNER in the admin inbox. For a QBO fault that's Intuit's own
 * `Message`/`Detail` and nothing else — deliberately never the request, the
 * access token, or the customer's email address, all of which are in scope in
 * this file and none of which belong in a stored, rendered string.
 */
function ownerFacingError(err: unknown): string {
  if (err instanceof QboApiError) {
    const detail = err.detail;
    return truncateError(
      detail && detail !== err.message
        ? `${err.message}: ${detail}`
        : err.message,
    );
  }
  return truncateError(err instanceof Error ? err.message : String(err));
}

/**
 * Creates the invoice at QBO, recovering once from each of the two failures
 * that are worth retrying rather than reporting:
 *
 * - a stale item/account reference → clear the reference cache, re-resolve the
 *   item, try again (this is the self-heal for an owner who deleted the
 *   "Services" item in QBO);
 * - a rejection of the online-payment flags → try again without them, so a
 *   tenant who never signed up for QuickBooks Payments still gets an invoice
 *   instead of an error.
 *
 * Each recovery is available at most once, so the loop can run at most three
 * creates before giving up and rethrowing the last fault.
 */
async function createWithRecovery(
  db: DbClient,
  businessId: string,
  args: {
    kind: InvoiceKind;
    itemId: string;
    customerId: string;
    amountCents: number;
    description: string;
    dueDate: string;
    email: string;
    memo: string | null;
    billAddr: QboAddress | null;
  },
) {
  let itemId = args.itemId;
  let allowOnlinePayment = true;
  let referenceRetryUsed = false;
  let onlinePaymentRetryUsed = false;

  for (;;) {
    try {
      return await createQboInvoice(
        db,
        businessId,
        buildInvoicePayload({
          customerId: args.customerId,
          itemId,
          amountCents: args.amountCents,
          description: args.description,
          dueDate: args.dueDate,
          email: args.email,
          memo: args.memo,
          billAddr: args.billAddr,
          allowOnlinePayment,
        }),
      );
    } catch (err) {
      if (!(err instanceof QboApiError)) throw err;

      if (!referenceRetryUsed && isStaleReferenceFault(err)) {
        referenceRetryUsed = true;
        await resetItemCache(db, businessId);
        itemId = await ensureServiceItemId(db, businessId, args.kind);
        continue;
      }

      if (
        allowOnlinePayment &&
        !onlinePaymentRetryUsed &&
        isOnlinePaymentFault(err)
      ) {
        onlinePaymentRetryUsed = true;
        allowOnlinePayment = false;
        continue;
      }

      throw err;
    }
  }
}

/**
 * Issues the invoice recorded by `invoiceRowId`, then returns the row as it
 * now stands.
 *
 * Rethrows on failure (so the caller can map it via `toTrpcError`) but always
 * records the failure on the row first, because the admin inbox's retry
 * affordance is driven by `status`/`lastError` and a thrown-but-unrecorded
 * failure would leave the row stuck at `pending` with nothing to explain it.
 */
export async function issueInvoice(
  db: DbClient,
  params: { businessId: string; invoiceRowId: string; send: boolean },
): Promise<QuickBooksInvoiceRow> {
  const row = await db.quickBooksInvoice.findUnique({
    where: { id: params.invoiceRowId, businessId: params.businessId },
  });
  if (!row) throw new Error("Invoice not found");

  const conn = await db.quickBooksConnection.findUnique({
    where: { businessId: params.businessId },
  });
  if (!conn) throw new QboNotConnectedError();
  if (conn.status !== "active") {
    throw conn.status === "needs_reconnect"
      ? new QboNeedsReconnectError()
      : new QboNotConnectedError();
  }

  const business = await db.business.findUnique({
    where: { id: params.businessId },
    select: { name: true, timeZone: true },
  });
  if (!business) throw new Error("Business not found");

  // Tracked alongside the row because all three drive the resume logic below
  // AND the catch's decision about what to persist — `row` itself is a snapshot
  // from before this run and is never mutated.
  let qboInvoiceId = row.qboInvoiceId;
  let qboCustomerId = row.qboCustomerId;
  let currentStatus = row.status;
  // Set only when THIS run created the invoice. The catch re-stamps `realmId`
  // from it rather than from `conn`, so a resumed row that belongs to a
  // previous QuickBooks company is never relabelled as belonging to the
  // current one — that relabel would hand the sync engine an id it will query
  // against the wrong company, find nothing, and mark a real invoice `voided`.
  let createdInRealmId: string | null = null;

  try {
    if (qboInvoiceId === null) {
      const kind = asInvoiceKind(row.kind);
      const itemId = await ensureServiceItemId(db, params.businessId, kind);

      // The address snapshot taken when the invoice was raised. Total on read:
      // a row from before the column existed, or one holding unparseable
      // JSON, simply issues without a `BillAddr` — exactly as every invoice
      // did before the field was added.
      const billing = parseBillingAddressJson(row.billingAddress);
      const billAddr = billing ? toQboBillAddr(billing) : null;

      const customer = await ensureCustomer(db, params.businessId, {
        name: row.customerName,
        email: row.customerEmail,
        phone: row.customerPhone,
        previousCustomerId: await findSiblingCustomerId(db, row),
        billAddr,
      });

      const invoice = await createWithRecovery(db, params.businessId, {
        kind,
        itemId,
        customerId: customer.id,
        amountCents: row.amountCents,
        description:
          row.description ?? defaultLineDescription(kind, business.name),
        // `dueDate` was stored from a date-only `YYYY-MM-DD` string, so the
        // UTC slice reads back exactly what the owner picked. The fallback is
        // only for a row saved without one — computed in the BUSINESS's zone,
        // not the server's, so "due in 7 days" means 7 of the owner's days.
        dueDate: row.dueDate
          ? row.dueDate.toISOString().slice(0, 10)
          : dueDateString(new Date(), conn.defaultDueDays, business.timeZone),
        email: row.customerEmail,
        memo: row.memo,
        billAddr,
      });

      // BEFORE the write, never after — see the module docblock. From this
      // line on, an invoice exists at Intuit and every failure path has to
      // account for it.
      qboInvoiceId = invoice.Id;
      qboCustomerId = customer.id;
      currentStatus = "created";
      createdInRealmId = conn.realmId;

      await db.quickBooksInvoice.update({
        where: { id: row.id },
        data: {
          status: "created",
          qboInvoiceId: invoice.Id,
          qboCustomerId: customer.id,
          qboDocNumber: invoice.DocNumber ?? null,
          qboSyncToken: invoice.SyncToken,
          // QBO omits `Balance` on a just-created invoice often enough that
          // falling back to the full amount is the honest reading: nothing has
          // been paid yet, so the balance IS the amount.
          balanceCents: qboAmountToCents(invoice.Balance) ?? row.amountCents,
          realmId: conn.realmId,
          lastError: null,
          lastSyncedAt: new Date(),
        },
      });
    }

    // Send when asked, for an invoice that exists at QBO and hasn't been sent.
    // `created` covers both a create that just happened and one from a prior
    // attempt whose send failed. The `error`/`pending`-WITH-an-id cases are the
    // recovery arm: a row can hold a real Intuit invoice while still reading
    // `pending` (its very first status write failed) or `error` (a legacy row
    // recorded before the catch below stopped producing that combination), and
    // in both cases the invoice exists and must still be emailed rather than
    // re-created.
    const sendable =
      currentStatus === "created" ||
      (qboInvoiceId !== null &&
        (currentStatus === "error" || currentStatus === "pending"));

    if (params.send && qboInvoiceId !== null && sendable) {
      const sent = await sendQboInvoice(
        db,
        params.businessId,
        qboInvoiceId,
        row.customerEmail,
      );

      await db.quickBooksInvoice.update({
        where: { id: row.id },
        data: {
          status: "sent",
          sentAt: new Date(),
          qboSyncToken: sent.SyncToken,
          lastError: null,
        },
      });
    }
  } catch (err) {
    const lastError = ownerFacingError(err);

    // A create that succeeded is never walked back to `error`: the invoice
    // EXISTS at QBO and the customer may already have been emailed it, so the
    // row stays `created` and only records why the rest failed. Marking it
    // `error` would invite a retry that creates a duplicate invoice — the one
    // outcome this whole module is built to prevent.
    //
    // The Intuit ids are re-written here rather than assumed: the failure being
    // recorded may BE the update that was supposed to store them, so this write
    // is the last chance to get them onto the row. Writing them twice is a
    // no-op; not writing them once is a duplicate invoice.
    await db.quickBooksInvoice
      .update({
        where: { id: row.id },
        data:
          qboInvoiceId !== null
            ? {
                status: "created",
                qboInvoiceId,
                qboCustomerId,
                ...(createdInRealmId ? { realmId: createdInRealmId } : {}),
                lastError,
              }
            : { status: "error", lastError },
      })
      .catch((updateErr: unknown) => {
        // Recording the failure must never replace it — rethrow the original.
        console.error(
          "[quickbooks] could not persist invoice failure state",
          updateErr,
        );
        // The only path that can strand a real Intuit invoice with no local
        // id: both writes failed. Nothing else will ever reconcile it, so an
        // operator needs the pair of ids to repair the row by hand.
        Sentry.captureException(updateErr, {
          tags: {
            service: "quickbooks",
            "quickbooks.step": "persist-invoice-id",
            businessId: params.businessId,
          },
          extra: { invoiceRowId: row.id, qboInvoiceId },
        });
      });

    throw err;
  }

  return db.quickBooksInvoice.findUniqueOrThrow({ where: { id: row.id } });
}

/**
 * The QBO customer id a sibling invoice for the same quote lead already
 * resolved to, if any — so a final-balance invoice bills the SAME QBO customer
 * as its deposit did, instead of matching by display name and risking a
 * second customer record for the same person.
 *
 * Only meaningful for rows tied to a quote submission; a `custom` invoice
 * raised by hand has no sibling to inherit from. The empty-string guard is
 * deliberate: Prisma's `{ not: null }` matches `""`, which would hand
 * `ensureCustomer` an id that can never resolve.
 */
async function findSiblingCustomerId(
  db: DbClient,
  row: { id: string; businessId: string; quoteSubmissionId: string | null },
): Promise<string | null> {
  if (!row.quoteSubmissionId) return null;

  const sibling = await db.quickBooksInvoice.findFirst({
    where: {
      businessId: row.businessId,
      quoteSubmissionId: row.quoteSubmissionId,
      qboCustomerId: { not: null },
      id: { not: row.id },
    },
    orderBy: { createdAt: "desc" },
    select: { qboCustomerId: true },
  });

  const customerId = sibling?.qboCustomerId;
  return customerId !== null && customerId !== undefined && customerId !== ""
    ? customerId
    : null;
}
