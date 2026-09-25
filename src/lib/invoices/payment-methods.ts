import { z } from "zod";

import type { InvoicePaymentMethod } from "~/lib/validators/invoice";
import { cashAppUrl, venmoUrl } from "~/lib/donation-handles";
import {
  INVOICE_BANK_ACCOUNT_TYPE_LABELS,
  INVOICE_PAYMENT_METHOD_TYPE_LABELS,
  INVOICE_PAYMENT_METHOD_TYPE_VALUES,
  paymentMethodSchema,
} from "~/lib/validators/invoice";

/**
 * Payment methods (the business's saved config) and payment INSTRUCTIONS (what
 * one invoice shows the customer). Client-safe.
 *
 * The two are different on purpose. `InvoiceSettings.paymentMethods` is the
 * owner's editable list; at send, `buildPaymentInstructions` renders the
 * ticked ones into display-ready `InvoicePaymentInstruction`s, and THAT is
 * what is snapshotted onto `Invoice.paymentInstructions`. So an owner who
 * later changes banks doesn't silently re-point every invoice already in a
 * customer's inbox, and the hosted page renders the snapshot without needing
 * to know how each method type is laid out.
 *
 * Both blobs hold account numbers and handles and are stored encrypted. Only
 * the signed hosted page renders them in full; emails use
 * `paymentMethodDisplayName`, which never includes a detail.
 */

// ─── Config (de)serialization ───────────────────────────────────────────────

/**
 * Reads `InvoiceSettings.paymentMethods`. Tolerant: unreadable JSON → `[]`,
 * and each entry that fails `paymentMethodSchema` is DROPPED rather than
 * failing the whole list — a single bad entry must not hide the owner's other
 * methods or break sending. Never throws.
 */
export function parsePaymentMethods(
  json: string | null | undefined,
): InvoicePaymentMethod[] {
  if (!json) return [];

  let decoded: unknown;
  try {
    decoded = JSON.parse(json);
  } catch {
    return [];
  }
  if (!Array.isArray(decoded)) return [];

  const methods: InvoicePaymentMethod[] = [];
  for (const entry of decoded) {
    const result = paymentMethodSchema.safeParse(entry);
    if (result.success) methods.push(result.data);
  }
  return methods;
}

export function serializePaymentMethods(
  methods: readonly InvoicePaymentMethod[],
): string {
  return JSON.stringify(methods);
}

// ─── Display helpers ────────────────────────────────────────────────────────

/**
 * `"••••1234"` — the last four characters behind a fixed-width mask (the mask
 * length never leaks the real length). Four or fewer characters mask
 * entirely: showing "the last four" of a four-digit value is showing all of it.
 */
export function maskAccountNumber(value: string): string {
  const compact = value.replace(/\s+/g, "");
  if (compact.length <= 4) return "••••";
  return `••••${compact.slice(-4)}`;
}

/**
 * The name a method goes by where details must NOT appear — emails, the
 * activity timeline, list summaries: the owner's label, else `other`'s title,
 * else the type label ("Bank transfer"). Never a handle or account number.
 */
export function paymentMethodDisplayName(method: InvoicePaymentMethod): string {
  if (method.label) return method.label;
  if (method.type === "other") return method.title;
  return INVOICE_PAYMENT_METHOD_TYPE_LABELS[method.type];
}

/**
 * A one-line, owner-facing hint for the settings list ("Chase ••••6789",
 * "@janedoe"). Masks account numbers; handles are public by nature.
 */
export function paymentMethodDetailSummary(
  method: InvoicePaymentMethod,
): string {
  switch (method.type) {
    case "bank_transfer":
      return `${method.bankName} ${maskAccountNumber(method.accountNumber)}`;
    case "paypal":
      return method.handle
        ? `paypal.me/${method.handle}`
        : (method.email ?? "");
    case "venmo":
      return `@${method.handle}`;
    case "cash_app":
      return `$${method.cashtag}`;
    case "zelle":
      return method.emailOrPhone;
    case "cash_check":
      return `Payable to ${method.payableTo}`;
    case "other":
      return method.title;
  }
}

/** Display names of the selected methods, in settings order (unknown ids skipped). */
export function paymentMethodSummaryLabels(
  methods: readonly InvoicePaymentMethod[],
  selectedIds: readonly string[],
): string[] {
  return selectMethods(methods, selectedIds).map(paymentMethodDisplayName);
}

function selectMethods(
  methods: readonly InvoicePaymentMethod[],
  selectedIds: readonly string[],
): InvoicePaymentMethod[] {
  const selected = new Set(selectedIds);
  return methods.filter((method) => selected.has(method.id));
}

// ─── Instructions (the per-invoice snapshot) ────────────────────────────────

export const invoicePaymentInstructionLineSchema = z.object({
  label: z.string(),
  value: z.string(),
  /** Render a copy button (account numbers, handles, the reference). */
  copyable: z.boolean(),
});
export type InvoicePaymentInstructionLine = z.infer<
  typeof invoicePaymentInstructionLineSchema
>;

export const invoicePaymentInstructionSchema = z.object({
  methodId: z.string(),
  type: z.enum(INVOICE_PAYMENT_METHOD_TYPE_VALUES),
  label: z.string(),
  lines: z.array(invoicePaymentInstructionLineSchema),
  /** A "Pay with …" deep link. Always https — rendered as an `<a href>`. */
  url: z
    .string()
    .url()
    .refine((value) => value.startsWith("https://"))
    .optional(),
});
export type InvoicePaymentInstruction = z.infer<
  typeof invoicePaymentInstructionSchema
>;

export type PaymentInstructionContext = {
  businessName: string;
  /** The formatted invoice number, e.g. "INV-0012" — the memo customers are asked to include. */
  displayNumber: string;
};

function line(
  label: string,
  value: string | undefined | null,
  copyable = false,
): InvoicePaymentInstructionLine[] {
  const trimmed = value?.trim();
  return trimmed ? [{ label, value: trimmed, copyable }] : [];
}

function instructionFor(
  method: InvoicePaymentMethod,
  ctx: PaymentInstructionContext,
): InvoicePaymentInstruction {
  const label = paymentMethodDisplayName(method);
  const base = { methodId: method.id, type: method.type, label };
  // Every method ends with the invoice number to quote, so the owner can match
  // an incoming transfer to the invoice it pays.
  const reference = line("Reference", ctx.displayNumber, true);

  switch (method.type) {
    case "bank_transfer":
      return {
        ...base,
        lines: [
          ...line("Account name", method.accountName),
          ...line("Bank", method.bankName),
          ...line("Routing number", method.routingNumber, true),
          ...line("Account number", method.accountNumber, true),
          ...line(
            "Account type",
            method.accountType
              ? INVOICE_BANK_ACCOUNT_TYPE_LABELS[method.accountType]
              : null,
          ),
          ...line("SWIFT/BIC", method.swift, true),
          ...line("Instructions", method.instructions),
          ...reference,
        ],
      };
    case "paypal":
      return {
        ...base,
        lines: [
          ...line(
            "PayPal.Me",
            method.handle ? `paypal.me/${method.handle}` : null,
            true,
          ),
          ...line("PayPal email", method.email, true),
          ...reference,
        ],
        // No amount in the link: this is a snapshot taken at send, and after a
        // partial payment a baked-in amount would ask for the wrong sum.
        ...(method.handle
          ? { url: `https://paypal.me/${encodeURIComponent(method.handle)}` }
          : {}),
      };
    case "venmo":
      return {
        ...base,
        lines: [...line("Venmo", `@${method.handle}`, true), ...reference],
        url: venmoUrl(
          method.handle,
          `${ctx.businessName} invoice ${ctx.displayNumber}`,
        ),
      };
    case "cash_app":
      return {
        ...base,
        lines: [...line("Cash App", `$${method.cashtag}`, true), ...reference],
        url: cashAppUrl(method.cashtag),
      };
    case "zelle":
      return {
        ...base,
        lines: [
          ...line("Send to", method.emailOrPhone, true),
          ...line("Recipient name", method.name),
          ...reference,
        ],
      };
    case "cash_check":
      return {
        ...base,
        lines: [
          ...line("Make checks payable to", method.payableTo, true),
          ...line("Mail to", method.mailingAddress),
          ...line("Instructions", method.instructions),
          ...reference,
        ],
      };
    case "other":
      return {
        ...base,
        lines: [...line("Instructions", method.instructions), ...reference],
      };
  }
}

/**
 * The instructions for the methods ticked on one invoice, in the business's
 * settings order. An id with no matching method (deleted since the draft was
 * made) is skipped rather than failing the send.
 */
export function buildPaymentInstructions(
  methods: readonly InvoicePaymentMethod[],
  selectedIds: readonly string[],
  ctx: PaymentInstructionContext,
): InvoicePaymentInstruction[] {
  return selectMethods(methods, selectedIds).map((method) =>
    instructionFor(method, ctx),
  );
}

/** Reads `Invoice.paymentInstructions`. Tolerant like `parsePaymentMethods`: bad entries are dropped, never throws. */
export function parsePaymentInstructions(
  json: string | null | undefined,
): InvoicePaymentInstruction[] {
  if (!json) return [];

  let decoded: unknown;
  try {
    decoded = JSON.parse(json);
  } catch {
    return [];
  }
  if (!Array.isArray(decoded)) return [];

  const instructions: InvoicePaymentInstruction[] = [];
  for (const entry of decoded) {
    const result = invoicePaymentInstructionSchema.safeParse(entry);
    if (result.success) instructions.push(result.data);
  }
  return instructions;
}

export function serializePaymentInstructions(
  instructions: readonly InvoicePaymentInstruction[],
): string {
  return JSON.stringify(instructions);
}
