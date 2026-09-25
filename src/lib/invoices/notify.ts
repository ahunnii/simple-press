import "server-only";

import type { Prisma } from "generated/prisma";

import type { TxClient } from "~/server/db";
import { getBusinessUrl } from "~/lib/business-url";
import {
  sendInvoiceCancelledEmail,
  sendInvoiceEmail,
  sendInvoicePaymentReceiptEmail,
  sendInvoiceReminderEmail,
} from "~/lib/email/templates";

import { formatInvoiceDateLabel } from "./format";
import { parseLineItems } from "./line-items";
import {
  parsePaymentInstructions,
  paymentMethodSummaryLabels,
} from "./payment-methods";
import { getInvoiceSettingsOrDefaults } from "./repository";
import {
  invoiceDisplayNumber,
  paymentRecordMethodLabel,
} from "./server-shared";
import { isInvoiceOverdue } from "./status";
import { createInvoiceToken, invoiceViewPath } from "./token";
import { balanceDueCents, computeLineAmountCents } from "./totals";

/**
 * Invoice email + URL helpers. Every customer email carries a freshly signed
 * "View invoice" link and payment METHOD NAMES only — the details (account
 * numbers, handles) are rendered solely on the signed hosted page.
 *
 * The `sendInvoice*` helpers never throw (they return `sendEmail`'s
 * `{ success }`), so callers branch on `.success` to decide whether to stamp
 * anything — stamp-on-success, like the cron's `notifyBackInStock`.
 */

// ─── Shapes ─────────────────────────────────────────────────────────────────

/** Select this from `Business` to get everything the helpers below need. */
export const INVOICE_NOTIFY_BUSINESS_SELECT = {
  id: true,
  name: true,
  ownerEmail: true,
  supportEmail: true,
  subdomain: true,
  customDomain: true,
  domainStatus: true,
  timeZone: true,
  siteContent: { select: { logoUrl: true } },
} satisfies Prisma.BusinessSelect;

export type InvoiceNotifyBusiness = Prisma.BusinessGetPayload<{
  select: typeof INVOICE_NOTIFY_BUSINESS_SELECT;
}>;

/** Select this from `Invoice` to get everything the email builders need. */
export const INVOICE_NOTIFY_INVOICE_SELECT = {
  id: true,
  businessId: true,
  invoiceNumber: true,
  numberPrefix: true,
  status: true,
  customerName: true,
  customerEmail: true,
  lineItems: true,
  subtotalCents: true,
  discountCents: true,
  taxCents: true,
  totalCents: true,
  amountPaidCents: true,
  dueDate: true,
  paymentMethodIds: true,
  paymentInstructions: true,
} satisfies Prisma.InvoiceSelect;

export type InvoiceNotifyInvoice = Prisma.InvoiceGetPayload<{
  select: typeof INVOICE_NOTIFY_INVOICE_SELECT;
}>;

type BusinessUrlFields = Pick<
  InvoiceNotifyBusiness,
  "subdomain" | "customDomain" | "domainStatus"
>;

// ─── URLs ───────────────────────────────────────────────────────────────────

/** Absolute signed link to the hosted invoice page (a fresh 365-day token). */
export function buildInvoiceViewUrl(
  business: BusinessUrlFields & { id: string },
  invoiceId: string,
  now?: Date,
): string {
  const token = createInvoiceToken({
    invoiceId,
    businessId: business.id,
    now,
  });
  return `${getBusinessUrl(business)}${invoiceViewPath(token)}`;
}

/**
 * Absolute link to an invoice's admin detail page. Admin lives on the
 * business's own host under `/admin`, the same shape the new-order owner
 * email builds (`adminOrderUrl` in `~/lib/email/templates`).
 */
export function adminInvoiceUrl(
  business: BusinessUrlFields,
  invoiceId: string,
): string {
  return `${getBusinessUrl(business)}/admin/invoices/${encodeURIComponent(invoiceId)}`;
}

/** Absolute link to the admin invoice list, e.g. `{ status: "overdue" }`. */
export function adminInvoicesListUrl(
  business: BusinessUrlFields,
  query?: Record<string, string>,
): string {
  const qs = query ? new URLSearchParams(query).toString() : "";
  return `${getBusinessUrl(business)}/admin/invoices${qs ? `?${qs}` : ""}`;
}

// ─── Formatting ─────────────────────────────────────────────────────────────

// Re-exported so email/cron callers can import everything from here.
export {
  formatInvoiceDateLabel,
  invoiceDisplayNumber,
  paymentRecordMethodLabel,
};

// ─── Customer emails ────────────────────────────────────────────────────────

export type InvoiceEmailKind = "sent" | "reminder" | "cancelled";

/**
 * Email the customer about an invoice.
 *
 * - `sent` / `reminder`: the full summary (lines, totals, balance, due date)
 *   plus method NAMES. Names come from the send-time instructions snapshot
 *   when there is one, else from the current settings for the ticked ids.
 * - `cancelled`: the notice, with the owner's `reason` if given.
 *
 * Never throws; returns `{ success }`. The caller stamps on success.
 */
export async function emailInvoice(
  db: TxClient,
  args: {
    invoice: InvoiceNotifyInvoice;
    business: InvoiceNotifyBusiness;
    kind: InvoiceEmailKind;
    message?: string | null;
    reason?: string | null;
    idempotencyKey: string;
    now?: Date;
  },
): Promise<{ success: boolean }> {
  const { invoice, business, kind } = args;
  const now = args.now ?? new Date();
  const settings = await getInvoiceSettingsOrDefaults(db, business.id);
  const invoiceNumber = invoiceDisplayNumber(invoice, settings.numberPadding);
  const emailBusiness = {
    name: business.name,
    ownerEmail: business.ownerEmail,
    supportEmail: business.supportEmail,
    siteContent: business.siteContent,
    subdomain: business.subdomain,
  };

  if (kind === "cancelled") {
    const result = await sendInvoiceCancelledEmail({
      to: invoice.customerEmail,
      customerName: invoice.customerName,
      invoiceNumber,
      reason: args.reason ?? undefined,
      amountPaidCents: invoice.amountPaidCents,
      business: emailBusiness,
      idempotencyKey: args.idempotencyKey,
    });
    return { success: result.success };
  }

  const snapshot = parsePaymentInstructions(invoice.paymentInstructions);
  const paymentMethodLabels =
    invoice.paymentInstructions !== null
      ? snapshot.map((instruction) => instruction.label)
      : paymentMethodSummaryLabels(
          settings.paymentMethods,
          invoice.paymentMethodIds,
        );

  const balanceCents = balanceDueCents(invoice);
  const common = {
    to: invoice.customerEmail,
    customerName: invoice.customerName,
    invoiceNumber,
    message: args.message ?? undefined,
    viewInvoiceUrl: buildInvoiceViewUrl(business, invoice.id, now),
    business: emailBusiness,
    idempotencyKey: args.idempotencyKey,
    amountDueCents: balanceCents,
    dueDateLabel: formatInvoiceDateLabel(invoice.dueDate),
    lineItems: parseLineItems(invoice.lineItems).map((line) => ({
      description: line.description,
      quantity: line.quantity,
      amountCents: computeLineAmountCents(line.quantity, line.unitPriceCents),
    })),
    subtotalCents: invoice.subtotalCents,
    discountCents: invoice.discountCents,
    taxCents: invoice.taxCents,
    totalCents: invoice.totalCents,
    amountPaidCents: invoice.amountPaidCents,
    balanceCents,
    paymentMethodLabels,
  };

  const result =
    kind === "sent"
      ? await sendInvoiceEmail(common)
      : await sendInvoiceReminderEmail({
          ...common,
          isOverdue: isInvoiceOverdue(invoice, now, business.timeZone),
        });
  return { success: result.success };
}

/**
 * Email the customer a receipt for one recorded payment. Idempotency key is
 * per payment, so a retried request never sends two receipts for it. Never
 * throws; the caller stamps `receiptSentAt` + a `RECEIPT_SENT` event on
 * success.
 */
export async function emailPaymentReceipt(
  db: TxClient,
  args: {
    invoice: InvoiceNotifyInvoice;
    payment: { id: string; amountCents: number; paidOn: Date; method: string };
    business: InvoiceNotifyBusiness;
    now?: Date;
  },
): Promise<{ success: boolean }> {
  const { invoice, payment, business } = args;
  const settings = await getInvoiceSettingsOrDefaults(db, business.id);

  const result = await sendInvoicePaymentReceiptEmail({
    to: invoice.customerEmail,
    customerName: invoice.customerName,
    invoiceNumber: invoiceDisplayNumber(invoice, settings.numberPadding),
    amountPaidCents: payment.amountCents,
    paidOnLabel: formatInvoiceDateLabel(payment.paidOn),
    methodLabel: paymentRecordMethodLabel(payment.method),
    balanceCents: invoice.status === "CANCELLED" ? 0 : balanceDueCents(invoice),
    viewInvoiceUrl: buildInvoiceViewUrl(business, invoice.id, args.now),
    business: {
      name: business.name,
      ownerEmail: business.ownerEmail,
      supportEmail: business.supportEmail,
      siteContent: business.siteContent,
      subdomain: business.subdomain,
    },
    idempotencyKey: `invoice-receipt-${payment.id}`,
  });
  return { success: result.success };
}
