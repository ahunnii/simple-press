import "server-only";

import type { QboEntityResponse, QboInvoice } from "~/lib/quickbooks/types";
import type { DbClient } from "~/server/db";
import { qboQuery, qboRequest } from "~/lib/quickbooks/client";
import { QBO_QUERY_CHUNK } from "~/lib/quickbooks/constants";
import { QboApiError } from "~/lib/quickbooks/errors";
import {
  chunk,
  escapeQboQueryValue,
  pickEntity,
} from "~/lib/quickbooks/mapping";

/**
 * Thin, single-purpose wrappers over the QBO `Invoice` endpoints. Nothing here
 * touches the local `QuickBooksInvoice` row or decides anything about
 * lifecycle — that's `issue.ts` (create/send) and the sync job (poll). Keeping
 * these dumb is what lets both orchestrators share them without inheriting
 * each other's assumptions.
 */

/**
 * Whether a `QboApiError` means "that invoice isn't there" rather than a real
 * failure. Intuit answers a read of a missing entity as a plain `404` in some
 * cases and a `400` carrying fault code `610` ("Object Not Found") in others.
 *
 * Deliberately duplicated from `customers.ts` — see the note there.
 */
function isNotFoundFault(err: unknown): boolean {
  return (
    err instanceof QboApiError && (err.status === 404 || err.code === "610")
  );
}

/**
 * Creates an invoice in QBO. `payload` comes from `buildInvoicePayload` —
 * passed as an opaque `object` because the caller (`issue.ts`) owns the
 * retry policy that varies it (online-payment flags, item ref) and this
 * function must stay a single, un-opinionated write.
 */
export async function createQboInvoice(
  db: DbClient,
  businessId: string,
  payload: object,
): Promise<QboInvoice> {
  const body = await qboRequest<QboEntityResponse<QboInvoice>>(db, businessId, {
    method: "POST",
    path: "/invoice",
    body: payload,
  });

  const invoice = pickEntity<QboInvoice>(body, "Invoice");
  if (!invoice?.Id) {
    // A 2xx that doesn't carry the entity is a transport/shape problem the
    // owner can't act on — keep it an opaque 500, not a friendly 400.
    throw new QboApiError("QuickBooks did not return the created invoice", {
      status: 502,
      ownerFixable: false,
    });
  }
  return invoice;
}

/**
 * Emails an existing QBO invoice to `sendTo` and returns the updated invoice
 * (its `SyncToken` advances, and `EmailStatus` becomes `EmailSent`).
 *
 * Intuit's send endpoint is a POST with NO body that nonetheless requires
 * `Content-Type: application/octet-stream`; sending `application/json` with an
 * empty body is rejected. The recipient goes on the query string, not in a
 * payload.
 */
export async function sendQboInvoice(
  db: DbClient,
  businessId: string,
  qboInvoiceId: string,
  sendTo: string,
): Promise<QboInvoice> {
  const body = await qboRequest<QboEntityResponse<QboInvoice>>(db, businessId, {
    method: "POST",
    path: `/invoice/${encodeURIComponent(qboInvoiceId)}/send`,
    query: { sendTo },
    contentType: "application/octet-stream",
  });

  const invoice = pickEntity<QboInvoice>(body, "Invoice");
  if (!invoice?.Id) {
    throw new QboApiError("QuickBooks did not confirm the invoice send", {
      status: 502,
      ownerFixable: false,
    });
  }
  return invoice;
}

/**
 * Reads one invoice by QBO id. Returns `null` — rather than throwing — when
 * QBO no longer has it, since a locally-tracked invoice the owner deleted in
 * QBO is a normal state the sync job has to handle, not an error.
 */
export async function fetchQboInvoice(
  db: DbClient,
  businessId: string,
  qboInvoiceId: string,
): Promise<QboInvoice | null> {
  try {
    const body = await qboRequest<QboEntityResponse<QboInvoice>>(
      db,
      businessId,
      { path: `/invoice/${encodeURIComponent(qboInvoiceId)}` },
    );
    return pickEntity<QboInvoice>(body, "Invoice");
  } catch (err) {
    if (isNotFoundFault(err)) return null;
    throw err;
  }
}

/**
 * Batch-reads invoices by QBO id — the sync job's read path, which polls up to
 * `QBO_SYNC_BATCH` open invoices at a time and would otherwise need one
 * request each.
 *
 * Ids are chunked at `QBO_QUERY_CHUNK` because Intuit caps both the row count
 * and the raw length of a query string. Chunks run SEQUENTIALLY on purpose:
 * QBO throttles per-realm, and a burst of parallel queries is the fastest way
 * to earn a 429 on a job that has no deadline. Ids missing at QBO are simply
 * absent from the result — the caller matches on `Id` rather than assuming
 * input and output line up.
 */
export async function queryQboInvoices(
  db: DbClient,
  businessId: string,
  ids: readonly string[],
): Promise<QboInvoice[]> {
  const usable = ids.filter((id) => id.length > 0);
  if (usable.length === 0) return [];

  const results: QboInvoice[] = [];
  for (const group of chunk(usable, QBO_QUERY_CHUNK)) {
    const list = group.map((id) => `'${escapeQboQueryValue(id)}'`).join(",");
    const rows = await qboQuery<QboInvoice>(
      db,
      businessId,
      "Invoice",
      `SELECT * FROM Invoice WHERE Id IN (${list})`,
    );
    results.push(...rows);
  }

  return results;
}
