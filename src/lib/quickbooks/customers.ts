import "server-only";

import type {
  QboAddress,
  QboCustomer,
  QboEntityResponse,
} from "~/lib/quickbooks/types";
import type { DbClient } from "~/server/db";
import { qboQuery, qboRequest } from "~/lib/quickbooks/client";
import { QboApiError } from "~/lib/quickbooks/errors";
import {
  buildCustomerPayload,
  escapeQboQueryValue,
  pickEntity,
} from "~/lib/quickbooks/mapping";

/**
 * Resolving a local customer (name/email/phone) to a QuickBooks Online
 * `Customer` id.
 *
 * The whole point of this module is IDEMPOTENCE: `issueInvoice` is re-runnable
 * (the admin "retry" action calls it again on the same row), and a second run
 * must land on the SAME QBO customer rather than minting a duplicate. That's
 * three escalating attempts — reuse a known id, look one up by display name,
 * and only then create — plus a duplicate-name fallback for the one case QBO
 * refuses a create it also refuses to surface via query.
 */

/**
 * Whether a `QboApiError` means "that entity isn't there", as opposed to a
 * real failure. Intuit is inconsistent about this: a read of a missing entity
 * is sometimes a plain `404`, and sometimes a `400` carrying fault code `610`
 * ("Object Not Found"). Both are treated as absence.
 *
 * Deliberately duplicated in `invoices.ts` (`fetchQboInvoice` needs the same
 * rule) rather than exported from one entity module into the other — neither
 * "customers" nor "invoices" is the natural owner of a generic transport-level
 * predicate, and the shared home for it (`errors.ts`) was already written.
 */
function isNotFoundFault(err: unknown): boolean {
  return (
    err instanceof QboApiError && (err.status === 404 || err.code === "610")
  );
}

/** Intuit's fault code for "an object with that name/number already exists". */
const QBO_DUPLICATE_NAME_CODE = "6240";

/**
 * Looks up a QBO customer by exact `DisplayName`, returning the first ACTIVE
 * match. Inactive matches are skipped rather than reused: invoicing against a
 * deactivated customer fails at QBO, and reactivating someone the owner
 * deliberately archived isn't ours to decide.
 */
async function findActiveCustomerByName(
  db: DbClient,
  businessId: string,
  name: string,
): Promise<QboCustomer | null> {
  const rows = await qboQuery<QboCustomer>(
    db,
    businessId,
    "Customer",
    `SELECT * FROM Customer WHERE DisplayName = '${escapeQboQueryValue(name)}'`,
  );
  return rows.find((row) => row.Active !== false) ?? null;
}

/**
 * Resolves `input` to a QBO `Customer` id, creating the customer only when no
 * existing one can be reused. Attempts, in order:
 *
 * 1. `previousCustomerId` — an id this business already used for this person
 *    (typically the deposit invoice's customer, reused by the final invoice).
 *    Re-read rather than trusted blindly: the owner may have deleted or
 *    deactivated that customer in QBO since, and a stale `CustomerRef` fails
 *    the invoice create with an unhelpful reference fault. A not-found read
 *    here is swallowed — it just means "can't reuse it", not "give up".
 * 2. An exact `DisplayName` match.
 * 3. Create.
 *
 * The create can still fail with `6240` even though step 2 found nothing:
 * QBO's uniqueness check spans more than the exact active-DisplayName match a
 * query sees (an INACTIVE customer holds its name, and QBO also folds
 * whitespace/case). In that case the name is disambiguated with the email —
 * `"Jane Smith (jane@example.com)"` — which is also looked up before being
 * created, so a retry of a previously-disambiguated customer reuses it instead
 * of failing `6240` a second time and dead-ending.
 *
 * `billAddr` reaches step 3 and nowhere else. A customer that already exists in
 * the owner's books keeps the address it has: QBO customer updates are
 * full-object writes gated on a `SyncToken`, and quietly rewriting a record the
 * owner may have corrected inside QuickBooks — from a lead's snapshot that
 * could be months old — is not this function's call to make. The per-invoice
 * `BillAddr` is what keeps each individual invoice accurate.
 */
export async function ensureCustomer(
  db: DbClient,
  businessId: string,
  input: {
    name: string;
    email: string;
    phone?: string | null;
    previousCustomerId?: string | null;
    billAddr?: QboAddress | null;
  },
): Promise<{ id: string }> {
  // 1. Reuse a previously-resolved customer, if it still exists and is active.
  if (input.previousCustomerId) {
    try {
      const body = await qboRequest<QboEntityResponse<QboCustomer>>(
        db,
        businessId,
        { path: `/customer/${encodeURIComponent(input.previousCustomerId)}` },
      );
      const existing = pickEntity<QboCustomer>(body, "Customer");
      if (existing?.Id && existing.Active !== false) {
        return { id: existing.Id };
      }
    } catch (err) {
      if (!isNotFoundFault(err)) throw err;
      // Deleted/never-existed at QBO — fall through and resolve by name.
    }
  }

  // 2. Reuse an existing customer with the same display name.
  const byName = await findActiveCustomerByName(db, businessId, input.name);
  if (byName?.Id) {
    return { id: byName.Id };
  }

  // 3. Create.
  try {
    return { id: await createCustomer(db, businessId, input, input.name) };
  } catch (err) {
    if (!(err instanceof QboApiError) || err.code !== QBO_DUPLICATE_NAME_CODE) {
      throw err;
    }
  }

  const disambiguated = `${input.name} (${input.email})`;
  const byDisambiguatedName = await findActiveCustomerByName(
    db,
    businessId,
    disambiguated,
  );
  if (byDisambiguatedName?.Id) {
    return { id: byDisambiguatedName.Id };
  }

  return { id: await createCustomer(db, businessId, input, disambiguated) };
}

/** POSTs a new QBO customer under `displayName` and returns its id. */
async function createCustomer(
  db: DbClient,
  businessId: string,
  input: {
    name: string;
    email: string;
    phone?: string | null;
    billAddr?: QboAddress | null;
  },
  displayName: string,
): Promise<string> {
  const body = await qboRequest<QboEntityResponse<QboCustomer>>(
    db,
    businessId,
    {
      method: "POST",
      path: "/customer",
      body: buildCustomerPayload({
        name: displayName,
        email: input.email,
        phone: input.phone,
        billAddr: input.billAddr,
      }),
    },
  );

  const created = pickEntity<QboCustomer>(body, "Customer");
  if (!created?.Id) {
    // A 2xx whose body doesn't carry the entity is a transport/shape problem,
    // not something the owner can fix — `ownerFixable: false` keeps it an
    // opaque 500 we get paged for rather than a friendly BAD_REQUEST.
    throw new QboApiError("QuickBooks did not return the created customer", {
      status: 502,
      ownerFixable: false,
    });
  }
  return created.Id;
}
