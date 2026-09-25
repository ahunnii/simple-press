import "server-only";

import type { Prisma } from "generated/prisma";
import { Prisma as PrismaRuntime } from "generated/prisma";

import type {
  InvoicePaymentMethod,
  InvoiceSettingsDueTerms,
} from "~/lib/validators/invoice";
import type { DbClient, TxClient } from "~/server/db";
import {
  INVOICE_DEFAULT_DUE_TERMS,
  INVOICE_DEFAULT_NUMBER_PADDING,
  INVOICE_DEFAULT_NUMBER_PREFIX,
  INVOICE_DEFAULT_STARTING_NUMBER,
  INVOICE_SETTINGS_DUE_TERMS_VALUES,
} from "~/lib/validators/invoice";

import { parsePaymentMethods } from "./payment-methods";

/**
 * Invoice persistence helpers that more than one caller needs: the numbered
 * insert, and the settings row.
 */

// ─── Numbering ──────────────────────────────────────────────────────────────

/**
 * How many times a numbered insert is attempted before giving up. Each retry
 * only happens when another insert took the same number between our read and
 * our write, so N concurrent creates for one business need at most N attempts
 * for the last one to land.
 */
const MAX_NUMBER_ATTEMPTS = 5;

/**
 * The next free invoice number: one past the highest ever used, but never
 * below the owner's `startingNumber` (a floor for owners moving over from
 * another tool, not a counter — see `invoiceSettingsSchema`). Deleted drafts
 * leave gaps below the max; those are never reused.
 */
export async function nextInvoiceNumber(
  db: TxClient,
  businessId: string,
  floor: number,
): Promise<number> {
  const { _max } = await db.invoice.aggregate({
    where: { businessId },
    _max: { invoiceNumber: true },
  });
  return Math.max((_max.invoiceNumber ?? 0) + 1, Math.max(1, floor));
}

/** P2002 on `@@unique([businessId, invoiceNumber])` — and only that constraint. */
function isInvoiceNumberConflict(err: unknown): boolean {
  if (
    !(err instanceof PrismaRuntime.PrismaClientKnownRequestError) ||
    err.code !== "P2002"
  ) {
    return false;
  }
  const target = err.meta?.target;
  const fields = Array.isArray(target)
    ? (target as unknown[]).map(String)
    : typeof target === "string"
      ? [target]
      : [];
  return fields.some(
    (field) =>
      field === "invoiceNumber" ||
      field === "Invoice_businessId_invoiceNumber_key",
  );
}

/**
 * Insert an invoice with the next free number, retrying on a number
 * collision. Same pattern as `getNextOrderNumber` in
 * `src/lib/checkout/create-order.ts` (max+1, re-read on P2002).
 *
 * Must be called with the ROOT client, not inside an interactive transaction:
 * a failed INSERT aborts the surrounding Postgres transaction (25P02 — see the
 * note in `customer.anonymize`), so a P2002 caught and retried inside one
 * would poison every statement after it. Each attempt here is its own
 * statement; nested writes in `build`'s result (e.g. a `CREATED` event via
 * `events: { create }`) ride in that same implicit transaction and roll back
 * with it.
 *
 * `build(n)` returns the create input for number `n`; it is called once per
 * attempt, so it must be pure.
 */
export async function createInvoiceWithNextNumber<
  S extends Prisma.InvoiceSelect,
>(
  db: DbClient,
  businessId: string,
  floor: number,
  build: (invoiceNumber: number) => Prisma.InvoiceUncheckedCreateInput,
  select: S,
): Promise<Prisma.InvoiceGetPayload<{ select: S }>> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < MAX_NUMBER_ATTEMPTS; attempt++) {
    const invoiceNumber = await nextInvoiceNumber(db, businessId, floor);
    const data = build(invoiceNumber);
    if (data.businessId !== businessId) {
      // A mismatched tenant would make the max+1 read above meaningless.
      throw new Error("createInvoiceWithNextNumber: businessId mismatch");
    }
    try {
      return (await db.invoice.create({
        data,
        select,
      })) as Prisma.InvoiceGetPayload<{ select: S }>;
    } catch (err) {
      if (!isInvoiceNumberConflict(err)) throw err;
      lastError = err as Error;
    }
  }
  throw lastError ?? new Error("Invoice number allocation failed");
}

// ─── Settings ───────────────────────────────────────────────────────────────

/**
 * `InvoiceSettings`, parsed: payment methods decoded, due terms narrowed.
 * `exists: false` means no row yet — every value is the column default.
 */
export type ResolvedInvoiceSettings = {
  exists: boolean;
  numberPrefix: string;
  numberPadding: number;
  startingNumber: number;
  defaultDueTerms: InvoiceSettingsDueTerms;
  defaultTaxRateBps: number;
  defaultNotes: string | null;
  defaultTerms: string | null;
  paymentMethods: InvoicePaymentMethod[];
  overdueAlertsEnabled: boolean;
  weeklyDigestEnabled: boolean;
};

/** The column defaults on `InvoiceSettings`, as a resolved settings object. */
export const DEFAULT_INVOICE_SETTINGS: ResolvedInvoiceSettings = {
  exists: false,
  numberPrefix: INVOICE_DEFAULT_NUMBER_PREFIX,
  numberPadding: INVOICE_DEFAULT_NUMBER_PADDING,
  startingNumber: INVOICE_DEFAULT_STARTING_NUMBER,
  defaultDueTerms: INVOICE_DEFAULT_DUE_TERMS,
  defaultTaxRateBps: 0,
  defaultNotes: null,
  defaultTerms: null,
  paymentMethods: [],
  overdueAlertsEnabled: true,
  weeklyDigestEnabled: true,
};

const SETTINGS_SELECT = {
  numberPrefix: true,
  numberPadding: true,
  startingNumber: true,
  defaultDueTerms: true,
  defaultTaxRateBps: true,
  defaultNotes: true,
  defaultTerms: true,
  paymentMethods: true,
  overdueAlertsEnabled: true,
  weeklyDigestEnabled: true,
} satisfies Prisma.InvoiceSettingsSelect;

type SettingsRow = Prisma.InvoiceSettingsGetPayload<{
  select: typeof SETTINGS_SELECT;
}>;

function toDueTerms(raw: string): InvoiceSettingsDueTerms {
  return (INVOICE_SETTINGS_DUE_TERMS_VALUES as readonly string[]).includes(raw)
    ? (raw as InvoiceSettingsDueTerms)
    : INVOICE_DEFAULT_DUE_TERMS;
}

export function resolveInvoiceSettings(
  row: SettingsRow | null,
): ResolvedInvoiceSettings {
  if (!row) return { ...DEFAULT_INVOICE_SETTINGS, paymentMethods: [] };
  return {
    exists: true,
    numberPrefix: row.numberPrefix,
    numberPadding: row.numberPadding,
    startingNumber: row.startingNumber,
    defaultDueTerms: toDueTerms(row.defaultDueTerms),
    defaultTaxRateBps: row.defaultTaxRateBps,
    defaultNotes: row.defaultNotes,
    defaultTerms: row.defaultTerms,
    paymentMethods: parsePaymentMethods(row.paymentMethods),
    overdueAlertsEnabled: row.overdueAlertsEnabled,
    weeklyDigestEnabled: row.weeklyDigestEnabled,
  };
}

/**
 * The settings row, created with column defaults if missing. Called on the
 * first `invoice.create` so a business that never invoices has no row.
 * `where` and `create` name the same unique value, so Prisma runs this as a
 * native `INSERT … ON CONFLICT` — two concurrent first creates don't race.
 */
export async function ensureInvoiceSettings(
  db: TxClient,
  businessId: string,
): Promise<ResolvedInvoiceSettings> {
  const row = await db.invoiceSettings.upsert({
    where: { businessId },
    create: { businessId },
    update: {},
    select: SETTINGS_SELECT,
  });
  return resolveInvoiceSettings(row);
}

/** The settings, or the defaults when no row exists. Never writes. */
export async function getInvoiceSettingsOrDefaults(
  db: TxClient,
  businessId: string,
): Promise<ResolvedInvoiceSettings> {
  const row = await db.invoiceSettings.findUnique({
    where: { businessId },
    select: SETTINGS_SELECT,
  });
  return resolveInvoiceSettings(row);
}
