import "server-only";

import type {
  InvoiceKind,
  QboAccount,
  QboEntityResponse,
  QboItem,
} from "~/lib/quickbooks/types";
import type { DbClient } from "~/server/db";
import { qboQuery, qboRequest } from "~/lib/quickbooks/client";
import { QboApiError, QboNotConnectedError } from "~/lib/quickbooks/errors";
import {
  buildServiceItemPayload,
  escapeQboQueryValue,
  pickEntity,
} from "~/lib/quickbooks/mapping";

/**
 * Resolving the two QBO references every invoice line needs: an income
 * `Account` to post to, and a `Service` `Item` to bill under.
 *
 * Both are resolved once and then CACHED on `QuickBooksConnection`
 * (`incomeAccountId`, `depositItemId`, `serviceItemId`) — they're stable for
 * the life of a realm, and re-querying them on every invoice would triple the
 * API calls per issue. The cache is per-realm by construction: reconnecting to
 * a different QBO company must clear it (ids from one company are meaningless
 * in another), and `resetItemCache` is the one function that does so.
 */

/**
 * Which existing income account to adopt when the owner has more than one.
 * "Services"/"Sales of Product Income" are QBO's own default income accounts,
 * so a name match is far more likely to be the account the owner actually
 * expects invoices to land in than whatever QBO happens to return first.
 */
const PREFERRED_INCOME_ACCOUNT_NAME = /service|sales/i;

/**
 * Resolves (and caches) the income account new service items post to.
 *
 * `conn` is passed in rather than re-read so the common path — the caller
 * already loaded the connection — costs no extra query. When nothing is
 * cached, active income accounts are queried and one is adopted; a business
 * with NO income account is an owner-fixable configuration problem (QBO can't
 * create one implicitly), so it surfaces as a friendly BAD_REQUEST rather than
 * an opaque 500.
 */
export async function ensureIncomeAccountId(
  db: DbClient,
  businessId: string,
  conn: { incomeAccountId: string | null },
): Promise<string> {
  if (conn.incomeAccountId) return conn.incomeAccountId;

  const accounts = await qboQuery<QboAccount>(
    db,
    businessId,
    "Account",
    "SELECT * FROM Account WHERE AccountType = 'Income' AND Active = true",
  );

  const chosen =
    accounts.find((account) =>
      PREFERRED_INCOME_ACCOUNT_NAME.test(account.Name),
    ) ?? accounts[0];

  if (!chosen?.Id) {
    throw new QboApiError(
      "No active Income account found in QuickBooks — create one in QuickBooks first",
      { status: 400, ownerFixable: true },
    );
  }

  await db.quickBooksConnection.update({
    where: { businessId },
    data: { incomeAccountId: chosen.Id },
  });

  return chosen.Id;
}

/**
 * Resolves (and caches) the QBO `Service` item invoice lines of this `kind`
 * are billed under. `deposit` invoices use their own item/name pair
 * (`depositItemId`/`depositItemName`) so deposits stay separable in QBO's
 * reporting; `final` and `custom` share the services item.
 *
 * When nothing is cached, an existing item with the configured name is reused
 * before one is created — which is what makes this safe to call on a retry,
 * and what stops a cache reset (see `resetItemCache`) from littering the
 * owner's item list with duplicates. A name collision QBO reports but the
 * query can't see (an INACTIVE item holds its name) surfaces as an
 * owner-fixable `6240` — the owner renames or reactivates the item in QBO;
 * silently inventing a second name here would be worse, since the item name
 * shows up on the invoice their customer receives.
 */
export async function ensureServiceItemId(
  db: DbClient,
  businessId: string,
  kind: InvoiceKind,
): Promise<string> {
  const conn = await db.quickBooksConnection.findUnique({
    where: { businessId },
  });
  if (!conn) throw new QboNotConnectedError();

  const isDeposit = kind === "deposit";
  const cachedId = isDeposit ? conn.depositItemId : conn.serviceItemId;
  if (cachedId) return cachedId;

  const name = isDeposit ? conn.depositItemName : conn.serviceItemName;

  const rows = await qboQuery<QboItem>(
    db,
    businessId,
    "Item",
    `SELECT * FROM Item WHERE Name = '${escapeQboQueryValue(name)}' AND Type = 'Service'`,
  );
  const existing = rows.find((row) => row.Active !== false);

  let itemId = existing?.Id;
  if (!itemId) {
    const incomeAccountId = await ensureIncomeAccountId(db, businessId, conn);
    const body = await qboRequest<QboEntityResponse<QboItem>>(db, businessId, {
      method: "POST",
      path: "/item",
      body: buildServiceItemPayload(name, incomeAccountId),
    });

    const created = pickEntity<QboItem>(body, "Item");
    if (!created?.Id) {
      throw new QboApiError(
        "QuickBooks did not return the created service item",
        { status: 502, ownerFixable: false },
      );
    }
    itemId = created.Id;
  }

  await db.quickBooksConnection.update({
    where: { businessId },
    data: isDeposit ? { depositItemId: itemId } : { serviceItemId: itemId },
  });

  return itemId;
}

/**
 * Clears every cached QBO reference id for a business.
 *
 * Two callers: a reconnect that lands on a different realm (ids from another
 * company are meaningless), and `issueInvoice`'s stale-reference recovery —
 * an invoice create rejected with an `ItemRef`/`AccountRef` fault means a
 * cached id no longer resolves at QBO (the owner deleted or deactivated it),
 * and re-resolving from scratch is the fix.
 *
 * `updateMany` rather than `update` so a business with no connection row is a
 * silent no-op instead of a `P2025` throw — this runs on failure paths, where
 * throwing a second, less informative error would mask the first.
 */
export async function resetItemCache(
  db: DbClient,
  businessId: string,
): Promise<void> {
  await db.quickBooksConnection.updateMany({
    where: { businessId },
    data: {
      incomeAccountId: null,
      depositItemId: null,
      serviceItemId: null,
    },
  });
}
