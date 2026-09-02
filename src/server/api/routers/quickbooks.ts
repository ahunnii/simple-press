import type { Prisma } from "generated/prisma";
import * as Sentry from "@sentry/nextjs";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { QboEnvironment } from "~/lib/quickbooks/constants";
import type { InvoiceStatus } from "~/lib/quickbooks/types";
import { env } from "~/env";
import {
  coerceQboEnvironment,
  isQuickBooksConfigured,
} from "~/lib/quickbooks/config";
import { qboEnvironmentMismatchMessage } from "~/lib/quickbooks/constants";
import { QboApiError, toTrpcError } from "~/lib/quickbooks/errors";
import { fetchQboInvoice, sendQboInvoice } from "~/lib/quickbooks/invoices";
import { issueInvoice } from "~/lib/quickbooks/issue";
import {
  deriveInvoiceStatus,
  QBO_DEAD_INVOICE_STATUSES,
  qboAmountToCents,
} from "~/lib/quickbooks/mapping";
import { syncQuickBooksInvoices } from "~/lib/quickbooks/sync";
import {
  QBO_INVOICE_STATUS_VALUES,
  QBO_OPEN_INVOICE_STATUSES,
  quickBooksCreateInvoiceSchema,
  quickBooksInvoiceIdSchema,
  quickBooksSettingsSchema,
} from "~/lib/validators/quickbooks";
import {
  createTRPCRouter,
  featureGate,
  ownerAdminProcedure,
} from "~/server/api/trpc";
import { type DbClient } from "~/server/db";

/**
 * QuickBooks Online invoicing.
 *
 * `quickbooks` is `ownerCanToggle: true` in `src/lib/features/registry.ts`,
 * same as `quoteCalculator` next door — so this router follows the identical
 * split already documented above `quoteSubmission.list`: an owner can switch
 * the feature off themselves at any moment, and gating a READ would strand
 * real business records (invoices already raised, amounts, customer contact
 * info) behind a toggle they flipped, with no way to even look at them. That
 * would make disabling a feature a destructive act, so it must never happen.
 *
 * Split into two procedure tiers below:
 *
 * - `qboRead` (NO feature gate) — `getConnection`, `listInvoices`,
 *   `getInvoice`, `getLeadInvoices`. These only read rows already in
 *   SimplePress's own database; none of them calls Intuit. They stay
 *   reachable no matter what the flag says, exactly like `quoteSubmission`'s
 *   admin-inbox reads.
 * - `qboGated` (`featureGate("quickbooks")`) — `updateSettings`,
 *   `createInvoice`, `sendInvoice`, `retryInvoice`, `refreshInvoice`,
 *   `syncNow`. Every one of these either writes a row or talks to Intuit
 *   (often both). A disabled flag must stop new invoice activity from
 *   reaching a real company's books — that's the half of the quote-inbox
 *   precedent that still applies unchanged: reads survive, writes don't.
 *
 * The data is safe across a toggle either way: nothing here deletes a
 * `QuickBooksInvoice` or `QuickBooksConnection` row (the connection model is
 * updated in place on reconnect and never dropped, tokens merely nulled), so
 * re-enabling the flag restores the full history, settings and QBO reference
 * cache exactly as they were. Disabling hides the ability to send or sync;
 * it never destroys anything, and — per the split above — never hides the
 * records themselves either.
 */
const qboRead = ownerAdminProcedure;
const qboGated = ownerAdminProcedure.use(featureGate("quickbooks"));

/**
 * Everything the admin UI is allowed to see about a connection.
 *
 * An ALLOWLIST, not an omit-list: `accessToken` and `refreshToken` are
 * `/// @encrypted` OAuth credentials that decrypt transparently on read, so a
 * bare `findUnique()` would hand live Intuit bearer tokens to the browser.
 * Never add them here, and never replace this with `omit`. `refreshTokenExpiresAt`
 * is the only token-adjacent field included — a date, not a secret, and the one
 * thing that lets the UI warn before Intuit's ~100-day refresh window closes.
 *
 * `incomeAccountId` / `depositItemId` / `serviceItemId` are excluded too: they
 * are an internal per-realm reference cache the owner cannot act on. The *Name
 * fields, which the owner does configure, are included.
 */
const CONNECTION_PUBLIC_SELECT = {
  status: true,
  realmId: true,
  environment: true,
  companyName: true,
  connectedAt: true,
  refreshTokenExpiresAt: true,
  lastSyncAt: true,
  lastSyncError: true,
  depositMode: true,
  depositPercent: true,
  depositFixedCents: true,
  defaultDueDays: true,
  depositItemName: true,
  serviceItemName: true,
} satisfies Prisma.QuickBooksConnectionSelect;

/**
 * The full invoice row contract for every read below.
 *
 * Unlike the connection select above there is nothing to withhold: an invoice
 * carries no credentials, and the customer snapshot fields (`customerName` /
 * `customerEmail` / `customerPhone`, encrypted at rest like `QuoteSubmission`'s
 * contact fields) are the owner's own billing records — they are shown in the
 * admin UI on purpose. `qboSyncToken` is an Intuit optimistic-concurrency
 * token, not a secret.
 *
 * `quoteSubmission` is joined for the list's "Lead" column and is nullable by
 * design: the relation is `onDelete: SetNull`, because an invoice is a money
 * record that must outlive the lead it was raised against.
 */
const INVOICE_SELECT = {
  id: true,
  createdAt: true,
  updatedAt: true,
  businessId: true,
  quoteSubmissionId: true,
  kind: true,
  amountCents: true,
  memo: true,
  description: true,
  customerName: true,
  customerEmail: true,
  customerPhone: true,
  status: true,
  balanceCents: true,
  dueDate: true,
  sentAt: true,
  paidAt: true,
  realmId: true,
  qboCustomerId: true,
  qboInvoiceId: true,
  qboDocNumber: true,
  qboSyncToken: true,
  lastSyncedAt: true,
  lastError: true,
  quoteSubmission: { select: { id: true, contactName: true } },
} satisfies Prisma.QuickBooksInvoiceSelect;

/**
 * The trimmed select behind `listInvoices` alone — the "explicit select of
 * exactly what the list renders" convention every migrated admin list follows
 * (`review.listAll`, `events.getAll`, `content.getPages`, `videos.getAll`).
 *
 * `listInvoices` ships up to `QBO_INVOICE_LIST_MAX_ROWS` rows into the RSC
 * payload on every load of `/admin/invoices`, so a column carried here costs
 * 1000× what it costs on the single-row reads. Dropped versus `INVOICE_SELECT`:
 *
 * - `memo` and `description` — free text up to `QBO_MAX_MEMO_LENGTH` (1000) and
 *   `QBO_MAX_DESCRIPTION_LENGTH` (200) chars that no column in the table
 *   renders. Between them they can be most of the payload's weight.
 * - `customerPhone` — an encrypted-at-rest PII column the list never shows.
 *   Not shipping it to the browser at all is strictly better than shipping it
 *   unused.
 * - `updatedAt`, `businessId`, `quoteSubmissionId`, `realmId`,
 *   `qboCustomerId`, `qboSyncToken`, `lastSyncedAt`, `sentAt`, `paidAt` —
 *   plumbing and timestamps the list neither displays, filters, nor sorts on.
 *
 * Everything remaining is either rendered in a cell, matched by the search
 * predicate (`qboDocNumber`), sorted on (`amountCents`, `dueDate`,
 * `createdAt`, `customerName`), filtered on (`status`, `kind`), or drives a
 * per-row action's availability (`qboInvoiceId`). Adding a field here without
 * a consumer is how the payload grows back.
 */
const INVOICE_LIST_SELECT = {
  id: true,
  createdAt: true,
  kind: true,
  amountCents: true,
  balanceCents: true,
  status: true,
  dueDate: true,
  customerName: true,
  customerEmail: true,
  qboInvoiceId: true,
  qboDocNumber: true,
  lastError: true,
  quoteSubmission: { select: { id: true, contactName: true } },
} satisfies Prisma.QuickBooksInvoiceSelect;

/**
 * Hard ceiling on the rows `listInvoices` ships to `/admin/invoices`, mirroring
 * `QUOTE_INBOX_MAX_ROWS`. The page filters/sorts/paginates in memory, so this
 * only bounds the serialized payload; the true lifetime count travels alongside
 * as `totalCount` so the table can say "showing N of M". Newest first, so the
 * cap trims the stalest invoices rather than the ones being worked today.
 */
export const QBO_INVOICE_LIST_MAX_ROWS = 1000;

/**
 * The one unavoidable cast on the way out of the database. `status` is a plain
 * `String` column (Prisma has no enum for it) but every write path validates
 * against `QBO_INVOICE_STATUS_VALUES`, so the narrow is sound; an unrecognized
 * value can only come from hand-edited data, and `"created"` is the safest
 * landing spot for one — it keeps the row pollable rather than declaring it
 * paid or dead. Same idiom as `toQuoteStatus` in `src/app/admin/quotes/[id]/page.tsx`.
 */
function toInvoiceStatus(status: string): InvoiceStatus {
  const values: readonly string[] = QBO_INVOICE_STATUS_VALUES;
  return values.includes(status) ? (status as InvoiceStatus) : "created";
}

/**
 * Cents → `$1,234.56`, for the one place a rejection message has to quote
 * money back to the owner (the deposit ceiling in `createInvoice`).
 *
 * Deliberately not `Intl.NumberFormat` with a locale drawn from the request:
 * these strings land in a `TRPCError.message` that the admin UI renders
 * verbatim, and every amount in this integration is USD cents by definition
 * (`amountCents`, `finalQuoteCents`, `qboAmountToCents`), so a locale-swapped
 * separator would only make two numbers on the same screen disagree.
 */
function usd(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * The connection precondition shared by `createInvoice` and `retryInvoice`.
 *
 * Both messages are `PRECONDITION_FAILED`, not `BAD_REQUEST`: the request was
 * well-formed, the integration simply isn't in a state to serve it — the same
 * code `toTrpcError` gives `QboNotConnectedError` / `QboNeedsReconnectError`,
 * so the client has one code to branch on wherever the check happens to fire.
 * Checking here rather than letting the QBO client throw saves a pointless
 * round trip and, more importantly, avoids creating a `pending` invoice row we
 * already know cannot be issued.
 *
 * `status !== "active"` is the catch-all arm on purpose: `needs_reconnect` and
 * any future/drifted status both land on "reconnect", never on a silent pass.
 *
 * The environment check is the third arm and the least obvious one. Intuit's
 * sandbox and production realms are disjoint: a connection authorized in one
 * while the deployment is pointed at the other has a `realmId` that names
 * nothing on the API it will be sent to, and every invoice id under it is
 * equally meaningless. Left unchecked that produces a stream of opaque Intuit
 * faults instead of the one sentence that actually fixes it — reconnect. This
 * is the single precondition for EVERY write path that reaches Intuit, which is
 * why `sendInvoice`, `refreshInvoice` and `syncNow` all route through here too
 * rather than only the two procedures that create invoices.
 */
async function requireActiveConnection(
  db: DbClient,
  businessId: string,
): Promise<{ realmId: string; environment: QboEnvironment }> {
  const connection = await db.quickBooksConnection.findUnique({
    where: { businessId },
    select: { status: true, realmId: true, environment: true },
  });

  if (!connection || connection.status === "disconnected") {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Connect QuickBooks in Settings → Integrations first",
    });
  }

  if (connection.status !== "active") {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "QuickBooks needs to be reconnected",
    });
  }

  const environment = coerceQboEnvironment(connection.environment);
  const platformEnvironment = coerceQboEnvironment(env.QBO_ENVIRONMENT);
  if (environment !== platformEnvironment) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: qboEnvironmentMismatchMessage(environment, platformEnvironment),
    });
  }

  return { realmId: connection.realmId, environment };
}

/**
 * The single reporting rule for every outbound-Intuit failure in this router.
 *
 * An owner-fixable `QboApiError` is expected user error — a duplicate document
 * number, a reference to an item they made inactive in QuickBooks, a field
 * Intuit rejected. `toTrpcError` already turns those into a `BAD_REQUEST`
 * carrying Intuit's own message, which the owner can act on; capturing them
 * would bury the real signal under routine validation noise, exactly as
 * documented for checkout's shopper-fault 400s in CLAUDE.md.
 *
 * EVERYTHING else is captured, deliberately including the
 * `PRECONDITION_FAILED` family (`QboNotConnectedError` /
 * `QboNeedsReconnectError` / `QboNotConfiguredError`). Those reach this
 * function only after `requireActiveConnection` said the stored connection was
 * active — so getting one here means the connection died mid-flight (Intuit
 * revoked the grant, the platform credentials went missing), which is an
 * operational event the platform wants to see, not a normal outcome.
 *
 * Returns the `TRPCError` rather than throwing it so call sites read
 * `throw captureQboFailure(...)` and TypeScript still sees the throw.
 */
function captureQboFailure(
  err: unknown,
  step: string,
  businessId: string,
): TRPCError {
  if (!(err instanceof QboApiError && err.ownerFixable)) {
    Sentry.captureException(err, {
      tags: {
        service: "quickbooks",
        "quickbooks.step": step,
        businessId,
      },
    });
  }
  return toTrpcError(err);
}

export const quickbooksRouter = createTRPCRouter({
  // ─── Connection + settings ──────────────────────────────────────────────────

  /**
   * Everything the Integrations page needs to render the QuickBooks card in one
   * round trip.
   *
   * `platformConfigured` is a PLATFORM fact, not a tenant one: the whole
   * integration is optional (`QBO_CLIENT_ID`/`QBO_CLIENT_SECRET` are
   * `.optional()` in `env.js`), so a deployment that never registered an Intuit
   * app must render "unavailable" rather than a Connect button that dead-ends.
   *
   * `timeZone` and `businessName` ride along because the invoice dialog needs
   * both client-side and neither is worth a second query: the due-date picker
   * defaults through `dueDateString(now, defaultDueDays, timeZone)` — calendar
   * arithmetic in the store's own zone, not the browser's — and the line
   * description defaults through `defaultLineDescription(kind, businessName)`.
   */
  getConnection: qboRead.query(async ({ ctx }) => {
    const { businessId } = ctx;

    const [business, connection] = await Promise.all([
      ctx.db.business.findUnique({
        where: { id: businessId },
        select: { name: true, timeZone: true },
      }),
      ctx.db.quickBooksConnection.findUnique({
        where: { businessId },
        select: CONNECTION_PUBLIC_SELECT,
      }),
    ]);

    if (!business) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Business not found" });
    }

    // `env.QBO_ENVIRONMENT` is already a `"sandbox" | "production"` enum in
    // env.js; routed through `coerceQboEnvironment` anyway so this file states
    // the `QboEnvironment` contract itself rather than inheriting it from a
    // .js module's inference. Identical value for both valid inputs.
    const platformEnvironment: QboEnvironment = coerceQboEnvironment(
      env.QBO_ENVIRONMENT,
    );

    // The CONNECTION's own environment, stamped at OAuth time — not the
    // deployment's. Every id on that row (realm, invoices, cached items) is only
    // meaningful inside the environment it was authorized in, so "Open in
    // QuickBooks" links and any other realm-scoped UI must be built from this
    // value. Falling back to the platform's is only for the never-connected
    // case, where there is no realm to point anywhere anyway.
    const environment: QboEnvironment = connection
      ? coerceQboEnvironment(connection.environment)
      : platformEnvironment;

    return {
      platformConfigured: isQuickBooksConfigured(),
      environment,
      // The deployment's configured environment, alongside the connection's, so
      // the UI can show the two disagreeing — the state every write path
      // refuses with a "reconnect" precondition (`requireActiveConnection`).
      platformEnvironment,
      timeZone: business.timeZone,
      businessName: business.name,
      // `null` = never connected. The connection row is created at OAuth
      // callback time and updated in place forever after, so a disconnected
      // business still returns a row (with `status: "disconnected"`) carrying
      // its deposit settings intact.
      connection,
    };
  }),

  /**
   * Deposit rule + default due days. Writes only owner-configurable columns —
   * the schema is a closed `z.object`, so nothing else can ride in.
   *
   * Any status is acceptable, including `disconnected`: settings survive a
   * disconnect/reconnect cycle by design, and an owner tidying their defaults
   * before re-authorizing is a normal thing to do. What is NOT acceptable is
   * no row at all, since there is nothing to update and Prisma's own P2025
   * would surface as an opaque 500.
   */
  updateSettings: qboGated
    .input(quickBooksSettingsSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      const existing = await ctx.db.quickBooksConnection.findUnique({
        where: { businessId },
        select: { id: true },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Connect QuickBooks first",
        });
      }

      return ctx.db.quickBooksConnection.update({
        where: { businessId },
        data: {
          depositMode: input.depositMode,
          depositPercent: input.depositPercent,
          depositFixedCents: input.depositFixedCents,
          defaultDueDays: input.defaultDueDays,
        },
        select: CONNECTION_PUBLIC_SELECT,
      });
    }),

  // ─── Invoice reads ──────────────────────────────────────────────────────────

  /**
   * The invoices raised against one quote lead — the card on the lead detail
   * page, and the input `computeFinalPrefillCents` needs to prefill a final
   * balance.
   *
   * The submission is verified to belong to this tenant FIRST, before any
   * invoice is read. Filtering the invoice query by `businessId` alone would
   * already be tenant-safe, but it would answer a probe for someone else's
   * submission id with an empty array instead of a 404 — a slow existence
   * oracle over lead ids. The explicit lookup makes "not yours" and "not
   * there" indistinguishable.
   */
  getLeadInvoices: qboRead
    .input(z.object({ quoteSubmissionId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const { businessId } = ctx;

      const submission = await ctx.db.quoteSubmission.findFirst({
        where: { id: input.quoteSubmissionId, businessId },
        select: { id: true },
      });

      if (!submission) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Quote not found" });
      }

      return ctx.db.quickBooksInvoice.findMany({
        where: { businessId, quoteSubmissionId: input.quoteSubmissionId },
        orderBy: { createdAt: "desc" },
        select: INVOICE_SELECT,
      });
    }),

  /**
   * Input-free, exactly like `quoteSubmission.list`: `/admin/invoices` owns its
   * own status/kind filters, sort and pagination in memory, so the router ships
   * the tenant-scoped set (capped) plus the true count.
   */
  listInvoices: qboRead.query(async ({ ctx }) => {
    const { businessId } = ctx;

    const [rows, totalCount] = await ctx.db.$transaction([
      ctx.db.quickBooksInvoice.findMany({
        where: { businessId },
        take: QBO_INVOICE_LIST_MAX_ROWS,
        select: INVOICE_LIST_SELECT,
        // Stable transport order only — the page re-sorts per its own sort
        // param. The `id` tiebreak matters: rows created in the same
        // millisecond would otherwise shuffle between renders and make table
        // selections jump.
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      }),
      ctx.db.quickBooksInvoice.count({ where: { businessId } }),
    ]);

    return { rows, totalCount };
  }),

  getInvoice: qboRead
    .input(quickBooksInvoiceIdSchema)
    .query(async ({ ctx, input }) => {
      const { businessId } = ctx;

      // findFirst, not findUnique: `businessId` is the tenant scope and is not
      // part of the primary key, so this is the shape that cannot be widened
      // by accident.
      const invoice = await ctx.db.quickBooksInvoice.findFirst({
        where: { id: input.id, businessId },
        select: INVOICE_SELECT,
      });

      if (!invoice) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invoice not found",
        });
      }

      return invoice;
    }),

  // ─── Invoice writes ─────────────────────────────────────────────────────────

  /**
   * Create the local row, then hand it to `issueInvoice`, which owns every
   * Intuit call (customer upsert, item/account resolution, invoice create, the
   * optional send) and is idempotent — it skips the create when the row already
   * carries a `qboInvoiceId`.
   *
   * The row is written BEFORE anything is sent to Intuit, on purpose. If the
   * QBO call then fails, `issueInvoice` marks the row `error` with
   * `lastError` and rethrows, so the attempt is durable and retryable through
   * `retryInvoice` instead of vanishing. The alternative — call Intuit first,
   * write on success — has the worse failure mode: a create that succeeds at
   * Intuit but fails to persist locally leaves a real invoice on a real
   * customer's account that SimplePress has no record of and cannot sync.
   */
  createInvoice: qboGated
    .input(quickBooksCreateInvoiceSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      const connection = await requireActiveConnection(ctx.db, businessId);

      // Same reasoning as `getLeadInvoices`: prove the lead is ours before
      // stamping its id onto a money record.
      if (input.quoteSubmissionId) {
        // `finalQuoteCents` and `estimateCents` come along for the deposit
        // ceiling below — the same two numbers the lead card's deposit presets
        // are computed from, read here so the server's view of what this job
        // is worth is the one the guard enforces, not the client's.
        const submission = await ctx.db.quoteSubmission.findFirst({
          where: { id: input.quoteSubmissionId, businessId },
          select: { id: true, finalQuoteCents: true, estimateCents: true },
        });

        if (!submission) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Quote not found",
          });
        }

        // One final balance per lead. A deposit can legitimately be re-raised
        // (a first attempt errored, the owner voided one in QuickBooks and
        // wants another), but a second final invoice bills the customer twice
        // for the same job — and the prefill that produced it, `finalQuoteCents
        // − live deposits`, does NOT subtract an earlier final, so a
        // double-click on the lead page produces two full-balance invoices.
        //
        // Excluded statuses are the ones that leave nothing outstanding at
        // Intuit: `error` and `pending` never reached QuickBooks, and `voided`
        // was withdrawn there. Anything else — created, sent, overdue, paid —
        // means a real final invoice is in the customer's hands.
        //
        // NOT race-proof: two truly simultaneous requests can both pass this
        // read, and closing that would take a partial unique index on
        // `(businessId, quoteSubmissionId)` for `kind = 'final'`. The realistic
        // failure this guards is a human clicking twice, which the dialog's own
        // pending state already covers on the way in.
        if (input.kind === "final") {
          const existingFinal = await ctx.db.quickBooksInvoice.findFirst({
            where: {
              businessId,
              quoteSubmissionId: input.quoteSubmissionId,
              kind: "final",
              status: { notIn: ["error", "voided", "pending"] },
            },
            select: { id: true },
          });

          if (existingFinal) {
            throw new TRPCError({
              code: "PRECONDITION_FAILED",
              message: "A final invoice has already been sent for this lead.",
            });
          }
        }

        // Deposits, in total, can never exceed the job they're a deposit
        // against. The lead card now offers 25/50/75/Custom presets and shows
        // the remaining balance, but the amount still arrives here as a bare
        // `amountCents` the client chose, so the ceiling has to be re-derived
        // server-side or a hand-typed Custom figure (or a stale dialog opened
        // before an earlier deposit was raised) walks straight past it.
        //
        // The ceiling is `finalQuoteCents` and ONLY `finalQuoteCents` — the
        // number the owner affirmed as the price of this job. When it is null
        // this guard does nothing, deliberately, even though `estimateCents`
        // is right there on the row: a computed estimate is the calculator's
        // opinion, not a quote anyone has agreed to, and an owner who takes a
        // $500 deposit on a job the calculator guessed at $300 is doing
        // something legitimate that a hard block would simply forbid. The
        // dialog handles that case with an amber note instead. Same reasoning
        // for a lead with no priced estimate at all: nothing to measure
        // against, so nothing to refuse.
        //
        // Live deposits are the ones that reached QuickBooks —
        // `QBO_DEAD_INVOICE_STATUSES` (error/voided/pending) is the SAME set
        // `computeFinalPrefillCents` subtracts, on purpose: the balance the
        // lead card shows as remaining and the balance this guard enforces
        // must be the same arithmetic, or the owner is refused an amount the
        // UI just told them was available.
        //
        // NOT race-proof, for exactly the reason the final guard above isn't:
        // two simultaneous requests can both pass this read before either
        // writes, and closing that would take a DB-level constraint. The
        // realistic failure is a human clicking twice, which the dialog's
        // pending state already covers on the way in.
        const ceilingCents = submission.finalQuoteCents;

        if (input.kind === "deposit" && ceilingCents !== null) {
          const liveDeposits = await ctx.db.quickBooksInvoice.findMany({
            where: {
              businessId,
              quoteSubmissionId: input.quoteSubmissionId,
              kind: "deposit",
              status: { notIn: [...QBO_DEAD_INVOICE_STATUSES] },
            },
            select: { amountCents: true },
          });

          const alreadyInvoicedCents = liveDeposits.reduce(
            (total, deposit) => total + deposit.amountCents,
            0,
          );
          const proposedTotalCents = alreadyInvoicedCents + input.amountCents;

          if (proposedTotalCents > ceilingCents) {
            throw new TRPCError({
              code: "PRECONDITION_FAILED",
              message: `Deposits can't exceed the final quote: ${usd(alreadyInvoicedCents)} is already invoiced, so a ${usd(input.amountCents)} deposit would bill ${usd(proposedTotalCents)} against a ${usd(ceilingCents)} quote.`,
            });
          }
        }
      }

      const row = await ctx.db.quickBooksInvoice.create({
        data: {
          businessId,
          quoteSubmissionId: input.quoteSubmissionId,
          kind: input.kind,
          amountCents: input.amountCents,
          memo: input.memo,
          description: input.description,
          customerName: input.customerName,
          // Lower-cased here and nowhere else: this is the address Intuit
          // emails the invoice to and the key `issueInvoice` matches an
          // existing QBO customer on, so a stray capital would silently create
          // a duplicate customer in the owner's books.
          customerEmail: input.customerEmail.trim().toLowerCase(),
          customerPhone: input.customerPhone,
          // Snapshotted as JSON on the row, not read live from the lead: the
          // address on an invoice is what was billed, and a lead edited (or
          // deleted — the relation is SetNull) afterwards must not rewrite
          // history. `issueInvoice` reads it back through
          // `parseBillingAddressJson`, which tolerates the `null` every row
          // predating this field carries.
          billingAddress: input.billingAddress
            ? JSON.stringify(input.billingAddress)
            : null,
          status: "pending",
          // The wire format is a bare `YYYY-MM-DD` calendar date, already
          // computed in the STORE's timezone by `dueDateString`. Pinned to
          // midnight UTC so it round-trips as the same calendar day no matter
          // where it is read — parsing it without the `Z` would apply the
          // server's local offset and can land the due date a day early.
          dueDate: new Date(`${input.dueDate}T00:00:00Z`),
          // Snapshotted per row so invoices raised against a previous QBO
          // company stay recognizable after a reconnect to a different realm.
          realmId: connection.realmId,
        },
        select: { id: true },
      });

      try {
        return await issueInvoice(ctx.db, {
          businessId,
          invoiceRowId: row.id,
          send: input.send,
        });
      } catch (err) {
        throw captureQboFailure(err, "invoice-create", businessId);
      }
    }),

  /**
   * Re-send an invoice that already exists in QuickBooks — the owner's "they
   * say they never got it" button.
   *
   * Restricted to the OPEN statuses (`created` / `sent` / `overdue`). Emailing
   * a `paid` or `voided` invoice would be actively confusing to the customer,
   * `pending` and `error` have nothing at Intuit to send yet, and `retryInvoice`
   * is the path for the latter.
   */
  sendInvoice: qboGated
    .input(quickBooksInvoiceIdSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      const row = await ctx.db.quickBooksInvoice.findFirst({
        where: { id: input.id, businessId },
        select: {
          id: true,
          status: true,
          qboInvoiceId: true,
          customerEmail: true,
        },
      });

      if (!row) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invoice not found",
        });
      }

      if (!row.qboInvoiceId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "This invoice hasn't been created in QuickBooks yet, so there's nothing to send.",
        });
      }

      const sendableStatuses: readonly string[] = QBO_OPEN_INVOICE_STATUSES;
      if (!sendableStatuses.includes(row.status)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `A ${row.status} invoice can't be emailed. Only open invoices (created, sent, or overdue) can be re-sent.`,
        });
      }

      await requireActiveConnection(ctx.db, businessId);

      try {
        const qbo = await sendQboInvoice(
          ctx.db,
          businessId,
          row.qboInvoiceId,
          row.customerEmail,
        );

        return await ctx.db.quickBooksInvoice.update({
          where: { id: row.id },
          data: {
            // Only `created` advances. A re-send of an `overdue` invoice must
            // not quietly report it as merely `sent` — it is still late, and
            // the next sync would flip it straight back anyway.
            status: row.status === "created" ? "sent" : row.status,
            sentAt: new Date(),
            // Intuit bumps SyncToken on every write; keeping the local copy
            // current is what stops the NEXT update from being rejected as a
            // stale-object conflict.
            qboSyncToken: qbo.SyncToken,
            lastError: null,
          },
          select: INVOICE_SELECT,
        });
      } catch (err) {
        throw captureQboFailure(err, "invoice-send", businessId);
      }
    }),

  /**
   * Re-run a failed issue. Only from `error` — `issueInvoice` is idempotent, so
   * a retry on a row that did reach Intuit would be harmless, but allowing it
   * from any status would turn a mis-click on a `paid` invoice into a confusing
   * no-op with a fresh email attached (`send: true` below).
   */
  retryInvoice: qboGated
    .input(quickBooksInvoiceIdSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      const row = await ctx.db.quickBooksInvoice.findFirst({
        where: { id: input.id, businessId },
        select: { id: true, status: true },
      });

      if (!row) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invoice not found",
        });
      }

      if (row.status !== "error" && row.status !== "pending") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only failed or stuck invoices can be retried",
        });
      }

      await requireActiveConnection(ctx.db, businessId);

      try {
        return await issueInvoice(ctx.db, {
          businessId,
          invoiceRowId: row.id,
          send: true,
        });
      } catch (err) {
        throw captureQboFailure(err, "invoice-retry", businessId);
      }
    }),

  /**
   * Poll ONE invoice against QuickBooks on demand — the owner's "did they pay
   * yet?" button, without waiting for the cron sweep's interval.
   *
   * A `null` from `fetchQboInvoice` means the invoice is gone from Intuit's
   * side. That is recorded as `voided` rather than `error`: QBO deletes are
   * rare and deliberate (the owner removed it in QuickBooks), and `error` would
   * offer them a Retry button that re-creates an invoice they just deleted.
   * `lastError` carries the explanation so the UI can say why.
   */
  refreshInvoice: qboGated
    .input(quickBooksInvoiceIdSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;

      // The business read rides alongside the row for `timeZone` alone —
      // `deriveInvoiceStatus` decides "overdue" against the store's calendar
      // day, not the server's, so a Detroit invoice isn't reported late for the
      // last few hours of every day it isn't.
      const [row, business] = await Promise.all([
        ctx.db.quickBooksInvoice.findFirst({
          where: { id: input.id, businessId },
          select: {
            id: true,
            status: true,
            amountCents: true,
            paidAt: true,
            qboInvoiceId: true,
          },
        }),
        ctx.db.business.findUnique({
          where: { id: businessId },
          select: { timeZone: true },
        }),
      ]);

      if (!row) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invoice not found",
        });
      }

      if (!business) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Business not found",
        });
      }

      if (!row.qboInvoiceId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "This invoice hasn't been created in QuickBooks yet, so there's nothing to refresh.",
        });
      }

      await requireActiveConnection(ctx.db, businessId);

      const now = new Date();

      try {
        const inv = await fetchQboInvoice(ctx.db, businessId, row.qboInvoiceId);

        if (!inv) {
          return await ctx.db.quickBooksInvoice.update({
            where: { id: row.id },
            data: {
              status: "voided",
              lastSyncedAt: now,
              lastError: "Not found in QuickBooks",
            },
            select: INVOICE_SELECT,
          });
        }

        const next = deriveInvoiceStatus(inv, {
          now,
          previous: toInvoiceStatus(row.status),
          expectedTotalCents: row.amountCents,
          timeZone: business.timeZone,
        });

        return await ctx.db.quickBooksInvoice.update({
          where: { id: row.id },
          data: {
            status: next,
            // `?? undefined` for the same reason as the two conditional fields
            // below: an omitted `Balance` is "no news", and writing `null`
            // would blank a balance we already knew.
            balanceCents: qboAmountToCents(inv.Balance) ?? undefined,
            qboSyncToken: inv.SyncToken,
            // Conditional, not `?? null`: Intuit omits fields it has nothing
            // to report on a given read, and blanking a `DocNumber` we already
            // know would lose the owner's only cross-reference into QBO.
            ...(inv.DocNumber === undefined
              ? {}
              : { qboDocNumber: inv.DocNumber }),
            ...(inv.DueDate === undefined
              ? {}
              : { dueDate: new Date(`${inv.DueDate}T00:00:00Z`) }),
            // Stamped ONCE, on the first poll that reports paid. Re-stamping on
            // every subsequent refresh would keep moving the payment date
            // forward and destroy the only record of when money actually
            // arrived.
            ...(next === "paid" && row.paidAt === null ? { paidAt: now } : {}),
            lastSyncedAt: now,
            lastError: null,
          },
          select: INVOICE_SELECT,
        });
      } catch (err) {
        throw captureQboFailure(err, "invoice-refresh", businessId);
      }
    }),

  /**
   * Sweep every open invoice for THIS business now.
   *
   * `ignoreInterval: true` bypasses `QBO_MIN_INVOICE_SYNC_INTERVAL_MS`, which
   * exists to keep the cron from hammering Intuit — it is not a rate limit on
   * the owner, who is standing in front of the page having explicitly asked.
   * `businessId` scoping is what keeps this from becoming a tenant-triggerable
   * platform-wide sweep.
   */
  syncNow: qboGated.mutation(async ({ ctx }) => {
    const { businessId } = ctx;

    // The sweep itself skips a business whose connection isn't usable, which
    // would answer a human's explicit "Refresh" with a silent `updated: 0`.
    // Checking first turns that into the sentence that fixes it.
    await requireActiveConnection(ctx.db, businessId);

    try {
      const updated = await syncQuickBooksInvoices(ctx.db, {
        businessId,
        ignoreInterval: true,
      });
      return { updated };
    } catch (err) {
      throw captureQboFailure(err, "sync-now", businessId);
    }
  }),
});
