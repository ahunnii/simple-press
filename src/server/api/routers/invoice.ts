import type { Prisma } from "generated/prisma";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { InvoiceCapabilities } from "~/lib/invoices/status";
import type { UnifiedInvoiceRow } from "~/lib/invoices/unified-list";
import type { InvoiceDraft, InvoiceStatus } from "~/lib/validators/invoice";
import type { DbClient, TxClient } from "~/server/db";
import { zonedCalendarDate } from "~/lib/calendar-date";
import { checkBusiness } from "~/lib/check-business";
import { resolveFlags } from "~/lib/features/resolve-flags";
import { upsertInvoiceCustomer } from "~/lib/invoices/customer-link";
import { logInvoiceEvent } from "~/lib/invoices/events";
import { serializeLineItems } from "~/lib/invoices/line-items";
import {
  buildInvoiceViewUrl,
  emailInvoice,
  emailPaymentReceipt,
  INVOICE_NOTIFY_BUSINESS_SELECT,
  INVOICE_NOTIFY_INVOICE_SELECT,
} from "~/lib/invoices/notify";
import {
  buildPaymentInstructions,
  parsePaymentInstructions,
  serializePaymentInstructions,
  serializePaymentMethods,
} from "~/lib/invoices/payment-methods";
import {
  deleteInvoicePayment,
  INVOICE_CHANGED_MESSAGE,
  recordInvoicePayment,
} from "~/lib/invoices/payments";
import {
  createInvoiceWithNextNumber,
  ensureInvoiceSettings,
  getInvoiceSettingsOrDefaults,
  nextInvoiceNumber,
} from "~/lib/invoices/repository";
import {
  blankToNull,
  buildIssuerSnapshot,
  invoiceDisplayNumber,
  ISSUER_BUSINESS_SELECT,
  lineItemsWithAmounts,
  loadInvoiceForToken,
  parsePriceLabelCents,
  paymentRecordMethodLabel,
  toInvoiceDiscountType,
  toInvoiceDueTerms,
  ymdOrNull,
} from "~/lib/invoices/server-shared";
import {
  invoiceCapabilities,
  isInvoiceOverdue,
  REMINDER_COOLDOWN_MS,
  resolveDueDateYmd,
  todayUtcMidnight,
  toInvoiceStatus,
  utcMidnightToYmd,
  ymdToUtcMidnight,
} from "~/lib/invoices/status";
import { createInvoiceToken, invoiceViewPath } from "~/lib/invoices/token";
import { balanceDueCents, computeInvoiceTotals } from "~/lib/invoices/totals";
import {
  mapNativeRow,
  mapQboRow,
  matchesInvoiceSearch,
  matchesListStatusFilter,
  mergeUnifiedPage,
  NATIVE_INVOICE_LIST_SELECT,
  nativeInvoiceOrderBy,
  nativeInvoiceSearchWhere,
  nativeListStatusWhere,
  UNIFIED_INVOICE_PAGE_SIZE,
} from "~/lib/invoices/unified-list";
import { getClientIpFromHeaders, invoiceViewLimiter } from "~/lib/rate-limit";
import { normalizeEmail } from "~/lib/utils";
import {
  cancelInvoiceSchema,
  deletePaymentSchema,
  INVOICE_OPEN_STATUSES,
  invoiceDraftSchema,
  invoiceIdSchema,
  invoiceListParamsSchema,
  invoiceSendSchema,
  invoiceSettingsSchema,
  invoiceUpdateSchema,
  parseIssuerSnapshot,
  recordPaymentSchema,
  sendReminderSchema,
} from "~/lib/validators/invoice";
import {
  parseBillingAddressJson,
  QBO_OPEN_INVOICE_STATUSES,
} from "~/lib/validators/quickbooks";
import { resolveVariantPrice } from "~/lib/variant-price";
import {
  createTRPCRouter,
  featureGate,
  ownerAdminProcedure,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

import { QBO_INVOICE_LIST_MAX_ROWS } from "./quickbooks";

/**
 * Native (non-QuickBooks) invoices.
 *
 * `invoices` is `ownerCanToggle: true`, so this router follows the same
 * read/write split as `quickbooks.ts` — with one more tier, because these
 * invoices carry money the business has actually received:
 *
 * - **Reads** (`invRead`, NOT gated): `listUnified`, `summary`, `getById`,
 *   `getSettings`, `getForCustomer`. Turning the feature off must never hide
 *   the business's own billing records.
 * - **Bookkeeping** (`invBooks`, NOT gated): `recordPayment`,
 *   `deletePayment`, `cancel`. Money keeps arriving for invoices already in
 *   customers' inboxes after the owner flips the flag off, and a mistake must
 *   stay fixable; freezing these would make the toggle destructive.
 * - **Gated** (`invGated`, `featureGate("invoices")`): `create`, `update`,
 *   `deleteDraft`, `send`, `sendReminder`, `updateSettings`,
 *   `catalogOptions` — everything that starts NEW invoicing activity.
 *
 * All three are `ownerAdminProcedure` (OWNER/MANAGER; STAFF is refused —
 * invoices are money). Every row read is scoped `{ id, businessId }` with
 * `findFirst`, so a foreign id is indistinguishable from a missing one.
 *
 * Customer-facing: `getMine` (signed-in account tab) and `getByToken` (the
 * hosted page's tRPC path; the RSC page itself calls `loadInvoiceForToken`
 * directly). Neither is gated: a customer must always be able to see what
 * they were billed and how to pay it.
 *
 * State changes are compare-and-swaps (`updateMany` whose `where` includes the
 * status that was read), so two tabs can't both send, edit-after-send, or
 * double-cancel; the loser gets CONFLICT or BAD_REQUEST.
 */
const invRead = ownerAdminProcedure;
const invBooks = ownerAdminProcedure;
const invGated = ownerAdminProcedure.use(featureGate("invoices"));

/** Cap on `getForCustomer` rows — the admin customer page shows a short list. */
const CUSTOMER_INVOICE_LIMIT = 50;
/** Cap on `getMine` rows — the account tab. */
const MY_INVOICE_LIMIT = 100;
/** Timeline rows returned by `getById`. */
const EVENT_LIMIT = 100;
/** Rows per group returned by `catalogOptions`. */
const CATALOG_LIMIT = 50;

const OPEN_STATUSES: string[] = [...INVOICE_OPEN_STATUSES];

// ─── Helpers ────────────────────────────────────────────────────────────────

async function loadBusinessContext(db: TxClient, businessId: string) {
  const business = await db.business.findUnique({
    where: { id: businessId },
    select: { ...INVOICE_NOTIFY_BUSINESS_SELECT, featureFlags: true },
  });
  if (!business) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Business not found" });
  }
  const { featureFlags, ...notifyBusiness } = business;
  const flags = resolveFlags(featureFlags);
  return {
    business: notifyBusiness,
    invoicesEnabled: flags.isEnabled("invoices"),
    qboEnabled: flags.isEnabled("quickbooks"),
  };
}

function notFound(): TRPCError {
  return new TRPCError({ code: "NOT_FOUND", message: "Invoice not found" });
}

/**
 * Distinguish "gone / not yours" (NOT_FOUND) from "exists but in the wrong
 * state" (BAD_REQUEST) after a compare-and-swap matched nothing.
 */
async function casMissError(
  db: TxClient,
  businessId: string,
  id: string,
  wrongStateMessage: string,
): Promise<TRPCError> {
  const exists = await db.invoice.findFirst({
    where: { id, businessId },
    select: { id: true },
  });
  return exists
    ? new TRPCError({ code: "BAD_REQUEST", message: wrongStateMessage })
    : notFound();
}

/** Draft form → invoice columns (create + update). */
function draftColumns(input: InvoiceDraft, knownMethodIds: Set<string>) {
  const discountType = input.discountType ?? null;
  const totals = computeInvoiceTotals({
    lineItems: input.lineItems,
    discountType,
    discountValue: input.discountValue,
    taxRateBps: input.taxRateBps,
  });
  return {
    customerName: input.customer.name,
    customerEmail: normalizeEmail(input.customer.email),
    customerPhone: blankToNull(input.customer.phone),
    billingAddress: input.customer.billingAddress
      ? JSON.stringify(input.customer.billingAddress)
      : null,
    lineItems: serializeLineItems(input.lineItems),
    subtotalCents: totals.subtotalCents,
    discountType,
    discountValue: discountType ? input.discountValue : 0,
    discountCents: totals.discountCents,
    taxRateBps: input.taxRateBps,
    taxCents: totals.taxCents,
    totalCents: totals.totalCents,
    dueTerms: input.dueTerms,
    // Presets resolve at send; only a custom date is stored on a draft.
    dueDate:
      input.dueTerms === "custom" && input.customDueDate
        ? ymdToUtcMidnight(input.customDueDate)
        : null,
    notes: blankToNull(input.notes),
    terms: blankToNull(input.terms),
    // Ids of methods deleted from settings since the form loaded are dropped.
    paymentMethodIds: input.paymentMethodIds.filter((id) =>
      knownMethodIds.has(id),
    ),
  };
}

/** "Sep 24, 3:05 PM" in the business's zone. */
function formatInstant(date: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone,
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  } catch {
    return date.toISOString();
  }
}

function withFlagCaps(
  caps: InvoiceCapabilities,
  invoicesEnabled: boolean,
): InvoiceCapabilities {
  return {
    ...caps,
    canEdit: caps.canEdit && invoicesEnabled,
    canSend: caps.canSend && invoicesEnabled,
    canDelete: caps.canDelete && invoicesEnabled,
    canRemind: caps.canRemind && invoicesEnabled,
  };
}

const SETTINGS_BUSINESS_SELECT = {
  name: true,
  timeZone: true,
  venmoHandle: true,
  cashAppHandle: true,
  featureFlags: true,
} satisfies Prisma.BusinessSelect;

async function settingsPayload(db: DbClient, businessId: string) {
  const [settings, business, nextNumber] = await Promise.all([
    getInvoiceSettingsOrDefaults(db, businessId),
    db.business.findUnique({
      where: { id: businessId },
      select: SETTINGS_BUSINESS_SELECT,
    }),
    // Floor read separately below; this is just max+1.
    nextInvoiceNumber(db, businessId, 1),
  ]);
  if (!business) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Business not found" });
  }
  return {
    ...settings,
    /** What the next `create` would be numbered (max+1, floored at `startingNumber`). */
    nextInvoiceNumber: Math.max(nextNumber, settings.startingNumber),
    businessName: business.name,
    timeZone: business.timeZone,
    /** For pre-filling the Venmo / Cash App method dialogs. */
    venmoHandle: business.venmoHandle,
    cashAppHandle: business.cashAppHandle,
    invoicesEnabled: resolveFlags(business.featureFlags).isEnabled("invoices"),
  };
}

/**
 * `kind`/`qboInvoiceId`/`lastError`/`quoteSubmission` are the QuickBooks-only
 * fields `UnifiedInvoiceRow.qbo` carries — added so `/admin/invoices` no
 * longer needs a second `quickbooks.listInvoices` call to fill in the
 * per-row QuickBooks actions and the Lead column. `quoteSubmission.contactName`
 * is `/// @encrypted` but decrypts transparently on read (`fieldEncryptionExtension`
 * in `src/server/db.ts`), same as `customerName`/`customerEmail` below.
 */
const QBO_UNIFIED_SELECT = {
  id: true,
  createdAt: true,
  amountCents: true,
  balanceCents: true,
  status: true,
  dueDate: true,
  customerName: true,
  customerEmail: true,
  qboDocNumber: true,
  kind: true,
  qboInvoiceId: true,
  lastError: true,
  quoteSubmission: { select: { id: true, contactName: true } },
} satisfies Prisma.QuickBooksInvoiceSelect;

// ─── Router ─────────────────────────────────────────────────────────────────

export const invoiceRouter = createTRPCRouter({
  // ─── Reads (ungated) ──────────────────────────────────────────────────────

  /**
   * The unified `/admin/invoices` page: native + QuickBooks rows, filtered,
   * sorted and paged together. See the header of `~/lib/invoices/unified-list`
   * for why the merge is exact.
   *
   * QuickBooks rows are only loaded when the `quickbooks` flag is on or the
   * business has any (a QBO-only business keeps its list after turning the
   * flag off), capped at `QBO_INVOICE_LIST_MAX_ROWS` newest-first like the old
   * QBO-only page, and filtered in memory (their customer fields are
   * encrypted). `page` is clamped onto the last real page.
   */
  listUnified: invRead
    .input(invoiceListParamsSchema)
    .query(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const now = new Date();
      const pageSize = UNIFIED_INVOICE_PAGE_SIZE;

      const [
        { business, invoicesEnabled, qboEnabled },
        settings,
        qboCount,
        nativeAny,
      ] = await Promise.all([
        loadBusinessContext(ctx.db, businessId),
        getInvoiceSettingsOrDefaults(ctx.db, businessId),
        ctx.db.quickBooksInvoice.count({ where: { businessId } }),
        // Cheap existence check, ignoring every filter — tells the page
        // "no invoices yet" from "no matches", without a second `listUnified`
        // round trip (see `hasAnyInvoices` below).
        ctx.db.invoice.findFirst({
          where: { businessId },
          select: { id: true },
        }),
      ]);
      const timeZone = business.timeZone;
      const hasQboRows = qboCount > 0;

      const includeNative = input.source !== "quickbooks";
      const includeQbo =
        input.source !== "native" && (qboEnabled || hasQboRows);

      const searchWhere = nativeInvoiceSearchWhere(input.search);
      const nativeWhere: Prisma.InvoiceWhereInput = {
        AND: [
          { businessId },
          nativeListStatusWhere(input.status, now, timeZone),
          ...(searchWhere ? [searchWhere] : []),
        ],
      };

      const [nativeCount, qboRows] = await Promise.all([
        includeNative ? ctx.db.invoice.count({ where: nativeWhere }) : 0,
        includeQbo && hasQboRows
          ? ctx.db.quickBooksInvoice.findMany({
              where: { businessId },
              take: QBO_INVOICE_LIST_MAX_ROWS,
              select: QBO_UNIFIED_SELECT,
              orderBy: [{ createdAt: "desc" }, { id: "asc" }],
            })
          : [],
      ]);

      const qboMatches = qboRows
        .map((row) => mapQboRow(row, now, timeZone))
        .filter(
          (row) =>
            matchesListStatusFilter(row, input.status) &&
            matchesInvoiceSearch(row, input.search),
        );

      const totalCount = nativeCount + qboMatches.length;
      const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
      const page = Math.min(input.page, pageCount);
      const orderBy = nativeInvoiceOrderBy(input.sort);
      const mapNative = (row: Parameters<typeof mapNativeRow>[0]) =>
        mapNativeRow(row, now, timeZone, settings.numberPadding);

      let rows: UnifiedInvoiceRow[];
      if (qboMatches.length === 0) {
        rows = includeNative
          ? (
              await ctx.db.invoice.findMany({
                where: nativeWhere,
                orderBy,
                skip: (page - 1) * pageSize,
                take: pageSize,
                select: NATIVE_INVOICE_LIST_SELECT,
              })
            ).map(mapNative)
          : [];
      } else {
        const nativeTop = includeNative
          ? (
              await ctx.db.invoice.findMany({
                where: nativeWhere,
                orderBy,
                take: page * pageSize,
                select: NATIVE_INVOICE_LIST_SELECT,
              })
            ).map(mapNative)
          : [];
        rows = mergeUnifiedPage({
          nativeTop,
          qboMatches,
          page,
          pageSize,
          sort: input.sort,
        });
      }

      return {
        rows,
        totalCount,
        page,
        pageCount,
        pageSize,
        hasQboRows,
        qboEnabled,
        invoicesEnabled,
        timeZone,
        /** Any invoice at all, ignoring every filter — see the comment above. */
        hasAnyInvoices: hasQboRows || nativeAny !== null,
        /** Set when the 1000-row QuickBooks cap (`QBO_INVOICE_LIST_MAX_ROWS`)
         * trimmed older invoices out of `qboRows` above. `null` when the
         * source filter excludes QuickBooks, so the page shows no cap notice
         * for a list that has no QuickBooks rows in it. */
        qboListCap:
          includeQbo && qboCount > qboRows.length
            ? { shown: qboRows.length, total: qboCount }
            : null,
      };
    }),

  /**
   * The summary cards. Native figures are SQL aggregates; QuickBooks open
   * balances are added in memory with the same overdue rule
   * (`mapQboRow`). "Paid in the last 30 days" is money COLLECTED: native
   * payments with `paidOn` in the window (including payments on invoices
   * later cancelled), plus QuickBooks invoices marked paid in the window.
   */
  summary: invRead.query(async ({ ctx }) => {
    const { businessId } = ctx;
    const now = new Date();
    const { business, qboEnabled } = await loadBusinessContext(
      ctx.db,
      businessId,
    );
    const today = todayUtcMidnight(now, business.timeZone);
    const windowStart = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [outstanding, overdue, collected, qboCount] = await Promise.all([
      ctx.db.invoice.aggregate({
        where: { businessId, status: { in: OPEN_STATUSES } },
        _sum: { totalCents: true, amountPaidCents: true },
        _count: { _all: true },
      }),
      ctx.db.invoice.aggregate({
        where: {
          businessId,
          status: { in: OPEN_STATUSES },
          dueDate: { lt: today },
        },
        _sum: { totalCents: true, amountPaidCents: true },
        _count: { _all: true },
      }),
      ctx.db.invoicePayment.aggregate({
        where: { businessId, paidOn: { gte: windowStart } },
        _sum: { amountCents: true },
      }),
      ctx.db.quickBooksInvoice.count({ where: { businessId } }),
    ]);

    let outstandingCents =
      (outstanding._sum.totalCents ?? 0) -
      (outstanding._sum.amountPaidCents ?? 0);
    let outstandingCount = outstanding._count._all;
    let overdueCents =
      (overdue._sum.totalCents ?? 0) - (overdue._sum.amountPaidCents ?? 0);
    let overdueCount = overdue._count._all;
    let paidLast30Cents = collected._sum.amountCents ?? 0;

    if (qboEnabled || qboCount > 0) {
      const qboRows = await ctx.db.quickBooksInvoice.findMany({
        where: {
          businessId,
          OR: [
            { status: { in: [...QBO_OPEN_INVOICE_STATUSES] } },
            { status: "paid", paidAt: { gte: windowStart } },
          ],
        },
        take: QBO_INVOICE_LIST_MAX_ROWS,
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
        select: {
          id: true,
          createdAt: true,
          amountCents: true,
          balanceCents: true,
          status: true,
          dueDate: true,
          qboDocNumber: true,
        },
      });
      for (const raw of qboRows) {
        if (raw.status === "paid") {
          paidLast30Cents += raw.amountCents;
          continue;
        }
        // Customer fields and the `qbo` detail don't affect money or overdue;
        // skip decrypting/loading them here (they cost 1 row's worth of joins
        // × up to `QBO_INVOICE_LIST_MAX_ROWS`, and nothing below reads them).
        const row = mapQboRow(
          {
            ...raw,
            customerName: "",
            customerEmail: "",
            kind: "custom",
            qboInvoiceId: null,
            lastError: null,
            quoteSubmission: null,
          },
          now,
          business.timeZone,
        );
        outstandingCents += row.balanceCents;
        outstandingCount += 1;
        if (row.isOverdue) {
          overdueCents += row.balanceCents;
          overdueCount += 1;
        }
      }
    }

    return {
      outstandingCents,
      outstandingCount,
      overdueCents,
      overdueCount,
      paidLast30Cents,
    };
  }),

  /** One invoice for the admin detail page, with payments, timeline and capabilities. */
  getById: invRead.input(invoiceIdSchema).query(async ({ ctx, input }) => {
    const { businessId } = ctx;
    const now = new Date();

    const [row, { business, invoicesEnabled }, settings] = await Promise.all([
      ctx.db.invoice.findFirst({
        where: { id: input.id, businessId },
        include: {
          payments: {
            orderBy: [{ paidOn: "desc" }, { createdAt: "desc" }],
          },
          events: { orderBy: { createdAt: "desc" }, take: EVENT_LIMIT },
        },
      }),
      loadBusinessContext(ctx.db, businessId),
      getInvoiceSettingsOrDefaults(ctx.db, businessId),
    ]);
    if (!row) throw notFound();

    const { payments, events, ...invoice } = row;
    const status = toInvoiceStatus(invoice.status);
    const capabilities = withFlagCaps(
      invoiceCapabilities(invoice, now),
      invoicesEnabled,
    );

    return {
      ...invoice,
      status,
      displayNumber: invoiceDisplayNumber(invoice, settings.numberPadding),
      dueTerms: toInvoiceDueTerms(invoice.dueTerms),
      discountType: toInvoiceDiscountType(invoice.discountType),
      lineItems: lineItemsWithAmounts(invoice.lineItems),
      billingAddress: parseBillingAddressJson(invoice.billingAddress),
      paymentInstructions: parsePaymentInstructions(
        invoice.paymentInstructions,
      ),
      issuerSnapshot: parseIssuerSnapshot(invoice.issuerSnapshot),
      issueDateYmd: ymdOrNull(invoice.issueDate),
      dueDateYmd: ymdOrNull(invoice.dueDate),
      balanceCents: status === "CANCELLED" ? 0 : balanceDueCents(invoice),
      isOverdue: isInvoiceOverdue(invoice, now, business.timeZone),
      capabilities,
      viewUrl:
        status === "DRAFT" ? null : buildInvoiceViewUrl(business, invoice.id),
      invoicesEnabled,
      timeZone: business.timeZone,
      numberPadding: settings.numberPadding,
      payments: payments.map((payment) => ({
        id: payment.id,
        createdAt: payment.createdAt,
        amountCents: payment.amountCents,
        paidOn: payment.paidOn,
        paidOnYmd: utcMidnightToYmd(payment.paidOn),
        method: payment.method,
        methodLabel: paymentRecordMethodLabel(payment.method),
        reference: payment.reference,
        note: payment.note,
        recordedByUserId: payment.recordedByUserId,
        receiptSentAt: payment.receiptSentAt,
      })),
      events: events.map((event) => ({
        id: event.id,
        createdAt: event.createdAt,
        type: event.type,
        actorUserId: event.actorUserId,
        metadata: event.metadata,
      })),
    };
  }),

  /** Invoice settings (or the defaults when never saved), payment methods parsed. */
  getSettings: invRead.query(({ ctx }) =>
    settingsPayload(ctx.db, ctx.businessId),
  ),

  /** The invoices linked to one customer, for the admin customer detail page. */
  getForCustomer: invRead
    .input(z.object({ customerId: z.string().min(1).max(64) }))
    .query(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const now = new Date();

      // Verify the customer first so a foreign id 404s instead of returning
      // an empty list (no existence oracle — same as `getLeadInvoices`).
      const customer = await ctx.db.customer.findFirst({
        where: { id: input.customerId, businessId },
        select: { id: true },
      });
      if (!customer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Customer not found",
        });
      }

      const where = { businessId, customerId: customer.id };
      const [rows, totalCount, { business }, settings] = await Promise.all([
        ctx.db.invoice.findMany({
          where,
          orderBy: [{ createdAt: "desc" }, { id: "asc" }],
          take: CUSTOMER_INVOICE_LIMIT,
          select: NATIVE_INVOICE_LIST_SELECT,
        }),
        ctx.db.invoice.count({ where }),
        loadBusinessContext(ctx.db, businessId),
        getInvoiceSettingsOrDefaults(ctx.db, businessId),
      ]);

      return {
        rows: rows.map((row) =>
          mapNativeRow(row, now, business.timeZone, settings.numberPadding),
        ),
        totalCount,
      };
    }),

  // ─── Bookkeeping (ungated) ────────────────────────────────────────────────

  /**
   * Record a (possibly partial) payment. The status moves SENT →
   * PARTIALLY_PAID → PAID on its own; an amount above the balance is
   * rejected. With `emailReceipt`, the receipt goes out AFTER the payment is
   * committed, and `receiptSentAt` + a `RECEIPT_SENT` event are stamped only
   * if it sent — a failed receipt never undoes the payment.
   */
  recordPayment: invBooks
    .input(recordPaymentSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const actorUserId = ctx.session.user.id;
      const now = new Date();
      const { emailReceipt, ...paymentInput } = input;

      const result = await recordInvoicePayment(ctx.db, {
        businessId,
        input: paymentInput,
        actorUserId,
        now,
      });

      let receiptEmailed: boolean | null = null;
      if (emailReceipt) {
        const [{ business }, invoice] = await Promise.all([
          loadBusinessContext(ctx.db, businessId),
          ctx.db.invoice.findFirst({
            where: { id: result.invoice.id, businessId },
            select: INVOICE_NOTIFY_INVOICE_SELECT,
          }),
        ]);
        if (invoice) {
          const sent = await emailPaymentReceipt(ctx.db, {
            invoice,
            payment: result.payment,
            business,
            now,
          });
          receiptEmailed = sent.success;
          if (sent.success) {
            await ctx.db.invoicePayment.updateMany({
              where: { id: result.payment.id, businessId },
              data: { receiptSentAt: now },
            });
          }
          await logInvoiceEvent(ctx.db, {
            invoiceId: invoice.id,
            businessId,
            type: sent.success ? "RECEIPT_SENT" : "EMAIL_FAILED",
            actorUserId,
            metadata: sent.success
              ? { paymentId: result.payment.id, to: invoice.customerEmail }
              : { kind: "receipt", paymentId: result.payment.id },
          });
        }
      }

      return {
        invoice: result.invoice,
        payment: {
          id: result.payment.id,
          amountCents: result.payment.amountCents,
          paidOn: result.payment.paidOn,
          method: result.payment.method,
        },
        receiptEmailed,
      };
    }),

  /** Delete a payment entered by mistake; the status is recomputed. */
  deletePayment: invBooks
    .input(deletePaymentSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await deleteInvoicePayment(ctx.db, {
        businessId: ctx.businessId,
        paymentId: input.paymentId,
        actorUserId: ctx.session.user.id,
        now: new Date(),
      });
      return { invoice: result.invoice };
    }),

  /**
   * Cancel a SENT / PARTIALLY_PAID invoice. Payments already recorded stay as
   * history. With `notifyCustomer`, the notice (including `reason`, when
   * given — so the UI should say the reason is shown to the customer) goes
   * out after the commit; a failed notice logs `EMAIL_FAILED` and is
   * reported as `customerNotified: false`, never rolled back.
   */
  cancel: invBooks
    .input(cancelInvoiceSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const actorUserId = ctx.session.user.id;
      const now = new Date();

      await ctx.db.$transaction(async (tx) => {
        const { count } = await tx.invoice.updateMany({
          where: {
            id: input.id,
            businessId,
            status: { in: OPEN_STATUSES },
          },
          data: {
            status: "CANCELLED",
            cancelledAt: now,
            cancelReason: blankToNull(input.reason),
          },
        });
        if (count === 0) {
          throw await casMissError(
            tx,
            businessId,
            input.id,
            "Only sent invoices that aren't fully paid can be cancelled",
          );
        }
        await logInvoiceEvent(tx, {
          invoiceId: input.id,
          businessId,
          type: "CANCELLED",
          actorUserId,
          metadata: { notifyCustomer: input.notifyCustomer },
        });
      });

      let customerNotified: boolean | null = null;
      if (input.notifyCustomer) {
        const [{ business }, invoice] = await Promise.all([
          loadBusinessContext(ctx.db, businessId),
          ctx.db.invoice.findFirst({
            where: { id: input.id, businessId },
            select: INVOICE_NOTIFY_INVOICE_SELECT,
          }),
        ]);
        if (invoice?.customerEmail) {
          const sent = await emailInvoice(ctx.db, {
            invoice,
            business,
            kind: "cancelled",
            reason: input.reason,
            idempotencyKey: `invoice-cancelled-${invoice.id}`,
            now,
          });
          customerNotified = sent.success;
          if (!sent.success) {
            await logInvoiceEvent(ctx.db, {
              invoiceId: invoice.id,
              businessId,
              type: "EMAIL_FAILED",
              actorUserId,
              metadata: { kind: "cancelled" },
            });
          }
        } else {
          customerNotified = false;
        }
      }

      return { status: "CANCELLED" as InvoiceStatus, customerNotified };
    }),

  // ─── Gated (featureGate("invoices")) ──────────────────────────────────────

  /**
   * Create a draft. Upserts the settings row (first invoice), links or
   * creates the Customer, snapshots the current number prefix, and assigns
   * the next number (floored at `startingNumber`) with a P2002 retry.
   */
  create: invGated
    .input(invoiceDraftSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const actorUserId = ctx.session.user.id;

      const settings = await ensureInvoiceSettings(ctx.db, businessId);
      const customerId = await upsertInvoiceCustomer(ctx.db, businessId, {
        customerId: input.customer.customerId,
        name: input.customer.name,
        email: input.customer.email,
      });
      const columns = draftColumns(
        input,
        new Set(settings.paymentMethods.map((method) => method.id)),
      );

      const created = await createInvoiceWithNextNumber(
        ctx.db,
        businessId,
        settings.startingNumber,
        (invoiceNumber) => ({
          ...columns,
          businessId,
          invoiceNumber,
          numberPrefix: settings.numberPrefix,
          status: "DRAFT",
          customerId,
          createdByUserId: actorUserId,
          events: {
            create: {
              businessId,
              type: "CREATED",
              actorUserId,
              metadata: { invoiceNumber },
            },
          },
        }),
        { id: true, invoiceNumber: true, numberPrefix: true },
      );

      return {
        id: created.id,
        invoiceNumber: created.invoiceNumber,
        displayNumber: invoiceDisplayNumber(created, settings.numberPadding),
      };
    }),

  /** Replace a DRAFT's contents. Sent invoices are never edited (cancel + re-issue). */
  update: invGated
    .input(invoiceUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const actorUserId = ctx.session.user.id;
      const settings = await getInvoiceSettingsOrDefaults(ctx.db, businessId);
      const columns = draftColumns(
        input,
        new Set(settings.paymentMethods.map((method) => method.id)),
      );

      await ctx.db.$transaction(async (tx) => {
        const customerId = await upsertInvoiceCustomer(tx, businessId, {
          customerId: input.customer.customerId,
          name: input.customer.name,
          email: input.customer.email,
        });
        const { count } = await tx.invoice.updateMany({
          where: { id: input.id, businessId, status: "DRAFT" },
          data: { ...columns, customerId },
        });
        if (count === 0) {
          throw await casMissError(
            tx,
            businessId,
            input.id,
            "Only draft invoices can be edited",
          );
        }
        await logInvoiceEvent(tx, {
          invoiceId: input.id,
          businessId,
          type: "UPDATED",
          actorUserId,
          metadata: { totalCents: columns.totalCents },
        });
      });

      return { id: input.id };
    }),

  /** Delete a DRAFT (its events cascade). Sent invoices are cancelled, never deleted. */
  deleteDraft: invGated
    .input(invoiceIdSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const { count } = await ctx.db.invoice.deleteMany({
        where: { id: input.id, businessId, status: "DRAFT" },
      });
      if (count === 0) {
        throw await casMissError(
          ctx.db,
          businessId,
          input.id,
          "Only draft invoices can be deleted",
        );
      }
      return { success: true };
    }),

  /**
   * DRAFT → SENT. Stamps the issue date (today in the business's zone) and
   * the due date (from the terms, counted from today), and snapshots the
   * payment instructions and the issuer's public details — so later settings
   * or branding edits never change an invoice the customer already has.
   *
   * `deliver: "email"` then emails it (idempotency `invoice-sent-<id>`). If
   * that fails the invoice STAYS sent — it was issued; the owner can copy the
   * link or send a reminder — an `EMAIL_FAILED` event is logged and the
   * result says `emailed: false`. `deliver: "manual"` logs `MARKED_SENT` and
   * sends nothing.
   */
  send: invGated.input(invoiceSendSchema).mutation(async ({ ctx, input }) => {
    const { businessId } = ctx;
    const actorUserId = ctx.session.user.id;
    const now = new Date();

    const [draft, businessRow, settings] = await Promise.all([
      ctx.db.invoice.findFirst({
        where: { id: input.id, businessId },
        select: {
          id: true,
          status: true,
          totalCents: true,
          dueTerms: true,
          dueDate: true,
          invoiceNumber: true,
          numberPrefix: true,
          paymentMethodIds: true,
          customerEmail: true,
        },
      }),
      ctx.db.business.findUnique({
        where: { id: businessId },
        select: {
          ...INVOICE_NOTIFY_BUSINESS_SELECT,
          ...ISSUER_BUSINESS_SELECT,
        },
      }),
      getInvoiceSettingsOrDefaults(ctx.db, businessId),
    ]);
    if (!draft) throw notFound();
    if (!businessRow) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Business not found" });
    }
    if (draft.status !== "DRAFT") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "This invoice has already been sent",
      });
    }
    if (draft.totalCents <= 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "An invoice for $0.00 can't be sent — add a line with a price",
      });
    }

    const todayYmd = zonedCalendarDate(now, businessRow.timeZone);
    const dueYmd = resolveDueDateYmd(
      toInvoiceDueTerms(draft.dueTerms),
      todayYmd,
      draft.dueDate ? utcMidnightToYmd(draft.dueDate) : null,
    );
    if (!dueYmd) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Pick a due date before sending",
      });
    }
    if (dueYmd < todayYmd) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          "The due date has already passed — edit the draft and pick a new one",
      });
    }

    const displayNumber = invoiceDisplayNumber(draft, settings.numberPadding);
    const instructions = buildPaymentInstructions(
      settings.paymentMethods,
      draft.paymentMethodIds,
      { businessName: businessRow.name, displayNumber },
    );
    const issuer = buildIssuerSnapshot(businessRow);

    await ctx.db.$transaction(async (tx) => {
      const { count } = await tx.invoice.updateMany({
        where: { id: draft.id, businessId, status: "DRAFT" },
        data: {
          status: "SENT",
          issueDate: ymdToUtcMidnight(todayYmd),
          dueDate: ymdToUtcMidnight(dueYmd),
          paymentInstructions: serializePaymentInstructions(instructions),
          issuerSnapshot: issuer,
          sentAt: now,
          sentVia: input.deliver,
        },
      });
      if (count === 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: INVOICE_CHANGED_MESSAGE,
        });
      }
      if (input.deliver === "manual") {
        await logInvoiceEvent(tx, {
          invoiceId: draft.id,
          businessId,
          type: "MARKED_SENT",
          actorUserId,
        });
      }
    });

    const business = {
      id: businessRow.id,
      name: businessRow.name,
      ownerEmail: businessRow.ownerEmail,
      supportEmail: businessRow.supportEmail,
      subdomain: businessRow.subdomain,
      customDomain: businessRow.customDomain,
      domainStatus: businessRow.domainStatus,
      timeZone: businessRow.timeZone,
      siteContent: businessRow.siteContent
        ? { logoUrl: businessRow.siteContent.logoUrl }
        : null,
    };
    const viewUrl = buildInvoiceViewUrl(business, draft.id, now);

    let emailed = false;
    if (input.deliver === "email") {
      const invoice = await ctx.db.invoice.findFirst({
        where: { id: draft.id, businessId },
        select: INVOICE_NOTIFY_INVOICE_SELECT,
      });
      if (invoice) {
        const sent = await emailInvoice(ctx.db, {
          invoice,
          business,
          kind: "sent",
          message: input.message,
          idempotencyKey: `invoice-sent-${invoice.id}`,
          now,
        });
        emailed = sent.success;
      }
      await logInvoiceEvent(ctx.db, {
        invoiceId: draft.id,
        businessId,
        type: emailed ? "SENT" : "EMAIL_FAILED",
        actorUserId,
        metadata: emailed
          ? { to: draft.customerEmail }
          : { kind: "sent", to: draft.customerEmail },
      });
    }

    return {
      status: "SENT" as InvoiceStatus,
      emailed,
      viewUrl,
      displayNumber,
    };
  }),

  /**
   * Email the customer a reminder (SENT / PARTIALLY_PAID only), at most once
   * per `REMINDER_COOLDOWN_MS`. The cooldown is consumed ONLY when the email
   * sends: `lastReminderSentAt` / `reminderCount` / `REMINDER_SENT` are
   * stamped after success, and a failure comes back as BAD_GATEWAY with
   * nothing stamped, so the owner can simply retry.
   *
   * The idempotency key embeds the NEXT reminder count, so two racing clicks
   * send one email (Resend dedupes) and the count CAS stamps once.
   */
  sendReminder: invGated
    .input(sendReminderSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const actorUserId = ctx.session.user.id;
      const now = new Date();

      const [invoice, { business }] = await Promise.all([
        ctx.db.invoice.findFirst({
          where: { id: input.id, businessId },
          select: {
            ...INVOICE_NOTIFY_INVOICE_SELECT,
            lastReminderSentAt: true,
            reminderCount: true,
          },
        }),
        loadBusinessContext(ctx.db, businessId),
      ]);
      if (!invoice) throw notFound();
      if (!OPEN_STATUSES.includes(invoice.status)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Reminders can only be sent for unpaid, sent invoices",
        });
      }
      if (invoice.lastReminderSentAt) {
        const availableAt = new Date(
          invoice.lastReminderSentAt.getTime() + REMINDER_COOLDOWN_MS,
        );
        if (now < availableAt) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: `A reminder was sent in the last 24 hours. You can send another after ${formatInstant(availableAt, business.timeZone)}.`,
          });
        }
      }

      const nextCount = invoice.reminderCount + 1;
      const sent = await emailInvoice(ctx.db, {
        invoice,
        business,
        kind: "reminder",
        message: input.message,
        idempotencyKey: `invoice-reminder-${invoice.id}-${nextCount}`,
        now,
      });
      if (!sent.success) {
        throw new TRPCError({
          code: "BAD_GATEWAY",
          message: "We couldn't send the reminder email. Please try again.",
        });
      }

      await ctx.db.$transaction(async (tx) => {
        const { count } = await tx.invoice.updateMany({
          where: {
            id: invoice.id,
            businessId,
            reminderCount: invoice.reminderCount,
          },
          data: { lastReminderSentAt: now, reminderCount: nextCount },
        });
        // count 0 = a concurrent click already stamped this same reminder.
        if (count > 0) {
          await logInvoiceEvent(tx, {
            invoiceId: invoice.id,
            businessId,
            type: "REMINDER_SENT",
            actorUserId,
            metadata: { to: invoice.customerEmail, reminderCount: nextCount },
          });
        }
      });

      return {
        remindAvailableAt: new Date(now.getTime() + REMINDER_COOLDOWN_MS),
      };
    }),

  /**
   * Save invoice settings. `startingNumber` is a floor for FUTURE numbers
   * only — existing invoices are never renumbered, and a floor below the
   * highest number used has no effect. A prefix change applies to invoices
   * created afterwards (each invoice snapshots its prefix).
   */
  updateSettings: invGated
    .input(invoiceSettingsSchema)
    .mutation(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const data = {
        numberPrefix: input.numberPrefix,
        numberPadding: input.numberPadding,
        startingNumber: input.startingNumber,
        defaultDueTerms: input.defaultDueTerms,
        defaultTaxRateBps: input.defaultTaxRateBps,
        defaultNotes: blankToNull(input.defaultNotes),
        defaultTerms: blankToNull(input.defaultTerms),
        paymentMethods: serializePaymentMethods(input.paymentMethods),
        overdueAlertsEnabled: input.overdueAlertsEnabled,
        weeklyDigestEnabled: input.weeklyDigestEnabled,
      };
      await ctx.db.invoiceSettings.upsert({
        where: { businessId },
        create: { businessId, ...data },
        update: data,
        select: { id: true },
      });
      return settingsPayload(ctx.db, businessId);
    }),

  /**
   * Catalog rows for the builder's "add from catalog" picker. Product prices
   * are stored in CENTS (as `Float`; `formatPrice(product.price)` divides by
   * 100), rounded here; a variant price of 0/null inherits the product's
   * (`resolveVariantPrice`). Service items only have a free-text
   * `priceLabel`; `priceCents` is a best-effort parse or `null`.
   */
  catalogOptions: invGated
    .input(
      z.object({ search: z.string().trim().max(100).optional() }).default({}),
    )
    .query(async ({ ctx, input }) => {
      const { businessId } = ctx;
      const search = blankToNull(input.search) ?? undefined;
      const nameFilter = search
        ? { contains: search, mode: "insensitive" as const }
        : undefined;

      const [products, serviceItems] = await Promise.all([
        ctx.db.product.findMany({
          where: {
            businessId,
            ...(search
              ? {
                  OR: [
                    { name: nameFilter },
                    { sku: nameFilter },
                    { variants: { some: { name: nameFilter } } },
                  ],
                }
              : {}),
          },
          orderBy: [{ published: "desc" }, { name: "asc" }, { id: "asc" }],
          take: CATALOG_LIMIT,
          select: {
            id: true,
            name: true,
            sku: true,
            price: true,
            published: true,
            variants: {
              orderBy: { createdAt: "asc" },
              select: { id: true, name: true, sku: true, price: true },
            },
          },
        }),
        ctx.db.serviceItem.findMany({
          where: {
            businessId,
            ...(search
              ? {
                  OR: [{ name: nameFilter }, { service: { name: nameFilter } }],
                }
              : {}),
          },
          orderBy: [{ name: "asc" }, { id: "asc" }],
          take: CATALOG_LIMIT,
          select: {
            id: true,
            name: true,
            priceLabel: true,
            published: true,
            service: { select: { name: true } },
          },
        }),
      ]);

      return {
        products: products.map((product) => ({
          id: product.id,
          name: product.name,
          sku: product.sku,
          published: product.published,
          priceCents: Math.max(0, Math.round(product.price)),
          variants: product.variants.map((variant) => ({
            id: variant.id,
            name: variant.name,
            sku: variant.sku,
            priceCents: Math.max(
              0,
              Math.round(resolveVariantPrice(variant.price, product.price)),
            ),
          })),
        })),
        services: serviceItems.map((item) => ({
          id: item.id,
          name: item.name,
          serviceName: item.service.name,
          published: item.published,
          priceLabel: item.priceLabel,
          priceCents: parsePriceLabelCents(item.priceLabel),
        })),
      };
    }),

  // ─── Customer-facing ──────────────────────────────────────────────────────

  /**
   * The signed-in customer's invoices on this store (account Invoices tab):
   * every non-draft invoice linked to their Customer row, each with a freshly
   * minted hosted-page path. Self-heals `Customer.userId` exactly like
   * `customer.getMyOrders`, so an invoice sent to an email before its owner
   * made an account shows up once they sign in with it.
   */
  getMine: protectedProcedure.query(async ({ ctx }) => {
    const business = await checkBusiness();
    if (!business) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Business not found" });
    }
    const user = ctx.session.user;
    const now = new Date();

    await ctx.db.customer.updateMany({
      where: {
        email: normalizeEmail(user.email),
        businessId: business.id,
        userId: null,
      },
      data: { userId: user.id },
    });

    const customer = await ctx.db.customer.findFirst({
      where: { userId: user.id, businessId: business.id },
      select: { id: true },
    });
    if (!customer) return [];

    const [rows, settings] = await Promise.all([
      ctx.db.invoice.findMany({
        where: {
          businessId: business.id,
          customerId: customer.id,
          status: { not: "DRAFT" },
        },
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
        take: MY_INVOICE_LIMIT,
        select: {
          id: true,
          invoiceNumber: true,
          numberPrefix: true,
          status: true,
          totalCents: true,
          amountPaidCents: true,
          issueDate: true,
          dueDate: true,
          sentAt: true,
        },
      }),
      getInvoiceSettingsOrDefaults(ctx.db, business.id),
    ]);

    return rows.map((row) => {
      const status = toInvoiceStatus(row.status);
      return {
        id: row.id,
        displayNumber: invoiceDisplayNumber(row, settings.numberPadding),
        status,
        isOverdue: isInvoiceOverdue(row, now, business.timeZone),
        totalCents: row.totalCents,
        amountPaidCents: row.amountPaidCents,
        balanceCents: status === "CANCELLED" ? 0 : balanceDueCents(row),
        issueDate: ymdOrNull(row.issueDate),
        dueDate: ymdOrNull(row.dueDate),
        sentAt: row.sentAt,
        viewPath: invoiceViewPath(
          createInvoiceToken({
            invoiceId: row.id,
            businessId: business.id,
            now,
          }),
        ),
      };
    });
  }),

  /**
   * The hosted invoice page's data, by signed token. Rate limited per
   * IP + host. An invalid token, a token for another store, a missing row or
   * a draft are all NOT_FOUND; an expired (but genuine) token returns
   * `{ state: "expired" }` so the page can explain instead of 404ing.
   * Customer-safe fields only (see `PublicInvoiceView`). Does not record the
   * view — the page does that in `after()`.
   */
  getByToken: publicProcedure
    .input(z.object({ token: z.string().min(1).max(2048) }))
    .query(async ({ ctx, input }) => {
      try {
        await invoiceViewLimiter.consume(
          `${getClientIpFromHeaders(ctx.headers)}:${ctx.headers.get("host") ?? ""}`,
        );
      } catch {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Too many requests. Please try again in a few minutes.",
        });
      }

      const business = await checkBusiness();
      if (!business) throw notFound();

      const result = await loadInvoiceForToken(ctx.db, {
        token: input.token,
        businessId: business.id,
      });
      if (result.state === "not_found") throw notFound();
      return result;
    }),
});
