/**
 * QuickBooks Online invoice-status sync engine.
 *
 * Driven by the platform cron sweep (`syncQuickBooksInvoices`, registered in
 * `src/app/api/cron/route.ts`) and, for a single business, by the admin
 * "Refresh from QuickBooks" action via `{ businessId, ignoreInterval: true }`.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * WHAT THIS SYNCS, AND WHAT IT DOESN'T
 * ────────────────────────────────────────────────────────────────────────────
 * `QuickBooksInvoice` is a local mirror of an invoice that lives in the
 * owner's QuickBooks company. QuickBooks is the system of record for payment:
 * a customer can pay, a bookkeeper can void, a due date can slip past — all
 * outside SimplePress, with no callback to tell us. This module is the only
 * thing that notices. It polls the QBO-owned columns
 * (`status`, `balanceCents`, `dueDate`, `paidAt`, `qboSyncToken`,
 * `qboDocNumber`) and rewrites them from Intuit's answer.
 *
 * It never writes the owner-authored side of the row (`amountCents`, `memo`,
 * `description`, the encrypted customer snapshot) and never creates or deletes
 * a row — issuing an invoice is an explicit owner action elsewhere, and an
 * invoice is a money record that must outlive everything it references.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * STEADY-STATE COST
 * ────────────────────────────────────────────────────────────────────────────
 * The cron endpoint ticks every ~15 minutes and every tenant on the platform
 * shares it, but almost none of them have QuickBooks connected. So the very
 * first thing this does is one tiny SELECT over `QuickBooksConnection` —
 * a table with one row per CONNECTED business, i.e. empty or near-empty on a
 * platform where nobody uses the integration. No active connection means there
 * is nothing any invoice row could be polled against, so the run returns
 * immediately, before the invoice table is touched, a business row is loaded,
 * or a socket is opened. That is the path virtually every tick takes.
 *
 * Reading connections FIRST also pays for itself when there ARE connections:
 * their `(businessId, realmId)` pairs go into the invoice query's `where`, so
 * rows belonging to a previous QuickBooks company are excluded in SQL rather
 * than fetched and then filtered out in memory — see REALM MISMATCH below.
 *
 * When rows do come back, `QBO_MIN_INVOICE_SYNC_INTERVAL_MS` (30 min) is what
 * keeps a busy store from re-polling the same open invoice on every 15-minute
 * tick, and `QBO_SYNC_BATCH` caps how much one sweep will chew through so a
 * backlog is drained across ticks rather than in one long-running request.
 * `ignoreInterval` deliberately bypasses only the throttle — never the flag
 * or connection checks — because a human clicking "Refresh" is asking for a
 * poll *now*, and the batch cap still applies.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ISOLATION
 * ────────────────────────────────────────────────────────────────────────────
 * Each business is synced inside its own try/catch: a revoked token, an Intuit
 * outage, or a malformed response for one tenant must never stop the other
 * tenants in the same batch from syncing. A failure records `lastSyncError` on
 * that business's connection (the owner-facing surface) and reports to Sentry
 * (the operator-facing one) — except `QboNeedsReconnectError`, which the token
 * layer has already captured; capturing it again here would double-count a
 * condition that fires on every subsequent tick until the owner reconnects.
 *
 * A failed business's invoice rows are deliberately NOT stamped with
 * `lastSyncedAt`, so they stay eligible and retry on the very next tick
 * instead of being benched for 30 minutes by a failure they didn't cause.
 * Same reasoning for a business whose `quickbooks` flag is off or whose
 * connection isn't `active`: it is skipped without a write and without a
 * network call, so re-enabling the feature takes effect on the next tick.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * REALM MISMATCH
 * ────────────────────────────────────────────────────────────────────────────
 * `realmId` is snapshotted on every invoice row precisely because an owner can
 * reconnect to a *different* QuickBooks company. A QBO invoice id is only
 * meaningful inside the realm that issued it, so querying company B for an id
 * from company A returns nothing — which, without this check, would look
 * exactly like "the invoice was deleted" and silently mark a real, possibly
 * paid, invoice as voided.
 *
 * Those rows never enter this sweep: the invoice query matches on
 * `(businessId, realmId)` pairs taken from the live connections, so a row from
 * a previous company is not selected at all. It is labelled for the owner once,
 * at the moment the company actually changes, by the OAuth callback. The
 * in-function realm check below is kept as a defensive no-op — a second reader
 * of a rule this destructive to get wrong is worth its four lines.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ENVIRONMENT MISMATCH
 * ────────────────────────────────────────────────────────────────────────────
 * Sandbox and production realms are disjoint. A connection made against one
 * environment while the deployment is configured for the other can only produce
 * failures (or, far worse, resolve an id inside the wrong company), so such a
 * business is skipped with an owner-facing `lastSyncError` and no network call
 * at all. It is not a Sentry event: the fix is a reconnect by the owner, and
 * the condition would re-fire on every tick until they do it.
 */
import * as Sentry from "@sentry/nextjs";

import type { InvoiceStatus, QboInvoice } from "~/lib/quickbooks/types";
import type { DbClient } from "~/server/db";
import { env } from "~/env";
import { resolveFlags } from "~/lib/features/resolve-flags";
import { coerceQboEnvironment } from "~/lib/quickbooks/config";
import {
  QBO_MIN_INVOICE_SYNC_INTERVAL_MS,
  QBO_SYNC_BATCH,
  qboEnvironmentMismatchMessage,
} from "~/lib/quickbooks/constants";
import { QboNeedsReconnectError } from "~/lib/quickbooks/errors";
import { queryQboInvoices } from "~/lib/quickbooks/invoices";
import {
  deriveInvoiceStatus,
  qboAmountToCents,
  truncateError,
} from "~/lib/quickbooks/mapping";
import { QBO_OPEN_INVOICE_STATUSES } from "~/lib/validators/quickbooks";

/** Stamped on a row QuickBooks no longer returns (deleted at Intuit's side). */
const NOT_FOUND_ERROR = "Not found in QuickBooks";

/** The subset of `QuickBooksInvoice` the sync actually needs. */
const INVOICE_SELECT = {
  id: true,
  businessId: true,
  realmId: true,
  qboInvoiceId: true,
  status: true,
  amountCents: true,
  paidAt: true,
} as const;

type OpenInvoiceRow = {
  id: string;
  businessId: string;
  realmId: string;
  qboInvoiceId: string | null;
  status: string;
  amountCents: number;
  paidAt: Date | null;
};

/** The connection columns the sweep reads — never a token. */
const CONNECTION_SELECT = {
  businessId: true,
  realmId: true,
  environment: true,
} as const;

type SyncableConnection = {
  businessId: string;
  realmId: string;
  environment: string;
};

export type SyncQuickBooksOptions = {
  /** Max invoice rows one run will process. Defaults to `QBO_SYNC_BATCH`. */
  take?: number;
  /** Injectable clock — every timestamp written by one run is this exact instant. */
  now?: Date;
  /** Restrict the sweep to a single business (the admin "Refresh" action). */
  businessId?: string;
  /** Bypass the `QBO_MIN_INVOICE_SYNC_INTERVAL_MS` throttle (not the flag/connection checks). */
  ignoreInterval?: boolean;
};

function errorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  return truncateError(raw.trim() || "Unknown QuickBooks sync error");
}

/**
 * Group the selected rows by business, preserving the order the query returned
 * them in (stalest first) so a capped batch drains oldest-first across ticks.
 */
function groupByBusiness(
  rows: readonly OpenInvoiceRow[],
): Map<string, OpenInvoiceRow[]> {
  const grouped = new Map<string, OpenInvoiceRow[]>();
  for (const row of rows) {
    const existing = grouped.get(row.businessId);
    if (existing) existing.push(row);
    else grouped.set(row.businessId, [row]);
  }
  return grouped;
}

/**
 * Poll QuickBooks for one business's open invoices and rewrite the QBO-owned
 * columns. Returns the number of invoice rows updated.
 *
 * Throws on any QBO/DB failure so the caller can isolate it per-business; the
 * updates already applied before the throw are real, so the caller counts them
 * by way of the running total it passes in — see the loop in
 * `syncQuickBooksInvoices`.
 */
async function syncBusinessInvoices(
  db: DbClient,
  args: {
    businessId: string;
    connection: SyncableConnection;
    /** The business's IANA zone — `deriveInvoiceStatus` reads "today" in it. */
    timeZone: string;
    rows: readonly OpenInvoiceRow[];
    now: Date;
    onUpdate: () => void;
  },
): Promise<void> {
  const { businessId, connection, timeZone, rows, now, onUpdate } = args;

  // Defensive no-op: the caller's query already matched on
  // `(businessId, realmId)`, so nothing here should belong to a previous
  // company. Kept because the cost of this rule failing silently — querying the
  // new company for the old company's id and reading the empty answer as "the
  // owner deleted it" — is a real, possibly paid, invoice marked `voided`.
  // Rows from a previous realm are labelled by the OAuth callback, not here.

  // `qboInvoiceId` is non-null by the query's `where`, but Prisma still types
  // it nullable; narrowing here (rather than asserting) keeps the id a plain
  // `string` for the rest of the function.
  const syncable = rows.flatMap((row) =>
    row.realmId === connection.realmId && row.qboInvoiceId !== null
      ? [{ row, qboId: row.qboInvoiceId }]
      : [],
  );
  if (syncable.length === 0) return;

  const qboRows = await queryQboInvoices(
    db,
    businessId,
    syncable.map((entry) => entry.qboId),
  );
  const byQboId = new Map<string, QboInvoice>(
    qboRows.map((invoice) => [invoice.Id, invoice]),
  );

  for (const { row, qboId } of syncable) {
    const qbo = byQboId.get(qboId);

    // Absent from a query we know covered this realm: the invoice was deleted
    // in QuickBooks. `voided` is the closest local terminal state, and it stops
    // the row being polled forever against an id that no longer resolves.
    if (!qbo) {
      await db.quickBooksInvoice.update({
        where: { id: row.id },
        data: {
          status: "voided",
          lastSyncedAt: now,
          lastError: NOT_FOUND_ERROR,
        },
      });
      onUpdate();
      continue;
    }

    const next = deriveInvoiceStatus(qbo, {
      now,
      previous: row.status as InvoiceStatus,
      expectedTotalCents: row.amountCents,
      // "Overdue" is a calendar judgement, and the calendar that matters is the
      // owner's. A UTC "today" marks a Detroit invoice late for the last 4–5
      // hours of every day it isn't.
      timeZone,
    });

    await db.quickBooksInvoice.update({
      where: { id: row.id },
      data: {
        status: next,
        // `?? undefined`, like the sibling fields below: QBO omitting `Balance`
        // means "no news". Writing `null` would blank a balance we already knew
        // and make the admin list show nothing owed on an unpaid invoice.
        balanceCents: qboAmountToCents(qbo.Balance) ?? undefined,
        qboSyncToken: qbo.SyncToken,
        // `undefined` (not `null`) throughout: QBO omitting a field means "no
        // news", not "cleared". Writing null would erase a doc number or due
        // date we already had.
        qboDocNumber: qbo.DocNumber ?? undefined,
        dueDate: qbo.DueDate ? new Date(`${qbo.DueDate}T00:00:00Z`) : undefined,
        // First transition into `paid` stamps the moment we observed it; a
        // later poll must not keep moving that timestamp forward.
        paidAt: next === "paid" && row.paidAt == null ? now : undefined,
        lastSyncedAt: now,
        lastError: null,
      },
    });
    onUpdate();
  }
}

/**
 * Sweep open QuickBooks invoices and refresh their status from Intuit.
 *
 * Returns the number of invoice rows whose status was synced against QBO.
 *
 * See the module docblock for the steady-state cost, the throttle, per-business
 * isolation, and the realm/environment mismatch rules.
 */
export async function syncQuickBooksInvoices(
  db: DbClient,
  opts: SyncQuickBooksOptions = {},
): Promise<number> {
  const now = opts.now ?? new Date();
  const take = opts.take ?? QBO_SYNC_BATCH;
  const cutoff = new Date(now.getTime() - QBO_MIN_INVOICE_SYNC_INTERVAL_MS);
  const platformEnvironment = coerceQboEnvironment(env.QBO_ENVIRONMENT);

  // One small SELECT over a table with a row per CONNECTED business — see the
  // module docblock. `needs_reconnect`/`disconnected` are excluded here rather
  // than skipped later: there is no usable token, so their rows must not be
  // fetched, stamped, or polled at all.
  const connections: SyncableConnection[] =
    await db.quickBooksConnection.findMany({
      where: {
        status: "active",
        ...(opts.businessId ? { businessId: opts.businessId } : {}),
      },
      select: CONNECTION_SELECT,
    });
  // The steady state on a platform where nobody uses QuickBooks: one query,
  // zero rows, done — the invoice table is never touched.
  if (connections.length === 0) return 0;

  const connectionByBusiness = new Map(
    connections.map((connection) => [connection.businessId, connection]),
  );

  const rows: OpenInvoiceRow[] = await db.quickBooksInvoice.findMany({
    where: {
      // `pending`/`error` have nothing in QBO to poll yet; `paid`/`voided` are
      // terminal. See QBO_OPEN_INVOICE_STATUSES.
      status: { in: [...QBO_OPEN_INVOICE_STATUSES] },
      qboInvoiceId: { not: null },
      ...(opts.businessId ? { businessId: opts.businessId } : {}),
      // Both halves of the pair matter: `businessId` scopes the sweep to
      // businesses that still have a live connection, and `realmId` drops rows
      // issued against a company the owner has since disconnected from. The
      // pair is what makes a realm mismatch unrepresentable in the result set
      // rather than something the loop has to remember to filter.
      OR: connections.map((connection) => ({
        businessId: connection.businessId,
        realmId: connection.realmId,
      })),
      // Nested under `AND` because `OR` above is already spoken for and Prisma
      // takes one `OR` key per level. The clause is unchanged: never synced, or
      // not synced since the throttle cutoff.
      ...(opts.ignoreInterval
        ? {}
        : {
            AND: [
              {
                OR: [{ lastSyncedAt: null }, { lastSyncedAt: { lt: cutoff } }],
              },
            ],
          }),
    },
    // Stalest first; never-synced rows sort ahead of everything.
    orderBy: [{ lastSyncedAt: { sort: "asc", nulls: "first" } }],
    take,
    select: INVOICE_SELECT,
  });
  // Nobody has an invoice due for a poll. Bail before loading businesses or
  // touching the network.
  if (rows.length === 0) return 0;

  const byBusiness = groupByBusiness(rows);

  // Cron requests arrive on the platform host, so the host-based `featureGate`
  // tRPC middleware can't resolve a business here — resolve each business's
  // flags directly instead, same as the `videoSync` and `backInStock` jobs.
  // `timeZone` rides along for `deriveInvoiceStatus`'s overdue judgement.
  const businesses = await db.business.findMany({
    where: { id: { in: [...byBusiness.keys()] } },
    select: { id: true, featureFlags: true, timeZone: true },
  });
  const businessById = new Map(businesses.map((b) => [b.id, b]));

  let updated = 0;

  for (const [businessId, invoiceRows] of byBusiness) {
    const business = businessById.get(businessId);
    if (!business) continue;

    // Skip WITHOUT stamping: a disabled feature must burn neither a write nor a
    // network call, and the rows must resume on the next tick if it's re-enabled
    // rather than sitting out a 30-minute interval they never used.
    if (!resolveFlags(business.featureFlags).isEnabled("quickbooks")) continue;

    const connection = connectionByBusiness.get(businessId);
    if (!connection) continue;

    // Sandbox connection on a production deployment (or the reverse). Every
    // call would fail against a realm that doesn't exist there, so the owner is
    // told once per tick on their own connection row and no request is made.
    const connectionEnvironment = coerceQboEnvironment(connection.environment);
    if (connectionEnvironment !== platformEnvironment) {
      try {
        await db.quickBooksConnection.update({
          where: { businessId },
          // No `lastSyncAt` and no invoice-row stamp: nothing was synced, and
          // the rows must retry immediately once the owner reconnects.
          data: {
            lastSyncError: qboEnvironmentMismatchMessage(
              connectionEnvironment,
              platformEnvironment,
            ),
          },
        });
      } catch {
        // Best-effort bookkeeping, exactly like the failure path below.
      }
      continue;
    }

    try {
      await syncBusinessInvoices(db, {
        businessId,
        connection,
        timeZone: business.timeZone,
        rows: invoiceRows,
        now,
        onUpdate: () => {
          updated++;
        },
      });

      await db.quickBooksConnection.update({
        where: { businessId },
        data: { lastSyncAt: now, lastSyncError: null },
      });
    } catch (err) {
      // `QboNeedsReconnectError` is already captured where the refresh grant
      // was rejected (tokens.ts) — capturing it again here would re-fire on
      // every tick until the owner reconnects. Every other failure (Intuit
      // outage, unexpected shape, DB error) is ours to know about.
      if (!(err instanceof QboNeedsReconnectError)) {
        Sentry.captureException(err, {
          tags: {
            service: "quickbooks",
            "quickbooks.step": "sync",
            businessId,
          },
        });
      }

      try {
        await db.quickBooksConnection.update({
          where: { businessId },
          // NOTE: no `lastSyncAt` — that field means "last SUCCESSFUL sync",
          // and the invoice rows are left unstamped too so they retry on the
          // next tick.
          data: { lastSyncError: errorMessage(err) },
        });
      } catch {
        // Best-effort bookkeeping: if the DB is what failed, this write fails
        // too, and the original error has already been reported above.
      }
    }
  }

  return updated;
}
