import "server-only";

import type { Prisma } from "generated/prisma";

import type { InvoicePaymentInstruction } from "./payment-methods";
import type {
  InvoiceDiscountType,
  InvoiceDueTerms,
  InvoiceIssuerSnapshot,
  InvoiceStatus,
} from "~/lib/validators/invoice";
import type { QuickBooksBillingAddress } from "~/lib/validators/quickbooks";
import type { TxClient } from "~/server/db";
import {
  INVOICE_DUE_TERMS_VALUES,
  INVOICE_PAYMENT_RECORD_METHOD_LABELS,
  parseIssuerSnapshot,
} from "~/lib/validators/invoice";
import { parseBillingAddressJson } from "~/lib/validators/quickbooks";

import { parseLineItems } from "./line-items";
import { formatInvoiceNumber } from "./number";
import { parsePaymentInstructions } from "./payment-methods";
import { getInvoiceSettingsOrDefaults } from "./repository";
import { isInvoiceOverdue, toInvoiceStatus, utcMidnightToYmd } from "./status";
import { verifyInvoiceToken } from "./token";
import { balanceDueCents, computeLineAmountCents } from "./totals";

/**
 * Server-only loaders and mappers shared by the `invoice` router and the
 * pages that read the database directly (the hosted `/invoice/[token]` RSC).
 */

// ─── Small shared mappers ───────────────────────────────────────────────────

export function toInvoiceDueTerms(raw: string): InvoiceDueTerms {
  return (INVOICE_DUE_TERMS_VALUES as readonly string[]).includes(raw)
    ? (raw as InvoiceDueTerms)
    : "net_30";
}

export function toInvoiceDiscountType(
  raw: string | null,
): InvoiceDiscountType | null {
  return raw === "flat" || raw === "percent" ? raw : null;
}

/** "INV-0012" — `numberPadding` is the business's CURRENT setting (not snapshotted). */
export function invoiceDisplayNumber(
  invoice: { numberPrefix: string; invoiceNumber: number },
  numberPadding: number,
): string {
  return formatInvoiceNumber(
    invoice.numberPrefix,
    invoice.invoiceNumber,
    numberPadding,
  );
}

/** Label for a recorded-payment method key ("bank_transfer" → "Bank transfer"). */
export function paymentRecordMethodLabel(method: string): string {
  return (
    (INVOICE_PAYMENT_RECORD_METHOD_LABELS as Record<string, string>)[method] ??
    "Other"
  );
}

/**
 * An optional form string as a nullable column value: `undefined` and
 * whitespace-only both become `null`, so "no notes" has one spelling.
 */
export function blankToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return trimmed;
}

/** A stored calendar date → `YYYY-MM-DD`, or null. */
export function ymdOrNull(date: Date | null): string | null {
  return date ? utcMidnightToYmd(date) : null;
}

/** Parsed line items with each line's rounded amount (what every screen prints). */
export function lineItemsWithAmounts(json: string | null | undefined) {
  return parseLineItems(json).map((line) => ({
    ...line,
    amountCents: computeLineAmountCents(line.quantity, line.unitPriceCents),
  }));
}

// ─── Issuer snapshot ────────────────────────────────────────────────────────

/** Business + site-content fields `buildIssuerSnapshot` reads. */
export const ISSUER_BUSINESS_SELECT = {
  name: true,
  ownerEmail: true,
  supportEmail: true,
  phoneNumber: true,
  businessAddress: true,
  addressStreet: true,
  addressCity: true,
  addressState: true,
  addressPostalCode: true,
  siteContent: {
    select: { logoUrl: true, primaryColor: true, accentColor: true },
  },
} satisfies Prisma.BusinessSelect;

export type IssuerBusiness = Prisma.BusinessGetPayload<{
  select: typeof ISSUER_BUSINESS_SELECT;
}>;

/** Only plain hex colors reach the snapshot — it is rendered into a `style`. */
const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

function safeColor(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed && HEX_COLOR.test(trimmed) ? trimmed : null;
}

function clean(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

/**
 * The business's PUBLIC identity at send time, copied onto the invoice
 * (`Invoice.issuerSnapshot`) so the hosted page and print view keep showing
 * who issued it after a rename or move.
 *
 * - Email: the support address, else the owner's — the same reply-to the
 *   invoice emails use.
 * - Address: the structured parts when the street is set (street on one line,
 *   "City, ST 12345" on the next), else the free-text display string split
 *   on newlines.
 * - Accent: the site's primary color, else its accent color, and only when
 *   it is a plain hex value.
 */
export function buildIssuerSnapshot(
  business: IssuerBusiness,
): InvoiceIssuerSnapshot {
  let addressLines: string[];
  const street = clean(business.addressStreet);
  if (street) {
    const city = clean(business.addressCity);
    const stateZip = [
      clean(business.addressState),
      clean(business.addressPostalCode),
    ]
      .filter(Boolean)
      .join(" ");
    const locality = [city, stateZip].filter(Boolean).join(", ");
    addressLines = [street, locality].filter(Boolean);
  } else {
    addressLines = (business.businessAddress ?? "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  return {
    name: business.name,
    email: clean(business.supportEmail) || clean(business.ownerEmail) || null,
    phone: clean(business.phoneNumber) || null,
    addressLines,
    logoUrl: clean(business.siteContent?.logoUrl) || null,
    accentColor:
      safeColor(business.siteContent?.primaryColor) ??
      safeColor(business.siteContent?.accentColor),
  };
}

// ─── Catalog price labels ───────────────────────────────────────────────────

/**
 * Best-effort cents from a service item's free-text `priceLabel` ("$45",
 * "45.00", "$1,200 per visit", "From $80"). Only a label with exactly ONE
 * money amount parses — a range ("$40–$60"), "Free", "Call for pricing" or
 * anything with several numbers returns `null`, and the builder leaves the
 * price for the owner to type. Guessing a number off a range would silently
 * bill the wrong amount.
 */
export function parsePriceLabelCents(
  label: string | null | undefined,
): number | null {
  if (!label) return null;
  const matches = label.match(/\d[\d,]*(?:\.\d+)?/g);
  if (matches?.length !== 1) return null;
  const raw = matches[0];
  // A comma must be a thousands separator ("1,200"), not a decimal comma.
  if (raw.includes(",") && !/^\d{1,3}(?:,\d{3})+(?:\.\d+)?$/.test(raw)) {
    return null;
  }
  const [whole, fraction] = raw.replace(/,/g, "").split(".");
  if (fraction !== undefined && fraction.length > 2) return null;
  const cents =
    Number(whole) * 100 + Number((fraction ?? "").padEnd(2, "0") || "0");
  if (!Number.isSafeInteger(cents) || cents < 0) return null;
  return cents;
}

// ─── Hosted page (token) ────────────────────────────────────────────────────

/** Everything the hosted page and `getByToken` may show a customer. */
export type PublicInvoiceView = {
  id: string;
  displayNumber: string;
  status: InvoiceStatus;
  isOverdue: boolean;
  currency: string;
  issuer: InvoiceIssuerSnapshot;
  billTo: {
    name: string;
    email: string;
    phone: string | null;
    address: QuickBooksBillingAddress | null;
  };
  lineItems: {
    description: string;
    quantity: number;
    unitPriceCents: number;
    amountCents: number;
  }[];
  subtotalCents: number;
  discountType: InvoiceDiscountType | null;
  /** Cents (flat) or basis points (percent). */
  discountValue: number;
  discountCents: number;
  taxRateBps: number;
  taxCents: number;
  totalCents: number;
  amountPaidCents: number;
  /** 0 when cancelled. */
  balanceCents: number;
  dueTerms: InvoiceDueTerms;
  /** `YYYY-MM-DD` calendar dates — format with `timeZone: "UTC"`. */
  issueDate: string | null;
  dueDate: string | null;
  notes: string | null;
  terms: string | null;
  /** Empty when the invoice is cancelled or nothing is owed. */
  paymentInstructions: InvoicePaymentInstruction[];
  payments: { amountCents: number; paidOn: string; methodLabel: string }[];
  sentAt: Date | null;
  paidAt: Date | null;
  cancelledAt: Date | null;
};

export type InvoiceTokenLoadResult =
  | { state: "ok"; invoice: PublicInvoiceView }
  | { state: "expired" }
  | { state: "not_found" };

const PUBLIC_INVOICE_SELECT = {
  id: true,
  invoiceNumber: true,
  numberPrefix: true,
  status: true,
  currency: true,
  customerName: true,
  customerEmail: true,
  customerPhone: true,
  billingAddress: true,
  lineItems: true,
  subtotalCents: true,
  discountType: true,
  discountValue: true,
  discountCents: true,
  taxRateBps: true,
  taxCents: true,
  totalCents: true,
  amountPaidCents: true,
  dueTerms: true,
  issueDate: true,
  dueDate: true,
  notes: true,
  terms: true,
  paymentInstructions: true,
  issuerSnapshot: true,
  sentAt: true,
  paidAt: true,
  cancelledAt: true,
  // Only the three customer-safe payment columns — never reference/note.
  payments: {
    select: { amountCents: true, paidOn: true, method: true },
    orderBy: [{ paidOn: "asc" }, { createdAt: "asc" }],
  },
  business: {
    select: { name: true, timeZone: true },
  },
} satisfies Prisma.InvoiceSelect;

/**
 * Resolve a hosted-page token to the customer-safe view of its invoice.
 *
 * `businessId` must be the tenant resolved from the REQUEST HOST
 * (`checkBusiness()`), never anything taken from the token. The order of
 * checks mirrors the subscription manage page (`(storefront)/subscriptions/
 * [token]/page.tsx`):
 *
 * 1. Signature/shape invalid → `not_found`.
 * 2. Validly signed but past its TTL → `expired` (the page shows "ask the
 *    business for a new link"). Only a token we minted can reach this, so it
 *    reveals nothing to a forger.
 * 3. Token's business ≠ host's business → `not_found` (a token for store A
 *    never probes store B).
 * 4. Row missing, or a DRAFT → `not_found`.
 *
 * Does NOT rate-limit (the `invoice.getByToken` procedure does that) and does
 * NOT record the view (the page does, via `after(recordInvoiceView)`).
 */
export async function loadInvoiceForToken(
  db: TxClient,
  args: { token: string; businessId: string; now?: Date },
): Promise<InvoiceTokenLoadResult> {
  const now = args.now ?? new Date();
  const verified = verifyInvoiceToken(args.token, now);
  if (!verified.ok) {
    return verified.reason === "expired"
      ? { state: "expired" }
      : { state: "not_found" };
  }
  if (verified.businessId !== args.businessId) return { state: "not_found" };

  const row = await db.invoice.findFirst({
    where: { id: verified.invoiceId, businessId: args.businessId },
    select: PUBLIC_INVOICE_SELECT,
  });
  if (!row || row.status === "DRAFT") return { state: "not_found" };

  const settings = await getInvoiceSettingsOrDefaults(db, args.businessId);
  const status = toInvoiceStatus(row.status);
  const balanceCents = status === "CANCELLED" ? 0 : balanceDueCents(row);

  const issuer: InvoiceIssuerSnapshot = parseIssuerSnapshot(
    row.issuerSnapshot,
  ) ?? {
    name: row.business.name,
    email: null,
    phone: null,
    addressLines: [],
    logoUrl: null,
    accentColor: null,
  };

  return {
    state: "ok",
    invoice: {
      id: row.id,
      displayNumber: invoiceDisplayNumber(row, settings.numberPadding),
      status,
      isOverdue: isInvoiceOverdue(row, now, row.business.timeZone),
      currency: row.currency,
      issuer,
      billTo: {
        name: row.customerName,
        email: row.customerEmail,
        phone: row.customerPhone,
        address: parseBillingAddressJson(row.billingAddress),
      },
      lineItems: lineItemsWithAmounts(row.lineItems).map((line) => ({
        description: line.description,
        quantity: line.quantity,
        unitPriceCents: line.unitPriceCents,
        amountCents: line.amountCents,
      })),
      subtotalCents: row.subtotalCents,
      discountType: toInvoiceDiscountType(row.discountType),
      discountValue: row.discountValue,
      discountCents: row.discountCents,
      taxRateBps: row.taxRateBps,
      taxCents: row.taxCents,
      totalCents: row.totalCents,
      amountPaidCents: row.amountPaidCents,
      balanceCents,
      dueTerms: toInvoiceDueTerms(row.dueTerms),
      issueDate: ymdOrNull(row.issueDate),
      dueDate: ymdOrNull(row.dueDate),
      notes: row.notes,
      terms: row.terms,
      paymentInstructions:
        balanceCents > 0
          ? parsePaymentInstructions(row.paymentInstructions)
          : [],
      payments: row.payments.map((payment) => ({
        amountCents: payment.amountCents,
        paidOn: utcMidnightToYmd(payment.paidOn),
        methodLabel: paymentRecordMethodLabel(payment.method),
      })),
      sentAt: row.sentAt,
      paidAt: row.paidAt,
      cancelledAt: row.cancelledAt,
    },
  };
}
