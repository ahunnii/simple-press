import "server-only";

import { TRPCError } from "@trpc/server";

import type {
  InvoiceStatus,
  RecordPaymentInput,
} from "~/lib/validators/invoice";
import type { DbClient, TxClient } from "~/server/db";

import { logInvoiceEvent } from "./events";
import { blankToNull } from "./server-shared";
import {
  deriveInvoiceStatus,
  toInvoiceStatus,
  ymdToUtcMidnight,
} from "./status";
import { balanceDueCents } from "./totals";

/**
 * Recording and deleting invoice payments.
 *
 * Both run as one interactive transaction that ends in a compare-and-swap on
 * the invoice: `updateMany where { id, amountPaidCents: <read>, status:
 * <read> }`. Two writers racing on one invoice both insert/delete their
 * payment row, but only the first CAS matches — Postgres re-checks the WHERE
 * after the first writer's row lock is released (READ COMMITTED), sees the new
 * `amountPaidCents`, and the second gets count 0 → CONFLICT, which rolls its
 * payment row back. So two concurrent payments that would TOGETHER overpay
 * can never both commit, even though each alone fits the balance.
 *
 * `amountPaidCents` is recomputed as the SUM of the payment rows rather than
 * incremented, so a hand-edited or drifted column heals on the next write.
 *
 * Receipt emails are not sent here — they belong after the commit (see the
 * router and `emailPaymentReceipt`), so a slow or failed email never holds a
 * row lock or rolls back a recorded payment.
 */

export const INVOICE_CHANGED_MESSAGE =
  "This invoice changed while you were working on it. Refresh and try again.";

function usd(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const PAYMENT_RESULT_SELECT = {
  id: true,
  amountCents: true,
  paidOn: true,
  method: true,
  reference: true,
  note: true,
  recordedByUserId: true,
  receiptSentAt: true,
  createdAt: true,
} as const;

export type InvoicePaymentWriteResult = {
  invoice: {
    id: string;
    status: InvoiceStatus;
    totalCents: number;
    amountPaidCents: number;
    balanceCents: number;
    paidAt: Date | null;
  };
  payment: {
    id: string;
    amountCents: number;
    paidOn: Date;
    method: string;
    reference: string | null;
    note: string | null;
    recordedByUserId: string | null;
    receiptSentAt: Date | null;
    createdAt: Date;
  };
};

async function sumPayments(tx: TxClient, invoiceId: string): Promise<number> {
  const { _sum } = await tx.invoicePayment.aggregate({
    where: { invoiceId },
    _sum: { amountCents: true },
  });
  return _sum.amountCents ?? 0;
}

/**
 * The CAS write shared by record and delete. `paidAt` is stamped the first
 * time the invoice becomes PAID and cleared whenever it isn't.
 */
async function swapInvoiceTotals(
  tx: TxClient,
  prev: {
    id: string;
    status: string;
    amountPaidCents: number;
    totalCents: number;
    paidAt: Date | null;
  },
  amountPaidCents: number,
  now: Date,
): Promise<InvoicePaymentWriteResult["invoice"]> {
  const status = deriveInvoiceStatus({
    status: toInvoiceStatus(prev.status),
    totalCents: prev.totalCents,
    amountPaidCents,
  });
  const paidAt = status === "PAID" ? (prev.paidAt ?? now) : null;

  const { count } = await tx.invoice.updateMany({
    where: {
      id: prev.id,
      amountPaidCents: prev.amountPaidCents,
      status: prev.status,
    },
    data: { amountPaidCents, status, paidAt },
  });
  if (count === 0) {
    throw new TRPCError({ code: "CONFLICT", message: INVOICE_CHANGED_MESSAGE });
  }

  return {
    id: prev.id,
    status,
    totalCents: prev.totalCents,
    amountPaidCents,
    balanceCents: balanceDueCents({
      totalCents: prev.totalCents,
      amountPaidCents,
    }),
    paidAt,
  };
}

const INVOICE_FOR_PAYMENT_SELECT = {
  id: true,
  status: true,
  totalCents: true,
  amountPaidCents: true,
  paidAt: true,
} as const;

/**
 * Record a payment against a SENT / PARTIALLY_PAID invoice. Rejects drafts
 * (not issued yet), cancelled invoices (closed), and any amount above the
 * balance still owed (which also rejects every payment on a PAID invoice).
 */
export async function recordInvoicePayment(
  db: DbClient,
  args: {
    businessId: string;
    input: Omit<RecordPaymentInput, "emailReceipt">;
    actorUserId: string | null;
    now: Date;
  },
): Promise<InvoicePaymentWriteResult> {
  const { businessId, input, actorUserId, now } = args;

  return db.$transaction(async (tx) => {
    const invoice = await tx.invoice.findFirst({
      where: { id: input.invoiceId, businessId },
      select: INVOICE_FOR_PAYMENT_SELECT,
    });
    if (!invoice) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Invoice not found" });
    }

    const status = toInvoiceStatus(invoice.status);
    if (status === "DRAFT") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Send this invoice before recording a payment against it",
      });
    }
    if (status === "CANCELLED") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "This invoice is cancelled — payments can't be recorded on it",
      });
    }

    const paidBefore = await sumPayments(tx, invoice.id);
    const balance = Math.max(0, invoice.totalCents - paidBefore);
    if (input.amountCents > balance) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          balance === 0
            ? "This invoice is already paid in full"
            : `That's more than the ${usd(balance)} still owed on this invoice`,
      });
    }

    const payment = await tx.invoicePayment.create({
      data: {
        invoiceId: invoice.id,
        businessId,
        amountCents: input.amountCents,
        paidOn: ymdToUtcMidnight(input.paidOn),
        method: input.method,
        reference: blankToNull(input.reference),
        note: blankToNull(input.note),
        recordedByUserId: actorUserId,
      },
      select: PAYMENT_RESULT_SELECT,
    });

    const updated = await swapInvoiceTotals(
      tx,
      invoice,
      paidBefore + input.amountCents,
      now,
    );

    await logInvoiceEvent(tx, {
      invoiceId: invoice.id,
      businessId,
      type: "PAYMENT_RECORDED",
      actorUserId,
      metadata: {
        paymentId: payment.id,
        amountCents: payment.amountCents,
        method: payment.method,
        paidOn: input.paidOn,
        status: updated.status,
      },
    });

    return { invoice: updated, payment };
  });
}

/**
 * Delete a payment recorded by mistake, and walk the invoice's status back
 * (PAID → PARTIALLY_PAID → SENT) to match what remains.
 *
 * Allowed on ANY non-draft invoice, including a CANCELLED one: the point is
 * to fix a data-entry mistake, and a cancelled invoice keeps its payments as
 * history, so a wrong one there must be removable too. `deriveInvoiceStatus`
 * keeps CANCELLED sticky, so this never re-opens a cancelled invoice.
 * (Drafts can't have payments; the check is defensive.)
 */
export async function deleteInvoicePayment(
  db: DbClient,
  args: {
    businessId: string;
    paymentId: string;
    actorUserId: string | null;
    now: Date;
  },
): Promise<InvoicePaymentWriteResult> {
  const { businessId, paymentId, actorUserId, now } = args;

  return db.$transaction(async (tx) => {
    const payment = await tx.invoicePayment.findFirst({
      where: { id: paymentId, businessId },
      select: {
        ...PAYMENT_RESULT_SELECT,
        invoice: { select: INVOICE_FOR_PAYMENT_SELECT },
      },
    });
    if (!payment) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Payment not found" });
    }
    const { invoice, ...paymentRow } = payment;
    if (toInvoiceStatus(invoice.status) === "DRAFT") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Draft invoices have no payments to delete",
      });
    }

    await tx.invoicePayment.delete({ where: { id: paymentRow.id } });

    const remaining = await sumPayments(tx, invoice.id);
    const updated = await swapInvoiceTotals(tx, invoice, remaining, now);

    await logInvoiceEvent(tx, {
      invoiceId: invoice.id,
      businessId,
      type: "PAYMENT_DELETED",
      actorUserId,
      metadata: {
        paymentId: paymentRow.id,
        amountCents: paymentRow.amountCents,
        method: paymentRow.method,
        paidOn: paymentRow.paidOn.toISOString().slice(0, 10),
        status: updated.status,
      },
    });

    return { invoice: updated, payment: paymentRow };
  });
}
